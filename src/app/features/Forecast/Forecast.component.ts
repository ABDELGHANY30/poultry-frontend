import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment'; // ⚠️ عدّل المسار حسب مكان الملف عندك

interface SaleOption {
  in_days: number;
  age_days: number;
  weight_kg: number;
  net_profit_estimate: number;
}

interface ForecastData {
  supported: boolean;
  message?: string;
  flock_id?: string;
  flock_name?: string;
  current_age_days?: number;
  target_age_days?: number;
  weight_kg?: number;
  mortality_rate_pct?: number;
  expected_count?: number;
  feed_needed_kg?: number;
  confidence?: 'low' | 'medium' | 'high';
  data_points_used?: number;
  method_note?: string;
  profit_forecast?: { revenue: number; feed_cost: number; net_profit_estimate: number; note: string };
  sale_timing?: { options: SaleOption[]; recommended_in_days: number; reason: string };
}

@Component({
  selector: 'app-forecast-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div class="flex items-center justify-between mb-3">
        <div>
          <div class="font-black text-sm flex items-center gap-1.5">
            📈 التوقع المستقبلي (Forecasting)
            <span class="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">PRO</span>
          </div>
          <div class="text-[11px] text-gray-400">توقع مبني على معدل نمو القطيع الفعلي، مش تخمين</div>
        </div>
      </div>

      <!-- مقفول لغير المشتركين -->
      <div *ngIf="proLocked()" class="text-center py-6">
        <div class="text-4xl mb-2">🔒</div>
        <p class="text-sm text-gray-500 mb-3">Forecasting متاح لمشتركي Pro فقط</p>
        <a routerLink="/subscription" class="btn-primary btn btn-sm inline-flex">⭐ ترقية لـ Pro</a>
      </div>

      <ng-container *ngIf="!proLocked()">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-xs text-gray-500 flex-shrink-0">توقع عند عمر</span>
          <input type="number" [(ngModel)]="targetAgeDays" (ngModelChange)="load()"
                 class="w-20 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center"/>
          <span class="text-xs text-gray-500">يوم</span>
        </div>

        <div *ngIf="loading()" class="text-center py-6 text-sm text-gray-400">جاري الحساب...</div>

        <div *ngIf="!loading() && data() as d">
          <div *ngIf="!d.supported" class="text-center py-4 text-gray-400 text-sm">{{ d.message }}</div>

          <div *ngIf="d.supported" class="space-y-3">
            <!-- شارة الثقة -->
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    [class.bg-green-100]="d.confidence === 'high'" [class.text-green-700]="d.confidence === 'high'"
                    [class.bg-amber-100]="d.confidence === 'medium'" [class.text-amber-700]="d.confidence === 'medium'"
                    [class.bg-red-100]="d.confidence === 'low'" [class.text-red-700]="d.confidence === 'low'">
                ثقة {{ d.confidence === 'high' ? 'عالية' : d.confidence === 'medium' ? 'متوسطة' : 'منخفضة' }}
              </span>
              <span class="text-[10px] text-gray-400">({{ d.data_points_used }} نقطة بيانات)</span>
            </div>

            <!-- الأرقام الأساسية -->
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div class="bg-gray-50 rounded-xl p-2.5">
                <div class="text-[11px] text-gray-400">الوزن المتوقع</div>
                <div class="font-black">{{ d.weight_kg ?? '—' }} كجم</div>
              </div>
              <div class="bg-gray-50 rounded-xl p-2.5">
                <div class="text-[11px] text-gray-400">نسبة النفوق المتوقعة</div>
                <div class="font-black text-red-600">{{ d.mortality_rate_pct ?? '—' }}%</div>
              </div>
              <div class="bg-gray-50 rounded-xl p-2.5">
                <div class="text-[11px] text-gray-400">العلف المطلوب</div>
                <div class="font-black">{{ d.feed_needed_kg ?? '—' }} كجم</div>
              </div>
              <div class="bg-gray-50 rounded-xl p-2.5">
                <div class="text-[11px] text-gray-400">العدد المتوقع</div>
                <div class="font-black">{{ d.expected_count ?? '—' }}</div>
              </div>
            </div>

            <!-- الربح المتوقع -->
            <div *ngIf="d.profit_forecast as p" class="border-t pt-3">
              <div class="text-xs font-bold text-gray-500 mb-1">الربح المتوقع عند اليوم ده</div>
              <div class="text-2xl font-black" [class.text-green-600]="p.net_profit_estimate >= 0" [class.text-red-600]="p.net_profit_estimate < 0">
                {{ p.net_profit_estimate >= 0 ? '+' : '' }}{{ p.net_profit_estimate | number:'1.0-0' }} ج
              </div>
            </div>

            <!-- أفضل توقيت بيع -->
            <div *ngIf="d.sale_timing as st" class="border-t pt-3">
              <div class="text-xs font-bold text-gray-500 mb-2">📅 أفضل توقيت للبيع</div>
              <div class="space-y-1">
                <div *ngFor="let o of st.options" class="flex items-center justify-between text-xs p-2 rounded-lg"
                     [class.bg-green-50]="o.in_days === st.recommended_in_days">
                  <span [class.font-bold]="o.in_days === st.recommended_in_days">
                    {{ o.in_days === 0 ? 'دلوقتي' : 'بعد ' + o.in_days + ' يوم' }}
                    <span *ngIf="o.in_days === st.recommended_in_days">⭐</span>
                  </span>
                  <span class="font-bold" [class.text-green-700]="o.in_days === st.recommended_in_days">
                    {{ o.net_profit_estimate | number:'1.0-0' }} ج
                  </span>
                </div>
              </div>
              <div class="text-[10px] text-gray-400 mt-2">{{ st.reason }}</div>
            </div>

            <div class="text-[10px] text-gray-400 border-t pt-2">{{ d.method_note }}</div>
          </div>
        </div>
      </ng-container>
    </div>
  `
})
export class ForecastWidgetComponent implements OnInit {
  @Input() flockId?: string;

  private http = inject(HttpClient);
  data = signal<ForecastData | null>(null);
  loading = signal(true);
  proLocked = signal(false);
  targetAgeDays: number | null = null;

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    const token = localStorage.getItem('spa_token'); // ⚠️ وحّد الاسم ده مع باقي الملفات
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    let url = `${environment.apiUrl}/forecast/predict?`;
    if (this.flockId) url += `flock_id=${this.flockId}&`;
    if (this.targetAgeDays) url += `target_age_days=${this.targetAgeDays}`;

    this.http.get<ForecastData>(url, { headers }).subscribe({
      next: (res) => {
        this.data.set(res);
        this.loading.set(false);
        if (!this.targetAgeDays && res.target_age_days) {
          this.targetAgeDays = res.target_age_days;
        }
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 403 && err.error?.detail?.upgrade_required) {
          this.proLocked.set(true);
        } else {
          this.data.set({ supported: false, message: 'حصل خطأ أثناء حساب التوقع' });
        }
      }
    });
  }
}