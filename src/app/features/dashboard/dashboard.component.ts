import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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
    <div class="relative overflow-hidden rounded-3xl text-white"
         style="background:linear-gradient(135deg,#0f2d1a 0%,#1e7d48 60%,#2d9e5f 100%)">
      <div class="absolute inset-0 opacity-10"
            style="background:repeating-linear-gradient(45deg,transparent,transparent 30px,rgba(255,255,255,.05) 30px,rgba(255,255,255,.05) 60px)"></div>
      <div class="relative px-6 py-7 flex items-center gap-4">
        <div class="flex-1">
          <p class="text-white/60 text-sm font-medium mb-1">{{ 'DASHBOARD.WELCOME' | translate }},</p>
          <h1 class="text-2xl font-bold leading-tight">{{ userName() }} 👋</h1>
        </div>
        <!-- Pro Badge -->
        <div *ngIf="isPro()" class="bg-amber-400 text-amber-900 text-xs font-black px-3 py-1.5 rounded-2xl flex-shrink-0">
          ⭐ PRO
        </div>
        <!-- Streak Badge (بدل عرض الأسئلة المتبقية القديم) -->
        <div *ngIf="bannerStreakText() as text" class="flex-shrink-0">
          <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                      bg-gradient-to-l from-amber-400 to-orange-500 shadow-lg shadow-orange-500/30
                      animate-pulse">
            <span class="text-base leading-none">🔥</span>
            <span class="text-white text-xs font-black leading-none">{{ text }}</span>
          </div>
        </div>
        <div class="text-6xl opacity-20 select-none hidden sm:block">🐔</div>
      </div>
    </div>

    <!-- 2-col grid -->
   <!-- شبكة تعوض الكروت: كل Category كارت مستقل بذاته -->
<!-- شبكة الكروت: كل Category في كارت مستقل -->
<ng-template #pricesBlock>
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-5" *ngIf="prices() && prices().length > 0">

  <!-- Loop على كل Category بعد الترتيب -->
  <div *ngFor="let group of groupedPrices"
       class="card flex flex-col transition-all duration-200 bg-white shadow-sm border border-gray-100"
       [style.border-inline-start]="'3px solid ' + getCategoryColor(group[0], 'header')">

    <!-- هيدر الكارت: الاسم بالعربي + الأيقونة -->
    <div class="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
      <div class="flex items-center gap-2.5">
        <span class="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              [style.background-color]="getCategoryColor(group[0], 'bg')">
          {{ getCategoryIcon(group[0]) }}
        </span>
        <!-- هنا تم تغيير الاسم للغة العربية -->
        <h2 class="text-sm font-bold text-gray-700 mb-0">
          {{ getCategoryNameAr(group[0]) }}
        </h2>
      </div>
      <a routerLink="/prices" class="text-xs font-medium text-gray-400 no-underline hover:text-primary-600 transition-colors">
        عرض الكل ←
      </a>
    </div>

    <!-- قائمة الأصناف الخاصة بهذه الفئة تحت بعضها -->
    <div class="flex flex-col gap-2 w-full">
      <div *ngFor="let p of group[1]" class="rounded-xl p-3 border border-gray-100 w-full">

        <!-- اسم الصنف -->
        <div class="flex items-center justify-between mb-1.5">
          <p class="text-sm font-semibold text-gray-700 truncate mb-0">{{ p.item_name_ar }}</p>
        </div>

        <!-- تفاصيل السعر -->
        <div class="flex items-center justify-between bg-gray-50 rounded-lg px-2.5 py-2 mt-1">
          <div class="flex items-center gap-2 text-xs font-bold" [style.color]="getCategoryColor(p.category, 'header')">
            <span class="text-gray-400 font-normal">التنفيذ:</span>
            <span>{{ p.price_min | number }}</span>

            <ng-container *ngIf="p.price_max && p.price_max !== p.price_min">
              <span class="text-gray-300">|</span>
              <span class="text-gray-400 font-normal">المعلن:</span>
              <span>{{ p.price_max | number }}</span>
            </ng-container>
          </div>

          <span class="text-xs text-gray-400 font-medium">ج / {{ getCategoryUnit(p.category) }}</span>
        </div>

      </div>
    </div>

  </div>

</div>
</ng-template>

    <!-- الأسعار تظهر فوق (تحت البانر) لغير المسجلين، وتنزل تحت مساحة Pro للمسجلين اللي عندهم قطيع -->
    <ng-container *ngIf="!fullAccess()">
      <ng-container *ngTemplateOutlet="pricesBlock"></ng-container>
    </ng-container>

    <!-- 🔒 كارت توجيه لغير المكتملين: يظهر لحد ما يسجّل دخول ويضيف أول قطيع -->
    <div *ngIf="!fullAccess()" class="card text-center py-8 px-5"
         style="background:linear-gradient(135deg,#f0fdf4 0%,#e8f5e9 100%); border:1px dashed #2d9e5f66;">
      <div class="text-4xl mb-3">{{ !isLoggedIn() ? '🔑' : '🐔' }}</div>
      <h2 class="text-base font-bold text-gray-800 mb-1">
        {{ !isLoggedIn() ? 'سجّل دخولك عشان تفتح كل المميزات' : 'سجّل أول قطيع عشان تفتح كل المميزات' }}
      </h2>
      <p class="text-sm text-[var(--c-muted)] mb-4">
        {{ !isLoggedIn()
            ? 'بعد تسجيل الدخول هتقدر تضيف قطعانك وتشوف صحتها وتنبيهاتها ونتائج التقارير.'
            : 'بمجرد ما تضيف قطيع هتقدر تتابع صحته وتنبيهاته ونتائج التقارير كاملة.' }}
      </p>
      <a *ngIf="!isLoggedIn()" routerLink="/auth/login" class="btn-primary btn btn-sm inline-flex">
        تسجيل الدخول
      </a>
      <a *ngIf="isLoggedIn()" routerLink="/flocks" class="btn-primary btn btn-sm inline-flex">
        + {{ 'FLOCK.ADD' | translate }}
      </a>
    </div>

    <!-- 🔓 المحتوى الكامل: يظهر بس بعد توثيق الإيميل وتسجيل أول قطيع -->
    <ng-container *ngIf="fullAccess()">

      <!-- 💚 صحة القطيع النشط -->
      <app-health-score-widget></app-health-score-widget>


      <!-- محول القطيع: يظهر بس لو فيه أكتر من قطيع -->
      <div *ngIf="flocks().length > 1" class="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 mb-3">
        <button *ngFor="let f of flocks()" type="button"
                (click)="selectedFlockId.set(f.id)"
                class="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap"
                [class.bg-primary-600]="currentFlockId() === f.id"
                [class.text-white]="currentFlockId() === f.id"
                [class.border-primary-600]="currentFlockId() === f.id"
                [class.bg-white]="currentFlockId() !== f.id"
                [class.text-gray-600]="currentFlockId() !== f.id"
                [class.border-gray-200]="currentFlockId() !== f.id">
          {{ f.type === 'broiler' ? '🐔' : '🥚' }} {{ f.name }}
        </button>
      </div>

      <!-- Stats Grid: بيانات القطيع المختار بس -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3" *ngIf="currentFlock(); else noSelectedFlock">
        <div class="stat-card animate-in" *ngFor="let s of stats()">
          <div class="stat-icon" [style.background]="s.bg">{{ s.icon }}</div>
          <div>
            <p class="text-xl font-bold leading-none" [style.color]="s.color">{{ s.value }}</p>
            <p class="text-xs text-[var(--c-muted)] mt-1.5 font-medium">{{ s.label | translate }}</p>
          </div>
        </div>
      </div>
      <ng-template #noSelectedFlock>
        <div class="card text-center py-6 text-[var(--c-muted)]">
          <p class="text-3xl mb-2">🐣</p>
          <p class="text-sm">{{ 'DASH.NO_FLOCKS' | translate }}</p>
        </div>
      </ng-template>

      <!-- 2. باقي الكروت (القطعان والتنبيهات) تأتي تحت الأسعار في عمودين بجانب بعضهما -->
      <div class="grid lg:grid-cols-2 gap-5">

        <!-- Flock Health -->
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <h2 class="section-title mb-0">🐔 {{ 'DASH.FLOCKS' | translate }}</h2>
            <a routerLink="/flocks" class="text-xs font-semibold text-primary-600 hover:text-primary-800 no-underline">
              {{ 'COMMON.VIEW_ALL' | translate }} →
            </a>
          </div>
          <div class="space-y-3">
            <a *ngFor="let f of flocks() | slice:0:3" [routerLink]="['/flocks', f.id]"
               class="flex items-center gap-3 p-3 rounded-xl border border-transparent
                      hover:border-primary-200 hover:bg-primary-50/50 transition-all group no-underline">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                   [class.bg-primary-100]="f.type==='broiler'" [class.bg-purple-100]="f.type==='layer'">
                {{ f.type === 'broiler' ? '🐔' : '🥚' }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-[var(--c-text)] truncate">{{ f.name }}</p>
                <div class="flex items-center gap-2 mt-1">
                  <div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-700"
                         [class.bg-primary-500]="f.ageInDays/42 < 0.8"
                         [class.bg-amber-400]="f.ageInDays/42 >= 0.8"
                         [style.width]="Math.min(100, f.ageInDays/(f.type==='broiler'?42:160)*100) + '%'">
                    </div>
                  </div>
                  <span class="text-xs font-medium text-[var(--c-muted)] flex-shrink-0">{{ f.ageInDays }}d</span>
                </div>
              </div>
              <div class="text-end flex-shrink-0">
                <p class="text-sm font-bold"
                   [class.text-green-600]="f.mortalityRate<=2"
                   [class.text-amber-600]="f.mortalityRate>2 && f.mortalityRate<=4"
                   [class.text-red-600]="f.mortalityRate>4">
                  {{ f.mortalityRate | number:'1.1-1' }}%
                </p>
                <p class="text-xs text-[var(--c-faint)]">{{ 'FLOCK.MORTALITY' | translate }}</p>
                <p *ngIf="todayTemps()[f.id] as t" class="text-xs font-semibold text-blue-600 mt-0.5">
                  🌡️ {{ t.temperature_celsius ?? '—' }}°
                </p>
              </div>
            </a>
            <div *ngIf="flocks().length === 0" class="text-center py-6 text-[var(--c-muted)]">
              <p class="text-3xl mb-2">🐣</p>
              <p class="text-sm">{{ 'DASH.NO_FLOCKS' | translate }}</p>
              <a routerLink="/flocks" class="btn-primary btn mt-3 btn-sm inline-flex">
                + {{ 'FLOCK.ADD' | translate }}
              </a>
            </div>
          </div>
        </div>

        <!-- Alerts -->
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <h2 class="section-title mb-0">🔔 {{ 'DASH.ALERTS' | translate }}</h2>
            <a routerLink="/alerts" class="text-xs font-semibold text-primary-600 hover:text-primary-800 no-underline">
              {{ 'COMMON.VIEW_ALL' | translate }} →
            </a>
          </div>
          <div class="space-y-2">
            <div *ngFor="let a of activeAlerts()"
                 class="flex items-start gap-3 p-3 rounded-xl border"
                 [class.bg-red-50]="a.type==='danger'"
                 [class.bg-orange-50]="a.type==='warning'"
                 [class.bg-blue-50]="a.type==='info'"
                 [class.bg-green-50]="a.type==='success'"
                 [class.border-red-100]="a.type==='danger'"
                 [class.border-orange-100]="a.type==='warning'">
              <span class="text-xl mt-0.5 flex-shrink-0">{{ alertIcon(a) }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold truncate"
                   [class.text-red-800]="a.type==='danger'"
                   [class.text-orange-800]="a.type==='warning'"
                   [class.text-blue-800]="a.type==='info'">
                  {{ a.title }}
                </p>
                <p *ngIf="a.flock_name" class="text-xs text-[var(--c-muted)] mt-0.5">🐔 {{ a.flock_name }}</p>
              </div>
            </div>
            <div *ngIf="activeAlerts().length === 0" class="text-center py-6 text-green-600 font-medium text-sm">
              ✅ {{ 'DASH.NO_ALERTS' | translate }}
            </div>
          </div>
        </div>

      </div>

      <!-- الأسعار قبل مساحة Pro مباشرة للمستخدم المسجل اللي عنده قطيع -->
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
    const s = this.streakSvc.streak();
    if (!s || s.current_streak === 0) return null;
    const remaining = s.next_milestone ? s.next_milestone - s.current_streak : null;
    return remaining
      ? `سجّلت ${s.current_streak} ${s.current_streak === 1 ? 'مرة' : 'مرات'} متتالية — باقي ${remaining} ${remaining === 1 ? 'يوم' : 'أيام'} للهدية 🎁`
      : `سجّلت ${s.current_streak} مرة متتالية 🔥`;
  });

  flocks = computed(() => {
    const list = [...this.flockSvc.flocks()];
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
  priceDate = computed(() => new Date().toLocaleDateString(this.lang === 'ar' ? 'ar-EG' : 'en-GB'));
  todayTemps = signal<Record<string, { temperature_celsius: number | null; record_date: string }>>({});
  avgFcr = signal<number | null>(null);
  recentMortalityTotal = signal<number | null>(null);
  // ⚠️ مصدر منفصل عمداً عن isPro (اللي بييجي من /payment/status) — ده بالظبط
  // نفس الـ endpoint اللي صفحة /reports الحقيقية بتتحقق بيه (check_pro على
  // users.plan)، عشان كارد الداشبورد ده يتفق مع الصفحة الحقيقية دايماً
  // ومايحصلش تناقض بين مصدرين مختلفين لنفس المعلومة.
  reportsIsPro = signal(false);
// 1. قاموس لترجمة اسم الفئة للعربية
categoryNamesAr: { [key: string]: string } = {
  'poultry': 'دجاج التسمين',
  'broiler': 'دجاج التسمين',
  'chicks': 'الكتاكيت',
  'turkey':"الرومي",
  'feed': 'الأعلاف',
  'eggs': 'البيض',
  'ducks': 'البيطري والبط'
};

// 2. مصفوفة تحدد أولوية الترتيب (الدجاج أولاً)
categoryOrder = ['poultry', 'broiler', 'chicks', 'feed', 'eggs'];

get groupedPrices() {
  const pricesList = this.prices() || [];
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
  private headers() {
    const token = localStorage.getItem('spa_token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

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

  ngOnInit() {
    this.flockSvc.getFlocks().subscribe();
    this.alertSvc.loadAlerts();
    this.loadPlanInfo();
    this.loadPrices();
    this.loadTodayTemps();
    this.loadReportsProStatus();
    this.streakSvc.refresh();
  }

  loadReportsProStatus() {
    this.http.get(`${environment.apiUrl}/reports/summary`, { headers: this.headers() }).subscribe({
      next: (res: any) => {
        this.reportsIsPro.set(!!res.is_pro);
        if (res.is_pro) this.loadReportsSummary();
      },
      error: () => this.reportsIsPro.set(false)
    });
  }

  loadTodayTemps() {
    this.http.get<Record<string, any>>(`${environment.apiUrl}/flocks/today-temperatures`, { headers: this.headers() }).subscribe({
      next: (res) => this.todayTemps.set(res || {}),
      error: () => {}
    });
  }

  loadReportsSummary() {
    this.http.get(`${environment.apiUrl}/reports/fcr-comparison`, { headers: this.headers() }).subscribe({
      next: (res: any) => {
        const values = (res.flocks || []).map((f: any) => f.fcr).filter((v: any) => v != null);
        this.avgFcr.set(values.length ? +(values.reduce((a: number, b: number) => a + b, 0) / values.length).toFixed(2) : null);
      },
      error: () => {}
    });
    this.http.get(`${environment.apiUrl}/reports/mortality-trend`, { headers: this.headers() }).subscribe({
      next: (res: any) => {
        const total = (res.data || []).reduce((s: number, d: any) => s + (d.mortality || 0), 0);
        this.recentMortalityTotal.set(total);
      },
      error: () => {}
    });
  }

  prices = signal<any[]>([]);

  loadPrices() {
    this.http.get<any>(`${environment.apiUrl}/prices/latest`).subscribe({
      next: res => this.prices.set(res.prices?.slice(0, 6) ?? []),
      error: () => {}
    });
  }

  loadPlanInfo() {
    this.http.get(`${environment.apiUrl}/payment/status`, { headers: this.headers() }).subscribe({
      next: (res: any) => {
        this.planInfo.set(res);
        this.isPro.set(res.is_pro);
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