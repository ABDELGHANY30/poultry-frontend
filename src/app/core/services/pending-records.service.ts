import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { UserOfflineCacheService } from './user-offline-cache.service';
import { FlockService } from './flock.service';
import { environment } from '../../../environments/environment';

/** سجل اتسجل من غير نت وبيستنى الإرسال */
export interface PendingItem {
  kind: 'create' | 'patch';
  flockId: string;
  recordId?: string | null;
  date: string;
  payload: any;
}

export interface SyncResult {
  /** false = ماحصلتش مزامنة (مفيش نت / تخزين مش متاح / شغالة أصلاً / الطابور فاضي) */
  ran: boolean;
  sent: number;
  failed: number;
}

/**
 * 📴 طابور السجلات اللي اتسجلت أوفلاين + إرسالها للسيرفر.
 *
 * كان جوه FlockDetailComponent، واتنقل هنا عشان شاشة التقارير (وأي شاشة تانية) تقدر تزامن
 * أول ما النت يرجع من غير ما المستخدم يفتح صفحة القطيع. المنطق نفسه بالحرف (نفس المفاتيح، نفس
 * القفل، نفس حماية التعارض) — الطابور واحد ومشترك، فمفيش نسختين بيكتبوا على نفس المفتاح.
 *
 * التخزين مربوط بمعرّف المستخدم الحالي (UserOfflineCacheService) وموبايل بس.
 */
@Injectable({ providedIn: 'root' })
export class PendingRecordsService {
  private auth = inject(AuthService);
  private store = inject(UserOfflineCacheService);
  private http = inject(HttpClient);
  private flocks = inject(FlockService);

  static readonly PENDING_KEY = 'pending_records';
  static readonly FAILED_KEY = 'failed_records';

  /** مزامنة شغالة دلوقتي */
  readonly syncing = signal(false);
  /** سجلات القطيع النشط بس (اللي اتحدد بـ setActiveFlock) */
  readonly pendingForActive = signal<any[]>([]);
  /** سجلات القطيع النشط اللي السيرفر رفضها — بتتعرض للمستخدم ومش بتتمسح بصمت */
  readonly failedForActive = signal<any[]>([]);

  private activeFlockId: string | null = null;

  // قفل بسيط: قراءة-تعديل-كتابة الطابور بتحصل واحدة ورا التانية (تسجيل جديد + مزامنة في نفس الوقت)
  private qLock: Promise<unknown> = Promise.resolve();
  private withQueueLock<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.qLock.then(fn, fn);
    this.qLock = run.catch(() => undefined);
    return run;
  }

  private cacheSet(key: string, value: any): Promise<boolean> {
    return this.auth.currentUserId().then(uid => this.store.set(uid, key, value));
  }
  private cacheGet(key: string): Promise<any | null> {
    return this.auth.currentUserId().then(uid => this.store.get(uid, key));
  }

  private async readQueue(): Promise<any[]> {
    const q = await this.cacheGet(PendingRecordsService.PENDING_KEY);
    return Array.isArray(q) ? q : [];
  }
  private async writeQueue(q: any[]): Promise<boolean> {
    const ok = await this.cacheSet(PendingRecordsService.PENDING_KEY, q);
    await this.refresh();
    return ok;
  }

  /** بيحدّد القطيع اللي الشاشة فاتحاه (بيحدّث pendingForActive / failedForActive) */
  setActiveFlock(id: string | null): Promise<void> {
    this.activeFlockId = id;
    return this.refresh();
  }

  async refresh(): Promise<void> {
    const q = await this.readQueue();
    this.pendingForActive.set(q.filter(x => x.flockId === this.activeFlockId));
    const f = await this.cacheGet(PendingRecordsService.FAILED_KEY);
    this.failedForActive.set((Array.isArray(f) ? f : []).filter((x: any) => x.flockId === this.activeFlockId));
  }

  /** عدد السجلات المعلّقة لقطيع معيّن (من غير ما نغيّر القطيع النشط) */
  async countFor(flockId: string): Promise<number> {
    if (!flockId || !this.store.enabled) return 0;
    try { return (await this.readQueue()).filter(x => x.flockId === flockId).length; } catch { return 0; }
  }

  /** بترجّع false لو التخزين فشل (مساحة ممتلية / مفيش مستخدم معروف) — ساعتها ماننفعش نقول للمستخدم "اتحفظ" */
  queue(item: PendingItem): Promise<boolean> {
    return this.withQueueLock(async () => {
      const uid = await this.auth.currentUserId();
      if (!uid) return false;
      // نفس القطيع + نفس اليوم + نفس النوع → آخر نسخة بتحل محل القديمة
      const q = (await this.readQueue()).filter(x => !(x.flockId === item.flockId && x.date === item.date
        && x.kind === item.kind && (x.recordId ?? null) === (item.recordId ?? null)));
      q.push({ ...item, userId: uid, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, queuedAt: new Date().toISOString() });
      return this.writeQueue(q);
    });
  }

  private removeFromQueue(id: string): Promise<boolean> {
    return this.withQueueLock(async () => this.writeQueue((await this.readQueue()).filter(x => x.id !== id)));
  }

  /** بتقارن القيم المهمة بين السجل المخزّن وسجل السيرفر (null / '' / 0 بتتعامل كـ "فاضي" — السيرفر بيحوّل الفاضي لـ 0 أو null) */
  private sameRecordValues(payload: any, server: any): boolean {
    const norm = (v: any) => (v === null || v === undefined || v === '' || Number(v) === 0)
      ? 0 : (isNaN(Number(v)) ? String(v).trim() : Number(v));
    return ['mortality', 'feed_consumed_kg', 'temperature_celsius', 'avg_weight_kg', 'water_consumed_l', 'egg_count', 'broken_egg_count', 'notes']
      .every(k => norm(payload?.[k]) === norm(server?.[k]));
  }

  private recordDateStr(r: any): string {
    const d = r?.recordDate ?? r?.record_date ?? '';
    return typeof d === 'string' ? d.slice(0, 10) : '';
  }

  private markFailed(item: any, reason: string): Promise<boolean> {
    return this.withQueueLock(async () => {
      const f = await this.cacheGet(PendingRecordsService.FAILED_KEY);
      const list = Array.isArray(f) ? f : [];
      list.push({ ...item, reason, failedAt: new Date().toISOString() });
      return this.cacheSet(PendingRecordsService.FAILED_KEY, list);
    });
  }

  /** بيشيل المرفوضة بتاعة قطيع معيّن (الافتراضي: القطيع النشط) من القايمة */
  async dismissFailed(flockId: string | null = this.activeFlockId): Promise<void> {
    await this.withQueueLock(async () => {
      const f = await this.cacheGet(PendingRecordsService.FAILED_KEY);
      await this.cacheSet(PendingRecordsService.FAILED_KEY, (Array.isArray(f) ? f : []).filter((x: any) => x.flockId !== flockId));
    });
    await this.refresh();
  }

  /**
   * 🔄 يبعت سجلات المستخدم الحالي المحفوظة للسيرفر بالترتيب.
   * الرسائل وتحديث الشاشة مسؤولية اللي نادى (النتيجة فيها عدد المبعوت والمرفوض).
   */
  async sync(): Promise<SyncResult> {
    const none: SyncResult = { ran: false, sent: 0, failed: 0 };
    if (this.syncing() || typeof navigator === 'undefined' || !navigator.onLine || !this.store.enabled) return none;
    // ⚠️ العلم لازم يترفع قبل أي await: لو استُدعيت مرتين في نفس اللحظة (رجوع النت + فتح شاشة) الاتنين كانوا
    // هيعدّوا الفحص اللي فوق ويبعتوا نفس السجلات مرتين.
    this.syncing.set(true);

    let sent = 0, failed = 0;
    try {
      const uid = await this.auth.currentUserId();
      if (!uid) return none;
      // دفاع إضافي: التخزين أصلاً مفصول لكل مستخدم، وده يضمن إننا مانبعتش سجل اتخزّن باسم مستخدم تاني
      const queue = (await this.readQueue()).filter(x => !x.userId || x.userId === uid);
      if (!queue.length) return none;

      const existingByFlock: Record<string, Record<string, any>> = {}; // تاريخ → صف السجل كما رجع من السيرفر
      for (const item of queue) {
        try {
          if (item.kind === 'create') {
            if (!existingByFlock[item.flockId]) {
              const rows = await firstValueFrom(this.http.get<any[]>(`${environment.apiUrl}/flocks/${item.flockId}/records`));
              const m: Record<string, any> = {};
              (rows || []).forEach(r => { const d = this.recordDateStr(r); if (d) m[d] = r; });
              existingByFlock[item.flockId] = m;
            }
            const existing = existingByFlock[item.flockId][item.date];
            if (existing) {
              // 🛡️ فيه سجل لنفس اليوم على السيرفر — مانكتبش فوقه (ممكن يكون لعضو تاني، وتعديل النفوق بيغيّر عدد الطيور)
              if (this.sameRecordValues(item.payload, existing)) {
                // نفس القيم بالظبط (غالبًا الإرسال الأول وصل والرد ضاع) — مفيش حاجة نبعتها
                await this.removeFromQueue(item.id);
                sent++;
                continue;
              }
              const who = existing.created_by_name ? ` (سجّله ${existing.created_by_name})` : '';
              const saved = await this.markFailed(item, `فيه سجل مختلف لنفس اليوم على السيرفر${who} — مااتكتبش فوقه`);
              if (!saved) break;
              await this.removeFromQueue(item.id);
              failed++;
              continue;
            }
            await firstValueFrom(this.flocks.addRecord(item.payload));
          } else {
            // تعديل مقصود من المستخدم لسجل معروف
            const fields = { ...item.payload };
            delete fields.flock_id; delete fields.record_date;
            if (fields.water_consumed_l === null || fields.water_consumed_l === undefined) delete fields.water_consumed_l;
            await firstValueFrom(this.http.patch<any>(`${environment.apiUrl}/flocks/${item.flockId}/records/${item.recordId}`, fields));
          }
          await this.removeFromQueue(item.id);
          sent++;
        } catch (err: any) {
          const st = err?.status;
          if (!st || st === 401 || st >= 500) break; // مش وقته (نت/سيرفر/جلسة منتهية) — نسيبه ونحاول تاني
          // رفض نهائي (400/403/404/409/422...): نحفظه في قايمة "المرفوضة" الأول، وبعدها بس نشيله من الطابور — مفيش بيانات بتضيع بصمت
          const detail = err?.error?.detail;
          const saved = await this.markFailed(item, typeof detail === 'string' ? detail : `خطأ ${st}`);
          if (!saved) break;
          await this.removeFromQueue(item.id);
          failed++;
        }
      }
    } finally {
      this.syncing.set(false);
      await this.refresh();
    }
    return { ran: true, sent, failed };
  }
}
