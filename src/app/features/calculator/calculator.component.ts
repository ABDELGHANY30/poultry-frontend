import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="page-wrapper">

    <!-- Header -->
    <div class="rounded-3xl text-white px-6 py-5 mb-4"
         style="background:linear-gradient(135deg,#0f2d1a 0%,#2d9e5f 100%)">
      <h1 class="text-xl font-bold">🏗️ حاسبة المزرعة الشاملة</h1>
      <p class="text-white/70 text-sm mt-1">احسب كل متطلبات مزرعتك بدقة</p>
    </div>

    <!-- Form -->
    <div class="card space-y-4 mb-4">

      <!-- نوع الطير -->
      <div>
        <label class="form-label">🐔 نوع الطير</label>
        <select [(ngModel)]="form.poultry_type" (ngModelChange)="onPoultryTypeChange()" class="form-input">
          <option value="broiler">🐔 فروج تسمين</option>
          <option value="layer">🥚 دجاج بياض</option>
          <option value="turkey">🦃 ديك رومي</option>
          <option value="rabbit">🐇 أرانب</option>
          <option value="quail">🐦 سمان</option>
          <option value="duck">🦆 بط</option>
        </select>
      </div>

      <!-- نظام التربية (بيتفلتر حسب نوع الطير المختار) -->
      <div>
        <label class="form-label">🏠 نظام التربية</label>
        <select [(ngModel)]="form.housing_system" class="form-input">
          <option *ngFor="let h of currentHousingList()" [value]="h.value">{{ h.label }}</option>
        </select>
      </div>

      <!-- عدد الطيور -->
      <div>
        <label class="form-label">🔢 عدد الحيوانات</label>
        <input [(ngModel)]="form.bird_count" type="number" class="form-input"
               placeholder="مثال: 5000"/>
      </div>

      <!-- أسعارك (اختياري) - سعر الكتكوت والعلف لنوع الطائر المختار -->
      <div class="bg-gray-50 rounded-2xl p-3 space-y-3">
        <div class="flex items-center justify-between">
          <p class="text-sm font-bold text-gray-700">💰 أسعارك</p>
          <span *ngIf="pricesLastUpdated()" class="text-xs text-gray-400">آخر تعديل ليك: {{ pricesLastUpdated() }}</span>
        </div>
        <p class="text-xs text-gray-400 -mt-2">
          دي الأسعار الافتراضية. لو عندك سعر مختلف عدّله وهيتحفظ
          <span class="font-semibold text-gray-500">في حسابك الشخصي بس</span>.
          <span class="block mt-0.5">💡 أسعار المعدات (شفاطات، تبريد، تدفئة...) هتلاقيها تحت جنب تفصيل التكلفة بعد الحساب مباشرة.</span>
        </p>

        <div class="grid grid-cols-2 gap-2">
          <div *ngFor="let key of typeSpecificKeys()" class="bg-white rounded-xl p-2 relative"
               [class.ring-1]="priceItems()[key]?.is_custom" [class.ring-green-300]="priceItems()[key]?.is_custom">
            <div class="flex items-center justify-between mb-1">
              <p class="text-xs text-gray-500 truncate">{{ priceItems()[key]?.label }}</p>
              <button *ngIf="priceItems()[key]?.is_custom" (click)="resetPrice(key)"
                      title="رجّع للسعر الافتراضي"
                      class="text-xs text-gray-400 hover:text-red-500 flex-shrink-0">↺</button>
            </div>
            <div class="flex items-center gap-1">
              <input type="number" [(ngModel)]="priceEdits[key]" class="form-input text-sm py-1 px-2"/>
              <span class="text-xs text-gray-400 whitespace-nowrap">{{ priceItems()[key]?.unit }}</span>
            </div>
          </div>
        </div>

        <button (click)="savePrices()" [disabled]="savingPrices()"
                class="btn-primary btn w-full text-sm py-2">
          <span *ngIf="!savingPrices()">💾 حفظ الأسعار</span>
          <span *ngIf="savingPrices()">جاري الحفظ...</span>
        </button>
        <p *ngIf="pricesSavedMsg()" class="text-xs text-center" [class.text-green-600]="!pricesSaveError()" [class.text-red-500]="pricesSaveError()">
          {{ pricesSavedMsg() }}
        </p>

        <button (click)="togglePriceHistory()" type="button"
                class="text-xs font-semibold text-gray-500 flex items-center gap-1">
          {{ showPriceHistory() ? '▲ إخفاء سجل التعديلات' : '🕐 سجل تعديلاتك على الأسعار' }}
        </button>
        <div *ngIf="showPriceHistory()" class="max-h-56 overflow-y-auto space-y-1.5">
          <p *ngIf="loadingPriceHistory()" class="text-xs text-gray-400 text-center py-2">جاري التحميل...</p>
          <p *ngIf="!loadingPriceHistory() && priceHistory().length === 0" class="text-xs text-gray-400 text-center py-2">
            لسه معدّلتش أي سعر
          </p>
          <div *ngFor="let h of priceHistory()" class="bg-white rounded-lg px-2.5 py-1.5 flex items-center justify-between text-xs">
            <div>
              <p class="text-gray-600 font-semibold">{{ h.label }}</p>
              <p class="text-gray-400">{{ h.old_price | number }} ← {{ h.new_price | number }}</p>
            </div>
            <span class="text-gray-400 whitespace-nowrap">{{ formatHistoryDate(h.changed_at) }}</span>
          </div>
        </div>
      </div>

      <!-- الموسم -->
      <div>
        <label class="form-label">🌡️ الموسم</label>
        <select [(ngModel)]="form.season" class="form-input">
          <option value="summer">صيف (أبريل - أكتوبر)</option>
          <option value="winter">شتاء (نوفمبر - مارس)</option>
          <option value="moderate">معتدل</option>
        </select>
      </div>

      <!-- المنطقة -->
      <div>
        <label class="form-label">📍 المنطقة الجغرافية</label>
        <select [(ngModel)]="form.egypt_location" class="form-input">
          <option value="delta">الدلتا / السواحل</option>
          <option value="upper">الصعيد</option>
          <option value="coastal">السواحل (الساحل الشمالي)</option>
        </select>
      </div>

      <!-- أبعاد العنبر (اختياري) -->
      <div class="border-t pt-4">
        <p class="text-sm font-bold text-gray-600 mb-3">📐 أبعاد العنبر (اختياري — لتحقق أدق)</p>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="form-label">الطول (م)</label>
            <input [(ngModel)]="form.house_length" type="number" class="form-input" placeholder="120"/>
          </div>
          <div>
            <label class="form-label">العرض (م)</label>
            <input [(ngModel)]="form.house_width" type="number" class="form-input" placeholder="12"/>
          </div>
          <div>
            <label class="form-label">الارتفاع (م)</label>
            <input [(ngModel)]="form.house_height" type="number" class="form-input" placeholder="2.5"/>
          </div>
        </div>
      </div>

      <!-- معلومات إضافية -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="form-label">⚖️ متوسط الوزن (كجم)</label>
          <input [(ngModel)]="form.avg_weight_kg" type="number" step="0.1" class="form-input"
                 [placeholder]="weightPlaceholder()"/>
        </div>
        <div>
          <label class="form-label">{{ cycleDaysLabel() }}</label>
          <input [(ngModel)]="form.target_age_days" type="number" class="form-input"
                 [placeholder]="cycleDaysPlaceholder()"/>
          <p class="text-xs text-gray-400 mt-1">سيبها فاضية وهنستخدم القيمة المعتادة لنوع الطير تلقائياً</p>
        </div>
      </div>

      <button (click)="calculate()"
              [disabled]="loading() || !form.bird_count"
              class="btn-primary btn w-full text-base py-3">
        <span *ngIf="!loading()">🔢 احسب المتطلبات</span>
        <span *ngIf="loading()">جاري الحساب...</span>
      </button>
    </div>

    <!-- Results -->
    <div *ngIf="result()" class="space-y-4">

      <!-- 🎯 المدة الفعلية المستخدمة في الحساب (مفيدة خصوصاً لو المستخدم سابها فاضية) -->
      <div *ngIf="result().input?.target_age_days_used" class="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-600 text-center">
        📅 الحساب مبني على مدة دورة {{ result().input.target_age_days_used }} يوم
        <span *ngIf="!form.target_age_days">(قيمة تلقائية حسب نوع الطائر - تقدر تحددها بنفسك فوق)</span>
      </div>

      <!-- Warnings -->
      <div *ngIf="result().warnings?.length > 0" class="space-y-2">
        <div *ngFor="let w of result().warnings"
             class="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
          {{ w }}
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-green-50 rounded-2xl p-4 text-center">
          <p class="text-2xl font-black text-green-700">{{ result().area?.required_m2 }}</p>
          <p class="text-xs text-green-600 font-semibold mt-1">م² مساحة مطلوبة</p>
          <p class="text-xs text-gray-400">{{ result().area?.birds_per_m2 }} طير/م²</p>
        </div>
        <div class="bg-blue-50 rounded-2xl p-4 text-center">
          <p class="text-2xl font-black text-blue-700">{{ result().ventilation?.fans_count }}</p>
          <p class="text-xs text-blue-600 font-semibold mt-1">شفاطة/مروحة</p>
          <p class="text-xs text-gray-400">{{ result().ventilation?.fan_specs }}</p>
        </div>
        <div class="bg-amber-50 rounded-2xl p-4 text-center">
          <p class="text-2xl font-black text-amber-700">{{ result().water?.daily_liters }}</p>
          <p class="text-xs text-amber-600 font-semibold mt-1">لتر مياه/يوم</p>
          <p class="text-xs text-gray-400">{{ result().water?.nipple_drinkers }} نيبل</p>
        </div>
        <div class="bg-purple-50 rounded-2xl p-4 text-center">
          <p class="text-2xl font-black text-purple-700">{{ result().feed?.daily_kg }}</p>
          <p class="text-xs text-purple-600 font-semibold mt-1">كجم علف/يوم</p>
          <p class="text-xs text-gray-400">{{ result().feed?.total_cycle_kg }} كجم/دورة</p>
        </div>
      </div>

      <!-- التكلفة التقديرية -->
      <div class="card" *ngIf="result().costs">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-bold text-gray-800">💰 التكلفة التقديرية</h3>
          <span class="text-xs" [class.text-green-600]="result().costs?.used_custom_prices" [class.text-gray-400]="!result().costs?.used_custom_prices">
            {{ result().costs?.used_custom_prices ? '✏️ بأسعارك الشخصية' : 'بالأسعار الافتراضية' }}
          </span>
        </div>
        <div class="bg-green-50 rounded-2xl p-4 text-center mb-3">
          <p class="text-2xl font-black text-green-700">{{ result().costs?.grand_total | number }}</p>
          <p class="text-xs text-green-600 font-semibold mt-1">جنيه إجمالي تقديري</p>
        </div>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500">إجمالي المعدات (مرة واحدة)</span>
            <span class="font-bold">{{ result().costs?.equipment_total | number }} ج</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">علف الدورة كاملة</span>
            <span class="font-bold">{{ result().costs?.feed_cycle_cost | number }} ج</span>
          </div>
          <div class="border-t pt-2 mt-2 space-y-1.5">
            <ng-container *ngFor="let cat of costCategories">
              <div class="flex items-center justify-between text-xs" *ngIf="(result().costs?.breakdown?.[cat.key] || 0) > 0">
                <label class="flex items-center gap-1.5 cursor-pointer select-none" [class.opacity-50]="isCategoryExcluded(cat.key)">
                  <input type="checkbox" [checked]="isCategoryExcluded(cat.key)" (change)="toggleEquipmentExclusion(cat.key)" class="w-3.5 h-3.5 accent-green-600"/>
                  <span class="text-gray-400">{{ cat.label }}</span>
                </label>
                <span class="text-gray-600" [class.line-through]="isCategoryExcluded(cat.key)" [class.opacity-50]="isCategoryExcluded(cat.key)">
                  {{ result().costs?.breakdown?.[cat.key] | number }} ج
                </span>
              </div>
            </ng-container>
          </div>
          <p class="text-xs text-gray-400" *ngIf="excludedCategories().length">
            ✓ البنود المشطوبة فوق حددت إنها عندك بالفعل ومتحسبتش في الإجمالي
          </p>
          <p class="text-xs text-red-500" *ngIf="exclusionError()">{{ exclusionError() }}</p>

          <!-- تعديل أسعار الأدوات - هنا جنب الحسابات مباشرة عشان تعدل السعر وأنت شايف تأثيره على الإجمالي فورًا -->
          <button (click)="showEquipmentPrices.set(!showEquipmentPrices())" type="button"
                  class="text-xs font-semibold text-green-700 flex items-center gap-1 pt-2 border-t mt-2">
            {{ showEquipmentPrices() ? '▲ إخفاء تعديل أسعار الأدوات' : '✏️ تعديل أسعار الأدوات' }}
          </button>
          <div *ngIf="showEquipmentPrices()" class="space-y-2">
            <div class="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              <div *ngFor="let key of equipmentKeys()" class="bg-gray-50 rounded-xl p-2 relative"
                   [class.ring-1]="priceItems()[key]?.is_custom" [class.ring-green-300]="priceItems()[key]?.is_custom">
                <div class="flex items-center justify-between mb-1">
                  <p class="text-xs text-gray-500 truncate">{{ priceItems()[key]?.label }}</p>
                  <button *ngIf="priceItems()[key]?.is_custom" (click)="resetPrice(key)"
                          title="رجّع للسعر الافتراضي"
                          class="text-xs text-gray-400 hover:text-red-500 flex-shrink-0">↺</button>
                </div>
                <div class="flex items-center gap-1">
                  <input type="number" [(ngModel)]="priceEdits[key]" class="form-input text-sm py-1 px-2"/>
                  <span class="text-xs text-gray-400 whitespace-nowrap">{{ priceItems()[key]?.unit }}</span>
                </div>
              </div>
            </div>
            <button (click)="saveEquipmentPrices()" [disabled]="savingPrices()"
                    class="btn-primary btn w-full text-sm py-2">
              <span *ngIf="!savingPrices()">💾 حفظ وإعادة حساب الإجمالي</span>
              <span *ngIf="savingPrices()">جاري الحفظ...</span>
            </button>
            <p *ngIf="pricesSavedMsg()" class="text-xs text-center" [class.text-green-600]="!pricesSaveError()" [class.text-red-500]="pricesSaveError()">
              {{ pricesSavedMsg() }}
            </p>
          </div>
        </div>
        <p class="text-xs text-gray-400 mt-3">{{ result().costs?.note }}</p>
        <button (click)="exportPdf()" [disabled]="exportingPdf()"
                class="w-full mt-3 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition">
          <span *ngIf="!exportingPdf()">📄 تصدير تقرير PDF</span>
          <span *ngIf="exportingPdf()">جاري التجهيز...</span>
        </button>
        <p *ngIf="exportPdfError()" class="text-xs text-red-500 text-center mt-1">{{ exportPdfError() }}</p>
      </div>

      <!-- التهوية -->
      <div class="card">
        <h3 class="font-bold text-gray-800 mb-3">💨 التهوية</h3>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500">تدفق الهواء المطلوب</span>
            <span class="font-bold">{{ result().ventilation?.airflow_m3_per_hour | number }} م³/ساعة</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">عدد الشفاطات</span>
            <span class="font-bold text-blue-600">{{ result().ventilation?.fans_count }} شفاطة</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">مقاس الشفاطة</span>
            <span class="font-bold">{{ result().ventilation?.fan_specs }}</span>
          </div>
          <div *ngIf="result().ventilation?.inlets_count > 0" class="flex justify-between">
            <span class="text-gray-500">فتحات الهواء (Inlets)</span>
            <span class="font-bold">{{ result().ventilation?.inlets_count }}</span>
          </div>
        </div>
      </div>

      <!-- التبريد -->
      <div class="card" *ngIf="result().cooling?.pads_length_m > 0 || result().cooling?.evaporative_coolers > 0">
        <h3 class="font-bold text-gray-800 mb-3">❄️ التبريد</h3>
        <div class="space-y-2 text-sm">
          <div *ngIf="result().cooling?.pads_length_m > 0">
            <div class="flex justify-between">
              <span class="text-gray-500">طول الكوولينج باد</span>
              <span class="font-bold text-blue-600">{{ result().cooling?.pads_length_m }} متر</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">مساحة الكوولينج باد</span>
              <span class="font-bold">{{ result().cooling?.pads_area_m2 }} م²</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">مضخة المياه</span>
              <span class="font-bold text-blue-600">{{ result().cooling?.water_pump_lpm }} لتر/دقيقة</span>
            </div>
          </div>
          <div *ngIf="result().cooling?.evaporative_coolers > 0" class="flex justify-between">
            <span class="text-gray-500">مبردات هوائية</span>
            <span class="font-bold">{{ result().cooling?.evaporative_coolers }} وحدة</span>
          </div>
        </div>
      </div>

      <!-- التدفئة -->
      <div class="card" *ngIf="result().heating?.heaters_count > 0">
        <h3 class="font-bold text-gray-800 mb-3">🔥 التدفئة</h3>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500">النوع</span>
            <span class="font-bold">{{ result().heating?.heater_type }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">العدد</span>
            <span class="font-bold text-orange-600">{{ result().heating?.heaters_count }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">المواصفات</span>
            <span class="font-bold text-xs">{{ result().heating?.specs }}</span>
          </div>
        </div>
      </div>

      <!-- المياه -->
      <div class="card">
        <h3 class="font-bold text-gray-800 mb-3">💧 المياه</h3>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500">استهلاك يومي</span>
            <span class="font-bold text-blue-600">{{ result().water?.daily_liters }} لتر</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">نيبلات</span>
            <span class="font-bold">{{ result().water?.nipple_drinkers }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">شاربات بلدي</span>
            <span class="font-bold">{{ result().water?.bell_drinkers }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">خطوط مياه</span>
            <span class="font-bold">{{ result().water?.water_lines }}</span>
          </div>
        </div>
      </div>

      <!-- العلف -->
      <div class="card">
        <h3 class="font-bold text-gray-800 mb-3">🌾 العلف</h3>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500">استهلاك يومي</span>
            <span class="font-bold text-green-600">{{ result().feed?.daily_kg }} كجم</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">إجمالي الدورة</span>
            <span class="font-bold">{{ result().feed?.total_cycle_kg }} كجم</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">عدد المعالف</span>
            <span class="font-bold">{{ result().feed?.feeders_count }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">نوع المعلف</span>
            <span class="font-bold text-xs">{{ result().feed?.feeder_type }}</span>
          </div>
        </div>
      </div>

      <!-- الإضاءة -->
      <div class="card">
        <h3 class="font-bold text-gray-800 mb-3">💡 الإضاءة</h3>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500">عدد اللمبات</span>
            <span class="font-bold">{{ result().lighting?.bulbs_count }} لمبة</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">نوع اللمبة</span>
            <span class="font-bold">LED {{ result().lighting?.bulb_watts }} وات</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">إجمالي الطاقة</span>
            <span class="font-bold">{{ result().lighting?.total_watts }} وات</span>
          </div>
        </div>
      </div>

      <!-- الفرشة -->
      <div class="card" *ngIf="result().litter?.depth_cm > 0">
        <h3 class="font-bold text-gray-800 mb-3">🪵 الفرشة</h3>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500">المادة</span>
            <span class="font-bold">{{ result().litter?.material }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">السُمك</span>
            <span class="font-bold">{{ result().litter?.depth_cm }} سم</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">الكمية</span>
            <span class="font-bold text-amber-600">{{ result().litter?.tons }} طن</span>
          </div>
        </div>
      </div>

      <!-- النصائح -->
      <div class="card" *ngIf="result().tips?.length > 0">
        <h3 class="font-bold text-gray-800 mb-3">💡 نصائح الخبراء</h3>
        <div class="space-y-3">
          <div *ngFor="let tip of result().tips"
               class="bg-green-50 rounded-xl p-3 text-sm text-green-800 whitespace-pre-line">
            {{ tip }}
          </div>
        </div>
      </div>

      <!-- 💰 الجدوى الاقتصادية / الربح المتوقع -->
      <div class="card border-2 border-green-100">
        <h3 class="font-bold text-gray-800 mb-3">💰 الجدوى الاقتصادية المتوقعة</h3>
        <p class="text-xs text-gray-400 mb-4">دخّل الأسعار الفعلية عندك عشان تحصل على تقدير للربح المتوقع للدورة</p>

        <div class="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label class="form-label">🌾 سعر العلف (جنيه/كجم)</label>
            <input [(ngModel)]="profitForm.feed_price_per_kg" type="number" step="0.1" class="form-input" placeholder="15"/>
          </div>
          <div>
            <label class="form-label">🐣 سعر الكتكوت/الصوص</label>
            <input [(ngModel)]="profitForm.chick_price" type="number" step="0.1" class="form-input" placeholder="8"/>
          </div>

          <!-- 🍗 سعر بيع الكيلو - لكل الأنواع اللي بتتباع لحم -->
          <div *ngIf="form.poultry_type !== 'layer'">
            <label class="form-label">💵 سعر بيع الكيلو (جنيه)</label>
            <input [(ngModel)]="profitForm.selling_price_per_kg" type="number" step="0.5" class="form-input" placeholder="65"/>
          </div>

          <!-- 🥚 حقول خاصة بالبياض -->
          <ng-container *ngIf="form.poultry_type === 'layer'">
            <div>
              <label class="form-label">🥚 سعر البيضة (جنيه)</label>
              <input [(ngModel)]="profitForm.egg_price" type="number" step="0.1" class="form-input" placeholder="2.5"/>
            </div>
            <div>
              <label class="form-label">📦 متوسط بيض/دجاجة (اختياري)</label>
              <input [(ngModel)]="profitForm.eggs_per_bird_cycle" type="number" class="form-input" placeholder="300 (افتراضي)"/>
            </div>
          </ng-container>

          <div>
            <label class="form-label">📉 نسبة النفوق المتوقعة % (اختياري)</label>
            <input [(ngModel)]="profitForm.mortality_percent" type="number" step="0.5" class="form-input" placeholder="حسب النوع تلقائياً"/>
          </div>
        </div>

        <!-- مصاريف أخرى مفصّلة (بدل نسبة عمياء من العلف) - نفس أسعارك المحفوظة، وتقدر تعدلها هنا بس لحساب الجدوى -->
        <div class="bg-gray-50 rounded-2xl p-3 space-y-2">
          <p class="text-sm font-bold text-gray-700">🧾 مصاريف أخرى (للطائر/الدورة)</p>
          <div class="grid grid-cols-3 gap-2">
            <div>
              <label class="form-label text-xs">💊 أدوية وتحصينات</label>
              <input [(ngModel)]="profitForm.medicine_cost_per_bird" type="number" step="0.5" class="form-input text-sm py-1.5"/>
            </div>
            <div>
              <label class="form-label text-xs">👷 عمالة</label>
              <input [(ngModel)]="profitForm.labor_cost_per_bird" type="number" step="0.5" class="form-input text-sm py-1.5"/>
            </div>
            <div>
              <label class="form-label text-xs">⚡ كهرباء ومياه</label>
              <input [(ngModel)]="profitForm.utilities_cost_per_bird" type="number" step="0.5" class="form-input text-sm py-1.5"/>
            </div>
          </div>
          <p class="text-xs text-gray-400">
            القيم دي جايه من "أسعارك" اللي عدّلتها فوق. سيبها فاضية لو عايز نحسب مصاريف أخرى كنسبة 20% من العلف بدل كده.
          </p>
        </div>

        <button (click)="calculateProfitability()"
                [disabled]="profitLoading()"
                class="w-full py-2.5 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 transition">
          <span *ngIf="!profitLoading()">📊 احسب الربح المتوقع</span>
          <span *ngIf="profitLoading()">جاري الحساب...</span>
        </button>

        <!-- نتيجة الجدوى الاقتصادية -->
        <div *ngIf="profitResult()" class="mt-4 space-y-3">

          <div *ngFor="let w of profitResult().warnings" class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
            {{ w }}
          </div>

          <div class="rounded-2xl p-5 text-center"
               [class.bg-green-50]="profitResult().net_profit >= 0"
               [class.bg-red-50]="profitResult().net_profit < 0">
            <p class="text-3xl font-black" [class.text-green-700]="profitResult().net_profit >= 0" [class.text-red-700]="profitResult().net_profit < 0">
              {{ profitResult().net_profit | number }} جنيه
            </p>
            <p class="text-xs font-semibold mt-1" [class.text-green-600]="profitResult().net_profit >= 0" [class.text-red-600]="profitResult().net_profit < 0">
              صافي الربح المتوقع للدورة ({{ profitResult().cycle_days }} يوم)
            </p>
          </div>

          <div class="grid grid-cols-3 gap-2 text-center">
            <div class="bg-gray-50 rounded-xl p-3">
              <p class="text-lg font-black text-gray-700">{{ profitResult().profit_margin_percent }}%</p>
              <p class="text-xs text-gray-400 mt-1">هامش الربح</p>
            </div>
            <div class="bg-gray-50 rounded-xl p-3">
              <p class="text-lg font-black text-gray-700">{{ profitResult().profit_per_bird }}</p>
              <p class="text-xs text-gray-400 mt-1">ربح/طير (جنيه)</p>
            </div>
            <div class="bg-gray-50 rounded-xl p-3">
              <p class="text-lg font-black text-gray-700">{{ profitResult().roi_percent }}%</p>
              <p class="text-xs text-gray-400 mt-1">العائد على الاستثمار</p>
            </div>
          </div>

          <div class="space-y-2 text-sm border-t pt-3">
            <div class="flex justify-between">
              <span class="text-gray-500">إجمالي الإيراد المتوقع</span>
              <span class="font-bold text-green-600">{{ profitResult().revenue?.total_revenue | number }} جنيه</span>
            </div>
            <div class="flex justify-between" *ngIf="profitResult().revenue?.total_eggs_expected">
              <span class="text-gray-500">إجمالي البيض المتوقع</span>
              <span class="font-bold">{{ profitResult().revenue?.total_eggs_expected | number }} بيضة</span>
            </div>
            <div class="flex justify-between" *ngIf="profitResult().revenue?.total_live_weight_kg">
              <span class="text-gray-500">إجمالي الوزن الحي المتوقع</span>
              <span class="font-bold">{{ profitResult().revenue?.total_live_weight_kg | number }} كجم</span>
            </div>
            <div class="flex justify-between pt-2 border-t">
              <span class="text-gray-500">تكلفة الكتاكيت</span>
              <span class="font-bold">{{ profitResult().costs?.chicks_cost | number }} جنيه</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">تكلفة العلف</span>
              <span class="font-bold">{{ profitResult().costs?.feed_cost | number }} جنيه</span>
            </div>
            <ng-container *ngIf="profitResult().costs?.other_costs_breakdown as ob; else flatOther">
              <div class="flex justify-between">
                <span class="text-gray-500">💊 أدوية وتحصينات</span>
                <span class="font-bold">{{ ob.medicine | number }} جنيه</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">👷 عمالة</span>
                <span class="font-bold">{{ ob.labor | number }} جنيه</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">⚡ كهرباء ومياه</span>
                <span class="font-bold">{{ ob.utilities | number }} جنيه</span>
              </div>
            </ng-container>
            <ng-template #flatOther>
              <div class="flex justify-between">
                <span class="text-gray-500">مصاريف أخرى</span>
                <span class="font-bold">{{ profitResult().costs?.other_costs | number }} جنيه</span>
              </div>
            </ng-template>
            <div class="flex justify-between pt-2 border-t font-bold">
              <span class="text-gray-700">إجمالي التكاليف</span>
              <span class="text-red-600">{{ profitResult().costs?.total_costs | number }} جنيه</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
  `
})
export class CalculatorComponent implements OnInit {
  private http = inject(HttpClient);
  loading = signal(false);
  result = signal<any>(null);
  exportingPdf = signal(false);
  exportPdfError = signal('');

  exportPdf(): void {
    this.exportingPdf.set(true);
    this.exportPdfError.set('');
    this.http.post(`${environment.apiUrl}/calculator/export/pdf`, this.form, { responseType: 'blob' }).subscribe({
      next: (blob: Blob) => {
        this.exportingPdf.set(false);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'farm-report.pdf';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.exportingPdf.set(false);
        this.exportPdfError.set('❌ حصل خطأ أثناء إنشاء الملف، حاول تاني');
      }
    });
  }

  // ── نظام التربية الديناميكي حسب نوع الطائر ──────────────
  private housingOptionsMap = signal<Record<string, any>>({});
  // ⚠️ لازم دالة عادية مش computed()! لأن computed() بيتابع بس قراءات
  // الـ signals، و form.poultry_type ده property عادي في object عادي،
  // فـ computed() كان بيتجمد على أول قيمة (broiler) ومايتحدثش تاني
  // لما المستخدم يغيّر النوع من الـ dropdown.
  currentHousingList = () =>
    this.housingOptionsMap()[this.form.poultry_type]?.housing_systems || [];

  // ── إدارة الأسعار ────────────────────────────────────────
  private pricesData = signal<any>({ items: {}, last_updated: null });
  excludedCategories = signal<string[]>([]);
  costCategories: { key: string; label: string }[] = [
    { key: 'fans', label: 'شفاطات' },
    { key: 'cooling', label: 'تبريد' },
    { key: 'heating', label: 'تدفئة' },
    { key: 'water_equipment', label: 'معدات مياه' },
    { key: 'feed_equipment', label: 'معالف' },
    { key: 'lighting', label: 'إضاءة' },
    { key: 'litter', label: 'فرشة' },
    { key: 'cage_setup', label: 'تجهيز أقفاص البطاريات' },
  ];

  isCategoryExcluded(key: string): boolean {
    return this.excludedCategories().includes(key);
  }

  exclusionError = signal('');

  // زرار "عندي بالفعل" جنب كل بند تكلفة - بيستبعده من إجمالي تكلفة الدورة
  // لأن المستخدم يكون اشتراه من قبل ومش عايز يتحسب تاني
  toggleEquipmentExclusion(key: string): void {
    const prev = this.excludedCategories();
    const updated = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
    this.excludedCategories.set(updated); // تحديث فوري في الواجهة
    this.exclusionError.set('');

    this.http.post<any>(`${environment.apiUrl}/calculator/equipment/exclusions`, { excluded: updated }).subscribe({
      next: (data) => {
        this.pricesData.set(data);
        this.excludedCategories.set(data.excluded_categories || updated);
        if (this.result()) this.calculate(); // إعادة حساب الإجمالي فورًا بعد التغيير
      },
      error: (err) => {
        this.excludedCategories.set(prev); // فشل الحفظ - رجّع الحالة زي ما كانت
        this.exclusionError.set(
          err?.status === 401 ? '🔒 سجّل دخول الأول عشان تقدر تحدد المعدات اللي عندك بالفعل' : '❌ حصل خطأ، حاول تاني'
        );
        setTimeout(() => this.exclusionError.set(''), 3000);
      }
    });
  }
  priceItems = computed(() => this.pricesData().items || {});
  priceKeys = computed(() => Object.keys(this.priceItems()));
  // مفاتيح مرتبطة بنوع الطائر المختار حالياً (كتكوت + علف) - بتتحط جنب عدد الحيوانات
  typeSpecificKeys = () => [`chick_price_${this.form.poultry_type}`, `feed_${this.form.poultry_type}_kg`]
    .filter(k => this.priceItems()[k]);
  // باقي أسعار المعدات (شفاطات/تبريد/تدفئة/مياه/فرشة...) - قائمة قابلة للطي لتقليل الزحمة
  equipmentKeys = computed(() => this.priceKeys().filter(k => !k.startsWith('chick_price_') && !k.startsWith('feed_')));
  showEquipmentPrices = signal(false);
  pricesLastUpdated = computed(() => {
    const d = this.pricesData().user_last_updated;
    if (!d) return null;
    return new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
  });
  priceEdits: Record<string, number> = {};
  savingPrices = signal(false);
  pricesSavedMsg = signal('');
  pricesSaveError = signal(false);
  showPriceHistory = signal(false);
  loadingPriceHistory = signal(false);
  priceHistory = signal<any[]>([]);

  togglePriceHistory(): void {
    this.showPriceHistory.set(!this.showPriceHistory());
    if (this.showPriceHistory() && this.priceHistory().length === 0) {
      this.loadingPriceHistory.set(true);
      this.http.get<any>(`${environment.apiUrl}/calculator/prices/history`).subscribe({
        next: (data) => {
          this.priceHistory.set(data.history || []);
          this.loadingPriceHistory.set(false);
        },
        error: () => this.loadingPriceHistory.set(false)
      });
    }
  }

  formatHistoryDate(iso: string): string {
    return new Date(iso).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
  }

  form = {
    bird_count: null as number | null,
    poultry_type: 'broiler',
    housing_system: 'floor_litter',
    season: 'summer',
    egypt_location: 'delta',
    house_length: null as number | null,
    house_width: null as number | null,
    house_height: null as number | null,
    avg_weight_kg: 2.0,  // فروج: 2.2 / رومي: 8-10 / أرانب: 2.5-4
    target_age_days: null as number | null,
  };

  // ══════════════════════════════════════════════════════════
  // 🎯 نصوص وتلميحات مختلفة حسب نوع الطائر - عشان الحقول تبقى
  // منطقية للبياض (دورة إنتاج طويلة) مش بس التسمين (عمر ذبح)
  // ══════════════════════════════════════════════════════════
  private cycleDaysLabels: Record<string, string> = {
    broiler: '📅 عمر الذبح (يوم)',
    turkey: '📅 عمر التسويق (يوم)',
    duck: '📅 عمر التسويق (يوم)',
    rabbit: '📅 عمر التسويق (يوم)',
    quail: '📅 عمر التسويق (يوم)',
    layer: '📅 مدة دورة الإنتاج (يوم)',
  };

  private cycleDaysDefaults: Record<string, number> = {
    broiler: 35,
    turkey: 140,
    duck: 65,
    rabbit: 70,
    quail: 42,
    layer: 400,
  };

  private weightDefaults: Record<string, string> = {
    broiler: '2.0',
    turkey: '9',
    duck: '3',
    rabbit: '3',
    quail: '0.25',
    layer: '1.8',
  };

  cycleDaysLabel = () => this.cycleDaysLabels[this.form.poultry_type] || '📅 عمر التسويق (يوم)';
  cycleDaysPlaceholder = () => String(this.cycleDaysDefaults[this.form.poultry_type] ?? 35);
  weightPlaceholder = () => this.weightDefaults[this.form.poultry_type] ?? '2.0';

  // ── 💰 الجدوى الاقتصادية ─────────────────────────────────
  profitLoading = signal(false);
  profitResult = signal<any>(null);

  profitForm = {
    feed_price_per_kg: null as number | null,
    chick_price: null as number | null,
    selling_price_per_kg: null as number | null,
    egg_price: null as number | null,
    eggs_per_bird_cycle: null as number | null,
    mortality_percent: null as number | null,
    medicine_cost_per_bird: null as number | null,
    labor_cost_per_bird: null as number | null,
    utilities_cost_per_bird: null as number | null,
  };

  calculateProfitability(): void {
    const r = this.result();
    if (!r || !this.profitForm.feed_price_per_kg || !this.profitForm.chick_price) return;

    this.profitLoading.set(true);
    this.profitResult.set(null);

    const body: any = {
      bird_count: this.form.bird_count,
      poultry_type: this.form.poultry_type,
      feed_price_per_kg: this.profitForm.feed_price_per_kg,
      chick_price: this.profitForm.chick_price,
      // 🎯 بناخد إجمالي العلف ومدة الدورة من نتيجة حاسبة المعدات نفسها
      // عشان الأرقام تفضل متسقة بدل ما تتحسب مرتين بطريقتين مختلفتين
      total_feed_kg: r.feed?.total_cycle_kg,
      cycle_days: r.input?.target_age_days_used,
      avg_weight_kg: this.form.avg_weight_kg,
    };

    if (this.profitForm.mortality_percent !== null) body.mortality_percent = this.profitForm.mortality_percent;
    // مصاريف مفصّلة (أدق) لو اتحطت، وإلا الباك اند هيرجع للنسبة الثابتة تلقائياً
    if (this.profitForm.medicine_cost_per_bird !== null) body.medicine_cost_per_bird = this.profitForm.medicine_cost_per_bird;
    if (this.profitForm.labor_cost_per_bird !== null) body.labor_cost_per_bird = this.profitForm.labor_cost_per_bird;
    if (this.profitForm.utilities_cost_per_bird !== null) body.utilities_cost_per_bird = this.profitForm.utilities_cost_per_bird;

    if (this.form.poultry_type === 'layer') {
      body.egg_price = this.profitForm.egg_price;
      if (this.profitForm.eggs_per_bird_cycle !== null) body.eggs_per_bird_cycle = this.profitForm.eggs_per_bird_cycle;
    } else {
      body.selling_price_per_kg = this.profitForm.selling_price_per_kg;
    }

    this.http.post(`${environment.apiUrl}/calculator/profitability`, body).subscribe({
      next: (res: any) => {
        this.profitResult.set(res);
        this.profitLoading.set(false);
      },
      error: () => this.profitLoading.set(false)
    });
  }

  ngOnInit(): void {
    // نجيب خيارات نظام التربية الصالحة لكل نوع طائر (بيُستخدم في فلترة الليستة)
    this.http.get<any>(`${environment.apiUrl}/calculator/housing-options`).subscribe({
      next: (data) => {
        this.housingOptionsMap.set(data);
        this.onPoultryTypeChange(); // تأكيد إن نظام التربية الحالي صالح للنوع الافتراضي
      },
      error: (err) => console.error('فشل تحميل خيارات نظام التربية:', err)
    });

    this.loadPrices();
  }

  loadPrices(): void {
    this.http.get<any>(`${environment.apiUrl}/calculator/prices`).subscribe({
      next: (data) => {
        this.pricesData.set(data);
        this.excludedCategories.set(data.excluded_categories || []);
        // نجهّز نسخة قابلة للتعديل من كل الأسعار الحالية عشان تتربط بالفورم
        const edits: Record<string, number> = {};
        for (const key of Object.keys(data.items || {})) {
          edits[key] = data.items[key].price;
        }
        this.priceEdits = edits;
        this.applyStoredProfitPrices();
      },
      error: (err) => console.error('فشل تحميل الأسعار:', err)
    });
  }

  // بيملأ سعر الكتكوت وسعر العلف في حاسبة الجدوى الاقتصادية تلقائياً من
  // أسعار المستخدم المحفوظة لنفس نوع الطائر المختار حالياً (بيتنادى عند
  // تحميل الأسعار وعند تغيير نوع الطائر بس - مش هيلمس أي قيمة المستخدم
  // كتبها بنفسه يدوي في نفس الجلسة من غير ما يغيّر النوع)
  private applyStoredProfitPrices(): void {
    const items = this.priceItems();
    const chick = items[`chick_price_${this.form.poultry_type}`];
    const feed = items[`feed_${this.form.poultry_type}_kg`];
    if (chick) this.profitForm.chick_price = chick.price;
    if (feed) this.profitForm.feed_price_per_kg = feed.price;
    if (items['medicine_per_bird']) this.profitForm.medicine_cost_per_bird = items['medicine_per_bird'].price;
    if (items['labor_per_bird']) this.profitForm.labor_cost_per_bird = items['labor_per_bird'].price;
    if (items['utilities_per_bird']) this.profitForm.utilities_cost_per_bird = items['utilities_per_bird'].price;
  }

  onPoultryTypeChange(): void {
    // لو نظام التربية الحالي مش صالح للنوع الجديد، اختار أول نظام صالح تلقائياً بدل تركيبة غلط
    const list = this.currentHousingList();
    if (list.length && !list.find((h: any) => h.value === this.form.housing_system)) {
      this.form.housing_system = list[0].value;
    }
    // تحديث متوسط الوزن التقريبي المناسب للنوع الجديد (المستخدم لسه يقدر يعدله بعد كده)
    const suggestedWeight = this.weightDefaults[this.form.poultry_type];
    if (suggestedWeight) {
      this.form.avg_weight_kg = Number(suggestedWeight);
    }
    // مسح مدة الدورة اللي دخلها المستخدم لنوع سابق، عشان ميفضلش رقم غلط
    // (مثلاً 35 يوم متبقية من التسمين وهو دلوقتي مختار بياض)
    this.form.target_age_days = null;
    // سعر الكتكوت والعلف يختلفوا تمامًا حسب النوع، فبنجيب القيم المحفوظة للنوع الجديد
    this.applyStoredProfitPrices();
  }

  savePrices(): void {
    this.savingPrices.set(true);
    this.pricesSavedMsg.set('');
    this.pricesSaveError.set(false);
    this.http.post<any>(`${environment.apiUrl}/calculator/prices`, { updates: this.priceEdits }).subscribe({
      next: (data) => {
        this.pricesData.set(data);
        this.savingPrices.set(false);
        this.pricesSavedMsg.set('✅ اتحفظت أسعارك بنجاح');
        this.priceHistory.set([]); // نخلي السجل يتحمّل من جديد لو المستخدم فتحه تاني
        setTimeout(() => this.pricesSavedMsg.set(''), 3000);
      },
      error: (err) => {
        this.savingPrices.set(false);
        this.pricesSaveError.set(true);
        this.pricesSavedMsg.set(
          err?.status === 401
            ? '🔒 سجّل دخول الأول عشان تقدر تحفظ أسعارك الشخصية'
            : '❌ حصل خطأ أثناء الحفظ، حاول تاني'
        );
      }
    });
  }

  // زي savePrices() بالظبط، لكن بعد الحفظ بيعيد حساب النتيجة فورًا عشان تشوف
  // تأثير تعديل سعر الأداة على الإجمالي على طول من غير ما تضغط "احسب" تاني
  saveEquipmentPrices(): void {
    this.savingPrices.set(true);
    this.pricesSavedMsg.set('');
    this.pricesSaveError.set(false);
    this.http.post<any>(`${environment.apiUrl}/calculator/prices`, { updates: this.priceEdits }).subscribe({
      next: (data) => {
        this.pricesData.set(data);
        this.savingPrices.set(false);
        this.pricesSavedMsg.set('✅ اتحفظت الأسعار وتحدّث الإجمالي');
        this.priceHistory.set([]);
        setTimeout(() => this.pricesSavedMsg.set(''), 3000);
        if (this.result()) this.calculate();
      },
      error: (err) => {
        this.savingPrices.set(false);
        this.pricesSaveError.set(true);
        this.pricesSavedMsg.set(
          err?.status === 401
            ? '🔒 سجّل دخول الأول عشان تقدر تحفظ أسعارك الشخصية'
            : '❌ حصل خطأ أثناء الحفظ، حاول تاني'
        );
      }
    });
  }

  resetPrice(key: string): void {
    this.http.post<any>(`${environment.apiUrl}/calculator/prices/reset`, { keys: [key] }).subscribe({
      next: (data) => {
        this.pricesData.set(data);
        this.priceEdits[key] = data.items[key]?.price;
        this.priceHistory.set([]);
      },
      error: () => {
        this.pricesSaveError.set(true);
        this.pricesSavedMsg.set('❌ حصل خطأ أثناء الرجوع للسعر الافتراضي');
      }
    });
  }

  calculate() {
    if (!this.form.bird_count) return;
    this.loading.set(true);
    this.result.set(null);
    this.profitResult.set(null);

    this.http.post(`${environment.apiUrl}/calculator/calculate`, this.form).subscribe({
      next: (res: any) => {
        this.result.set(res);
        this.loading.set(false);
        setTimeout(() => {
          document.querySelector('.space-y-4')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      },
      error: () => this.loading.set(false)
    });
  }
}
