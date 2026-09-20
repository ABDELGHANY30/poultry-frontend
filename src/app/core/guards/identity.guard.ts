import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment'; // عدّل المسار حسب مكان الملف عندك
import { map, catchError, of } from 'rxjs';

/**
 * identityGuard
 * ------------------------------------------------------------------
 * يمنع فتح أي صفحة محمية بيه (زي "إضافة إعلان") لو المستخدم:
 *   1) مش مسجل دخول (مفيش token) -> يوجهه لصفحة /login
 *   2) مسجل دخول بس مش موثّق بطاقة الرقم القومي -> يوجهه لصفحة /verify-identity
 * ده بيحصل قبل ما الكومبوننت نفسه يتحمل خالص، يعني مفيش أي "فلاش" للفورم.
 */
export const identityGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const http = inject(HttpClient);

  const token = localStorage.getItem('spa_token');

  if (!token) {
    router.navigate(['/login'], { queryParams: { returnTo: state.url } });
    return false;
  }

  const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

  return http.get<any>(`${environment.apiUrl}/users/me`, { headers }).pipe(
    map((user) => {
      if (!user.has_identity_verification) {
        router.navigate(['/verify-identity'], { queryParams: { returnTo: state.url } });
        return false;
      }
      return true; // موثّق -> يدخل الصفحة عادي
    }),
    catchError(() => {
      // فشل الطلب (توكن منتهي أو خطأ سيرفر) -> رجّعه لتسجيل الدخول
      router.navigate(['/login']);
      return of(false);
    })
  );
};
