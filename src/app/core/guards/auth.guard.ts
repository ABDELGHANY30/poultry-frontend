// ── auth.guard.ts ─────────────────────────────────────────
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  // استنى تحميل التوكن من التخزين أولاً (على الموبايل التخزين async) — idempotent
  await auth.initAuth();
  if (auth.isAuthenticated()) return true;

  router.navigate(['/auth/login']);
  return false;
};
