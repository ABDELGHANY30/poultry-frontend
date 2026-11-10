import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
// ⚠️ عدّل المسار ده حسب مكان الملف عندك
import { FlockService } from '../../core/services/flock.service';
import { AuthService } from '../../core/services/auth.service';
import { UserOfflineCacheService } from '../../core/services/user-offline-cache.service';
import { PendingRecordsService } from '../../core/services/pending-records.service';
import * as Offline from './offline-report-engine'; // ⚠️ حطه جنب الملف ده (أو عدّل المسار)
import { ReportLineChartComponent } from './report-line-chart.component'; // ⚠️ حطه جنب الملف ده (أو عدّل المسار)
import { ChartSeries } from './chart-utils';

/** key: مفتاح كاش آخر نسخة — local: بناء التقرير على الجهاز لو مفيش نت */
interface LoadOpts { key?: string; local?: () => Promise<any | null>; }

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, NgTemplateOutlet, ReportLineChartComponent],
  template: `
  <div class="page-wrapper">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-bold text-gray-800">
        {{ lang === 'ar' ? '📊 التقارير المتقدمة' : '📊 Advanced Reports' }}
      </h1>
    </div>

    <!-- Reports content -->
    <div class="space-y-5">

      <ng-container>
      <!-- FCR Comparison -->
      <div class="card">
        <h2 class="section-title">⚖️ {{ lang === 'ar' ? 'مقارنة معدل التحويل الغذائي (FCR)' : 'FCR Comparison' }}</h2>
        <div class="space-y-2 mt-3">
          <div *ngFor="let f of fcrData()" class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <span class="text-sm font-semibold text-gray-700">{{ f.flock_name }}
              <span class="text-[10px] font-normal text-gray-400">{{ typeLabel(f.flock_type) }}</span>
            </span>
            <span class="text-sm font-black" [ngClass]="fcrClass(f)">{{ f.fcr ?? '—' }}</span>
          </div>
          <div *ngIf="fcrData().length === 0" class="text-center py-4 text-gray-400 text-sm">
            {{ lang === 'ar' ? 'لا توجد بيانات كافية بعد' : 'Not enough data yet' }}
          </div>
        </div>
      </div>

      <!-- Mortality Trend -->
      <div class="card">
        <h2 class="section-title">📉 {{ lang === 'ar' ? 'اتجاه النفوق اليومي' : 'Daily Mortality Trend' }}
          <span *ngIf="selectedFlockName()" class="text-xs font-normal text-gray-400">— {{ selectedFlockName() }}</span>
        </h2>
        <div class="mt-3">
          <app-report-line-chart [labels]="mortalityLabels()" [series]="mortalitySeries()" mode="bars" [zeroBased]="true"
                                 [height]="140" ariaLabel="اتجاه النفوق اليومي"></app-report-line-chart>
        </div>
      </div>

      </ng-container>

      <!-- 📅 تقارير اليوم / الشهر / نهاية الدورة -->
      <div class="card">
        <div class="flex items-center gap-2 mb-3">
          <select [(ngModel)]="selectedFlockId" (ngModelChange)="onFlockSelected()"
                  class="form-input flex-1 text-sm">
            <option value="" disabled>اختر قطيع</option>
            <option *ngFor="let f of flocks()" [value]="f.id">{{ f.name }}</option>
          </select>
        </div>

        <!-- 📋 قالب مشترك لعرض قائمة الأحداث والأسباب — يُستخدم في كل التابات (يوم/أسبوع/شهر/سنة/دورة) -->
        <ng-template #eventsBlock let-events="events" let-eventsSummary="eventsSummary" let-truncated="truncated">
          <div *ngIf="events && events.length" class="border-t pt-3 mt-1">
            <div class="flex items-center justify-between mb-2">
              <div class="text-xs font-bold text-gray-500">📋 الأحداث المسجلة وأسبابها</div>
              <div class="flex gap-1 text-[10px]" *ngIf="eventsSummary">
                <span *ngIf="eventsSummary.critical" class="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">{{ eventsSummary.critical }} حرج</span>
                <span *ngIf="eventsSummary.warning" class="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">{{ eventsSummary.warning }} تنبيه</span>
                <span *ngIf="eventsSummary.info" class="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold">{{ eventsSummary.info }} معلومة</span>
              </div>
            </div>
            <div class="space-y-2">
              <div *ngFor="let e of events" class="rounded-xl p-2.5 text-xs border"
                   [class.bg-red-50]="e.severity === 'critical'" [class.border-red-100]="e.severity === 'critical'"
                   [class.bg-amber-50]="e.severity === 'warning'" [class.border-amber-100]="e.severity === 'warning'"
                   [class.bg-gray-50]="e.severity === 'info'" [class.border-gray-100]="e.severity === 'info'">
                <div class="flex items-center justify-between mb-1">
                  <span class="font-bold text-gray-700">{{ e.title_ar }}</span>
                  <span class="text-[10px] text-gray-400">{{ e.date }}</span>
                </div>
                <div class="text-gray-500 leading-relaxed">السبب: {{ e.reason_ar }}</div>
              </div>
            </div>
            <div *ngIf="truncated" class="text-[10px] text-gray-400 text-center mt-2">تم عرض أهم الأحداث فقط (الأخطر أولاً)</div>
          </div>
          <div *ngIf="events && events.length === 0" class="border-t pt-3 mt-1 text-center text-xs text-gray-400">
            ✅ مفيش أحداث أو انحرافات تستحق الذكر في هذه الفترة
          </div>
        </ng-template>

        <!-- 📈 قالب مشترك لمقارنة الفترة الحالية بالفترة السابقة مباشرة -->
        <ng-template #comparisonBlock let-comparison="comparison">
          <div *ngIf="comparison && comparison.has_previous_period" class="border-t pt-3 mb-2">
            <div class="text-xs font-bold text-gray-500 mb-2">📈 مقارنة بالفترة السابقة مباشرة</div>
            <div class="space-y-1.5">
              <div *ngFor="let item of comparisonItems(comparison)" class="flex items-center justify-between text-xs bg-gray-50 rounded-lg p-2">
                <span class="text-gray-500">{{ item.label }}</span>
                <span class="flex items-center gap-1 font-bold"
                      [class.text-green-600]="item.trend && item.trend.endsWith('_good')"
                      [class.text-red-500]="item.trend && item.trend.endsWith('_bad')"
                      [class.text-gray-600]="!item.trend">
                  {{ item.current }}
                  <span *ngIf="item.change_pct !== null" class="text-[10px]">({{ item.change_pct > 0 ? '+' : '' }}{{ item.change_pct }}%)</span>
                  <span *ngIf="item.trend && item.trend.indexOf('up') === 0">▲</span>
                  <span *ngIf="item.trend && item.trend.indexOf('down') === 0">▼</span>
                </span>
              </div>
            </div>
          </div>
        </ng-template>

        <!-- 💰 قالب مشترك لعرض الأداء المالي (فعلي من معاملات مسجلة + تقديري من سعر السوق) -->
        <ng-template #financialBlock let-fin="fin">
          <div *ngIf="fin.has_actual_transactions" class="mb-2">
            <div class="flex justify-between"><span class="text-gray-500">دخل فعلي مسجل</span><span class="text-green-600 font-bold">+{{ fin.total_income_actual | number:'1.0-0' }} ج</span></div>
            <div class="flex justify-between"><span class="text-gray-500">مصروف فعلي مسجل</span><span class="text-red-500 font-bold">-{{ fin.total_expense_actual | number:'1.0-0' }} ج</span></div>
            <div class="flex justify-between border-t mt-1 pt-1">
              <span class="text-gray-600 font-bold">الصافي الفعلي</span>
              <span class="font-black" [class.text-green-600]="fin.net_actual >= 0" [class.text-red-500]="fin.net_actual < 0">{{ fin.net_actual | number:'1.0-0' }} ج</span>
            </div>
          </div>
          <div *ngIf="fin.feed_cost_estimated !== null || fin.egg_revenue_estimated !== null" class="text-gray-400">
            <div class="flex justify-between" *ngIf="fin.feed_cost_estimated !== null"><span>تكلفة علف تقديرية (سعر سوق)</span><span>-{{ fin.feed_cost_estimated | number:'1.0-0' }} ج</span></div>
            <div class="flex justify-between" *ngIf="fin.egg_revenue_estimated !== null"><span>إيراد بيض تقديري (سعر سوق)</span><span>+{{ fin.egg_revenue_estimated | number:'1.0-0' }} ج</span></div>
          </div>
          <div class="text-[10px] text-gray-400 mt-1">{{ fin.note }}</div>
        </ng-template>
        <!-- ⚠️ ملاحظات جودة البيانات (اكتمال التسجيل، أيام ناقصة...) -->
        <ng-template #qualityBlock let-notes="notes" let-pct="pct">
          <div *ngIf="notes && notes.length" class="bg-amber-50 border border-amber-100 rounded-xl p-2.5 text-[11px] text-amber-800 mb-3">
            <div class="font-bold mb-1">⚠️ ملاحظات على جودة البيانات<span *ngIf="pct !== null && pct !== undefined"> ({{ pct }}% اكتمال تسجيل)</span></div>
            <div *ngFor="let n of notes">• {{ n }}</div>
          </div>
        </ng-template>

        <!-- 📊 مؤشرات إضافية للفترة (تظهر بس لو متاحة) -->
        <ng-template #extraKpis let-r="r">
          <div *ngIf="r.avg_daily_gain_g != null || r.avg_hen_day_pct != null || r.broken_egg_pct != null || r.mortality_pct != null" class="grid grid-cols-2 gap-2 text-sm mb-3">
            <div *ngIf="r.mortality_pct != null" class="bg-gray-50 rounded-xl p-2.5"><div class="text-[11px] text-gray-400">النفوق من العدد الابتدائي</div><div class="font-black text-red-600">{{ r.mortality_pct }}%</div></div>
            <div *ngIf="r.avg_daily_gain_g != null" class="bg-gray-50 rounded-xl p-2.5"><div class="text-[11px] text-gray-400">متوسط الزيادة اليومية</div><div class="font-black text-green-600">{{ r.avg_daily_gain_g }} جم</div></div>
            <div *ngIf="r.avg_hen_day_pct != null" class="bg-gray-50 rounded-xl p-2.5"><div class="text-[11px] text-gray-400">نسبة الإنتاج (Hen-day)</div><div class="font-black">{{ r.avg_hen_day_pct }}%</div></div>
            <div *ngIf="r.broken_egg_pct != null" class="bg-gray-50 rounded-xl p-2.5"><div class="text-[11px] text-gray-400">نسبة كسر البيض</div><div class="font-black" [class.text-red-600]="r.broken_egg_pct > 5">{{ r.broken_egg_pct }}%</div></div>
          </div>
        </ng-template>

        <!-- 📉 رسوم الاتجاه: كل مؤشر برسمه ومحاوره (مفيش خلط وحدات) والمستهدف خط متقطع -->
        <ng-template #trendChartBlock let-charts="charts">
          <div *ngIf="charts" class="border-t pt-3 mb-2 space-y-3">
            <div>
              <div class="text-xs font-bold text-gray-500 mb-1">☠️ النفوق اليومي</div>
              <app-report-line-chart [labels]="charts.labels" [series]="charts.mortality" mode="bars" [zeroBased]="true" [height]="130" ariaLabel="النفوق اليومي"></app-report-line-chart>
            </div>
            <div *ngIf="charts.hasFeed">
              <div class="text-xs font-bold text-gray-500 mb-1">🌾 العلف اليومي (كجم)</div>
              <app-report-line-chart [labels]="charts.labels" [series]="charts.feed" [zeroBased]="true" unit="كجم" [height]="130" ariaLabel="العلف اليومي"></app-report-line-chart>
            </div>
            <div *ngIf="charts.hasWeight">
              <div class="text-xs font-bold text-gray-500 mb-1">⚖️ متوسط الوزن (كجم) <span class="font-normal text-gray-400">— الخط المتقطع = مستهدف البرنامج</span></div>
              <app-report-line-chart [labels]="charts.labels" [series]="charts.weight" unit="كجم" [height]="130" ariaLabel="متوسط الوزن"></app-report-line-chart>
            </div>
            <div *ngIf="charts.hasTemp">
              <div class="text-xs font-bold text-gray-500 mb-1">🌡️ الحرارة (°م)</div>
              <app-report-line-chart [labels]="charts.labels" [series]="charts.temp" unit="°" [height]="130" ariaLabel="الحرارة"></app-report-line-chart>
            </div>
          </div>
        </ng-template>

        <div class="flex gap-2 mb-4 overflow-x-auto">
          <button *ngFor="let t of tabs" (click)="selectTab(t.key)"
                  class="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold border transition whitespace-nowrap"
                  [class.bg-green-600]="activeTab() === t.key"
                  [class.text-white]="activeTab() === t.key"
                  [class.border-green-600]="activeTab() === t.key"
                  [class.border-gray-200]="activeTab() !== t.key"
                  [class.text-gray-500]="activeTab() !== t.key">
            {{ t.label }}
          </button>
        </div>

        <div *ngIf="offlineNote() || isOffline()" class="bg-gray-100 border border-gray-200 text-gray-600 rounded-xl p-2.5 text-[11px] leading-relaxed mb-3">
          {{ offlineNote() || (offlineSupported ? '📴 مفيش نت — بنعرض اللي محفوظ على جهازك' : '📴 مفيش نت — التقارير على الويب بتحتاج اتصال') }}
        </div>
        <div *ngIf="syncNotice() as msg" class="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-2.5 text-xs font-bold mb-3">{{ msg }}</div>
        <div *ngIf="!isOffline() && pendingCountSelected() > 0" class="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-2.5 text-xs mb-3">
          ⏳ {{ pendingCountSelected() }} تسجيل لسه ما اتبعتش للسيرفر وهو مش داخل في التقرير ده.
          <button type="button" (click)="syncNow()" [disabled]="syncing()" class="font-bold text-green-700 underline mr-1">
            {{ syncing() ? 'جاري الإرسال...' : 'ابعتهم دلوقتي' }}
          </button>
        </div>
        <div *ngIf="loading()" class="text-center text-xs text-gray-400 py-2">⏳ جاري تحميل التقرير...</div>
        <div *ngIf="loadError() as err" class="bg-red-50 border border-red-100 text-red-700 rounded-xl p-3 text-xs mb-3 flex items-center justify-between gap-2">
          <span>{{ err }}</span>
          <button (click)="onFlockChange()" class="font-bold underline whitespace-nowrap">إعادة المحاولة</button>
        </div>

        <div *ngIf="!selectedFlockId && activeTab() !== 'farm'" class="text-center py-6 text-gray-400 text-sm">اختر قطيع الأول</div>

        <!-- 🏠 نظرة عامة على المزرعة كلها -->
        <ng-container *ngIf="activeTab() === 'farm'">
          <div class="flex gap-2 mb-3">
            <button *ngFor="let p of farmPeriodOptions" (click)="farmPeriod = p.value; loadFarmSummary()"
                    class="flex-1 py-1.5 rounded-xl text-xs font-bold border"
                    [class.bg-green-600]="farmPeriod === p.value" [class.text-white]="farmPeriod === p.value"
                    [class.border-green-600]="farmPeriod === p.value" [class.text-gray-500]="farmPeriod !== p.value">
              {{ p.label }}
            </button>
          </div>
          <div *ngIf="farmSummary() as fs">
            <div *ngIf="!fs.has_data" class="text-center py-4 text-gray-400 text-sm">{{ fs.message }}</div>
            <div *ngIf="fs.has_data">
              <div class="grid grid-cols-2 gap-2 text-sm mb-3">
                <div class="bg-gray-50 rounded-xl p-2.5"><div class="text-[11px] text-gray-400">عدد القطعان</div><div class="font-black">{{ fs.flocks_count }}</div></div>
                <div class="bg-gray-50 rounded-xl p-2.5"><div class="text-[11px] text-gray-400">إجمالي النفوق</div><div class="font-black text-red-600">{{ fs.total_mortality }}</div></div>
                <div class="bg-gray-50 rounded-xl p-2.5"><div class="text-[11px] text-gray-400">أحداث حرجة</div><div class="font-black text-red-600">{{ fs.total_critical_events }}</div></div>
                <div class="bg-gray-50 rounded-xl p-2.5"><div class="text-[11px] text-gray-400">تنبيهات</div><div class="font-black text-amber-600">{{ fs.total_warning_events }}</div></div>
              </div>

              <div class="space-y-2">
                <div *ngFor="let f of fs.flocks" class="rounded-xl border p-3 text-sm"
                     [class.border-red-200]="f.events_summary.critical > 0"
                     [class.border-gray-100]="f.events_summary.critical === 0">
                  <div class="flex items-center justify-between mb-1">
                    <span class="font-bold">{{ f.flock_name }}</span>
                    <div class="flex gap-1 text-[10px]">
                      <span *ngIf="f.events_summary.critical" class="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">{{ f.events_summary.critical }} حرج</span>
                      <span *ngIf="f.events_summary.warning" class="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">{{ f.events_summary.warning }} تنبيه</span>
                    </div>
                  </div>
                  <div class="flex gap-3 text-xs text-gray-500">
                    <span>نفوق {{ f.total_mortality }}</span>
                    <span>علف {{ f.total_feed_kg }} كجم</span>
                    <span *ngIf="f.completeness_pct != null" [class.text-amber-600]="f.completeness_pct < 70">تسجيل {{ f.completeness_pct }}%</span>
                  </div>
                  <div *ngIf="f.top_events?.length" class="mt-2 space-y-1">
                    <div *ngFor="let e of f.top_events" class="text-[11px] text-gray-500">• {{ e.title_ar }}</div>
                  </div>
                  <button (click)="openFlock(f.flock_id)" class="text-[11px] text-green-600 font-bold mt-2">فتح تقرير القطيع →</button>
                </div>
              </div>
            </div>
          </div>
        </ng-container>

        <!-- تقرير اليوم -->
        <ng-container *ngIf="selectedFlockId && activeTab() === 'daily'">
          <input type="date" [(ngModel)]="dailyDate" (ngModelChange)="loadDaily()"
                 class="form-input text-sm mb-3"/>
          <div *ngIf="dailyReport() as r">
            <div *ngIf="!r.has_data" class="text-center py-4 text-gray-400 text-sm">{{ r.message }}</div>
            <div *ngIf="r.has_data" class="grid grid-cols-2 gap-2 text-sm">
              <div class="bg-gray-50 rounded-xl p-2.5">
                <div class="text-[11px] text-gray-400">النفوق</div>
                <div class="font-black">{{ r.mortality }}
                  <span *ngIf="r.mortality_delta !== null" class="text-xs" [class.text-red-500]="r.mortality_delta > 0" [class.text-green-600]="r.mortality_delta <= 0">
                    ({{ r.mortality_delta >= 0 ? '+' : '' }}{{ r.mortality_delta }})
                  </span>
                </div>
              </div>
              <div class="bg-gray-50 rounded-xl p-2.5">
                <div class="text-[11px] text-gray-400">الوزن</div>
                <div class="font-black">{{ r.avg_weight_kg ?? '—' }} كجم
                  <span *ngIf="r.weight_delta !== null && r.weight_delta !== undefined" class="text-xs" [class.text-green-600]="r.weight_delta >= 0" [class.text-red-500]="r.weight_delta < 0">({{ r.weight_delta >= 0 ? '+' : '' }}{{ r.weight_delta }})</span>
                </div>
              </div>
              <div class="bg-gray-50 rounded-xl p-2.5">
                <div class="text-[11px] text-gray-400">العلف</div>
                <div class="font-black">{{ r.feed_consumed_kg ?? '—' }} <span *ngIf="r.feed_consumed_kg !== null && r.feed_consumed_kg !== undefined">كجم</span></div>
                <div *ngIf="r.feed_consumed_kg === null || r.feed_consumed_kg === undefined" class="text-[10px] text-gray-400">غير مسجل</div>
              </div>
              <div class="bg-gray-50 rounded-xl p-2.5">
                <div class="text-[11px] text-gray-400">الحرارة</div>
                <div class="font-black">{{ r.temperature_celsius ?? '—' }}°</div>
              </div>
              <div *ngIf="r.water_consumed_l !== null && r.water_consumed_l !== undefined" class="bg-gray-50 rounded-xl p-2.5">
                <div class="text-[11px] text-gray-400">المياه</div>
                <div class="font-black">{{ r.water_consumed_l }} لتر</div>
              </div>
              <div *ngIf="r.egg_count !== null && r.egg_count !== undefined" class="bg-gray-50 rounded-xl p-2.5">
                <div class="text-[11px] text-gray-400">إنتاج البيض</div>
                <div class="font-black">{{ r.egg_count }} <span class="text-xs text-red-500" *ngIf="r.broken_egg_count">({{ r.broken_egg_count }} مكسور)</span></div>
              </div>
            </div>

            <div *ngIf="r.financial as fin" class="border-t pt-3 mt-3 text-xs">
              <div class="font-bold text-gray-500 mb-1">💰 الأداء المالي لليوم</div>
              <ng-container *ngTemplateOutlet="financialBlock; context: { fin: fin }"></ng-container>
            </div>

            <!-- ✏️ تسجيل معاملة مالية فعلية سريعة -->
            <div class="border-t pt-3 mt-3">
              <button (click)="showTxForm = !showTxForm" class="text-xs font-bold text-green-600 mb-2">
                {{ showTxForm ? '✕ إلغاء' : '+ تسجيل مصروف/مبيعة فعلية' }}
              </button>
              <div *ngIf="showTxForm" class="bg-gray-50 rounded-xl p-3 space-y-2">
                <div class="flex gap-2">
                  <button (click)="txForm.type = 'expense'; txForm.category = 'feed'"
                          class="flex-1 py-1.5 rounded-lg text-xs font-bold border"
                          [class.bg-red-500]="txForm.type === 'expense'" [class.text-white]="txForm.type === 'expense'">مصروف</button>
                  <button (click)="txForm.type = 'income'; txForm.category = 'sale_eggs'"
                          class="flex-1 py-1.5 rounded-lg text-xs font-bold border"
                          [class.bg-green-500]="txForm.type === 'income'" [class.text-white]="txForm.type === 'income'">بيع/دخل</button>
                </div>
                <select [(ngModel)]="txForm.category" class="form-input text-xs w-full">
                  <option *ngFor="let c of txCategories(txForm.type)" [value]="c.value">{{ c.label }}</option>
                </select>
                <input type="number" [(ngModel)]="txForm.amount" placeholder="المبلغ (جنيه)" class="form-input text-xs w-full"/>
                <input type="text" [(ngModel)]="txForm.description" placeholder="وصف مختصر (اختياري)" class="form-input text-xs w-full"/>
                <button (click)="submitTransaction()" [disabled]="!txForm.amount"
                        class="w-full py-2 rounded-lg bg-green-600 text-white text-xs font-bold disabled:opacity-40">
                  حفظ المعاملة
                </button>
              </div>
            </div>

            <ng-container *ngTemplateOutlet="eventsBlock; context: { events: r.events, eventsSummary: r.events_summary, truncated: r.events_truncated }"></ng-container>

            <div *ngIf="r.narrative" class="bg-green-50 border border-green-100 rounded-xl p-3 text-sm leading-relaxed mt-3">
              📋 {{ r.narrative }}
            </div>
          </div>
        </ng-container>

        <!-- تقرير الأسبوع -->
        <ng-container *ngIf="selectedFlockId && activeTab() === 'weekly'">
          <div class="flex gap-2 mb-3">
            <input type="date" [(ngModel)]="weeklyStart" (ngModelChange)="loadWeekly()"
                   class="form-input text-sm flex-1"/>
            <button (click)="downloadWeeklyPdf()" class="px-3 py-1.5 rounded-xl border text-xs font-bold text-gray-600 whitespace-nowrap">⬇️ PDF</button>
          </div>
          <div *ngIf="weeklyReport() as r">
            <div *ngIf="!r.has_data" class="text-center py-4 text-gray-400 text-sm">{{ r.message }}</div>
            <div *ngIf="r.has_data">
              <div class="text-[11px] text-gray-400 text-center mb-2">{{ r.period_start }} → {{ r.period_end }}</div>
              <div class="grid grid-cols-2 gap-2 text-sm mb-3">
                <div class="bg-gray-50 rounded-xl p-2.5"><div class="text-[11px] text-gray-400">أيام مسجلة</div><div class="font-black">{{ r.days_recorded }}</div></div>
                <div class="bg-gray-50 rounded-xl p-2.5"><div class="text-[11px] text-gray-400">إجمالي النفوق</div><div class="font-black text-red-600">{{ r.total_mortality }}</div></div>
                <div class="bg-gray-50 rounded-xl p-2.5"><div class="text-[11px] text-gray-400">إجمالي العلف</div><div class="font-black">{{ r.total_feed_kg }} كجم</div></div>
                <div class="bg-gray-50 rounded-xl p-2.5"><div class="text-[11px] text-gray-400">زيادة الوزن</div><div class="font-black text-green-600">{{ r.weight_gain_kg ?? '—' }} كجم</div></div>
                <div class="bg-gray-50 rounded-xl p-2.5" *ngIf="r.total_eggs !== null"><div class="text-[11px] text-gray-400">إجمالي البيض</div><div class="font-black">{{ r.total_eggs }}</div></div>
                <div class="bg-gray-50 rounded-xl p-2.5"><div class="text-[11px] text-gray-400">متوسط الحرارة</div><div class="font-black">{{ r.avg_temperature ?? '—' }}°</div></div>
              </div>

              <ng-container *ngTemplateOutlet="extraKpis; context: { r: r }"></ng-container>
              <ng-container *ngTemplateOutlet="qualityBlock; context: { notes: r.data_quality_notes, pct: r.completeness_pct }"></ng-container>
              <ng-container *ngTemplateOutlet="trendChartBlock; context: { charts: weeklyCharts() }"></ng-container>
              <ng-container *ngTemplateOutlet="comparisonBlock; context: { comparison: r.comparison }"></ng-container>

              <div *ngIf="r.financial as fin" class="border-t pt-3 text-xs mb-2">
                <div class="font-bold text-gray-500 mb-1">💰 الأداء المالي للأسبوع</div>
                <ng-container *ngTemplateOutlet="financialBlock; context: { fin: fin }"></ng-container>
              </div>

              <ng-container *ngTemplateOutlet="eventsBlock; context: { events: r.events, eventsSummary: r.events_summary, truncated: r.events_truncated }"></ng-container>

              <div *ngIf="r.narrative" class="bg-green-50 border border-green-100 rounded-xl p-3 text-sm leading-relaxed mt-3">
                📋 {{ r.narrative }}
              </div>
            </div>
          </div>
        </ng-container>

        <!-- تقرير الشهر -->
        <ng-container *ngIf="selectedFlockId && activeTab() === 'monthly'">
          <div class="flex gap-2 mb-3">
            <select [(ngModel)]="monthlyMonth" (ngModelChange)="loadMonthly()" class="form-input text-sm flex-1">
              <option *ngFor="let m of monthOptions" [value]="m.value">{{ m.label }}</option>
            </select>
            <input type="number" [(ngModel)]="monthlyYear" (ngModelChange)="loadMonthly()"
                   class="form-input text-sm w-24"/>
            <button (click)="downloadMonthlyPdf()" class="px-3 py-1.5 rounded-xl border text-xs font-bold text-gray-600 whitespace-nowrap">⬇️ PDF</button>
          </div>
          <div *ngIf="monthlyReport() as r">
            <div *ngIf="!r.has_data" class="text-center py-4 text-gray-400 text-sm">{{ r.message }}</div>
            <div *ngIf="r.has_data">
              <div class="grid grid-cols-2 gap-2 text-sm mb-3">
                <div class="bg-gray-50 rounded-xl p-2.5"><div class="text-[11px] text-gray-400">أيام مسجلة</div><div class="font-black">{{ r.days_recorded }}</div></div>
                <div class="bg-gray-50 rounded-xl p-2.5"><div class="text-[11px] text-gray-400">إجمالي النفوق</div><div class="font-black text-red-600">{{ r.total_mortality }}</div></div>
                <div class="bg-gray-50 rounded-xl p-2.5"><div class="text-[11px] text-gray-400">زيادة الوزن</div><div class="font-black text-green-600">{{ r.weight_gain_kg ?? '—' }} كجم</div></div>
                <div class="bg-gray-50 rounded-xl p-2.5"><div class="text-[11px] text-gray-400">متوسط الحرارة</div><div class="font-black">{{ r.avg_temperature ?? '—' }}°</div></div>
              </div>

              <ng-container *ngTemplateOutlet="extraKpis; context: { r: r }"></ng-container>
              <ng-container *ngTemplateOutlet="qualityBlock; context: { notes: r.data_quality_notes, pct: r.completeness_pct }"></ng-container>
              <ng-container *ngTemplateOutlet="trendChartBlock; context: { charts: monthlyCharts() }"></ng-container>
              <ng-container *ngTemplateOutlet="comparisonBlock; context: { comparison: r.comparison }"></ng-container>

              <div *ngIf="r.financial as fin" class="border-t pt-3 text-xs mb-2">
                <div class="font-bold text-gray-500 mb-1">💰 الأداء المالي للشهر</div>
                <ng-container *ngTemplateOutlet="financialBlock; context: { fin: fin }"></ng-container>
              </div>

              <ng-container *ngTemplateOutlet="eventsBlock; context: { events: r.events, eventsSummary: r.events_summary, truncated: r.events_truncated }"></ng-container>

              <div *ngIf="r.narrative" class="bg-green-50 border border-green-100 rounded-xl p-3 text-sm leading-relaxed mt-3">
                {{ r.narrative }}
              </div>
            </div>
          </div>
        </ng-container>

        <!-- تقرير السنة -->
        <ng-container *ngIf="selectedFlockId && activeTab() === 'yearly'">
          <div class="flex gap-2 mb-3">
            <input type="number" [(ngModel)]="yearlyYear" (ngModelChange)="loadYearly()"
                   class="form-input text-sm w-28"/>
            <button (click)="downloadYearlyPdf()" class="px-3 py-1.5 rounded-xl border text-xs font-bold text-gray-600 whitespace-nowrap">⬇️ PDF</button>
          </div>
          <div *ngIf="yearlyReport() as r">
            <div *ngIf="!r.has_data" class="text-center py-4 text-gray-400 text-sm">{{ r.message }}</div>
            <div *ngIf="r.has_data">
              <div class="grid grid-cols-2 gap-2 text-sm mb-3">
                <div class="bg-gray-50 rounded-xl p-2.5"><div class="text-[11px] text-gray-400">أيام مسجلة</div><div class="font-black">{{ r.days_recorded }}</div></div>
                <div class="bg-gray-50 rounded-xl p-2.5"><div class="text-[11px] text-gray-400">إجمالي النفوق</div><div class="font-black text-red-600">{{ r.total_mortality }}</div></div>
                <div class="bg-gray-50 rounded-xl p-2.5"><div class="text-[11px] text-gray-400">إجمالي العلف</div><div class="font-black">{{ r.total_feed_kg }} كجم</div></div>
                <div class="bg-gray-50 rounded-xl p-2.5" *ngIf="r.total_eggs !== null"><div class="text-[11px] text-gray-400">إجمالي البيض</div><div class="font-black">{{ r.total_eggs }}</div></div>
              </div>

              <ng-container *ngTemplateOutlet="extraKpis; context: { r: r }"></ng-container>
              <ng-container *ngTemplateOutlet="qualityBlock; context: { notes: r.data_quality_notes, pct: r.completeness_pct }"></ng-container>
              <div *ngIf="r.monthly_breakdown?.length" class="mb-3">
                <div class="text-xs font-bold text-gray-500 mb-2">التوزيع الشهري</div>
                <div class="space-y-1">
                  <div *ngFor="let m of r.monthly_breakdown" class="flex items-center justify-between text-xs bg-gray-50 rounded-lg p-2">
                    <span class="font-bold">{{ monthOptions[m.month - 1].label }}</span>
                    <span class="text-red-500">نفوق {{ m.total_mortality }}</span>
                    <span>علف {{ m.total_feed_kg }} كجم</span>
                  </div>
                </div>
              </div>

              <ng-container *ngTemplateOutlet="comparisonBlock; context: { comparison: r.comparison }"></ng-container>

              <div *ngIf="r.financial as fin" class="border-t pt-3 text-xs mb-2">
                <div class="font-bold text-gray-500 mb-1">💰 الأداء المالي للسنة</div>
                <ng-container *ngTemplateOutlet="financialBlock; context: { fin: fin }"></ng-container>
              </div>

              <ng-container *ngTemplateOutlet="eventsBlock; context: { events: r.events, eventsSummary: r.events_summary, truncated: r.events_truncated }"></ng-container>

              <div *ngIf="r.narrative" class="bg-green-50 border border-green-100 rounded-xl p-3 text-sm leading-relaxed mt-3">
                📋 {{ r.narrative }}
              </div>
            </div>
          </div>
        </ng-container>

        <!-- تقرير نهاية الدورة -->
        <ng-container *ngIf="selectedFlockId && activeTab() === 'cycle'">
          <div *ngIf="cycleReport() as r" class="space-y-3">
            <button (click)="downloadCyclePdf()"
                    class="w-full py-2 rounded-xl bg-gray-800 text-white text-xs font-bold mb-1">
              ⬇️ تحميل PDF
            </button>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div class="bg-gray-50 rounded-xl p-2.5"><div class="text-[11px] text-gray-400">مدة الدورة</div><div class="font-black">{{ r.cycle_days ?? '—' }} يوم</div></div>
              <div class="bg-gray-50 rounded-xl p-2.5"><div class="text-[11px] text-gray-400">نسبة النفوق</div><div class="font-black text-red-600">{{ r.mortality_rate }}%</div></div>
              <div class="bg-gray-50 rounded-xl p-2.5"><div class="text-[11px] text-gray-400">FCR النهائي</div><div class="font-black">{{ r.fcr ?? '—' }}</div></div>
              <div class="bg-gray-50 rounded-xl p-2.5"><div class="text-[11px] text-gray-400">التحصينات</div><div class="font-black">{{ r.vaccinations_completed }}</div></div>
            </div>

            <div *ngIf="r.epef != null || r.final_weight_kg != null || r.feed_per_dozen_eggs_kg != null || r.total_feed_kg" class="grid grid-cols-2 gap-2 text-sm">
              <div *ngIf="r.epef != null" class="bg-gray-50 rounded-xl p-2.5"><div class="text-[11px] text-gray-400">مؤشر الكفاءة EPEF</div><div class="font-black">{{ r.epef }}</div></div>
              <div *ngIf="r.final_weight_kg != null" class="bg-gray-50 rounded-xl p-2.5"><div class="text-[11px] text-gray-400">آخر وزن مسجل</div><div class="font-black">{{ r.final_weight_kg }} كجم</div></div>
              <div *ngIf="r.total_feed_kg" class="bg-gray-50 rounded-xl p-2.5"><div class="text-[11px] text-gray-400">إجمالي العلف</div><div class="font-black">{{ r.total_feed_kg | number:'1.0-0' }} كجم</div></div>
              <div *ngIf="r.feed_per_dozen_eggs_kg != null" class="bg-gray-50 rounded-xl p-2.5"><div class="text-[11px] text-gray-400">علف لكل دستة بيض</div><div class="font-black">{{ r.feed_per_dozen_eggs_kg }} كجم</div></div>
            </div>
            <div *ngIf="r.fcr_note" class="text-[10px] text-gray-400">{{ r.fcr_note }}</div>
            <ng-container *ngTemplateOutlet="qualityBlock; context: { notes: r.data_quality_notes, pct: r.completeness_pct }"></ng-container>

            <!-- 💰 الأداء المالي الفعلي -->
            <div *ngIf="r.financial as fin" class="border-t pt-3">
              <div class="text-xs font-bold text-gray-500 mb-2">💰 الأداء المالي</div>
              <div class="flex items-baseline gap-1 mb-2">
                <span class="text-2xl font-black" [class.text-green-600]="fin.net_profit >= 0" [class.text-red-600]="fin.net_profit < 0">
                  {{ fin.net_profit >= 0 ? '+' : '' }}{{ fin.net_profit | number:'1.0-0' }}
                </span>
                <span class="text-gray-400 text-sm">جنيه صافي</span>
              </div>
              <div class="space-y-1 text-xs">
                <div class="flex justify-between"><span class="text-gray-500">{{ fin.basis?.revenue === 'actual' ? 'الإيراد (فعلي)' : 'الإيراد (تقديري)' }}</span><span class="font-bold">{{ fin.revenue | number:'1.0-0' }} ج</span></div>
                <div class="flex justify-between"><span class="text-gray-500">{{ fin.basis?.feed === 'actual' ? 'تكلفة العلف (فعلية)' : 'تكلفة العلف (تقديرية)' }}</span><span class="text-red-500">-{{ fin.feed_cost | number:'1.0-0' }} ج</span></div>
                <div class="flex justify-between"><span class="text-gray-500">{{ fin.basis?.chicks === 'actual' ? 'تكلفة الكتاكيت (فعلية)' : 'تكلفة الكتاكيت (تقديرية)' }}</span><span class="text-red-500">-{{ fin.chick_cost | number:'1.0-0' }} ج</span></div>
                <div class="flex justify-between"><span class="text-gray-500">{{ fin.basis?.overhead === 'actual' ? 'مصاريف تشغيل (فعلية)' : 'تكاليف تشغيل تقديرية' }}</span><span class="text-red-500">-{{ fin.overhead_estimated | number:'1.0-0' }} ج</span></div>
              </div>
              <div *ngIf="fin.cost_per_kg != null || fin.profit_per_bird != null" class="space-y-1 text-xs border-t mt-2 pt-2">
                <div *ngIf="fin.cost_per_kg != null" class="flex justify-between"><span class="text-gray-500">تكلفة الكيلو</span><span class="font-bold">{{ fin.cost_per_kg | number:'1.0-2' }} ج</span></div>
                <div *ngIf="fin.profit_per_bird != null" class="flex justify-between"><span class="text-gray-500">ربح الطائر</span><span class="font-bold" [class.text-green-600]="fin.profit_per_bird >= 0" [class.text-red-500]="fin.profit_per_bird < 0">{{ fin.profit_per_bird | number:'1.0-2' }} ج</span></div>
                <div *ngIf="fin.margin_pct != null" class="flex justify-between"><span class="text-gray-500">هامش الربح</span><span class="font-bold">{{ fin.margin_pct }}%</span></div>
              </div>
              <div class="text-[10px] text-gray-400 mt-2">{{ fin.note }}</div>
            </div>
            <div *ngIf="!r.financial" class="border-t pt-3 text-xs text-gray-400 text-center">
              مفيش بيانات أسعار كافية لحساب الأداء المالي لهذه الدورة
            </div>

            <ng-container *ngTemplateOutlet="eventsBlock; context: { events: r.events, eventsSummary: r.events_summary, truncated: r.events_truncated }"></ng-container>

            <div *ngIf="r.narrative" class="bg-green-50 border border-green-100 rounded-xl p-4 text-sm leading-relaxed whitespace-pre-line">
              📋 {{ r.narrative }}
            </div>
          </div>
        </ng-container>

        <!-- مقارنة الدورات -->
        <ng-container *ngIf="selectedFlockId && activeTab() === 'comparison'">
          <div *ngIf="comparisonReport() as r">
            <div *ngIf="!r.has_data" class="text-center py-4 text-gray-400 text-sm">{{ r.message }}</div>
            <div *ngIf="r.has_data">
              <div *ngIf="r.fcr_trend" class="text-center mb-3 text-sm font-bold"
                   [class.text-green-600]="r.fcr_trend === 'تحسن'"
                   [class.text-red-600]="r.fcr_trend === 'تراجع'">
                اتجاه الـ FCR عبر الدورات: {{ r.fcr_trend }}
              </div>
              <div class="space-y-2">
                <div *ngFor="let c of r.cycles" class="flex items-center justify-between p-3 bg-gray-50 rounded-xl text-sm">
                  <div>
                    <div class="font-bold text-gray-700">{{ c.flock_name }}</div>
                    <div class="text-[11px] text-gray-400">{{ c.start_date }} • {{ c.cycle_days ?? '—' }} يوم</div>
                  </div>
                  <div class="text-end">
                    <div class="font-black">FCR {{ c.fcr ?? '—' }}</div>
                    <div class="text-[11px] text-red-500">نفوق {{ c.mortality_rate }}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ng-container>

        <!-- ترتيبك بين المربيين -->
        <ng-container *ngIf="selectedFlockId && activeTab() === 'benchmark'">
          <div *ngIf="benchmarkReport() as r">
            <div *ngIf="!r.has_data" class="text-center py-4 text-gray-400 text-sm">{{ r.message }}</div>
            <div *ngIf="r.has_data" class="space-y-3">
              <div class="bg-gray-50 rounded-xl p-4 text-center">
                <div class="text-[11px] text-gray-400 mb-1">كفاءة التحويل الغذائي (FCR) بتاعتك</div>
                <div class="text-2xl font-black mb-1">{{ r.my_fcr }}</div>
                <div class="text-sm font-bold text-green-700">
                  أحسن من {{ r.fcr_percentile }}% من {{ r.sample_size }} دورة مشابهة على المنصة
                </div>
              </div>
              <div *ngIf="r.mortality_percentile !== null" class="bg-gray-50 rounded-xl p-4 text-center">
                <div class="text-[11px] text-gray-400 mb-1">نسبة النفوق بتاعتك</div>
                <div class="text-2xl font-black mb-1">{{ r.my_mortality_rate }}%</div>
                <div class="text-sm font-bold text-green-700">
                  أحسن من {{ r.mortality_percentile }}% من المربيين المشابهين
                </div>
              </div>
              <div class="text-[10px] text-gray-400 text-center">
                المقارنة مبنية على بيانات مجمعة مجهولة المصدر من كل المستخدمين، من غير كشف أي هوية
              </div>
            </div>
          </div>
        </ng-container>
      </div>

    </div>
  </div>
  `
})
export class ReportsComponent implements OnInit {
  private http = inject(HttpClient);
  private flockSvc = inject(FlockService);
  private auth = inject(AuthService);
  private store = inject(UserOfflineCacheService);
  private pendingSvc = inject(PendingRecordsService);
  private route = inject(ActivatedRoute);
  lang = localStorage.getItem('lang') ?? 'ar';

  fcrData = signal<any[]>([]);
  // 📉 رسم النفوق: مصفوفات ثابتة المرجع (بتتبدل بس لما البيانات توصل) عشان الرسم ما يتعادش كل دورة
  mortalityLabels = signal<string[]>([]);
  mortalitySeries = signal<ChartSeries[]>([]);

  // ⏳ حالة التحميل + رسالة الخطأ (بدل ما الشاشة تفضل فاضية من غير تفسير)
  loading = signal(false);
  loadError = signal<string | null>(null);

  // 📴 أوفلاين: متاح على الموبايل بس (على الويب مفيش تخزين محلي حسب سياسة الأمان في UserOfflineCacheService)
  offlineSupported = this.store.enabled;
  isOffline = signal(typeof navigator !== 'undefined' && navigator.onLine === false);
  /** رسالة بتظهر لما التقرير الحالي جاي من نسخة محفوظة / محسوب على الجهاز / فيه تسجيلات لسه ما اتبعتتش */
  offlineNote = signal<string | null>(null);
  /** عدد تسجيلات القطيع المختار اللي لسه ما اتبعتتش للسيرفر (بتتبعت من هنا أو من صفحة القطيع — نفس الطابور) */
  pendingCountSelected = signal(0);
  syncNotice = signal<string | null>(null);
  syncing = () => this.pendingSvc.syncing();

  @HostListener('window:offline') onWentOffline() { this.isOffline.set(true); }
  @HostListener('window:online') onBackOnline() {
    this.isOffline.set(false);
    this.offlineNote.set(null);
    void this.syncNow(true); // نبعت اللي اتسجل أوفلاين الأول، وبعدها نحدّث التقرير من السيرفر
  }

  /**
   * 🔄 يبعت السجلات اللي اتسجلت أوفلاين للسيرفر (نفس طابور صفحة القطيع، والمنطق في PendingRecordsService)
   * وبعدها يحدّث التقرير عشان يشملها. reloadAlways=true: نحدّث حتى لو مفيش حاجة اتبعتت (رجوع النت).
   */
  async syncNow(reloadAlways = false): Promise<void> {
    const { sent, failed } = await this.pendingSvc.sync();
    if (sent || failed) {
      this.syncNotice.set(sent
        ? `✅ اتبعت ${sent} سجل للسيرفر والتقرير اتحدّث${failed ? ` — و${failed} سجل السيرفر رفضه (شوفهم في صفحة القطيع)` : ''}`
        : `⚠️ ${failed} سجل السيرفر رفضه — شوفهم في صفحة القطيع`);
      setTimeout(() => this.syncNotice.set(null), 7000);
    }
    if ((sent || failed || reloadAlways) && this.selectedFlockId) this.onFlockChange();
    else void this.refreshPendingCount();
  }

  // تقارير اليوم / الشهر / نهاية الدورة
  flocks = signal<any[]>([]);
  selectedFlockId = '';
  activeTab = signal<'farm' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'cycle' | 'comparison' | 'benchmark'>('daily');
  tabs = [
    { key: 'farm' as const, label: '🏠 المزرعة' },
    { key: 'daily' as const, label: '📅 اليوم' },
    { key: 'weekly' as const, label: '📆 الأسبوع' },
    { key: 'monthly' as const, label: '🗓️ الشهر' },
    { key: 'yearly' as const, label: '📈 السنة' },
    { key: 'cycle' as const, label: '📋 الدورة' },
    { key: 'comparison' as const, label: '📊 مقارنة الدورات' },
    { key: 'benchmark' as const, label: '🏆 ترتيبك' },
  ];

  farmPeriod: 'today' | 'week' | 'month' = 'week';
  farmPeriodOptions = [
    { value: 'today' as const, label: 'اليوم' },
    { value: 'week' as const, label: 'الأسبوع' },
    { value: 'month' as const, label: 'الشهر' },
  ];
  farmSummary = signal<any>(null);

  showTxForm = false;
  txForm: { type: 'expense' | 'income'; category: string; amount: number | null; description: string } = {
    type: 'expense', category: 'feed', amount: null, description: '',
  };
  private txCategoryOptions = {
    expense: [
      { value: 'feed', label: 'علف' }, { value: 'chicks', label: 'كتاكيت/زريعة' },
      { value: 'medicine', label: 'أدوية' }, { value: 'vaccination', label: 'تحصينات' },
      { value: 'labor', label: 'عمالة' }, { value: 'utilities', label: 'كهرباء/مياه/وقود' },
      { value: 'equipment', label: 'معدات' }, { value: 'other', label: 'أخرى' },
    ],
    income: [
      { value: 'sale_birds', label: 'بيع طيور' }, { value: 'sale_eggs', label: 'بيع بيض' },
      { value: 'sale_manure', label: 'بيع سماد' }, { value: 'other', label: 'أخرى' },
    ],
  };

  txCategories(type: 'expense' | 'income') {
    return this.txCategoryOptions[type];
  }

  submitTransaction() {
    if (!this.txForm.amount || !this.selectedFlockId) return;
    this.http.post(`${environment.apiUrl}/transactions`, {
      flock_id: this.selectedFlockId,
      type: this.txForm.type,
      category: this.txForm.category,
      amount: this.txForm.amount,
      description: this.txForm.description || null,
      transaction_date: this.dailyDate,
    }).subscribe({
      next: () => {
        this.showTxForm = false;
        this.txForm = { type: 'expense', category: 'feed', amount: null, description: '' };
        this.loadDaily(); // يحدّث الأداء المالي فورًا عشان يبان الرقم الفعلي الجديد
      },
      error: (err: any) => this.loadError.set(err?.status === 0 ? 'حفظ المعاملة بيحتاج اتصال بالنت — جرّبها لما النت يرجع' : 'حصل خطأ أثناء حفظ المعاملة — جرّب تاني'),
    });
  }

  /** تاريخ بتوقيت الجهاز (مش UTC) — toISOString كان بيرجّع "أمس" بعد منتصف الليل بتوقيت مصر */
  private localDateStr(d: Date = new Date()): string {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }

  dailyDate = this.localDateStr();
  dailyReport = signal<any>(null);

  weeklyStart = this.localDateStr(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));
  weeklyCharts = signal<any>(null);
  monthlyCharts = signal<any>(null);
  weeklyReport = signal<any>(null);

  yearlyYear = new Date().getFullYear();
  yearlyReport = signal<any>(null);

  monthlyMonth = new Date().getMonth() + 1;
  monthlyYear = new Date().getFullYear();
  monthlyReport = signal<any>(null);
  monthOptions = [
    { value: 1, label: 'يناير' }, { value: 2, label: 'فبراير' }, { value: 3, label: 'مارس' },
    { value: 4, label: 'أبريل' }, { value: 5, label: 'مايو' }, { value: 6, label: 'يونيو' },
    { value: 7, label: 'يوليو' }, { value: 8, label: 'أغسطس' }, { value: 9, label: 'سبتمبر' },
    { value: 10, label: 'أكتوبر' }, { value: 11, label: 'نوفمبر' }, { value: 12, label: 'ديسمبر' },
  ];

  cycleReport = signal<any>(null);
  comparisonReport = signal<any>(null);
  benchmarkReport = signal<any>(null);

  ngOnInit() {
    this.loadFcr();
    this.flockSvc.getFlocks().subscribe({
      next: list => {
        this.flocks.set(list || []);
        void this.cacheSet('reports:flocks', list || []);
        this.afterFlocksReady();
      },
      error: async (err: any) => {
        // 📴 مفيش نت: قايمة القطعان المحفوظة آخر مرة
        const cached = this.looksOffline(err) ? await this.cacheGet<any[]>('reports:flocks') : null;
        if (cached?.length) { this.flocks.set(cached); this.isOffline.set(true); this.afterFlocksReady(); }
        else this.loadError.set(this.looksOffline(err) ? this.noOfflineDataMsg() : this.errorMessage(err));
      },
    });
  }

  private afterFlocksReady() {
    const list = this.flocks();
    // جاي من كارت لوحة التحكم ("التقرير الكامل"): /reports?flock=<id> بيفتح نفس القطيع
    const wanted = this.route.snapshot?.queryParamMap?.get('flock');
    if (wanted && list.some(f => f.id === wanted)) this.selectedFlockId = wanted;
    else if (list.length && !this.selectedFlockId) this.selectedFlockId = list[0].id;
    this.loadMortality();
    if (this.isOffline()) this.loadFcr(); // نحسب الـ FCR من السجلات المحفوظة بعد ما قايمة القطعان تجهز
    if (this.selectedFlockId) this.onFlockChange(); // كان التاب الافتراضي بيفضل فاضي لحد ما المستخدم يلمس حاجة
    if (!this.isOffline()) void this.syncNow(false); // سجلات متخزّنة من وقت ما النت كان فاصل (بتتبعت وبيتحدّث التقرير لو فيه)
  }

  // ═══ تحميل موحّد: حالة تحميل + رسالة خطأ مفهومة + إعادة محاولة ═══
  private errorMessage(err: any): string {
    switch (err?.status) {
      case 0: return 'مفيش اتصال بالنت — تأكد من الشبكة وجرّب تاني';
      case 401: return 'انتهت الجلسة — سجّل دخول تاني';
      case 404: return 'التقرير ده مش متاح لهذا القطيع';
      case 429: return 'طلبات كتير في وقت قصير — استنى شوية وجرّب تاني';
      default: return 'حصل خطأ أثناء تحميل التقرير — جرّب تاني';
    }
  }

  // ═══ 📴 التخزين المحلي (نفس UserOfflineCacheService المستخدم في صفحة القطيع: مفتاح لكل مستخدم) ═══
  private async uid(): Promise<string | null> {
    try { return await this.auth.currentUserId(); } catch { return null; }
  }

  private async cacheSet(key: string, value: any): Promise<void> {
    if (!this.store.enabled) return;
    const u = await this.uid();
    if (u) { try { await this.store.set(u, key, value); } catch { /* التخزين best-effort */ } }
  }

  private async cacheGet<T = any>(key: string): Promise<T | null> {
    if (!this.store.enabled) return null;
    const u = await this.uid();
    if (!u) return null;
    try { return ((await this.store.get(u, key)) as T) ?? null; } catch { return null; }
  }

  private static readonly REPORT_CACHE_MAX = 60;

  /** بنخزّن آخر نسخة من كل تقرير (بحد أقصى 60 تقرير، الأقدم بيتمسح) */
  private async cacheReport(key: string, data: any): Promise<void> {
    if (!this.store.enabled || data?.has_data === false) return;
    await this.cacheSet(`report:${key}`, { savedAt: new Date().toISOString(), data });
    const index = (await this.cacheGet<string[]>('reports:index')) ?? [];
    const next = [...index.filter(k => k !== key), key];
    while (next.length > ReportsComponent.REPORT_CACHE_MAX) {
      const old = next.shift() as string;
      await this.cacheSet(`report:${old}`, null);
    }
    await this.cacheSet('reports:index', next);
  }

  private looksOffline(err: any): boolean {
    return err?.status === 0 || (typeof navigator !== 'undefined' && navigator.onLine === false);
  }

  private noOfflineDataMsg(): string {
    return this.offlineSupported
      ? 'مفيش نت ومفيش بيانات محفوظة للتقرير ده — افتحه مرة وإنت متصل عشان يتخزن على جهازك'
      : 'مفيش اتصال بالنت — التقارير على الويب بتحتاج نت';
  }

  /** عدد التسجيلات اللي لسه في طابور الإرسال للقطيع المختار (بتتكتب من صفحة القطيع) */
  private pendingCount(flockId: string): Promise<number> {
    return this.pendingSvc.countFor(flockId);
  }

  /** سياق الحساب المحلي: القطيع + سجلاته المخزّنة + طابور الإرسال + برنامج الدورة */
  private async localCtx(flockId: string): Promise<{ flock: Offline.EngineFlock; recs: Offline.Rec[]; full: any } | null> {
    if (!flockId || !this.store.enabled) return null;
    const [records, pending, full] = await Promise.all([
      this.cacheGet<any[]>(`records_cache:${flockId}`),
      this.cacheGet<any[]>('pending_records'),
      this.cacheGet<any>(`cycle_full:${flockId}`),
    ]);
    const f = this.flocks().find(x => x.id === flockId) ?? (await this.cacheGet<any>(`flock_cache:${flockId}`));
    const hasPending = Array.isArray(pending) && pending.some(p => p?.flockId === flockId);
    if (!f || (!Array.isArray(records) && !hasPending)) return null;
    const flock: Offline.EngineFlock = {
      id: f.id, name: f.name, type: f.type,
      initialCount: f.initialCount ?? f.initial_count ?? 0, currentCount: f.currentCount ?? f.current_count ?? 0,
      startDate: f.startDate ?? f.start_date ?? null, status: f.status ?? 'active',
      openingFeedKg: f.openingFeedKg ?? f.opening_feed_kg ?? null,
    };
    return { flock, recs: Offline.mergeRecords(records ?? [], pending ?? [], flockId), full };
  }

  private localNote(pending: number): string {
    return '📴 مفيش نت — التقرير محسوب على جهازك من سجلاتك المحفوظة' +
      (pending > 0 ? ` (شامل ${pending} تسجيل لسه ما اتبعتش)` : '') + '. من غير الماليات والتحصينات والعلاجات والتحليل النصي.';
  }

  private cachedNote(savedAt: string, pending: number): string {
    const when = new Date(savedAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
    return `📴 مفيش نت — بنعرض نسخة محفوظة من ${when}.` +
      (pending > 0 ? ` عندك ${pending} تسجيل لسه ما اتبعتش وهو مش ظاهر فيها.` : ' أي تسجيلات بعدها مش ظاهرة فيها.');
  }

  /** مفيش نت: نسخة محسوبة محليًا لو فيه تسجيلات معلّقة أو مفيش نسخة محفوظة، وإلا آخر نسخة محفوظة */
  private async offlineFallback(opts?: LoadOpts): Promise<{ data: any; note: string } | null> {
    const cached = opts?.key ? await this.cacheGet<{ savedAt: string; data: any }>(`report:${opts.key}`) : null;
    const pending = await this.pendingCount(this.selectedFlockId);
    const tryLocal = async () => {
      const l = opts?.local ? await opts.local() : null;
      return l ? { data: l, note: this.localNote(pending) } : null;
    };
    if (opts?.local && (pending > 0 || !cached?.data)) {
      const l = await tryLocal();
      if (l) return l;
    }
    if (cached?.data) return { data: cached.data, note: this.cachedNote(cached.savedAt, pending) };
    return opts?.local ? tryLocal() : null;
  }

  private load(url: string, target: { set(v: any): void }, after?: (res: any) => void, opts?: LoadOpts) {
    this.loading.set(true);
    this.loadError.set(null);
    this.http.get(url).subscribe({
      next: (res: any) => {
        this.isOffline.set(false);
        this.offlineNote.set(null);
        target.set(res); after?.(res); this.loading.set(false);
        if (opts?.key) void this.cacheReport(opts.key, res);
        void this.refreshPendingCount();
      },
      error: async (err: any) => {
        if (this.looksOffline(err)) {
          this.isOffline.set(true);
          const hit = await this.offlineFallback(opts);
          if (hit) {
            target.set(hit.data); after?.(hit.data); this.offlineNote.set(hit.note); this.loading.set(false);
            return;
          }
          target.set(null); this.loading.set(false); this.loadError.set(this.noOfflineDataMsg());
          return;
        }
        target.set(null); this.loading.set(false); this.loadError.set(this.errorMessage(err));
      },
    });
  }

  /** أونلاين: كام تسجيل لسه ما اتبعتش (التقرير بيتحسب من اللي على السيرفر بس، فبننبّه + نوفّر زر الإرسال) */
  private async refreshPendingCount() {
    this.pendingCountSelected.set(this.selectedFlockId ? await this.pendingSvc.countFor(this.selectedFlockId) : 0);
  }

  /** أونلاين: نحدّث نسخة سجلات القطيع وبرنامجه على الجهاز عشان الحساب المحلي يبقى جاهز لما النت يقطع */
  private prefetchLocal(flockId: string) {
    if (!this.store.enabled || !flockId || this.isOffline()) return;
    this.flockSvc.getRecords(flockId).subscribe({ next: (r: any) => void this.cacheSet(`records_cache:${flockId}`, r), error: () => {} });
    this.http.get(`${environment.apiUrl}/flocks/${flockId}/cycle-program/full`)
      .subscribe({ next: (full: any) => void this.cacheSet(`cycle_full:${flockId}`, full), error: () => {} });
  }

  private chartsFor(b: any[] | null | undefined) {
    if (!b || b.length < 1) return null;
    const num = (v: any): number | null => (v === null || v === undefined ? null : Number(v));
    const has = (a: (number | null)[]) => a.some(v => v !== null);
    const feed = b.map(d => (d.feed_kg > 0 ? Number(d.feed_kg) : null)); // 0 = مش مسجل → فجوة مش صفر
    const weight = b.map(d => num(d.weight_kg));
    const temp = b.map(d => num(d.temperature));
    const tW = b.map(d => num(d.target_weight_kg));
    const tT = b.map(d => num(d.target_temperature));
    return {
      labels: b.map(d => d.date as string),
      mortality: [{ name: 'النفوق', color: '#ef4444', values: b.map(d => Number(d.mortality ?? 0)) }] as ChartSeries[],
      feed: [{ name: 'العلف', color: '#3b82f6', values: feed }] as ChartSeries[],
      weight: [{ name: 'الوزن', color: '#16a34a', values: weight },
        ...(has(tW) ? [{ name: 'المستهدف', color: '#9ca3af', dashed: true, values: tW }] : [])] as ChartSeries[],
      temp: [{ name: 'الحرارة', color: '#f59e0b', values: temp },
        ...(has(tT) ? [{ name: 'المستهدف', color: '#9ca3af', dashed: true, values: tT }] : [])] as ChartSeries[],
      hasFeed: has(feed), hasWeight: has(weight), hasTemp: has(temp),
    };
  }

  // ═══ اختيار القطيع ═══
  selectedFlockName(): string {
    return this.flocks().find(f => f.id === this.selectedFlockId)?.name ?? '';
  }

  onFlockSelected() {
    this.loadMortality();
    this.onFlockChange();
  }

  openFlock(id: string) {
    this.selectedFlockId = id;
    this.loadMortality();
    this.selectTab('daily');
  }

  typeLabel(t: string): string {
    const map: Record<string, string> = {
      broiler: 'تسمين', layer: 'بياض', turkey: 'رومي', duck: 'بط', quail: 'سمان',
      rabbit: 'أرانب', rabbit_breeding: 'أرانب تربية',
    };
    return map[t] ?? '';
  }

  /** ألوان الـ FCR بتتطبق على التسمين بس (1.8/2.0) — أنواع تانية بمعايير مختلفة فمنلوّنش بمعيار غلط */
  fcrClass(f: any): string {
    if (f.fcr === null || f.fcr === undefined) return 'text-gray-400';
    if (f.flock_type !== 'broiler') return 'text-gray-700';
    return f.fcr <= 1.8 ? 'text-green-600' : f.fcr <= 2.0 ? 'text-amber-600' : 'text-red-600';
  }

  onFlockChange() {
    this.prefetchLocal(this.selectedFlockId);
    if (this.activeTab() === 'farm') this.loadFarmSummary();
    else if (this.activeTab() === 'daily') this.loadDaily();
    else if (this.activeTab() === 'weekly') this.loadWeekly();
    else if (this.activeTab() === 'monthly') this.loadMonthly();
    else if (this.activeTab() === 'yearly') this.loadYearly();
    else if (this.activeTab() === 'cycle') this.loadCycle();
    else if (this.activeTab() === 'comparison') this.loadComparison();
    else this.loadBenchmark();
  }

  selectTab(key: 'farm' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'cycle' | 'comparison' | 'benchmark') {
    this.activeTab.set(key);
    this.onFlockChange();
  }

  comparisonItems(comparison: any): any[] {
    if (!comparison) return [];
    return ['mortality', 'feed_kg', 'weight_gain_kg', 'eggs', 'net_financial']
      .map(k => comparison[k])
      .filter(v => v && v.current !== null && v.current !== undefined);
  }

  private downloadPdf(path: string, filename: string) {
    if (!this.selectedFlockId) return;
    this.loadError.set(null);
    if (this.isOffline()) { this.loadError.set('تحميل الـ PDF بيحتاج اتصال بالنت — جرّبه لما النت يرجع'); return; }
    this.http.get(`${environment.apiUrl}/reports/${path}`, { responseType: 'blob' }).subscribe({
      next: (blob) => this.triggerDownload(blob, filename),
      error: (err: any) => this.loadError.set(err?.status === 404 ? 'مفيش بيانات كافية لعمل الـ PDF لهذه الفترة' : this.errorMessage(err)),
    });
  }

  downloadWeeklyPdf() { this.downloadPdf(`weekly/pdf?flock_id=${this.selectedFlockId}&week_start=${this.weeklyStart}`, 'تقرير_أسبوعي.pdf'); }
  downloadMonthlyPdf() { this.downloadPdf(`monthly/pdf?flock_id=${this.selectedFlockId}&year=${this.monthlyYear}&month=${this.monthlyMonth}`, 'تقرير_شهري.pdf'); }
  downloadYearlyPdf() { this.downloadPdf(`yearly/pdf?flock_id=${this.selectedFlockId}&year=${this.yearlyYear}`, 'تقرير_سنوي.pdf'); }
  downloadCyclePdf() { this.downloadPdf(`end-of-cycle/pdf?flock_id=${this.selectedFlockId}`, 'تقرير_نهاية_الدورة.pdf'); }

  private triggerDownload(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  loadComparison() {
    const flock = this.flocks().find(f => f.id === this.selectedFlockId);
    const flockType = flock?.type ? `?flock_type=${flock.type}` : '';
    this.load(`${environment.apiUrl}/reports/cycle-comparison${flockType}`, this.comparisonReport, undefined,
      { key: `comparison:${flock?.type ?? 'all'}` });
  }

  loadBenchmark() {
    if (!this.selectedFlockId) return;
    this.load(`${environment.apiUrl}/reports/benchmark?flock_id=${this.selectedFlockId}`, this.benchmarkReport, undefined,
      { key: `benchmark:${this.selectedFlockId}` });
  }

  loadDaily() {
    if (!this.selectedFlockId) return;
    const id = this.selectedFlockId, date = this.dailyDate;
    this.load(`${environment.apiUrl}/reports/daily?flock_id=${id}&report_date=${date}`, this.dailyReport, undefined, {
      key: `daily:${id}:${date}`,
      local: async () => {
        const c = await this.localCtx(id); if (!c) return null;
        return Offline.assembleDailyReport(c.flock, c.recs, date, Offline.localToday(),
          Offline.targetsFromProgram(c.full, c.flock.startDate, Offline.addDays(date, -8), date));
      },
    });
  }

  loadMonthly() {
    if (!this.selectedFlockId) return;
    const id = this.selectedFlockId, y = this.monthlyYear, m = this.monthlyMonth;
    this.load(`${environment.apiUrl}/reports/monthly?flock_id=${id}&year=${y}&month=${m}`,
      this.monthlyReport, res => this.monthlyCharts.set(this.chartsFor(res?.daily_breakdown)), {
        key: `monthly:${id}:${y}-${m}`,
        local: async () => {
          const c = await this.localCtx(id); if (!c) return null;
          const [ps, pe] = Offline.monthRange(y, m);
          return Offline.assemblePeriodReport('monthly', c.flock, c.recs, ps, pe, Offline.localToday(),
            Offline.targetsFromProgram(c.full, c.flock.startDate, Offline.addDays(ps, -8), pe));
        },
      });
  }

  loadWeekly() {
    if (!this.selectedFlockId) return;
    const id = this.selectedFlockId, ps = this.weeklyStart;
    this.load(`${environment.apiUrl}/reports/weekly?flock_id=${id}&week_start=${ps}`,
      this.weeklyReport, res => this.weeklyCharts.set(this.chartsFor(res?.daily_breakdown)), {
        key: `weekly:${id}:${ps}`,
        local: async () => {
          const c = await this.localCtx(id); if (!c) return null;
          const pe = Offline.addDays(ps, 6);
          return Offline.assemblePeriodReport('weekly', c.flock, c.recs, ps, pe, Offline.localToday(),
            Offline.targetsFromProgram(c.full, c.flock.startDate, Offline.addDays(ps, -8), pe));
        },
      });
  }

  loadYearly() {
    if (!this.selectedFlockId) return;
    const id = this.selectedFlockId, y = this.yearlyYear;
    this.load(`${environment.apiUrl}/reports/yearly?flock_id=${id}&year=${y}`, this.yearlyReport, undefined, {
      key: `yearly:${id}:${y}`,
      local: async () => {
        const c = await this.localCtx(id); if (!c) return null;
        const ps = `${y}-01-01`, pe = `${y}-12-31`;
        return Offline.assemblePeriodReport('yearly', c.flock, c.recs, ps, pe, Offline.localToday(),
          Offline.targetsFromProgram(c.full, c.flock.startDate, Offline.addDays(ps, -8), pe));
      },
    });
  }

  loadCycle() {
    if (!this.selectedFlockId) return;
    const id = this.selectedFlockId;
    this.cycleReport.set(null);
    this.load(`${environment.apiUrl}/reports/end-of-cycle?flock_id=${id}`, this.cycleReport, undefined, {
      key: `cycle:${id}`,
      local: async () => {
        const c = await this.localCtx(id); if (!c) return null;
        const today = Offline.localToday();
        const start = c.flock.startDate ? c.flock.startDate.slice(0, 10) : today;
        return Offline.assembleCycleReport(c.flock, c.recs, today, Offline.targetsFromProgram(c.full, c.flock.startDate, start, today));
      },
    });
  }

  loadFarmSummary() {
    const period = this.farmPeriod;
    this.load(`${environment.apiUrl}/reports/farm-summary?period=${period}`, this.farmSummary, undefined, {
      key: `farm:${period}`,
      local: async () => {
        const today = Offline.localToday(), ps = Offline.farmPeriodStart(period, today);
        const entries = [];
        for (const f of this.flocks().filter(x => (x.status ?? 'active') === 'active')) {
          const c = await this.localCtx(f.id);
          if (!c) continue;
          entries.push(Offline.assembleFarmEntry(c.flock, c.recs, ps, today,
            Offline.targetsFromProgram(c.full, c.flock.startDate, Offline.addDays(ps, -8), today)));
        }
        return entries.length ? Offline.assembleFarmSummary(entries, period, ps, today) : null;
      },
    });
  }

  loadFcr() {
    this.http.get(`${environment.apiUrl}/reports/fcr-comparison`).subscribe({
      next: (res: any) => { this.fcrData.set(res.flocks ?? []); void this.cacheSet('report:fcr', res.flocks ?? []); },
      error: async () => {
        const cached = await this.cacheGet<any[]>('report:fcr');
        if (cached) { this.fcrData.set(cached); return; }
        // مفيش نسخة: نحسبها من سجلات القطعان المخزّنة
        const rows: any[] = [];
        for (const f of this.flocks()) {
          const c = await this.localCtx(f.id);
          if (!c) continue;
          const k = Offline.computeCycleKpis(c.flock, c.recs, Offline.localToday());
          rows.push({ flock_id: f.id, flock_name: f.name, flock_type: f.type, status: f.status, fcr: k.fcr,
                      total_feed_kg: k.total_feed_kg, current_count: c.flock.currentCount });
        }
        this.fcrData.set(rows);
      },
    });
  }

  /** النفوق لقطيع واحد (آخر 60 يوم) — الدمج بين قطعان مختلفة كان بيدّي رقم مضلل */
  loadMortality() {
    const id = this.selectedFlockId;
    const q = id ? `?flock_id=${id}&days=60` : '?days=60';
    const apply = (rows: { date: string; mortality: number }[]) => {
      this.mortalityLabels.set(rows.map(d => d.date));
      this.mortalitySeries.set([{ name: 'النفوق', color: '#ef4444', values: rows.map(d => d.mortality) }]);
    };
    this.http.get(`${environment.apiUrl}/reports/mortality-trend${q}`).subscribe({
      next: (res: any) => apply(res?.data ?? []),
      error: async () => {
        const c = id ? await this.localCtx(id) : null;
        apply(c ? Offline.mortalityTrend(c.recs, Offline.localToday(), 60) : []);
      },
    });
  }
}
