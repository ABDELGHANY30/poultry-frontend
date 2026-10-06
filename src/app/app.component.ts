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
    <app-splash *ngIf="!splashDone" (finished)="onSplashFinished()"></app-splash>

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

  // الـ splash مايخلصش إلا لما الأنيميشن يخلص *و* أول تنقل يخلص (عشان مايظهرش loading بعده)
  private splashFinished = false;
  private initialNavDone = false;

  constructor(private adsService: AdsService) {}

  ngOnInit() {
    SplashScreen.hide({ fadeOutDuration: 200 });

    // لو أول تنقل خلص قبل ما نوصل هنا
    if (this.router.navigated) this.initialNavDone = true;

    this.router.events.subscribe(e => {
      if (e instanceof NavigationStart) {
        // أول تنقل (وقت ظهور الـ splash) مفيهوش loading — الـ loading للتنقل بين الصفحات بس
        if (this.initialNavDone) this.loader.start();
      } else if (
        e instanceof NavigationEnd ||
        e instanceof NavigationCancel ||
        e instanceof NavigationError
      ) {
        this.loader.stop();
        if (!this.initialNavDone) {
          this.initialNavDone = true;
          this.tryShowApp();
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
    this.splashFinished = true;
    this.tryShowApp();
  }

  private tryShowApp() {
    if (this.splashFinished && this.initialNavDone && !this.splashDone) {
      this.loader.stop();   // أمان: نتأكد إن مفيش loading فاضل شغال
      this.splashDone = true;
    }
  }
}