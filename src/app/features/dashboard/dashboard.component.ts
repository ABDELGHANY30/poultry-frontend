import { Component, OnInit, inject, computed, signal, effect, untracked, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { FlockService } from '../../core/services/flock.service';
import { AuthService } from '../../core/services/auth.service';
import { AlertService, Alert } from '../../core/services/alert.service';
import { environment } from '../../../environments/environment';
// ⚠️ الملفات دي حطها في src/app/shared/widgets/ (أو عدّل المسار حسب مكان ما تحطها فعلاً)
import { HealthScoreWidgetComponent } from '../../features/Healthscorewidget/Health score widget.component';
import { DecisionSimulatorComponent } from '../../features/desicion/desicion.component';
import { ReferralCardComponent } from '../../features/referral_card.component.ts/referral-card.component'; // ⚠️ عدّل المسار حسب مكانه الفعلي
import { StreakService } from '../../core/services/streak.service'; // ⚠️ عدّل المسار حسب مكانه الفعلي

const CATEGORIES = [
  { value: 'broiler',   label: 'بورصة الفراخ',     icon: '🐔', color: '#e8f5e9', headerColor: '#2d9e5f', unit: 'كجم' },
  { value: 'eggs',      label: 'بورصة البيض',       icon: '🥚', color: '#e3f2fd', headerColor: '#1565c0', unit: 'بيضة' },
  { value: 'chicks',    label: 'الكتاكيت',          icon: '🐣', color: '#fff8e1', headerColor: '#f57f17', unit: 'كتكوت' },
  { value: 'breeders',  label: 'الأمهات',           icon: '🐓', color: '#fce4ec', headerColor: '#c62828', unit: 'كجم' },
  { value: 'turkey',    label: 'الرومي',            icon: '🦃', color: '#f3e5f5', headerColor: '#6a1b9a', unit: 'كجم' },
  { value: 'rabbit',    label: 'الأرانب',           icon: '🐇', color: '#e8eaf6', headerColor: '#283593', unit: 'كجم' },
  { value: 'duck',      label: 'البط',              icon: '🦆', color: '#e0f2f1', headerColor: '#00695c', unit: 'كجم' },
  { value: 'feed',      label: 'الأعلاف',           icon: '🌾', color: '#f9fbe7', headerColor: '#827717', unit: 'طن' },
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, HealthScoreWidgetComponent, DecisionSimulatorComponent, ReferralCardComponent],
  template: `
  <div class="page-wrapper" dir="rtl">

    <!-- Welcome Banner -->
    <div class="relative overflow-hidden rounded-3xl text-white px-6 py-6"
         style="background:#1f7d4e">
      <div class="flex items-center justify-between gap-4">

        <!-- الترحيب + الاسم + PRO -->
        <div class="flex-1 min-w-0">
          <ng-container *ngIf="isLoggedIn(); else guestBanner">
            <p class="mb-1 text-sm font-medium" style="color:rgba(255,255,255,.62)">{{ 'DASHBOARD.WELCOME' | translate }},</p>
            <h1 class="text-2xl font-bold leading-tight mb-0 truncate">{{ userName() }}</h1>

            <span *ngIf="isPro()"
                  class="inline-block mt-4 px-4 py-1 rounded-full text-xs font-black bg-amber-400 text-amber-900">
              PRO
            </span>

            <div *ngIf="bannerStreakText() as text" class="mt-3">
              <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                          bg-gradient-to-l from-amber-400 to-orange-500 shadow-lg shadow-orange-500/30">
                <span class="text-base leading-none">🔥</span>
                <span class="text-white text-xs font-black leading-tight">{{ text }}</span>
              </div>
            </div>
          </ng-container>

          <!-- غير مسجّل: زرار تسجيل الدخول جوه البانر -->
          <ng-template #guestBanner>
            <p class="mb-1 text-sm font-medium" style="color:rgba(255,255,255,.62)">أهلاً بيك</p>
            <h1 class="text-xl font-bold leading-tight mb-3">سجّل دخولك عشان تفتح كل المميزات</h1>
            <a routerLink="/auth/login"
               class="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-white text-green-800 font-bold text-sm no-underline shadow-md active:scale-95 transition-all">
              تسجيل الدخول
            </a>
          </ng-template>
        </div>

        <!-- 🌤️ الطقس: الشكل التاني (من غير مربع)، اضغط عليه تبدّل بين النهارده وبكره -->
        <button *ngIf="activeWeather() as w" type="button" (click)="toggleWeather()"
                class="flex-shrink-0 flex items-center gap-3 text-white active:scale-95 transition-all"
                style="direction:ltr;background:none;border:none;padding:0"
                aria-label="اضغط لتبديل الطقس بين النهارده وبكره">

          <div class="text-center leading-tight">
            <div style="font-size:11px;color:rgba(255,255,255,.75)">{{ weatherDay() === 'today' ? 'النهارده' : 'بكره' }}</div>
            <p class="mb-0 flex items-baseline justify-center gap-1">
              <span class="text-3xl font-bold">{{ w.max }}°</span>
              <span class="text-xs" style="color:rgba(255,255,255,.7)">{{ w.min }}°</span>
            </p>
            <p class="mb-0 mt-0.5 truncate max-w-[90px]" style="font-size:11px;color:rgba(255,255,255,.8)">{{ w.condition }}</p>
          </div>

          <span style="width:1px;align-self:stretch;background:rgba(255,255,255,.3)"></span>

          <span class="text-4xl leading-none flex-shrink-0">{{ weatherIcon(w) }}</span>
        </button>

      </div>
    </div>

    <!-- 📈 أسعار السوق: كارت واحد بتابات وصفوف صغيرة (نفس تصميم المعاينة) -->
    <ng-template #pricesBlock>
      <div class="card mb-5" *ngIf="prices().length > 0">

        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-normal text-gray-500 mb-0">أسعار السوق</h2>
          <span class="text-sm text-gray-600">{{ priceDate() }}</span>
        </div>

        <!-- تابات الأقسام -->
        <div class="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
          <button type="button" *ngFor="let c of availableTabs()"
                  (click)="selectedPriceTab.set(c.value)"
                  class="flex-shrink-0 px-4 py-2 rounded-lg text-[13px] border transition"
                  [class.text-white]="activePriceTab() === c.value"
                  [class.bg-white]="activePriceTab() !== c.value"
                  [class.border-gray-200]="activePriceTab() !== c.value"
                  [class.text-gray-600]="activePriceTab() !== c.value"
                  [style.background-color]="activePriceTab() === c.value ? c.headerColor : ''"
                  [style.border-color]="activePriceTab() === c.value ? c.headerColor : ''">
            {{ c.label }}
          </button>
        </div>

        <!-- صفوف الأسعار -->
        <!-- 3 صفوف ظاهرة بس (148px)، والباقي بسكرول جوه الكارت من غير ما حجمه يتغير -->
        <div class="flex flex-col gap-2 h-[148px] overflow-y-auto overscroll-contain pe-1">
          <div *ngFor="let p of tabPrices()"
               class="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 h-11 flex-shrink-0">
            <span class="text-sm text-gray-800 truncate">{{ p.item_name_ar }}</span>
            <span class="flex-shrink-0 text-xs text-gray-400">
              المعلن <b class="text-sm font-medium text-gray-800">{{ p.price_max ? (p.price_max | number) : '—' }}</b>
              · التنفيذ <b class="text-sm font-medium text-green-700">{{ p.price_min | number }}</b>
            </span>
          </div>
        </div>

      </div>
    </ng-template>

    <!-- 📈 المسجّل: كل الأسعار بنفس شكل صفحة السوق (الكل + أقسام بكروت ملونة) -->
    <ng-template #allPricesBlock>
      <div *ngIf="prices().length > 0" class="mb-5">

        <div class="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          <button type="button" (click)="selectedPriceTab.set('')"
                  class="flex-shrink-0 px-4 py-2 rounded-2xl text-xs font-bold border transition"
                  [class.bg-green-600]="selectedPriceTab() === ''"
                  [class.text-white]="selectedPriceTab() === ''"
                  [class.border-green-600]="selectedPriceTab() === ''"
                  [class.bg-white]="selectedPriceTab() !== ''"
                  [class.border-gray-200]="selectedPriceTab() !== ''"
                  [class.text-gray-600]="selectedPriceTab() !== ''">
            🌟 الكل
          </button>
          <button type="button" *ngFor="let c of availableTabs()"
                  (click)="selectedPriceTab.set(c.value)"
                  class="flex-shrink-0 px-4 py-2 rounded-2xl text-xs font-bold border transition"
                  [class.text-white]="selectedPriceTab() === c.value"
                  [class.bg-white]="selectedPriceTab() !== c.value"
                  [class.border-gray-200]="selectedPriceTab() !== c.value"
                  [class.text-gray-600]="selectedPriceTab() !== c.value"
                  [style.background-color]="selectedPriceTab() === c.value ? c.headerColor : ''"
                  [style.border-color]="selectedPriceTab() === c.value ? c.headerColor : ''">
            {{ c.icon }} {{ c.label }}
          </button>
        </div>

        <div class="space-y-4">
          <div *ngFor="let group of guestGroups()">

            <div class="rounded-2xl px-5 py-3 flex items-center justify-between text-white font-black text-base"
                 [style.background-color]="getCategoryColor(group.category, 'header')">
              <span>{{ getCategoryLabel(group.category) }}</span>
              <span class="text-2xl">{{ getCategoryIcon(group.category) }}</span>
            </div>

            <div class="space-y-2 px-1 mt-2">
              <div *ngFor="let price of group.items"
                   class="rounded-2xl border p-4"
                   [style.background-color]="getCategoryColor(group.category, 'bg')"
                   style="border-color:#e0e0e0">

                <div class="flex items-center justify-between mb-3">
                  <p class="font-black text-base mb-0" style="color:#1f2937">{{ price.item_name_ar }}</p>
                  <span class="text-lg">{{ getCategoryIcon(group.category) }}</span>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div class="bg-white rounded-xl p-3 text-center shadow-sm">
                    <p class="text-xs text-gray-400 mb-1">سعر التنفيذ</p>
                    <p class="font-black text-green-600 text-xl mb-0">{{ price.price_min | number }}</p>
                    <p class="text-[10px] text-gray-400 mb-0">جنيه</p>
                  </div>
                  <div class="bg-white rounded-xl p-3 text-center shadow-sm border border-blue-100">
                    <p class="text-xs text-blue-400 mb-1">السعر المعلن</p>
                    <p class="font-black text-blue-600 text-xl mb-0">{{ price.price_max | number }}</p>
                    <p class="text-[10px] text-gray-400 mb-0">جنيه</p>
                  </div>
                </div>

                <div class="flex items-center justify-between mt-2">
                  <p *ngIf="price.notes" class="text-[10px] text-gray-400 mb-0">📍 {{ price.notes }}</p>
                  <p class="text-[10px] text-gray-300 mr-auto mb-0">{{ price.created_at | date:'dd/MM' }}</p>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </ng-template>

    <!-- زائر / من غير قطيع: كل الأسعار بشكل السوق تحت البانر مباشرة -->
    <ng-container *ngIf="!fullAccess()">
      <ng-container *ngTemplateOutlet="allPricesBlock"></ng-container>
      <div *ngIf="prices().length === 0" class="text-center py-12 text-gray-400">
        <p class="text-4xl mb-2">📊</p>
        <p class="font-semibold">لا توجد أسعار بعد</p>
      </div>
    </ng-container>

    <!-- 🔒 كارت توجيه لغير المكتملين: يظهر لحد ما يسجّل دخول ويضيف أول قطيع -->
    <div *ngIf="isLoggedIn() && !hasFlock()" class="card text-center py-8 px-5"
         style="background:linear-gradient(135deg,#f0fdf4 0%,#e8f5e9 100%); border:1px dashed #2d9e5f66;">
      <div class="text-4xl mb-3">🐔</div>
      <h2 class="text-base font-bold text-gray-800 mb-1">سجّل أول قطيع عشان تفتح كل المميزات</h2>
      <p class="text-sm text-[var(--c-muted)] mb-4">
        بمجرد ما تضيف قطيع هتقدر تتابع صحته وتنبيهاته ونتائج التقارير كاملة.
      </p>
      <a routerLink="/flocks" class="btn-primary btn btn-sm inline-flex">
        + {{ 'FLOCK.ADD' | translate }}
      </a>
    </div>

    <!-- 🔓 المحتوى الكامل: يظهر بس بعد توثيق الإيميل وتسجيل أول قطيع -->
    <ng-container *ngIf="fullAccess()">

      <!-- 💚 صحة القطيع النشط -->
      <app-health-score-widget
        [birds]="flockStats().birds"
        [dead]="flockStats().dead"
        [temp]="flockStats().temp"
        (flockSelected)="selectedFlockId.set($event)">
      </app-health-score-widget>

      <!-- 📈 صاحب القطيع: الأسعار المختصرة تحت صحة القطيع مباشرة -->
      <ng-container *ngTemplateOutlet="pricesBlock"></ng-container>

      <!-- ادعُ صديق -->
      <app-referral-card></app-referral-card>

      <!-- 👑 مساحة Pro — مختفية بالكامل لغير المشتركين، مفيش أي تلميح إنها موجودة أصلاً -->
      <div *ngIf="reportsIsPro()" class="card relative overflow-hidden border-2 border-amber-200/70">

        <!-- شريط علوي ذهبي رفيع -->
        <div class="absolute top-0 inset-x-0 h-1"
             style="background:linear-gradient(90deg,#f59e0b,#fbbf24,#f59e0b)"></div>

        <div class="flex items-start justify-between gap-3 mb-4 mt-1">
          <div class="flex items-center gap-3">
            <span class="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-xl flex-shrink-0">
              👑
            </span>
            <div>
              <h2 class="text-sm font-black text-gray-800 mb-0.5 flex items-center gap-2">
                مساحة Pro بتاعتك
                <span class="bg-amber-400 text-amber-950 text-[9px] font-black tracking-wide px-2 py-0.5 rounded-full">PRO</span>
              </h2>
              <p class="text-xs text-[var(--c-muted)] mb-0">تحليلات وميزات متقدمة متاحة بس لمشتركين Pro</p>
            </div>
          </div>
          <a routerLink="/reports" class="text-xs font-semibold text-amber-700 hover:text-amber-900 no-underline flex-shrink-0 mt-1">
            التفاصيل الكاملة →
          </a>
        </div>

        <!-- ملخص التقارير -->
        <div class="grid grid-cols-2 gap-3 mb-4">
          <div class="stat-card">
            <div class="stat-icon" style="background:#fef3c7">📊</div>
            <div>
              <p class="text-xl font-bold leading-none text-gray-800">{{ avgFcr() ?? '—' }}</p>
              <p class="text-xs text-[var(--c-muted)] mt-1.5 font-medium">متوسط FCR</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:#fee2e2">⚠️</div>
            <div>
              <p class="text-xl font-bold leading-none text-red-600">{{ recentMortalityTotal() ?? '—' }}</p>
              <p class="text-xs text-[var(--c-muted)] mt-1.5 font-medium">نفوق آخر 30 يوم</p>
            </div>
          </div>
        </div>

        <!-- محاكاة القرار -->
        <div class="rounded-xl border border-amber-100 bg-amber-50/40 p-3">
          <app-decision-simulator></app-decision-simulator>
        </div>
      </div>


      <!-- 📋 تقرير الدورة (مكان التنبيهات النشطة) — بيتبع القطيع المختار -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="section-title mb-0">📋 تقرير الدورة</h2>
          <a routerLink="/reports" class="text-xs font-semibold text-primary-600 hover:text-primary-800 no-underline">
            التفاصيل الكاملة →
          </a>
        </div>

        <!-- 🔒 دورة منتهية والمستخدم مش Pro -->
        <div *ngIf="cycleLocked()" class="text-center py-4">
          <div class="text-3xl mb-2">🔒</div>
          <p class="text-sm font-bold text-gray-800 mb-1">تقرير الدورة المنتهية لمشتركي Pro فقط</p>
          <p class="text-xs text-[var(--c-muted)] mb-3">التقرير متاح مجاناً طول ما الدورة شغالة.</p>
          <a routerLink="/subscription" class="btn-primary btn btn-sm inline-flex">⭐ ترقية لـ Pro</a>
        </div>

        <ng-container *ngIf="cycleReport() as r">
          <p class="text-xs text-[var(--c-muted)] mb-3">🐔 {{ r.flock_name }}</p>
          <div class="grid grid-cols-2 gap-2 text-sm mb-3">
            <div class="bg-gray-50 rounded-xl p-2.5">
              <div class="text-[11px] text-gray-400">مدة الدورة</div>
              <div class="font-black">{{ r.cycle_days ?? '—' }} يوم</div>
            </div>
            <div class="bg-gray-50 rounded-xl p-2.5">
              <div class="text-[11px] text-gray-400">نسبة النفوق</div>
              <div class="font-black text-red-600">{{ r.mortality_rate }}%</div>
            </div>
            <div class="bg-gray-50 rounded-xl p-2.5">
              <div class="text-[11px] text-gray-400">FCR</div>
              <div class="font-black">{{ r.fcr ?? '—' }}</div>
            </div>
            <div class="bg-gray-50 rounded-xl p-2.5">
              <div class="text-[11px] text-gray-400">التحصينات</div>
              <div class="font-black">{{ r.vaccinations_completed }}</div>
            </div>
          </div>

          <div *ngIf="r.financial as fin" class="flex items-baseline justify-between border-t pt-3 mb-3">
            <span class="text-xs text-gray-500">💰 صافي الربح التقديري</span>
            <span class="font-black"
                  [class.text-green-600]="fin.net_profit >= 0" [class.text-red-600]="fin.net_profit < 0">
              {{ fin.net_profit >= 0 ? '+' : '' }}{{ fin.net_profit | number:'1.0-0' }} ج
            </span>
          </div>

          <div *ngIf="!reportsIsPro()" class="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-2 mb-3">
            ⏳ متاح لك مجاناً طول ما الدورة شغالة، وبعد ما تنتهي محتاج اشتراك Pro.
          </div>

          <button (click)="downloadCyclePdf()"
                  class="w-full py-2 rounded-xl bg-gray-800 text-white text-xs font-bold">
            ⬇️ تحميل PDF
          </button>
        </ng-container>

        <div *ngIf="!cycleReport() && !cycleLocked()" class="text-center py-6 text-[var(--c-muted)] text-sm">
          {{ cycleLoading() ? 'جاري تحميل التقرير...' : 'لا توجد بيانات كافية بعد' }}
        </div>
      </div>

    </ng-container>



  </div>
  `,
})
export class DashboardComponent implements OnInit {
  private flockSvc = inject(FlockService);
  private alertSvc = inject(AlertService);
  private auth = inject(AuthService);
  private http = inject(HttpClient);
  private streakSvc = inject(StreakService);

  bannerStreakText = computed(() => {
    const s: any = this.streakSvc.streak() ?? this.cachedStreak();
    if (!s) return null;
    if (s.current_streak === 0) return 'سجّل بيانات النهاردة عشان تبدأ سلسلة أيامك';
    const remaining = s.next_milestone ? s.next_milestone - s.current_streak : null;
    return remaining
      ? `سجّلت ${s.current_streak} ${s.current_streak === 1 ? 'مرة' : 'مرات'} متتالية — باقي ${remaining} ${remaining === 1 ? 'يوم' : 'أيام'} للهدية 🎁`
      : `سجّلت ${s.current_streak} مرة متتالية 🔥`;
  });

  flocks = computed(() => {
    // لو السيرفر لسه ماردّش (أوفلاين) بنعرض آخر قطعان محفوظة؛ ولو رد فعلاً بنثق في رده حتى لو فاضي
    const live: any[] = this.flockSvc.flocks();
    const list = [...(live.length > 0 || this.flocksFresh() ? live : this.cachedFlocks())];
    return list.sort((a: any, b: any) => {
      const dateA = new Date(a.created_at ?? a.createdAt ?? 0).getTime();
      const dateB = new Date(b.created_at ?? b.createdAt ?? 0).getTime();
      return dateB - dateA;
    });
  });

  allAlerts = this.alertSvc.alerts;
  activeAlerts = computed(() => this.allAlerts().filter((a: Alert) => !a.resolved).slice(0, 4));
  userName = computed(() => this.auth.currentUser()?.name?.split(' ')[0] ?? '');
  lang = localStorage.getItem('lang') ?? 'ar';
  Math = Math;

  // بيستخدم isAuthenticated الجاهزة أصلاً في AuthService (مبنية على وجود التوكن)
  // بدل ما نخترع حقل مش موجود في الـ User model
  isLoggedIn = computed(() => this.auth.isAuthenticated());
  hasFlock = computed(() => this.flocks().length > 0);

  // القطيع اللي المستخدم اختاره من الأزرار فوق الـ Stats Grid
  selectedFlockId = signal<string | null>(null);

  // بيتأكد إن القطيع المختار لسه موجود فعلاً (مش متحذف)؛ لو اتحذف أو لسه مفيش اختيار،
  // بيرجع تلقائي لأول قطيع متاح في القايمة الحالية
  currentFlockId = computed(() => {
    const list = this.flocks();
    if (list.length === 0) return null;
    const id = this.selectedFlockId();
    const stillExists = id !== null && list.some((f: any) => f.id === id);
    return stillExists ? id : list[0].id;
  });

  currentFlock = computed(() => {
    const id = this.currentFlockId();
    if (id === null) return null;
    return this.flocks().find((f: any) => f.id === id) ?? null;
  });
  // الشرط اللي بيتحكم في ظهور كل حاجة غير البانر والأسعار:
  // لازم يكون المستخدم مسجّل دخول ولازم يكون فيه قطيع واحد على الأقل مسجّل
  fullAccess = computed(() => this.isLoggedIn() && this.hasFlock());

  isPro = signal(false);
  planInfo = signal<any>(null);
  dailyPrices = signal<any[]>([]);
  // تاريخ آخر تحديث فعلي للأسعار (مش تاريخ النهارده) عشان الأسعار المحفوظة أوفلاين ماتبانش جديدة
  pricesUpdatedAt = signal<number | null>(null);
  priceDate = computed(() => new Date(this.pricesUpdatedAt() ?? Date.now()).toLocaleDateString('en-GB'));
  todayTemps = signal<Record<string, { temperature_celsius: number | null; record_date: string }>>({});
  avgFcr = signal<number | null>(null);
  recentMortalityTotal = signal<number | null>(null);
  // ⚠️ مصدر منفصل عمداً عن isPro (اللي بييجي من /payment/status) — ده بالظبط
  // نفس الـ endpoint اللي صفحة /reports الحقيقية بتتحقق بيه (check_pro على
  // users.plan)، عشان كارد الداشبورد ده يتفق مع الصفحة الحقيقية دايماً
  // ومايحصلش تناقض بين مصدرين مختلفين لنفس المعلومة.
  reportsIsPro = signal(false);

  // ══════════════════════════════════════════════════════════════
  // 💾 حفظ أرقام المستخدم (حرارة اليوم / متوسط FCR / النفوق / حالة Pro) على الجهاز
  // لحد ما أرقام جديدة توصل. الحفظ بمفتاح مرتبط بـ user id، والقراءة بتتم لمفتاح
  // المستخدم الحالي بس، فبيانات مستخدم عمرها ما بتظهر لمستخدم تاني.
  // لو الـ id مش معروف مفيش حفظ ولا قراءة خالص.
  // ══════════════════════════════════════════════════════════════
  private fresh = { temps: false, fcr: false, mort: false, pro: false, plan: false }; // اتحدّثت من السيرفر في الجلسة دي
  private lastCacheUid: string | null = null;

  private cacheUserId = computed<string | null>(() => {
    if (!this.isLoggedIn()) return null;
    // الويب مفيش فيه تخزين لبيانات المستخدم في المتصفح (سياسة AuthService) — الحفظ على الموبايل بس
    if (!this.auth.isNative) return null;
    const u: any = this.auth.currentUser();
    const id = u?.id ?? u?.user_id ?? u?.email ?? null;
    return id === null || id === undefined || id === '' ? null : String(id);
  });

  private numbersKey(uid: string): string {
    return `dashboard_numbers_cache_v1_${uid}`;
  }

  private persistNumbers(): void {
    const uid = this.cacheUserId();
    if (!uid) return;
    try {
      const key = this.numbersKey(uid);
      const next: any = JSON.parse(localStorage.getItem(key) || 'null') || {};
      if (this.fresh.temps) next.todayTemps = this.todayTemps();
      if (this.fresh.fcr) next.avgFcr = this.avgFcr();
      if (this.fresh.mort) next.recentMortalityTotal = this.recentMortalityTotal();
      if (this.fresh.pro) next.reportsIsPro = this.reportsIsPro();
      if (this.fresh.plan) next.isPro = this.isPro();
      localStorage.setItem(key, JSON.stringify(next));
    } catch (e) {
      console.warn('تعذّر حفظ أرقام الداشبورد محلياً:', e);
    }
  }

  // بيعرض المحفوظ بس للحقول اللي لسه ماوصلهاش تحديث من السيرفر
  private restoreNumbers(uid: string): void {
    try {
      const c: any = JSON.parse(localStorage.getItem(this.numbersKey(uid)) || 'null');
      if (!c) return;
      if (!this.fresh.temps && c.todayTemps) this.todayTemps.set(c.todayTemps);
      if (!this.fresh.fcr && c.avgFcr !== undefined) this.avgFcr.set(c.avgFcr);
      if (!this.fresh.mort && c.recentMortalityTotal !== undefined) this.recentMortalityTotal.set(c.recentMortalityTotal);
      if (!this.fresh.pro && c.reportsIsPro !== undefined) this.reportsIsPro.set(!!c.reportsIsPro);
      if (!this.fresh.plan && c.isPro !== undefined) this.isPro.set(!!c.isPro);
      if (!this.flocksFresh() && Array.isArray(c.flocks)) this.cachedFlocks.set(c.flocks);
      if (c.streak && !this.streakSvc.streak()) this.cachedStreak.set(c.streak);
    } catch {
      /* نسخة محفوظة تالفة: بنتجاهلها */
    }
  }

  private resetNumbers(): void {
    this.fresh = { temps: false, fcr: false, mort: false, pro: false, plan: false };
    this.todayTemps.set({});
    this.avgFcr.set(null);
    this.recentMortalityTotal.set(null);
    this.reportsIsPro.set(false);
    this.isPro.set(false);
    this.cachedFlocks.set([]);
    this.cachedStreak.set(null);
    this.flocksFresh.set(false);
  }

  // 💾 القطعان وسلسلة الأيام: بتتحفظ برضه عشان الداشبورد يفضل ظاهر أوفلاين
  private flocksFresh = signal(false);          // السيرفر رد فعلاً في الجلسة دي
  private cachedFlocks = signal<any[]>([]);
  private cachedStreak = signal<any>(null);

  private extrasPersistEffect = effect(() => {
    const uid = this.cacheUserId();
    const live: any[] = this.flockSvc.flocks();
    const fresh = this.flocksFresh();
    const streak: any = this.streakSvc.streak();
    if (!uid) return;
    untracked(() => {
      try {
        const key = this.numbersKey(uid);
        const next: any = JSON.parse(localStorage.getItem(key) || 'null') || {};
        if (live.length > 0 || fresh) next.flocks = live;
        if (streak) next.streak = streak;
        localStorage.setItem(key, JSON.stringify(next));
      } catch (e) {
        console.warn('تعذّر حفظ القطعان محلياً:', e);
      }
    });
  });

  loadFlocks() {
    this.flockSvc.getFlocks().subscribe({
      // لو الـ service بتبلع الخطأ وترجّع فاضي وإحنا أوفلاين، منعتبرهاش رد حقيقي
      next: () => { if (navigator.onLine) this.flocksFresh.set(true); },
      error: () => {},
    });
  }

  // لما المستخدم يتعرف: نعرض أرقامه المحفوظة. ولو المستخدم اتغير (خروج / دخول بحساب تاني)
  // نمسح أرقام المستخدم السابق من الشاشة فوراً ونحمّل أرقام الجديد.
  private numbersCacheEffect = effect(() => {
    const uid = this.cacheUserId();
    untracked(() => {
      const prev = this.lastCacheUid;
      if (prev === uid) return;
      this.lastCacheUid = uid;

      if (prev !== null) {
        this.resetNumbers();
        if (uid) {
          this.loadFlocks();
          this.loadPlanInfo();
          this.loadTodayTemps();
          this.loadReportsProStatus();
          this.streakSvc.refresh();
        }
      }
      if (!uid) return;
      this.restoreNumbers(uid);
      this.persistNumbers(); // لو وصلت أرقام جديدة قبل ما الـ id يتعرف
    });
  });

  // 📋 تقرير الدورة للقطيع المختار
  cycleReport = signal<any>(null);
  cycleLocked = signal(false);
  cycleLoading = signal(false);

  // بيعيد تحميل التقرير كل ما القطيع المختار (أو المستخدم) يتغير
  private cycleReportEffect = effect(() => {
    const id = this.currentFlockId();
    const uid = this.cacheUserId();
    untracked(() => {
      if (id && this.isLoggedIn()) this.loadCycleReport(id);
      else { this.cycleReport.set(null); this.cycleLocked.set(false); }
    });
    void uid;
  });

  private cycleKey(uid: string, flockId: string): string {
    return `dashboard_cycle_cache_v1_${uid}_${flockId}`;
  }

  loadCycleReport(flockId: string) {
    const uid = this.cacheUserId();
    this.cycleLoading.set(true);
    this.cycleLocked.set(false);

    // عرض آخر تقرير محفوظ لنفس القطيع فوراً لحد ما يوصل الجديد
    let shown = false;
    if (uid) {
      try {
        const c = JSON.parse(localStorage.getItem(this.cycleKey(uid, flockId)) || 'null');
        if (c) { this.cycleReport.set(c); shown = true; }
      } catch { /* نسخة تالفة: نتجاهلها */ }
    }
    if (!shown) this.cycleReport.set(null);

    this.http.get(`${environment.apiUrl}/reports/end-of-cycle?flock_id=${flockId}`).subscribe({
      next: (res: any) => {
        if (this.currentFlockId() !== flockId) return; // المستخدم غيّر القطيع في النص
        this.cycleReport.set(res);
        this.cycleLoading.set(false);
        if (uid) {
          try { localStorage.setItem(this.cycleKey(uid, flockId), JSON.stringify(res)); } catch { /* مش مشكلة */ }
        }
      },
      error: (err: any) => {
        this.cycleLoading.set(false);
        // 403 + upgrade_required = دورة منتهية والمستخدم مش مشترك
        if (err?.status === 403 && err?.error?.detail?.upgrade_required) {
          this.cycleLocked.set(true);
          this.cycleReport.set(null);
          if (uid) { try { localStorage.removeItem(this.cycleKey(uid, flockId)); } catch { /* */ } }
        }
        // أي خطأ تاني (أوفلاين مثلاً): بنسيب آخر تقرير محفوظ معروض
      },
    });
  }

  downloadCyclePdf() {
    const id = this.currentFlockId();
    if (!id) return;
    this.http.get(`${environment.apiUrl}/reports/end-of-cycle/pdf?flock_id=${id}`,
      { responseType: 'blob' }
    ).subscribe({
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
// 1. قاموس لترجمة اسم الفئة للعربية
categoryNamesAr: { [key: string]: string } = {
  'poultry': 'دجاج التسمين',
  'broiler': 'دجاج التسمين',
  'chicks': 'الكتاكيت',
  'turkey':"الرومي",
  'feed': 'الأعلاف',
  'breeders':'أمهات ',
  'eggs': 'البيض',
  'ducks': 'البيطري والبط'

};

// 2. مصفوفة تحدد أولوية الترتيب (الدجاج أولاً)
categoryOrder = ['poultry', 'broiler', 'chicks', 'feed', 'eggs'];

get groupedPrices() {
  const pricesList = this.visiblePrices() || [];
  const groups: { [key: string]: any[] } = {};

  // تجميع الأسعار حسب الفئة
  pricesList.forEach(p => {
    const cat = p.category ? p.category.toLowerCase() : 'other';
    if (!groups[cat]) {
      groups[cat] = [];
    }
    groups[cat].push(p);
  });

  // ترتيب الفئات بحيث يكون الدجاج أولاً ثم باقي الفئات
  const sortedEntries = Object.entries(groups).sort(([catA], [catB]) => {
    const indexA = this.categoryOrder.indexOf(catA);
    const indexB = this.categoryOrder.indexOf(catB);
    
    const rankA = indexA !== -1 ? indexA : 99;
    const rankB = indexB !== -1 ? indexB : 99;

    return rankA - rankB;
  });

  return sortedEntries; // يرجع [ [categoryKey, itemsList], ... ]
}

// دالة كمساعدة للحصول على الاسم العربي بسهولة
getCategoryNameAr(categoryKey: string): string {
  const key = categoryKey ? categoryKey.toLowerCase() : '';
  return this.categoryNamesAr[key] || categoryKey;
}
  // إحصائيات القطيع المعروض في كارت الصحة (الطيور / النفوق / حرارة اليوم)
  flockStats = computed(() => {
    const f: any = this.currentFlock();
    if (!f) return { birds: null as number | null, dead: null as number | null, temp: null as number | null };
    const current = Number(f.currentCount ?? f.current_count ?? 0);
    const initial = Number(f.initialCount ?? f.initial_count ?? 0);
    const t = this.todayTemps()[f.id]?.temperature_celsius;
    return { birds: current, dead: Math.max(0, initial - current), temp: t ?? null };
  });

  stats = computed(() => {
    const flock: any = this.currentFlock();
    if (!flock) return [];

    const current = Number(flock.currentCount ?? flock.current_count ?? 0);
    const initial = Number(flock.initialCount ?? flock.initial_count ?? 0);
    const dead = Math.max(0, initial - current);
    const mortalityRate = flock.mortalityRate ?? flock.mortality_rate ?? null;

    // درجة حرارة اليوم لنفس القطيع المختار بس
    const flockTemp = this.todayTemps()[flock.id]?.temperature_celsius;

    // التنبيهات الخاصة بالقطيع المختار بس
    const flockAlerts = this.allAlerts().filter(
      (a: any) => !a.resolved && (a.flock_id === flock.id || a.flockId === flock.id)
    );

    return [
      { icon: '🐣', value: current.toLocaleString(), label: 'STATS.BIRDS', color: 'var(--c-primary)', bg: 'var(--c-primary-pal)' },
      { icon: '📉', value: dead, label: 'STATS.MORTALITY', color: '#dc2626', bg: '#fee2e2' },
      { icon: '🐔', value: flock.ageInDays ?? flock.age_in_days ?? '—', label: 'STATS.AGE', color: '#1d4ed8', bg: '#dbeafe' },
      { icon: '🔔', value: flockAlerts.length, label: 'STATS.ALERTS', color: '#d97706', bg: '#fef3c7' },
      { icon: '🌡️', value: flockTemp !== null && flockTemp !== undefined ? flockTemp + '°' : '—', label: 'STATS.TEMPERATURE', color: '#0891b2', bg: '#cffafe' },
    ];
  });

  private destroyRef = inject(DestroyRef);
  private onOnline = () => this.refreshAll();

  ngOnInit() {
    this.refreshAll();
    // 🌐 أول ما النت يرجع نحدّث كل الأرقام تلقائياً
    window.addEventListener('online', this.onOnline);
    this.destroyRef.onDestroy(() => window.removeEventListener('online', this.onOnline));
  }

  refreshAll() {
    this.loadFlocks();
    this.alertSvc.loadAlerts();
    this.loadPlanInfo();
    this.loadPrices();
    this.loadTodayTemps();
    this.loadReportsProStatus();
    this.loadWeather(this.weatherGov());
    const id = this.currentFlockId();
    if (id && this.isLoggedIn()) this.loadCycleReport(id);
    if (this.isLoggedIn()) this.streakSvc.refresh();
  }

  loadReportsProStatus() {
    this.http.get(`${environment.apiUrl}/reports/summary`).subscribe({
      next: (res: any) => {
        this.reportsIsPro.set(!!res.is_pro);
        this.fresh.pro = true;
        this.persistNumbers();
        if (res.is_pro) this.loadReportsSummary();
      },
      error: (err: any) => {
        // لو الاتصال فشل بنسيب المحفوظ؛ بس لو السيرفر رفض الجلسة نشيل صلاحية Pro
        if (err?.status === 401 || err?.status === 403) this.reportsIsPro.set(false);
      }
    });
  }

  // 🌤️ طقس النهارده وبكره (الكاش على السيرفر 8 ساعات حسب المحافظة)
  weather = signal<{ today: any; tomorrow: any } | null>(null);

  // ⚠️ عدّل أسماء الحقول دي حسب اسم حقل المحافظة الفعلي في الـ flock عندك
  private weatherGov = computed(() => {
    const f: any = this.currentFlock();
    return f?.governorate ?? f?.city ?? f?.location ?? '';
  });

  // بيحمّل الطقس أول ما الصفحة تفتح، وتاني لو المحافظة اتغيرت (قطيع تاني)
  private weatherEffect = effect(() => {
    const gov = this.weatherGov();
    untracked(() => this.loadWeather(gov));
  });

  // بعض الـ APIs بترجّع روابط الأيقونات من غير https (//cdn...)
  iconUrl(u: string): string {
    return u?.startsWith('//') ? 'https:' + u : u;
  }

  // 🔄 تبديل النهارده / بكره في كارت الطقس
  weatherDay = signal<'today' | 'tomorrow'>('today');
  activeWeather = computed(() => this.weather()?.[this.weatherDay()] ?? null);
  toggleWeather() {
    this.weatherDay.update(d => (d === 'today' ? 'tomorrow' : 'today'));
  }

  // 🌡️ الأيقونة بتتغير مع الدرجة نفسها
  // أولاً: لو الحالة مطر / عاصفة / ثلج / شبورة / غيوم بتغلب على الدرجة
  // ثانياً: غير كده الأيقونة بتتحدد من الدرجة العظمى
  weatherIcon(w: { max: number; condition?: string }): string {
    const c = (w.condition || '').toLowerCase();
    if (/عاصف|عواصف|رعد|storm|thunder/.test(c)) return '⛈️';
    if (/ثلج|snow/.test(c)) return '❄️';
    if (/مطر|أمطار|rain|drizzle/.test(c)) return '🌧️';
    if (/شبورة|ضباب|fog|mist/.test(c)) return '🌫️';
    if (/غائم جزئ|partly/.test(c)) return '⛅';
    if (/غائم|غيوم|سحاب|cloud|overcast/.test(c)) return '☁️';

    const t = Number(w.max);
    if (isNaN(t)) return '☀️';
    if (t >= 38) return '🥵';   // حر شديد
    if (t >= 30) return '☀️';   // حر / صافي
    if (t >= 22) return '🌤️';  // معتدل دافي
    if (t >= 15) return '⛅';   // معتدل
    if (t >= 8)  return '☁️';   // بارد
    return '🥶';                // برد شديد
  }

  loadWeather(governorate: string) {
    const key = `weather_cache_v1_${governorate || 'default'}`;
    try {
      const cached = JSON.parse(localStorage.getItem(key) || 'null');
      if (cached?.today && cached?.tomorrow) this.weather.set(cached);
    } catch { /* نسخة تالفة: نتجاهلها */ }

    const params: any = governorate ? { governorate } : {};
    this.http.get<any>(`${environment.apiUrl}/weather-widget/summary`, { params }).subscribe({
      next: (res) => {
        if (res?.today && res?.tomorrow) {
          this.weather.set(res);
          try { localStorage.setItem(key, JSON.stringify(res)); } catch { /* مش مشكلة */ }
        }
      },
      error: () => {} // بنسيب آخر طقس محفوظ
    });
  }

  loadTodayTemps() {
    this.http.get<Record<string, any>>(`${environment.apiUrl}/flocks/today-temperatures`).subscribe({
      next: (res) => {
        this.todayTemps.set(res || {});
        this.fresh.temps = true;
        this.persistNumbers();
      },
      error: () => {} // بنسيب آخر درجات حرارة محفوظة
    });
  }

  loadReportsSummary() {
    this.http.get(`${environment.apiUrl}/reports/fcr-comparison`).subscribe({
      next: (res: any) => {
        const values = (res.flocks || []).map((f: any) => f.fcr).filter((v: any) => v != null);
        this.avgFcr.set(values.length ? +(values.reduce((a: number, b: number) => a + b, 0) / values.length).toFixed(2) : null);
        this.fresh.fcr = true;
        this.persistNumbers();
      },
      error: () => {}
    });
    this.http.get(`${environment.apiUrl}/reports/mortality-trend`).subscribe({
      next: (res: any) => {
        const total = (res.data || []).reduce((s: number, d: any) => s + (d.mortality || 0), 0);
        this.recentMortalityTotal.set(total);
        this.fresh.mort = true;
        this.persistNumbers();
      },
      error: () => {}
    });
  }

  prices = signal<any[]>([]);

  // 🌐 عرض الزوار / من غير قطيع (نفس منطق صفحة /prices)
  priceCategories = CATEGORIES;
  selectedPriceTab = signal('');

  guestGroups = computed(() => {
    const tab = this.selectedPriceTab();
    const map = new Map<string, any[]>();

    for (const p of this.prices() || []) {
      const cat = (p.category || '').toLowerCase();
      if (tab && cat !== tab) continue;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    }

    const groups: { category: string; items: any[] }[] = [];
    for (const c of CATEGORIES) {
      if (map.has(c.value)) groups.push({ category: c.value, items: map.get(c.value)! });
    }
    // أي قسم مش معرّف في CATEGORIES يظهر في الآخر
    for (const [cat, items] of map) {
      if (!CATEGORIES.some(c => c.value === cat)) groups.push({ category: cat, items });
    }
    return groups;
  });

  // تابات الأسعار: الأقسام اللي فيها أسعار فعلاً، والتاب النشط (أول قسم لو مفيش اختيار)
  availableTabs = computed(() => {
    const cats = new Set((this.prices() || []).map((p: any) => (p.category || '').toLowerCase()));
    return CATEGORIES.filter(c => cats.has(c.value));
  });

  activePriceTab = computed(() => {
    const sel = this.selectedPriceTab();
    const tabs = this.availableTabs();
    if (sel && tabs.some(t => t.value === sel)) return sel;
    return tabs[0]?.value ?? '';
  });

  tabPrices = computed(() => {
    const tab = this.activePriceTab();
    const rank = (p: any) => {
      const i = this.pinnedPriceNames.findIndex(k => (p.item_name_ar || '').includes(k));
      return i === -1 ? 99 : i;
    };
    // الأصناف المهمة (الفراخ البيضاء / ساسو / روزي) الأول، والباقي بترتيبه
    return (this.prices() || [])
      .filter((p: any) => (p.category || '').toLowerCase() === tab)
      .map((p: any, i: number) => ({ p, i }))
      .sort((a, b) => rank(a.p) - rank(b.p) || a.i - b.i)
      .map(x => x.p);
  });

  private pinnedPriceNames = ['الفراخ البيضاء', 'ساسو', 'روزي'];

  getCategoryLabel(cat: string): string {
    return CATEGORIES.find(c => c.value === cat)?.label ?? cat;
  }

  // 📌 المسجّل اللي عنده قطيع: 5 أسعار بسيطة بس (صنف واحد من كل قسم، وعلف واحد بس)
  // 🌐 غير المسجّل أو من غير قطيع: كل الأسعار زي صفحة /prices
  private compactOrder = ['broiler', 'eggs', 'chicks', 'breeders', 'feed'];
  private compactPreferred: Record<string, string> = {
    broiler: 'الفراخ البيضاء',
    eggs: 'بيض أبيض',
    chicks: 'كتكوت أبيض أهالي',
    breeders:'أمهات',
  };

  visiblePrices = computed(() => {
    const all = this.prices() || [];
    if (!this.fullAccess()) return all;

    const catOf = (p: any) => (p.category || '').toLowerCase();
    const picked: any[] = [];

    for (const cat of this.compactOrder) {
      const inCat = all.filter(p => catOf(p) === cat);
      if (!inCat.length) continue;
      const pref = this.compactPreferred[cat];
      picked.push(inCat.find(p => (p.item_name_ar || '').trim() === pref) ?? inCat[0]);
    }

    // لو فيه أقسام ناقصة، كمّل من باقي الأقسام (رومي / بط ...) لحد 5
    if (picked.length < 5) {
      const used = new Set(picked.map(catOf));
      for (const p of all) {
        if (picked.length >= 5) break;
        if (!used.has(catOf(p))) { picked.push(p); used.add(catOf(p)); }
      }
    }
    return picked.slice(0, 5);
  });

  // 💾 آخر أسعار وصلت بتتحفظ على الجهاز وتفضل معروضة لحد ما أسعار جديدة توصل
  // (نفس المفتاح مشترك بين الداشبورد وسوق التجار)
  private readonly PRICES_CACHE_KEY = 'prices_latest_cache_v1';
  private readonly PRICES_TS_KEY = 'prices_latest_cache_ts_v1';

  private readCachedPrices(): any[] {
    try {
      const raw = localStorage.getItem(this.PRICES_CACHE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private writeCachedPrices(data: any[]): void {
    try {
      localStorage.setItem(this.PRICES_CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(this.PRICES_TS_KEY, String(Date.now()));
    } catch (e) {
      console.warn('تعذّر حفظ الأسعار محلياً:', e);
    }
  }

  loadPrices() {
    // عرض آخر أسعار محفوظة فوراً لحد ما توصل الجديدة
    const cached = this.readCachedPrices();
    if (cached.length) {
      this.prices.set(cached);
      const ts = Number(localStorage.getItem(this.PRICES_TS_KEY));
      if (ts) this.pricesUpdatedAt.set(ts);
    }

    this.http.get<any>(`${environment.apiUrl}/prices/latest`).subscribe({
      next: res => {
        const data = res?.prices ?? [];
        this.prices.set(data);
        this.pricesUpdatedAt.set(Date.now());
        this.writeCachedPrices(data);
      },
      error: () => {} // لو فشل الاتصال بنسيب آخر أسعار محفوظة معروضة
    });
  }

  loadPlanInfo() {
    this.http.get(`${environment.apiUrl}/payment/status`).subscribe({
      next: (res: any) => {
        this.planInfo.set(res);
        this.isPro.set(res.is_pro);
        this.fresh.plan = true;
        this.persistNumbers();
      },
      error: () => {}
    });
  }

  // دوال الاستخراج الديناميكي للألوان لتنعكس فوراً داخل كروت الـ HTML:
  getCategoryColor(cat: string, type: 'bg' | 'header'): string {
    const found = CATEGORIES.find(c => c.value === cat);
    return type === 'header' ? (found?.headerColor ?? '#2d9e5f') : (found?.color ?? '#f5f5f5');
  }

  getCategoryIcon(cat: string): string {
    return CATEGORIES.find(c => c.value === cat)?.icon ?? '📈';
  }

  getCategoryUnit(cat: string): string {
    return CATEGORIES.find(c => c.value === cat)?.unit ?? 'كجم';
  }

  alertIcon(a: Alert): string {
    if (!a) return '🔔';
    const icons: any = { danger: '🚨', warning: '⏳', info: '💊', success: '✅' };
    return icons[a.type] ?? '🔔';
  }
}