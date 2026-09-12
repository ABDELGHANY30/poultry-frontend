import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, interval, startWith, switchMap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment'; // تأكد من مسار البيئة عندك

// ── 1. واجهة البيانات (Interface) لتطابق الـ Backend ──────────────────────
export interface Alert {
  id: string;
  title: string;       // العنوان الديناميكي القادم من البايثون
  description: string; // الوصف (سواء تحصين أو إنذار)
  type: 'danger' | 'warning' | 'info' | 'success'; // الأنواع الجديدة
  resolved: boolean;
  createdAt: string;
  flock_name?: string; // اسم القطيع المرتبط به التنبيه
}

@Injectable({ providedIn: 'root' })
export class AlertService {
  private http = inject(HttpClient);

  // عنوان الـ API الخاص بالتنبيهات في الباك إند
  private apiUrl = `${environment.apiUrl}/alerts/`;

  // الـ Signals لإدارة الحالة في الفرونت إند بسلاسة
  private _alerts = signal<Alert[]>([]);
  readonly alerts = this._alerts.asReadonly();

  // ✅ عداد التنبيهات النشطة — بيتحدث بالـ polling، مش لازم تدخل صفحة التنبيهات
  private _activeCount = signal<number>(0);
  readonly activeCount = this._activeCount.asReadonly();

  private pollingStarted = false;

  // ── 2. تحميل التنبيهات الحية من الباك إند (لصفحة التنبيهات نفسها) ────────
  loadAlerts(): Observable<Alert[]> {
    return this.http.get<Alert[]>(this.apiUrl).pipe(
      tap(data => {
        this._alerts.set(data);
        this._activeCount.set(data.filter(a => !a.resolved).length);
      })
    );
  }

  // ── 3. تحديث حالة التنبيه ومسحه/حله ────────────────────────────────────
  resolve(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}${id}/resolve`, {}).pipe(
      tap(() => {
        this._alerts.update(prev =>
          prev.map(a => a.id === id ? { ...a, resolved: true } : a)
        );
        this._activeCount.update(c => Math.max(0, c - 1));
      })
    );
  }

  // ── 4. Polling دوري لكل التنبيهات — اتصاله من مكون موجود في كل صفحات
  //     الموقع (زي الـ layout/navbar) عشان alerts() يفضل محدّث حتى لو
  //     المستخدم مدخلش صفحة التنبيهات بنفسه.
  startPolling(intervalMs = 60000): void {
    if (this.pollingStarted) return; // منمنعش تكرار الاشتراك لو اتنادت أكتر من مرة
    this.pollingStarted = true;

    interval(intervalMs).pipe(
      startWith(0),
      switchMap(() => this.loadAlerts().pipe(
        catchError(() => of(null)) // مننهارش الـ polling لو فشل طلب واحد
      ))
    ).subscribe();
  }
}
