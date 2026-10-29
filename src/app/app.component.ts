import { TranslateService } from "@ngx-translate/core";
import { AuthService } from "./core/services/auth.service";
import {
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
import { SplashComponent } from './features/splash/splash.component';
import { CommonModule } from '@angular/common';
import { App } from '@capacitor/app';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { debounceTime, filter, take } from 'rxjs/operators';
import { HttpActivityService } from './core/interceptors/http-activity';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SplashComponent],
  template:` 
    <app-splash *ngIf="!splashDone" [ready]="ready" (finished)="onSplashFinished()"></app-splash>

    <div class="app-shell"><router-outlet /></div>`
  })
export class AppComponent implements OnInit {
  private translate = inject(TranslateService);
  private auth = inject(AuthService);
  private offlineSync = inject(OfflineSyncService);
  private router = inject(Router);
  private ngZone = inject(NgZone);

  private activity = inject(HttpActivityService);

  splashDone = false;

  private navDone$ = new BehaviorSubject(false);

  ready = false;

  constructor(private adsService: AdsService) {}

  ngOnInit() {
    SplashScreen.hide({ fadeOutDuration: 200 });

    if (this.router.navigated) this.navDone$.next(true);

    combineLatest([this.navDone$, this.activity.pending$]).pipe(
      debounceTime(250),
      filter(([nav, pending]) => nav && pending === 0),
      take(1)
    ).subscribe(() => (this.ready = true));

    setTimeout(() => (this.ready = true), 8000);

    this.router.events.subscribe(e => {
      if (e instanceof NavigationCancel && e.code === NavigationCancellationCode.Redirect) {
        return;
      } else if (
        e instanceof NavigationEnd ||
        e instanceof NavigationCancel ||
        e instanceof NavigationError
      ) {
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

    App.addListener('backButton', () => {
      this.ngZone.run(() => {
        if (this.router.url === '/'|| this.router.url === '/home' || this.router.url === '/dashboard') {
          App.exitApp();
        } else if (window.history.length > 1) {
          window.history.back();
        } else {
          this.router.navigate(['/']);
        }
      });
    });

    const setAppHeight = () => {
      this.ngZone.run(() => {
        const vh = (window.visualViewport ? window.visualViewport.height : window.innerHeight) * 0.01;
        document.documentElement.style.setProperty('--app-vh',`${vh}px`);
      });
    };
    setAppHeight();
    window.visualViewport?.addEventListener('resize', setAppHeight);

    // ── تعويض مكان الكيبورد ──
    // ارتفاع الصفحة (--app-vh) بيتبع visualViewport، يعني بيتصغّر لوحده لما الكيبورد يفتح.
    // فالرفع الإضافي (kb-shift) لازم يبقى بس الجزء اللي لسه مغطّيه الكيبورد = الكيبورد - اللي اتصغّر فعلاً.
    // (على أندرويد 14/15 الصفحة بتتصغّر بالكامل، فالناتج صفر ومفيش مسافة زيادة.)
    let baseH = Math.max(window.innerHeight, window.visualViewport?.height ?? 0);
    const readKh = () =>
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--keyboard-height')) || 0;

    const updateKbShift = () => {
      const kh = readKh();
      const vvH = window.visualViewport?.height ?? window.innerHeight;
      if (kh <= 0) baseH = Math.max(window.innerHeight, vvH); // الكيبورد مقفول: نحدّث ارتفاع الشاشة الأصلي
      const alreadyShrunk = Math.max(0, baseH - vvH);
      const shift = Math.max(0, kh - alreadyShrunk);
      document.body.style.setProperty('--kb-shift', `${shift}px`);
    };
    updateKbShift();
    window.visualViewport?.addEventListener('resize', updateKbShift);
    window.addEventListener('orientationchange', () => setTimeout(updateKbShift, 400));

    // مفيش سكرول يدوي عند فتح الكيبورد: بس بنحدّث --kb-shift
    // (المتصفح بيسكرول من نفسه لو الحقل فعلاً متغطّي، وبأقل حركة ممكنة)
    const kbObserver = new MutationObserver(() => updateKbShift());
    kbObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
  }

  onSplashFinished() {
    this.splashDone = true;
  }
}