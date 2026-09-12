import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LibraryService, ARTICLES } from '../../core/services/library.service';
import { Article } from '../../core/models';

const CATS = [
  { key: 'all',     icon: '📋', labelKey: 'LIB.ALL' },
  { key: 'broiler', icon: '🐔', labelKey: 'LIB.BROILER' },
  { key: 'disease', icon: '🔬', labelKey: 'LIB.DISEASE' },
  { key: 'vaccine', icon: '💉', labelKey: 'LIB.VACCINE' },
  { key: 'feeding', icon: '🌾', labelKey: 'LIB.FEEDING' },
  { key: 'hygiene', icon: '🧹', labelKey: 'LIB.HYGIENE' },
];

@Component({
  selector: 'app-library-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule],
  template: `
  <div class="page-wrapper">

    <!-- Hero search -->
    <div class="rounded-3xl text-white px-6 py-6"
         style="background:linear-gradient(135deg,#0f2d1a 0%,#1e7d48 70%)">
      <h1 class="text-xl font-black mb-1">📚 {{ 'LIB.TITLE' | translate }}</h1>
      <p class="text-white/70 text-sm mb-4">{{ 'LIB.SUBTITLE' | translate }}</p>
      <div class="relative">
        <span class="absolute start-3 top-1/2 -translate-y-1/2 text-white/50 text-lg">🔍</span>
        <input class="w-full bg-white/15 border border-white/20 rounded-xl px-4 py-2.5 ps-10
                      text-white text-sm placeholder:text-white/50 outline-none
                      focus:bg-white/25 focus:border-white/50 transition-all"
               [(ngModel)]="q"
               [placeholder]="'LIB.SEARCH_PH' | translate"
               [dir]="lang === 'ar' ? 'rtl' : 'ltr'"
               style="font-family:inherit"/>
        <button *ngIf="q" class="absolute end-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-sm"
                (click)="q = ''">✕</button>
      </div>
    </div>

    <!-- Category chips -->
    <div class="flex gap-2 flex-wrap">
      <button *ngFor="let c of CATS" class="btn btn-sm transition-all"
              [class.btn-primary]="cat() === c.key"
              [class.btn-ghost]="cat() !== c.key"
              (click)="cat.set(c.key)">
        {{ c.icon }} {{ c.labelKey | translate }}
      </button>
    </div>

    <p class="text-xs text-[var(--c-muted)]">{{ filtered().length }} {{ 'LIB.RESULTS' | translate }}</p>

    <!-- Articles grid -->
    <div class="grid sm:grid-cols-2 xl:grid-cols-3 gap-4" *ngIf="filtered().length > 0">
      <a *ngFor="let a of filtered()" [routerLink]="['/library', a.id]"
         class="bg-white rounded-3xl border border-[var(--c-border)] overflow-hidden flex flex-col
                no-underline hover:-translate-y-1 hover:shadow-card-lg transition-all duration-200 animate-in">
        <!-- Icon banner -->
        <div class="h-20 flex items-center justify-center text-5xl bg-primary-50">{{ a.icon }}</div>
        <!-- Body -->
        <div class="p-4 flex-1 flex flex-col">
          <span class="text-[10px] font-black uppercase tracking-wider text-primary-600 mb-1.5">
            {{ a.category }}
          </span>
          <h3 class="font-black text-sm text-[var(--c-text)] leading-snug mb-2">
            {{ lang === 'ar' ? a.titleAr : a.titleEn }}
          </h3>
          <p class="text-xs text-[var(--c-muted)] leading-relaxed flex-1">
            {{ lang === 'ar' ? a.summaryAr : a.summaryEn }}
          </p>
        </div>
        <!-- Footer -->
        <div class="px-4 pb-4 flex items-center justify-between">
          <div class="flex gap-1 flex-wrap">
            <span *ngFor="let t of a.tags.slice(0,2)"
                  class="text-[9px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {{ t }}
            </span>
          </div>
          <span class="text-[10px] text-[var(--c-faint)]">⏱ {{ a.readTimeMinutes }} min</span>
        </div>
      </a>
    </div>

    <!-- No results -->
    <div *ngIf="filtered().length === 0" class="text-center py-12">
      <p class="text-4xl mb-3">🔍</p>
      <p class="text-[var(--c-muted)] font-medium mb-3">{{ 'LIB.NO_RESULTS' | translate }}</p>
      <button class="btn-outline btn btn-sm" (click)="q=''; cat.set('all')">
        {{ 'LIB.CLEAR' | translate }}
      </button>
    </div>

  </div>
  `,
})
export class LibraryListComponent implements OnInit {
  private svc = inject(LibraryService);
  articles = signal<Article[]>([]);
  cat = signal('all');
  q = '';
  lang = localStorage.getItem('lang') ?? 'ar';
  CATS = CATS;

  filtered = computed(() => {
    let list = this.articles();
    if (this.cat() !== 'all') list = list.filter(a => a.category === this.cat());
    if (this.q.trim()) {
      const s = this.q.toLowerCase();
      list = list.filter(a =>
        a.titleEn.toLowerCase().includes(s) || a.titleAr.includes(this.q) ||
        a.tags.some(t => t.toLowerCase().includes(s))
      );
    }
    return list;
  });

  ngOnInit() { this.svc.getArticles().subscribe(a => this.articles.set(a)); }
}
