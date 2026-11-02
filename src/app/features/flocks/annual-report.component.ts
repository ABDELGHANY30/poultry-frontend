import { Component, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, forkJoin, of } from 'rxjs';
import { FlockService } from '../../core/services/flock.service';
import { environment } from '../../../environments/environment';

const TYPE_LABEL: Record<string, string> = {
  broiler: '🐔 تسمين', layer: '🥚 بياض', turkey: '🦃 رومي', duck: '🦆 بط', quail: '🐦 سمان', rabbit: '🐇 أرانب',
};
const FLOCKS_CACHE = 'annual:v1:flocks';
const AN_CACHE = (id: string) => `annual:v1:an:${id}`;

type Filter = 'all' | 'active' | 'ended';

/**
 * 📊 التقارير: كل دورات السنة (الجارية والمنتهية) + إجماليات + ملخص لكل نوع.
 * كل دورة قطيع منفصل بتقريره الخاص. بيشتغل أوفلاين: آخر أرقام اتجابت بتتحفظ على الجهاز.
 */
@Component({
  selector: 'app-annual-report',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <div class="page-wrapper">
    <a routerLink="/flocks" class="print:hidden inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 no-underline">← القطعان</a>

    <div class="flex items-center justify-between mt-2">
      <h1 class="text-2xl font-black text-primary-900">📊 التقارير</h1>
      <select class="form-select print:hidden w-28" [ngModel]="year()" (ngModelChange)="year.set(+$event)">
        <option *ngFor="let y of years()" [ngValue]="y">{{ y }}</option>
      </select>
    </div>
    <p class="text-xs text-[var(--c-muted)] mt-1">
      كل دورة لها تقريرها المنفصل (من صفحة القطيع)، وده تجميع دورات سنة {{ year() }} حسب تاريخ بدايتها.
    </p>

    <!-- أوفلاين / أرقام محفوظة -->
    <div *ngIf="staleCount() > 0" class="print:hidden mt-2 rounded-xl border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-900 flex items-center justify-between gap-2">
      <span>📴 {{ staleCount() }} دورة بأرقام محفوظة على الجهاز<span *ngIf="oldestCache()"> (آخر تحديث {{ oldestCache() }})</span>.</span>
      <button type="button" (click)="refresh()" class="font-bold underline flex-shrink-0">🔄 تحديث</button>
    </div>

    <p *ngIf="loading()" class="text-center text-sm text-[var(--c-muted)] py-4">جاري تجميع الأرقام...</p>
    <p *ngIf="!loading() && cycles().length === 0" class="text-center text-sm text-[var(--c-muted)] py-8">مفيش دورات بدأت في سنة {{ year() }}.</p>

    <ng-container *ngIf="cycles().length > 0">
      <!-- فلتر -->
      <div class="print:hidden flex gap-2 mt-3">
        <button *ngFor="let f of filters" type="button" (click)="filter.set(f.key)"
                class="flex-1 py-1.5 rounded-full text-xs font-bold border"
                [class.bg-green-600]="filter() === f.key" [class.text-white]="filter() === f.key"
                [class.border-gray-200]="filter() !== f.key" [class.text-gray-600]="filter() !== f.key">
          {{ f.label }} ({{ countFor(f.key) }})
        </button>
      </div>

      <!-- إجماليات -->
      <div class="grid grid-cols-2 gap-3 mt-3">
        <div class="card text-center"><p class="text-2xl font-black mb-0">{{ totals().cycles }}</p><p class="text-[11px] text-[var(--c-muted)] mb-0">دورة ({{ totals().ended }} منتهية)</p></div>
        <div class="card text-center"><p class="text-2xl font-black mb-0">{{ totals().placed | number }}</p><p class="text-[11px] text-[var(--c-muted)] mb-0">طائر اتربّى</p></div>
        <div class="card text-center"><p class="text-2xl font-black mb-0">{{ totals().mortalityRate }}%</p><p class="text-[11px] text-[var(--c-muted)] mb-0">النفوق ({{ totals().dead | number }})</p></div>
        <div class="card text-center"><p class="text-2xl font-black mb-0">{{ totals().feedKg | number:'1.0-0' }}</p><p class="text-[11px] text-[var(--c-muted)] mb-0">كجم علف</p></div>
        <div *ngIf="totals().eggs > 0" class="card text-center"><p class="text-2xl font-black mb-0">{{ totals().eggs | number }}</p><p class="text-[11px] text-[var(--c-muted)] mb-0">بيضة</p></div>
        <div *ngIf="totals().avgFcr" class="card text-center">
          <p class="text-2xl font-black mb-0">{{ totals().avgFcr }}</p>
          <p class="text-[11px] text-[var(--c-muted)] mb-0">متوسط معدل التحويل ({{ totals().fcrCycles }} دورة)</p>
        </div>
      </div>
      <p *ngIf="totals().partialCycles > 0" class="text-[11px] text-amber-700 mt-2 mb-0">
        ⚠️ {{ totals().partialCycles }} دورة بياناتها جزئية، فمش داخلة في متوسط معدل التحويل.
      </p>

      <!-- ملخص لكل نوع -->
      <ng-container *ngIf="byType().length > 1">
        <h2 class="section-title mt-4">حسب النوع</h2>
        <div class="card text-xs space-y-1">
          <p *ngFor="let t of byType()" class="mb-0 flex items-center justify-between gap-2">
            <b>{{ typeLabel(t.type) }}</b>
            <span>{{ t.cycles }} دورة · {{ t.placed | number }} طائر · نفوق {{ t.mortalityRate }}%<span *ngIf="t.avgFcr"> · تحويل {{ t.avgFcr }}</span></span>
          </p>
        </div>
      </ng-container>

      <!-- كل دورة -->
      <h2 class="section-title mt-4">الدورات</h2>
      <div class="space-y-2">
        <div *ngFor="let r of rows(); trackBy: trackRow" class="card">
          <div class="flex items-center justify-between gap-2">
            <p class="mb-0 font-black text-sm">{{ typeLabel(r.f.type) }} — {{ r.f.name }}</p>
            <span class="text-[10px] px-2 py-0.5 rounded-full font-bold"
                  [class.bg-green-100]="r.f.status === 'active'" [class.text-green-700]="r.f.status === 'active'"
                  [class.bg-gray-200]="r.f.status !== 'active'" [class.text-gray-600]="r.f.status !== 'active'">
              {{ r.f.status === 'active' ? 'جارية' : 'منتهية' }}
            </span>
          </div>
          <p class="text-[11px] text-[var(--c-muted)] mb-2">
            بدأت {{ day(r.f.startDate) }}
            <span *ngIf="r.f.id === bestId()" class="font-bold text-green-700"> · 🏆 أقل نفوق</span>
          </p>
          <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <p class="mb-0">العدد: <b>{{ r.f.initialCount | number }}</b> ← <b>{{ r.f.currentCount | number }}</b></p>
            <p class="mb-0">النفوق: <b>{{ r.a ? (num(r.a, 'mortality_rate', 'mortalityRate') | number:'1.0-1') + '%' : '—' }}</b></p>
            <p class="mb-0">العلف: <b>{{ r.a ? ((num(r.a, 'total_feed_kg', 'totalFeedKg') | number:'1.0-0') + ' كجم') : '—' }}</b></p>
            <p class="mb-0">معدل التحويل:
              <b>{{ r.a && num(r.a, 'fcr', 'fcr') ? (num(r.a, 'fcr', 'fcr') | number:'1.2-2') : '—' }}</b>
              <span *ngIf="r.a && isPartial(r.a)" class="text-amber-600 font-bold"> (جزئي)</span>
            </p>
            <p *ngIf="r.a && num(r.a, 'total_eggs', 'totalEggs') > 0" class="mb-0">البيض: <b>{{ num(r.a, 'total_eggs', 'totalEggs') | number }}</b></p>
          </div>
          <div class="print:hidden flex items-center gap-4 mt-2">
            <a [routerLink]="['/flocks', r.f.id]" class="text-xs font-bold text-green-700 no-underline">تقرير الدورة ←</a>
            <a *ngIf="r.f.status !== 'active'" [routerLink]="['/flocks', r.f.id]" class="text-xs font-bold text-amber-700 no-underline">🧹 التطهير والدورة الجاية ←</a>
          </div>
        </div>
      </div>

      <button type="button" (click)="print()" class="print:hidden mt-4 w-full py-3 rounded-xl bg-gray-50 text-gray-700 font-bold border border-gray-200">
        🖨️ طباعة / حفظ PDF
      </button>
    </ng-container>
  </div>
  `,
})
export class AnnualReportComponent implements OnInit {
  private svc = inject(FlockService);
  private http = inject(HttpClient);

  year = signal(new Date().getFullYear());
  filter = signal<Filter>('all');
  filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'الكل' }, { key: 'active', label: 'جارية' }, { key: 'ended', label: 'منتهية' },
  ];
  loading = signal(false);
  analytics = signal<Record<string, any>>({});
  stale = signal<Record<string, string>>({});          // id -> وقت الحفظ (أرقام من الكاش)
  private cachedFlocks = signal<any[]>(this.readCachedFlocks());

  private flockYear = (f: any) => Number(String(f.startDate ?? '').slice(0, 4));

  // قايمة القطعان: من السيرفر لو متاحة، وإلا آخر نسخة محفوظة (أوفلاين)
  base = computed<any[]>(() => {
    const live = this.svc.flocks() as any[];
    return live.length ? live : this.cachedFlocks();
  });

  years = computed(() => {
    const ys = new Set<number>([new Date().getFullYear()]);
    for (const f of this.base()) { const y = this.flockYear(f); if (y) ys.add(y); }
    return [...ys].sort((a, b) => b - a);
  });

  yearCycles = computed(() =>
    this.base().filter(f => this.flockYear(f) === this.year())
      .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate))));

  cycles = computed(() => this.yearCycles());

  rows = computed(() => {
    const flt = this.filter();
    return this.yearCycles()
      .filter(f => flt === 'all' || (flt === 'active' ? f.status === 'active' : f.status !== 'active'))
      .map(f => ({ f, a: this.analytics()[f.id] ?? null }));
  });

  countFor = (k: Filter) => this.yearCycles().filter(f => k === 'all' || (k === 'active' ? f.status === 'active' : f.status !== 'active')).length;

  staleCount = computed(() => Object.keys(this.stale()).filter(id => this.yearCycles().some(f => f.id === id)).length);
  oldestCache = computed(() => {
    const ts = Object.entries(this.stale()).filter(([id]) => this.yearCycles().some(f => f.id === id)).map(([, t]) => t).sort();
    return ts.length ? new Date(ts[0]).toLocaleDateString('en-GB') : '';
  });

  private agg(rows: { f: any; a: any }[]) {
    const n = (a: any, s: string, c: string) => this.num(a, s, c);
    const placed = rows.reduce((t, r) => t + Number(r.f.initialCount || 0), 0);
    const dead = rows.reduce((t, r) => t + (r.a ? n(r.a, 'total_mortality', 'totalMortality')
      : Math.max(0, Number(r.f.initialCount || 0) - Number(r.f.currentCount || 0))), 0);
    const fcrRows = rows.filter(r => r.a && n(r.a, 'fcr', 'fcr') > 0 && !this.isPartial(r.a));
    const avg = fcrRows.length ? fcrRows.reduce((t, r) => t + n(r.a, 'fcr', 'fcr'), 0) / fcrRows.length : 0;
    return {
      cycles: rows.length,
      ended: rows.filter(r => r.f.status !== 'active').length,
      placed, dead,
      mortalityRate: placed ? Math.round(dead / placed * 1000) / 10 : 0,
      feedKg: rows.reduce((t, r) => t + (r.a ? n(r.a, 'total_feed_kg', 'totalFeedKg') : 0), 0),
      eggs: rows.reduce((t, r) => t + (r.a ? n(r.a, 'total_eggs', 'totalEggs') : 0), 0),
      avgFcr: avg ? Math.round(avg * 100) / 100 : 0,
      fcrCycles: fcrRows.length,
      partialCycles: rows.filter(r => r.a && this.isPartial(r.a)).length,
    };
  }

  totals = computed(() => this.agg(this.rows()));

  byType = computed(() => {
    const groups = new Map<string, { f: any; a: any }[]>();
    for (const r of this.rows()) groups.set(r.f.type, [...(groups.get(r.f.type) ?? []), r]);
    return [...groups.entries()].map(([type, rs]) => ({ type, ...this.agg(rs) }));
  });

  // 🏆 أقل نفوق بين الدورات (لو فيه أكتر من دورة بأرقام)
  bestId = computed(() => {
    const withA = this.rows().filter(r => r.a);
    if (withA.length < 2) return '';
    return withA.reduce((best, r) =>
      this.num(r.a, 'mortality_rate', 'mortalityRate') < this.num(best.a, 'mortality_rate', 'mortalityRate') ? r : best).f.id;
  });

  constructor() {
    effect(() => {
      const list = this.cycles();
      untracked(() => this.loadMissing(list));
    });
    // حفظ نسخة من قايمة القطعان للاستخدام أوفلاين
    effect(() => {
      const live = this.svc.flocks() as any[];
      if (!live.length) return;
      untracked(() => {
        const slim = live.map(f => ({ id: f.id, name: f.name, type: f.type, status: f.status, startDate: f.startDate, initialCount: f.initialCount, currentCount: f.currentCount }));
        try { localStorage.setItem(FLOCKS_CACHE, JSON.stringify(slim)); } catch { /* تجاهل */ }
      });
    });
  }

  ngOnInit() { this.svc.getFlocks().subscribe({ error: () => {} }); }

  private readCachedFlocks(): any[] {
    try { const raw = localStorage.getItem(FLOCKS_CACHE); const v = raw ? JSON.parse(raw) : []; return Array.isArray(v) ? v : []; } catch { return []; }
  }
  private readCachedAnalytics(id: string): { t: string; d: any } | null {
    try { const raw = localStorage.getItem(AN_CACHE(id)); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }

  private loadMissing(list: any[]) {
    const have = this.analytics();
    const missing = list.filter(f => !(f.id in have));
    if (!missing.length) return;
    this.loading.set(true);
    forkJoin(missing.map(f =>
      this.http.get<any>(`${environment.apiUrl}/flocks/${f.id}/analytics`).pipe(catchError(() => of(null)))
    )).subscribe(res => {
      const next = { ...this.analytics() };
      const stale = { ...this.stale() };
      missing.forEach((f, i) => {
        if (res[i]) {
          next[f.id] = res[i];
          delete stale[f.id];
          try { localStorage.setItem(AN_CACHE(f.id), JSON.stringify({ t: new Date().toISOString(), d: res[i] })); } catch { /* تجاهل */ }
        } else {
          // أوفلاين أو فشل: نستخدم آخر أرقام محفوظة
          const c = this.readCachedAnalytics(f.id);
          next[f.id] = c?.d ?? null;
          if (c) stale[f.id] = c.t;
        }
      });
      this.analytics.set(next);
      this.stale.set(stale);
      this.loading.set(false);
    });
  }

  refresh() {
    const stale = this.stale();
    const next = { ...this.analytics() };
    for (const id of Object.keys(stale)) delete next[id];
    this.analytics.set(next);
    this.loadMissing(this.cycles());
  }

  num = (a: any, snake: string, camel: string): number => Number(a?.[snake] ?? a?.[camel] ?? 0) || 0;
  isPartial = (a: any): boolean => !!(a?.['is_partial'] ?? a?.isPartial);
  typeLabel = (t: string) => TYPE_LABEL[t] ?? t;
  day = (d: any) => String(d ?? '').split('T')[0];
  trackRow = (_: number, r: { f: { id: string } }) => r.f.id;
  print() { window.print(); }
}
