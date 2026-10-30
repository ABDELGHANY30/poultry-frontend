import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { FlockService } from '../../core/services/flock.service';
import { AuthService } from '../../core/services/auth.service';
import { UserOfflineCacheService } from '../../core/services/user-offline-cache.service';
import { Flock, FlockAnalytics } from '../../core/models';
import { environment } from '../../../environments/environment';
// ⚠️ الملفات دي حطها في src/app/shared/widgets/ (أو عدّل المسار حسب مكان ما تحطها فعلاً)
import { HealthScoreWidgetComponent } from '../../features/Healthscorewidget/Health score widget.component';
import { ProfitIndicatorWidgetComponent } from '../../features/profit indicator widget/profit indicator widget.component';
import { ForecastWidgetComponent } from '../../features/Forecast/Forecast.component';
import { DecisionSimulatorComponent } from '../../features/desicion/desicion.component';
import { SupplierSurveyComponent } from '../../features/supplierSurvey/SupplierSurvey';
// ⚠️ عدّل المسار حسب مكان الملف عندك فعليًا، وتأكد إن referral.service.ts
// و@capacitor/share و@capacitor/clipboard متثبتين (npm install) — شوف
// التعليق في أول referral-card.component.ts نفسه لتفاصيل التركيب
import { ReferralCardComponent } from '../../features/referral_card.component.ts/referral-card.component';

const BROILER_VACC = [
  { day: 1,  nameEn: 'Hatchery: Marek + ND + IB', nameAr: 'المعمل: ماريك + نيوكاسل + IB', method: 'Spray/Inj' },
  { day: 4,  nameEn: 'Coccidiosis Vaccine',       nameAr: 'لقاح الكوكسيديا (بالعلف أو الماء)', method: 'Water/Spray' },
  { day: 7,  nameEn: 'Newcastle (Clone) + IB H120',nameAr: 'نيوكاسل + IB (الحية الأولى)',     method: 'Eye drop' },
  { day: 10, nameEn: 'Avian Influenza (H5+H9) Killed', nameAr: 'أنفلونزا الطيور المثبط (حقن)',  method: 'Injection' },
  { day: 14, nameEn: 'Gumboro (IBD Intermediate)',nameAr: 'غامبورو (الجرعة الأولى)',       method: 'Water' },
  { day: 18, nameEn: 'Newcastle Booster (LaSota)',nameAr: 'معزز نيوكاسل (لاسوتا الأولى)',    method: 'Water' },
  { day: 24, nameEn: 'Gumboro Booster (IBD)',     nameAr: 'معزز غامبورو (الجرعة الثانية)',    method: 'Water' },
  { day: 28, nameEn: 'Newcastle + IB Booster',    nameAr: 'معزز نيوكاسل + IB (لاسوتا الثانية)', method: 'Water' },
  { day: 35, nameEn: 'Inactivated ND (Optional)', nameAr: 'نيوكاسل زيتي ميت (حسب الوبائية)',  method: 'Injection' }
];
const DUCK_VACC = [
  { day: 1,  nameEn: 'Duck Viral Hepatitis',              nameAr: 'التهاب الكبد الفيروسي للبط',           method: 'Injection' },
  { day: 7,  nameEn: 'Duck Plague (Optional)',            nameAr: 'طاعون البط (حسب المنطقة)',             method: 'Injection' },
  { day: 10, nameEn: 'Avian Influenza (H5/H9)',           nameAr: 'أنفلونزا الطيور (H5/H9)',              method: 'Injection' },
  { day: 14, nameEn: 'Duck Cholera (Optional)',           nameAr: 'كوليرا البط (حسب الوبائية)',           method: 'Injection' },
  { day: 21, nameEn: 'Duck Plague Booster (Optional)',    nameAr: 'معزز طاعون البط',                      method: 'Injection' },
  { day: 35, nameEn: 'Duck Cholera Booster (Optional)',   nameAr: 'معزز كوليرا البط',                     method: 'Injection' }
];
const QUAIL_VACC = [
  { day: 7,  nameEn: 'Newcastle (B1)',                  nameAr: 'نيوكاسل (B1)',                      method: 'Eye drop' },
  { day: 10, nameEn: 'Avian Influenza (H5/H9)',         nameAr: 'أنفلونزا الطيور (H5/H9)',          method: 'Injection' },
  { day: 14, nameEn: 'Newcastle Booster (LaSota)',      nameAr: 'معزز نيوكاسل (لاسوتا)',             method: 'Water' },
  { day: 21, nameEn: 'Fowl Pox (Optional)',             nameAr: 'جدري الطيور (حسب المنطقة)',         method: 'Wing web' },
  { day: 28, nameEn: 'Newcastle Booster',               nameAr: 'معزز نيوكاسل الثاني',               method: 'Water' }
];

const LAYER_VACC = [
  { day: 1,   nameEn: 'Hatchery: Marek + ND + IB',nameAr: 'المعمل: ماريك + نيوكاسل + IB', method: 'Spray/Inj' },
  { day: 4,   nameEn: 'Coccidiosis Vaccine',       nameAr: 'لقاح الكوكسيديا',              method: 'Water' },
  { day: 7,   nameEn: 'Newcastle + IB H120',       nameAr: 'نيوكاسل + IB الأولى',          method: 'Eye drop' },
  { day: 12,  nameEn: 'Avian Influenza (H5+H9)',   nameAr: 'حقن أنفلونزا الطيور الميت',     method: 'Injection' },
  { day: 15,  nameEn: 'Gumboro (IBD)',            nameAr: 'غامبورو الأولى',              method: 'Water' },
  { day: 21,  nameEn: 'ND Booster (LaSota)',      nameAr: 'معزز نيوكاسل لاسوتا الأولى',    method: 'Water' },
  { day: 25,  nameEn: 'Gumboro Booster',          nameAr: 'معزز غامبورو الثاني',           method: 'Water' },
  { day: 30,  nameEn: 'Avian Rhinotracheitis (TRT)',nameAr: 'التهاب الرغامي والرئة (النكاف)', method: 'Spray' },
  { day: 35,  nameEn: 'Salmonella (1st dose)',    nameAr: 'السالمونيلا (الجرعة الأولى)',    method: 'Injection' },
  { day: 42,  nameEn: 'Fowl Pox + AE (Wing Web)', nameAr: 'جدري الطيور + التهاب الدماغ',   method: 'Wing web' },
  { day: 49,  nameEn: 'ND + IB Booster',          nameAr: 'معزز نيوكاسل + IB',           method: 'Water' },
  { day: 56,  nameEn: 'Inactivated ND + IB + H9', nameAr: 'ثلاثي ميت (نيوكاسل+IB+أنفلونزا)', method: 'Injection' },
  { day: 70,  nameEn: 'Coryza (1st dose)',        nameAr: 'الكوريزا (الجرعة الأولى)',       method: 'Injection' },
  { day: 77,  nameEn: 'Salmonella Booster',       nameAr: 'معزز السالمونيلا الثاني',        method: 'Injection' },
  { day: 84,  nameEn: 'Coryza Booster',           nameAr: 'معزز الكوريزا الثاني',          method: 'Injection' },
  { day: 91,  nameEn: 'ILT (Infectious Laryngo)', nameAr: 'التهاب الحنجرة والقصبة المعدي',  method: 'Eye drop' },
  { day: 105, nameEn: 'TRT Booster (Killed)',     nameAr: 'معزز النكاف الميت (حقن)',       method: 'Injection' },
  { day: 112, nameEn: 'EDS + ND + IB Pre-Lay',    nameAr: 'انخفاض البيض + نيوكاسل + IB ميت', method: 'Injection' },
  { day: 126, nameEn: 'Live ND Booster (LaSota)', nameAr: 'تنشيط نيوكاسل حي قبل الإنتاج',  method: 'Water' },
  { day: 150, nameEn: 'In-Production ND (Every 6w)',nameAr: 'تنشيط نيوكاسل دوري (كل 6 أسابيع)', method: 'Water' }
];

// 🐇 تحصينات الأرانب الاسترشادية المتوقعة
const RABBIT_VACC = [
  { day: 28, nameEn: 'Rabbit Hemorrhagic Disease (RHDV1+2)', nameAr: 'التسمم الدموي الفيروسي (الجرعة الأولى)', method: 'Subcutaneous' },
  { day: 42, nameEn: 'Pasteurellosis (Leptofend)', nameAr: 'التسمم الدموي البكتيري', method: 'Subcutaneous' },
  { day: 60, nameEn: 'RHDV Booster', nameAr: 'تنشيطي التسمم الدموي الفيروسي', method: 'Subcutaneous' }
];

// 🦃 تحصينات الرومي الاسترشادية المتوقعة
const TURKEY_VACC = [
  { day: 1,  nameEn: 'Hatchery: ND + IB + TRT', nameAr: 'المعمل: نيوكاسل + IB + التهاب الأنف', method: 'Spray' },
  { day: 7,  nameEn: 'Newcastle + IB H120', nameAr: 'نيوكاسل ورومي IB أولى', method: 'Eye drop' },
  { day: 14, nameEn: 'Hemorrhagic Enteritis (HE)', nameAr: 'التهاب الأمعاء النزفي للرومي', method: 'Water' },
  { day: 21, nameEn: 'Gumboro (IBD)', nameAr: 'غامبورو للرومي', method: 'Water' },
  { day: 28, nameEn: 'Newcastle Booster (LaSota)', nameAr: 'معزز نيوكاسل لاسوتا', method: 'Water' },
  { day: 42, nameEn: 'Fowl Pox (Turkey Strain)', nameAr: 'جدري الرومي', method: 'Wing web' },
  { day: 56, nameEn: 'Cholera (Pasteurella)', nameAr: 'كوليرا الطيور للرومي', method: 'Injection' }
];

@Component({
  selector: 'app-flock-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, TranslateModule, DecimalPipe,
    HealthScoreWidgetComponent, ProfitIndicatorWidgetComponent, ForecastWidgetComponent,
    DecisionSimulatorComponent, SupplierSurveyComponent, ReferralCardComponent,
  ],
  template: `
  <div class="page-wrapper" *ngIf="flock(); else loading">

    <a routerLink="/flocks" class="inline-flex items-center justify-end gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-800 no-underline">
      ← {{ 'COMMON.BACK' | translate }}
    </a>

    <!-- 🎨 كارت رأس الصفحة المعدل لدعم الأرانب والرومي بالألوان والـ Emojis -->
    <div class="rounded-3xl overflow-hidden text-white mb-4"
         [style]="flock()!.type === 'broiler'
           ? 'background: linear-gradient(135deg, #0f2d1a 0%, #1e7d48 100%)'
           : flock()!.type === 'layer'
           ? 'background: linear-gradient(135deg, #2e1065 0%, #7c3aed 100%)'
           : flock()!.type === 'rabbit'
           ? 'background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)'
           : 'background: linear-gradient(135deg, #78350f 0%, #f59e0b 100%)'">
      <div class="px-6 py-6 flex items-center gap-4">
        <div class="text-5xl">
          {{ flock()!.type === 'broiler' ? '🐔' : flock()!.type === 'layer' ? '🥚' : flock()!.type === 'rabbit' ? '🐇' : '🦃' }}
        </div>
        <div class="flex-1">
          <h1 class="text-xl font-black">{{ flock()!.name }}</h1>
          <p class="text-white/70 text-sm mt-0.5">
            {{ flock()!.currentCount | number }} {{ 'FLOCK.BIRDS' | translate }} ·
            {{ 'FLOCK.DAY' | translate }} {{ calculatedAge() }}
          </p>
        </div>
        <div *ngIf="healthScore() as hs" class="text-center bg-white/15 rounded-2xl px-4 py-3">
          <p class="text-3xl font-black leading-none text-green-300">
            {{ hs.score }}
          </p>
          <p class="text-[10px] text-white/60 mt-0.5 font-bold uppercase">{{ 'FLOCK.HEALTH' | translate }}</p>
        </div>
      </div>
    </div>

    <!-- 🚨 تنبيه فوري لو فيه انحراف حرج مكتشف اليوم (نفس محرك الأحداث بتاع التقارير) -->
    <div *ngIf="todayCriticalEvents().length > 0" class="rounded-2xl border-2 border-red-300 bg-red-50 p-4 mb-4">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-xl">🚨</span>
        <h3 class="font-black text-red-700">فيه حاجة محتاجة انتباهك دلوقتي</h3>
      </div>
      <div *ngFor="let e of todayCriticalEvents()" class="text-sm text-red-800 mb-1.5">
        <span class="font-bold">{{ e.title_ar }}</span> — {{ e.reason_ar }}
      </div>
    </div>

    <!-- 📆 برنامج الدورة — فوق الفورم: معروض يوم النهاردة بس، وباقي الأيام/المراحل بتظهر بالضغط -->
    <div class="card mb-4" *ngIf="cycleProgram() as cp">
      <h2 class="section-title mb-3">📆 برنامج الدورة <span *ngIf="cp.offline" class="text-[10px] font-normal text-gray-500">(📴 من النسخة المخزّنة)</span></h2>

      <div *ngIf="!cp.has_program" class="text-center py-3 text-[var(--c-muted)] text-sm">{{ cp.message }}</div>

      <div *ngIf="cp.has_program">

        <!-- 🔔 بداية مرحلة جديدة النهاردة — إجراءات المرحلة كمهام بارزة (مؤقتة، مش محفوظة) -->
        <div *ngIf="cp.is_phase_transition_today && cp.today_phase as newPhase" class="rounded-xl bg-purple-50 border-2 border-purple-300 p-3 mb-3">
          <p class="font-black text-purple-800 mb-1">🔔 مرحلة جديدة بدأت النهاردة: "{{ newPhase.phase_label }}"</p>
          <p class="text-xs text-purple-700 mb-2">حاجات لازم تتعمل النهاردة بالذات (مش هتفضل بارزة بكرة):</p>
          <ul class="text-sm space-y-1">
            <li *ngFor="let a of newPhase.actions">• {{ a }}</li>
          </ul>
        </div>

        <!-- 💡 نصايح حقيقية مبنية على مقارنة آخر سجل فعلي بالمستهدف -->
        <div *ngIf="cp.advice?.length" class="rounded-xl bg-blue-50 border border-blue-200 p-3 mb-3">
          <p class="text-xs font-bold text-blue-800 mb-1">🧠 نصايح اليوم</p>
          <p *ngFor="let a of cp.advice" class="text-sm text-blue-900 mb-1 last:mb-0">• {{ a }}</p>
        </div>

        <div *ngIf="cp.today_phase as phase" class="rounded-xl bg-green-50 border border-green-200 p-3 mb-3">
          <div class="flex items-center justify-between mb-2">
            <span class="font-black text-green-800">
              {{ cp.is_repeating ? ('دورة رقم ' + cp.cycle_number + ' — يوم ' + cp.age_days + ' من التلقيح') : ('اليوم ' + cp.age_days) }}
              — مرحلة "{{ phase.phase_label }}"
            </span>
            <span *ngIf="cp.breed_matched" class="text-[10px] px-1.5 py-0.5 rounded-full bg-green-200 text-green-800 font-bold">🎯 أرقام سلالتك بالظبط</span>
          </div>

          <!-- 🌡️ المستهدفات لليوم ده بالظبط -->
          <div class="grid grid-cols-2 gap-2 text-xs mb-2">
            <div *ngIf="cp.target_temperature_today !== null">
              <span class="text-[var(--c-muted)]">الحرارة المستهدفة اليوم:</span>
              <span class="font-bold">{{ cp.target_temperature_today }}°م</span>
            </div>
            <div *ngIf="cp.target_weight_g_today !== null; else phaseWeightRange">
              <span class="text-[var(--c-muted)]">الوزن المستهدف اليوم:</span>
              <span class="font-bold">{{ cp.target_weight_g_today }} جم</span>
            </div>
            <ng-template #phaseWeightRange>
              <div *ngIf="phase.target_weight !== '—'">
                <span class="text-[var(--c-muted)]">الوزن المستهدف (المرحلة):</span>
                <span class="font-bold">{{ phase.target_weight }}</span>
              </div>
            </ng-template>
            <div *ngIf="cp.target_feed_g_per_bird_today !== null">
              <span class="text-[var(--c-muted)]">العلف المستهدف اليوم:</span>
              <span class="font-bold">{{ cp.target_feed_g_per_bird_today }} جم/طائر</span>
            </div>
            <!-- 🌾 إجمالي العلف للقطيع كله (كان جوه فورم التسجيل) -->
            <div *ngIf="todayTotalFeedKg() !== null" class="col-span-2">
              <span class="text-[var(--c-muted)]">إجمالي العلف المطلوب للقطيع ({{ flock()!.currentCount | number }} طائر):</span>
              <span class="font-black text-green-700">{{ todayTotalFeedKg() }} كجم</span>
            </div>
          </div>

          <!-- 💡 الإضاءة/الإظلام -->
          <div *ngIf="cp.lighting_today as lt" class="text-xs bg-white rounded-lg p-2 mb-2">
            <span class="font-bold" *ngIf="lt.light_hours !== null">
              💡 {{ lt.light_hours }} ساعة ضوء / {{ lt.dark_hours }} ساعة ظلام —
            </span>
            <span [class.text-amber-700]="lt.light_hours === null">{{ lt.note }}</span>
          </div>

          <p class="text-xs font-bold text-gray-600 mb-1">✅ المطلوب يتعمل النهاردة:</p>
          <ul class="text-sm space-y-1 mb-2">
            <li *ngFor="let a of phase.actions">• {{ a }}</li>
          </ul>
          <p *ngIf="phase.warning" class="text-xs text-red-600 font-bold mb-2">⚠️ {{ phase.warning }}</p>

          <!-- 🌾 ملاحظة صادقة عن كمية العلف -->
          <p class="text-[10px] text-gray-400 border-t pt-2">{{ cp.feed_amount_note }}</p>
        </div>
        <div *ngIf="!cp.today_phase" class="text-center py-2 text-[var(--c-muted)] text-sm">
          القطيع خارج نطاق البرنامج المعروف حاليًا (يوم {{ cp.age_days }}).
        </div>

        <!-- 🏠 دليل الإسكان حسب أسلوب التربية (بطاريات/أرضي/...) — من قاعدة المعرفة -->
        <p *ngIf="cp.housing_note" class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-3">{{ cp.housing_note }}</p>
        <div *ngIf="cp.housing_guide as hg" class="rounded-xl bg-amber-50 border border-amber-200 p-3 mt-3">
          <p class="text-xs font-bold text-amber-800 mb-1">🏠 {{ hg.title }}</p>
          <p *ngIf="hg.density" class="text-xs text-amber-900 mb-2"><span class="font-bold">الكثافة:</span> {{ hg.density }}</p>
          <ul class="text-sm space-y-1 mb-2">
            <li *ngFor="let pt of hg.points">• {{ pt }}</li>
          </ul>
          <p class="text-[10px] text-gray-400 border-t pt-1">المصدر: {{ hg.source }}</p>
        </div>

        <!-- 🗓️ كل الأيام — مخفية لحد ما المستخدم يضغط، وكل يوم بيتفتح بالضغط عليه -->
        <button type="button" (click)="toggleFullProgram()" class="text-xs font-bold text-green-600 mt-2">
          {{ showFullProgram() ? 'إخفاء باقي الأيام ▲' : 'عرض كل الأيام ▼' }}
        </button>
        <div *ngIf="showFullProgram()" class="mt-2">

          <!-- ✅ يوم بيوم (من البرنامج الكامل المخزّن على الجهاز) -->
          <div *ngIf="fullProgram() as fp; else phasesFallback" class="space-y-1.5 max-h-96 overflow-y-auto pr-1">
            <div *ngFor="let d of fp.days" class="rounded-lg text-xs overflow-hidden"
                 [class.bg-green-100]="d.day === todayProgramDay()" [class.bg-gray-50]="d.day !== todayProgramDay()">
              <button type="button" (click)="toggleDay(d.day)" class="w-full flex items-center justify-between gap-2 p-2 text-right">
                <span class="font-bold">
                  يوم {{ d.day }}
                  <span class="font-normal text-[var(--c-muted)]">— {{ dayPhase(d)?.phase_label }}</span>
                  <span *ngIf="d.day === todayProgramDay()" class="text-green-700 font-black"> ← النهاردة</span>
                  <span *ngIf="vaccsForDay(d.day).length"> 💉</span>
                  <span *ngIf="dayHasNewTreatment(d)"> 💊</span>
                </span>
                <span class="text-gray-400 shrink-0">{{ expandedDay() === d.day ? '▲' : '▼' }}</span>
              </button>

              <div *ngIf="expandedDay() === d.day" class="px-2 pb-2 space-y-1.5">
                <div class="grid grid-cols-2 gap-1">
                  <p *ngIf="d.temperature != null"><span class="text-[var(--c-muted)]">الحرارة:</span> <span class="font-bold">{{ d.temperature }}°م</span></p>
                  <p *ngIf="d.weight_g != null"><span class="text-[var(--c-muted)]">الوزن المستهدف:</span> <span class="font-bold">{{ d.weight_g }} جم</span></p>
                  <p *ngIf="d.feed_g_per_bird != null"><span class="text-[var(--c-muted)]">العلف:</span> <span class="font-bold">{{ d.feed_g_per_bird }} جم/{{ birdUnit() }}</span></p>
                  <p *ngIf="d.water_ml_per_bird != null"><span class="text-[var(--c-muted)]">الماء:</span> <span class="font-bold">{{ d.water_ml_per_bird }} مل/{{ birdUnit() }}</span></p>
                </div>
                <p *ngIf="dayTotalFeedKg(d) !== null">
                  <span class="text-[var(--c-muted)]">إجمالي العلف للقطيع:</span> <span class="font-bold text-green-700">{{ dayTotalFeedKg(d) }} كجم</span>
                </p>
                <p *ngIf="d.lighting as lt" class="bg-white rounded p-1.5">
                  💡 <span class="font-bold" *ngIf="lt.light_hours != null">{{ lt.light_hours }} ساعة ضوء / {{ lt.dark_hours }} ساعة ظلام — </span>{{ lt.note }}
                </p>

                <div *ngIf="vaccsForDay(d.day).length">
                  <p class="font-bold">💉 تحصينات اليوم:</p>
                  <p *ngFor="let v of vaccsForDay(d.day)">• {{ v.nameAr }}<span *ngIf="v.method"> ({{ v.method }})</span></p>
                </div>

                <div *ngIf="d.treatments?.length">
                  <p class="font-bold">💊 علاجات/مكملات:</p>
                  <p *ngFor="let t of d.treatments">• {{ t.name_ar }}<span *ngIf="t.starts_this_day" class="text-green-700 font-bold"> (بداية)</span><span *ngIf="t.note" class="text-[var(--c-muted)]"> — {{ t.note }}</span></p>
                </div>

                <ng-container *ngIf="dayPhase(d) as ph">
                  <p class="font-bold">✅ إجراءات المرحلة ("{{ ph.phase_label }}"):</p>
                  <ul class="space-y-0.5">
                    <li *ngFor="let a of ph.actions">• {{ a }}</li>
                  </ul>
                  <p *ngIf="ph.warning" class="text-red-600 font-bold">⚠️ {{ ph.warning }}</p>
                </ng-container>
              </div>
            </div>
            <p *ngIf="fp.open_ended" class="text-[10px] text-gray-400">بعد يوم {{ fp.last_day }} بيستمر نفس نظام آخر مرحلة.</p>
          </div>

          <!-- ↩️ لو البرنامج الكامل مش متاح (سيرفر قديم ومفيش نسخة مخزّنة): قايمة المراحل زي الأول -->
          <ng-template #phasesFallback>
            <div class="space-y-1.5">
              <div *ngIf="!cp.phases || cp.phases.length === 0" class="text-xs text-[var(--c-muted)]">مفيش مراحل متسجلة لهذا النوع.</div>
              <div *ngFor="let p of cp.phases; let i = index" class="rounded-lg text-xs overflow-hidden"
                   [class.bg-green-100]="i === cp.today_phase_index" [class.bg-gray-50]="i !== cp.today_phase_index">
                <button type="button" (click)="togglePhase(i)" class="w-full flex items-center justify-between gap-2 p-2 text-right">
                  <span class="font-bold">
                    يوم {{ p.day_from }}–{{ (p.day_to === 999 || p.day_to === 9999) ? 'النهاية' : p.day_to }}: {{ p.phase_label }}
                    <span *ngIf="i === cp.today_phase_index" class="text-green-700 font-black"> ← احنا هنا</span>
                  </span>
                  <span class="text-gray-400 shrink-0">{{ expandedPhase() === i ? '▲' : '▼' }}</span>
                </button>
                <div *ngIf="expandedPhase() === i" class="px-2 pb-2 space-y-1">
                  <p *ngIf="p.target_weight && p.target_weight !== '—'">
                    <span class="text-[var(--c-muted)]">الوزن المستهدف:</span> <span class="font-bold">{{ p.target_weight }}</span>
                  </p>
                  <ul *ngIf="p.actions?.length" class="space-y-0.5">
                    <li *ngFor="let a of p.actions">• {{ a }}</li>
                  </ul>
                  <p *ngIf="p.warning" class="text-red-600 font-bold">⚠️ {{ p.warning }}</p>
                </div>
              </div>
            </div>
          </ng-template>
        </div>
      </div>
    </div>

    <!-- 📴 حالة الأوفلاين: سجلات محفوظة على الجهاز بانتظار النت -->
    <div *ngIf="isOffline() || pendingRecords().length || failedRecords().length || offlineSavedNotice() || syncMessage()" class="mb-4 space-y-2">
      <div *ngIf="isOffline() && offlineEnabled" class="rounded-xl bg-gray-100 border border-gray-300 p-3 text-xs text-gray-700">
        📴 مفيش نت دلوقتي — سجّل بياناتك عادي، هتتحفظ على جهازك وتتبعت أول ما النت يرجع.
      </div>
      <div *ngIf="isOffline() && !offlineEnabled" class="rounded-xl bg-gray-100 border border-gray-300 p-3 text-xs text-gray-700">
        📴 مفيش نت دلوقتي — على الويب لازم نت عشان تسجّل. تطبيق الموبايل بيدعم التسجيل من غير نت.
      </div>
      <div *ngIf="offlineSavedNotice() as msg" class="rounded-xl bg-green-50 border border-green-300 p-3 text-sm text-green-800 font-bold">{{ msg }}</div>
      <div *ngIf="pendingRecords().length" class="rounded-xl bg-amber-50 border border-amber-300 p-3 text-xs text-amber-900">
        <p class="font-bold mb-1">⏳ {{ pendingRecords().length }} سجل محفوظ على جهازك بانتظار الإرسال:</p>
        <p>{{ pendingDatesLabel() }}</p>
        <button *ngIf="!isOffline()" type="button" (click)="syncPending()" [disabled]="syncingPending()" class="mt-2 font-bold text-green-700">
          {{ syncingPending() ? 'جاري الإرسال...' : 'ابعتهم دلوقتي' }}
        </button>
      </div>
      <div *ngIf="failedRecords().length" class="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-800">
        <p class="font-bold mb-1">⚠️ {{ failedRecords().length }} سجل السيرفر رفضه ومتبعتش:</p>
        <p *ngFor="let f of failedRecords()">• {{ f.date }} — {{ f.reason }}</p>
        <button type="button" (click)="dismissFailed()" class="mt-2 font-bold">تجاهل</button>
      </div>
      <div *ngIf="syncMessage() as msg" class="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900 font-bold">{{ msg }}</div>
    </div>

    <!-- 🔔 القسم الرئيسي المتغيّر: إما فورم تسجيل بيانات اليوم، أو ملخص اليوم (صحة + أوزان) -->
    <ng-container *ngIf="showDailyForm(); else todaySummaryBlock">
      <div class="card mb-4" [class.border-2]="promptDaily()" [class.border-amber-400]="promptDaily()">
        <div class="flex items-center justify-between mb-3">
          <h2 class="section-title">
            {{ editingRecordId() ? '✏️ تعديل سجل يوم ' + editingRecordDate() : '📋 ' + ('FLOCK.ADD_RECORD' | translate) }}
          </h2>
          <button *ngIf="!hasTodayRecord() && !editingRecordId()" type="button" (click)="skipToday()"
                  class="text-xs text-gray-400 font-bold hover:text-gray-600">تخطي الآن ⏭️</button>
          <button *ngIf="hasTodayRecord() || editingRecordId()" type="button" (click)="cancelForm()"
                  class="text-xs text-gray-400 font-bold hover:text-gray-600">إغلاق ✕</button>
        </div>

        <!-- 📅 تاريخ السجل: النهارده افتراضياً، ويقدر يختار يوم فات (مهم للقطيع الشغال قبل التطبيق) -->
        <div *ngIf="!editingRecordId()" class="mb-3">
          <label class="form-label">تاريخ السجل</label>
          <input class="form-input text-black bg-gray-100 border p-2 rounded w-full sm:w-56" type="date"
                 [ngModel]="newRecordDate() || todayStr()" (ngModelChange)="newRecordDate.set($event)"
                 [min]="minRecordDate()" [max]="todayStr()" />
          <p *ngIf="isBackdated()" class="text-xs mt-1 mb-0 text-amber-700">
            📅 بتسجّل ليوم فات. التنبيهات التلقائية مش بتشتغل على الأيام القديمة.
          </p>
          <p *ngIf="backdatedBeforeRegistration()" class="text-xs mt-1 mb-0 text-amber-700">
            ℹ️ اليوم ده قبل ما القطيع يتسجّل في التطبيق، فالنفوق فيه مش هيغيّر العدد الحالي (محسوب في العدد اللي كتبته وقت التسجيل).
          </p>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <div>
            <label class="form-label">النفوق اليومي</label>
            <input class="form-input text-black bg-gray-100 border p-2 rounded w-full" type="number" [(ngModel)]="userInputs.mortality" />
          </div>

          <!-- 🥚 حقل عدد البيض - يظهر بس لو نوع القطيع بياض -->
          <div *ngIf="flock()!.type === 'layer'">
            <label class="form-label">عدد البيض اليوم</label>
            <input class="form-input text-black bg-gray-100 border p-2 rounded w-full" type="number" [(ngModel)]="userInputs.eggCount" placeholder="عدد البيضات" />
          </div>

          <div *ngIf="flock()!.type === 'layer'">
            <label class="form-label">بيض مكسور (اختياري)</label>
            <input class="form-input text-black bg-gray-100 border p-2 rounded w-full" type="number" [(ngModel)]="userInputs.brokenEggCount" />
          </div>

          <div class="col-span-2 sm:col-span-1">
            <label class="form-label">العلف المستهلك</label>
            <div class="flex gap-1">
              <input class="form-input text-black bg-gray-100 border p-2 rounded-l flex-1 min-w-0" type="number" [(ngModel)]="userInputs.feedValue" placeholder="الكمية" />
              <select class="text-black bg-gray-200 border py-2 px-2 rounded-r w-24 shrink-0 text-sm font-bold" [(ngModel)]="userInputs.feedUnit">
                <option value="kg">كجم</option>
                <option value="ton">طن</option>
                <option value="gm">جرام</option>
              </select>
            </div>
          </div>

          <div>
            <label class="form-label">درجة الحرارة (°م)</label>
            <input class="form-input text-black bg-gray-100 border p-2 rounded w-full" type="number" [(ngModel)]="userInputs.temperatureCelsius" />
          </div>

          <div>
            <label class="form-label">الرطوبة % (اختياري)</label>
            <input class="form-input text-black bg-gray-100 border p-2 rounded w-full" type="number" min="0" max="100" inputmode="decimal" [(ngModel)]="userInputs.humidityPercent" placeholder="لو عندك جهاز قياس" />
          </div>

          <div class="col-span-2 sm:col-span-1">
            <label class="form-label">متوسط الوزن (اختياري)</label>
            <div class="flex gap-1">
              <input class="form-input text-black bg-gray-100 border p-2 rounded-l flex-1 min-w-0" type="number" [(ngModel)]="userInputs.weightValue" placeholder="الوزن (لو وزنت)" />
              <select class="text-black bg-gray-200 border py-2 px-2 rounded-r w-24 shrink-0 text-sm font-bold" [(ngModel)]="userInputs.weightUnit">
                <option value="kg">كجم</option>
                <option value="gm">جرام</option>
              </select>
            </div>
          </div>
        </div>

        <div class="mb-3">
          <label class="form-label">ملاحظات</label>
          <textarea class="form-input text-black bg-gray-100 border p-2 rounded w-full" [(ngModel)]="userInputs.notes" rows="2"></textarea>
        </div>

        <!-- 📸 صورة اختيارية (لو لاحظت حاجة غريبة في الطائر) -->
        <div class="mb-3">
          <label class="form-label">صورة (اختياري)</label>
          <input type="file" accept="image/png,image/jpeg,image/webp" (change)="onPhotoSelected($event)"
                 class="text-xs w-full text-[var(--c-muted)]"/>
          <div *ngIf="selectedPhotoPreview()" class="mt-2">
            <img [src]="selectedPhotoPreview()" class="h-24 rounded-lg border object-cover"/>
          </div>
          <p *ngIf="photoUploadStatus() === 'uploading'" class="text-xs text-gray-400 mt-1">📤 جاري رفع الصورة...</p>
          <p *ngIf="photoUploadStatus() === 'error'" class="text-xs text-red-500 mt-1">حصل خطأ في رفع الصورة، السجل اتحفظ من غيرها.</p>
        </div>

        <div class="flex items-center gap-3">
          <button class="bg-green-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-700 transition-colors" type="button" (click)="saveRecord()" [disabled]="saving()">
            {{ saving() ? 'جاري الحفظ...' : (editingRecordId() ? 'تحديث السجل ✓' : 'حفظ السجل اليومي ✓') }}
          </button>
        </div>
      </div>
    </ng-container>

    <ng-template #todaySummaryBlock>
      <div class="grid lg:grid-cols-2 gap-4 mb-4">
        <app-health-score-widget [flockId]="flock()!.id" (factorClick)="onHealthFactorClick($event)"></app-health-score-widget>

        <div class="card">
          <div class="flex items-center justify-between mb-2">
            <h2 class="section-title">⚖️ سجل الأوزان</h2>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">✅ اتسجل بيانات اليوم</span>
          </div>
          <div *ngIf="recentWeights().length === 0" class="text-center py-6 text-[var(--c-muted)] text-sm">
            لسه معملتش أي تسجيل وزن للقطيع ده.
          </div>
          <div *ngIf="recentWeights().length > 0" class="space-y-1.5">
            <div *ngFor="let w of recentWeights()" class="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
              <span class="text-[var(--c-muted)]">{{ w.date }}</span>
              <span class="font-bold">{{ w.weight }} كجم</span>
            </div>
          </div>
          <button type="button" (click)="showFormManually.set(true)" class="text-xs text-green-600 font-bold mt-3">
            + تسجيل بيانات (اليوم أو يوم فات)
          </button>
        </div>
      </div>
    </ng-template>

    <p *ngIf="savedOk()" class="text-green-600 text-sm font-semibold text-center mb-4">
      ✅ تم الحفظ بنجاح وتحديث الشاشة!
    </p>

    <!-- 🗂️ تابات تفاصيل القطيع -->
    <div class="flex gap-2 mb-4 overflow-x-auto">
      <button *ngFor="let t of detailTabs()" (click)="activeSection.set(t.key)"
              class="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold border transition whitespace-nowrap"
              [class.bg-green-600]="activeSection() === t.key" [class.text-white]="activeSection() === t.key"
              [class.border-green-600]="activeSection() === t.key"
              [class.text-gray-500]="activeSection() !== t.key" [class.border-gray-200]="activeSection() !== t.key">
        {{ t.label }}
      </button>
    </div>

    <!-- 📅 اليوم -->
    <ng-container *ngIf="activeSection() === 'today'">
      <!-- الـ KPIs المؤشرات -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4" *ngIf="analytics()">
        <div class="card text-center py-4" *ngFor="let k of kpis()">
          <p class="text-xl mb-1">{{ k.icon }}</p>
          <p class="text-lg font-black" [style.color]="k.color">{{ k.value }}</p>
          <p class="text-[10px] text-[var(--c-muted)] font-semibold mt-0.5">{{ k.label | translate }}</p>
          <p *ngIf="k.note" class="text-[9px] text-amber-600 font-bold mt-0.5 mb-0">{{ k.note }}</p>
        </div>
      </div>

      <!-- ✅ مهام اليوم — تعليمات ثابتة من صاحب القطيع، تتأكد يوميًا -->
      <div class="card mb-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="section-title">✅ مهام اليوم</h2>
          <button type="button" *ngIf="myAccess()?.is_owner !== false || myAccess()?.can_add_records" (click)="showTaskForm.set(!showTaskForm())" class="text-xs font-bold text-green-600">
            {{ showTaskForm() ? 'إلغاء' : '+ مهمة جديدة' }}
          </button>
        </div>

        <div *ngIf="showTaskForm()" class="bg-gray-50 rounded-xl p-3 mb-3 space-y-2">
          <input type="text" [(ngModel)]="taskForm.title" placeholder="عنوان المهمة (مثلاً: نظّف المساقي)" class="form-input text-xs w-full"/>
          <textarea [(ngModel)]="taskForm.description" placeholder="تفاصيل إضافية (اختياري)" rows="2" class="form-input text-xs w-full"></textarea>
          <button type="button" (click)="saveTask()" [disabled]="!taskForm.title"
                  class="w-full py-2 rounded-lg bg-green-600 text-white text-xs font-bold disabled:opacity-40">
            حفظ المهمة
          </button>
        </div>

        <div *ngIf="todayTasks().length === 0" class="text-center py-3 text-[var(--c-muted)] text-sm">
          مفيش مهام يومية متحددة لسه للقطيع ده.
        </div>
        <div *ngFor="let t of todayTasks()" class="flex items-start gap-3 bg-gray-50 rounded-lg px-3 py-2.5 mb-1.5">
          <button type="button" (click)="toggleTaskToday(t)"
                  class="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5"
                  [class.bg-green-600]="t.completed_today" [class.border-green-600]="t.completed_today"
                  [class.border-gray-300]="!t.completed_today">
            <span *ngIf="t.completed_today" class="text-white text-xs">✓</span>
          </button>
          <div class="flex-1">
            <p class="text-sm font-bold" [class.line-through]="t.completed_today" [class.text-gray-400]="t.completed_today">
              {{ t.title }}
            </p>
            <p *ngIf="t.description" class="text-xs text-[var(--c-muted)]">{{ t.description }}</p>
            <p *ngIf="t.completed_today" class="text-[10px] text-green-600 font-bold mt-0.5">
              ✓ اتعملت {{ t.completed_by ? 'بواسطة ' + t.completed_by : '' }}
            </p>
          </div>
          <button *ngIf="myAccess()?.is_owner !== false" type="button" (click)="deleteTask(t)" class="text-xs text-red-400 flex-shrink-0">🗑️</button>
        </div>
      </div>
    </ng-container>

    <!-- 🎯 محاكي القرار + التوقعات -->
    <ng-container *ngIf="activeSection() === 'decision'">
      <ng-container *ngIf="myAccess()?.is_owner !== false || myAccess()?.can_view_financials">
        <div class="mb-4">
          <app-profit-indicator-widget [flockId]="flock()!.id"></app-profit-indicator-widget>
        </div>
        <div class="mb-4">
          <app-decision-simulator [flockId]="flock()!.id"></app-decision-simulator>
        </div>
      </ng-container>
      <div *ngIf="myAccess()?.is_owner === false && !myAccess()?.can_view_financials" class="card mb-4 text-center py-4 text-sm text-[var(--c-muted)]">
        مفيش صلاحية عرض البيانات المالية لحسابك.
      </div>
      <div class="mb-4">
        <app-forecast-widget [flockId]="flock()!.id"></app-forecast-widget>
      </div>
    </ng-container>

    <!-- 🥚 قسم سجلات البياض اليومية - يظهر بس لقطعان البياض -->
    <ng-container *ngIf="activeSection() === 'charts'">
    <div class="card mb-4" *ngIf="flock()!.type === 'layer'">
      <h2 class="section-title mb-3">🥚 سجلات البياض اليومية</h2>

      <div *ngIf="eggRecords().length === 0" class="text-center py-6 text-[var(--c-muted)] text-sm">
        لسه معملتش أي تسجيل بياض للقطيع ده.
      </div>

      <div *ngIf="eggRecords().length > 0" class="overflow-x-auto">
        <table class="w-full text-sm text-right">
          <thead>
            <tr class="text-[var(--c-muted)] border-b">
              <th class="py-2 px-2 font-bold">التاريخ</th>
              <th class="py-2 px-2 font-bold">عدد البيض</th>
              <th class="py-2 px-2 font-bold">بيض مكسور</th>
              <th class="py-2 px-2 font-bold">نسبة الإنتاج</th>
              <th class="py-2 px-2 font-bold">ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of eggRecords()" class="border-b border-gray-50">
              <td class="py-2 px-2">{{ r.recordDate }}</td>
              <td class="py-2 px-2 font-bold text-amber-600">{{ r.eggCount ?? 0 }}</td>
              <td class="py-2 px-2 text-red-500">{{ r.brokenEggCount ?? '-' }}</td>
              <td class="py-2 px-2">
                {{ flock()!.currentCount > 0 ? ((r.eggCount ?? 0) / flock()!.currentCount * 100).toFixed(1) : '0.0' }}%
              </td>
              <td class="py-2 px-2 text-[var(--c-muted)]">{{ r.notes || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 📊 رسوم بيانية خطية (Line Chart) -->
    <div class="grid lg:grid-cols-2 gap-5 mb-4">

      <div class="card" *ngIf="flock()!.type === 'layer'">
        <h2 class="section-title">🥚 منحنى إنتاج البيض</h2>
        <div *ngIf="!eggChart()" class="text-center py-6 text-[var(--c-muted)] text-sm">لسه مفيش بيانات بيض كفاية للرسم.</div>
        <ng-container *ngIf="eggChart() as c">
          <ng-container *ngTemplateOutlet="lineChartTpl; context: { c: c, color: '#d97706', unit: 'بيضة' }"></ng-container>
        </ng-container>
      </div>

      <div class="card" *ngIf="flock()!.type !== 'layer'">
        <h2 class="section-title">📈 {{ 'FLOCK.WEIGHT_HIST' | translate }}</h2>
        <div *ngIf="!weightChart()" class="text-center py-6 text-[var(--c-muted)] text-sm">لسه مفيش أوزان مسجلة للرسم (تسجيل الوزن اختياري).</div>
        <ng-container *ngIf="weightChart() as c">
          <ng-container *ngTemplateOutlet="lineChartTpl; context: { c: c, color: '#2563eb', unit: 'كجم' }"></ng-container>
        </ng-container>
      </div>

    </div>

    <ng-template #lineChartTpl let-c="c" let-color="color" let-unit="unit">
      <svg [attr.viewBox]="'0 0 ' + c.W + ' ' + c.H" dir="ltr" class="w-full mt-3" style="height:auto;">
        <g *ngFor="let t of c.ticks">
          <line [attr.x1]="c.L" [attr.x2]="c.W - c.R" [attr.y1]="t.y" [attr.y2]="t.y" stroke="#e5e7eb" stroke-dasharray="3 3"></line>
          <text [attr.x]="c.L - 4" [attr.y]="t.y + 3" text-anchor="end" font-size="9" fill="#9ca3af">{{ t.label }}</text>
        </g>
        <polygon *ngIf="c.area" [attr.points]="c.area" [attr.fill]="color" fill-opacity="0.1"></polygon>
        <polyline [attr.points]="c.line" fill="none" [attr.stroke]="color" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"></polyline>
        <g *ngFor="let p of c.pts; let i = index">
          <circle [attr.cx]="p.x" [attr.cy]="p.y" r="3.5" fill="#ffffff" [attr.stroke]="color" stroke-width="2">
            <title>{{ p.label }}: {{ p.value }} {{ unit }}</title>
          </circle>
          <text *ngIf="i % c.step === 0" [attr.x]="p.x" [attr.y]="c.H - 8" text-anchor="middle" font-size="9" fill="#6b7280">{{ p.label }}</text>
        </g>
      </svg>
    </ng-template>
    </ng-container>

    <!-- 💉 التحصينات وسجل العلاج -->
    <ng-container *ngIf="activeSection() === 'health'">
      <div class="card mb-4">
        <h2 class="section-title">💉 {{ 'FLOCK.VACC_SCHED' | translate }}</h2>

        <!-- قطيع شغال قبل التطبيق: تأكيد كل التحصينات اللي فات موعدها مرة واحدة -->
        <div *ngIf="pastDueVaccCount() > 0 && myAccess()?.is_owner !== false"
             class="mb-3 rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-center justify-between gap-3">
          <p class="text-xs text-amber-900 mb-0">
            فيه {{ pastDueVaccCount() }} تحصين فات موعده ولسه مش متأكد منه. لو القطيع كان شغال قبل التطبيق وكنت عملتهم، أكّدهم مرة واحدة.
          </p>
          <button type="button" (click)="completeAllPastVacc()"
                  class="flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-bold bg-white border border-green-300 text-green-700 hover:bg-green-50">
            ✅ اتنفذوا كلهم
          </button>
        </div>

        <div class="space-y-2">

          <div *ngFor="let v of vaccRows()"
               class="flex items-center gap-3 p-2.5 rounded-xl transition-all duration-300"
               [class.bg-green-50]="v.completed"
               [class.bg-gray-50]="!v.completed && calculatedAge() > v.day"
               [class.bg-red-50]="!v.completed && calculatedAge() === v.day"
               [class.bg-amber-50]="!v.completed && calculatedAge() < v.day">

            <span class="text-lg w-6 text-center flex-shrink-0">
              {{ v.completed ? '✅' : (calculatedAge() > v.day ? '⚠️' : calculatedAge() === v.day ? '⏰' : '⏳') }}
            </span>

            <div class="w-14 flex-shrink-0 text-center">
              <span class="text-xs font-black"
                    [class.text-green-700]="v.completed"
                    [class.text-gray-400]="!v.completed && calculatedAge() > v.day"
                    [class.text-red-600]="!v.completed && calculatedAge() === v.day">
                {{ 'FLOCK.DAY' | translate }} {{ v.day }}
              </span>
            </div>

            <div class="flex-1">
              <p class="text-sm font-semibold transition-all"
                 [class.text-gray-400]="v.completed"
                 [class.line-through]="v.completed">
                {{ lang === 'ar' ? v.nameAr : v.nameEn }}
              </p>
              <p *ngIf="!v.completed && calculatedAge() > v.day" class="text-[10px] text-amber-600 font-bold">
                فات موعده ولسه مش متأكد إنه اتنفذ
              </p>
            </div>

            <button type="button" *ngIf="!v.completed && myAccess()?.is_owner !== false" (click)="toggleVaccination(v)"
                    class="text-[10px] px-2.5 py-1.5 rounded-full flex-shrink-0 font-bold bg-white border border-green-300 text-green-700 hover:bg-green-50">
              ✅ اتنفذ
            </button>
            <button type="button" *ngIf="v.completed && myAccess()?.is_owner !== false" (click)="toggleVaccination(v)"
                    class="text-[10px] px-2 py-1 rounded-full flex-shrink-0 font-medium text-gray-400 hover:text-gray-600">
              ↩️ تراجع
            </button>

          </div>

        </div>
      </div>
    </ng-container>

    <!-- 📜 السجلات السابقة — تعديل أو حذف أي يوم غلطت فيه -->
    <ng-container *ngIf="activeSection() === 'records'">

    <div class="flex gap-2 mb-3">
      <button type="button" (click)="recordsView.set('records')"
              class="flex-1 py-2 rounded-xl text-xs font-bold border transition"
              [class.bg-green-600]="recordsView() === 'records'" [class.text-white]="recordsView() === 'records'"
              [class.border-green-600]="recordsView() === 'records'"
              [class.text-gray-500]="recordsView() !== 'records'" [class.border-gray-200]="recordsView() !== 'records'">
        📜 السجلات
      </button>
      <button type="button" (click)="recordsView.set('report')"
              class="flex-1 py-2 rounded-xl text-xs font-bold border transition"
              [class.bg-green-600]="recordsView() === 'report'" [class.text-white]="recordsView() === 'report'"
              [class.border-green-600]="recordsView() === 'report'"
              [class.text-gray-500]="recordsView() !== 'report'" [class.border-gray-200]="recordsView() !== 'report'">
        📊 التقرير
      </button>
    </div>

    <div class="card mb-4 text-center py-4 text-[var(--c-muted)] text-sm" *ngIf="recordsView() === 'report' && !adherenceReport()">
      التقرير لسه مش جاهز — سجّل بيانات كام يوم الأول.
    </div>

    <!-- 📊 تقرير الالتزام بالبرنامج على مدار الدورة كاملة -->
    <div class="card mb-4" *ngIf="recordsView() === 'report' && adherenceReport() as ar">
      <h2 class="section-title mb-3">📊 الالتزام بالبرنامج — الدورة كاملة</h2>
      <div *ngIf="!ar.has_program || ar.days_recorded === 0" class="text-center py-3 text-[var(--c-muted)] text-sm">
        {{ ar.message || 'مفيش بيانات كفاية للمقارنة لسه' }}
      </div>
      <div *ngIf="ar.has_program && ar.days_recorded > 0">
        <div class="grid grid-cols-2 gap-2 mb-3">
          <div class="bg-gray-50 rounded-xl p-3 text-center" *ngIf="ar.temperature_adherence_pct !== null">
            <p class="text-2xl font-black" [class.text-green-600]="ar.temperature_adherence_pct >= 80" [class.text-amber-600]="ar.temperature_adherence_pct < 80">
              {{ ar.temperature_adherence_pct }}%
            </p>
            <p class="text-[11px] text-[var(--c-muted)]">التزام الحرارة ({{ ar.temperature_days_deviated }} يوم منحرف من {{ ar.temperature_days_total_compared }})</p>
          </div>
          <div class="bg-gray-50 rounded-xl p-3 text-center" *ngIf="ar.weight_adherence_pct !== null">
            <p class="text-2xl font-black" [class.text-green-600]="ar.weight_adherence_pct >= 80" [class.text-amber-600]="ar.weight_adherence_pct < 80">
              {{ ar.weight_adherence_pct }}%
            </p>
            <p class="text-[11px] text-[var(--c-muted)]">التزام الوزن ({{ ar.weight_days_deviated }} يوم منحرف من {{ ar.weight_days_total_compared }})</p>
          </div>
        </div>

        <div *ngIf="ar.temperature_deviation_days?.length" class="mb-2">
          <p class="text-xs font-bold text-gray-500 mb-1">آخر انحرافات الحرارة</p>
          <div *ngFor="let d of ar.temperature_deviation_days" class="text-[11px] text-gray-500 flex justify-between bg-gray-50 rounded px-2 py-1 mb-1">
            <span>{{ d.date }}</span>
            <span>{{ d.actual }}°م (المستهدف {{ d.target }}°م، فرق {{ d.diff > 0 ? '+' : '' }}{{ d.diff }}°)</span>
          </div>
        </div>
        <div *ngIf="ar.weight_deviation_days?.length">
          <p class="text-xs font-bold text-gray-500 mb-1">آخر انحرافات الوزن</p>
          <div *ngFor="let d of ar.weight_deviation_days" class="text-[11px] text-gray-500 flex justify-between bg-gray-50 rounded px-2 py-1 mb-1">
            <span>{{ d.date }}</span>
            <span>{{ d.actual_g }} جم (المستهدف {{ d.target_g }} جم، {{ d.diff_pct > 0 ? '+' : '' }}{{ d.diff_pct }}%)</span>
          </div>
        </div>
      </div>
    </div>

    <div class="card mt-4" *ngIf="recordsView() === 'records'">
      <div class="flex items-center justify-between mb-3">
        <h2 class="section-title">📜 السجلات السابقة</h2>
        <button type="button" (click)="showPastRecords.set(!showPastRecords())" class="text-xs font-bold text-green-600">
          {{ showPastRecords() ? 'إخفاء' : 'عرض' }}
        </button>
      </div>
      <div *ngIf="showPastRecords()">
        <div *ngIf="records().length === 0" class="text-center py-4 text-[var(--c-muted)] text-sm">مفيش سجلات لسه.</div>
        <div *ngIf="records().length > 0" class="overflow-x-auto">
          <table class="w-full text-sm text-right">
            <thead>
              <tr class="text-[var(--c-muted)] border-b">
                <th class="py-2 px-2 font-bold">التاريخ</th>
                <th class="py-2 px-2 font-bold">نفوق</th>
                <th class="py-2 px-2 font-bold">علف (كجم)</th>
                <th class="py-2 px-2 font-bold">وزن (كجم)</th>
                <th class="py-2 px-2 font-bold">رطوبة %</th>
                <th class="py-2 px-2 font-bold">سجّله</th>
                <th class="py-2 px-2 font-bold"></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let r of pastRecordsSorted()" class="border-b border-gray-50">
                <td class="py-2 px-2">{{ recordDateOf(r) }}</td>
                <td class="py-2 px-2 text-red-500">{{ r.mortality ?? 0 }}</td>
                <td class="py-2 px-2">{{ r.feedConsumedKg ?? r.feed_consumed_kg ?? '-' }}</td>
                <td class="py-2 px-2">{{ recordWeightOf(r) ?? '-' }}</td>
                <td class="py-2 px-2">{{ r.humidityPercent ?? r.humidity_percent ?? '-' }}</td>
                <td class="py-2 px-2 text-[11px] text-[var(--c-muted)]">
                  <p>{{ authorOf(r) || '—' }}</p>
                  <p *ngIf="editorOf(r) as ed" class="text-[10px] text-amber-600">✏️ عدّله {{ ed }} · {{ r.updatedAt | date:'d/M h:mm a' }}</p>
                </td>
                <td class="py-2 px-2 whitespace-nowrap">
                  <ng-container *ngIf="myAccess()?.is_owner !== false">
                    <button type="button" (click)="startEditRecord(r)" class="text-xs text-blue-600 font-bold ml-2">✏️ تعديل</button>
                    <button type="button" (click)="deletePastRecord(r)" class="text-xs text-red-500 font-bold">🗑️ حذف</button>
                  </ng-container>
                  <span *ngIf="myAccess()?.is_owner === false" class="text-[10px] text-gray-300">عرض بس</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </ng-container>

    <!-- 💊 سجل العلاج/الأدوية -->
    <ng-container *ngIf="activeSection() === 'health'">

    <!-- 🩺 العلاجات والمكملات المتوقعة للقطيع حسب نوعه وعمره -->
    <div class="card mt-4" *ngIf="treatmentPlan() as tp">
      <h2 class="section-title mb-3">🩺 العلاجات والمكملات المتوقعة للقطيع</h2>
      <div *ngIf="tp.items.length === 0" class="text-center py-3 text-[var(--c-muted)] text-sm">
        مفيش علاجات أو مكملات موثّقة في البرنامج لنوع القطيع ده.
      </div>
      <div *ngFor="let it of tp.items" class="flex items-start gap-3 p-2.5 rounded-xl mb-1.5"
           [class.bg-amber-50]="it.status === 'now'" [class.bg-gray-50]="it.status !== 'now'">
        <span class="text-lg w-6 text-center flex-shrink-0">{{ it.status === 'now' ? '⏰' : (it.status === 'past' ? '✔️' : '⏳') }}</span>
        <div class="flex-1">
          <p class="text-sm font-semibold" [class.text-gray-400]="it.status === 'past'">{{ it.name_ar }}</p>
          <p class="text-[10px] text-[var(--c-muted)]">
            يوم {{ it.day_from }}{{ it.day_to >= 999 ? ' → النهاية' : ' – ' + it.day_to }} · {{ it.note }}
          </p>
        </div>
        <button type="button" *ngIf="it.status !== 'upcoming' && it.loggable && myAccess()?.is_owner !== false" (click)="logPlannedTreatment(it)"
                class="text-[10px] px-2.5 py-1.5 rounded-full flex-shrink-0 font-bold bg-white border border-green-300 text-green-700">
          + سجّله
        </button>
      </div>
      <p class="text-[10px] text-[var(--c-muted)] mt-2">⚠️ استرشادي من برنامج الدورة — الجرعات والأدوية الفعلية بتتحدد مع الطبيب البيطري.</p>
    </div>
    <div class="card mt-4">
      <div class="flex items-center justify-between mb-3">
        <h2 class="section-title">💊 سجل العلاج والأدوية</h2>
        <button type="button" *ngIf="myAccess()?.is_owner !== false" (click)="showTreatmentForm.set(!showTreatmentForm())" class="text-xs font-bold text-green-600">
          {{ showTreatmentForm() ? 'إلغاء' : '+ إضافة علاج' }}
        </button>
      </div>

      <!-- ⚠️ تنبيه فترة سحب نشطة -->
      <div *ngIf="activeWithdrawal() as w" class="rounded-xl bg-amber-50 border border-amber-300 p-3 mb-3 text-sm">
        <span class="font-bold text-amber-800">⚠️ لسه في فترة سحب لـ {{ w.drug_name }} لغاية {{ w.withdrawal_end_date }}</span>
        <p class="text-amber-700 text-xs mt-1">متبيعش لحم/بيض القطيع ده قبل التاريخ ده.</p>
      </div>

      <div *ngIf="showTreatmentForm()" class="bg-gray-50 rounded-xl p-3 mb-3 space-y-2">
        <input type="text" [(ngModel)]="treatmentForm.drug_name" placeholder="اسم الدواء" class="form-input text-xs w-full"/>
        <select [(ngModel)]="treatmentForm.category" class="form-input text-xs w-full">
          <option value="antibiotic">مضاد حيوي</option>
          <option value="vitamin">فيتامين</option>
          <option value="anticoccidial">مضاد كوكسيديا</option>
          <option value="antiparasitic">مضاد طفيليات</option>
          <option value="other">أخرى</option>
        </select>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="form-label">من تاريخ</label>
            <input type="date" [(ngModel)]="treatmentForm.start_date" class="form-input text-xs w-full"/>
          </div>
          <div>
            <label class="form-label">لحد تاريخ</label>
            <input type="date" [(ngModel)]="treatmentForm.end_date" class="form-input text-xs w-full"/>
          </div>
        </div>
        <div>
          <label class="form-label">فترة السحب بعد آخر جرعة (أيام) — من نشرة المنتج</label>
          <input type="number" [(ngModel)]="treatmentForm.withdrawal_days" class="form-input text-xs w-full"/>
        </div>
        <input type="text" [(ngModel)]="treatmentForm.reason" placeholder="السبب (اختياري)" class="form-input text-xs w-full"/>
        <button type="button" (click)="saveTreatment()" [disabled]="!treatmentForm.drug_name"
                class="w-full py-2 rounded-lg bg-green-600 text-white text-xs font-bold disabled:opacity-40">
          حفظ
        </button>
      </div>

      <div *ngIf="treatments().length === 0" class="text-center py-3 text-[var(--c-muted)] text-sm">مفيش علاجات مسجلة.</div>
      <div *ngFor="let t of treatments()" class="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2 mb-1.5">
        <div>
          <span class="font-bold">{{ t.drug_name }}</span>
          <span class="text-[var(--c-muted)] text-xs"> — {{ t.start_date }} إلى {{ t.end_date }}</span>
          <span *ngIf="t.in_withdrawal_period" class="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold mr-1">فترة سحب</span>
        </div>
        <button type="button" *ngIf="myAccess()?.is_owner !== false" (click)="deleteTreatment(t)" class="text-xs text-red-500 font-bold">🗑️</button>
      </div>
    </div>
    </ng-container>

    <!-- 👷 دعوة عامل/بيطري يشارك في التسجيل (مطبقة على كل قطعانك، مش القطيع ده بس) -->
    <ng-container *ngIf="activeSection() === 'team'">
    <div class="card mt-4">
      <div class="flex items-center justify-between mb-3">
        <h2 class="section-title">👷 مين تاني يقدر يسجل بيانات؟</h2>
        <button type="button" (click)="showInviteForm.set(!showInviteForm())" class="text-xs font-bold text-green-600">
          {{ showInviteForm() ? 'إلغاء' : '+ دعوة عضو' }}
        </button>
      </div>

      <!-- 🔔 دعوة معلقة موجهة لإيميلي (لو صاحب الحساب ده كمان مدعو من حد تاني) -->
      <div *ngIf="pendingInvitesForMe().length > 0" class="rounded-xl border-2 border-green-300 bg-green-50 p-3 mb-3">
        <div *ngFor="let inv of pendingInvitesForMe()" class="text-sm mb-2 last:mb-0">
          <p class="mb-1.5">
            <span class="font-bold">{{ inv.owner_name || 'مربي' }}</span> بيدعوك تنضم كـ
            {{ roleLabel(inv.role, true) }}
          </p>
          <input type="text" [(ngModel)]="inviteCodes[inv.id]" maxlength="16" dir="ltr" autocomplete="off"
                 placeholder="اكتب كود الدعوة اللي صاحب المزرعة بعتهولك"
                 class="form-input text-xs w-full mb-1.5 text-center tracking-widest uppercase"/>
          <div class="flex gap-2">
            <button type="button" (click)="acceptInviteForMe(inv)" [disabled]="(inviteCodes[inv.id] || '').trim().length < 6"
                    class="flex-1 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold disabled:opacity-40">✅ قبول</button>
            <button type="button" (click)="rejectInviteForMe(inv)" class="flex-1 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold">✕ رفض</button>
          </div>
        </div>
      </div>

      <p class="text-xs text-[var(--c-muted)] mb-2">
        ملحوظة: العضو اللي تدعوه هيقدر يسجل بيانات في <b>كل قطعانك</b>، مش القطيع ده بس.
      </p>

      <div *ngIf="showInviteForm()" class="bg-gray-50 rounded-xl p-3 mb-3 space-y-2">
        <input type="email" [(ngModel)]="inviteForm.invited_email" placeholder="إيميل العضو (لازم يكون عنده حساب)" class="form-input text-xs w-full"/>
        <select [(ngModel)]="inviteForm.role" class="form-input text-xs w-full">
          <option value="worker">عامل مزرعة</option>
          <option value="vet">طبيب بيطري</option>
          <option value="engineer">مهندس</option>
        </select>
        <label class="flex items-center gap-2 text-xs">
          <input type="checkbox" [(ngModel)]="inviteForm.can_view_financials"/>
          يقدر يشوف البيانات المالية
        </label>
        <button type="button" (click)="sendInvite()" [disabled]="!inviteForm.invited_email || inviting()"
                class="w-full py-2 rounded-lg bg-green-600 text-white text-xs font-bold disabled:opacity-40">
          {{ inviting() ? 'جاري الإرسال...' : 'إرسال الدعوة' }}
        </button>

        <div *ngIf="lastInviteLink()" class="bg-white rounded-lg p-2 border">
          <div *ngIf="lastInviteCode()" class="text-center mb-2">
            <p class="text-[10px] text-gray-500">كود الدعوة (ابعته للعضو — مطلوب عشان يقبل):</p>
            <p class="font-black tracking-widest text-lg" dir="ltr">{{ lastInviteCode() }}</p>
          </div>
          <p class="text-[10px] text-gray-500 mb-2">
            العضو لازم يكون عنده حساب بنفس الإيميل ده. هيلاقي الدعوة جوه التطبيق، وهيكتب الكود عشان يقبلها. ابعتله الكود:
          </p>
          <div class="flex gap-2">
            <a [href]="whatsappShareUrl()" target="_blank" rel="noopener"
               class="flex-1 py-2 rounded-lg bg-green-500 text-white text-xs font-bold text-center no-underline">📱 واتساب</a>
            <a [href]="telegramShareUrl()" target="_blank" rel="noopener"
               class="flex-1 py-2 rounded-lg bg-blue-500 text-white text-xs font-bold text-center no-underline">✈️ تيليجرام</a>
          </div>
        </div>
      </div>

      <div *ngIf="farmMembers().length === 0" class="text-center py-2 text-[var(--c-muted)] text-sm">لسه معملتش أي دعوة.</div>
      <div *ngFor="let m of farmMembers()" class="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2 mb-1.5">
        <div>
          <span class="font-bold">{{ m.invited_email || '🔗 دعوة بلينك (لسه بدون إيميل)' }}</span>
          <span class="text-[var(--c-muted)] text-xs"> — {{ roleLabel(m.role) }}</span>
          <span class="text-[10px] px-1.5 py-0.5 rounded-full font-bold mr-1"
                [class.bg-amber-100]="m.status === 'pending'" [class.text-amber-700]="m.status === 'pending'"
                [class.bg-green-100]="m.status === 'active'" [class.text-green-700]="m.status === 'active'"
                [class.bg-gray-200]="m.status === 'revoked' || m.status === 'rejected'" [class.text-gray-500]="m.status === 'revoked' || m.status === 'rejected'">
            {{ memberStatusLabel(m.status) }}
          </span>
          <div *ngIf="m.status === 'pending' && m.invite_code" class="text-[11px] text-gray-500 mt-1">
            كود الدعوة: <span class="font-black tracking-widest" dir="ltr">{{ m.invite_code }}</span>
          </div>
        </div>
        <button *ngIf="m.status !== 'revoked'" type="button" (click)="revokeMember(m)" class="text-xs text-red-500 font-bold">🗑️</button>
      </div>
    </div>

    <!-- 🎁 ادعُ صديق — منفصلة عن دعوة عضو فريق، دي دعوة لمستخدم جديد للتطبيق نفسه -->
    <div class="mt-4">
      <app-referral-card></app-referral-card>
    </div>
    </ng-container>

    <!-- 🔒 قفل الدورة (لما تخلص التربية) — دايمًا ظاهر، مش جوه تاب، عشان يبقى سهل الوصول -->
    <div class="card mt-4" *ngIf="flock()!.status === 'active'">
      <button class="w-full py-3 rounded-xl bg-red-50 text-red-700 font-bold border border-red-200 hover:bg-red-100 transition"
              type="button" (click)="closeFlock()" [disabled]="closingFlock()">
        {{ closingFlock() ? 'جاري القفل...' : (flock()!.type === 'layer' ? '🔒 قفل الدورة (انتهى الإنتاج)' : '🔒 قفل الدورة (انتهت التربية)') }}
      </button>
    </div>

    <!-- 📜 شهادة أداء قابلة للطباعة — دايمًا ظاهرة (نشط أو مقفول) -->
    <div class="card mt-4">
      <button class="w-full py-3 rounded-xl bg-gray-50 text-gray-700 font-bold border border-gray-200 hover:bg-gray-100 transition"
              type="button" (click)="downloadCertificate()">
        📜 تحميل شهادة أداء القطيع (PDF)
      </button>
    </div>

  </div>

  <!-- استبيان نهاية الدورة -->
  <div *ngIf="showSurvey()" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="max-w-md w-full">
      <app-supplier-survey [flockId]="flock()!.id" (done)="onSurveyDone()"></app-supplier-survey>
      <button class="w-full text-center text-white text-sm mt-3" type="button" (click)="showSurvey.set(false)">
        تخطي
      </button>
    </div>
  </div>

  <ng-template #loading>
    <div class="text-center py-16 text-[var(--c-muted)]">
      <p class="text-4xl animate-bounce">🐣</p>
      <p>جاري تحميل بيانات القطيع الفلكية...</p>
    </div>
  </ng-template>
  `,
})
export class FlockDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc   = inject(FlockService);
  private http  = inject(HttpClient);
  private auth  = inject(AuthService);
  private store = inject(UserOfflineCacheService);

  flock     = signal<Flock | null>(null);
  analytics = signal<FlockAnalytics | null>(null);
  saving    = signal(false);
  savedOk   = signal(false);
  healthScore   = signal<any>(null);
  closingFlock  = signal(false);
  showSurvey    = signal(false);
  lang = localStorage.getItem('lang') ?? 'ar';

  // 🔔 حالة "تذكير تسجيل بيانات اليوم"
  // 🔐 صلاحيات المستخدم الحالي على القطيع ده (مالك / عضو مشارك) — من الباك إند مباشرة
  myAccess = signal<{ is_owner: boolean; can_add_records: boolean; can_view_financials: boolean; can_manage_team: boolean } | null>(null);

  // 🗂️ تابات صفحة تفاصيل القطيع — الهيدر وفورم اليوم والتنبيهات الحرجة دايمًا ظاهرين برة التابات
  activeSection = signal<'today' | 'health' | 'charts' | 'decision' | 'records' | 'team'>('today');
  detailTabsAll = [
    { key: 'today' as const, label: '📅 اليوم' },
    { key: 'health' as const, label: '💉 الصحة' },
    { key: 'charts' as const, label: '📊 الرسوم' },
    { key: 'decision' as const, label: '🎯 القرار والأهداف' },
    { key: 'records' as const, label: '📜 السجلات والتقرير' },
    { key: 'team' as const, label: '👷 الفريق' },
  ];
  // 👷 العضو المشارك (مش صاحب الحساب) ميشوفش تاب "الفريق" — إدارة الفريق لصاحب الحساب بس
  detailTabs = () => this.myAccess()?.is_owner === false
    ? this.detailTabsAll.filter(t => t.key !== 'team')
    : this.detailTabsAll;

  showFormManually = signal(false);      // المستخدم فتح الفورم يدويًا حتى لو اليوم متسجل بالفعل
  skippedToday      = signal(false);      // ضغط "تخطي الآن" النهاردة لنفس القطيع ده
  promptDaily        = signal(false);      // جاي من الـ guard عبر ?prompt=daily (يبرز الفورم بس)

  // 💉 التحصينات الحقيقية من قاعدة البيانات (بعد المزامنة مع الجدول الاسترشادي)
  dbVaccinations = signal<any[]>([]);

  // 📜 تعديل/حذف سجل يوم فات
  showPastRecords = signal(true);
  recordsView = signal<'records' | 'report'>('records'); // 📜 سجلات / 📊 تقرير جوه تاب السجلات
  recordedByMap = signal<Record<string, string>>({});
  newRecordDate = signal<string>('');   // '' = النهارده؛ غير كده تاريخ يوم فات (YYYY-MM-DD)
  editingRecordId = signal<string | null>(null);
  editingRecordDate = signal<string | null>(null);

  // 💊 سجل العلاج والأدوية
  treatments = signal<any[]>([]);
  treatmentPlan = signal<any>(null); // 🩺 العلاجات المتوقعة حسب نوع القطيع وعمره
  showTreatmentForm = signal(false);
  treatmentForm: {
    drug_name: string; category: string; start_date: string; end_date: string;
    withdrawal_days: number | null; reason: string;
  } = { drug_name: '', category: 'antibiotic', start_date: new Date().toISOString().slice(0, 10), end_date: new Date().toISOString().slice(0, 10), withdrawal_days: 0, reason: '' };
  activeWithdrawal = () => this.treatments().find(t => t.in_withdrawal_period) ?? null;

  // ✅ مهام اليوم
  todayTasks = signal<any[]>([]);
  showTaskForm = signal(false);
  taskForm: { title: string; description: string } = { title: '', description: '' };

  // 📆 برنامج الدورة يوم بيوم
  cycleProgram = signal<any>(null);
  adherenceReport = signal<any>(null);
  showFullProgram = signal(false);
  toggleFullProgram() { this.showFullProgram.update(v => !v); }

  // 🗓️ المرحلة المفتوحة حاليًا في الخط الزمني الكامل (null = كلها مقفولة)
  expandedPhase = signal<number | null>(null);
  togglePhase(i: number) { this.expandedPhase.update(v => v === i ? null : i); }

  // 📴 برنامج الدورة الكامل يوم بيوم — بيتخزّن على الجهاز عشان يشتغل من غير نت
  fullProgram = signal<any | null>(null);
  expandedDay = signal<number | null>(null);
  toggleDay(day: number) { this.expandedDay.update(v => v === day ? null : day); }
  dayPhase(d: any): any | null {
    const fp = this.fullProgram();
    return fp && d?.phase_index !== null && d?.phase_index !== undefined ? (fp.phases?.[d.phase_index] ?? null) : null;
  }
  vaccsForDay(day: number): any[] { return this.vaccSchedule().filter((v: any) => v.day === day); }
  dayHasNewTreatment(d: any): boolean { return (d?.treatments || []).some((t: any) => t.starts_this_day); }
  birdUnit(): string { return String(this.flock()?.type || '').startsWith('rabbit') ? 'رأس' : 'طائر'; }
  dayTotalFeedKg(d: any): number | null {
    const n = this.flock()?.currentCount;
    return d?.feed_g_per_bird != null && n ? Math.round((d.feed_g_per_bird * n) / 100) / 10 : null;
  }
  todayProgramDay(): number | null {
    const cp = this.cycleProgram();
    if (!cp?.has_program || cp.age_days == null) return null;
    return cp.is_repeating ? cp.age_days : Math.max(cp.age_days, 1);
  }

  // 📅 تاريخ النهاردة بالتوقيت المحلي للجهاز (toISOString بيرجّع UTC وبيغلّط اليوم بين 12 والـ 3 الفجر بتوقيت مصر)
  private localDateStr(d: Date = new Date()): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // 📴 تخزين الأوفلاين — موبايل بس (على الويب مفيش تخزين في المتصفح)، ومربوط بمعرّف المستخدم الحالي
  // عشان مستخدم تاني على نفس الجهاز مايشوفش ولا يبعت بيانات غيره. التفاصيل في UserOfflineCacheService.
  offlineEnabled = this.store.enabled;
  private cacheSet(key: string, value: any): Promise<boolean> {
    return this.auth.currentUserId().then(uid => this.store.set(uid, key, value));
  }
  private cacheGet(key: string): Promise<any | null> {
    return this.auth.currentUserId().then(uid => this.store.get(uid, key));
  }

  // 📴 سجلات اتسجلت من غير نت — بتستنى على الجهاز لحد ما النت يرجع وبعدين بتتبعت
  private readonly PENDING_KEY = 'pending_records';
  private readonly FAILED_KEY = 'failed_records';
  private activeFlockId: string | null = null;
  isOffline = signal(typeof navigator !== 'undefined' && !navigator.onLine);
  pendingRecords = signal<any[]>([]);              // سجلات القطيع المفتوح بس (للمستخدم الحالي بس)
  failedRecords = signal<any[]>([]);               // سجلات السيرفر رفضها — بتتعرض عشان المستخدم يشوفها (مش بتتمسح بصمت)
  syncingPending = signal(false);
  syncMessage = signal<string | null>(null);
  offlineSavedNotice = signal<string | null>(null);
  pendingDatesLabel = () => this.pendingRecords().map(p => p.date).join('، ');

  // قفل بسيط: قراءة-تعديل-كتابة الطابور بتحصل واحدة ورا التانية (تسجيل جديد + مزامنة في نفس الوقت)
  private qLock: Promise<unknown> = Promise.resolve();
  private withQueueLock<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.qLock.then(fn, fn);
    this.qLock = run.catch(() => undefined);
    return run;
  }

  private async readQueue(): Promise<any[]> {
    const q = await this.cacheGet(this.PENDING_KEY);
    return Array.isArray(q) ? q : [];
  }
  private async writeQueue(q: any[]): Promise<boolean> {
    const ok = await this.cacheSet(this.PENDING_KEY, q);
    await this.refreshPendingSignal();
    return ok;
  }
  private async refreshPendingSignal() {
    const q = await this.readQueue();
    this.pendingRecords.set(q.filter(x => x.flockId === this.activeFlockId));
    const f = await this.cacheGet(this.FAILED_KEY);
    this.failedRecords.set((Array.isArray(f) ? f : []).filter((x: any) => x.flockId === this.activeFlockId));
  }
  /** بترجّع false لو التخزين فشل (مساحة ممتلية / مفيش مستخدم معروف) — ساعتها ماننفعش نقول للمستخدم "اتحفظ" */
  private queueRecord(item: { kind: 'create' | 'patch'; flockId: string; recordId?: string | null; date: string; payload: any }): Promise<boolean> {
    return this.withQueueLock(async () => {
      const uid = await this.auth.currentUserId();
      if (!uid) return false;
      // نفس القطيع + نفس اليوم + نفس النوع → آخر نسخة بتحل محل القديمة
      const q = (await this.readQueue()).filter(x => !(x.flockId === item.flockId && x.date === item.date
        && x.kind === item.kind && (x.recordId ?? null) === (item.recordId ?? null)));
      q.push({ ...item, userId: uid, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, queuedAt: new Date().toISOString() });
      return this.writeQueue(q);
    });
  }
  private removeFromQueue(id: string): Promise<boolean> {
    return this.withQueueLock(async () => this.writeQueue((await this.readQueue()).filter(x => x.id !== id)));
  }
  /** بتقارن القيم المهمة بين السجل المخزّن وسجل السيرفر (null / '' / 0 بتتعامل كـ "فاضي" — السيرفر بيحوّل الفاضي لـ 0 أو null) */
  private sameRecordValues(payload: any, server: any): boolean {
    const norm = (v: any) => (v === null || v === undefined || v === '' || Number(v) === 0)
      ? 0 : (isNaN(Number(v)) ? String(v).trim() : Number(v));
    return ['mortality', 'feed_consumed_kg', 'temperature_celsius', 'avg_weight_kg', 'water_consumed_l', 'egg_count', 'broken_egg_count', 'notes']
      .every(k => norm(payload?.[k]) === norm(server?.[k]));
  }
  private markFailed(item: any, reason: string): Promise<boolean> {
    return this.withQueueLock(async () => {
      const f = await this.cacheGet(this.FAILED_KEY);
      const list = Array.isArray(f) ? f : [];
      list.push({ ...item, reason, failedAt: new Date().toISOString() });
      return this.cacheSet(this.FAILED_KEY, list);
    });
  }
  async dismissFailed() {
    await this.withQueueLock(async () => {
      const f = await this.cacheGet(this.FAILED_KEY);
      await this.cacheSet(this.FAILED_KEY, (Array.isArray(f) ? f : []).filter((x: any) => x.flockId !== this.activeFlockId));
    });
    await this.refreshPendingSignal();
  }

  @HostListener('window:offline')
  onWentOffline() { this.isOffline.set(true); }

  @HostListener('window:online')
  onBackOnline() {
    this.isOffline.set(false);
    if (this.activeFlockId) this.loadCycleProgram(this.activeFlockId); // نجدّد النسخة المخزّنة
    this.syncPending();
  }

  // 🔄 يبعت سجلات المستخدم الحالي المحفوظة للسيرفر بالترتيب، وبعدها يحدّث التحليلات والنصايح
  async syncPending() {
    if (this.syncingPending() || !navigator.onLine || !this.store.enabled) return;
    const uid = await this.auth.currentUserId();
    if (!uid) return;
    // دفاع إضافي: التخزين أصلاً مفصول لكل مستخدم، وده يضمن إننا مانبعتش سجل اتخزّن باسم مستخدم تاني
    const queue = (await this.readQueue()).filter(x => !x.userId || x.userId === uid);
    if (!queue.length) return;
    this.syncingPending.set(true);

    let sent = 0, failed = 0;
    const existingByFlock: Record<string, Record<string, any>> = {}; // تاريخ → صف السجل كما رجع من السيرفر
    for (const item of queue) {
      try {
        if (item.kind === 'create') {
          if (!existingByFlock[item.flockId]) {
            const rows = await firstValueFrom(this.http.get<any[]>(`${environment.apiUrl}/flocks/${item.flockId}/records`));
            const m: Record<string, any> = {};
            (rows || []).forEach(r => { const d = this.recordDateStr(r); if (d) m[d] = r; });
            existingByFlock[item.flockId] = m;
          }
          const existing = existingByFlock[item.flockId][item.date];
          if (existing) {
            // 🛡️ فيه سجل لنفس اليوم على السيرفر — مانكتبش فوقه (ممكن يكون لعضو تاني، وتعديل النفوق بيغيّر عدد الطيور)
            if (this.sameRecordValues(item.payload, existing)) {
              // نفس القيم بالظبط (غالبًا الإرسال الأول وصل والرد ضاع) — مفيش حاجة نبعتها
              await this.removeFromQueue(item.id);
              sent++;
              continue;
            }
            const who = existing.created_by_name ? ` (سجّله ${existing.created_by_name})` : '';
            const saved = await this.markFailed(item, `فيه سجل مختلف لنفس اليوم على السيرفر${who} — مااتكتبش فوقه`);
            if (!saved) break;
            await this.removeFromQueue(item.id);
            failed++;
            continue;
          }
          await firstValueFrom(this.svc.addRecord(item.payload));
        } else {
          // تعديل مقصود من المستخدم لسجل معروف
          const fields = { ...item.payload };
          delete fields.flock_id; delete fields.record_date; delete fields.water_consumed_l;
          await firstValueFrom(this.http.patch<any>(`${environment.apiUrl}/flocks/${item.flockId}/records/${item.recordId}`, fields));
        }
        await this.removeFromQueue(item.id);
        sent++;
      } catch (err: any) {
        const st = err?.status;
        if (!st || st === 401 || st >= 500) break; // مش وقته (نت/سيرفر/جلسة منتهية) — نسيبه ونحاول تاني
        // رفض نهائي (400/403/404/409/422...): نحفظه في قايمة "المرفوضة" الأول، وبعدها بس نشيله من الطابور — مفيش بيانات بتضيع بصمت
        const detail = err?.error?.detail;
        const saved = await this.markFailed(item, typeof detail === 'string' ? detail : `خطأ ${st}`);
        if (!saved) break;
        await this.removeFromQueue(item.id);
        failed++;
      }
    }

    this.syncingPending.set(false);
    await this.refreshPendingSignal();
    if (sent || failed) {
      this.syncMessage.set(sent
        ? `✅ اتبعت ${sent} سجل للسيرفر وجاري تحديث التحليلات${failed ? ` — و${failed} سجل السيرفر رفضه (شوفهم تحت)` : ''}`
        : `⚠️ ${failed} سجل السيرفر رفضه — شوفهم تحت`);
      setTimeout(() => this.syncMessage.set(null), 7000);
      if (this.activeFlockId) this.loadData(this.activeFlockId); // 🔄 السجلات + التحليلات + النصايح بالداتا الجديدة
    }
  }

  /** إجمالي العلف المطلوب (كجم) للقطيع كله النهاردة = المستهدف للطائر × العدد المسجل حاليًا */
  todayTotalFeedKg = (): number | null => {
    const cp = this.cycleProgram();
    const count = this.flock()?.currentCount;
    if (!cp || cp.target_feed_g_per_bird_today == null || !count) return null;
    return Math.round((cp.target_feed_g_per_bird_today * count / 1000) * 10) / 10;
  };

  /** لما المستخدم يدوس على سبب نقص في كرت الصحة — نودّيه للمكان اللي يشرح المشكلة بالتفصيل */
  onHealthFactorClick(factor: { label: string; impact: number }) {
    const label = factor.label || '';
    const isAbout = (...keywords: string[]) => keywords.some(k => label.includes(k));

    if (isAbout('نفوق', 'وفيات', 'موت')) {
      this.activeSection.set('records'); // 📜 السجلات — فيها عمود النفوق اليومي بالتفصيل
      this.recordsView.set('records');
    } else if (isAbout('علف', 'تغذية', 'وزن', 'حرارة', 'إضاءة')) {
      this.activeSection.set('today'); // 📅 اليوم — برنامج الدورة ظاهر فوق الفورم دايمًا
    } else if (isAbout('تطعيم', 'لقاح', 'علاج', 'دواء', 'سحب')) {
      this.activeSection.set('health'); // 💉 الصحة — فيها التحصينات والعلاجات
    } else {
      this.activeSection.set('today');
    }

    // نمرّر للتابات نفسها عشان المستخدم يشوف فين اتنقل
    document.querySelector('.flex.gap-2.mb-4.overflow-x-auto')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // 👷 دعوة أعضاء (مطبّقة على كل قطعان صاحب الحساب، مش القطيع المفتوح بس)
  farmMembers = signal<any[]>([]);
  showInviteForm = signal(false);
  inviting = signal(false);
  lastInviteLink = signal<string | null>(null);
  lastInviteCode = signal<string | null>(null); // 🔑 كود الدعوة اللي الباك بيولّده (للمالك بس)
  inviteCodes: Record<string, string> = {};      // 🔑 الكود اللي المدعو بيكتبه لكل دعوة
  pendingInvitesForMe = signal<any[]>([]); // 🔔 دعوات موجهة لإيميلي أنا (لو صاحب الحساب ده كمان مدعو من حد تاني)
  inviteForm: { invited_email: string; role: string; can_add_records: boolean; can_view_financials: boolean } = {
    invited_email: '', role: 'worker', can_add_records: true, can_view_financials: false,
  };

  // 🚨 أحداث حرجة/تنبيهات اليوم (من نفس محرك الأحداث بتاع التقارير)
  todayCriticalEvents = signal<any[]>([]);

  // 📸 صورة مرفقة بالسجل الجاري تسجيله
  selectedPhotoFile = signal<File | null>(null);
  selectedPhotoPreview = signal<string | null>(null);
  photoUploadStatus = signal<'idle' | 'uploading' | 'done' | 'error'>('idle');

  userInputs = {
    mortality: 0,
    feedValue: null as number | null,
    feedUnit: 'kg',
    temperatureCelsius: null as number | null,
    humidityPercent: null as number | null,
    weightValue: null as number | null,
    weightUnit: 'kg',
    eggCount: null as number | null,
    brokenEggCount: null as number | null,
    notes: ''
  };

  // 🥚 سجلات القطيع اليومية (بنستخدمها بشكل خاص لعرض تفاصيل سجلات البياض)
  records = signal<any[]>([]);

  // السجلات اليومية اللي فيها بيض بس (لعرضها في قسم "سجلات البياض")
  eggRecords = () => this.records().filter(r => r.eggCount !== null && r.eggCount !== undefined);

  // 🛡️ استخراج آمن للتاريخ/الوزن من أي سجل، سواء جاي camelCase أو snake_case من الباك إند
  private recordDateStr(r: any): string {
    const d = r?.recordDate ?? r?.record_date ?? '';
    return typeof d === 'string' ? d.slice(0, 10) : '';
  }
  private recordWeight(r: any): number | null {
    const w = r?.avgWeightKg ?? r?.avg_weight_kg ?? r?.weight ?? null;
    return w !== null && w !== undefined ? Number(w) : null;
  }

  // 📅 مساعدين تاريخ السجل (public عشان التمبلت)
  todayStr = () => this.localDateStr();
  minRecordDate = (): string => String((this.flock() as any)?.startDate ?? '').split('T')[0];
  isBackdated = () => !this.editingRecordId() && !!this.newRecordDate() && this.newRecordDate() < this.localDateStr();
  backdatedBeforeRegistration = () => {
    const created = String((this.flock() as any)?.createdAt ?? '').split('T')[0];
    const d = this.newRecordDate();
    return !this.editingRecordId() && !!d && !!created && d < created;
  };

  // ✅ هل اتسجلت بيانات النهاردة للقطيع المفتوح؟
  hasTodayRecord = () => {
    const todayStr = this.localDateStr();
    return this.records().some(r => this.recordDateStr(r) === todayStr)
      || this.pendingRecords().some(p => p.kind === 'create' && p.date === todayStr);
  };

  // 📋 نعرض فورم التسجيل لو: لسه محسجلش النهاردة ومحطتش تخطي، أو المستخدم فتحه يدويًا
  showDailyForm = () => (!this.hasTodayRecord() && !this.skippedToday()) || this.showFormManually();

  // ⚖️ آخر 7 قراءات وزن (الأحدث الأول) — لملخص "سجل الأوزان" في حالة اتسجل اليوم
  recentWeights = () => {
    return this.records()
      .filter(r => this.recordWeight(r) !== null)
      .slice()
      .sort((a, b) => this.recordDateStr(b).localeCompare(this.recordDateStr(a)))
      .slice(0, 7)
      .map(r => ({ date: this.recordDateStr(r), weight: this.recordWeight(r) }));
  };

  skipToday() {
    const id = this.flock()?.id;
    if (!id) return;
    const todayStr = this.localDateStr();
    localStorage.setItem(`daily_reminder_skip:${id}:${todayStr}`, '1');
    this.skippedToday.set(true);
  }

  cancelForm() {
    this.newRecordDate.set('');
    this.showFormManually.set(false);
    this.editingRecordId.set(null);
    this.editingRecordDate.set(null);
    this.selectedPhotoFile.set(null);
    this.selectedPhotoPreview.set(null);
    this.userInputs = {
      mortality: 0, feedValue: null, feedUnit: 'kg', temperatureCelsius: null, humidityPercent: null,
      weightValue: null, weightUnit: 'kg', eggCount: null, brokenEggCount: null, notes: '',
    };
  }

  loadMyAccess(flockId: string) {
    this.http.get<any>(`${environment.apiUrl}/flocks/${flockId}/my-access`)
      .subscribe({
        next: (res) => {
          this.myAccess.set(res);
          // لو كان فاتح تاب "الفريق" وطلع مش صاحب الحساب، نرجعه لـ "اليوم" بدل ما يفضل على تاب مخفي
          if (!res.is_owner && this.activeSection() === 'team') this.activeSection.set('today');
        },
        error: () => this.myAccess.set(null),
      });
  }

  // 💊 سجل العلاج
  loadTreatments(flockId: string) {
    this.http.get<any[]>(`${environment.apiUrl}/flocks/${flockId}/treatments`)
      .subscribe({ next: (res) => this.treatments.set(res || []), error: () => this.treatments.set([]) });
  }

  loadTreatmentPlan(flockId: string) {
    this.http.get<any>(`${environment.apiUrl}/flocks/${flockId}/treatment-plan`)
      .subscribe({ next: (res) => this.treatmentPlan.set(res), error: () => this.treatmentPlan.set(null) });
  }

  /** بيملّي فورم العلاج من بند في العلاجات المتوقعة — المستخدم يراجع ويحفظ */
  logPlannedTreatment(it: any) {
    const today = new Date().toISOString().slice(0, 10);
    this.treatmentForm = {
      drug_name: it.name_ar, category: it.category || 'other',
      start_date: today, end_date: today, withdrawal_days: 0, reason: 'ضمن برنامج الدورة',
    };
    this.showTreatmentForm.set(true);
  }

  saveTreatment() {
    const flockId = this.flock()?.id;
    if (!flockId || !this.treatmentForm.drug_name) return;
    this.http.post(`${environment.apiUrl}/flocks/${flockId}/treatments`, this.treatmentForm)
      .subscribe({
        next: () => {
          this.showTreatmentForm.set(false);
          this.treatmentForm = { drug_name: '', category: 'antibiotic', start_date: new Date().toISOString().slice(0, 10), end_date: new Date().toISOString().slice(0, 10), withdrawal_days: 0, reason: '' };
          this.loadTreatments(flockId);
        },
        error: () => alert('حصل خطأ أثناء حفظ العلاج'),
      });
  }

  deleteTreatment(t: any) {
    const flockId = this.flock()?.id;
    if (!flockId || !confirm(`تمسح سجل علاج ${t.drug_name}؟`)) return;
    this.http.delete(`${environment.apiUrl}/flocks/${flockId}/treatments/${t.id}`)
      .subscribe({ next: () => this.loadTreatments(flockId), error: () => alert('حصل خطأ أثناء الحذف') });
  }

  // ✅ مهام اليوم
  loadTodayTasks(flockId: string) {
    this.http.get<any[]>(`${environment.apiUrl}/flocks/${flockId}/tasks/today`)
      .subscribe({ next: (res) => this.todayTasks.set(res || []), error: () => this.todayTasks.set([]) });
  }

  // 📆 برنامج الدورة يوم بيوم
  loadCycleProgram(flockId: string) {
    const cacheKey = `cycle_full:${flockId}`;
    // البرنامج الكامل: من السيرفر لو فيه نت (ونخزّنه للمستخدم الحالي بس)، وإلا من نسخته المخزّنة
    this.http.get<any>(`${environment.apiUrl}/flocks/${flockId}/cycle-program/full`).subscribe({
      next: (res) => {
        if (res?.has_program) { this.fullProgram.set(res); void this.cacheSet(cacheKey, res); }
        else this.fullProgram.set(null);
      },
      error: async () => this.fullProgram.set(await this.cacheGet(cacheKey)),
    });
    // مستهدفات اليوم: من السيرفر (فيها النصايح)، ولو مفيش نت نحسبها من النسخة المخزّنة
    this.http.get<any>(`${environment.apiUrl}/flocks/${flockId}/cycle-program`).subscribe({
      next: (res) => this.cycleProgram.set(res),
      error: async () => this.cycleProgram.set(await this.offlineTodayProgram(flockId, await this.cacheGet(cacheKey))),
    });
  }

  // 📴 نفس شكل رد /cycle-program بس محسوب محليًا من البرنامج الكامل المخزّن (من غير نصايح — دي محتاجة السيرفر)
  private async offlineTodayProgram(flockId: string, full: any): Promise<any | null> {
    if (!full?.has_program) return null;
    const startStr = this.flock()?.startDate ?? (await this.cacheGet(`flock_cache:${flockId}`))?.startDate;
    if (!startStr) return null;
    const parts = String(startStr).split('T')[0].split('-');
    if (parts.length !== 3) return null;
    const start = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const today = new Date();
    start.setHours(0, 0, 0, 0); today.setHours(0, 0, 0, 0);
    const raw = Math.max(0, Math.round((today.getTime() - start.getTime()) / 86400000));
    const age = full.is_repeating ? raw % full.cycle_length : raw;
    const lookup = full.is_repeating ? age : Math.max(age, 1);
    const days: any[] = full.days || [];
    const d = days.find(x => x.day === lookup) ?? (lookup > full.last_day ? days[days.length - 1] : days[0]);
    if (!d) return null;
    const phase = d.phase_index != null ? (full.phases?.[d.phase_index] ?? null) : null;
    return {
      has_program: true, offline: true,
      age_days: age, is_repeating: full.is_repeating,
      cycle_number: full.is_repeating ? Math.floor(raw / full.cycle_length) + 1 : null,
      today_phase: phase, today_phase_index: d.phase_index,
      is_phase_transition_today: !!phase && phase.day_from === lookup && lookup > (full.first_day ?? 1),
      phases: full.phases,
      target_temperature_today: d.temperature, target_weight_g_today: d.weight_g,
      target_feed_g_per_bird_today: d.feed_g_per_bird, target_water_ml_today: d.water_ml_per_bird,
      lighting_today: d.lighting,
      advice: [], housing_note: null, housing_guide: null, breed_matched: false,
      feed_amount_note: '📴 الأرقام دي من نسخة مخزّنة على جهازك. نصايح اليوم (مقارنة سجلاتك بالمستهدف) هتظهر أول ما النت يرجع.',
    };
  }

  // 📊 تقرير الالتزام بالبرنامج على مدار الدورة كاملة
  loadAdherenceReport(flockId: string) {
    this.http.get<any>(`${environment.apiUrl}/flocks/${flockId}/cycle-program/adherence-report`)
      .subscribe({ next: (res) => this.adherenceReport.set(res), error: () => this.adherenceReport.set(null) });
  }

  saveTask() {
    const flockId = this.flock()?.id;
    if (!flockId || !this.taskForm.title) return;
    this.http.post(`${environment.apiUrl}/flocks/${flockId}/tasks`, this.taskForm)
      .subscribe({
        next: () => {
          this.showTaskForm.set(false);
          this.taskForm = { title: '', description: '' };
          this.loadTodayTasks(flockId);
        },
        error: () => alert('حصل خطأ أثناء حفظ المهمة'),
      });
  }

  toggleTaskToday(t: any) {
    const flockId = this.flock()?.id;
    if (!flockId) return;
    const wasCompleted = t.completed_today;
    const req = wasCompleted
      ? this.http.delete(`${environment.apiUrl}/flocks/${flockId}/tasks/${t.id}/complete`)
      : this.http.post(`${environment.apiUrl}/flocks/${flockId}/tasks/${t.id}/complete`, {});
    req.subscribe({
      next: () => this.loadTodayTasks(flockId),
      error: () => alert('حصل خطأ أثناء تحديث المهمة'),
    });
  }

  deleteTask(t: any) {
    const flockId = this.flock()?.id;
    if (!flockId || !confirm(`تمسح مهمة "${t.title}" نهائيًا؟`)) return;
    this.http.delete(`${environment.apiUrl}/flocks/${flockId}/tasks/${t.id}`)
      .subscribe({ next: () => this.loadTodayTasks(flockId), error: () => alert('حصل خطأ أثناء الحذف') });
  }

  // 👷 دعوة الأعضاء — نفس endpoints صفحة /team، هنا بس عشان تكون قريبة من مكان الاستخدام
  loadFarmMembers() {
    this.http.get<any[]>(`${environment.apiUrl}/farm-members`)
      .subscribe({ next: (res) => this.farmMembers.set(res || []), error: () => this.farmMembers.set([]) });
  }

  sendInvite() {
    if (!this.inviteForm.invited_email) return;

    this.inviting.set(true);
    this.http.post<any>(`${environment.apiUrl}/farm-members/invite`, this.inviteForm)
      .subscribe({
        next: (res) => {
          this.inviting.set(false);
          // ⚠️ إرسال إيميل حقيقي مش موجود لسه — اللينك ده لازم يتبعت يدويًا للعضو
          // 🌐 لينك الموقع نفسه (مش لينك القطيع/الدعوة) — العضو يسجّل حساب وبعدين الدعوة تظهرله جوه التطبيق
          this.lastInviteLink.set(window.location.origin);
          this.lastInviteCode.set(res?.invite_code ?? null);
          this.inviteForm = { invited_email: '', role: 'worker', can_add_records: true, can_view_financials: false };
          this.loadFarmMembers();
        },
        error: (err) => {
          this.inviting.set(false);
          const detail = err?.error?.detail;
          alert(typeof detail === 'string' ? detail : 'حصل خطأ أثناء إرسال الدعوة');
        },
      });
  }

  revokeMember(m: any) {
    if (!confirm(`متأكد إنك عايز تلغي صلاحية ${m.invited_email}؟`)) return;
    this.http.delete(`${environment.apiUrl}/farm-members/${m.id}`)
      .subscribe({ next: () => this.loadFarmMembers(), error: () => alert('حصل خطأ أثناء الإلغاء') });
  }

  // 🧑‍🔧 اسم الدور بالعربي (long = للجمل، المختصر للقوايم)
  roleLabel(role: string, long = false): string {
    const m: Record<string, [string, string]> = {
      worker: ['عامل', 'عامل مزرعة'], vet: ['بيطري', 'طبيب بيطري'], engineer: ['مهندس', 'مهندس'],
    };
    return (m[role] ?? [role, role])[long ? 1 : 0];
  }

  memberStatusLabel(status: string): string {
    return ({ pending: 'بانتظار الموافقة', active: 'نشط', revoked: 'ملغي', rejected: 'مرفوض' } as Record<string, string>)[status] ?? status;
  }

  // 🔔 دعوات موجهة لإيميلي أنا (مش اللي أنا بعتها)
  loadPendingInvitesForMe() {
    this.http.get<any[]>(`${environment.apiUrl}/farm-members/pending-for-me`)
      .subscribe({ next: (res) => this.pendingInvitesForMe.set(res || []), error: () => this.pendingInvitesForMe.set([]) });
  }

  acceptInviteForMe(inv: any) {
    const code = (this.inviteCodes[inv.id] || '').trim();
    if (code.length < 6) return;
    this.http.post(`${environment.apiUrl}/farm-members/${inv.id}/accept`, { code })
      .subscribe({
        next: () => { delete this.inviteCodes[inv.id]; this.loadPendingInvitesForMe(); },
        error: (err) => {
          const detail = err?.error?.detail;
          alert(typeof detail === 'string' ? detail : 'حصل خطأ أثناء قبول الدعوة');
        },
      });
  }

  rejectInviteForMe(inv: any) {
    this.http.post(`${environment.apiUrl}/farm-members/${inv.id}/reject`, {})
      .subscribe({ next: () => this.loadPendingInvitesForMe(), error: () => alert('حصل خطأ أثناء رفض الدعوة') });
  }

  // 📱 مشاركة لينك الدعوة عبر واتساب/تيليجرام — مجرد رابط، مفيش API ولا حساب مدفوع مطلوب
  whatsappShareUrl(): string {
    const code = this.lastInviteCode();
    const text = `تمت دعوتك للانضمام كعضو في إدارة القطعان. ادخل على حسابك (بنفس الإيميل اللي اتدعيت عليه) وهتلاقي الدعوة جوه التطبيق: ${this.lastInviteLink()}` +
      (code ? `\nكود الدعوة: ${code}` : '');
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }
  telegramShareUrl(): string {
    return `https://t.me/share/url?url=${encodeURIComponent(this.lastInviteLink() || '')}&text=${encodeURIComponent('تمت دعوتك للانضمام كعضو في إدارة القطعان — ادخل على حسابك' + (this.lastInviteCode() ? `\nكود الدعوة: ${this.lastInviteCode()}` : ''))}`;
  }

  // 💉 دمج الجدول الاسترشادي (أسماء/طريقة) مع حالة التنفيذ الحقيقية من الداتابيز
  vaccRows = () => {
    const dbList = this.dbVaccinations();
    return this.vaccSchedule().map((v: any) => {
      const dbRow = dbList.find(d => d.scheduled_day === v.day);
      return { ...v, completed: dbRow?.completed ?? false, dbId: dbRow?.id ?? null };
    });
  };

  loadVaccinations(id: string) {
    const items = this.vaccSchedule().map((v: any) => ({ day: v.day, name_ar: v.nameAr, method: v.method }));
    this.http.post<any[]>(`${environment.apiUrl}/flocks/${id}/vaccinations/sync`, { items })
      .subscribe({
        next: (rows) => this.dbVaccinations.set(rows || []),
        error: () => this.dbVaccinations.set([]),
      });
  }

  // ⏳ تحصينات فات موعدها ولسه مش متأكدين من تنفيذها (نفس شرط عرض ⚠️ في الجدول)
  pastDueVaccCount = () =>
    this.vaccRows().filter((v: any) => !v.completed && v.dbId && this.calculatedAge() > v.day).length;

  completeAllPastVacc() {
    const flockId = this.flock()?.id;
    if (!flockId) return;
    const n = this.pastDueVaccCount();
    if (!n) return;
    if (!confirm(`تأكيد إن ${n} تحصين فات موعدهم اتنفذوا؟ تقدر ترجّع أي واحد منهم بزرار "تراجع".`)) return;
    this.http.post<any[]>(`${environment.apiUrl}/flocks/${flockId}/vaccinations/complete-past`, {})
      .subscribe({
        next: (rows) => this.dbVaccinations.set(rows || []),
        error: () => alert('حصل خطأ أثناء تأكيد التحصينات'),
      });
  }

  toggleVaccination(row: any) {
    const flockId = this.flock()?.id;
    if (!flockId || !row.dbId) return;
    const completed = !row.completed;
    this.http.patch(`${environment.apiUrl}/flocks/${flockId}/vaccinations/${row.dbId}`, { completed })
      .subscribe({
        next: () => this.dbVaccinations.update(list => list.map(d => d.id === row.dbId ? { ...d, completed } : d)),
        error: () => alert('حصل خطأ أثناء تحديث حالة التحصين'),
      });
  }

  // 🚨 أي أحداث حرجة/تنبيهات اليوم من نفس منطق التقارير — بيفشل بهدوء لو المستخدم مش Pro
  loadTodayEvents(id: string) {
    this.http.get<any>(`${environment.apiUrl}/reports/daily?flock_id=${id}`).subscribe({
      next: (res) => {
        const events = (res?.events || []).filter((e: any) => e.severity === 'critical' || e.severity === 'warning');
        this.todayCriticalEvents.set(events);
      },
      error: () => this.todayCriticalEvents.set([]),
    });
  }

  // 📜 مساعدين لعرض جدول السجلات السابقة بأي صيغة حقول جاية (camelCase/snake_case)
  recordDateOf(r: any): string { return this.recordDateStr(r); }
  recordWeightOf(r: any): number | null { return this.recordWeight(r); }
  // 👤 مين سجّل / مين عدّل — الاسم من السجل نفسه (الـ API الجديد)، وخريطة recorded-by القديمة كاحتياطي
  private myUserId(): string | null { const id = (this.auth.currentUser() as any)?.id; return id != null ? String(id) : null; }
  authorOf(r: any): string | null {
    const name = r?.createdByName ?? this.recordedByMap()[r?.id] ?? null;
    if (!name) return null;
    return r.createdById && r.createdById === this.myUserId() ? 'أنت' : name;
  }
  editorOf(r: any): string | null {
    if (!r?.updatedByName || !r?.updatedAt) return null;
    return r.updatedById && r.updatedById === this.myUserId() ? 'أنت' : r.updatedByName;
  }

  pastRecordsSorted = () => this.records().slice().sort((a, b) => this.recordDateStr(b).localeCompare(this.recordDateStr(a)));

  startEditRecord(r: any) {
    this.editingRecordId.set(r.id);
    this.editingRecordDate.set(this.recordDateStr(r));
    this.userInputs = {
      mortality: r.mortality ?? 0,
      feedValue: this.recordFeed(r),
      feedUnit: 'kg',
      temperatureCelsius: r.temperatureCelsius ?? r.temperature_celsius ?? null,
      humidityPercent: r.humidityPercent ?? r.humidity_percent ?? null,
      weightValue: this.recordWeight(r),
      weightUnit: 'kg',
      eggCount: r.eggCount ?? r.egg_count ?? null,
      brokenEggCount: r.brokenEggCount ?? r.broken_egg_count ?? null,
      notes: r.notes ?? '',
    };
    this.showFormManually.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private recordFeed(r: any): number | null {
    const f = r?.feedConsumedKg ?? r?.feed_consumed_kg ?? null;
    return f !== null && f !== undefined ? Number(f) : null;
  }

  deletePastRecord(r: any) {
    const flockId = this.flock()?.id;
    if (!flockId || !r.id) return;
    if (!confirm(`متأكد إنك عايز تمسح سجل يوم ${this.recordDateOf(r)}؟`)) return;
    this.http.delete(`${environment.apiUrl}/flocks/${flockId}/records/${r.id}`).subscribe({
      next: () => this.loadData(flockId),
      error: () => alert('حصل خطأ أثناء حذف السجل'),
    });
  }

  onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.selectedPhotoFile.set(file);
    this.photoUploadStatus.set('idle');
    const reader = new FileReader();
    reader.onload = () => this.selectedPhotoPreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  private uploadPendingPhoto(flockId: string, recordId: string) {
    const file = this.selectedPhotoFile();
    if (!file) return;
    this.photoUploadStatus.set('uploading');
    const formData = new FormData();
    formData.append('file', file);
    this.http.post(`${environment.apiUrl}/flocks/${flockId}/records/${recordId}/photo`, formData)
      .subscribe({
        next: () => {
          this.photoUploadStatus.set('done');
          this.selectedPhotoFile.set(null);
          this.selectedPhotoPreview.set(null);
          this.loadData(flockId);
        },
        error: () => this.photoUploadStatus.set('error'),
      });
  }


  calculatedAge = () => {
    const f = this.flock();
    if (!f || !f.startDate) return 0;
    const start = new Date(f.startDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays < 150 ? diffDays : f.ageInDays;
  };

  // 📡 دالة تحديد جدول التحصينات الذكية بناءً على الـ 4 أنواع بالكامل
vaccSchedule = () => {
  switch (this.flock()?.type) {
    case 'broiler':
      return BROILER_VACC;

    case 'layer':
      return LAYER_VACC;

    case 'rabbit':
      return RABBIT_VACC;

    case 'turkey':
      return TURKEY_VACC;

    case 'duck':
      return DUCK_VACC;

    case 'quail':
      return QUAIL_VACC;

    default:
      return BROILER_VACC;
  }
};

  kpis = (): { icon: string; label: string; value: any; color: string; note?: string }[] => {
    const a = this.analytics() as any;
    if (!a) return [];
    
    const isLayer = this.flock()?.type === 'layer';

    // 🥚 مؤشرات مخصوصة لقطعان البياض - إنتاج البيض هو الأهم، مش التسمين والذبح
    if (isLayer) {
      const eggs = this.eggRecords();
      const lastEggCount = eggs.length ? Number(eggs[eggs.length - 1].eggCount ?? 0) : 0;
      const totalEggs = Number(a['total_eggs'] ?? a.totalEggs ?? eggs.reduce((s, r) => s + Number(r.eggCount ?? 0), 0));
      const currentCount = this.flock()?.currentCount ?? 0;
      const layRate = currentCount > 0 ? (lastEggCount / currentCount) * 100 : 0;

      return [
        {
          icon: '🥚',
          label: 'نسبة الإنتاج',
          value: layRate.toFixed(1) + '%',
          color: '#d97706'
        },
        {
          icon: '📦',
          label: 'إجمالي البيض',
          value: totalEggs,
          color: '#b45309'
        },
        {
          icon: '💔',
          label: 'بيض مكسور (إجمالي)',
          value: eggs.reduce((s, r) => s + Number(r.brokenEggCount ?? 0), 0),
          color: '#dc2626'
        },
        {
          icon: '🌾',
          label: 'إجمالي العلف',
          value: (Number(a['total_feed_kg'] ?? a.totalFeedKg ?? 0)).toFixed(0) + ' kg',
          color: '#92400e'
        },
        {
          icon: '📉',
          label: 'نسبة النفوق',
          value: (Number(a['mortality_rate'] ?? a.mortalityRate ?? 0)).toFixed(1) + '%',
          color: '#dc2626'
        },
        {
          icon: '📅',
          label: 'عمر القطيع (أسابيع)',
          value: Math.floor(this.calculatedAge() / 7),
          color: 'var(--c-text)'
        },
      ];
    }

    return [
      { 
        icon: '⚖️', 
        label: 'معدل التحويل',   
        value: a.fcr ? Number(a.fcr).toFixed(2) : '0.00', 
        color: 'var(--c-primary)',
        // 📊 قطيع شغال قبل التطبيق / أيام ناقصة: العلف المسجل مش كل العلف الحقيقي
        note: (a['is_partial'] ?? a.isPartial) ? 'بيانات جزئية' : undefined
      },
      { 
        icon: '📉', 
        label: 'نسبة النفوق',    
        value: (Number(a['mortality_rate'] ?? a.mortalityRate ?? 0)).toFixed(1) + '%',  
        color: '#dc2626' 
      },
      { 
        icon: '📈', 
        label: 'الزيادة اليومية',   
        value: (Number(a['avg_daily_gain'] ?? a.avgDailyGain ?? 0)).toFixed(3) + ' kg', 
        color: '#1d4ed8' 
      },
      { 
        icon: '🌾', 
        label: 'إجمالي العلف',   
        value: (Number(a['total_feed_kg'] ?? a.totalFeedKg ?? 0)).toFixed(0) + ' kg',  
        color: '#92400e' 
      },
      { 
        icon: '💀', 
        label: 'إجمالي النفوق',   
        value: a['total_mortality'] ?? a.totalMortality ?? 0,                                  
        color: '#dc2626' 
      },
      { 
        icon: '📅', 
        label: 'موعد الذبح', 
        value: (a['projected_slaughter_date'] ?? a.projectedSlaughterDate)?.slice(5) ?? '--/--', 
        color: 'var(--c-text)' 
      },
    ];
  };

  maxW = () => {
    const pts = this.analytics()?.weightHistory ?? [];
    if (pts.length === 0) return 1;
    return Math.max(...pts.map(p => p.weight), 0.1);
  };

  // 🥚 أعلى قيمة بيض في السجلات - لرسم الشارت بنسبة صحيحة
  maxEgg = () => {
    const pts = this.eggRecords();
    if (pts.length === 0) return 1;
    return Math.max(...pts.map((p: any) => Number(p.eggCount ?? 0)), 1);
  };

  barH(val: number, max: number) { return Math.max(4, (val / max) * 100); }

  /** 📈 بيبني بيانات رسم خطي (SVG) من قايمة {label, value} — بيتحسب مرة واحدة لكل تغيير في السجلات */
  private buildLineChart(data: { label: string; value: number }[]) {
    if (data.length === 0) return null;
    const W = 320, H = 170, L = 36, R = 12, T = 14, B = 26;
    const vals = data.map(d => d.value);
    let min = Math.min(...vals), max = Math.max(...vals);
    if (min === max) { min = min * 0.9; max = (max * 1.1) || 1; }
    const pad = (max - min) * 0.1;
    min = Math.max(0, min - pad); max = max + pad;
    const r1 = (n: number) => Math.round(n * 10) / 10;
    const fmt = (v: number) => (v >= 100 ? String(Math.round(v)) : String(Math.round(v * 100) / 100));
    const x = (i: number) => data.length === 1 ? L + (W - L - R) / 2 : L + (i * (W - L - R)) / (data.length - 1);
    const y = (v: number) => T + (1 - (v - min) / (max - min)) * (H - T - B);
    const pts = data.map((d, i) => ({ x: r1(x(i)), y: r1(y(d.value)), label: d.label, value: d.value }));
    const line = pts.map(p => p.x + ',' + p.y).join(' ');
    const area = pts.length > 1 ? (pts[0].x + ',' + (H - B) + ' ' + line + ' ' + pts[pts.length - 1].x + ',' + (H - B)) : '';
    const ticks = [0, 1, 2, 3].map(i => { const v = min + ((max - min) * i) / 3; return { y: r1(y(v)), label: fmt(v) }; });
    return { W, H, L, R, pts, line, area, ticks, step: Math.max(1, Math.ceil(data.length / 7)) };
  }

  // 🥚 رسم خطي لإنتاج البيض (آخر 14 سجل)
  eggChart = computed(() => {
    const data = this.records()
      .filter(r => (r.eggCount ?? r.egg_count) !== null && (r.eggCount ?? r.egg_count) !== undefined)
      .slice()
      .sort((a, b) => this.recordDateStr(a).localeCompare(this.recordDateStr(b)))
      .slice(-14)
      .map(r => ({ label: this.recordDateStr(r).slice(5), value: Number(r.eggCount ?? r.egg_count ?? 0) }));
    return this.buildLineChart(data);
  });

  // ⚖️ رسم خطي للوزن — بيتخطى الأيام اللي مفيهاش وزن (الوزن اختياري)
  weightChart = computed(() => {
    const a: any = this.analytics();
    const hist: any[] = a?.weight_history || a?.weightHistory || [];
    let data = hist
      .map(p => ({ label: String(p?.record_date || p?.date || '').slice(5), value: Number(p?.avg_weight_kg ?? p?.weight ?? 0) }))
      .filter(d => d.value > 0);
    if (data.length === 0) {
      data = this.records()
        .filter(r => this.recordWeight(r) !== null && (this.recordWeight(r) as number) > 0)
        .slice()
        .sort((x, y) => this.recordDateStr(x).localeCompare(this.recordDateStr(y)))
        .map(r => ({ label: this.recordDateStr(r).slice(5), value: this.recordWeight(r) as number }));
    }
    return this.buildLineChart(data.slice(-14));
  });

  ngOnInit() {
    // 🔄 بنشترك في تغييرات الـ paramMap بدل ما ناخد الـ id مرة واحدة بس من الـ snapshot.
    // ده ضروري لأن Angular بيعيد استخدام نفس الكومبوننت لما تنتقل من قطيع لقطيع تاني
    // (بدل ما يعمل تدمير وإنشاء جديد)، فلو اكتفينا بالـ snapshot، بيانات القطيع
    // القديم (وحالته active/closed) كانت بتفضل ظاهرة غلط حتى بعد ما تفتح قطيع تاني.
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadData(id);
      }
    });

    // 🔔 جاي من dailyRecordGuard؟ (فتح تلقائي على فورم تسجيل بيانات اليوم)
    this.route.queryParamMap.subscribe(qp => {
      this.promptDaily.set(qp.get('prompt') === 'daily');
    });

    this.syncPending(); // 📴 لو فيه سجلات متخزّنة من وقت ما النت كان فاصل
  }

  loadData(id: string) {
    this.activeFlockId = id;
    this.refreshPendingSignal();
    // 🔁 إعادة ضبط حالة الفورم/التخطي لأي قطيع جديد (الكومبوننت بيتعاد استخدامه)
    this.newRecordDate.set('');
    this.showFormManually.set(false);
    this.editingRecordId.set(null);
    this.selectedPhotoFile.set(null);
    this.selectedPhotoPreview.set(null);
    this.photoUploadStatus.set('idle');
    const todayStr = this.localDateStr();
    this.skippedToday.set(localStorage.getItem(`daily_reminder_skip:${id}:${todayStr}`) === '1');

this.svc.getFlock(id).subscribe({ next: (dataFromBackend) => {
  if (dataFromBackend) {
    const raw = dataFromBackend as any;
    
    // 1. جلب قائمة السجلات اليومية من الـ Payload
    const records: any[] = raw.daily_records ?? raw.records ?? [];
    
    let age = 0;

    // 🟢 العمر بيتحسب من تاريخ بدء القطيع دايماً (مهم للقطيع الشغال بالفعل اللي سجلاته بدأت متأخر).
    // الحساب من السجلات بقى احتياطي بس لو تاريخ البدء مش موجود.
    if (!(raw.start_date ?? raw.startDate) && records.length > 0) {
      // استخراج كافة التواريخ المسجلة
      const dates = records
        .map(r => r.record_date ?? r.recordDate)
        .filter(Boolean)
        .sort();

      if (dates.length > 0) {
        const firstDate = new Date(String(dates[0]).split('T')[0]);
        const lastDate = new Date(String(dates[dates.length - 1]).split('T')[0]);
        
        // حساب الأيام بين أول سجل وأحدث سجل + 1
        const diffDays = Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        age = Math.max(records.length, diffDays);
      } else {
        age = records.length;
      }
    } else {
      // في حالة عدم وجود سجلات، يتم الطرح من تاريخ البداية
      const startDateStr = raw.start_date ?? raw.startDate;
      if (startDateStr) {
        const parts = String(startDateStr).split('T')[0].split('-');
        if (parts.length === 3) {
          const start = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          const today = new Date();
          start.setHours(0, 0, 0, 0);
          today.setHours(0, 0, 0, 0);
          age = Math.max(0, Math.round((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        }
      }
    }

    const initial = raw.initial_count ?? raw.initialCount ?? 1400;
    const current = raw.current_count ?? raw.currentCount ?? initial;

    const flockObj: any = {
      id: dataFromBackend.id,
      userId: raw.user_id ?? raw.userId,
      name: dataFromBackend.name,
      type: dataFromBackend.type as any,
      initialCount: initial,
      currentCount: current,
      startDate: raw.start_date ?? raw.startDate,
      status: dataFromBackend.status as any,
      ageInDays: age, // 👈 سيعرض الآن عدد الأيام الفعلي المسجل في البيانات فوراً
      mortalityRate: raw.mortality_rate ?? raw.mortalityRate ?? 0,
      createdAt: raw.created_at ?? raw.createdAt,
      breed: dataFromBackend.breed
    };
    this.flock.set(flockObj);
    void this.cacheSet(`flock_cache:${id}`, flockObj); // 📴 نسخة محلية (موبايل بس، ومربوطة بالمستخدم) عشان الشاشة تفتح من غير نت
  }
}, error: async () => {
  const cached = await this.cacheGet(`flock_cache:${id}`);
  if (cached) this.flock.set(cached);
} });
    this.svc.getAnalytics(id).subscribe(a => this.analytics.set(a));
    this.loadHealthScore(id);
    this.loadTodayEvents(id);
    this.loadTreatments(id);
    this.loadTreatmentPlan(id);
    this.loadTodayTasks(id);
    this.loadCycleProgram(id);
    this.loadAdherenceReport(id);
    this.loadFarmMembers();
    this.loadPendingInvitesForMe();
    this.loadMyAccess(id);       // 🐛 كانت متعرّفة بس مش متنادى عليها — myAccess() كان فاضل null دايمًا
    this.loadVaccinations(id);   // 🐛 السبب الأساسي: كانت متعرّفة بس مش متنادى عليها هنا، فـ dbVaccinations()
                                  // كانت فاضلة [] دايمًا، وكل صف تحصين كان بياخد dbId: null، فزرار "اتنفذ"
                                  // كان بيدخل على toggleVaccination() ويرجع فورًا من غير ما يعمل أي حاجة
                                  // (شوف الشرط if (!flockId || !row.dbId) return;)
    // 🥚 تحميل السجلات اليومية (بنستخدمها في عرض سجلات البياض + التحقق من تسجيل اليوم)
    this.svc.getRecords(id).subscribe({
      next: (recs) => { this.records.set(recs || []); void this.cacheSet(`records_cache:${id}`, recs || []); },
      error: async () => this.records.set((await this.cacheGet(`records_cache:${id}`)) ?? [])
    });
    // 👤 مين سجّل كل سجل — منفصلة عن getRecords لأن DailyRecordOut schema لسه مفيهاش recorded_by_user_id
    this.http.get<Record<string, string>>(`${environment.apiUrl}/flocks/${id}/records/recorded-by`)
      .subscribe({ next: (res) => this.recordedByMap.set(res || {}), error: () => this.recordedByMap.set({}) });
  }


  loadHealthScore(id: string) {
    this.http.get<any>(`${environment.apiUrl}/ai/health-score?flock_id=${id}`).subscribe({
      next: (res) => this.healthScore.set(res),
      error: () => this.healthScore.set(null),
    });
  }

  closeFlock() {
    const flockId = this.flock()?.id;
    if (!flockId) return;
    if (!confirm('هل أنت متأكد من قفل الدورة؟ الإجراء ده نهائي.')) return;

    this.closingFlock.set(true);
    this.http.patch(`${environment.apiUrl}/flocks/${flockId}/close`, {}).subscribe({
      next: () => {
        this.closingFlock.set(false);
        this.showSurvey.set(true);
        this.loadData(flockId);
      },
      error: () => {
        this.closingFlock.set(false);
        alert('حصل خطأ أثناء قفل الدورة.');
      }
    });
  }

  downloadCertificate() {
    const flockId = this.flock()?.id;
    if (!flockId) return;
    this.http.get(`${environment.apiUrl}/reports/certificate/pdf?flock_id=${flockId}`, {
      responseType: 'blob',
    }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `شهادة_قطيع_${this.flock()?.name || flockId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => alert('حصل خطأ أثناء تحميل الشهادة'),
    });
  }

  onSurveyDone() {
    const flockId = this.flock()?.id;
    setTimeout(() => {
      this.showSurvey.set(false);
      // 🧹 مسح القطيع من قايمة القطعان في الفرونت بعد ما الدورة اتقفلت والتقييم خلص
      if (flockId) {
        this.svc.removeFlockLocally(flockId);
      }
      // نرجع المستخدم لقايمة القطعان بعد ما القطيع ده خلص دوره
      this.router.navigate(['/flocks']);
    }, 2000);
  }

  saveRecord() {
    const flockId = this.flock()?.id;
    if (!flockId) {
      alert('خطأ: لم يتم تحميل بيانات القطيع الحالي.');
      return;
    }

    // 📅 تحقق من تاريخ السجل الجديد (التعديل بيستخدم تاريخ السجل نفسه)
    if (!this.editingRecordId()) {
      const d = this.newRecordDate() || this.localDateStr();
      const start = this.minRecordDate();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { alert('اختار تاريخ صحيح للسجل.'); return; }
      if (d > this.localDateStr()) { alert('مينفعش تسجّل ليوم لسه ماجاش.'); return; }
      if (start && d < start) { alert(`التاريخ ده قبل بدء القطيع (${start}).`); return; }
      const duplicate = this.records().some(r => this.recordDateStr(r) === d)
        || this.pendingRecords().some(p => p.kind === 'create' && p.date === d);
      if (duplicate) {
        alert('فيه سجل متسجل ليوم ده بالفعل. افتحه من جدول السجلات السابقة واضغط تعديل.');
        return;
      }
    }

    this.saving.set(true);

    let finalFeedKg = Number(this.userInputs.feedValue || 0);
    if (this.userInputs.feedUnit === 'ton') {
      finalFeedKg = finalFeedKg * 1000;
    } else if (this.userInputs.feedUnit === 'gm') {
      finalFeedKg = finalFeedKg / 1000;
    }

    let finalWeightKg = this.userInputs.weightValue ? Number(this.userInputs.weightValue) : null;
    if (finalWeightKg && this.userInputs.weightUnit === 'gm') {
      finalWeightKg = finalWeightKg / 1000;
    }

    const isEditing = !!this.editingRecordId();
    const targetDateStr = isEditing
      ? (this.editingRecordDate() as string)
      : (this.newRecordDate() || this.localDateStr());

    const commonFields = {
      mortality: this.userInputs.mortality ? Number(this.userInputs.mortality) : 0,
      feed_consumed_kg: (this.userInputs.feedValue !== null) ? Number(finalFeedKg) : 0.0,
      temperature_celsius: (this.userInputs.temperatureCelsius !== null) ? Number(this.userInputs.temperatureCelsius) : null,
      // 💧 الرطوبة اختيارية: بتتبعت بس لو المستخدم كتبها
      ...(this.userInputs.humidityPercent !== null && this.userInputs.humidityPercent !== undefined && (this.userInputs.humidityPercent as any) !== ''
        ? { humidity_percent: Number(this.userInputs.humidityPercent) } : {}),
      avg_weight_kg: finalWeightKg !== null ? Number(finalWeightKg) : null,
      egg_count: (this.userInputs.eggCount !== null && this.userInputs.eggCount !== undefined) ? Number(this.userInputs.eggCount) : null,
      broken_egg_count: (this.userInputs.brokenEggCount !== null && this.userInputs.brokenEggCount !== undefined) ? Number(this.userInputs.brokenEggCount) : null,
      notes: this.userInputs.notes || null,
    };

    const resetForm = () => {
      this.userInputs = {
        mortality: 0, feedValue: null, feedUnit: 'kg', temperatureCelsius: null, humidityPercent: null,
        weightValue: null, weightUnit: 'kg', eggCount: null, brokenEggCount: null, notes: '',
      };
      this.editingRecordId.set(null);
      this.editingRecordDate.set(null);
      this.newRecordDate.set('');
    };

    // 📴 مفيش نت: نخزّن السجل على الجهاز (موبايل بس) وهيتبعت أول ما النت يرجع (التحليلات بتتحدّث بعدها)
    const queueOffline = async () => {
      if (!this.store.enabled) {
        // ويب: مفيش تخزين محلي (سياسة الأمان) — مانقدرش نحفظ من غير نت، والبيانات فاضلة في الفورم
        this.saving.set(false);
        alert('مفيش اتصال بالنت. على الويب لازم نت عشان تسجّل — جرّب تاني لما النت يرجع، أو استخدم تطبيق الموبايل للتسجيل من غير نت.');
        return;
      }
      const hadPhoto = !!this.selectedPhotoFile();
      const saved = await this.queueRecord({
        kind: isEditing ? 'patch' : 'create',
        flockId,
        recordId: isEditing ? this.editingRecordId() : null,
        date: targetDateStr,
        payload: isEditing ? commonFields : { flock_id: flockId, record_date: targetDateStr, water_consumed_l: null, ...commonFields },
      });
      this.saving.set(false);
      if (!saved) {
        // ✅ مانقولش "اتحفظ" لو التخزين فشل — وبنسيب البيانات في الفورم عشان متضيعش
        alert('مقدرناش نحفظ السجل على جهازك (المساحة ممتلية، أو لسه ماسجلتش دخول بالنت على الجهاز ده بعد التحديث). بياناتك لسه في الفورم — جرّب تاني لما النت يرجع.');
        return;
      }
      this.selectedPhotoFile.set(null);
      this.selectedPhotoPreview.set(null);
      resetForm();
      this.showFormManually.set(false);
      this.offlineSavedNotice.set('✅ اتحفظ على جهازك — هيتبعت للسيرفر أول ما النت يرجع'
        + (hadPhoto ? ' (الصورة لازم ترفعها تاني بعد ما النت يرجع)' : ''));
      setTimeout(() => this.offlineSavedNotice.set(null), 8000);
    };

    const onSuccess = (recordId: string) => {
      this.saving.set(false);
      this.savedOk.set(true);
      if (this.selectedPhotoFile()) {
        this.uploadPendingPhoto(flockId, recordId);
      }
      resetForm();
      this.loadData(flockId); // 🔄 يعيد رسم الشاشة بالداتا الجديدة (وبيقفل الفورم لو ده تسجيل اليوم)
      setTimeout(() => this.savedOk.set(false), 3000);
    };

    const showError = (err: any) => {
      this.saving.set(false);
      const detail = err?.error?.detail;
      alert(typeof detail === 'string' ? detail : 'حدث خطأ أثناء الحفظ.');
      this.loadData(flockId);
    };

    const onError = (err: any) => {
      console.error('تفاصيل الخطأ:', err);
      const status = err?.status;
      if (status === 0 && this.store.enabled) { void queueOffline(); return; } // 📴 موبايل بس — على الويب بنكمّل للفحص تحت (ممكن السجل اتحفظ والرد ضاع) // 📴 انقطاع النت: نخزّنه محليًا (ولو كان وصل فعلاً، المزامنة بتعدّله بدل ما تكرره)
      // ✅ خطأ سيرفر (5xx) على سجل جديد: ممكن السجل يكون اتحفظ فعلاً قبل الخطأ.
      // بنتأكد من السجلات الأول، ولو لقينا سجل النهاردة بنعتبرها نجاح من غير رسالة خطأ.
      if (!isEditing && (status === 0 || status >= 500)) {
        this.http.get<any[]>(`${environment.apiUrl}/flocks/${flockId}/records`).subscribe({
          next: (rows) => {
            const saved = (rows || []).find(r => this.recordDateStr(r) === targetDateStr);
            if (saved) onSuccess(saved.id);
            else showError(err);
          },
          error: () => showError(err),
        });
        return;
      }
      showError(err);
    };

    if (!navigator.onLine) { void queueOffline(); return; }

    if (isEditing) {
      // ✏️ تعديل سجل يوم فات — PATCH على السجل الموجود، من غير ما نغيّر تاريخه
      this.http.patch<any>(
        `${environment.apiUrl}/flocks/${flockId}/records/${this.editingRecordId()}`,
        commonFields
      ).subscribe({
        next: (res) => onSuccess(res?.id ?? (this.editingRecordId() as string)),
        error: onError,
      });
    } else {
      // ➕ سجل جديد (اليوم)
      const recordPayload = { flock_id: flockId, record_date: targetDateStr, water_consumed_l: null, ...commonFields };
      this.svc.addRecord(recordPayload).subscribe({
        next: (response: any) => onSuccess(response?.id),
        error: onError,
      });
    }
   }
}