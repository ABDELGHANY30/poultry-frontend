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

/**
 * 📊 التقرير السنوي: ملخص كل دورات السنة (كل دورة قطيع منفصل بتقريره الخاص) + إجماليات السنة.
 * الدورة بتتحسب على السنة اللي بدأت فيها. الأرقام من نفس تحليلات كل قطيع (/flocks/{id}/analytics).
 */
@Component({
  selector: 'app-annual-report',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <div class="page-wrapper">
    <a routerLink="/flocks" class="print:hidden inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 no-underline">← القطعان</a>

    <div class="flex items-center justify-between mt-2">
      <h1 class="text-2xl font-black text-primary-900">📊 التقرير السنوي</h1>
      <select class="form-select print:hidden w-28" [ngModel]="year()" (ngModelChange)="year.set(+$event)">
        <option *ngFor="let y of years()" [ngValue]="y">{{ y }}</option>
      </select>
    </div>
    <p class="text-xs text-[var(--c-muted)] mt-1">
      كل دورة لها تقريرها المنفصل (من صفحة القطيع)، وده تجميع لدورات سنة {{ year() }} حسب تاريخ بدايتها.
    </p>

    <p *ngIf="loading()" class="text-center text-sm text-[var(--c-muted)] py-6">جاري تجميع الأرقام...</p>

    <p *ngIf="!loading() && cycles().length === 0" class="text-center text-sm text-[var(--c-muted)] py-8">
      مفيش دورات بدأت في سنة {{ year() }}.
    </p>

    <ng-container *ngIf="cycles().length > 0">
      <!-- إجماليات السنة -->
      <div class="grid grid-cols-2 gap-3 mt-3">
        <div class="card text-center"><p class="text-2xl font-black mb-0">{{ totals().cycles }}</p><p class="text-[11px] text-[var(--c-muted)] mb-0">دورة ({{ totals().ended }} منتهية)</p></div>
        <div class="card text-center"><p class="text-2xl font-black mb-0">{{ totals().placed | number }}</p><p class="text-[11px] text-[var(--c-muted)] mb-0">طائر اتربّى</p></div>
        <div class="card text-center"><p class="text-2xl font-black mb-0">{{ totals().mortalityRate }}%</p><p class="text-[11px] text-[var(--c-muted)] mb-0">النفوق الكلي ({{ totals().dead | number }})</p></div>
        <div class="card text-center"><p class="text-2xl font-black mb-0">{{ totals().feedKg | number:'1.0-0' }}</p><p class="text-[11px] text-[var(--c-muted)] mb-0">كجم علف</p></div>
        <div *ngIf="totals().eggs > 0" class="card text-center"><p class="text-2xl font-black mb-0">{{ totals().eggs | number }}</p><p class="text-[11px] text-[var(--c-muted)] mb-0">بيضة</p></div>
        <div *ngIf="totals().avgFcr" class="card text-center">
          <p class="text-2xl font-black mb-0">{{ totals().avgFcr }}</p>
          <p class="text-[11px] text-[var(--c-muted)] mb-0">متوسط معدل التحويل ({{ totals().fcrCycles }} دورة)</p>
        </div>
      </div>
      <p *ngIf="totals().partialCycles > 0" class="text-[11px] text-amber-700 mt-2 mb-0">
        ⚠️ {{ totals().partialCycles }} دورة بياناتها جزئية (اتسجّلت بعد بدايتها)، فمش داخلة في متوسط معدل التحويل.
      </p>

      <!-- كل دورة -->
      <h2 class="section-title mt-4">دورات {{ year() }}</h2>
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
          <p class="text-[11px] text-[var(--c-muted)] mb-2">بدأت {{ day(r.f.startDate) }}</p>
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
          <a [routerLink]="['/flocks', r.f.id]" class="print:hidden inline-block mt-2 text-xs font-bold text-green-700 no-underline">تقرير الدورة ←</a>
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
  loading = signal(false);
  analytics = signal<Record<string, any>>({});

  private flockYear = (f: any) => Number(String(f.startDate ?? '').slice(0, 4));

  years = computed(() => {
    const ys = new Set<number>([new Date().getFullYear()]);
    for (const f of this.svc.flocks() as any[]) { const y = this.flockYear(f); if (y) ys.add(y); }
    return [...ys].sort((a, b) => b - a);
  });

  cycles = computed(() =>
    (this.svc.flocks() as any[])
      .filter(f => this.flockYear(f) === this.year())
      .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate))));

  rows = computed(() => this.cycles().map(f => ({ f, a: this.analytics()[f.id] ?? null })));

  totals = computed(() => {
    const rows = this.rows();
    const n = (a: any, s: string, c: string) => this.num(a, s, c);
    const placed = rows.reduce((t, r) => t + Number(r.f.initialCount || 0), 0);
    const dead = rows.reduce((t, r) => t + (r.a ? n(r.a, 'total_mortality', 'totalMortality') : Math.max(0, Number(r.f.initialCount || 0) - Number(r.f.currentCount || 0))), 0);
    const fcrRows = rows.filter(r => r.a && n(r.a, 'fcr', 'fcr') > 0 && !this.isPartial(r.a));
    const avg = fcrRows.length ? fcrRows.reduce((t, r) => t + n(r.a, 'fcr', 'fcr'), 0) / fcrRows.length : 0;
    return {
      cycles: rows.length,
      ended: rows.filter(r => r.f.status !== 'active').length,
      placed,
      dead,
      mortalityRate: placed ? Math.round(dead / placed * 1000) / 10 : 0,
      feedKg: rows.reduce((t, r) => t + (r.a ? n(r.a, 'total_feed_kg', 'totalFeedKg') : 0), 0),
      eggs: rows.reduce((t, r) => t + (r.a ? n(r.a, 'total_eggs', 'totalEggs') : 0), 0),
      avgFcr: avg ? Math.round(avg * 100) / 100 : 0,
      fcrCycles: fcrRows.length,
      partialCycles: rows.filter(r => r.a && this.isPartial(r.a)).length,
    };
  });

  constructor() {
    // لما تتغير دورات السنة المختارة نجيب تحليلات اللي لسه مجبناهوش
    effect(() => {
      const list = this.cycles();
      untracked(() => this.loadMissing(list));
    });
  }

  ngOnInit() { this.svc.getFlocks().subscribe(); }

  private loadMissing(list: any[]) {
    const have = this.analytics();
    const missing = list.filter(f => !(f.id in have));
    if (!missing.length) return;
    this.loading.set(true);
    forkJoin(missing.map(f =>
      this.http.get<any>(`${environment.apiUrl}/flocks/${f.id}/analytics`).pipe(catchError(() => of(null)))
    )).subscribe(res => {
      const next = { ...this.analytics() };
      missing.forEach((f, i) => { next[f.id] = res[i]; });
      this.analytics.set(next);
      this.loading.set(false);
    });
  }

  num = (a: any, snake: string, camel: string): number => Number(a?.[snake] ?? a?.[camel] ?? 0) || 0;
  isPartial = (a: any): boolean => !!(a?.['is_partial'] ?? a?.isPartial);
  typeLabel = (t: string) => TYPE_LABEL[t] ?? t;
  day = (d: any) => String(d ?? '').split('T')[0];
  trackRow = (_: number, r: { f: { id: string } }) => r.f.id;
  print() { window.print(); }
}
