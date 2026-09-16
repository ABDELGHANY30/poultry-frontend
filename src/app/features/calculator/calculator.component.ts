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
    <div class="rounded-3xl text-white px-6 py-6 mb-4"
         style="background:linear-gradient(135deg,#0f2d1a 0%,#1d6b3f 55%,#2d9e5f 100%)">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-black">🏗️ حاسبة المزرعة</h1>
          <p class="text-white/70 text-[13px] mt-1">احسب المساحة والمعدات والتكلفة بدقة</p>
        </div>
        <button (click)="showPriceManager.set(!showPriceManager())"
                class="bg-white/15 hover:bg-white/25 rounded-xl px-3 py-2 text-xs font-bold whitespace-nowrap">
          💰 الأسعار
        </button>
      </div>
    </div>

    <!-- إدارة الأسعار (اختياري - يظهر عند الضغط على زرار أسعار) -->
    <div *ngIf="showPriceManager()" class="card space-y-3 mb-4">
      <div class="flex items-center justify-between">
        <h3 class="font-bold text-gray-800">💰 أسعار المعدات والعلف</h3>
        <span class="text-[10px] text-gray-400">
          {{ pricesLastUpdated() ? ('آخر تحديث: ' + pricesLastUpdated()) : 'لسه متحدثتش' }}
        </span>
      </div>
      <p class="text-xs text-gray-400">
        حدّث الأسعار اللي اتغيرت بس، والباقي هيفضل على آخر قيمة مسجّلة تلقائياً
      </p>
      <div class="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
        <div *ngFor="let key of priceKeys()" class="bg-gray-50 rounded-xl p-2">
          <p class="text-[11px] text-gray-500 mb-1">{{ priceItems()[key]?.label }}</p>
          <div class="flex items-center gap-1">
            <input type="number" [(ngModel)]="priceEdits[key]" class="form-input text-sm py-1 px-2"/>
            <span class="text-[10px] text-gray-400 whitespace-nowrap">{{ priceItems()[key]?.unit }}</span>
          </div>
        </div>
      </div>
      <button (click)="savePrices()" [disabled]="savingPrices()"
              class="btn-primary btn w-full text-sm py-2">
        <span *ngIf="!savingPrices()">💾 حفظ الأسعار</span>
        <span *ngIf="savingPrices()">جاري الحفظ...</span>
      </button>
      <p *ngIf="pricesSavedMsg()" class="text-xs text-green-600 text-center">{{ pricesSavedMsg() }}</p>
    </div>

    <!-- Form -->
    <div class="card space-y-4 mb-4">

      <!-- مجموعة 1: بيانات القطيع الأساسية -->
      <div class="flex items-center gap-2 pb-1">
        <span class="w-6 h-6 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center text-xs font-black">١</span>
        <p class="text-sm font-bold text-gray-700">بيانات القطيع</p>
      </div>

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

      <div class="grid grid-cols-2 gap-3">
        <!-- نظام التربية (بيتفلتر حسب نوع الطير المختار) -->
        <div>
          <label class="form-label">🏠 نظام التربية</label>
          <select [(ngModel)]="form.housing_system" class="form-input">
            <option *ngFor="let h of currentHousingList()" [value]="h.value">{{ h.label }}</option>
          </select>
        </div>

        <!-- عدد الطيور -->
        <div>
          <label class="form-label">🔢 العدد</label>
          <input [(ngModel)]="form.bird_count" type="number" class="form-input" placeholder="5000"/>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <!-- الموسم -->
        <div>
          <label class="form-label">🌡️ الموسم</label>
          <select [(ngModel)]="form.season" class="form-input">
            <option value="summer">صيف</option>
            <option value="winter">شتاء</option>
            <option value="moderate">معتدل</option>
          </select>
        </div>

        <!-- المنطقة -->
        <div>
          <label class="form-label">📍 المنطقة</label>
          <select [(ngModel)]="form.egypt_location" class="form-input">
            <option value="delta">الدلتا / السواحل</option>
            <option value="upper">الصعيد</option>
            <option value="coastal">الساحل الشمالي</option>
          </select>
        </div>
      </div>

      <!-- مجموعة 2: تفاصيل إضافية اختيارية -->
      <div class="flex items-center gap-2 pt-3 pb-1 border-t border-gray-100">
        <span class="w-6 h-6 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-black">٢</span>
        <p class="text-sm font-bold text-gray-700">تفاصيل إضافية</p>
        <span class="text-[11px] text-gray-400">(اختياري - لدقة أعلى)</span>
      </div>

      <div class="grid grid-cols-3 gap-3">
        <div>
          <label class="form-label text-xs">الطول (م)</label>
          <input [(ngModel)]="form.house_length" type="number" class="form-input" placeholder="120"/>
        </div>
        <div>
          <label class="form-label text-xs">العرض (م)</label>
          <input [(ngModel)]="form.house_width" type="number" class="form-input" placeholder="12"/>
        </div>
        <div>
          <label class="form-label text-xs">الارتفاع (م)</label>
          <input [(ngModel)]="form.house_height" type="number" class="form-input" placeholder="2.5"/>
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
          <p class="text-[10px] text-gray-400 mt-1">سيبها فاضية للقيمة المعتادة تلقائياً</p>
        </div>
      </div>

      <button (click)="calculate()"
              [disabled]="loading() || !form.bird_count"
              class="btn-primary btn w-full text-base py-3 mt-1">
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

      <!-- الأرقام الأساسية - أول حاجة المستخدم يشوفها -->
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-white rounded-2xl border border-gray-100 p-4">
          <div class="flex items-center gap-2 mb-2">
            <span class="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center text-sm">📐</span>
            <span class="text-[11px] text-gray-400 font-semibold">المساحة المطلوبة</span>
          </div>
          <p class="text-2xl font-black text-gray-800">{{ result().area?.required_m2 }}<span class="text-sm font-bold text-gray-400"> م²</span></p>
          <p class="text-[11px] text-gray-400 mt-0.5">{{ result().area?.birds_per_m2 }} طير/م²</p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 p-4">
          <div class="flex items-center gap-2 mb-2">
            <span class="w-7 h-7 rounded-full bg-sky-50 flex items-center justify-center text-sm">💨</span>
            <span class="text-[11px] text-gray-400 font-semibold">التهوية</span>
          </div>
          <p class="text-2xl font-black text-gray-800">{{ result().ventilation?.fans_count }}<span class="text-sm font-bold text-gray-400"> شفاطة</span></p>
          <p class="text-[11px] text-gray-400 mt-0.5">{{ result().ventilation?.fan_specs }}</p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 p-4">
          <div class="flex items-center gap-2 mb-2">
            <span class="w-7 h-7 rounded-full bg-cyan-50 flex items-center justify-center text-sm">💧</span>
            <span class="text-[11px] text-gray-400 font-semibold">المياه اليومية</span>
          </div>
          <p class="text-2xl font-black text-gray-800">{{ result().water?.daily_liters }}<span class="text-sm font-bold text-gray-400"> لتر</span></p>
          <p class="text-[11px] text-gray-400 mt-0.5">{{ result().water?.nipple_drinkers }} نيبل</p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 p-4">
          <div class="flex items-center gap-2 mb-2">
            <span class="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center text-sm">🌾</span>
            <span class="text-[11px] text-gray-400 font-semibold">العلف اليومي</span>
          </div>
          <p class="text-2xl font-black text-gray-800">{{ result().feed?.daily_kg }}<span class="text-sm font-bold text-gray-400"> كجم</span></p>
          <p class="text-[11px] text-gray-400 mt-0.5">{{ result().feed?.total_cycle_kg }} كجم/دورة</p>
        </div>
      </div>

      <!-- التكلفة التقديرية -->
      <div class="card" *ngIf="result().costs">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-bold text-gray-800">💰 التكلفة التقديرية</h3>
          <span class="text-[10px] text-gray-400">بأسعار اليوم المسجّلة</span>
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
            <div class="flex justify-between text-xs">
              <span class="text-gray-400">شفاطات</span>
              <span class="text-gray-600">{{ result().costs?.breakdown?.fans | number }} ج</span>
            </div>
            <div class="flex justify-between text-xs" *ngIf="result().costs?.breakdown?.cooling > 0">
              <span class="text-gray-400">تبريد</span>
              <span class="text-gray-600">{{ result().costs?.breakdown?.cooling | number }} ج</span>
            </div>
            <div class="flex justify-between text-xs" *ngIf="result().costs?.breakdown?.heating > 0">
              <span class="text-gray-400">تدفئة</span>
              <span class="text-gray-600">{{ result().costs?.breakdown?.heating | number }} ج</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-gray-400">معدات مياه</span>
              <span class="text-gray-600">{{ result().costs?.breakdown?.water_equipment | number }} ج</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-gray-400">معالف</span>
              <span class="text-gray-600">{{ result().costs?.breakdown?.feed_equipment | number }} ج</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-gray-400">إضاءة</span>
              <span class="text-gray-600">{{ result().costs?.breakdown?.lighting | number }} ج</span>
            </div>
            <div class="flex justify-between text-xs" *ngIf="result().costs?.breakdown?.litter > 0">
              <span class="text-gray-400">فرشة</span>
              <span class="text-gray-600">{{ result().costs?.breakdown?.litter | number }} ج</span>
            </div>
          </div>
        </div>
        <p class="text-[10px] text-gray-400 mt-3">{{ result().costs?.note }}</p>
      </div>

      <!-- التفاصيل الفنية الكاملة - مطوية افتراضيًا، تتفتح عند الضغط -->
      <div>
        <p class="text-xs font-bold text-gray-400 px-1 mb-2">📋 التفاصيل الفنية الكاملة</p>
        <div class="space-y-2">

          <!-- التهوية -->
          <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <button (click)="toggleSection('ventilation')" class="w-full flex items-center justify-between px-4 py-3">
              <div class="flex items-center gap-2.5">
                <span class="w-8 h-8 rounded-full bg-sky-50 flex items-center justify-center text-sm">💨</span>
                <span class="font-bold text-gray-800 text-sm">التهوية</span>
              </div>
              <span class="text-gray-300 text-xs transition-transform" [class.rotate-180]="isOpen('ventilation')">▼</span>
            </button>
            <div *ngIf="isOpen('ventilation')" class="px-4 pb-4 pt-1 space-y-2 text-sm border-t border-gray-50">
              <div class="flex justify-between">
                <span class="text-gray-500">تدفق الهواء المطلوب</span>
                <span class="font-bold">{{ result().ventilation?.airflow_m3_per_hour | number }} م³/ساعة</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">عدد الشفاطات</span>
                <span class="font-bold text-sky-600">{{ result().ventilation?.fans_count }} شفاطة</span>
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
          <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden"
               *ngIf="result().cooling?.pads_length_m > 0 || result().cooling?.evaporative_coolers > 0">
            <button (click)="toggleSection('cooling')" class="w-full flex items-center justify-between px-4 py-3">
              <div class="flex items-center gap-2.5">
                <span class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-sm">❄️</span>
                <span class="font-bold text-gray-800 text-sm">التبريد</span>
              </div>
              <span class="text-gray-300 text-xs transition-transform" [class.rotate-180]="isOpen('cooling')">▼</span>
            </button>
            <div *ngIf="isOpen('cooling')" class="px-4 pb-4 pt-1 space-y-2 text-sm border-t border-gray-50">
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
          <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden" *ngIf="result().heating?.heaters_count > 0">
            <button (click)="toggleSection('heating')" class="w-full flex items-center justify-between px-4 py-3">
              <div class="flex items-center gap-2.5">
                <span class="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-sm">🔥</span>
                <span class="font-bold text-gray-800 text-sm">التدفئة</span>
              </div>
              <span class="text-gray-300 text-xs transition-transform" [class.rotate-180]="isOpen('heating')">▼</span>
            </button>
            <div *ngIf="isOpen('heating')" class="px-4 pb-4 pt-1 space-y-2 text-sm border-t border-gray-50">
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
          <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <button (click)="toggleSection('water')" class="w-full flex items-center justify-between px-4 py-3">
              <div class="flex items-center gap-2.5">
                <span class="w-8 h-8 rounded-full bg-cyan-50 flex items-center justify-center text-sm">💧</span>
                <span class="font-bold text-gray-800 text-sm">المياه</span>
              </div>
              <span class="text-gray-300 text-xs transition-transform" [class.rotate-180]="isOpen('water')">▼</span>
            </button>
            <div *ngIf="isOpen('water')" class="px-4 pb-4 pt-1 space-y-2 text-sm border-t border-gray-50">
              <div class="flex justify-between">
                <span class="text-gray-500">استهلاك يومي</span>
                <span class="font-bold text-cyan-600">{{ result().water?.daily_liters }} لتر</span>
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
          <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <button (click)="toggleSection('feed')" class="w-full flex items-center justify-between px-4 py-3">
              <div class="flex items-center gap-2.5">
                <span class="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-sm">🌾</span>
                <span class="font-bold text-gray-800 text-sm">العلف</span>
              </div>
              <span class="text-gray-300 text-xs transition-transform" [class.rotate-180]="isOpen('feed')">▼</span>
            </button>
            <div *ngIf="isOpen('feed')" class="px-4 pb-4 pt-1 space-y-2 text-sm border-t border-gray-50">
              <div class="flex justify-between">
                <span class="text-gray-500">استهلاك يومي</span>
                <span class="font-bold text-amber-600">{{ result().feed?.daily_kg }} كجم</span>
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
          <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <button (click)="toggleSection('lighting')" class="w-full flex items-center justify-between px-4 py-3">
              <div class="flex items-center gap-2.5">
                <span class="w-8 h-8 rounded-full bg-violet-50 flex items-center justify-center text-sm">💡</span>
                <span class="font-bold text-gray-800 text-sm">الإضاءة</span>
              </div>
              <span class="text-gray-300 text-xs transition-transform" [class.rotate-180]="isOpen('lighting')">▼</span>
            </button>
            <div *ngIf="isOpen('lighting')" class="px-4 pb-4 pt-1 space-y-2 text-sm border-t border-gray-50">
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
          <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden" *ngIf="result().litter?.depth_cm > 0">
            <button (click)="toggleSection('litter')" class="w-full flex items-center justify-between px-4 py-3">
              <div class="flex items-center gap-2.5">
                <span class="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-sm">🪵</span>
                <span class="font-bold text-gray-800 text-sm">الفرشة</span>
              </div>
              <span class="text-gray-300 text-xs transition-transform" [class.rotate-180]="isOpen('litter')">▼</span>
            </button>
            <div *ngIf="isOpen('litter')" class="px-4 pb-4 pt-1 space-y-2 text-sm border-t border-gray-50">
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
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-bold text-gray-800">💰 الجدوى الاقتصادية المتوقعة</h3>
          <button (click)="saveProfitPrices()" [disabled]="savingProfitPrices()"
                  class="text-xs font-bold text-green-700 bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100 transition">
            {{ savingProfitPrices() ? 'جاري الحفظ...' : '✏️ احفظ كأسعار افتراضية' }}
          </button>
        </div>
        <p class="text-xs text-gray-400 mb-1">دخّل الأسعار الفعلية عندك عشان تحصل على تقدير للربح المتوقع للدورة</p>
        <p *ngIf="profitPricesLoaded()" class="text-xs text-blue-600 font-semibold mb-1">
          🕒 الحقول متعبية بآخر أسعار حفظتها - عدّل فيها مباشرة وادوس "احفظ" تاني
        </p>
        <p *ngIf="profitPricesSavedMsg()" class="text-xs text-green-600 font-semibold mb-3">{{ profitPricesSavedMsg() }}</p>

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
          <div>
            <label class="form-label">🧾 مصاريف أخرى % من العلف (اختياري)</label>
            <input [(ngModel)]="profitForm.other_costs_percent" type="number" step="1" class="form-input" placeholder="20"/>
          </div>
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
              <p class="text-[10px] text-gray-400 mt-1">هامش الربح</p>
            </div>
            <div class="bg-gray-50 rounded-xl p-3">
              <p class="text-lg font-black text-gray-700">{{ profitResult().profit_per_bird }}</p>
              <p class="text-[10px] text-gray-400 mt-1">ربح/طير (جنيه)</p>
            </div>
            <div class="bg-gray-50 rounded-xl p-3">
              <p class="text-lg font-black text-gray-700">{{ profitResult().roi_percent }}%</p>
              <p class="text-[10px] text-gray-400 mt-1">العائد على الاستثمار</p>
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
            <div class="flex justify-between">
              <span class="text-gray-500">مصاريف أخرى</span>
              <span class="font-bold">{{ profitResult().costs?.other_costs | number }} جنيه</span>
            </div>
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

  // ── طي/فتح أقسام التفاصيل الفنية (accordion) ────────────
  private openSections = signal<Set<string>>(new Set());
  toggleSection(key: string): void {
    const s = new Set(this.openSections());
    s.has(key) ? s.delete(key) : s.add(key);
    this.openSections.set(s);
  }
  isOpen = (key: string) => this.openSections().has(key);

  // ── نظام التربية الديناميكي حسب نوع الطائر ──────────────
  private housingOptionsMap = signal<Record<string, any>>({});
  // ⚠️ لازم دالة عادية مش computed()! لأن computed() بيتابع بس قراءات
  // الـ signals، و form.poultry_type ده property عادي في object عادي،
  // فـ computed() كان بيتجمد على أول قيمة (broiler) ومايتحدثش تاني
  // لما المستخدم يغيّر النوع من الـ dropdown.
  currentHousingList = () =>
    this.housingOptionsMap()[this.form.poultry_type]?.housing_systems || [];

  // ── إدارة الأسعار ────────────────────────────────────────
  showPriceManager = signal(false);
  private pricesData = signal<any>({ items: {}, last_updated: null });
  priceItems = computed(() => this.pricesData().items || {});
  priceKeys = computed(() => Object.keys(this.priceItems()));
  pricesLastUpdated = computed(() => {
    const d = this.pricesData().last_updated;
    if (!d) return null;
    return new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
  });
  priceEdits: Record<string, number> = {};
  savingPrices = signal(false);
  pricesSavedMsg = signal('');

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
  savingProfitPrices = signal(false);
  profitPricesSavedMsg = signal('');
  profitPricesLoaded = signal(false);

  profitForm = {
    feed_price_per_kg: null as number | null,
    chick_price: null as number | null,
    selling_price_per_kg: null as number | null,
    egg_price: null as number | null,
    eggs_per_bird_cycle: null as number | null,
    mortality_percent: null as number | null,
    other_costs_percent: null as number | null,
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
    if (this.profitForm.other_costs_percent !== null) body.other_costs_percent = this.profitForm.other_costs_percent;

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
        // نجهّز نسخة قابلة للتعديل من كل الأسعار الحالية عشان تتربط بالفورم
        const edits: Record<string, number> = {};
        for (const key of Object.keys(data.items || {})) {
          edits[key] = data.items[key].price;
        }
        this.priceEdits = edits;

        // 🎯 لو فيه أسعار جدوى اقتصادية محفوظة من قبل، نعبّي بيها profitForm تلقائيًا
        const items = data.items || {};
        let loadedAny = false;
        if (items['feed_price_per_kg']?.price != null) { this.profitForm.feed_price_per_kg = items['feed_price_per_kg'].price; loadedAny = true; }
        if (items['chick_price']?.price != null) { this.profitForm.chick_price = items['chick_price'].price; loadedAny = true; }
        if (items['selling_price_per_kg']?.price != null) { this.profitForm.selling_price_per_kg = items['selling_price_per_kg'].price; loadedAny = true; }
        if (items['egg_price']?.price != null) { this.profitForm.egg_price = items['egg_price'].price; loadedAny = true; }
        this.profitPricesLoaded.set(loadedAny);
      },
      error: (err) => console.error('فشل تحميل الأسعار:', err)
    });
  }

  saveProfitPrices(): void {
    // بنحفظ بس القيم اللي المستخدم دخّلها فعلاً
    const updates: Record<string, number> = {};
    if (this.profitForm.feed_price_per_kg !== null) updates['feed_price_per_kg'] = this.profitForm.feed_price_per_kg;
    if (this.profitForm.chick_price !== null) updates['chick_price'] = this.profitForm.chick_price;
    if (this.profitForm.selling_price_per_kg !== null) updates['selling_price_per_kg'] = this.profitForm.selling_price_per_kg;
    if (this.profitForm.egg_price !== null) updates['egg_price'] = this.profitForm.egg_price;

    if (Object.keys(updates).length === 0) {
      this.profitPricesSavedMsg.set('⚠️ دخّل سعر واحد على الأقل الأول');
      setTimeout(() => this.profitPricesSavedMsg.set(''), 3000);
      return;
    }

    this.savingProfitPrices.set(true);
    this.http.post<any>(`${environment.apiUrl}/calculator/prices`, { updates }).subscribe({
      next: () => {
        this.savingProfitPrices.set(false);
        this.profitPricesLoaded.set(true);
        this.profitPricesSavedMsg.set('✅ اتحفظت وهتلاقيها جاهزة المرة الجاية');
        setTimeout(() => this.profitPricesSavedMsg.set(''), 3000);
      },
      error: () => {
        this.savingProfitPrices.set(false);
        this.profitPricesSavedMsg.set('❌ حصل خطأ أثناء الحفظ');
      }
    });
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
  }

  savePrices(): void {
    this.savingPrices.set(true);
    this.pricesSavedMsg.set('');
    this.http.post<any>(`${environment.apiUrl}/calculator/prices`, { updates: this.priceEdits }).subscribe({
      next: (data) => {
        this.pricesData.set(data);
        this.savingPrices.set(false);
        this.pricesSavedMsg.set('✅ اتحفظت الأسعار بنجاح');
        setTimeout(() => this.pricesSavedMsg.set(''), 3000);
      },
      error: () => {
        this.savingPrices.set(false);
        this.pricesSavedMsg.set('❌ حصل خطأ أثناء الحفظ، حاول تاني');
      }
    });
  }

  calculate() {
    if (!this.form.bird_count) return;
    this.loading.set(true);
    this.result.set(null);
    this.profitResult.set(null);
    this.openSections.set(new Set());

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
