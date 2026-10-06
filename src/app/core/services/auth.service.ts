import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { environment } from '../../../environments/environment';
import { User, AuthResponse } from '../models';

const TOKEN_KEY = 'spa_token';
const USER_KEY  = 'spa_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http   = inject(HttpClient);
  private router = inject(Router);

  private _user  = signal<User | null>(null);
  private _token = signal<string | null>(null);

  currentUser    = computed(() => this._user());
  isAuthenticated= computed(() => !!this._token());
  // ⚠️ للعرض في الواجهة فقط — القيمة جاية من السيرفر (/auth/me) مش من التخزين المحلي،
  // والحماية الحقيقية في الباك (get_admin بتقرا الـ role من الداتابيز).
  isAdmin        = computed(() => this._user()?.role === 'admin');

  // ── التخزين ────────────────────────────────────────────────
  // على تطبيق Capacitor (أندرويد/iOS) بنستخدم @capacitor/preferences بدل localStorage.
  // على الويب مفيش بديل أمن 100% من غير cookies HttpOnly (محتاج تغيير في الباك)،
  // فبنفضل على localStorage + Content-Security-Policy في index.html.
  // 💡 لو عايز تشفير فعلي على الموبايل: استبدل Preferences بـ capacitor-secure-storage-plugin
  //    (نفس الـ get/set/remove) — التغيير محصور في الدوال التلاتة تحت بس.
  private async storeGet(key: string): Promise<string | null> {
    if (Capacitor.isNativePlatform()) {
      return (await Preferences.get({ key })).value ?? null;
    }
    return localStorage.getItem(key);
  }

  private async storeSet(key: string, value: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key, value });
    } else {
      localStorage.setItem(key, value);
    }
  }

  private async storeRemove(key: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Preferences.remove({ key });
    }
    localStorage.removeItem(key); // دايماً امسح من localStorage كمان (تنظيف نسخ قديمة)
  }

  /** ترحيل لمرة واحدة: مستخدمين الموبايل القدام توكنهم في localStorage → Preferences */
  private async migrateLegacyNativeToken(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    const legacy = localStorage.getItem(TOKEN_KEY);
    if (legacy && !(await Preferences.get({ key: TOKEN_KEY })).value) {
      await Preferences.set({ key: TOKEN_KEY, value: legacy });
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  // ── Init ───────────────────────────────────────────────────
  /**
   * بيرجّع Promise بتخلص بعد قراءة التوكن (سريعة). طلب /auth/me بيتبعت في الخلفية
   * عشان بدء التطبيق ميتعطلش لو السيرفر بطيء. لو بتناديها من APP_INITIALIZER
   * ارجّع الـ Promise ده (أو await عليه) عشان الـ guards تلاقي التوكن جاهز.
   */
  initAuth(): Promise<void> {
    // idempotent: أول نداء بيشغّل التهيئة، وأي نداء بعده (من الـ guards مثلاً) بيستنى نفس الـ Promise
    return (this._init ??= this.runInit());
  }

  private _init?: Promise<void>;

  private async runInit(): Promise<void> {
    await this.migrateLegacyNativeToken();
    const token = await this.storeGet(TOKEN_KEY);

    // زائر (أو توكن منتهي): من غير redirect — الموقع مفتوح للتصفح كزائر
    if (!token || this.isTokenExpired(token)) {
      this.clearAuth();
      return;
    }
    this._token.set(token);

    // الـ user (والـ role) بييجوا من السيرفر دايماً، مش من التخزين المحلي
    this.http.get<User>(`${environment.apiUrl}/auth/auth/me`).subscribe({
      next: u => { this._user.set(u); this.persistMinimalUser(u); },
      error: (err: HttpErrorResponse) => {
        // 401/403 → توكن مرفوض أو حساب معطّل. أي خطأ تاني (شبكة/سيرفر نايم) مايفصلش المستخدم.
        if (err.status === 401 || err.status === 403) this.logout(false);
      },
    });
  }

  // بنخزّن بس اللي الواجهة محتاجاه (الاسم/اللغة) — مش كائن المستخدم كله
  private persistMinimalUser(user: User) {
    const minimal = { name: user.name, language: (user as any).language };
    this.storeSet(USER_KEY, JSON.stringify(minimal)).catch(() => {});
  }

  private saveAuth(token: string, user: User) {
    this._token.set(token);
    this._user.set(user);
    this.storeSet(TOKEN_KEY, token).catch(() => {});
    this.persistMinimalUser(user);
  }

  private clearAuth() {
    this._token.set(null);
    this._user.set(null);
    this.storeRemove(TOKEN_KEY).catch(() => {});
    this.storeRemove(USER_KEY).catch(() => {});
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
    // بلّغ السيرفر يبطّل التوكن (token_version). الطلب بيتبعت قبل clearAuth عشان الـ interceptor يلحق يحط التوكن.
    // لو فشل (أوفلاين/endpoint مش موجود) منعطّلش الخروج المحلي.
    if (remote && this._token()) {
      this.http.post(`${environment.apiUrl}/auth/auth/logout`, {}).subscribe({ error: () => {} });
    }
    this.clearAuth();
    // ⚠️ الموقع مفتوح للتصفح كزائر، فتسجيل الخروج يرجّعك للداشبورد عادي
    // مش يجبرك على صفحة تسجيل الدخول — التسجيل هيتطلب بس لو حاولت تستخدم
    // ميزة محتاجة حساب (زي إضافة قطيع أو تخطي حد الأسئلة المجانية في الشات)
    this.router.navigate(['/dashboard']);
  }

  getToken() { return this._token(); }
}
