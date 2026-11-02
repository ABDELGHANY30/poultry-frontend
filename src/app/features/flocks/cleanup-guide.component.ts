import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CLEANUP_GUIDES, GuidePhase, GuideState, GuideStep,
  addDays, loadGuideState, localDateStr, saveGuideState,
} from './cleanup-guide.data';

/**
 * ✅ قايمة تجهيز/تطهير تفاعلية: قبل استقبال القطيع أو بعد الدورة.
 * التقدم بيتخزّن على الجهاز (localStorage) باسم storageKey + المرحلة،
 * فيشتغل برضه قبل ما يكون فيه قطيع متسجل (storageKey = draft:<type>).
 */
@Component({
  selector: 'app-cleanup-guide',
  standalone: true,
  imports: [CommonModule],
  template: `
  <ng-container *ngIf="guide() as g; else noGuide">
    <!-- التقدم -->
    <div class="mb-3">
      <div class="flex items-center justify-between text-xs font-bold mb-1">
        <span>{{ g.icon }} {{ g.label }}</span>
        <span>{{ doneCount() }} / {{ steps().length }}</span>
      </div>
      <div class="h-2 rounded-full bg-gray-200 overflow-hidden">
        <div class="h-full bg-green-500 transition-all" [style.width.%]="progressPct()"></div>
      </div>
    </div>

    <!-- فترة الراحة -->
    <div *ngIf="phase === 'after' && g.rest as r" class="rounded-xl border border-amber-200 bg-amber-50 p-3 mb-3 text-xs text-amber-900">
      <p class="mb-1 font-bold">⏳ فترة الراحة الموصى بيها: {{ r.min === r.max ? r.min : (r.min + '–' + r.max) }} يوم<span *ngIf="r.note"> ({{ r.note }})</span></p>
      <ng-container *ngIf="state().restFrom as from; else noRest">
        <p class="mb-0">
          بدأت من {{ fmt(from) }} — أقرب موعد لاستقبال الدفعة الجاية:
          <b>{{ fmt(addDays(from, r.min)) }}</b>
          <span *ngIf="r.max !== r.min"> (ويفضل لحد {{ fmt(addDays(from, r.max)) }})</span>
        </p>
      </ng-container>
      <ng-template #noRest>
        <p class="mb-0">هتبدأ تتحسب أول ما تعلّم خطوة التطهير الكيميائي.</p>
      </ng-template>
    </div>

    <!-- الخطوات -->
    <div class="space-y-2">
      <div *ngFor="let s of steps(); let i = index; trackBy: trackStep"
           class="rounded-xl border p-3"
           [class.bg-green-50]="isDone(s)" [class.border-green-200]="isDone(s)"
           [class.bg-white]="!isDone(s)" [class.border-gray-200]="!isDone(s)">
        <div class="flex items-start gap-3">
          <button type="button" (click)="toggle(s)"
                  class="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 text-xs font-bold"
                  [class.bg-green-500]="isDone(s)" [class.border-green-500]="isDone(s)" [class.text-white]="isDone(s)"
                  [class.border-gray-300]="!isDone(s)"
                  [attr.aria-label]="isDone(s) ? 'إلغاء التعليم' : 'تعليم كمنتهي'">{{ isDone(s) ? '✓' : '' }}</button>
          <div class="min-w-0 flex-1">
            <button type="button" (click)="toggleOpen(s.id)" class="w-full text-right">
              <p class="mb-0 text-sm font-bold" [class.text-gray-400]="isDone(s)" [class.line-through]="isDone(s)">
                {{ i + 1 }}) {{ s.title }}
                <span *ngIf="s.optional" class="text-[10px] font-bold text-gray-500 mr-1">(اختياري)</span>
              </p>
              <p *ngIf="s.when" class="mb-0 text-[11px] text-amber-700 font-bold">⏰ {{ s.when }}</p>
              <p class="mb-0 text-[11px] text-green-700 font-bold">{{ isOpen(s.id) ? 'إخفاء التفاصيل ▲' : 'عرض التفاصيل ▼' }}</p>
            </button>
            <div *ngIf="isOpen(s.id)" class="mt-2 text-xs text-gray-700">
              <ul class="list-disc pr-4 space-y-1 mb-2">
                <li *ngFor="let d of s.details">{{ d }}</li>
              </ul>
              <p *ngIf="s.warn" class="mb-1 rounded-lg bg-red-50 text-red-700 p-2 font-semibold">⚠️ {{ s.warn }}</p>
              <p *ngIf="s.tip" class="mb-0 rounded-lg bg-blue-50 text-blue-700 p-2 font-semibold">💡 {{ s.tip }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <p *ngIf="allDone()" class="mt-3 mb-0 text-center text-sm font-bold text-green-700">
      {{ phase === 'before' ? '🎉 العنبر جاهز لاستقبال القطيع' : '🎉 التطهير خلص' }}
    </p>
    <button *ngIf="doneCount() > 0" type="button" (click)="reset()" class="mt-3 text-[11px] text-gray-400 underline">
      إعادة ضبط القايمة
    </button>
  </ng-container>
  <ng-template #noGuide>
    <p class="text-sm text-[var(--c-muted)]">مفيش دليل متاح لنوع القطيع ده.</p>
  </ng-template>
  `,
})
export class CleanupGuideComponent implements OnChanges {
  @Input() type = '';
  @Input() phase: GuidePhase = 'after';
  @Input() storageKey = 'default';
  @Output() restStarted = new EventEmitter<string>();

  state = signal<GuideState>({ done: {} });
  private opened = signal<Record<string, boolean>>({});

  addDays = addDays;

  guide = () => CLEANUP_GUIDES[this.type] ?? null;
  steps = (): GuideStep[] => this.guide()?.[this.phase] ?? [];
  trackStep = (_: number, s: GuideStep) => s.id;

  ngOnChanges(_: SimpleChanges) {
    this.state.set(loadGuideState(this.storageKey, this.phase));
    this.opened.set({});
  }

  isDone = (s: GuideStep) => !!this.state().done[s.id];
  doneCount = () => this.steps().filter(s => this.isDone(s)).length;
  progressPct = () => this.steps().length ? Math.round(this.doneCount() / this.steps().length * 100) : 0;
  // الخطوات الاختيارية مش شرط عشان نقول "خلص"
  allDone = () => this.steps().length > 0 && this.steps().filter(s => !s.optional).every(s => this.isDone(s));

  isOpen = (id: string) => !!this.opened()[id];
  toggleOpen(id: string) { this.opened.update(o => ({ ...o, [id]: !o[id] })); }

  toggle(s: GuideStep) {
    const cur = this.state();
    const nowDone = !cur.done[s.id];
    const next: GuideState = { ...cur, done: { ...cur.done, [s.id]: nowDone } };
    if (s.marksRestStart) {
      if (nowDone) { next.restFrom = localDateStr(); this.restStarted.emit(next.restFrom); }
      else { delete next.restFrom; }
    }
    this.state.set(next);
    saveGuideState(this.storageKey, this.phase, next);
  }

  reset() {
    if (!confirm('تمسح التعليمات اللي عملتها في القايمة دي؟')) return;
    const empty: GuideState = { done: {} };
    this.state.set(empty);
    saveGuideState(this.storageKey, this.phase, empty);
  }

  fmt(d: string) { return new Date(d + 'T00:00:00').toLocaleDateString('en-GB'); }
}
