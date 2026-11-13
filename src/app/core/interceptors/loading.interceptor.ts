// loader.interceptor.ts
import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoaderService } from '../services/loading.service';

/**
 * اختياري: للطلبات اللي بتشتغل في الخلفية (زي polling التنبيهات) ومش عايزها
 * تظهر شاشة اللودينج. الاستخدام:
 *   this.http.get(url, { context: new HttpContext().set(SKIP_LOADER, true) })
 */
export const SKIP_LOADER = new HttpContextToken<boolean>(() => false);

export const loaderInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SKIP_LOADER)) return next(req);

  const loader = inject(LoaderService);
  loader.start();
  return next(req).pipe(finalize(() => loader.stop()));
};