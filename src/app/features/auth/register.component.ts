import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule],
  template: `
  <div class="min-h-screen flex items-center justify-center p-4"
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

          <div class="col-span-2">
            <label class="form-label">{{ 'AUTH.NAME' | translate }}</label>
            <input class="form-input" [(ngModel)]="form.name" placeholder="أحمد المزارع" />
          </div>

          <div class="col-span-2">
            <label class="form-label">{{ 'AUTH.EMAIL' | translate }}</label>
            <input class="form-input" type="email" [(ngModel)]="form.email" placeholder="farmer@example.com" />
          </div>

          <div class="col-span-2">
            <label class="form-label">{{ 'AUTH.PASSWORD' | translate }}</label>
            <input class="form-input" type="password" [(ngModel)]="form.password" placeholder="••••••••" />
          </div>

          <!-- حقل رقم الموبايل -->
          <div class="col-span-2">
            <label class="form-label">رقم الموبايل</label>
            <input
              class="form-input"
              type="tel"
              [(ngModel)]="form.phone"
              placeholder="01xxxxxxxxx"
              maxlength="11"
              (input)="onPhoneInput($event)"
            />
            @if (phoneError()) {
              <p class="text-red-500 text-xs mt-1">{{ phoneError() }}</p>
            }
          </div>

          <div class="col-span-2">
            <label class="form-label">{{ 'AUTH.LANGUAGE' | translate }}</label>
            <select class="form-select" [(ngModel)]="form.language">
              <option value="ar">🇸🇦 العربية</option>
              <option value="en">🇺🇸 English</option>
            </select>
          </div>

        </div>

        <!-- رسالة الخطأ من السيرفر -->
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

  form = { name: '', email: '', password: '', language: 'ar', phone: '' };
  loading  = signal(false);
  phoneError = signal('');
  errorMsg   = signal('');

  // التحقق إن الرقم مصري صح (يبدأ بـ 01 و11 رقم)
  onPhoneInput(event: Event) {
    const input = (event.target as HTMLInputElement).value;
    const onlyNumbers = input.replace(/\D/g, '');
    this.form.phone = onlyNumbers;

    if (onlyNumbers.length > 0 && !onlyNumbers.startsWith('01')) {
      this.phoneError.set('رقم الموبايل لازم يبدأ بـ 01');
    } else if (onlyNumbers.length > 0 && onlyNumbers.length !== 11) {
      this.phoneError.set('رقم الموبايل لازم يكون 11 رقم');
    } else {
      this.phoneError.set('');
    }
  }

  register() {
    // التحقق قبل الإرسال
    if (this.form.phone && this.form.phone.length !== 11) {
      this.phoneError.set('رقم الموبايل لازم يكون 11 رقم');
      return;
    }

    this.errorMsg.set('');
    this.loading.set(true);

    this.auth.register(this.form).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        this.loading.set(false);
        // عرض رسالة الخطأ من السيرفر
        if (err?.error?.detail === 'Phone number already registered') {
          this.errorMsg.set('رقم الموبايل مسجل من قبل');
        } else if (err?.error?.detail === 'Email already registered') {
          this.errorMsg.set('الإيميل مسجل من قبل');
        } else {
          this.errorMsg.set('حدث خطأ، حاول مرة تانية');
        }
      },
    });
  }
}