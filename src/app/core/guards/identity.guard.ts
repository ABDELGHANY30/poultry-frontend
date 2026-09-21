import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment'; // src/app/core/guards -> src/environments
import { map, catchError, of } from 'rxjs';

/**
 * identityGuard
 * ------------------------------------------------------------------
 * يمنع فتح أي صفحة محمية بيه (زي "إضافة إعلان") لو المستخدم:
 *   1) مش مسجل دخول (مفيش token) -> يوجهه لصفحة auth/login
 *   2) مسجل دخول بس مش موثّق بطاقة الرقم القومي -> يوجهه لصفحة /verify-identity
 * ده بيحصل قبل ما الكومبوننت نفسه يتحمل خالص، يعني مفيش أي "فلاش" للفورم.
 *
 * مهم: بنرجّع UrlTree بدل ما ننادي router.navigate() يدوي جوه الـ Guard،
 * عشان منعملش تعارض/سباق مع عملية الـ Router وهي لسه بتحل نفس الـ navigation.
 */
export const identityGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const http = inject(HttpClient);

  const token = localStorage.getItem('spa_token');

  if (!token) {
    return router.createUrlTree(['/auth/login'], { queryParams: { returnTo: state.url } });
  }

  const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

  return http.get<any>(`${environment.apiUrl}/users/me`, { headers }).pipe(
    map((user) => {
      if (!user.has_identity_verification) {
        return router.createUrlTree(['/verify-identity'], { queryParams: { returnTo: state.url } });
      }
      return true; // موثّق -> يدخل الصفحة عادي
    }),
    catchError(() => {
      // فشل الطلب (توكن منتهي أو خطأ سيرفر) -> رجّعه لتسجيل الدخول
      return of(router.createUrlTree(['/auth/login']));
    })
  );
};
