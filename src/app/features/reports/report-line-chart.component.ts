import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ChartSeries, buildSegments, formatTick, niceScale, pickLabelIndexes, shortDate, ticksFor,
} from './chart-utils';

interface Tick { label: string; y: number; }
interface Path { d: string; color: string; dashed: boolean; }
interface Dot { x: number; y: number; color: string; }
interface Bar { x: number; y: number; w: number; h: number; color: string; }
interface XLabel { x: number; text: string; }
interface Legend { name: string; color: string; dashed: boolean; last: string | null; }
interface View {
  vbH: number; ticks: Tick[]; paths: Path[]; dots: Dot[]; bars: Bar[]; xLabels: XLabel[];
  legend: Legend[]; plotLeft: number; plotRight: number;
}

/**
 * رسم خطي/أعمدة خفيف لتقارير القطيع: محاور بقيم مستديرة، تواريخ، وخط مستهدف متقطع.
 * الاستخدام:
 *   <app-report-line-chart [labels]="dates" [series]="[{name:'النفوق', color:'#ef4444', values:[...]}]"
 *                          mode="bars" [zeroBased]="true"></app-report-line-chart>
 */
@Component({
  selector: 'app-report-line-chart',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div *ngIf="view as v" dir="ltr">
      <svg [attr.viewBox]="'0 0 ' + W + ' ' + v.vbH" class="w-full" role="img" [attr.aria-label]="ariaLabel">
        <g *ngFor="let t of v.ticks">
          <line [attr.x1]="v.plotLeft" [attr.x2]="v.plotRight" [attr.y1]="t.y" [attr.y2]="t.y" stroke="#e5e7eb" stroke-width="1"/>
          <text [attr.x]="v.plotLeft - 4" [attr.y]="t.y + 3" text-anchor="end" font-size="9" fill="#9ca3af">{{ t.label }}</text>
        </g>
        <rect *ngFor="let b of v.bars" [attr.x]="b.x" [attr.y]="b.y" [attr.width]="b.w" [attr.height]="b.h" [attr.fill]="b.color" rx="1.5"/>
        <path *ngFor="let p of v.paths" [attr.d]="p.d" fill="none" [attr.stroke]="p.color" stroke-width="2"
              stroke-linejoin="round" stroke-linecap="round" [attr.stroke-dasharray]="p.dashed ? '4 3' : null"/>
        <circle *ngFor="let d of v.dots" [attr.cx]="d.x" [attr.cy]="d.y" r="2.6" [attr.fill]="d.color"/>
        <text *ngFor="let l of v.xLabels" [attr.x]="l.x" [attr.y]="v.vbH - 6" text-anchor="middle" font-size="9" fill="#9ca3af">{{ l.text }}</text>
      </svg>
      <div class="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-500 mt-1" dir="rtl">
        <span *ngFor="let g of v.legend" class="flex items-center gap-1">
          <span class="inline-block w-3 h-0 border-t-2" [style.border-color]="g.color" [style.border-top-style]="g.dashed ? 'dashed' : 'solid'"></span>
          {{ g.name }}<b *ngIf="g.last !== null" class="text-gray-700"> {{ g.last }}{{ unit ? ' ' + unit : '' }}</b>
        </span>
      </div>
    </div>
    <div *ngIf="!view" class="text-center text-[11px] text-gray-300 py-3">لا توجد بيانات كافية للرسم</div>
  `,
})
export class ReportLineChartComponent implements OnChanges {
  @Input() labels: string[] = [];
  @Input() series: ChartSeries[] = [];
  @Input() mode: 'line' | 'bars' = 'line';
  /** يبدأ المحور من صفر (للنفوق والعلف). الوزن والحرارة بيتحددوا من البيانات */
  @Input() zeroBased = false;
  @Input() unit = '';
  @Input() height = 150;
  @Input() ariaLabel = 'رسم بياني';

  readonly W = 320;
  private readonly M = { left: 34, right: 8, top: 8, bottom: 22 };
  view: View | null = null;

  ngOnChanges(): void {
    this.view = this.build();
  }

  private build(): View | null {
    const n = this.labels?.length ?? 0;
    const all: number[] = [];
    for (const s of this.series ?? []) {
      for (const v of s.values ?? []) if (v !== null && v !== undefined && isFinite(v as number)) all.push(v as number);
    }
    if (n === 0 || all.length === 0) return null;

    let lo = Math.min(...all);
    let hi = Math.max(...all);
    if (this.zeroBased || this.mode === 'bars') lo = Math.min(lo, 0);
    const scale = niceScale(lo, hi);
    const { left, right, top, bottom } = this.M;
    const plotL = left, plotR = this.W - right, plotT = top, plotB = this.height - bottom;
    const y = (v: number) => plotB - ((v - scale.min) / (scale.max - scale.min)) * (plotB - plotT);
    const x = (i: number) => (n === 1 ? (plotL + plotR) / 2 : plotL + (i * (plotR - plotL)) / (n - 1));

    const ticks: Tick[] = ticksFor(scale).map(t => ({ label: formatTick(t, scale.step), y: y(t) }));
    const paths: Path[] = [];
    const dots: Dot[] = [];
    const bars: Bar[] = [];

    if (this.mode === 'bars') {
      const slot = (plotR - plotL) / n;
      const w = Math.max(2, Math.min(18, slot * 0.7));
      const base = y(Math.max(scale.min, 0));
      this.series.forEach(s => (s.values ?? []).forEach((v, i) => {
        if (v === null || v === undefined || !isFinite(v as number)) return;
        const top_ = y(v as number);
        bars.push({ x: plotL + slot * i + (slot - w) / 2, y: Math.min(top_, base), w, h: Math.max(Math.abs(base - top_), v ? 1 : 0), color: s.color });
      }));
    } else {
      this.series.forEach(s => {
        buildSegments(s.values ?? [], x, y).forEach(d => paths.push({ d, color: s.color, dashed: !!s.dashed }));
        if (!s.dashed) {
          (s.values ?? []).forEach((v, i) => {
            if (v !== null && v !== undefined && isFinite(v as number) && (n <= 14 || i === n - 1)) {
              dots.push({ x: x(i), y: y(v as number), color: s.color });
            }
          });
        }
      });
    }

    const xLabels: XLabel[] = pickLabelIndexes(n, 5).map(i => {
      const slotX = this.mode === 'bars' ? plotL + ((plotR - plotL) / n) * (i + 0.5) : x(i);
      return { x: slotX, text: shortDate(this.labels[i]) };
    });

    const legend: Legend[] = this.series.map(s => {
      const lastVal = [...(s.values ?? [])].reverse().find(v => v !== null && v !== undefined && isFinite(v as number));
      return { name: s.name, color: s.color, dashed: !!s.dashed,
               last: lastVal === undefined || lastVal === null ? null : formatTick(lastVal as number, Math.max(scale.step, 0.01) < 1 ? 0.1 : 1) };
    });

    return { vbH: this.height, ticks, paths, dots, bars, xLabels, legend, plotLeft: plotL, plotRight: plotR };
  }
}
