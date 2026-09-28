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
import { Keyboard } from '@capacitor/keyboard';
import { LoaderService } from './core/services/loading.service';
import { LoadingScreenComponent } from './features/loading-screen/loading-screen';
import { SplashComponent } from './features/splash/splash.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, LoadingScreenComponent, SplashComponent],
  template: `
    <app-splash *ngIf="!splashDone" (finished)="onSplashFinished()"></app-splash>

    <ng-container *ngIf="splashDone">
      <app-loading-screen/>
      <div class="app-shell"><router-outlet /></div>
    </ng-container>
  `})
export class AppComponent implements OnInit {
  private translate = inject(TranslateService);
  private auth = inject(AuthService);
  private offlineSync = inject(OfflineSyncService);
  private loader = inject(LoaderService);
  private router = inject(Router);
  private ngZone = inject(NgZone);

  splashDone = false;

  constructor(private adsService: AdsService) {}

  ngOnInit() {
    SplashScreen.hide({ fadeOutDuration: 200 }); // نقفل splash الأندرويد الأصلي فورًا

    // ── الـ Loading Screen بتاع التنقل: بيبان بس مع تنقل حقيقي بين الصفحات ──
    // (مش مربوط بأي HTTP call تاني — شلنا loaderInterceptor من app.config.ts)
    this.router.events.subscribe(e => {
      if (e instanceof NavigationStart) {
        this.loader.start();
      } else if (
        e instanceof NavigationEnd ||
        e instanceof NavigationCancel ||
        e instanceof NavigationError
      ) {
        this.loader.stop();
      }
    });

    this.adsService.init();
    this.offlineSync.init();

    const lang = (localStorage.getItem('lang') as 'ar' | 'en') ?? 'ar';
    this.translate.use(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    this.auth.initAuth();

    // ── إصلاح ارتفاع الشاشة مع ظهور الكيبورد ──────────────
    const setAppHeight = () => {
      this.ngZone.run(() => {
        const vh = (window.visualViewport ? window.visualViewport.height : window.innerHeight) * 0.01;
        document.documentElement.style.setProperty('--app-vh', `${vh}px`);
      });
    };
    setAppHeight();
    window.visualViewport?.addEventListener('resize', setAppHeight);

    Keyboard.addListener('keyboardWillShow', (info) => {
      this.ngZone.run(() => {
        document.documentElement.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
        document.body.classList.add('keyboard-open');
      });
    });

    Keyboard.addListener('keyboardWillHide', () => {
      this.ngZone.run(() => {
        document.documentElement.style.setProperty('--keyboard-height', '0px');
        document.body.classList.remove('keyboard-open');
      });
    });
  }

  onSplashFinished() {
    this.splashDone = true;
  }
}
