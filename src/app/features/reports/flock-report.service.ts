import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { FlockService } from '../../core/services/flock.service';
import { UserOfflineCacheService } from '../../core/services/user-offline-cache.service';
import { PendingRecordsService } from '../../core/services/pending-records.service';
import { environment } from '../../../environments/environment';
import * as Offline from './offline-report-engine';

/** أقل بيانات مطلوبة عن القطيع (نفس عنصر قايمة القطعان في لوحة التحكم) */
export interface FlockLike {
  id: string; name: string; type: string;
  initialCount?: number; currentCount?: number; startDate?: any; status?: string;
  [k: string]: any;
}

export type ReportSource = 'server' | 'cached' | 'local';

export interface CardResult {
  ok: boolean;
  data?: any;                 // نفس شكل /reports/weekly
  source?: ReportSource;
  note?: string | null;       // رسالة لما التقرير مش جاي من السيرفر
  error?: string | null;
  pending: number;            // تسجيلات لسه ما اتبعتتش لهذا القطيع
}

/**
 * ملخص تقرير القطيع (آخر 7 أيام) لكارت لوحة التحكم.
 * - أونلاين: /reports/weekly?ai=false (من غير التحليل النصي، عشان ما نستهلكش Gemini مع كل ضغطة على قطيع).
 * - أوفلاين (موبايل): آخر نسخة محفوظة، أو حساب على الجهاز من السجلات المحفوظة + المعلّقة (نفس محرك صفحة التقارير).
 * بيستخدم نفس مفاتيح التخزين المحلي للسجلات وبرنامج الدورة، وليه كاش تقارير مستقل (ما بيزاحمش كاش صفحة التقارير).
 */
@Injectable({ providedIn: 'root' })
export class FlockReportService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private store = inject(UserOfflineCacheService);
  private flockSvc = inject(FlockService);
  private pendingSvc = inject(PendingRecordsService);

  private static readonly CACHE_MAX = 20;
  private static readonly MEM_TTL_MS = 60_000;
  private mem = new Map<string, { at: number; res: CardResult }>();

  // ── تخزين محلي (موبايل بس، مربوط بالمستخدم) ─────────────────────────────
  private async uid(): Promise<string | null> {
    try { return await this.auth.currentUserId(); } catch { return null; }
  }
  private async cacheSet(key: string, value: any): Promise<void> {
    if (!this.store.enabled) return;
    const u = await this.uid();
    if (u) { try { await this.store.set(u, key, value); } catch { /* best-effort */ } }
  }
  private async cacheGet<T = any>(key: string): Promise<T | null> {
    if (!this.store.enabled) return null;
    const u = await this.uid();
    if (!u) return null;
    try { return ((await this.store.get(u, key)) as T) ?? null; } catch { return null; }
  }

  private async cacheCard(key: string, data: any): Promise<void> {
    if (!this.store.enabled || data?.has_data === false) return;
    await this.cacheSet(`report:${key}`, { savedAt: new Date().toISOString(), data });
    const index = (await this.cacheGet<string[]>('card:index')) ?? [];
    const next = [...index.filter(k => k !== key), key];
    while (next.length > FlockReportService.CACHE_MAX) await this.cacheSet(`report:${next.shift() as string}`, null);
    await this.cacheSet('card:index', next);
  }

  private looksOffline(err: any): boolean {
    return err?.status === 0 || (typeof navigator !== 'undefined' && navigator.onLine === false);
  }

  private errorMessage(err: any): string {
    switch (err?.status) {
      case 401: return 'انتهت الجلسة — سجّل دخول تاني';
      case 403: case 404: return 'التقرير ده مش متاح لهذا القطيع';
      case 429: return 'طلبات كتير في وقت قصير — استنى شوية وجرّب تاني';
      default: return 'حصل خطأ أثناء تحميل التقرير — جرّب تاني';
    }
  }

  private async localWeekly(flock: FlockLike, ps: string): Promise<any | null> {
    if (!this.store.enabled) return null;
    const [records, pending, full] = await Promise.all([
      this.cacheGet<any[]>(`records_cache:${flock.id}`),
      this.cacheGet<any[]>('pending_records'),
      this.cacheGet<any>(`cycle_full:${flock.id}`),
    ]);
    const hasPending = Array.isArray(pending) && pending.some(p => p?.flockId === flock.id);
    if (!Array.isArray(records) && !hasPending) return null;
    const ef: Offline.EngineFlock = {
      id: flock.id, name: flock.name, type: flock.type,
      initialCount: flock['initialCount'] ?? flock['initial_count'] ?? 0, currentCount: flock['currentCount'] ?? flock['current_count'] ?? 0,
      startDate: flock['startDate'] ?? flock['start_date'] ?? null, status: flock['status'] ?? 'active',
      openingFeedKg: flock['openingFeedKg'] ?? flock['opening_feed_kg'] ?? null,
    };
    const pe = Offline.addDays(ps, 6);
    const recs = Offline.mergeRecords(records ?? [], pending ?? [], flock.id);
    return Offline.assemblePeriodReport('weekly', ef, recs, ps, pe, Offline.localToday(),
      Offline.targetsFromProgram(full, ef.startDate, Offline.addDays(ps, -8), pe));
  }

  /** أونلاين: نحدّث نسخة سجلات القطيع وبرنامجه على الجهاز عشان الحساب المحلي يبقى جاهز لما النت يقطع */
  private prefetchLocal(flockId: string): void {
    if (!this.store.enabled) return;
    this.flockSvc.getRecords(flockId).subscribe({ next: (r: any) => void this.cacheSet(`records_cache:${flockId}`, r), error: () => {} });
    this.http.get(`${environment.apiUrl}/flocks/${flockId}/cycle-program/full`)
      .subscribe({ next: (full: any) => void this.cacheSet(`cycle_full:${flockId}`, full), error: () => {} });
  }

  private localNote(pending: number): string {
    return '📴 مفيش نت — الملخص محسوب على جهازك من سجلاتك المحفوظة' + (pending > 0 ? ` (شامل ${pending} تسجيل لسه ما اتبعتش)` : '') + '.';
  }
  private cachedNote(savedAt: string, pending: number): string {
    const when = new Date(savedAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
    return `📴 مفيش نت — نسخة محفوظة من ${when}.` + (pending > 0 ? ` عندك ${pending} تسجيل لسه ما اتبعتش وهو مش ظاهر فيها.` : '');
  }

  /** ملخص آخر 7 أيام للقطيع. force=true يتخطى الكاش القصير اللي في الذاكرة */
  async weekly(flock: FlockLike, force = false): Promise<CardResult> {
    const ps = Offline.addDays(Offline.localToday(), -6);
    const key = `card:${flock.id}:${ps}`;
    const hit = this.mem.get(key);
    if (!force && hit && Date.now() - hit.at < FlockReportService.MEM_TTL_MS) return hit.res;

    const pending = await this.pendingSvc.countFor(flock.id);
    try {
      const data = await firstValueFrom(this.http.get<any>(
        `${environment.apiUrl}/reports/weekly?flock_id=${flock.id}&week_start=${ps}&ai=false`));
      const res: CardResult = { ok: true, data, source: 'server', note: null, error: null, pending };
      this.mem.set(key, { at: Date.now(), res });
      void this.cacheCard(key, data);
      this.prefetchLocal(flock.id);
      return res;
    } catch (err: any) {
      if (!this.looksOffline(err)) return { ok: false, error: this.errorMessage(err), pending };
      const cached = await this.cacheGet<{ savedAt: string; data: any }>(`report:${key}`);
      // فيه تسجيلات معلّقة (أو مفيش نسخة محفوظة): الحساب المحلي أحسن لأنه بيشملهم
      if (pending > 0 || !cached?.data) {
        const local = await this.localWeekly(flock, ps);
        if (local) return { ok: true, data: local, source: 'local', note: this.localNote(pending), error: null, pending };
      }
      if (cached?.data) return { ok: true, data: cached.data, source: 'cached', note: this.cachedNote(cached.savedAt, pending), error: null, pending };
      return {
        ok: false, pending,
        error: this.store.enabled ? 'مفيش نت ومفيش بيانات محفوظة للقطيع ده — افتحه مرة وإنت متصل' : 'مفيش اتصال بالنت — التقارير على الويب بتحتاج نت',
      };
    }
  }

  /** يبعت التسجيلات المعلّقة (نفس طابور صفحة القطيع) — بيرجّع كام اتبعت وكام اترفض */
  async syncPending(): Promise<{ sent: number; failed: number }> {
    const { sent, failed } = await this.pendingSvc.sync();
    if (sent || failed) this.mem.clear();
    return { sent, failed };
  }
}
