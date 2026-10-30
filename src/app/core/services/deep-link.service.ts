import { Injectable, NgZone, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

/**
 * ملف جديد: src/app/core/services/deep-link.service.ts
 *
 * بيرجّع المستخدم للتطبيق بعد ما يخلّص الدفع على الموقع:
 *   الموقع (payment-result)  →  farmapp://payment-result?ref=...  →  التطبيق يفتح صفحة /payment-result
 *
 * ✅ خطوات التفعيل (مرة واحدة):
 * 1) npm i @capacitor/app && npx cap sync
 * 2) غيّر APP_SCHEME تحت لاسم مميّز للتطبيق بتاعك (حروف صغيرة بس).
 * 3) في AppComponent (constructor أو ngOnInit):   inject(DeepLinkService).init();
 * 4) iOS — ios/App/App/Info.plist:
 *      <key>CFBundleURLTypes</key>
 *      <array><dict>
 *        <key>CFBundleURLSchemes</key><array><string>farmapp</string></array>
 *      </dict></array>
 * 5) Android — android/app/src/main/AndroidManifest.xml داخل <activity> الرئيسية:
 *      <intent-filter>
 *        <action android:name="android.intent.action.VIEW" />
 *        <category android:name="android.intent.category.DEFAULT" />
 *        <category android:name="android.intent.category.BROWSABLE" />
 *        <data android:scheme="farmapp" android:host="payment-result" />
 *      </intent-filter>
 */
export const APP_SCHEME = 'farmapp'; // 👈 عدّله (لازم يطابق Info.plist و AndroidManifest)

// علامة "المستخدم جاي من التطبيق" — بتنتهي بعد 30 دقيقة عشان مظهرش زرار الرجوع لمستخدم موقع عادي
const FROM_APP_KEY = 'from_app_ts';
const FROM_APP_TTL_MS = 30 * 60 * 1000;

export function markFromApp(): void {
  try { localStorage.setItem(FROM_APP_KEY, String(Date.now())); } catch { /* ignore */ }
}

export function isFromApp(): boolean {
  try {
    const ts = Number(localStorage.getItem(FROM_APP_KEY));
    return !!ts && Date.now() - ts < FROM_APP_TTL_MS;
  } catch { return false; }
}

export function clearFromApp(): void {
  try { localStorage.removeItem(FROM_APP_KEY); } catch { /* ignore */ }
}

/** query = "ref=xxx" أو "order=123" (نفس اللي payment-result بيستخدمه) */
export function buildAppLink(query: string): string {
  return `${APP_SCHEME}://payment-result?${query}`;
}

@Injectable({ providedIn: 'root' })
export class DeepLinkService {
  private router = inject(Router);
  private zone = inject(NgZone);
  private started = false;

  init(): void {
    if (this.started || !Capacitor.isNativePlatform()) return;
    this.started = true;
    App.addListener('appUrlOpen', ({ url }) => this.handle(url));
  }

  private handle(url: string): void {
    let u: URL;
    try { u = new URL(url); } catch { return; }
    if (u.protocol !== `${APP_SCHEME}:` || u.host !== 'payment-result') return;

    // نقبل ref أو order بس، وبقيمة آمنة — أي حاجة تانية في الرابط بتتتجاهل
    const SAFE = /^[A-Za-z0-9_-]{1,100}$/;
    const ref = u.searchParams.get('ref');
    const order = u.searchParams.get('order');
    const queryParams: Record<string, string> = {};
    if (ref && SAFE.test(ref)) queryParams['ref'] = ref;
    else if (order && SAFE.test(order)) queryParams['order'] = order;
    else return;

    try { void Browser.close().catch(() => {}); } catch { /* Android: غير مدعوم، مش مشكلة */ }
    clearFromApp();
    this.zone.run(() => this.router.navigate(['/payment-result'], { queryParams }));
  }
}
