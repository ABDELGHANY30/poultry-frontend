import { TranslateService } from "@ngx-translate/core";
import { AuthService } from "./core/services/auth.service";
import {
  NavigationStart,
  NavigationEnd,
  NavigationCancel,
  NavigationError,
  NavigationCancellationCode,
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
import { BehaviorSubject, combineLatest } from 'rxjs';
import { debounceTime, filter, take } from 'rxjs/operators';
import { HttpActivityService } from './core/interceptors/http-activity';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, LoadingScreenComponent, SplashComponent],
  template: `
    <app-splash *ngIf="!splashDone" [ready]="ready" (finished)="onSplashFinished()"></app-splash>

    <app-loading-screen/>
    <div class="app-shell"><router-outlet /></div>`
  })
export class AppComponent implements OnInit {
  private translate = inject(TranslateService);
  private auth = inject(AuthService);
  private offlineSync = inject(OfflineSyncService);
  private loader = inject(LoaderService);
  private router = inject(Router);
  private ngZone = inject(NgZone);

  private activity = inject(HttpActivityService);

  splashDone = false;

  // true لما أول تنقل يخلص
  private navDone$ = new BehaviorSubject(false);

  // true لما التنقل يخلص ومفيش requests شغالة → الـ splash يكمّل 100% ويقفل
  ready = false;

  constructor(private adsService: AdsService) {}

  ngOnInit() {
    SplashScreen.hide({ fadeOutDuration: 200 });

    // لو أول تنقل خلص قبل ما نوصل هنا
    if (this.router.navigated) this.navDone$.next(true);

    // الـ splash يقفل لما التنقل يخلص ومفيش requests شغالة لمدة 250ms
    combineLatest([this.navDone$, this.activity.pending$]).pipe(
      debounceTime(250),
      filter(([nav, pending]) => nav && pending === 0),
      take(1)
    ).subscribe(() => (this.ready = true));

    // أمان: لو السيرفر نايم/guard بطيء منسيبش الـ splash ثابت للأبد
    setTimeout(() => (this.ready = true), 8000);

    this.router.events.subscribe(e => {
      if (e instanceof NavigationStart) {
        // أول تنقل مفيهوش loading — الـ loading للتنقل بين الصفحات بس
        if (this.navDone$.value) this.loader.start();
      } else if (e instanceof NavigationCancel && e.code === NavigationCancellationCode.Redirect) {
        return; // redirect من guard (زي dailyRecordGuard) — التنقل لسه مكمّل
      } else if (
        e instanceof NavigationEnd ||
        e instanceof NavigationCancel ||
        e instanceof NavigationError
      ) {
        this.loader.stop();
        this.navDone$.next(true);
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