import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

/**
 * ويب   → withCredentials (المتصفح بيبعت الكوكي HttpOnly) + X-Requested-With (حماية CSRF).
 * موبايل → Authorization: Bearer + X-Client-Type: native (السيرفر يرجّع التوكن في body).
 * لو عندك interceptor قديم بيحط Authorization: ادمجه/استبدله بالملف ده.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) return next(req);

  const auth = inject(AuthService);

  const authed = auth.isNative
    ? req.clone({
        setHeaders: {
          'X-Client-Type': 'native',
          ...(auth.getToken() ? { Authorization: `Bearer ${auth.getToken()}` } : {}),
        },
      })
    : req.clone({
        withCredentials: true,
        setHeaders: { 'X-Requested-With': 'XMLHttpRequest' },
      });

  return next(authed).pipe(
    catchError((err: HttpErrorResponse) => {
      const isAuthCall = /\/auth\/auth\/(login|register|me)/.test(req.url);
      if (err.status === 401 && !isAuthCall) auth.handleUnauthorized();
      return throwError(() => err);
    })
  );
};
