import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { MarketRow, MarketSnapshot, WeatherSummary } from './calculator-live-data';
import { buildMarketSnapshot } from './calculator-live-data';

/**
 * بيجيب أسعار السوق والطقس من الباك اند الموجود (نفس endpoints صفحة السوق والطقس).
 * أي فشل (نت/سيرفر) بيرجّع null من غير ما يكسر الحاسبة: بتكمل بآخر أسعار محفوظة أو الافتراضية.
 */
@Injectable({ providedIn: 'root' })
export class CalculatorLiveDataService {
  private http = inject(HttpClient);

  /** GET /prices/latest ← لقطة أسعار جاهزة للحاسبة */
  async fetchMarket(): Promise<MarketSnapshot | null> {
    try {
      const res = await firstValueFrom(this.http.get<any>(`${environment.apiUrl}/prices/latest`));
      const rows: MarketRow[] = Array.isArray(res) ? res : (res?.prices ?? []);
      if (!rows.length) return null;
      return buildMarketSnapshot(rows);
    } catch (e) {
      console.warn('تعذّر تحميل أسعار السوق للحاسبة:', e);
      return null;
    }
  }

  /** GET /weather/summary?governorate=... (الباك اند بيعمل كاش 8 ساعات لكل محافظة) */
  async fetchWeather(governorate: string): Promise<WeatherSummary | null> {
    try {
      const params = new HttpParams().set('governorate', governorate);
      const res = await firstValueFrom(
        this.http.get<WeatherSummary>(`${environment.apiUrl}/weather/summary`, { params }),
      );
      return res?.today ? res : null;
    } catch (e) {
      console.warn('تعذّر تحميل الطقس للحاسبة:', e);
      return null;
    }
  }
}
