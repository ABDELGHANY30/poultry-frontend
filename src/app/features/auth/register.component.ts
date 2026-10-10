import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';

type Field = 'name' | 'email' | 'password' | 'phone';

// أخطاء شائعة في كتابة الإيميل → التصحيح المقترح
const EMAIL_TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gamil.com': 'gmail.com',
  'gmal.com': 'gmail.com', 'gmil.com': 'gmail.com', 'gnail.com': 'gmail.com',
  'gmail.con': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.cm': 'gmail.com',
  'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmail.con': 'hotmail.com',
  'yahooo.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahoo.con': 'yahoo.com',
  'outlok.com': 'outlook.com', 'outlook.con': 'outlook.com',
};

const COMMON_PASSWORDS = [
  '12345678', '123456789', '1234567890', '11111111', '00000000', '12341234',
  'password', 'password1', 'qwerty123', 'abc12345', 'iloveyou',
];

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule],
  template: `
<div class="page-wrapper min-h-screen flex items-center justify-center p-4"
          style="background:linear-gradient(135deg,#0b2416 0%,#154128 50%,#1e7d48 100%)">
    <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
      <div class="text-white text-center py-7 px-6"
           style="background:linear-gradient(135deg,#1a4a2e 0%,#2d9e5f 100%)">
        <div class="text-5xl mb-3">🐣</div>
        <h1 class="text-xl font-black mb-1">{{ 'AUTH.REG_TITLE' | translate }}</h1>
        <p class="text-white/70 text-sm">{{ 'AUTH.REG_SUB' | translate }}</p>
      </div>
      <div class="p-7">
        <div class="grid grid-cols-2 gap-3 mb-4">

          <!-- الاسم -->
          <div class="col-span-2">
            <label class="form-label">{{ 'AUTH.NAME' | translate }}</label>
            <input class="form-input" [(ngModel)]="form.name" placeholder="أحمد المزارع"
                   autocomplete="name" (blur)="touch('name')"
                   [style.border-color]="shown('name') ? '#f87171' : ''" />
            @if (shown('name')) {
              <p class="text-red-500 text-xs mt-1">⚠️ {{ shown('name') }}</p>
            }
          </div>

          <!-- الإيميل -->
          <div class="col-span-2">
            <label class="form-label">{{ 'AUTH.EMAIL' | translate }}</label>
            <input class="form-input" type="email" [(ngModel)]="form.email"
                   placeholder="farmer@example.com" autocomplete="email" dir="ltr"
                   (blur)="touch('email')"
                   [style.border-color]="shown('email') ? '#f87171' : ''" />
            @if (shown('email')) {
              <p class="text-red-500 text-xs mt-1">⚠️ {{ shown('email') }}</p>
            } @else if (touched().email && emailSuggestion()) {
              <p class="text-amber-600 text-xs mt-1">
                🤔 قصدك
                <button type="button" class="font-bold underline" dir="ltr"
                        (click)="applyEmailSuggestion()">{{ emailSuggestion() }}</button> ؟
              </p>
            }
          </div>

          <!-- كلمة السر -->
          <div class="col-span-2">
            <label class="form-label">{{ 'AUTH.PASSWORD' | translate }}</label>
            <div class="relative">
              <input class="form-input w-full" [type]="showPassword() ? 'text' : 'password'"
                     [(ngModel)]="form.password" placeholder="••••••••"
                     autocomplete="new-password" dir="ltr"
                     style="padding-inline-end:44px"
                     (blur)="touch('password')"
                     [style.border-color]="shown('password') ? '#f87171' : ''" />
              <button type="button"
                      class="absolute top-1/2 -translate-y-1/2 text-lg leading-none"
                      style="inset-inline-end:12px"
                      (click)="showPassword.set(!showPassword())"
                      [attr.aria-label]="showPassword() ? 'إخفاء كلمة السر' : 'إظهار كلمة السر'">
                {{ showPassword() ? '🙈' : '👁️' }}
              </button>
            </div>

            @if (shown('password')) {
              <p class="text-red-500 text-xs mt-1">⚠️ {{ shown('password') }}</p>
            }

            <!-- مؤشر قوة كلمة السر -->
            @if (form.password) {
              <div class="flex items-center gap-2 mt-2">
                <div class="flex gap-1 flex-1">
                  @for (i of [1, 2, 3]; track i) {
                    <span class="h-1.5 flex-1 rounded-full"
                          [style.background-color]="passwordStrength() >= i ? strengthColor() : '#e5e7eb'"></span>
                  }
                </div>
                <span class="text-[11px] font-bold" [style.color]="strengthColor()">{{ strengthLabel() }}</span>
              </div>
            }
          </div>

          <!-- حقل رقم الموبايل -->
          <div class="col-span-2">
            <label class="form-label">رقم الموبايل</label>
            <input
              class="form-input"
              type="tel"
              inputmode="numeric"
              autocomplete="tel"
              [(ngModel)]="form.phone"
              placeholder="01xxxxxxxxx"
              maxlength="11"
              dir="ltr"
              (input)="onPhoneInput($event)"
              [style.border-color]="phoneError() ? '#f87171' : ''"
            />
            @if (phoneError()) {
              <p class="text-red-500 text-xs mt-1">⚠️ {{ phoneError() }}</p>
            }
          </div>

        </div>

        <!-- رسالة الخطأ (من الفورم أو من السيرفر) -->
        @if (errorMsg()) {
          <div class="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-4 text-center">
            {{ errorMsg() }}
          </div>
        }

        <button class="btn-primary btn w-full py-3 text-base mb-4"
                (click)="register()" [disabled]="loading()">
          {{ loading() ? '...' : ('AUTH.REG_BTN' | translate) }}
        </button>

        <p class="text-center text-sm text-[var(--c-muted)]">
          {{ 'AUTH.HAS_ACCOUNT' | translate }}
          <a routerLink="/auth/login" class="text-primary-700 font-bold hover:underline no-underline">
            {{ 'AUTH.LOGIN_LINK' | translate }}
          </a>
        </p>
      </div>
    </div>
  </div>
  `,
})
export class RegisterComponent {
  private auth   = inject(AuthService);
  private router = inject(Router);

  form = { name: '', email: '', password: '', phone: '' };
  loading      = signal(false);
  phoneError   = signal('');
  errorMsg     = signal('');
  submitted    = signal(false);
  showPassword = signal(false);
  touched      = signal<Record<Field, boolean>>({ name: false, email: false, password: false, phone: false });

  touch(f: Field) {
    this.touched.update(t => ({ ...t, [f]: true }));
  }

  // ─────────────── قواعد التحقق ───────────────

  nameError(): string {
    const v = this.form.name.trim();
    if (!v) return 'اكتب اسمك';
    if (v.length < 3) return 'الاسم قصير، اكتب 3 حروف على الأقل';
    if (!/^[\p{L}\p{M}\s.'’-]+$/u.test(v)) return 'الاسم لازم يكون حروف بس من غير أرقام أو رموز';
    return '';
  }

  emailError(): string {
    const v = this.form.email.trim();
    if (!v) return 'اكتب الإيميل';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
      return 'الإيميل مش مكتوب صح، مثال: farmer@example.com';
    }
    return '';
  }

  emailSuggestion(): string {
    const v = this.form.email.trim().toLowerCase();
    const at = v.lastIndexOf('@');
    if (at < 1) return '';
    const fix = EMAIL_TYPOS[v.slice(at + 1)];
    return fix ? v.slice(0, at + 1) + fix : '';
  }

  applyEmailSuggestion() {
    this.form.email = this.emailSuggestion();
  }

  passwordError(): string {
    const v = this.form.password;
    if (!v) return 'اكتب كلمة السر';
    if (v.length < 8) return 'كلمة السر لازم تكون 8 أحرف على الأقل';
    if (/^\d+$/.test(v)) return 'كلمة السر أرقام بس، ضيف حروف معاها';
    if (COMMON_PASSWORDS.includes(v.toLowerCase())) return 'كلمة السر دي سهلة التخمين، اختار غيرها';
    const local = this.form.email.split('@')[0]?.trim().toLowerCase();
    if (local && local.length >= 4 && v.toLowerCase() === local) {
      return 'كلمة السر ماينفعش تكون نفس الإيميل';
    }
    return '';
  }

  /** 0 = فاضية، 1 = ضعيفة، 2 = متوسطة، 3 = قوية */
  passwordStrength(): number {
    const v = this.form.password;
    if (!v) return 0;
    if (this.passwordError()) return 1;
    let s = 1;
    if (/[A-Za-z\u0600-\u06FF]/.test(v) && /\d/.test(v)) s++;
    if (v.length >= 12 || /[^A-Za-z0-9\u0600-\u06FF]/.test(v)) s++;
    return s;
  }
  strengthLabel(): string { return ['', 'ضعيفة', 'متوسطة', 'قوية'][this.passwordStrength()]; }
  strengthColor(): string { return ['#e5e7eb', '#ef4444', '#f59e0b', '#16a34a'][this.passwordStrength()]; }

  private errorOf(f: Field): string {
    switch (f) {
      case 'name':     return this.nameError();
      case 'email':    return this.emailError();
      case 'password': return this.passwordError();
      case 'phone':    return this.phoneError();
    }
  }

  /** الرسالة بتظهر بعد ما المستخدم يسيب الحقل، أو بعد أول محاولة تسجيل */
  shown(f: Field): string {
    return this.touched()[f] || this.submitted() ? this.errorOf(f) : '';
  }

  // ─────────────── الموبايل ───────────────

  // التحقق إن الرقم مصري صح (010 / 011 / 012 / 015 و11 رقم)
  onPhoneInput(event: Event) {
    const raw = (event.target as HTMLInputElement).value;
    // تحويل الأرقام العربية (٠١٢...) لإنجليزي قبل ما نشيل أي حاجة تانية
    const latin = raw.replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660));
    const onlyNumbers = latin.replace(/\D/g, '');
    this.form.phone = onlyNumbers;

    if (onlyNumbers.length > 0 && !onlyNumbers.startsWith('01')) {
      this.phoneError.set('رقم الموبايل لازم يبدأ بـ 01');
    } else if (onlyNumbers.length >= 3 && !/^01[0125]/.test(onlyNumbers)) {
      this.phoneError.set('رقم الموبايل لازم يبدأ بـ 010 أو 011 أو 012 أو 015');
    } else if (onlyNumbers.length === 11 || onlyNumbers.length === 0) {
      this.phoneError.set('');
    } else if (onlyNumbers.length >= 3) {
      // لسه بيكتب: نحذّره بس لو سابه ناقص (يتأكد عند الإرسال)
      this.phoneError.set('');
    }
  }

  // ─────────────── الإرسال ───────────────

  register() {
    this.submitted.set(true);
    this.errorMsg.set('');

    // الموبايل اختياري، لكن لو كتبه لازم يكون كامل
    if (this.form.phone && this.form.phone.length !== 11) {
      this.phoneError.set('رقم الموبايل لازم يكون 11 رقم');
    }

    const hasErrors =
      !!this.nameError() || !!this.emailError() || !!this.passwordError() || !!this.phoneError();
    if (hasErrors) {
      this.errorMsg.set('فيه بيانات غلط، راجع الحقول اللي عليها ⚠️');
      return;
    }

    this.loading.set(true);
    const payload = {
      ...this.form,
      name: this.form.name.trim(),
      email: this.form.email.trim().toLowerCase(),
    };

    this.auth.register(payload).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        this.loading.set(false);
        const detail = err?.error?.detail;
        if (err?.status === 0) {
          this.errorMsg.set('مفيش اتصال بالسيرفر، تأكد من الإنترنت وحاول تاني');
        } else if (detail === 'Phone number already registered') {
          this.errorMsg.set('رقم الموبايل مسجل من قبل، جرّب تسجّل دخول');
        } else if (detail === 'Email already registered') {
          this.errorMsg.set('الإيميل مسجل من قبل، جرّب تسجّل دخول');
        } else if (err?.status === 422) {
          this.errorMsg.set('البيانات اللي كتبتها مش مقبولة، راجع الحقول وحاول تاني');
        } else {
          this.errorMsg.set('حدث خطأ، حاول مرة تانية');
        }
      },
    });
  }
}
