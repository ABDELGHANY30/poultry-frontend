import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment'; // ⚠️ عدّل المسار

export interface ReferralStats {
  referral_code: string;
  total_referred: number;
}

@Injectable({ providedIn: 'root' })
export class ReferralService {
  stats = signal<ReferralStats | null>(null);

  constructor(private http: HttpClient) {}

  async refresh(): Promise<void> {
    try {
      const result = await firstValueFrom(
        this.http.get<ReferralStats>(`${environment.apiUrl}/growth/referral/my-code`)
      );
      this.stats.set(result);
    } catch (err) {
      console.error('فشل جلب كود الإحالة:', err);
    }
  }

  /**
   * تناديها مرة واحدة بس (بعد تسجيل مستخدم جديد لو دخل كود صاحبه). لو الكود
   * غلط أو مستخدم قبل كده، بترمي error — امسكها في الكومبوننت وورّي رسالة.
   */
  async applyCode(code: string): Promise<{ bonus_credits: number }> {
    return firstValueFrom(
      this.http.post<{ bonus_credits: number }>(`${environment.apiUrl}/growth/referral/apply`, {
        referral_code: code,
      })
    );
  }
}
