// // ── admin.guard.ts ────────────────────────────────────────
// import { inject } from '@angular/core';
// import { CanActivateFn, Router } from '@angular/router';
// import { AuthService } from '../services/auth.service';

// export const adminGuard: CanActivateFn = () => {
//   const auth = inject(AuthService);
//   const router = inject(Router);
//   return auth.isAdmin() || router.createUrlTree(['/dashboard']);
// };
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // 1. التأكد من تحميل الحساب إلى الـ Signals إذا كانت بـ null
  if (!auth.currentUser()) {
    auth.initAuth();
  }

  // 2. التحقق مباشرة من الـ Signal أو من local_storage كمرجع احتياطي
  const isUserAdmin = auth.isAdmin();
  if (isUserAdmin) {
    return true;
  }

  // فحص احتياطي مباشر للـ localStorage لمنع الطرد أثناء الـ Reload
  const storedUser = localStorage.getItem('spa_user');
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      if (user?.role === 'admin') {
        return true;
      }
    } catch {
      // ignore JSON parse error
    }
  }

  // في حال عدم وجود صلاحيات أدمن، يتم التحويل للداشبورد
  return router.createUrlTree(['/dashboard']);
};