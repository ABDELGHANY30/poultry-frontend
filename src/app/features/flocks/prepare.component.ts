import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CleanupGuideComponent } from './cleanup-guide.component';
import { CLEANUP_GUIDES, GUIDE_TYPES, GuidePhase } from './cleanup-guide.data';

/**
 * 🧹 صفحة "جهّز العنبر": لمين لسه هينضف أو مجهّز لدفعة جديدة وماسجلش قطيع لسه.
 * بيبدأ من هنا، وبعدين يسجّل القطيع لما الكتاكيت توصل.
 */
@Component({
  selector: 'app-prepare',
  standalone: true,
  imports: [CommonModule, RouterLink, CleanupGuideComponent],
  template: `
  <div class="page-wrapper">
    <a routerLink="/flocks" class="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 no-underline">← القطعان</a>

    <h1 class="text-2xl font-black text-primary-900 mt-2">🧹 جهّز العنبر</h1>
    <p class="text-sm text-[var(--c-muted)] mt-0.5">
      لو لسه هتنضف وتجهّز قبل ما القطيع يوصل، ابدأ من هنا خطوة بخطوة. وبعد ما الكتاكيت توصل سجّل القطيع.
    </p>

    <div class="card mt-3">
      <p class="text-xs font-bold mb-2">هتربّي إيه؟</p>
      <div class="flex flex-wrap gap-2">
        <button *ngFor="let t of types" type="button" (click)="selectType(t)"
                class="px-3 py-2 rounded-xl text-xs font-bold border transition"
                [class.bg-green-600]="type() === t" [class.text-white]="type() === t" [class.border-green-600]="type() === t"
                [class.text-gray-600]="type() !== t" [class.border-gray-200]="type() !== t">
          {{ guides[t].icon }} {{ guides[t].label }}
        </button>
      </div>
    </div>

    <div *ngIf="type()" class="card mt-3">
      <div class="flex gap-2 mb-3">
        <button type="button" (click)="phase.set('after')"
                class="flex-1 py-2 rounded-xl text-xs font-bold border"
                [class.bg-green-600]="phase() === 'after'" [class.text-white]="phase() === 'after'"
                [class.text-gray-600]="phase() !== 'after'" [class.border-gray-200]="phase() !== 'after'">
          🧼 تطهير (دورة سابقة)
        </button>
        <button type="button" (click)="phase.set('before')"
                class="flex-1 py-2 rounded-xl text-xs font-bold border"
                [class.bg-green-600]="phase() === 'before'" [class.text-white]="phase() === 'before'"
                [class.text-gray-600]="phase() !== 'before'" [class.border-gray-200]="phase() !== 'before'">
          🐣 قبل الاستقبال
        </button>
      </div>

      <app-cleanup-guide [type]="type()" [phase]="phase()" [storageKey]="'draft:' + type()"></app-cleanup-guide>

      <a [routerLink]="['/flocks']" [queryParams]="{ add: 1, type: type() }"
         class="mt-4 block w-full py-3 rounded-xl bg-green-600 text-white font-bold text-center no-underline">
        🐣 وصلت الكتاكيت؟ سجّل القطيع
      </a>
    </div>
  </div>
  `,
})
export class PrepareComponent {
  types = GUIDE_TYPES as unknown as string[];
  guides = CLEANUP_GUIDES;
  type = signal<string>(this.initialType());
  phase = signal<GuidePhase>('after');

  private initialType(): string {
    try { const t = localStorage.getItem('cleanup:v1:lastType'); if (t && CLEANUP_GUIDES[t]) return t; } catch { /* تجاهل */ }
    return '';
  }

  selectType(t: string) {
    this.type.set(t);
    try { localStorage.setItem('cleanup:v1:lastType', t); } catch { /* تجاهل */ }
  }
}
