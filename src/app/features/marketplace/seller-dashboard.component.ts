import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment'; // عدّل المسار حسب مكان الملف عندك

@Component({
  selector: 'app-seller-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <div class="page-wrapper">
    <div class="flex items-center gap-2 mb-4">
      <a routerLink="/marketplace" class="text-gray-400 text-xl">←</a>
      <h1 class="text-xl font-bold">
        {{ lang === 'ar' ? '📊 لوحة التقارير' : '📊 Reports Dashboard' }}
      </h1>
    </div>

    <!-- اختيار الفترة الزمنية -->
    <div class="flex gap-2 mb-4 bg-gray-100 rounded-2xl p-1">
      <button *ngFor="let p of periods" (click)="setPeriod(p.value)"
              class="flex-1 py-2 rounded-xl text-sm font-bold transition"
              [class.bg-white]="period() === p.value"
              [class.shadow-sm]="period() === p.value"
              [class.text-green-700]="period() === p.value"
              [class.text-gray-500]="period() !== p.value">
        {{ p.label }}
      </button>
    </div>

    <div *ngIf="loading()" class="text-center py-12 text-gray-400">
      {{ lang === 'ar' ? 'جاري تحميل التقارير...' : 'Loading reports...' }}
    </div>

    <ng-container *ngIf="!loading() && stats() as s">

      <!-- 🔢 الأرقام الإجمالية -->
      <div class="grid grid-cols-2 gap-3 mb-4">
        <div class="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p class="text-xs text-gray-400 font-semibold">
            {{ lang === 'ar' ? 'إجمالي الطلبات' : 'Total orders' }}
          </p>
          <p class="text-2xl font-black text-gray-800 mt-1">{{ s.totals.total_orders }}</p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p class="text-xs text-gray-400 font-semibold">
            {{ lang === 'ar' ? 'معدل الإتمام' : 'Completion rate' }}
          </p>
          <p class="text-2xl font-black text-green-600 mt-1">{{ s.totals.completion_rate }}%</p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p class="text-xs text-gray-400 font-semibold">
            {{ lang === 'ar' ? 'طلبات مكتملة' : 'Completed' }}
          </p>
          <p class="text-2xl font-black text-gray-800 mt-1">{{ s.totals.completed_orders }}</p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p class="text-xs text-gray-400 font-semibold">
            {{ lang === 'ar' ? 'متوسط التقييم' : 'Avg rating' }}
          </p>
          <p class="text-2xl font-black text-amber-500 mt-1">
            ⭐ {{ s.rating.average }}
            <span class="text-xs text-gray-400 font-normal">({{ s.rating.count }})</span>
          </p>
        </div>
      </div>

      <!-- توزيع الحالات (شريط بسيط) -->
      <div class="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm mb-4">
        <p class="text-sm font-bold text-gray-700 mb-3">
          {{ lang === 'ar' ? 'توزيع حالات الطلبات' : 'Order status breakdown' }}
        </p>
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500 w-20">{{ lang === 'ar' ? 'مكتمل' : 'Completed' }}</span>
            <div class="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
              <div class="bg-green-500 h-full" [style.width.%]="statusPercent(s.totals.completed_orders, s.totals.total_orders)"></div>
            </div>
            <span class="text-xs text-gray-400 w-8 text-left">{{ s.totals.completed_orders }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500 w-20">{{ lang === 'ar' ? 'قيد التنفيذ' : 'Pending' }}</span>
            <div class="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
              <div class="bg-amber-400 h-full" [style.width.%]="statusPercent(s.totals.pending_orders, s.totals.total_orders)"></div>
            </div>
            <span class="text-xs text-gray-400 w-8 text-left">{{ s.totals.pending_orders }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500 w-20">{{ lang === 'ar' ? 'ملغي' : 'Cancelled' }}</span>
            <div class="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
              <div class="bg-red-400 h-full" [style.width.%]="statusPercent(s.totals.cancelled_orders, s.totals.total_orders)"></div>
            </div>
            <span class="text-xs text-gray-400 w-8 text-left">{{ s.totals.cancelled_orders }}</span>
          </div>
        </div>
      </div>

      <!-- 📈 اتجاه الطلبات عبر الوقت -->
      <div class="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm mb-4">
        <p class="text-sm font-bold text-gray-700 mb-3">
          {{ lang === 'ar' ? 'اتجاه الطلبات' : 'Orders trend' }}
        </p>

        <div *ngIf="s.timeline.length === 0" class="text-center text-xs text-gray-400 py-6">
          {{ lang === 'ar' ? 'لا توجد بيانات كافية لعرض الرسم البياني' : 'Not enough data for a chart' }}
        </div>

        <!-- رسم بياني بسيط بالـ CSS (أعمدة) — بدون مكتبة خارجية -->
        <div *ngIf="s.timeline.length > 0" class="flex items-end gap-1 h-32">
          <div *ngFor="let point of s.timeline" class="flex-1 flex flex-col items-center gap-1 group relative">
            <div class="w-full bg-green-100 rounded-t-md relative flex flex-col justify-end"
                 [style.height.%]="barHeight(point.orders_count)">
              <div class="w-full bg-green-500 rounded-t-md"
                   [style.height.%]="point.orders_count > 0 ? (point.completed_count / point.orders_count) * 100 : 0">
              </div>
            </div>
            <!-- Tooltip بسيط عند التحويم -->
            <div class="absolute -top-8 hidden group-hover:block bg-gray-800 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap z-10">
              {{ point.order_date | date:'dd/MM' }}: {{ point.orders_count }}
            </div>
          </div>
        </div>
        <div class="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
          <span class="flex items-center gap-1"><span class="w-2 h-2 bg-green-500 rounded-full"></span>{{ lang === 'ar' ? 'مكتمل' : 'Completed' }}</span>
          <span class="flex items-center gap-1"><span class="w-2 h-2 bg-green-100 rounded-full border border-green-300"></span>{{ lang === 'ar' ? 'إجمالي' : 'Total' }}</span>
        </div>
      </div>

      <!-- 🏆 أكتر المنتجات مبيعًا -->
      <div class="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm mb-4">
        <p class="text-sm font-bold text-gray-700 mb-3">
          {{ lang === 'ar' ? 'أكتر المنتجات مبيعًا' : 'Top selling products' }}
        </p>

        <div *ngIf="s.top_products.length === 0" class="text-center text-xs text-gray-400 py-6">
          {{ lang === 'ar' ? 'لا توجد مبيعات مكتملة في هذه الفترة' : 'No completed sales in this period' }}
        </div>

        <div class="space-y-2">
          <div *ngFor="let p of s.top_products; let i = index" class="flex items-center gap-3">
            <span class="text-xs font-bold text-gray-400 w-5">{{ i + 1 }}</span>
            <div class="flex-1">
              <p class="text-sm font-semibold text-gray-700">{{ p.listing_title }}</p>
              <p class="text-xs text-gray-400">{{ categoryLabel(p.listing_category) }}</p>
            </div>
            <div class="text-left">
              <p class="text-sm font-bold text-green-600">{{ p.total_quantity_sold }}</p>
              <p class="text-[10px] text-gray-400">{{ p.orders_count }} {{ lang === 'ar' ? 'طلب' : 'orders' }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 📦 أكتر الفئات مبيعًا -->
      <div class="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm mb-4" *ngIf="s.top_categories.length > 0">
        <p class="text-sm font-bold text-gray-700 mb-3">
          {{ lang === 'ar' ? 'أكتر الفئات مبيعًا' : 'Top selling categories' }}
        </p>
        <div class="flex flex-wrap gap-2">
          <div *ngFor="let c of s.top_categories"
               class="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-xl text-xs font-semibold">
            {{ categoryIcon(c.category) }} {{ categoryLabel(c.category) }}
            <span class="text-green-500">({{ c.total_quantity_sold }})</span>
          </div>
        </div>
      </div>

    </ng-container>
  </div>
  `
})
export class SellerDashboardComponent implements OnInit {
  private http = inject(HttpClient);
  lang = localStorage.getItem('lang') ?? 'ar';

  loading = signal(false);
  stats = signal<any>(null);
  period = signal<'week' | 'month' | 'all'>('month');

  periods = [
    { value: 'week' as const, label: this.lang === 'ar' ? 'أسبوع' : 'Week' },
    { value: 'month' as const, label: this.lang === 'ar' ? 'شهر' : 'Month' },
    { value: 'all' as const, label: this.lang === 'ar' ? 'كل الوقت' : 'All time' },
  ];

  private headers() {
    const token = localStorage.getItem('spa_token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  ngOnInit() {
    this.loadStats();
  }

  setPeriod(p: 'week' | 'month' | 'all') {
    this.period.set(p);
    this.loadStats();
  }

  loadStats() {
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}/orders/stats/mine?period=${this.period()}`, { headers: this.headers() })
      .subscribe({
        next: res => {
          this.stats.set(res);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
  }

  statusPercent(count: number, total: number): number {
    if (!total) return 0;
    return Math.round((count / total) * 100);
  }

  barHeight(count: number): number {
    const s = this.stats();
    if (!s || !s.timeline.length) return 0;
    const max = Math.max(...s.timeline.map((t: any) => t.orders_count), 1);
    return Math.max((count / max) * 100, 4); // حد أدنى 4% عشان العمود يبان حتى لو القيمة صغيرة
  }

  categoryIcon(cat: string): string {
    const icons: any = { chickens: '🐔', eggs: '🥚', equipment: '⚙️', feed: '🌾', other: '📦' };
    return icons[cat] ?? '📦';
  }

  categoryLabel(cat: string): string {
    const labels: any = {
      chickens: this.lang === 'ar' ? 'دواجن' : 'Chickens',
      eggs: this.lang === 'ar' ? 'بيض' : 'Eggs',
      equipment: this.lang === 'ar' ? 'معدات' : 'Equipment',
      feed: this.lang === 'ar' ? 'علف' : 'Feed',
      other: this.lang === 'ar' ? 'أخرى' : 'Other',
    };
    return labels[cat] ?? cat;
  }
}