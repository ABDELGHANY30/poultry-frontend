import { TranslateService } from "@ngx-translate/core";
import { AuthService } from "./core/services/auth.service";
import {
  NavigationStart,
  NavigationEnd,
  NavigationCancel,
  NavigationError,
  Router,
  RouterOutlet
} from "@angular/router";
import { Component, inject, NgZone, OnInit } from "@angular/core";
import { OfflineSyncService } from './core/services/offline-sync.service';
import { AdsService } from './core/services/ads.service';
import { SplashScreen } from '@capacitor/splash-screen';
import { LoaderService } from './core/services/loading.service';
import { LoadingScreenComponent } from './features/loading-screen/loading-screen';
import { SplashComponent } from './features/splash/splash.component';
import { CommonModule } from '@angular/common';
import { App } from '@capacitor/app';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, LoadingScreenComponent, SplashComponent],
  template: `
    <app-splash *ngIf="!splashDone" [ready]="initialNavDone" (finished)="onSplashFinished()"></app-splash>

    <ng-container *ngIf="splashDone">
      <app-loading-screen/>
      <div class="app-shell"><router-outlet /></div>
    </ng-container>`
  })
export class AppComponent implements OnInit {
  private translate = inject(TranslateService);
  private auth = inject(AuthService);
  private offlineSync = inject(OfflineSyncService);
  private loader = inject(LoaderService);
  private router = inject(Router);
  private ngZone = inject(NgZone);

  splashDone = false;

  // true لما أول تنقل يخلص → الـ splash يكمّل الشريط 100% ويقفل (فالـ loading مايظهرش بعده)
  initialNavDone = false;

  constructor(private adsService: AdsService) {}

  ngOnInit() {
    SplashScreen.hide({ fadeOutDuration: 200 });

    // لو أول تنقل خلص قبل ما نوصل هنا
    if (this.router.navigated) this.initialNavDone = true;

    // أمان: لو أول تنقل علق (سيرفر نايم/guard بطيء) منسيبش الـ splash ثابت للأبد —
    // بعد 10 ثواني نقفله ونظهر الـ loading لحد ما الصفحة تجهز
    setTimeout(() => {
      if (!this.initialNavDone) {
        this.initialNavDone = true;
        this.loader.start();
      }
    }, 10000);

   this.router.events.subscribe(e => {
  if (e instanceof NavigationStart) {
    if (this.initialNavDone) this.loader.start();
  } else if (e instanceof NavigationEnd) {
    this.loader.stop();
    this.initialNavDone = true;
  } else if (e instanceof NavigationCancel || e instanceof NavigationError) {
    // لو لسه في مرحلة التحميل الأولي، الـ Cancel ده غالبًا مجرد redirect داخلي
    // من guard زي dailyRecordGuard — منعتبروش نهاية المرحلة، ننتظر الـ
    // NavigationEnd الحقيقي اللي جاي بعده (أو الـ safety timeout لو اتعطل).
    if (this.initialNavDone) {
      this.loader.stop();
    }
  }
});
    this.adsService.init();
    this.offlineSync.init();

    const lang = (localStorage.getItem('lang') as 'ar' | 'en') ?? 'ar';
    this.translate.use(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    this.auth.initAuth();

    // ── التحكم في زرار الرجوع الفعلي (الموبايل) ──────────────
    App.addListener('backButton', () => {
      this.ngZone.run(() => {
        if (this.router.url === '/'|| this.router.url === '/home'||  this.router.url === '/dashboard') {
          App.exitApp();
        } else if (window.history.length > 1) {
          window.history.back();
        } else {
          this.router.navigate(['/']);
        }
      });
    });

    // ── إصلاح ارتفاع الشاشة مع ظهور الكيبورد ──────────────
    const setAppHeight = () => {
      this.ngZone.run(() => {
        const vh = (window.visualViewport ? window.visualViewport.height : window.innerHeight) * 0.01;
        document.documentElement.style.setProperty('--app-vh',`${vh}px`);
      });
    };
    setAppHeight();
    window.visualViewport?.addEventListener('resize', setAppHeight);

    // ── تمرير الحقل النشط فوق الكيبورد أوتوماتيك ──────────
    const kbObserver = new MutationObserver(() => {
      const kh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--keyboard-height')) || 0;
      if (kh > 0) {
        const active = document.activeElement as HTMLElement;
        if (active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)) {
          requestAnimationFrame(() => {
            active.scrollIntoView({ behavior: 'smooth', block: 'center' });
          });
        }
      }
    });
    kbObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
  }

  onSplashFinished() {
    this.splashDone = true;
  }
}