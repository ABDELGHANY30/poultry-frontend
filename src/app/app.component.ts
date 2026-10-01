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

  constructor(private adsService: AdsService) {}

  ngOnInit() {
    SplashScreen.hide({ fadeOutDuration: 200 });

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

    // ── تمرير الحقل النشط فوق الكيبورد أوتوماتيك، بيتفعل لحظة أي تغيير حقيقي في ارتفاع الكيبورد (القادم من MainActivity.java) ──
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