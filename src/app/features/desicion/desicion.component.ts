import { Component, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { environment } from '../../../environments/environment'; // ⚠️ عدّل المسار حسب مكان الملف عندك

interface ComputedImpact {
  delay_days: number;
  extra_weight_per_bird_g: number;
  extra_feed_cost: number;
  extra_revenue: number;
  net_impact: number;
  based_on: string;
}

interface DecisionResult {
  flock_id: string;
  flock_name: string;
  decision: string;
  computed: ComputedImpact | null;
  analysis: string;
}

@Component({
  selector: 'app-decision-simulator',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div class="flex items-center gap-2 mb-3">
        <span class="text-xl">🎯</span>
        <div class="flex-1">
          <div class="font-black text-sm flex items-center gap-1.5">
            محاكاة القرار
            <span class="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">PRO</span>
          </div>
          <div class="text-[11px] text-gray-400">اكتب قرار بتفكر فيه، وشوف الإيجابيات والسلبيات قبل ما تاخده</div>
        </div>
      </div>

      <!-- مقفول لغير المشتركين -->
      <div *ngIf="proLocked()" class="text-center py-6">
        <div class="text-4xl mb-2">🔒</div>
        <p class="text-sm text-gray-500 mb-3">محاكاة القرار متاحة لمشتركي Pro فقط</p>
        <a routerLink="/subscription" class="btn-primary btn btn-sm inline-flex">⭐ ترقية لـ Pro</a>
      </div>

      <ng-container *ngIf="!proLocked()">
        <div class="flex gap-2 mb-3">
          <input [(ngModel)]="decisionText"
                 (keydown.enter)="analyze()"
                 [disabled]="loading()"
                 placeholder="مثلاً: عايز أأجل البيع أسبوع"
                 dir="rtl"
                 class="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-300"/>
          <button (click)="analyze()"
                  [disabled]="loading() || !decisionText.trim()"
                  class="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-bold disabled:opacity-40 flex-shrink-0">
            {{ loading() ? '...' : 'حلل' }}
          </button>
        </div>

        <!-- اقتراحات سريعة -->
        <div class="flex flex-wrap gap-1.5 mb-3" *ngIf="!result()">
          <button *ngFor="let s of quickSuggestions"
                  (click)="decisionText = s; analyze()"
                  class="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-600 hover:bg-green-50 hover:border-green-200 hover:text-green-700 transition">
            {{ s }}
          </button>
        </div>

        <div *ngIf="loading()" class="text-center py-6 text-sm text-gray-400">جاري تحليل القرار...</div>

        <div *ngIf="error()" class="text-xs text-red-500 bg-red-50 rounded-xl p-3">{{ error() }}</div>

        <div *ngIf="result() as r" class="space-y-3">
          <!-- أرقام محسوبة (لو القرار قابل للحساب) -->
          <div *ngIf="r.computed as c" class="grid grid-cols-3 gap-2">
            <div class="bg-gray-50 rounded-xl p-2 text-center">
              <div class="text-[10px] text-gray-400 mb-0.5">الوزن</div>
              <div class="font-black text-sm text-gray-700">+{{ c.extra_weight_per_bird_g }} جم</div>
            </div>
            <div class="bg-gray-50 rounded-xl p-2 text-center">
              <div class="text-[10px] text-gray-400 mb-0.5">العلف</div>
              <div class="font-black text-sm text-red-600">+{{ c.extra_feed_cost | number:'1.0-0' }} ج</div>
            </div>
            <div class="rounded-xl p-2 text-center"
                 [class.bg-green-50]="c.net_impact >= 0"
                 [class.bg-red-50]="c.net_impact < 0">
              <div class="text-[10px] text-gray-400 mb-0.5">الربح</div>
              <div class="font-black text-sm"
                   [class.text-green-600]="c.net_impact >= 0"
                   [class.text-red-600]="c.net_impact < 0">
                {{ c.net_impact >= 0 ? '+' : '' }}{{ c.net_impact | number:'1.0-0' }} ج
              </div>
            </div>
          </div>
          <div *ngIf="result()?.computed as c" class="text-[10px] text-gray-400 text-center -mt-1">{{ c.based_on }}</div>

          <!-- التحليل النوعي -->
          <div class="prose-sm text-sm leading-relaxed" [innerHTML]="renderedAnalysis()"></div>
        </div>
      </ng-container>
    </div>
  `
})
export class DecisionSimulatorComponent {
  @Input() flockId?: string;

  private http = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);

  decisionText = '';
  loading = signal(false);
  error = signal<string | null>(null);
  result = signal<DecisionResult | null>(null);
  proLocked = signal(false);

  quickSuggestions = [
    'عايز أأجل البيع أسبوع',
    'عايز أأجل البيع 3 أيام',
    'عايز أغير نوع العلف',
  ];

  analyze() {
    if (!this.decisionText.trim() || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);
    this.result.set(null);

    const token = localStorage.getItem('spa_token'); // ⚠️ وحّد الاسم ده مع باقي الملفات
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    });

    this.http.post<DecisionResult>(`${environment.apiUrl}/ai/decision-simulator`, {
      decision: this.decisionText.trim(),
      flock_id: this.flockId || null,
      language: 'ar',
    }, { headers }).subscribe({
      next: (res) => {
        this.result.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 403 && err.error?.detail?.upgrade_required) {
          this.proLocked.set(true);
        } else {
          this.error.set('حصل خطأ أثناء تحليل القرار، جرب تاني.');
        }
      }
    });
  }

  renderedAnalysis(): SafeHtml {
    const text = this.result()?.analysis || '';
    const html = text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^\d\.\s*\*\*(.+?)\*\*/gm, '<p class="font-bold text-green-700 mt-2 mb-1">$1</p>')
      .replace(/^- (.+)$/gm, '<div class="flex gap-1.5"><span class="text-green-500">•</span><span>$1</span></div>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}