import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface ProfitData {
  supported: boolean;
  message?: string;
  flock_name?: string;
  expected_profit?: number;
  revenue?: number;
  costs?: { feed: number; chicks: number; overhead_estimated: number; total: number };
  assumptions?: { current_weight_kg: number; sell_price_per_kg: number; feed_price_per_kg: number; note: string };
  projection?: any;
}

@Component({
  selector: 'app-profit-indicator-widget',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rounded-2xl border p-4 bg-white shadow-sm" *ngIf="!loading() && !error()">

      <!-- مدعوم وفيه بيانات كافية من ملفات الـ AI و Flock -->
      <ng-container *ngIf="data() as d">
        <ng-container *ngIf="d.supported; else notSupported">
          <div class="text-xs text-gray-500 font-semibold mb-1">الربح المتوقع لو باعت دلوقتي</div>
          <div class="text-[11px] text-gray-400 mb-2">{{ d.flock_name }}</div>

          <div class="flex items-baseline gap-1 mb-3">
            <span class="text-3xl font-black"
                  [class.text-green-600]="(d.expected_profit || 0) >= 0"
                  [class.text-red-600]="(d.expected_profit || 0) < 0">
              {{ (d.expected_profit || 0) >= 0 ? '+' : '' }}{{ d.expected_profit | number:'1.0-0' }}
            </span>
            <span class="text-gray-400 text-sm">جنيه</span>
          </div>

          <div class="space-y-1 border-t pt-2 text-xs">
            <div class="flex justify-between"><span class="text-gray-500">الإيراد المتوقع</span><span class="font-bold text-gray-700">{{ d.revenue | number:'1.0-0' }} ج</span></div>
            <div class="flex justify-between"><span class="text-gray-500">تكلفة العلف</span><span class="text-red-500">-{{ d.costs?.feed | number:'1.0-0' }} ج</span></div>
            <div class="flex justify-between"><span class="text-gray-500">تكلفة الكتاكيت</span><span class="text-red-500">-{{ d.costs?.chicks | number:'1.0-0' }} ج</span></div>
            <div class="flex justify-between"><span class="text-gray-500">تكاليف تشغيل تقديرية</span><span class="text-red-500">-{{ d.costs?.overhead_estimated | number:'1.0-0' }} ج</span></div>
          </div>

          <div *ngIf="d.projection" class="border-t mt-2 pt-2 space-y-1 text-xs">
            <div class="font-bold text-gray-700">🎯 لو كملت لوزن البيع ({{ d.projection.target_weight_kg }} كجم)</div>
            <div class="flex justify-between"><span class="text-gray-500">الإيراد المتوقع</span><span class="font-bold text-gray-700">{{ d.projection.revenue | number:'1.0-0' }} ج</span></div>
            <div class="flex justify-between"><span class="text-gray-500">تكلفة العلف حتى البيع</span><span class="text-red-500">-{{ d.projection.feed_cost | number:'1.0-0' }} ج</span></div>
            <div class="flex justify-between"><span class="text-gray-500">الربح المتوقع</span>
              <span class="font-black" [class.text-green-600]="d.projection.expected_profit >= 0" [class.text-red-600]="d.projection.expected_profit < 0">{{ d.projection.expected_profit | number:'1.0-0' }} ج ({{ d.projection.profit_per_bird | number:'1.0-1' }} ج/طائر)</span></div>
            <div class="text-[10px] text-gray-400">{{ d.projection.note }}</div>
          </div>
          <div class="text-[10px] text-gray-400 border-t mt-2 pt-2">{{ d.assumptions?.note }}</div>
        </ng-container>

        <!-- في حال السيرفر رد بأن القطيع غير مدعوم أو مفيش داتا كافية -->
        <ng-template #notSupported>
          <div class="text-xs text-gray-500 text-center py-4 font-semibold">{{ d.message }}</div>
        </ng-template>
      </ng-container>
    </div>

    <!-- Loading State -->
    <div *ngIf="loading()" class="rounded-2xl border p-4 bg-white animate-pulse h-32"></div>

    <!-- Connection Error (عند عدم الاتصال بالباك إند/سيرفر AI) -->
    <div *ngIf="error()" class="rounded-2xl border border-red-100 p-4 bg-red-50 text-xs text-red-500 text-center">
      تعذر الاتصال بخدمة الذكاء الاصطناعي (تأكد من تشغيل الباك إند)
    </div>
  `
})
export class ProfitIndicatorWidgetComponent implements OnInit {
  @Input() flockId?: string;

  private http = inject(HttpClient);
  data = signal<ProfitData | null>(null);
  loading = signal(true);
  error = signal(false);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(false);

    const params = this.flockId ? `?flock_id=${this.flockId}` : '';

    this.http.get<ProfitData>(`${environment.apiUrl}/ai/profit-indicator${params}`).subscribe({
      next: (res) => {
        this.data.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error fetching profit indicator:', err);
        this.loading.set(false);
        this.error.set(true);
      }
    });
  }
}