import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment'; // src/app/core/guards -> src/environments
import { map, catchError, of } from 'rxjs';

/**
 * merchantGuard — بديل identityGuard لصفحة "إضافة إعلان":
 *   1) مفيش token            -> auth/login
 *   2) بطاقة مش موثّقة         -> /verify-identity
 *   3) موثّق بس مدفعش 200 جنيه -> /merchant-fee
 * كله من endpoint واحد عشان مفيش تعارض بين أكتر من guard.
 */
export const merchantGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const http = inject(HttpClient);

  const token = localStorage.getItem('spa_token');
  if (!token) {
    return router.createUrlTree(['/auth/login'], { queryParams: { returnTo: state.url } });
  }

  const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

  return http.get<any>(`${environment.apiUrl}/marketplace-payments/merchant/status`, { headers }).pipe(
    map((res) => {
      if (!res.identity_verified) {
        return router.createUrlTree(['/verify-identity'], { queryParams: { returnTo: state.url } });
      }
      if (!res.is_merchant) {
        return router.createUrlTree(['/merchant-fee'], { queryParams: { returnTo: state.url } });
      }
      return true;
    }),
    catchError((err) =>
      // 401 بس = توكن منتهي -> تسجيل الدخول. أي خطأ تاني (سيرفر/جدول ناقص) منخبّيهوش ورا صفحة الدخول:
      // بنسيبه يدخل والسيرفر هو اللي بيرفض فعلياً عند النشر (require_merchant).
      of(err?.status === 401
        ? router.createUrlTree(['/auth/login'], { queryParams: { returnTo: state.url } })
        : true)
    )
  );
};
