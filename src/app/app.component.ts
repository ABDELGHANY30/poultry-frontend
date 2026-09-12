import { TranslateService } from "@ngx-translate/core";
import { AuthService } from "./core/services/auth.service";
import { RouterOutlet } from "@angular/router";
import { Component, inject, OnInit } from "@angular/core";
 import { OfflineSyncService } from './core/services/offline-sync.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<div class="app-shell"><router-outlet /></div>`,
})
export class AppComponent implements OnInit {
  private translate = inject(TranslateService);
  private auth = inject(AuthService);


  private offlineSync = inject(OfflineSyncService);

  ngOnInit() {
    this.offlineSync.init(); // ← ضيف السطر ده
    // باقي الكود زي ما هو
    const lang = (localStorage.getItem('lang') as 'ar' | 'en') ?? 'ar';
    this.translate.use(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    this.auth.initAuth();
  }
}