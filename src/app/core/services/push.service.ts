import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { environment } from '../../../environments/environment'; // عدّل المسار حسب مكان الملف عندك

const TOKEN_KEY = 'fcm_token';

/**
 * إشعارات الموبايل (FCM) — بتشتغل على Android/iOS فقط (Capacitor native).
 *
 * الاستخدام:
 *   1) في AppComponent.ngOnInit:        this.push.init();
 *   2) في AppComponent عند كل NavigationEnd: this.push.sync();   // بيحاول لحد ما يتحفظ (بعد الدخول)
 *   3) عند تسجيل الخروج:                await this.push.unregister();
 */
@Injectable({ providedIn: 'root' })
export class PushService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private initialized = false;
  private synced = false;   // اتحفظ على السيرفر؟
  private token: string | null = localStorage.getItem(TOKEN_KEY);

  /** بيطلع حدث لما يوصل إشعار والتطبيق مفتوح — عشان الجرس/التنبيهات يتحدثوا فورًا */
  readonly received$ = new Subject<void>();

  async init(): Promise<void> {
    console.log('[push] init called, native =', Capacitor.isNativePlatform(), ', initialized =', this.initialized);
    if (!Capacitor.isNativePlatform()) return;

    // لو اتنادت تاني (مثلاً بعد تسجيل الدخول) نبعت التوكن للسيرفر بس
    if (this.initialized) {
      this.sync();
      return;
    }
    this.initialized = true;

    try {
      let perm = await PushNotifications.checkPermissions();
      console.log('[push] permission =', perm.receive);
      if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
        perm = await PushNotifications.requestPermissions();
        console.log('[push] after request =', perm.receive);
      }
      if (perm.receive !== 'granted') {
        this.initialized = false; // لو المستخدم وافق بعدين من الإعدادات نحاول تاني
        return;
      }

      // Android 8+: لازم Channel بنفس الـ id اللي الباك إند بيبعته (alerts)
      if (Capacitor.getPlatform() === 'android') {
        await PushNotifications.createChannel({
          id: 'alerts',
          name: 'التنبيهات',
          description: 'تنبيهات القطعان والتطعيمات والطلبات',
          importance: 5,
          visibility: 1,
          sound: 'default',
          vibration: true,
        });
      }

      await PushNotifications.addListener('registration', t => {
        console.log('[push] token received', t.value.slice(0, 20));
        this.token = t.value;
        localStorage.setItem(TOKEN_KEY, t.value);
        this.sync();
      });

      await PushNotifications.addListener('registrationError', err =>
        console.error('[push] registration error', JSON.stringify(err))
      );

      // التطبيق مفتوح: النظام مش بيعرض الإشعار لوحده → نحدّث الواجهة
      await PushNotifications.addListener('pushNotificationReceived', () => {
        this.received$.next();
      });

      // المستخدم ضغط على الإشعار من برّه → نفتح الصفحة المناسبة
      await PushNotifications.addListener('pushNotificationActionPerformed', action => {
        const url = action.notification.data?.url;
        this.received$.next();
        if (typeof url === 'string' && url.startsWith('/')) {
          this.router.navigateByUrl(url);
        }
      });

      await PushNotifications.register();
      console.log('[push] register() called');
    } catch (e) {
      console.error('[push] init failed', e);
      this.initialized = false;
    }
  }

  /** يبعت التوكن المحفوظ للسيرفر (لو المستخدم لسه ما سجلش دخول هيفشل بهدوء وهنحاول بعد الدخول) */
  sync(): void {
    if (!this.token || this.synced) return;
    this.synced = true; // نمنع طلبين في نفس الوقت — لو فشل بنرجعها false
    this.http.post(`${environment.apiUrl}/push/register`, {
      token: this.token,
      platform: Capacitor.getPlatform(),
    }).subscribe({
      next: () => console.log('[push] token saved on server'),
      error: e => { this.synced = false; console.warn('[push] save token failed', e?.status); },
    });
  }

  /** نادِها عند تسجيل الخروج، عشان الجهاز ميستقبلش إشعارات الحساب ده */
  async unregister(): Promise<void> {
    const token = this.token || localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    try {
      await this.http.post(`${environment.apiUrl}/push/unregister`, { token }).toPromise();
    } catch { /* مش مهم لو فشل */ }
    this.synced = false;
  }
}
