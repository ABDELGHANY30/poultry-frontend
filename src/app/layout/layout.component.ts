import { Component, OnInit, inject, signal, computed, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../core/services/auth.service';
import { AlertService } from '../core/services/alert.service';
import { filter } from 'rxjs';

interface NavItem {
  path: string; icon: string; key: string; badge?: number; adminOnly?: boolean;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, TranslateModule],
  template: `
    <!-- Overlay for mobile -->
    <div *ngIf="sideOpen() && !isLargeScreen()" 
         class="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
         (click)="sideOpen.set(false)">
    </div>

    <div class="flex-1 flex flex-col min-h-screen min-w-0" >

      <!-- Sidebar -->
      <aside
  class="fixed top-0 bottom-0 z-50 flex flex-col transition-transform duration-300"
  [class.left-0]="!isRtl()"
  [class.right-0]="isRtl()"
  [class.-translate-x-full]="!sideOpen() && !isRtl()"
  [class.translate-x-full]="!sideOpen() && isRtl()"
  style="width:264px; background:linear-gradient(180deg, #0f2d1a 0%, #1a4a2e 55%, #16392a 100%);"
>
        <!-- Logo -->
        <div class="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div class="w-10 h-10 rounded-2xl bg-primary-500/20 border border-primary-400/30 flex items-center justify-center text-xl">🐔</div>
          <div class="flex-1 min-w-0">
<a 
  routerLink="/dashboard" 
  class="text-white font-bold text-sm leading-tight truncate cursor-pointer hover:underline focus:outline-none">
  {{ 'APP.NAME' | translate }}
</a>
          <p class="text-white/40 text-[10px] font-medium">{{ 'APP.TAGLINE' | translate }}</p>
          </div>
          <button class="text-white/40 hover:text-white lg:hidden text-lg" (click)="sideOpen.set(false)">✕</button>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <ng-container *ngFor="let item of visibleNav()">
            <a [routerLink]="item.path" routerLinkActive="nav-active"
               class="nav-item group" (click)="onNavClick()">
              <span class="nav-icon">{{ item.icon }}</span>
              <span class="flex-1 text-sm font-medium">{{ item.key | translate }}</span>
              <span *ngIf="item.badge && item.badge > 0"
                    class="w-5 h-5 rounded-full bg-red-500 px-2 text-white text-[12px] font-bold flex items-center justify-center text-center leading-5">
                {{ item.badge }}
              </span>
            </a>
          </ng-container>
        </nav>

        <!-- Language Toggle -->
        <!-- <div class="px-4 pb-3">
          <div class="flex rounded-xl border border-white/10 overflow-hidden">
            <button class="lang-btn" [class.lang-active]="lang() === 'ar'" (click)="setLang('ar')">🇸🇦 العربية</button>
            <button class="lang-btn" [class.lang-active]="lang() === 'en'" (click)="setLang('en')">🇺🇸 English</button>
          </div>
        </div> -->

      
        <!-- User Section in Sidebar -->
       <!-- User Section in Sidebar -->
       <!-- الجزء الخاص بالمستخدم / تسجيل الدخول -->
<div class="px-4 py-4 border-t border-white/10">

  <!-- حالة 1: المستخدم مسجل ولديه بريد إلكتروني -->
  <div *ngIf="auth.currentUser() && auth.currentUser()?.email; else loginBtns" class="flex items-center gap-3">
    <!-- الصورة الرمزية للمستخدم -->
    <div class="w-9 h-9 rounded-xl bg-primary-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
      {{ userInitial() }}
    </div>
    
    <!-- اسم المستخدم والبريد الإلكتروني -->
    <div class="flex-1 min-w-0">
      <p class="text-white text-sm font-semibold truncate">{{ auth.currentUser()?.name }}</p>
      <p class="text-white/40 text-[11px] truncate">{{ auth.currentUser()?.email }}</p>
    </div>
    
    <!-- زر تسجيل خروج -->
    <button class="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 cursor-pointer flex-shrink-0" 
            (click)="auth.logout()" 
            title="تسجيل خروج">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 transform rotate-180">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
      </svg>
    </button>
  </div>

  <!-- حالة 2: زرين منفصلين لتسجيل الدخول وإنشاء حساب -->
  <ng-template #loginBtns>
    <div class="flex flex-col gap-2">
      <!-- زر تسجيل الدخول -->
      <a routerLink="/login" 
         class="w-full py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H9" />
        </svg>
        <span>تسجيل الدخول</span>
      </a>

      <!-- زر إنشاء حساب جديد -->
      <a routerLink="/register" 
         class="w-full py-2 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 border border-white/10 active:scale-95 cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0M3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
        </svg>
        <span>إنشاء حساب جديد</span>
      </a>
    </div>
  </ng-template>

</div>
      </aside>

      <!-- Main content -->
      <!-- ⚠️ مهم: min-h-screen بيكبر مع المحتوى (مقاسه أدنى بس) — ده مطلوب
           للصفحات العادية (تتمرجل الصفحة كلها لتحت طبيعي)، لكن في صفحة
           الشات لازم الارتفاع يفضل ثابت بالظبط على مقاس الشاشة (h-dvh) عشان
           الـ scroll الداخلي بتاع الرسائل يشتغل بدل ما الصفحة كلها تكبر -->
      <div [class]="isChatRoute()
              ? 'flex-1 flex flex-col h-dvh min-w-0'
              : 'flex-1 flex flex-col min-h-screen min-w-0'"
           [class.lg:ml-64]="!isRtl()"
           [class.lg:mr-64]="isRtl()">

 <header class="sticky top-0 z-30 bg-white dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-800 flex items-center py-2 gap-3 px-4 lg:px-6 transition-colors duration-300" style="height:60px">
  
  <!-- زر القائمة الجانبية (Mobile Menu Button) -->
  <button class="text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 text-2xl lg:hidden focus:outline-none transition-colors" (click)="sideOpen.set(!sideOpen())">
    ☰
  </button>

  <!-- الشعار والاسم -->
  <a routerLink="/dashboard" 
     class="group flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all duration-300 hover:bg-emerald-500/10 focus:outline-none cursor-pointer">
    
    <!-- أيقونة الشعار (Logo Icon) -->
    <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-green-500 text-white shadow-md shadow-emerald-500/20 group-hover:scale-110 transition-transform duration-300">
      <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-5l6 2.5-6 2.5zm0-8.5 6 2.5-6 2.5V8z"/>
      </svg>
    </div>

    <!-- نص الشعار -->
    <span class="font-extrabold text-base tracking-wide leading-tight truncate transition-colors duration-300 text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
      {{ 'APP.NAME' | translate }}
    </span>
  </a>

  <div class="hidden lg:block flex-1"></div>

  <!-- قسم التنبيهات -->
  <div class="flex items-center gap-2 ms-auto">
    <a routerLink="/alerts" 
       class="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors text-xl">
      🔔
      <span *ngIf="activeAlertCount() > 0"
            class="absolute top-1 end-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
        {{ activeAlertCount() }}
      </span>
    </a>
  </div>

</header>

        <!-- Page content -->
        <!-- صفحة الشات (ai-assistant) بتاخد المساحة كاملة من غير padding — باقي
             الصفحات بتفضل زي ما هي بالظبط -->
       <main [class]="isChatRoute()
        ? 'kb-shift flex-1 flex flex-col overflow-hidden min-h-0 w-full'
        : 'flex-1 p-2 lg:p-6 pb-12 lg:pb-6 max-w-7xl mx-auto w-full'">
          <router-outlet />
        </main>

        <!-- Footer (الصفحة الرئيسية / لوحة التحكم فقط) -->
        <div *ngIf="isDashboardRoute()" class="w-full max-w-7xl mx-auto px-2 lg:px-6 pb-4 lg:pb-6">
          <footer class="rounded-3xl overflow-hidden text-white" style="background:#0d1a12;">

            <!-- بانر الاقتباس -->
            <div class="relative h-44 sm:h-52 flex items-center justify-center text-center px-6"
                 [style.background]="bannerBg">
              <div class="absolute inset-0 bg-black/30"></div>
              <div class="relative max-w-xl">
                <p class="text-base sm:text-lg font-semibold leading-relaxed">{{ quote.text }}</p>
                <p class="text-xs text-white/70 mt-3">{{ quote.author }}</p>
              </div>
            </div>

            <div class="px-6 sm:px-10 py-8">

              <!-- الصف العلوي: الشعار + التواصل -->
              <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
                <div>
                  <div class="flex items-center gap-2.5">
                    <span class="text-2xl">🐔</span>
                    <span class="text-2xl font-extrabold tracking-wide">{{ 'APP.NAME' | translate }}</span>
                  </div>
                  <p class="text-[11px] text-white/50 mt-1.5">{{ 'APP.TAGLINE' | translate }}</p>
                </div>
                <div class="text-sm space-y-1 sm:text-end">
                  <a [href]="'tel:' + contact.phoneIntl" dir="ltr" class="block text-white/90 hover:text-emerald-300 transition-colors">{{ contact.phone }}</a>
                  <a [href]="'mailto:' + contact.email" class="block text-white/90 hover:text-emerald-300 transition-colors break-all">{{ contact.email }}</a>
                </div>
              </div>

              <div class="border-t border-white/10 my-7"></div>

              <!-- الأعمدة -->
              <div class="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-7 text-xs">
                <div>
                  <h5 class="font-bold text-sm mb-3">عن الخدمة</h5>
                  <p class="text-white/50 leading-relaxed">منصة متكاملة لإدارة مزارع الدواجن: متابعة القطعان، التنبيهات، المساعد الذكي والسوق.</p>
                </div>
                <div>
                  <h5 class="font-bold text-sm mb-3">روابط سريعة</h5>
                  <ul class="space-y-1.5 text-white/50">
                    <li><a routerLink="/flocks" class="hover:text-emerald-300">القطعان</a></li>
                    <li><a routerLink="/market-hub" class="hover:text-emerald-300">السوق</a></li>
                    <li><a routerLink="/learning" class="hover:text-emerald-300">التعلّم</a></li>
                    <li><a routerLink="/calculator" class="hover:text-emerald-300">الحاسبة</a></li>
                  </ul>
                </div>
                <div>
                  <h5 class="font-bold text-sm mb-3">العنوان</h5>
                  <p class="text-white/50 leading-relaxed">{{ contact.address }}</p>
                </div>
                <div>
                  <h5 class="font-bold text-sm mb-3">الأسعار</h5>
                  <ul class="space-y-1.5 text-white/50">
                    <li><a routerLink="/subscription" class="hover:text-emerald-300">أسعار الخدمات</a></li>
                    <li><a routerLink="/subscription" class="hover:text-emerald-300">الاشتراك</a></li>
                  </ul>
                </div>
              </div>

              <div class="border-t border-white/10 mt-8 pt-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-white/40">
                <span>© {{ year }} {{ 'APP.NAME' | translate }} — جميع الحقوق محفوظة</span>
                <div class="flex gap-4">
                  <a routerLink="/subscription" class="hover:text-white">الأسعار</a>
                  <a [href]="'mailto:' + contact.email" class="hover:text-white">تواصل معنا</a>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .nav-item { display:flex; align-items:center; gap:0.75rem; padding:0.625rem 0.75rem; border-radius:0.75rem; color:rgba(255,255,255,0.6); cursor:pointer; text-decoration:none; transition:all 0.15s; }
    .nav-item:hover { background: rgba(255,255,255,0.1); color:white; }
    .nav-active { background: rgba(255,255,255,0.1); color:white; font-weight:600; box-shadow: inset 3px 0 0 #52be7f; }
    [dir="rtl"] .nav-active { box-shadow: inset -3px 0 0 #52be7f; }
    .nav-icon { width:1.5rem; text-align:center; font-size:1.25rem; }
    .lang-btn { flex:1; padding:0.5rem; font-size:11px; font-weight:600; color:rgba(255,255,255,0.4); text-align:center; cursor:pointer; background:none; border:none; }
    .lang-active { color:white; background: rgba(255,255,255,0.1); }
  `]
})
export class LayoutComponent implements OnInit {
 auth = inject(AuthService);
  private alertService = inject(AlertService);
  private translate = inject(TranslateService);
  private router = inject(Router);

  // ✏️ عدّل بيانات التواصل هنا (العنوان بالذات)
  contact = {
    address: 'القاهرة، مصر',
    email: 'abdelghanya2977@gmail.com',
    phone: '01271140161',
    phoneIntl: '+201271140161',
  };
  year = new Date().getFullYear();

  // ✏️ اقتباس البانر (غيّره براحتك)
  quote = { text: 'القرارات الناجحة في المزرعة تبدأ من بيانات دقيقة ومتابعة يومية.', author: 'فريق العمل' };
  // لو عايز صورة بدل التدرج: 'url(assets/footer.jpg) center/cover'
  bannerBg = 'repeating-linear-gradient(90deg,#3f6b2a 0 18px,#5d8a3a 18px 24px,#2f5320 24px 44px,#6f9a45 44px 50px)';

  sideOpen = signal(window.innerWidth >= 1024);
  lang = signal<'ar'|'en'>('ar');
  isRtl = computed(() => this.lang() === 'ar');
  activeAlertCount = computed(() => this.alertService.alerts().filter(a => !a.resolved).length);
  userInitial = computed(() => (this.auth.currentUser()?.name ?? 'F').charAt(0).toUpperCase());

  // ⚠️ عدّل المسار '/ai-assistant' هنا لو رابط صفحة الشات مختلف عندك
  currentUrl = signal(this.router.url);
  isChatRoute = computed(() => this.currentUrl().startsWith('/ai-assistant'));
  // الفوتر يظهر في لوحة التحكم (أول صفحة) فقط
  isDashboardRoute = computed(() => {
    const u = this.currentUrl().split('?')[0].split('#')[0];
    return u === '/' || u.startsWith('/dashboard');
  });

  // 1. جعل المصفوفة عادية وتغيير الـ badge الافتراضي ليكون 0 بدل 3
  allNav: NavItem[] = [
    { path: '/dashboard', icon: '📊', key: 'NAV.DASHBOARD', badge: 0 },
    { path: '/flocks', icon: '🐔', key: 'NAV.FLOCKS' },
    { path: '/ai-assistant', icon: '🤖', key: 'NAV.AI' },
    { path: '/team', icon: '🧑', key: 'NAV.TEAM' },
    { path: '/alerts', icon: '🔔', key: 'NAV.ALERTS', badge: 0 }, // 🧠 بدأنا بـ 0
    { path: '/admin', icon: '⚙️', key: 'NAV.ADMIN', adminOnly: true },
    { path: '/market-hub', icon: '🛒', key: 'NAV.MARKETPLACE' },
    { path: '/learning', icon: '📚', key: 'NAV.LEARNING' },
    { path: '/calculator', icon: '🏗️', key: 'NAV.calc' },
    { path: '/subscription', icon: '⭐', key: 'NAV.UPGRADE_PRO' },

  ];

  // 2. تحديث قيمة الـ badge ديناميكياً داخل الـ computed signal بناءً على الـ activeAlertCount
  visibleNav = computed(() => {
    const currentCount = this.activeAlertCount(); // الاستماع لعدد التنبيهات الفعلي
    
    return this.allNav
      .filter(n => !n.adminOnly || this.auth.isAdmin())
      .map(item => {
        // إذا كان العنصر هو صفحة التنبيهات، نحدث الـ badge بالعدد الحقيقي فوراً
        if (item.path === '/alerts') {
          return { ...item, badge: currentCount };
        }
        return item;
      });
  });

  mobileNav = computed(() => this.visibleNav().slice(0,5));

  ngOnInit() {
    const saved = (localStorage.getItem('lang') as 'ar' ) ?? 'ar';
    this.lang.set(saved);
    this.translate.use(saved);
    this.alertService.startPolling(); // ✅ بيتكرر كل دقيقة بدل ما يتنادى مرة واحدة بس

    // إغلاق sidebar على الموبايل عند التنقل + تحديث الـ route الحالي (للتحكم
    // في padding صفحة الشات)
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      this.currentUrl.set(e.urlAfterRedirects ?? this.router.url);
      if (!this.isLargeScreen()) this.sideOpen.set(false);
    });
  }

  setLang(l: 'ar'|'en') {
    this.lang.set(l);
    this.translate.use(l);
    localStorage.setItem('lang', l);
    document.documentElement.lang = l;
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
  }

  isLargeScreen() { return window.innerWidth >= 1024; }

  onNavClick() { if (!this.isLargeScreen()) this.sideOpen.set(false); }

  @HostListener('window:resize')
  onResize() { 
    if (this.isLargeScreen()) this.sideOpen.set(true); 
  }
}
