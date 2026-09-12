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
  <div class="min-h-screen flex items-center justify-center p-4"
       style="background:linear-gradient(135deg,#0b2416 0%,#154128 50%,#1e7d48 100%)">

    <!-- Decorative circles -->
    <div class="absolute top-10 start-10 w-40 h-40 rounded-full bg-white/5 -z-0"></div>
    <div class="absolute bottom-10 end-10 w-60 h-60 rounded-full bg-white/3 -z-0"></div>

    <div class="relative z-10 bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">

      <!-- Top banner -->
      <div class="text-white text-center py-8 px-6"
           style="background:linear-gradient(135deg,#1a4a2e 0%,#2d9e5f 100%)">
        <div class="text-6xl mb-3">🐔</div>
        <h1 class="text-xl font-black mb-1">{{ 'AUTH.LOGIN_TITLE' | translate }}</h1>
        <p class="text-white/70 text-sm">{{ 'AUTH.LOGIN_SUB' | translate }}</p>
      </div>

      <!-- Form -->
      <div class="p-7">
        <div class="mb-4">
          <label class="form-label">{{ 'AUTH.EMAIL' | translate }}</label>
          <input class="form-input" type="email" [(ngModel)]="email"
                 placeholder="farmer@example.com" (keydown.enter)="login()" />
        </div>
        <div class="mb-6">
          <label class="form-label">{{ 'AUTH.PASSWORD' | translate }}</label>
          <input class="form-input" type="password" [(ngModel)]="password"
                 placeholder="••••••••" (keydown.enter)="login()" />
        </div>

        <div *ngIf="error()" class="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {{ error() }}
        </div>

        <button class="btn-primary btn w-full py-3 text-base mb-4"
                (click)="login()" [disabled]="loading()">
          {{ loading() ? ('AUTH.SIGNING_IN' | translate) : ('AUTH.LOGIN_BTN' | translate) }}
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
  error   = signal('');

  login() {
    if (!this.email || !this.password) { this.error.set('Please fill all fields'); return; }
    this.loading.set(true); this.error.set('');
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/']),
      error: () => { this.loading.set(false); this.error.set('Invalid email or password'); },
    });
  }

  devLogin() { this.router.navigate(['/']); }
}
