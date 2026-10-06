import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

/**
 * proGuard
 * ────────
 * بيمنع الوصول للمسارات المخصصة لمشتركي Pro (محاكي القرار، التقارير، مؤشر الربح...).
 *
 * على عكس adminGuard، التحقق هنا لازم يكون async (نداء فعلي لـ /payment/status)
 * مش مجرد قراءة من التخزين المحلي/Signal، لأن اشتراك الـ Pro بينتهي بتاريخ
 * (زي ما واضح في subscription_1_.py: plan_expires_at بيرجّع اليوزر لـ free
 * تلقائيًا لما ينتهي)، فلو اعتمدنا على بيانات مخزّنة وقت اللوجين ممكن نسيب
 * يوزر اشتراكه خلص يدخل الصفحة غلط.
 */
export const proGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const http = inject(HttpClient);
  const router = inject(Router);

  // استنى تحميل التوكن من التخزين (بعد Reload / على الموبايل) — idempotent، مفيش نداء زيادة
  await auth.initAuth();

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/login']);
  }

  try {
    // الـ interceptor هو اللي بيضيف الـ Authorization
    const res: any = await firstValueFrom(
      http.get(`${environment.apiUrl}/payment/status`)
    );

    if (res?.is_pro) {
      return true;
    }

    return router.createUrlTree(['/subscription']);
  } catch {
    // لو فشل التحقق (مثلاً التوكن منتهي)، الأولى نحوّله لتسجيل الدخول
    // بدل ما نسيبه يدخل الصفحة المحمية بدون تأكيد
    return router.createUrlTree(['/auth/login']);
  }
};
