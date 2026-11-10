import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlockReportService, FlockLike, CardResult } from './flock-report.service';
import { ReportLineChartComponent } from './report-line-chart.component';
import { ChartSeries } from './chart-utils';

/**
 * كارت تقرير القطيع لأعلى لوحة التحكم: بيظهر لما المستخدم يختار قطيع، ويتحدّث لما يغيّر الاختيار.
 *
 *   <app-flock-report-card *ngIf="selectedFlock()" [flock]="selectedFlock()"
 *       (openFull)="openReports($event)" (closed)="selectedFlock.set(null)"></app-flock-report-card>
 */
@Component({
  selector: 'app-flock-report-card',
  standalone: true,
  imports: [CommonModule, ReportLineChartComponent],
  template: `
    <section *ngIf="flock as f" class="card mb-4">
      <header class="flex items-start justify-between gap-2 mb-3">
        <div class="min-w-0">
          <div class="text-[11px] text-gray-400">📊 تقرير آخر 7 أيام</div>
          <h3 class="font-black text-gray-800 truncate">{{ f.name }}</h3>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button type="button" (click)="load(true)" [disabled]="loading()" class="text-gray-400 px-2 py-1 text-sm" aria-label="تحديث">🔄</button>
          <button *ngIf="showClose" type="button" (click)="closed.emit()" class="text-gray-400 px-2 py-1 text-sm" aria-label="إغلاق">✕</button>
        </div>
      </header>

      <div *ngIf="result()?.note" class="bg-gray-100 border border-gray-200 text-gray-600 rounded-xl p-2 text-[11px] leading-relaxed mb-3">{{ result()?.note }}</div>

      <div *ngIf="pendingNow() > 0 && result()?.source === 'server'" class="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-2 text-[11px] mb-3">
        ⏳ {{ pendingNow() }} تسجيل لسه ما اتبعتش وهو مش داخل في الملخص.
        <button type="button" (click)="syncNow()" [disabled]="syncing()" class="font-bold text-green-700 underline mr-1">{{ syncing() ? 'جاري الإرسال...' : 'ابعتهم دلوقتي' }}</button>
      </div>

      <div *ngIf="loading() && !report()" class="space-y-2" aria-busy="true">
        <div class="h-12 bg-gray-100 rounded-xl animate-pulse"></div>
        <div class="grid grid-cols-2 gap-2"><div class="h-14 bg-gray-100 rounded-xl animate-pulse"></div><div class="h-14 bg-gray-100 rounded-xl animate-pulse"></div></div>
      </div>

      <div *ngIf="errorText() as err" class="bg-red-50 border border-red-100 text-red-700 rounded-xl p-3 text-xs flex items-center justify-between gap-2">
        <span>{{ err }}</span>
        <button type="button" (click)="load(true)" class="font-bold underline whitespace-nowrap">إعادة المحاولة</button>
      </div>

      <div *ngIf="noData()" class="text-center py-4 text-gray-400 text-sm">مفيش تسجيلات في آخر 7 أيام للقطيع ده</div>

      <ng-container *ngIf="report() as r">
        <!-- حالة القطيع: أهم حاجة في أول نظرة -->
        <div class="rounded-xl p-3 mb-3 text-sm font-bold"
             [class.bg-red-50]="r.events_summary?.critical > 0" [class.text-red-700]="r.events_summary?.critical > 0"
             [class.bg-amber-50]="!(r.events_summary?.critical > 0) && r.events_summary?.warning > 0" [class.text-amber-800]="!(r.events_summary?.critical > 0) && r.events_summary?.warning > 0"
             [class.bg-green-50]="!(r.events_summary?.critical > 0) && !(r.events_summary?.warning > 0)" [class.text-green-700]="!(r.events_summary?.critical > 0) && !(r.events_summary?.warning > 0)">
          <ng-container *ngIf="r.events_summary?.critical > 0">⚠️ {{ r.events_summary.critical }} تنبيه حرج<span *ngIf="r.events_summary.warning > 0"> و{{ r.events_summary.warning }} تنبيه</span></ng-container>
          <ng-container *ngIf="!(r.events_summary?.critical > 0) && r.events_summary?.warning > 0">🟠 {{ r.events_summary.warning }} تنبيه يستاهل المتابعة</ng-container>
          <ng-container *ngIf="!(r.events_summary?.critical > 0) && !(r.events_summary?.warning > 0)">✅ مفيش تنبيهات في آخر 7 أيام</ng-container>
        </div>

        <div class="grid grid-cols-2 gap-2 text-sm mb-3">
          <div class="bg-gray-50 rounded-xl p-2.5">
            <div class="text-[11px] text-gray-400">النفوق</div>
            <div class="font-black text-red-600">{{ r.total_mortality }}
              <span *ngIf="mortalityChip() as ch" class="text-[10px] font-bold" [ngClass]="ch.cls">{{ ch.text }}</span></div>
          </div>
          <div class="bg-gray-50 rounded-xl p-2.5">
            <div class="text-[11px] text-gray-400">العلف</div>
            <div class="font-black">{{ r.total_feed_kg | number:'1.0-0' }} كجم</div>
          </div>
          <div *ngIf="r.total_eggs == null" class="bg-gray-50 rounded-xl p-2.5">
            <div class="text-[11px] text-gray-400">آخر وزن</div>
            <div class="font-black">{{ r.weight_end_kg != null ? (r.weight_end_kg + ' كجم') : '—' }}
              <span *ngIf="r.avg_daily_gain_g != null" class="text-[10px] text-green-600 font-bold">+{{ r.avg_daily_gain_g }} جم/يوم</span></div>
          </div>
          <div *ngIf="r.total_eggs != null" class="bg-gray-50 rounded-xl p-2.5">
            <div class="text-[11px] text-gray-400">البيض</div>
            <div class="font-black">{{ r.total_eggs | number:'1.0-0' }}
              <span *ngIf="r.avg_hen_day_pct != null" class="text-[10px] text-gray-500 font-bold">({{ r.avg_hen_day_pct }}%)</span></div>
          </div>
          <div class="bg-gray-50 rounded-xl p-2.5">
            <div class="text-[11px] text-gray-400">متوسط الحرارة</div>
            <div class="font-black">{{ r.avg_temperature != null ? (r.avg_temperature + '°') : '—' }}
              <span *ngIf="r.max_temperature != null" class="text-[10px] text-gray-400 font-normal">(أعلى {{ r.max_temperature }}°)</span></div>
          </div>
        </div>

        <app-report-line-chart [labels]="chartLabels()" [series]="chartSeries()" mode="bars" [zeroBased]="true" [height]="110" ariaLabel="النفوق اليومي"></app-report-line-chart>

        <div *ngIf="topEvents().length" class="mt-3 space-y-2">
          <div class="text-xs font-bold text-gray-500">أهم الأحداث</div>
          <div *ngFor="let e of topEvents()" class="rounded-xl p-2.5 text-xs border"
               [class.border-red-100]="e.severity === 'critical'" [class.bg-red-50]="e.severity === 'critical'"
               [class.border-amber-100]="e.severity === 'warning'" [class.bg-amber-50]="e.severity === 'warning'"
               [class.border-gray-100]="e.severity === 'info'" [class.bg-gray-50]="e.severity === 'info'">
            <div class="font-bold text-gray-800">{{ e.title_ar }} <span class="font-normal text-gray-400">· {{ e.date }}</span></div>
            <div class="text-gray-500 leading-relaxed mt-0.5">{{ e.reason_ar }}</div>
          </div>
        </div>

        <div *ngIf="r.completeness_pct < 70" class="text-[11px] text-amber-700 mt-3">⚠️ سجّلت {{ r.days_recorded }} يوم من {{ r.span_days }} — الأرقام تقريبية.</div>

        <button type="button" (click)="openFull.emit(f.id)" class="w-full mt-3 py-2.5 rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm font-bold">التقرير الكامل ←</button>
      </ng-container>
    </section>
  `,
})
export class FlockReportCardComponent implements OnChanges {
  @Input() flock: FlockLike | null = null;
  /** false في لوحة التحكم (دايمًا فيه قطيع مختار) */
  @Input() showClose = true;
  /** المستخدم ضغط "التقرير الكامل" (بيبعت id القطيع — اللي بيستخدمه بيفتح صفحة التقارير) */
  @Output() openFull = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();

  private svc = inject(FlockReportService);

  loading = signal(false);
  syncing = signal(false);
  result = signal<CardResult | null>(null);
  report = signal<any | null>(null);
  topEvents = signal<any[]>([]);
  chartLabels = signal<string[]>([]);
  chartSeries = signal<ChartSeries[]>([]);
  errorText = signal<string | null>(null);
  noData = signal(false);
  pendingNow = signal(0);

  private seq = 0; // بنتجاهل ردود قديمة لو المستخدم بدّل القطيع بسرعة

  ngOnChanges(ch: SimpleChanges): void {
    if (!ch['flock']) return;
    const prev = ch['flock'].previousValue as FlockLike | null | undefined;
    if (this.flock && this.flock.id !== prev?.id) {
      this.report.set(null); this.result.set(null); this.errorText.set(null); this.noData.set(false);
      void this.load(false);
    }
  }

  async load(force = false): Promise<void> {
    const flock = this.flock;
    if (!flock) return;
    const mine = ++this.seq;
    this.loading.set(true);
    this.errorText.set(null);
    const res = await this.svc.weekly(flock, force);
    if (mine !== this.seq) return;
    this.loading.set(false);
    this.result.set(res);
    this.pendingNow.set(res.pending);
    if (!res.ok) { this.report.set(null); this.errorText.set(res.error ?? 'حصل خطأ'); return; }
    const d = res.data;
    if (!d?.has_data) { this.report.set(null); this.noData.set(true); return; }
    this.noData.set(false);
    this.report.set(d);
    this.topEvents.set((d.events ?? []).slice(0, 3));
    const rows: any[] = d.daily_breakdown ?? [];
    this.chartLabels.set(rows.map(x => x.date));
    this.chartSeries.set([{ name: 'النفوق', color: '#ef4444', values: rows.map(x => Number(x.mortality ?? 0)) }]);
  }

  async syncNow(): Promise<void> {
    this.syncing.set(true);
    try { await this.svc.syncPending(); } finally { this.syncing.set(false); }
    await this.load(true);
  }

  /** شارة مقارنة النفوق بالأسبوع اللي قبله (الأخضر = تحسّن) */
  mortalityChip(): { text: string; cls: string } | null {
    const it = this.report()?.comparison?.mortality;
    if (!it || it.change_pct == null || !it.trend) return null;
    const arrow = it.trend.startsWith('up') ? '▲' : '▼';
    const cls = it.trend.endsWith('_good') ? 'text-green-600' : it.trend.endsWith('_bad') ? 'text-red-500' : 'text-gray-400';
    return { text: `${arrow} ${Math.abs(it.change_pct)}%`, cls };
  }
}
