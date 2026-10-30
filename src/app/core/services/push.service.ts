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
 * على المتصفح العادي init() مش بتعمل حاجة.
 */
@Injectable({ providedIn: 'root' })
export class PushService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private initialized = false;

  /** بيطلع حدث لما يوصل إشعار والتطبيق مفتوح — عشان الجرس/التنبيهات يتحدثوا فورًا */
  readonly received$ = new Subject<void>();

  async init(): Promise<void> {
    if (!Capacitor.isNativePlatform() || this.initialized) return;
    this.initialized = true;

    try {
      let perm = await PushNotifications.checkPermissions();
      if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
        perm = await PushNotifications.requestPermissions();
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

      await PushNotifications.addListener('registration', token => {
        localStorage.setItem(TOKEN_KEY, token.value);
        this.http.post(`${environment.apiUrl}/push/register`, {
          token: token.value,
          platform: Capacitor.getPlatform(),
        }).subscribe({ error: () => {} });
      });

      await PushNotifications.addListener('registrationError', err =>
        console.error('[push] registration error', err)
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
    } catch (e) {
      console.error('[push] init failed', e);
      this.initialized = false;
    }
  }

  /** نادِها عند تسجيل الخروج، عشان الجهاز ميستقبلش إشعارات الحساب ده */
  async unregister(): Promise<void> {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    try {
      await this.http.post(`${environment.apiUrl}/push/unregister`, { token }).toPromise();
    } catch { /* مش مهم لو فشل */ }
    localStorage.removeItem(TOKEN_KEY);
  }
}
