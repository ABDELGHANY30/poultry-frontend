import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment'; // src/app/core/guards -> src/environments
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * merchantGuard — بديل identityGuard لصفحة "إضافة إعلان":
 *   1) مش مسجل دخول       -> auth/login
 *   2) بطاقة مش موثّقة         -> /verify-identity
 *   3) موثّق بس مدفعش 200 جنيه -> /merchant-fee
 * كله من endpoint واحد عشان مفيش تعارض بين أكتر من guard.
 */
export const merchantGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);
  const http = inject(HttpClient);
  const auth = inject(AuthService);

  await auth.initAuth();
  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/login'], { queryParams: { returnTo: state.url } });
  }

  try {
    // الـ interceptor هو اللي بيضيف الـ Authorization
    const res = await firstValueFrom(http.get<any>(`${environment.apiUrl}/marketplace-payments/merchant/status`));
    if (!res.identity_verified) {
      return router.createUrlTree(['/verify-identity'], { queryParams: { returnTo: state.url } });
    }
    if (!res.is_merchant) {
      return router.createUrlTree(['/merchant-fee'], { queryParams: { returnTo: state.url } });
    }
    return true;
  } catch (err: any) {
    // 401 بس = توكن منتهي -> تسجيل الدخول. أي خطأ تاني (سيرفر/جدول ناقص) منخبّيهوش ورا صفحة الدخول:
    // بنسيبه يدخل والسيرفر هو اللي بيرفض فعلياً عند النشر (require_merchant).
    return err?.status === 401
      ? router.createUrlTree(['/auth/login'], { queryParams: { returnTo: state.url } })
      : true;
  }
};
