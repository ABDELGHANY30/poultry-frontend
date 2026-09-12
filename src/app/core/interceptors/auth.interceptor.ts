// import { HttpInterceptorFn } from '@angular/common/http';
// import { inject } from '@angular/core';
// import { AuthService } from '../services/auth.service';
// import { Router } from '@angular/router';
// import { catchError, throwError } from 'rxjs';

// export const authInterceptor: HttpInterceptorFn = (req, next) => {
//   const authService = inject(AuthService);
//   const router = inject(Router);

//   const token = authService.getToken();

//   if (token) {
//     req = req.clone({
//       setHeaders: { Authorization: `Bearer ${token}` }
//     });
//   }

//   return next(req).pipe(
//     catchError((error) => {

//       if (error.status === 401) {
//         // التوكن انتهى أو غلط
//         authService.logout(); // لازم تمسح التوكن
//         router.navigate(['/auth/login']);
//       }

//       return throwError(() => error);
//     })
//   );
// };
// import { HttpInterceptorFn } from '@angular/common/http';
// import { inject } from '@angular/core';
// import { AuthService } from '../services/auth.service';
// import { Router } from '@angular/router';
// import { catchError, throwError } from 'rxjs';

// export const authInterceptor: HttpInterceptorFn = (req, next) => {
//   const authService = inject(AuthService);
//   const router = inject(Router);

//   const token = authService.getToken();

//   if (token) {
//     req = req.clone({
//       setHeaders: { Authorization: `Bearer ${token}` }
//     });
//   }

//   return next(req).pipe(
//     catchError((error) => {

//       // مهم: لو الطلب أصلاً اتبعت من غير توكن (زائر بيتصفح)، الـ 401 ده متوقع
//       // وطبيعي جداً — مينفعش نحوّله للوجين غصب عنه، سيبه الكومبوننت يتعامل
//       // مع الخطأ بهدوء (شاشة فاضية مثلاً). التحويل الإجباري يحصل بس لو كان
//       // فعلاً عنده توكن واترفض (يعني انتهت صلاحيته أو بقى غلط).
//       if (error.status === 401 && token) {
//         authService.logout(); // لازم تمسح التوكن
//         router.navigate(['/auth/login']);
//       }

//       return throwError(() => error);
//     })
//   );
// };
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getToken();

  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(req).pipe(
    catchError((error) => {

      // مهم: لو الطلب أصلاً اتبعت من غير توكن (زائر بيتصفح)، الـ 401 ده متوقع
      // وطبيعي جداً — مينفعش نحوّله للوجين غصب عنه، سيبه الكومبوننت يتعامل
      // مع الخطأ بهدوء (شاشة فاضية مثلاً). التحويل الإجباري يحصل بس لو كان
      // فعلاً عنده توكن واترفض (يعني انتهت صلاحيته أو بقى غلط).
      if (error.status === 401 && token) {
        authService.logout(); // لازم تمسح التوكن
        router.navigate(['/auth/login']);
      }

      return throwError(() => error);
    })
  );
};