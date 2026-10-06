import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment'; // src/app/core/guards -> src/environments
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * identityGuard
 * ------------------------------------------------------------------
 * يمنع فتح أي صفحة محمية بيه (زي "إضافة إعلان") لو المستخدم:
 *   1) مش مسجل دخول -> يوجهه لصفحة auth/login
 *   2) مسجل دخول بس مش موثّق بطاقة الرقم القومي -> يوجهه لصفحة /verify-identity
 * ده بيحصل قبل ما الكومبوننت نفسه يتحمل خالص، يعني مفيش أي "فلاش" للفورم.
 *
 * مهم: بنرجّع UrlTree بدل ما ننادي router.navigate() يدوي جوه الـ Guard،
 * عشان منعملش تعارض/سباق مع عملية الـ Router وهي لسه بتحل نفس الـ navigation.
 */
export const identityGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);
  const http = inject(HttpClient);
  const auth = inject(AuthService);

  await auth.initAuth();
  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/login'], { queryParams: { returnTo: state.url } });
  }

  try {
    // الـ interceptor هو اللي بيضيف الـ Authorization
    const res = await firstValueFrom(http.get<any>(`${environment.apiUrl}/identity-verification/status`));
    if (res.is_verified !== true) {
      return router.createUrlTree(['/verify-identity'], { queryParams: { returnTo: state.url } });
    }
    return true; // موثّق -> يدخل الصفحة عادي
  } catch {
    // فشل الطلب (توكن منتهي أو خطأ سيرفر) -> رجّعه لتسجيل الدخول
    return router.createUrlTree(['/auth/login']);
  }
};
