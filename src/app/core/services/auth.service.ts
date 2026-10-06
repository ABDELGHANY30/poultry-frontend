import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom, tap, timeout } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { environment } from '../../../environments/environment';
import { User, AuthResponse } from '../models';

// المفاتيح دي بتتستخدم على الموبايل (Capacitor) بس. على الويب مفيش أي حاجة بتتخزن في المتصفح:
// التوكن في cookie HttpOnly بيحطها السيرفر، والـ user بييجي من /auth/me.
const TOKEN_KEY = 'spa_token';
const USER_KEY  = 'spa_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http   = inject(HttpClient);
  private router = inject(Router);

  readonly isNative = Capacitor.isNativePlatform();

  private _user  = signal<User | null>(null);
  private _token = signal<string | null>(null); // موبايل فقط — على الويب دايماً null

  currentUser     = computed(() => this._user());
  // ويب: مسجّل دخول = السيرفر رجّع user من /auth/me. موبايل: عنده توكن.
  isAuthenticated = computed(() => !!this._user() || !!this._token());
  // ⚠️ للعرض في الواجهة فقط — الحماية الحقيقية في الباك (get_admin).
  isAdmin         = computed(() => this._user()?.role === 'admin');

  // ── تخزين الموبايل فقط ─────────────────────────────────────
  private async nativeGet(key: string): Promise<string | null> {
    return (await Preferences.get({ key })).value ?? null;
  }
  private async nativeSet(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
  }
  private async nativeRemove(key: string): Promise<void> {
    await Preferences.remove({ key });
  }

  /** تنظيف لمرة واحدة: أي توكن قديم كان متخزن في localStorage (ويب) يتمسح. المستخدم هيسجّل دخول تاني بالكوكي. */
  private purgeLegacyLocalStorage(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch { /* storage مقفول — مش مشكلة */ }
  }

  // ── Init ───────────────────────────────────────────────────
  /** idempotent: أول نداء بيشغّل التهيئة، وأي نداء بعده (من الـ guards) بيستنى نفس الـ Promise */
  initAuth(): Promise<void> {
    return (this._init ??= this.runInit());
  }

  private _init?: Promise<void>;

  private async runInit(): Promise<void> {
    this.purgeLegacyLocalStorage();

    if (this.isNative) {
      await this.runInitNative();
      return;
    }

    // ويب: مفيش طريقة نعرف إحنا مسجلين ولا لأ من غير ما نسأل السيرفر (الكوكي HttpOnly مش مقروءة).
    // timeout عشان بدء التطبيق ميتعطلش لو السيرفر بطيء.
    try {
      const u = await firstValueFrom(
        this.http.get<User>(`${environment.apiUrl}/auth/auth/me`).pipe(timeout(8000))
      );
      this._user.set(u);
    } catch (e) {
      // 401/403/شبكة/timeout → نكمل كزائر (الموقع مفتوح للتصفح)
      this._user.set(null);
    }
  }

  private async runInitNative(): Promise<void> {
    const token = await this.nativeGet(TOKEN_KEY);
    if (!token || this.isTokenExpired(token)) {
      await this.clearAuth();
      return;
    }
    this._token.set(token);

    this.http.get<User>(`${environment.apiUrl}/auth/auth/me`).subscribe({
      next: u => { this._user.set(u); this.persistMinimalUserNative(u); },
      error: (err: HttpErrorResponse) => {
        // 401/403 → توكن مرفوض أو حساب معطّل. أي خطأ تاني (شبكة/سيرفر نايم) مايفصلش المستخدم.
        if (err.status === 401 || err.status === 403) this.logout(false);
      },
    });
  }

  private persistMinimalUserNative(user: User) {
    if (!this.isNative) return;
    const minimal = { name: user.name, language: (user as any).language };
    this.nativeSet(USER_KEY, JSON.stringify(minimal)).catch(() => {});
  }

  private saveAuth(token: string | null | undefined, user: User) {
    this._user.set(user);
    if (this.isNative && token) {
      this._token.set(token);
      this.nativeSet(TOKEN_KEY, token).catch(() => {});
      this.persistMinimalUserNative(user);
    }
    // ويب: الكوكي اتحطت من السيرفر في رد الـ login — مفيش حاجة نخزنها هنا.
  }

  private async clearAuth(): Promise<void> {
    this._token.set(null);
    this._user.set(null);
    if (this.isNative) {
      await Promise.all([this.nativeRemove(TOKEN_KEY), this.nativeRemove(USER_KEY)]).catch(() => {});
    }
  }

  /** بيناديها الـ interceptor لما أي طلب يرجع 401 (كوكي/توكن انتهى) — بتصفّي الحالة المحلية بس من غير redirect. */
  handleUnauthorized(): void {
    if (this.isAuthenticated()) void this.clearAuth();
  }

  // ── Auth calls ─────────────────────────────────────────────
  login(email: string, password: string) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/auth/login`, { email, password }).pipe(
      tap(r => this.saveAuth(r.access_token, r.user))
    );
  }

  register(payload: { name: string; email: string; password: string }) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/auth/register`, payload).pipe(
      tap(r => this.saveAuth(r.access_token, r.user))
    );
  }

  private isTokenExpired(token: string): boolean {
    try {
      const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(b64));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  logout(remote = true) {
    // بلّغ السيرفر يبطّل التوكن ويمسح الكوكي. الطلب بيتبعت قبل clearAuth عشان الـ interceptor يلحق يحط التوكن (موبايل).
    // لو فشل (أوفلاين) منعطّلش الخروج المحلي — بس على الويب الكوكي هتفضل لحد ما تنتهي.
    if (remote && this.isAuthenticated()) {
      this.http.post(`${environment.apiUrl}/auth/auth/logout`, {}).subscribe({ error: () => {} });
    }
    void this.clearAuth();
    // الموقع مفتوح للتصفح كزائر، فتسجيل الخروج يرجّعك للداشبورد عادي
    this.router.navigate(['/dashboard']);
  }

  /** توكن الموبايل فقط. على الويب بيرجّع null (الكوكي HttpOnly والـ interceptor بيستخدم withCredentials). */
  getToken() { return this._token(); }
}
