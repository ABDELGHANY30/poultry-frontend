import { TranslateService } from "@ngx-translate/core";
import { AuthService } from "./core/services/auth.service";
import { NavigationEnd, Router, RouterOutlet } from "@angular/router";
import { Component, inject, OnInit } from "@angular/core";
import { OfflineSyncService } from './core/services/offline-sync.service';
import { AdsService } from './core/services/ads.service';
import { SplashScreen } from '@capacitor/splash-screen';
import { filter, take } from 'rxjs';
import { LoaderService } from './core/services/loading.service';
import { LoadingScreenComponent } from './features/loading-screen/loading-screen';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LoadingScreenComponent],
  template:` 
    <app-loading-screen/>
    <div class="app-shell"><router-outlet /></div>
  `,
})
export class AppComponent implements OnInit {
  private translate = inject(TranslateService);
  private auth = inject(AuthService);
  private offlineSync = inject(OfflineSyncService);
  private loader = inject(LoaderService);
  private router = inject(Router);

  constructor(private adsService: AdsService) {}

  ngOnInit() {
    this.loader.start();
    SplashScreen.hide({ fadeOutDuration: 200 });

    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd), take(1))
      .subscribe(() => this.loader.stop());

    this.adsService.init();
    this.offlineSync.init();

    const lang = (localStorage.getItem('lang') as 'ar' | 'en') ?? 'ar';
    this.translate.use(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    this.auth.initAuth();
  }
}