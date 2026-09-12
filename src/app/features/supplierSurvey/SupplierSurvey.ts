import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment'; // ⚠️ عدّل المسار حسب مكان الملف عندك

@Component({
  selector: 'app-supplier-survey',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm" *ngIf="!submitted()">
      <div class="mb-3">
        <div class="font-black text-sm">📋 استبيان نهاية الدورة</div>
        <div class="text-[11px] text-gray-400">تقييمك بيساعد مربيين تانيين ياخدوا قرار أفضل</div>
      </div>

      <!-- اختيار النوع -->
      <div class="flex gap-2 mb-3">
        <button (click)="supplierType = 'feed'"
                class="flex-1 py-2 rounded-xl text-sm font-bold border transition"
                [class.bg-green-600]="supplierType === 'feed'"
                [class.text-white]="supplierType === 'feed'"
                [class.border-green-600]="supplierType === 'feed'"
                [class.border-gray-200]="supplierType !== 'feed'"
                [class.text-gray-500]="supplierType !== 'feed'">
          🌾 شركة العلف
        </button>
        <button (click)="supplierType = 'chicks'"
                class="flex-1 py-2 rounded-xl text-sm font-bold border transition"
                [class.bg-green-600]="supplierType === 'chicks'"
                [class.text-white]="supplierType === 'chicks'"
                [class.border-green-600]="supplierType === 'chicks'"
                [class.border-gray-200]="supplierType !== 'chicks'"
                [class.text-gray-500]="supplierType !== 'chicks'">
          🐣 مورد الكتاكيت
        </button>
      </div>

      <input [(ngModel)]="supplierName"
             [placeholder]="supplierType === 'feed' ? 'اسم شركة العلف' : 'اسم مورد الكتاكيت'"
             dir="rtl"
             class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:border-green-300"/>

      <!-- تقييم بالنجوم -->
      <div class="mb-3">
        <div class="text-xs text-gray-500 mb-1">تقييمك</div>
        <div class="flex gap-1 text-2xl">
          <button *ngFor="let s of [1,2,3,4,5]" (click)="rating = s" type="button">
            {{ s <= rating ? '⭐' : '☆' }}
          </button>
        </div>
      </div>

      <!-- كفاءة التحويل الفعلية (اختياري) -->
      <input [(ngModel)]="fcrActual"
             type="number" step="0.01"
             placeholder="كفاءة التحويل الفعلية (اختياري)"
             dir="rtl"
             class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:border-green-300"/>

      <!-- ملاحظات -->
      <textarea [(ngModel)]="notes"
                rows="3"
                placeholder="أي ملاحظات؟ (مثلاً: مش نفس التحويل المتوقع، تأخير في التوريد، جودة ممتازة...)"
                dir="rtl"
                class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3 resize-none focus:outline-none focus:border-green-300">
      </textarea>

      <button (click)="submit()"
              [disabled]="loading() || !supplierName.trim() || rating === 0"
              class="w-full py-2.5 rounded-xl bg-green-600 text-white text-sm font-bold disabled:opacity-40">
        {{ loading() ? 'جاري الإرسال...' : 'إرسال التقييم' }}
      </button>

      <div *ngIf="error()" class="text-xs text-red-500 mt-2">{{ error() }}</div>
    </div>

    <div *ngIf="submitted()" class="rounded-2xl border border-green-200 bg-green-50 p-4 text-center">
      <div class="text-2xl mb-1">✅</div>
      <div class="text-sm font-bold text-green-700">شكراً لتقييمك!</div>
      <div class="text-xs text-green-600 mt-1">ده هيساعد مربيين تانيين ياخدوا قرار أفضل</div>
    </div>
  `
})
export class SupplierSurveyComponent {
  @Input() flockId?: string;
  @Output() done = new EventEmitter<void>();

  private http = inject(HttpClient);

  supplierType: 'feed' | 'chicks' = 'feed';
  supplierName = '';
  rating = 0;
  fcrActual: number | null = null;
  notes = '';

  loading = signal(false);
  error = signal<string | null>(null);
  submitted = signal(false);

  submit() {
    if (!this.supplierName.trim() || this.rating === 0) return;

    this.loading.set(true);
    this.error.set(null);

    const token = localStorage.getItem('spa_token'); // ⚠️ وحّد الاسم ده مع باقي الملفات
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    });

    this.http.post(`${environment.apiUrl}/ai/supplier-feedback`, {
      flock_id: this.flockId || null,
      supplier_type: this.supplierType,
      supplier_name: this.supplierName.trim(),
      rating: this.rating,
      fcr_actual: this.fcrActual,
      notes: this.notes.trim() || null,
    }, { headers }).subscribe({
      next: () => {
        this.loading.set(false);
        this.submitted.set(true);
        this.done.emit();
      },
      error: () => {
        this.loading.set(false);
        this.error.set('حصل خطأ أثناء إرسال التقييم، جرب تاني.');
      }
    });
  }
}