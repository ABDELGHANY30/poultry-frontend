import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// main.ts
import { registerLocaleData } from '@angular/common';
import localeAr from '@angular/common/locales/ar';

registerLocaleData(localeAr);
bootstrapApplication(AppComponent, appConfig).catch(err => console.error(err));
