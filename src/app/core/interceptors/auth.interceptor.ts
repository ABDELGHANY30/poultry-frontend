import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
// ⚠️ عدّل المسار ده حسب مكان ملف الـ environment عندك
import { environment } from '../../../environments/environment';

/** التوكن بيتبعت لـ API بتاعنا بس — مش لأي رابط خارجي (طقس/صور/CDN...) وإلا بيتسرّب لطرف تالت. */
function isOwnApi(url: string): boolean {
  try {
    return new URL(url, window.location.origin).origin === new URL(environment.apiUrl, window.location.origin).origin;
  } catch {
    return false;
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getToken();
  const sendToken = !!token && isOwnApi(req.url);

  if (sendToken) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(req).pipe(
    catchError((error) => {
      // 401 بتوكن مرفوض = انتهت صلاحيته أو بقى غلط. (بدون توكن = زائر، الـ 401 متوقع)
      // 403 "Account disabled" = الحساب اتعطّل: نخرّجه برضو بدل ما يفضل شايف شاشات بتفشل.
      const disabled = error.status === 403 && String(error?.error?.detail || '').includes('Account disabled');
      if (sendToken && (error.status === 401 || disabled)) {
        authService.logout();
        router.navigate(['/auth/login']);
      }
      return throwError(() => error);
    })
  );
};
