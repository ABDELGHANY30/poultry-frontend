import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
// ⚠️ عدّل المسار ده حسب مكان الملف عندك
import { FlockService } from '../../core/services/flock.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgTemplateOutlet],
  template: `
  <div class="page-wrapper">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-bold text-gray-800">
        {{ lang === 'ar' ? '📊 التقارير المتقدمة' : '📊 Advanced Reports' }}
      </h1>
    </div>

    <!-- Locked state -->
    <div *ngIf="!isPro()" class="card text-center py-10">
      <div class="text-5xl mb-3">🔒</div>
      <h2 class="text-lg font-bold text-gray-800 mb-2">
        {{ lang === 'ar' ? 'هذه الميزة لمشتركي Pro فقط' : 'This feature is Pro only' }}
      </h2>
      <p class="text-gray-500 text-sm mb-4">
        {{ lang === 'ar' ? 'احصل على تقارير FCR ومتابعة يومية للنفوق' : 'Get FCR reports and daily mortality tracking' }}
      </p>
      <a routerLink="/subscription" class="btn-primary btn inline-flex">
        {{ lang === 'ar' ? '⭐ ترقية لـ Pro' : '⭐ Upgrade to Pro' }}
      </a>
    </div>

    <!-- Pro content -->
    <div *ngIf="isPro()" class="space-y-5">

      <!-- FCR Comparison -->
      <div class="card">
        <h2 class="section-title">⚖️ {{ lang === 'ar' ? 'مقارنة معدل التحويل الغذائي (FCR)' : 'FCR Comparison' }}</h2>
        <div class="space-y-2 mt-3">
          <div *ngFor="let f of fcrData()" class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <span class="text-sm font-semibold text-gray-700">{{ f.flock_name }}</span>
            <span class="text-sm font-black"
                  [class.text-green-600]="f.fcr && f.fcr <= 1.8"
                  [class.text-amber-600]="f.fcr && f.fcr > 1.8 && f.fcr <= 2.0"
                  [class.text-red-600]="f.fcr && f.fcr > 2.0"
                  [class.text-gray-400]="!f.fcr">
              {{ f.fcr ?? '—' }}
            </span>
          </div>
          <div *ngIf="fcrData().length === 0" class="text-center py-4 text-gray-400 text-sm">
            {{ lang === 'ar' ? 'لا توجد بيانات كافية بعد' : 'Not enough data yet' }}
          </div>
        </div>
      </div>

      <!-- Mortality Trend -->
      <div class="card">
        <h2 class="section-title">📉 {{ lang === 'ar' ? 'اتجاه النفوق اليومي' : 'Daily Mortality Trend' }}</h2>
        <div class="mt-3 space-y-1">
          <div *ngFor="let d of mortalityData()" class="flex items-center gap-2">
            <span class="text-xs text-gray-400 w-20 flex-shrink-0">{{ d.date }}</span>
            <div class="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
              <div class="h-full bg-red-400 rounded-full" 
                   [style.width]="barWidth(d.mortality) + '%'"></div>
            </div>
            <span class="text-xs font-bold text-gray-600 w-8 text-end">{{ d.mortality }}</span>
          </div>
          <div *ngIf="mortalityData().length === 0" class="text-center py-4 text-gray-400 text-sm">
            {{ lang === 'ar' ? 'لا توجد بيانات نفوق' : 'No mortality data' }}
          </div>
        </div>
      </div>

      <!-- 📅 تقارير اليوم / الشهر / نهاية الدورة -->
      <div class="card">
        <div class="flex items-center gap-2 mb-3">
          <select [(ngModel)]="selectedFlockId" (ngModelChange)="onFlockChange()"
                  class="form-input flex-1 text-sm">
            <option value="" disabled>اختر قطيع</option>
            <option *ngFor="let f of flocks()" [value]="f.id">{{ f.name }}</option>
          </select>
        </div>

        <!-- 📋 قالب مشترك لعرض قائمة الأحداث والأسباب — يُستخدم في كل التابات (يوم/أسبوع/شهر/سنة/دورة) -->
        <ng-template #eventsBlock let-events="events" let-eventsSummary="eventsSummary">
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
        <ng-template #trendChartBlock let-breakdown="breakdown">
          <div *ngIf="breakdown && breakdown.length > 1" class="border-t pt-3 mb-2">
            <div class="text-xs font-bold text-gray-500 mb-2">📉 اتجاه النفوق والعلف خلال الفترة</div>
            <svg viewBox="0 0 280 60" class="w-full h-16" preserveAspectRatio="none">
              <polyline [attr.points]="sparklinePoints(breakdown, 'mortality')" fill="none" stroke="#ef4444" stroke-width="2"/>
              <polyline [attr.points]="sparklinePoints(breakdown, 'feed_kg')" fill="none" stroke="#3b82f6" stroke-width="2"/>
            </svg>
            <div class="flex gap-3 text-[10px] text-gray-400 mt-1">
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-red-500 inline-block"></span> النفوق</span>
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-blue-500 inline-block"></span> العلف (كجم)</span>
            </div>
            <div class="text-[9px] text-gray-300 mt-1">* كل خط بمقياسه الخاص (الشكل يهم أكتر من القيمة المطلقة)</div>
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
                  </div>
                  <div *ngIf="f.top_events?.length" class="mt-2 space-y-1">
                    <div *ngFor="let e of f.top_events" class="text-[11px] text-gray-500">• {{ e.title_ar }}</div>
                  </div>
                  <button (click)="selectedFlockId = f.flock_id; selectTab('daily')" class="text-[11px] text-green-600 font-bold mt-2">فتح تقرير القطيع →</button>
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
                  <span *ngIf="r.weight_delta !== null" class="text-xs text-green-600">(+{{ r.weight_delta }})</span>
                </div>
              </div>
              <div class="bg-gray-50 rounded-xl p-2.5">
                <div class="text-[11px] text-gray-400">العلف</div>
                <div class="font-black">{{ r.feed_consumed_kg ?? '—' }} كجم</div>
              </div>
              <div class="bg-gray-50 rounded-xl p-2.5">
                <div class="text-[11px] text-gray-400">الحرارة</div>
                <div class="font-black">{{ r.temperature_celsius ?? '—' }}°</div>
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

            <ng-container *ngTemplateOutlet="eventsBlock; context: { events: r.events, eventsSummary: r.events_summary }"></ng-container>

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

              <ng-container *ngTemplateOutlet="trendChartBlock; context: { breakdown: r.daily_breakdown }"></ng-container>
              <ng-container *ngTemplateOutlet="comparisonBlock; context: { comparison: r.comparison }"></ng-container>

              <div *ngIf="r.financial as fin" class="border-t pt-3 text-xs mb-2">
                <div class="font-bold text-gray-500 mb-1">💰 الأداء المالي للأسبوع</div>
                <ng-container *ngTemplateOutlet="financialBlock; context: { fin: fin }"></ng-container>
              </div>

              <ng-container *ngTemplateOutlet="eventsBlock; context: { events: r.events, eventsSummary: r.events_summary }"></ng-container>

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

              <ng-container *ngTemplateOutlet="trendChartBlock; context: { breakdown: r.daily_breakdown }"></ng-container>
              <ng-container *ngTemplateOutlet="comparisonBlock; context: { comparison: r.comparison }"></ng-container>

              <div *ngIf="r.financial as fin" class="border-t pt-3 text-xs mb-2">
                <div class="font-bold text-gray-500 mb-1">💰 الأداء المالي للشهر</div>
                <ng-container *ngTemplateOutlet="financialBlock; context: { fin: fin }"></ng-container>
              </div>

              <ng-container *ngTemplateOutlet="eventsBlock; context: { events: r.events, eventsSummary: r.events_summary }"></ng-container>

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

              <ng-container *ngTemplateOutlet="eventsBlock; context: { events: r.events, eventsSummary: r.events_summary }"></ng-container>

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
                <div class="flex justify-between"><span class="text-gray-500">الإيراد</span><span class="font-bold">{{ fin.revenue | number:'1.0-0' }} ج</span></div>
                <div class="flex justify-between"><span class="text-gray-500">تكلفة العلف</span><span class="text-red-500">-{{ fin.feed_cost | number:'1.0-0' }} ج</span></div>
                <div class="flex justify-between"><span class="text-gray-500">تكلفة الكتاكيت</span><span class="text-red-500">-{{ fin.chick_cost | number:'1.0-0' }} ج</span></div>
                <div class="flex justify-between"><span class="text-gray-500">تكاليف تشغيل تقديرية</span><span class="text-red-500">-{{ fin.overhead_estimated | number:'1.0-0' }} ج</span></div>
              </div>
              <div class="text-[10px] text-gray-400 mt-2">{{ fin.note }}</div>
            </div>
            <div *ngIf="!r.financial" class="border-t pt-3 text-xs text-gray-400 text-center">
              مفيش بيانات أسعار كافية لحساب الأداء المالي لهذه الدورة
            </div>

            <ng-container *ngTemplateOutlet="eventsBlock; context: { events: r.events, eventsSummary: r.events_summary }"></ng-container>

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
  lang = localStorage.getItem('lang') ?? 'ar';

  isPro = signal(false);
  fcrData = signal<any[]>([]);
  mortalityData = signal<any[]>([]);
  maxMortality = signal(1);

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
    }, { headers: this.headers() }).subscribe({
      next: () => {
        this.showTxForm = false;
        this.txForm = { type: 'expense', category: 'feed', amount: null, description: '' };
        this.loadDaily(); // يحدّث الأداء المالي فورًا عشان يبان الرقم الفعلي الجديد
      },
      error: () => alert('حصل خطأ أثناء حفظ المعاملة'),
    });
  }

  dailyDate = new Date().toISOString().slice(0, 10);
  dailyReport = signal<any>(null);

  weeklyStart = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
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

  private headers() {
    const token = localStorage.getItem('spa_token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  ngOnInit() {
    this.checkProAndLoad();
    this.flockSvc.getFlocks().subscribe(list => {
      this.flocks.set(list || []);
      if (list?.length && !this.selectedFlockId) {
        this.selectedFlockId = list[0].id;
      }
      this.loadFarmSummary();
    });
  }

  onFlockChange() {
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

  loadFarmSummary() {
    this.http.get(`${environment.apiUrl}/reports/farm-summary?period=${this.farmPeriod}`,
      { headers: this.headers() }
    ).subscribe({ next: (res: any) => this.farmSummary.set(res), error: () => this.farmSummary.set(null) });
  }

  comparisonItems(comparison: any): any[] {
    if (!comparison) return [];
    return ['mortality', 'feed_kg', 'weight_gain_kg', 'eggs', 'net_financial']
      .map(k => comparison[k])
      .filter(v => v && v.current !== null && v.current !== undefined);
  }

  sparklinePoints(breakdown: any[], field: string, width = 280, height = 60): string {
    if (!breakdown || breakdown.length < 2) return '';
    const values = breakdown.map((d: any) => d[field] ?? 0);
    const max = Math.max(...values, 0.0001);
    const min = Math.min(...values, 0);
    const range = (max - min) || 1;
    const stepX = width / (values.length - 1);
    return values.map((v: number, i: number) =>
      `${(i * stepX).toFixed(1)},${(height - ((v - min) / range) * height).toFixed(1)}`
    ).join(' ');
  }

  downloadWeeklyPdf() {
    if (!this.selectedFlockId) return;
    this.http.get(`${environment.apiUrl}/reports/weekly/pdf?flock_id=${this.selectedFlockId}&week_start=${this.weeklyStart}`,
      { headers: this.headers(), responseType: 'blob' }
    ).subscribe({
      next: (blob) => this.triggerDownload(blob, 'تقرير_أسبوعي.pdf'),
      error: () => alert('حصل خطأ أثناء تحميل الـ PDF'),
    });
  }

  downloadMonthlyPdf() {
    if (!this.selectedFlockId) return;
    this.http.get(`${environment.apiUrl}/reports/monthly/pdf?flock_id=${this.selectedFlockId}&year=${this.monthlyYear}&month=${this.monthlyMonth}`,
      { headers: this.headers(), responseType: 'blob' }
    ).subscribe({
      next: (blob) => this.triggerDownload(blob, 'تقرير_شهري.pdf'),
      error: () => alert('حصل خطأ أثناء تحميل الـ PDF'),
    });
  }

  downloadYearlyPdf() {
    if (!this.selectedFlockId) return;
    this.http.get(`${environment.apiUrl}/reports/yearly/pdf?flock_id=${this.selectedFlockId}&year=${this.yearlyYear}`,
      { headers: this.headers(), responseType: 'blob' }
    ).subscribe({
      next: (blob) => this.triggerDownload(blob, 'تقرير_سنوي.pdf'),
      error: () => alert('حصل خطأ أثناء تحميل الـ PDF'),
    });
  }

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
    this.http.get(`${environment.apiUrl}/reports/cycle-comparison${flockType}`,
      { headers: this.headers() }
    ).subscribe({ next: (res: any) => this.comparisonReport.set(res), error: () => this.comparisonReport.set(null) });
  }

  loadBenchmark() {
    if (!this.selectedFlockId) return;
    this.http.get(`${environment.apiUrl}/reports/benchmark?flock_id=${this.selectedFlockId}`,
      { headers: this.headers() }
    ).subscribe({ next: (res: any) => this.benchmarkReport.set(res), error: () => this.benchmarkReport.set(null) });
  }

  downloadCyclePdf() {
    if (!this.selectedFlockId) return;
    this.http.get(`${environment.apiUrl}/reports/end-of-cycle/pdf?flock_id=${this.selectedFlockId}`, {
      headers: this.headers(),
      responseType: 'blob',
    }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'تقرير_نهاية_الدورة.pdf';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => alert('حصل خطأ أثناء تحميل الـ PDF'),
    });
  }

  loadDaily() {
    if (!this.selectedFlockId) return;
    this.http.get(`${environment.apiUrl}/reports/daily?flock_id=${this.selectedFlockId}&report_date=${this.dailyDate}`,
      { headers: this.headers() }
    ).subscribe({ next: (res: any) => this.dailyReport.set(res), error: () => this.dailyReport.set(null) });
  }

  loadMonthly() {
    if (!this.selectedFlockId) return;
    this.http.get(`${environment.apiUrl}/reports/monthly?flock_id=${this.selectedFlockId}&year=${this.monthlyYear}&month=${this.monthlyMonth}`,
      { headers: this.headers() }
    ).subscribe({ next: (res: any) => this.monthlyReport.set(res), error: () => this.monthlyReport.set(null) });
  }

  loadWeekly() {
    if (!this.selectedFlockId) return;
    this.http.get(`${environment.apiUrl}/reports/weekly?flock_id=${this.selectedFlockId}&week_start=${this.weeklyStart}`,
      { headers: this.headers() }
    ).subscribe({ next: (res: any) => this.weeklyReport.set(res), error: () => this.weeklyReport.set(null) });
  }

  loadYearly() {
    if (!this.selectedFlockId) return;
    this.http.get(`${environment.apiUrl}/reports/yearly?flock_id=${this.selectedFlockId}&year=${this.yearlyYear}`,
      { headers: this.headers() }
    ).subscribe({ next: (res: any) => this.yearlyReport.set(res), error: () => this.yearlyReport.set(null) });
  }

  loadCycle() {
    if (!this.selectedFlockId) return;
    this.http.get(`${environment.apiUrl}/reports/end-of-cycle?flock_id=${this.selectedFlockId}`,
      { headers: this.headers() }
    ).subscribe({ next: (res: any) => this.cycleReport.set(res), error: () => this.cycleReport.set(null) });
  }

  checkProAndLoad() {
    this.http.get(`${environment.apiUrl}/reports/summary`, { headers: this.headers() }).subscribe({
      next: (res: any) => {
        this.isPro.set(res.is_pro);
        if (res.is_pro) {
          this.loadFcr();
          this.loadMortality();
        }
      }
    });
  }

  loadFcr() {
    this.http.get(`${environment.apiUrl}/reports/fcr-comparison`, { headers: this.headers() }).subscribe({
      next: (res: any) => this.fcrData.set(res.flocks),
      error: () => {}
    });
  }

  loadMortality() {
    this.http.get(`${environment.apiUrl}/reports/mortality-trend`, { headers: this.headers() }).subscribe({
      next: (res: any) => {
        this.mortalityData.set(res.data);
        const max = Math.max(...res.data.map((d: any) => d.mortality), 1);
        this.maxMortality.set(max);
      },
      error: () => {}
    });
  }

  barWidth(value: number): number {
    return Math.min(100, (value / this.maxMortality()) * 100);
  }
}