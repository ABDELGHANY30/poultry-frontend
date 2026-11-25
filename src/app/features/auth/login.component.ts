import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule],
  template: `
  <div class="relative flex p-4 overflow-x-hidden"
       style="min-height:100vh;min-height:100dvh;
              padding-bottom:calc(1rem + env(safe-area-inset-bottom));
              background:linear-gradient(135deg,#0b2416 0%,#154128 50%,#1e7d48 100%)">

    <!-- Decorative circles -->
    <div class="fixed top-10 start-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none"></div>
    <div class="fixed bottom-10 end-10 w-60 h-60 rounded-full bg-white/5 pointer-events-none"></div>

    <!-- m-auto = centered when there is room, scrollable (never clipped) when there isn't -->
    <div class="relative z-10 m-auto bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">

      <!-- Top banner -->
      <div class="text-white text-center py-5 px-6 sm:py-8"
           style="background:linear-gradient(135deg,#1a4a2e 0%,#2d9e5f 100%)">
        <div class="text-4xl sm:text-6xl mb-2 sm:mb-3">🐔</div>
        <h1 class="text-lg sm:text-xl font-black mb-1">{{ 'AUTH.LOGIN_TITLE' | translate }}</h1>
        <p class="text-white/70 text-sm">{{ 'AUTH.LOGIN_SUB' | translate }}</p>
      </div>

      <!-- Form -->
      <div class="p-5 sm:p-7">
        <div class="mb-4">
          <label class="form-label">{{ 'AUTH.EMAIL' | translate }}</label>
          <input class="form-input" type="email" [(ngModel)]="email"
                 placeholder="farmer@example.com" (keydown.enter)="login()" />
        </div>
        <div class="mb-5 sm:mb-6">
          <label class="form-label">{{ 'AUTH.PASSWORD' | translate }}</label>
          <div class="relative">
            <input class="form-input w-full pe-12" [type]="showPassword() ? 'text' : 'password'"
                   [(ngModel)]="password" placeholder="••••••••" (keydown.enter)="login()" />
            <button type="button"
                    class="absolute inset-y-0 end-0 px-3 flex items-center text-lg opacity-60 hover:opacity-100"
                    (click)="showPassword.set(!showPassword())"
                    [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
                    tabindex="-1">
              {{ showPassword() ? '🙈' : '👁️' }}
            </button>
          </div>
        </div>

        <div *ngIf="error()" class="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {{ error() }}
        </div>

        <button class="btn-primary btn w-full py-3 text-base mb-4"
                (click)="login()" [disabled]="loading() || googleLoading()">
          {{ loading() ? ('AUTH.SIGNING_IN' | translate) : ('AUTH.LOGIN_BTN' | translate) }}
        </button>

        <!-- ── Google ─────────────────────────────────────── -->
        <div class="flex items-center gap-3 mb-4 text-xs text-[var(--c-muted)]">
          <div class="flex-1 h-px bg-gray-200"></div>
          <span>أو</span>
          <div class="flex-1 h-px bg-gray-200"></div>
        </div>

        <!-- حساب موجود بنفس الإيميل: نتأكد من الباسورد قبل الربط -->
        <div *ngIf="linkMode()" class="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p class="text-sm text-amber-900 mb-3 leading-relaxed">
            في حساب عندنا بنفس إيميل Google ده. اكتب باسورد الحساب ده مرة واحدة عشان نربطهم،
            وبعد كده تدخل بـ Google على طول.
          </p>
          <div class="relative mb-3">
            <input class="form-input w-full pe-12" [type]="showLinkPassword() ? 'text' : 'password'"
                   [(ngModel)]="linkPassword" placeholder="••••••••"
                   (keydown.enter)="confirmLink()" />
            <button type="button"
                    class="absolute inset-y-0 end-0 px-3 flex items-center text-lg opacity-60 hover:opacity-100"
                    (click)="showLinkPassword.set(!showLinkPassword())" tabindex="-1">
              {{ showLinkPassword() ? '🙈' : '👁️' }}
            </button>
          </div>
          <div class="flex gap-2">
            <button class="btn-primary btn flex-1 py-2.5" (click)="confirmLink()"
                    [disabled]="googleLoading() || !linkPassword">
              {{ googleLoading() ? 'جاري الربط...' : 'ربط ودخول' }}
            </button>
            <button class="btn flex-1 py-2.5 border border-gray-300 bg-white" (click)="cancelLink()"
                    [disabled]="googleLoading()">
              إلغاء
            </button>
          </div>
        </div>

        <button *ngIf="googleEnabled && !linkMode()" type="button"
                class="btn w-full py-3 text-base mb-5 border border-gray-300 bg-white text-gray-700 flex items-center justify-center gap-3"
                (click)="googleLogin()" [disabled]="loading() || googleLoading()">
          <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          <span>{{ googleLoading() ? 'جاري الدخول...' : 'الدخول بحساب Google' }}</span>
        </button>

        <p class="text-center text-sm text-[var(--c-muted)]">
          {{ 'AUTH.NO_ACCOUNT' | translate }}
          <a routerLink="/auth/register" class="text-primary-700 font-bold hover:underline no-underline">
            {{ 'AUTH.REGISTER_LINK' | translate }}
          </a>
        </p>
      </div>
    </div>
  </div>
  `,
})
export class LoginComponent {
  private auth   = inject(AuthService);
  private router = inject(Router);

  email = ''; password = '';
  loading = signal(false);
  showPassword = signal(false);
  error   = signal('');

  // Google
  googleLoading    = signal(false);
  // اقفل/افتح زرار Google من هنا (false لحد ما نكمّل الموضوع)
  googleEnabled    = false;
  linkMode         = signal(false);
  showLinkPassword = signal(false);
  linkPassword = '';

  login() {
    if (!this.email || !this.password) { this.error.set('Please fill all fields'); return; }
    this.loading.set(true); this.error.set('');
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        this.loading.set(false);
        const detail = err?.error?.detail;
        if (detail === 'Device bound to another account') {
          this.error.set('الموبايل ده مربوط بحساب تاني، ادخل بالحساب الأول. لو الموبايل اتباع كلّم الدعم');
        } else if (detail === 'Device id required') {
          this.error.set('حدّث التطبيق لآخر نسخة وحاول تاني');
        } else {
          this.error.set('Invalid email or password');
        }
      },
    });
  }

  // ── Google: دخول فقط (التسجيل الجديد مش من هنا) ─────────────
  async googleLogin(): Promise<void> {
    await this.runGoogle();
  }

  async confirmLink(): Promise<void> {
    if (!this.linkPassword) return;
    await this.runGoogle(this.linkPassword);
  }

  cancelLink(): void {
    this.linkMode.set(false);
    this.linkPassword = '';
    this.error.set('');
  }

  private async runGoogle(linkPassword?: string): Promise<void> {
    if (this.googleLoading()) return;
    this.error.set('');
    this.googleLoading.set(true);
    try {
      await this.auth.loginWithGoogle(linkPassword);
      this.linkPassword = '';
      this.router.navigate(['/']);
    } catch (err: any) {
      this.googleLoading.set(false);
      this.handleGoogleError(err, !!linkPassword);
    }
  }

  private handleGoogleError(err: any, wasLinking: boolean): void {
    const detail = err?.error?.detail;
    const msg = String(err?.message ?? err ?? '').toLowerCase();
    console.error('[google-login]', { status: err?.status, detail, message: err?.message, err });

    // المستخدم قفل شاشة اختيار الحساب: مفيش رسالة خطأ
    if (!detail && (msg.includes('cancel') || msg.includes('dismiss') || msg.includes('12501'))) return;

    if (detail === 'google_link_requires_password') {
      this.linkMode.set(true);
    } else if (detail === 'google_account_not_found') {
      this.error.set('مفيش حساب مرتبط بحساب Google ده. سجّل حساب جديد الأول.');
    } else if (detail === 'Invalid email or password' && wasLinking) {
      this.error.set('الباسورد غلط، حاول تاني.');
    } else if (detail === 'Invalid Google token') {
      this.error.set('تعذّر التحقق من حساب Google. حاول تاني.');
    } else if (detail === 'Device bound to another account') {
      this.error.set('الموبايل ده مربوط بحساب تاني، ادخل بالحساب الأول. لو الموبايل اتباع كلّم الدعم');
    } else if (detail === 'Device id required') {
      this.error.set('حدّث التطبيق لآخر نسخة وحاول تاني');
    } else if (detail === 'Account disabled') {
      this.error.set('الحساب ده متوقف. كلّم الدعم.');
    } else if (err?.status === 429) {
      this.error.set('محاولات كتير. استنى شوية وحاول تاني.');
    } else {
      this.error.set('تعذّر الدخول بحساب Google. تأكد من الاتصال وحاول تاني.');
    }
  }

  devLogin() { this.router.navigate(['/']); }
}