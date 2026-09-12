import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FlockService } from '../../core/services/flock.service';
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

          <div>
            <label class="form-label">العلف المستهلك</label>
            <div class="flex gap-1">
              <input class="form-input text-black bg-gray-100 border p-2 rounded-l w-2/3" type="number" [(ngModel)]="userInputs.feedValue" placeholder="الكمية" />
              <select class="text-black bg-gray-200 border p-2 rounded-r w-1/3 text-xs font-bold" [(ngModel)]="userInputs.feedUnit">
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
            <label class="form-label">متوسط الوزن</label>
            <div class="flex gap-1">
              <input class="form-input text-black bg-gray-100 border p-2 rounded-l w-2/3" type="number" [(ngModel)]="userInputs.weightValue" placeholder="الوزن" />
              <select class="text-black bg-gray-200 border p-2 rounded-r w-1/3 text-xs font-bold" [(ngModel)]="userInputs.weightUnit">
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
        <app-health-score-widget [flockId]="flock()!.id"></app-health-score-widget>

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
            + تسجيل/تعديل بيانات اليوم
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
        </div>
      </div>

      <!-- ✅ مهام اليوم — تعليمات ثابتة من صاحب القطيع، تتأكد يوميًا -->
      <div class="card mb-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="section-title">✅ مهام اليوم</h2>
          <button type="button" *ngIf="myAccess()?.is_owner !== false" (click)="showTaskForm.set(!showTaskForm())" class="text-xs font-bold text-green-600">
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

      <!-- 📆 برنامج الدورة — إيه المفروض يحصل بالظبط النهاردة حسب عمر القطيع -->
      <div class="card mb-4" *ngIf="cycleProgram() as cp">
        <h2 class="section-title mb-3">📆 برنامج الدورة</h2>

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
          <div class="rounded-xl bg-blue-50 border border-blue-200 p-3 mb-3">
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

            <!-- 🌡️ حرارة دقيقة لليوم ده بالظبط (مش مدى تقريبي) -->
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
            </div>

            <!-- 💡 الإضاءة/الإظلام -->
            <div *ngIf="cp.lighting_today as lt" class="text-xs bg-white rounded-lg p-2 mb-2">
              <span class="font-bold" *ngIf="lt.light_hours !== null">
                💡 {{ lt.light_hours }} ساعة ضوء / {{ lt.dark_hours }} ساعة ظلام —
              </span>
              <span [class.text-amber-700]="lt.light_hours === null">{{ lt.note }}</span>
            </div>

            <ul class="text-sm space-y-1 mb-2">
              <li *ngFor="let a of phase.actions">• {{ a }}</li>
            </ul>
            <p class="text-xs text-red-600 font-bold mb-2">⚠️ {{ phase.warning }}</p>

            <!-- 🌾 ملاحظة صادقة عن كمية العلف -->
            <p class="text-[10px] text-gray-400 border-t pt-2">{{ cp.feed_amount_note }}</p>
          </div>
          <div *ngIf="!cp.today_phase" class="text-center py-2 text-[var(--c-muted)] text-sm">
            القطيع خارج نطاق البرنامج المعروف حاليًا (يوم {{ cp.age_days }}).
          </div>

          <!-- 🗓️ الخط الزمني الكامل للدورة -->
          <button type="button" (click)="toggleFullProgram()" class="text-xs font-bold text-green-600 mt-2">
            {{ showFullProgram() ? 'إخفاء الخط الزمني الكامل' : 'عرض الخط الزمني الكامل للدورة (' + (cp.phases?.length || 0) + ' مراحل)' }}
          </button>
          <div *ngIf="showFullProgram()" class="mt-2 space-y-1.5">
            <div *ngIf="!cp.phases || cp.phases.length === 0" class="text-xs text-[var(--c-muted)]">مفيش مراحل متسجلة لهذا النوع.</div>
            <div *ngFor="let p of cp.phases; let i = index" class="rounded-lg p-2 text-xs"
                 [class.bg-green-100]="i === cp.today_phase_index" [class.bg-gray-50]="i !== cp.today_phase_index">
              <span class="font-bold">يوم {{ p.day_from }}–{{ (p.day_to === 999 || p.day_to === 9999) ? 'النهاية' : p.day_to }}: {{ p.phase_label }}</span>
              <span *ngIf="i === cp.today_phase_index" class="text-green-700 font-black"> ← احنا هنا</span>
            </div>
          </div>
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

    <!-- 📊 رسوم الوزن والبيض -->
    <div class="grid lg:grid-cols-2 gap-5 mb-4">

      <!-- 🥚 رسم إنتاج البيض - يظهر بس لقطعان البياض -->
      <div class="card" *ngIf="flock()!.type === 'layer' && eggRecords().length > 0">
        <h2 class="section-title">🥚 منحنى إنتاج البيض</h2>

        <div style="display: flex; flex-direction: column; height: 170px; justify-content: flex-end; margin-top: 15px; position: relative; border-bottom: 2px solid #e5e7eb;">

          <div class="absolute inset-0 flex flex-col justify-between pb-10 pointer-events-none" style="height: 120px;">
            <div style="width: 100%; border-top: 1px dashed #f3f4f6;"></div>
            <div style="width: 100%; border-top: 1px dashed #f3f4f6;"></div>
            <div style="width: 100%; border-top: 1px dashed #e5e7eb;"></div>
          </div>

          <div style="display: flex; width: 100%; align-items: flex-end; gap: 4px; height: 150px; position: relative; z-index: 10;">

            <div *ngFor="let pt of eggRecords().slice(-14)"
                 style="flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; min-w: 35px; position: relative;">

              <div style="position: relative; width: 100%; height: 110px; margin-bottom: 8px;">
                <div style="width: 12px; background-color: #d97706; border-radius: 3px 3px 0 0; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); transition: all 0.3s;"
                     [style.height]="barH($any(pt).eggCount, maxEgg()) + '%'"
                     [title]="($any(pt).eggCount ?? 0) + ' بيضة'">

                  <span style="position: absolute; top: -18px; left: 50%; transform: translateX(-50%); font-size: 8px; font-weight: bold; background-color: #1e293b; color: white; padding: 1px 4px; border-radius: 3px; white-space: nowrap;">
                    {{ $any(pt).eggCount ?? 0 }}
                  </span>
                </div>
              </div>

              <span style="font-size: 10px; font-weight: bold; color: #6b7280; white-space: nowrap; margin-top: auto; padding-bottom: 4px;">
                {{ ($any(pt).recordDate || '').slice(8) }}
              </span>

            </div>
          </div>

          <div style="position: absolute; top: 0; left: 0; font-size: 10px; font-weight: 900; color: #9ca3af;">بيضة</div>
        </div>
      </div>

      <!-- ⚖️ رسم الوزن - يظهر لباقي الأنواع (تسمين، أرانب، رومي، بط، سمان) -->
      <div class="card" *ngIf="flock()!.type !== 'layer' && analytics()">
        <h2 class="section-title">📈 {{ 'FLOCK.WEIGHT_HIST' | translate }}</h2>
        
        <div style="display: flex; flex-direction: column; height: 170px; justify-content: flex-end; margin-top: 15px; position: relative; border-bottom: 2px solid #e5e7eb;">
          
          <div class="absolute inset-0 flex flex-col justify-between pb-10 pointer-events-none" style="height: 120px;">
            <div style="width: 100%; border-top: 1px dashed #f3f4f6;"></div>
            <div style="width: 100%; border-top: 1px dashed #f3f4f6;"></div>
            <div style="width: 100%; border-top: 1px dashed #e5e7eb;"></div>
          </div>

          <div style="display: flex; width: 100%; align-items: flex-end; gap: 4px; height: 150px; position: relative; z-index: 10;">
            
            <div *ngFor="let pt of ($any(analytics())?.weight_history || analytics()?.weightHistory || []).slice(-14)"
                 style="flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; min-w: 35px; position: relative;">
              
              <div style="position: relative; width: 100%; height: 110px; margin-bottom: 8px;">
                <div style="width: 10px; height: 10px; background-color: #2563eb; border: 2px solid #ffffff; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: all 0.3s; cursor: pointer; position: absolute; left: 50%; transform: translateX(-50%);"
                     [style.bottom]="barH(pt, maxW()) + '%'"
                     [title]="(($any(pt)?.avg_weight_kg || $any(pt)?.weight || 0)) + ' kg'">
                  
                  <span style="position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%); font-size: 8px; font-weight: bold; background-color: #1e293b; color: white; padding: 1px 4px; border-radius: 3px; white-space: nowrap; box-shadow: 0 1px 2px rgba(0,0,0,0.15);">
                    {{ ($any(pt)?.avg_weight_kg || $any(pt)?.weight || 0) }}
                  </span>
                </div>
              </div>

              <span style="font-size: 10px; font-weight: bold; color: #6b7280; white-space: nowrap; margin-top: auto; padding-bottom: 4px;">
                {{ ($any(pt)?.record_date || $any(pt)?.date || '').slice(8) }}
              </span>
              
            </div>
          </div>
          
          <div style="position: absolute; top: 0; left: 0; font-size: 10px; font-weight: 900; color: #9ca3af; bg-white/80 px-1 rounded">kg</div>
        </div>
      </div>

    </div>
    </ng-container>

    <!-- 💉 التحصينات وسجل العلاج -->
    <ng-container *ngIf="activeSection() === 'health'">
      <div class="card mb-4">
        <h2 class="section-title">💉 {{ 'FLOCK.VACC_SCHED' | translate }}</h2>
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

    <!-- 📊 تقرير الالتزام بالبرنامج على مدار الدورة كاملة -->
    <div class="card mb-4" *ngIf="adherenceReport() as ar">
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

    <div class="card mt-4">
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
                <td class="py-2 px-2 text-[11px] text-[var(--c-muted)]">{{ recordedByMap()[r.id] || '—' }}</td>
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
            {{ inv.role === 'vet' ? 'طبيب بيطري' : 'عامل مزرعة' }}
          </p>
          <div class="flex gap-2">
            <button type="button" (click)="acceptInviteForMe(inv)" class="flex-1 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold">✅ قبول</button>
            <button type="button" (click)="rejectInviteForMe(inv)" class="flex-1 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold">✕ رفض</button>
          </div>
        </div>
      </div>

      <p class="text-xs text-[var(--c-muted)] mb-2">
        ملحوظة: العضو اللي تدعوه هيقدر يسجل بيانات في <b>كل قطعانك</b>، مش القطيع ده بس.
      </p>

      <div *ngIf="showInviteForm()" class="bg-gray-50 rounded-xl p-3 mb-3 space-y-2">
        <input type="email" [(ngModel)]="inviteForm.invited_email" placeholder="إيميل العضو" class="form-input text-xs w-full"/>
        <select [(ngModel)]="inviteForm.role" class="form-input text-xs w-full">
          <option value="worker">عامل مزرعة</option>
          <option value="vet">طبيب بيطري</option>
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
          <p class="text-[10px] text-gray-500 mb-2">
            لو العضو عنده حساب بالإيميل ده بالفعل، هيلاقي الدعوة تلقائي جوه التطبيق (تاب "قطعاني المشتركة"). لو لسه معندوش حساب، ابعتله اللينك ده يعمل حساب بيه:
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
          <span class="font-bold">{{ m.invited_email }}</span>
          <span class="text-[var(--c-muted)] text-xs"> — {{ m.role === 'vet' ? 'بيطري' : 'عامل' }}</span>
          <span class="text-[10px] px-1.5 py-0.5 rounded-full font-bold mr-1"
                [class.bg-amber-100]="m.status === 'pending'" [class.text-amber-700]="m.status === 'pending'"
                [class.bg-green-100]="m.status === 'active'" [class.text-green-700]="m.status === 'active'"
                [class.bg-gray-200]="m.status === 'revoked' || m.status === 'rejected'" [class.text-gray-500]="m.status === 'revoked' || m.status === 'rejected'">
            {{ memberStatusLabel(m.status) }}
          </span>
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
    { key: 'records' as const, label: '📜 السجلات' },
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
  showPastRecords = signal(false);
  recordedByMap = signal<Record<string, string>>({});
  editingRecordId = signal<string | null>(null);
  editingRecordDate = signal<string | null>(null);

  // 💊 سجل العلاج والأدوية
  treatments = signal<any[]>([]);
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

  // 👷 دعوة أعضاء (مطبّقة على كل قطعان صاحب الحساب، مش القطيع المفتوح بس)
  farmMembers = signal<any[]>([]);
  showInviteForm = signal(false);
  inviting = signal(false);
  lastInviteLink = signal<string | null>(null);
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

  // ✅ هل اتسجلت بيانات النهاردة للقطيع المفتوح؟
  hasTodayRecord = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return this.records().some(r => this.recordDateStr(r) === todayStr);
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
    const todayStr = new Date().toISOString().slice(0, 10);
    localStorage.setItem(`daily_reminder_skip:${id}:${todayStr}`, '1');
    this.skippedToday.set(true);
  }

  cancelForm() {
    this.showFormManually.set(false);
    this.editingRecordId.set(null);
    this.editingRecordDate.set(null);
    this.selectedPhotoFile.set(null);
    this.selectedPhotoPreview.set(null);
    this.userInputs = {
      mortality: 0, feedValue: null, feedUnit: 'kg', temperatureCelsius: null,
      weightValue: null, weightUnit: 'kg', eggCount: null, brokenEggCount: null, notes: '',
    };
  }

  loadMyAccess(flockId: string) {
    this.http.get<any>(`${environment.apiUrl}/flocks/${flockId}/my-access`, { headers: this.headers() })
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
    this.http.get<any[]>(`${environment.apiUrl}/flocks/${flockId}/treatments`, { headers: this.headers() })
      .subscribe({ next: (res) => this.treatments.set(res || []), error: () => this.treatments.set([]) });
  }

  saveTreatment() {
    const flockId = this.flock()?.id;
    if (!flockId || !this.treatmentForm.drug_name) return;
    this.http.post(`${environment.apiUrl}/flocks/${flockId}/treatments`, this.treatmentForm, { headers: this.headers() })
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
    this.http.delete(`${environment.apiUrl}/flocks/${flockId}/treatments/${t.id}`, { headers: this.headers() })
      .subscribe({ next: () => this.loadTreatments(flockId), error: () => alert('حصل خطأ أثناء الحذف') });
  }

  // ✅ مهام اليوم
  loadTodayTasks(flockId: string) {
    this.http.get<any[]>(`${environment.apiUrl}/flocks/${flockId}/tasks/today`, { headers: this.headers() })
      .subscribe({ next: (res) => this.todayTasks.set(res || []), error: () => this.todayTasks.set([]) });
  }

  // 📆 برنامج الدورة يوم بيوم
  loadCycleProgram(flockId: string) {
    this.http.get<any>(`${environment.apiUrl}/flocks/${flockId}/cycle-program`, { headers: this.headers() })
      .subscribe({ next: (res) => this.cycleProgram.set(res), error: () => this.cycleProgram.set(null) });
  }

  // 📊 تقرير الالتزام بالبرنامج على مدار الدورة كاملة
  loadAdherenceReport(flockId: string) {
    this.http.get<any>(`${environment.apiUrl}/flocks/${flockId}/cycle-program/adherence-report`, { headers: this.headers() })
      .subscribe({ next: (res) => this.adherenceReport.set(res), error: () => this.adherenceReport.set(null) });
  }

  saveTask() {
    const flockId = this.flock()?.id;
    if (!flockId || !this.taskForm.title) return;
    this.http.post(`${environment.apiUrl}/flocks/${flockId}/tasks`, this.taskForm, { headers: this.headers() })
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
      ? this.http.delete(`${environment.apiUrl}/flocks/${flockId}/tasks/${t.id}/complete`, { headers: this.headers() })
      : this.http.post(`${environment.apiUrl}/flocks/${flockId}/tasks/${t.id}/complete`, {}, { headers: this.headers() });
    req.subscribe({
      next: () => this.loadTodayTasks(flockId),
      error: () => alert('حصل خطأ أثناء تحديث المهمة'),
    });
  }

  deleteTask(t: any) {
    const flockId = this.flock()?.id;
    if (!flockId || !confirm(`تمسح مهمة "${t.title}" نهائيًا؟`)) return;
    this.http.delete(`${environment.apiUrl}/flocks/${flockId}/tasks/${t.id}`, { headers: this.headers() })
      .subscribe({ next: () => this.loadTodayTasks(flockId), error: () => alert('حصل خطأ أثناء الحذف') });
  }

  // 👷 دعوة الأعضاء — نفس endpoints صفحة /team، هنا بس عشان تكون قريبة من مكان الاستخدام
  loadFarmMembers() {
    this.http.get<any[]>(`${environment.apiUrl}/farm-members`, { headers: this.headers() })
      .subscribe({ next: (res) => this.farmMembers.set(res || []), error: () => this.farmMembers.set([]) });
  }

  sendInvite() {
    if (!this.inviteForm.invited_email) return;
    this.inviting.set(true);
    this.http.post<any>(`${environment.apiUrl}/farm-members/invite`, this.inviteForm, { headers: this.headers() })
      .subscribe({
        next: (res) => {
          this.inviting.set(false);
          // ⚠️ إرسال إيميل حقيقي مش موجود لسه — اللينك ده لازم يتبعت يدويًا للعضو
          this.lastInviteLink.set(`${window.location.origin}/join-farm/${res.id}`);
          this.inviteForm = { invited_email: '', role: 'worker', can_add_records: true, can_view_financials: false };
          this.loadFarmMembers();
        },
        error: () => { this.inviting.set(false); alert('حصل خطأ أثناء إرسال الدعوة'); },
      });
  }

  revokeMember(m: any) {
    if (!confirm(`متأكد إنك عايز تلغي صلاحية ${m.invited_email}؟`)) return;
    this.http.delete(`${environment.apiUrl}/farm-members/${m.id}`, { headers: this.headers() })
      .subscribe({ next: () => this.loadFarmMembers(), error: () => alert('حصل خطأ أثناء الإلغاء') });
  }

  memberStatusLabel(status: string): string {
    return ({ pending: 'بانتظار الموافقة', active: 'نشط', revoked: 'ملغي', rejected: 'مرفوض' } as Record<string, string>)[status] ?? status;
  }

  // 🔔 دعوات موجهة لإيميلي أنا (مش اللي أنا بعتها)
  loadPendingInvitesForMe() {
    this.http.get<any[]>(`${environment.apiUrl}/farm-members/pending-for-me`, { headers: this.headers() })
      .subscribe({ next: (res) => this.pendingInvitesForMe.set(res || []), error: () => this.pendingInvitesForMe.set([]) });
  }

  acceptInviteForMe(inv: any) {
    this.http.post(`${environment.apiUrl}/farm-members/${inv.id}/accept`, {}, { headers: this.headers() })
      .subscribe({ next: () => this.loadPendingInvitesForMe(), error: () => alert('حصل خطأ أثناء قبول الدعوة') });
  }

  rejectInviteForMe(inv: any) {
    this.http.post(`${environment.apiUrl}/farm-members/${inv.id}/reject`, {}, { headers: this.headers() })
      .subscribe({ next: () => this.loadPendingInvitesForMe(), error: () => alert('حصل خطأ أثناء رفض الدعوة') });
  }

  // 📱 مشاركة لينك الدعوة عبر واتساب/تيليجرام — مجرد رابط، مفيش API ولا حساب مدفوع مطلوب
  whatsappShareUrl(): string {
    const text = `تم دعوتك للانضمام كعضو مشارك في إدارة القطعان. اضغط الرابط عشان توافق: ${this.lastInviteLink()}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }
  telegramShareUrl(): string {
    return `https://t.me/share/url?url=${encodeURIComponent(this.lastInviteLink() || '')}&text=${encodeURIComponent('تم دعوتك للانضمام كعضو مشارك في إدارة القطعان')}`;
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
    this.http.post<any[]>(`${environment.apiUrl}/flocks/${id}/vaccinations/sync`, { items }, { headers: this.headers() })
      .subscribe({
        next: (rows) => this.dbVaccinations.set(rows || []),
        error: () => this.dbVaccinations.set([]),
      });
  }

  toggleVaccination(row: any) {
    const flockId = this.flock()?.id;
    if (!flockId || !row.dbId) return;
    const completed = !row.completed;
    this.http.patch(`${environment.apiUrl}/flocks/${flockId}/vaccinations/${row.dbId}`, { completed }, { headers: this.headers() })
      .subscribe({
        next: () => this.dbVaccinations.update(list => list.map(d => d.id === row.dbId ? { ...d, completed } : d)),
        error: () => alert('حصل خطأ أثناء تحديث حالة التحصين'),
      });
  }

  // 🚨 أي أحداث حرجة/تنبيهات اليوم من نفس منطق التقارير — بيفشل بهدوء لو المستخدم مش Pro
  loadTodayEvents(id: string) {
    this.http.get<any>(`${environment.apiUrl}/reports/daily?flock_id=${id}`, { headers: this.headers() }).subscribe({
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
  pastRecordsSorted = () => this.records().slice().sort((a, b) => this.recordDateStr(b).localeCompare(this.recordDateStr(a)));

  startEditRecord(r: any) {
    this.editingRecordId.set(r.id);
    this.editingRecordDate.set(this.recordDateStr(r));
    this.userInputs = {
      mortality: r.mortality ?? 0,
      feedValue: this.recordFeed(r),
      feedUnit: 'kg',
      temperatureCelsius: r.temperatureCelsius ?? r.temperature_celsius ?? null,
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
    this.http.delete(`${environment.apiUrl}/flocks/${flockId}/records/${r.id}`, { headers: this.headers() }).subscribe({
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
    this.http.post(`${environment.apiUrl}/flocks/${flockId}/records/${recordId}/photo`, formData, { headers: this.headers() })
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

  kpis = () => {
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
        color: 'var(--c-primary)' 
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
  }

  loadData(id: string) {
    // 🔁 إعادة ضبط حالة الفورم/التخطي لأي قطيع جديد (الكومبوننت بيتعاد استخدامه)
    this.showFormManually.set(false);
    this.editingRecordId.set(null);
    this.selectedPhotoFile.set(null);
    this.selectedPhotoPreview.set(null);
    this.photoUploadStatus.set('idle');
    const todayStr = new Date().toISOString().slice(0, 10);
    this.skippedToday.set(localStorage.getItem(`daily_reminder_skip:${id}:${todayStr}`) === '1');

this.svc.getFlock(id).subscribe(dataFromBackend => {
  if (dataFromBackend) {
    const raw = dataFromBackend as any;
    
    // 1. جلب قائمة السجلات اليومية من الـ Payload
    const records: any[] = raw.daily_records ?? raw.records ?? [];
    
    let age = 0;

    // 🟢 إذا كان للقطيع سجلات مخزنة، نحسب العمر من تاريخ أحدث سجل أو عدد السجلات
    if (records.length > 0) {
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

    this.flock.set({
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
    });
  }
});
    this.svc.getAnalytics(id).subscribe(a => this.analytics.set(a));
    this.loadHealthScore(id);
    this.loadTodayEvents(id);
    this.loadTreatments(id);
    this.loadTodayTasks(id);
    this.loadCycleProgram(id);
    this.loadAdherenceReport(id);
    this.loadFarmMembers();
    this.loadPendingInvitesForMe();
    // 🥚 تحميل السجلات اليومية (بنستخدمها في عرض سجلات البياض + التحقق من تسجيل اليوم)
    this.svc.getRecords(id).subscribe({
      next: (recs) => this.records.set(recs || []),
      error: () => this.records.set([])
    });
    // 👤 مين سجّل كل سجل — منفصلة عن getRecords لأن DailyRecordOut schema لسه مفيهاش recorded_by_user_id
    this.http.get<Record<string, string>>(`${environment.apiUrl}/flocks/${id}/records/recorded-by`, { headers: this.headers() })
      .subscribe({ next: (res) => this.recordedByMap.set(res || {}), error: () => this.recordedByMap.set({}) });
  }

  private headers() {
    const token = localStorage.getItem('spa_token'); // ⚠️ وحّد الاسم ده مع باقي الملفات
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  loadHealthScore(id: string) {
    this.http.get<any>(`${environment.apiUrl}/ai/health-score?flock_id=${id}`, { headers: this.headers() }).subscribe({
      next: (res) => this.healthScore.set(res),
      error: () => this.healthScore.set(null),
    });
  }

  closeFlock() {
    const flockId = this.flock()?.id;
    if (!flockId) return;
    if (!confirm('هل أنت متأكد من قفل الدورة؟ الإجراء ده نهائي.')) return;

    this.closingFlock.set(true);
    this.http.patch(`${environment.apiUrl}/flocks/${flockId}/close`, {}, { headers: this.headers() }).subscribe({
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
      headers: this.headers(), responseType: 'blob',
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
      : new Date().toISOString().split('T')[0];

    const commonFields = {
      mortality: this.userInputs.mortality ? Number(this.userInputs.mortality) : 0,
      feed_consumed_kg: (this.userInputs.feedValue !== null) ? Number(finalFeedKg) : 0.0,
      temperature_celsius: (this.userInputs.temperatureCelsius !== null) ? Number(this.userInputs.temperatureCelsius) : null,
      avg_weight_kg: finalWeightKg !== null ? Number(finalWeightKg) : null,
      egg_count: (this.userInputs.eggCount !== null && this.userInputs.eggCount !== undefined) ? Number(this.userInputs.eggCount) : null,
      broken_egg_count: (this.userInputs.brokenEggCount !== null && this.userInputs.brokenEggCount !== undefined) ? Number(this.userInputs.brokenEggCount) : null,
      notes: this.userInputs.notes || null,
    };

    const resetForm = () => {
      this.userInputs = {
        mortality: 0, feedValue: null, feedUnit: 'kg', temperatureCelsius: null,
        weightValue: null, weightUnit: 'kg', eggCount: null, brokenEggCount: null, notes: '',
      };
      this.editingRecordId.set(null);
      this.editingRecordDate.set(null);
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

    const onError = (err: any) => {
      this.saving.set(false);
      console.error('تفاصيل الخطأ:', err);
      alert('حدث خطأ أثناء الحفظ.');
    };

    if (isEditing) {
      // ✏️ تعديل سجل يوم فات — PATCH على السجل الموجود، من غير ما نغيّر تاريخه
      this.http.patch<any>(
        `${environment.apiUrl}/flocks/${flockId}/records/${this.editingRecordId()}`,
        commonFields, { headers: this.headers() }
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