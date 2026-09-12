import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment'; // ⚠️ عدّل المسار حسب مشروعك

export interface StreakStatus {
  current_streak: number;
  longest_streak: number;
  next_milestone: number | null;
}

@Injectable({ providedIn: 'root' })
export class StreakService {
  streak = signal<StreakStatus | null>(null);

  constructor(private http: HttpClient) {}

  /** ناديها في أي مكان (فتح الداشبورد، بعد تسجيل سجل يومي جديد، إلخ) */
  async refresh(): Promise<void> {
    try {
      const result = await firstValueFrom(
        this.http.get<StreakStatus>(`${environment.apiUrl}/growth/streak/status`)
      );
      this.streak.set(result);
    } catch (err) {
      console.error('فشل جلب حالة الـ streak:', err);
    }
  }
}
