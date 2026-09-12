/**
 * BillingService — الشراء عبر Google Play Billing (cordova-plugin-purchase v13+).
 *
 * التركيب:
 *   npm install cordova-plugin-purchase
 *   npx cap sync android
 *
 * الإعداد المطلوب قبل ما ده يشتغل:
 * 1. في Play Console: منتج اشتراك id = "pro"، وجواه base plans بـ id
 *    "monthly" و"yearly" (لازم تتأكد إن الأسماء دي مطابقة لـ BASE_PLAN_IDS
 *    تحت، أو تعدّلها هنا لو سميتها حاجة تانية).
 * 2. environment.apiUrl لازم يكون مضبوط على رابط الباك اند بتاعك.
 * 3. لازم يتم رفع نسخة موقعة (signed build) على قناة اختبار في Play Console
 *    (Internal/Closed testing) قبل ما الاشتراكات تشتغل فعلياً — ده شرط من
 *    جوجل نفسها، مش حاجة في الكود.
 * 4. نادِ billingService.init(userId) مرة واحدة بعد تسجيل الدخول (مش قبل
 *    ما تعرف الـ userId، لأنه المفروض يترسل مع كل عملية شراء).
 *
 * ⚠️ أسماء الحقول على الـ transaction object (زي purchaseToken) ممكن تختلف
 * شوية حسب نسخة البلجن بالظبط — لو حصل خطأ، اعمل console.log(transaction)
 * جوا onApproved وشوف الشكل الفعلي وعدّل الأسطر المعلّمة تحت.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment'; // ⚠️ عدّل المسار حسب مكان الملف عندك

// cordova-plugin-purchase مش بيتحمّل بـ import عادي — البلجن بيتحقن على
// window وقت التشغيل من الـ native bridge بتاع Capacitor (بعد npx cap sync)،
// مش جزء من الـ webpack bundle. لو حطيت import ليه هنا هيديك compile error
// إنه مش لاقي الموديول أو type declarations بتاعته.
declare const CdvPurchase: any;

export type BillingPlan = 'monthly' | 'yearly';

const PRODUCT_ID = 'pro'; // نفس subscription product ID في Play Console
const BASE_PLAN_IDS: Record<BillingPlan, string> = {
  monthly: 'monthly',
  yearly: 'yearly',
};

@Injectable({ providedIn: 'root' })
export class BillingService {
  private store: any = null;
  private ready = false;
  private currentUserId: string | null = null;

  constructor(private http: HttpClient) {}

  /**
   * استدعيها مرة واحدة بعد تسجيل الدخول مباشرة. على المتصفح/الويب بترجع
   * فوراً من غير ما تعمل حاجة — الاشتراك من الموقع لسه بـ Paymob زي ما هو.
   */
  async init(userId: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    if (this.ready) {
      return;
    }

    this.currentUserId = userId;
    this.store = CdvPurchase.store;
    this.store.verbosity = environment.production ? CdvPurchase.LogLevel.ERROR : CdvPurchase.LogLevel.DEBUG;

    this.store.register([
      {
        id: PRODUCT_ID,
        type: CdvPurchase.ProductType.PAID_SUBSCRIPTION,
        platform: CdvPurchase.Platform.GOOGLE_PLAY,
      },
    ]);

    this.store.when().approved((transaction: any) => this.onApproved(transaction));
    this.store.error((err: unknown) => console.error('BillingService error:', err));

    await this.store.initialize([CdvPurchase.Platform.GOOGLE_PLAY]);
    this.ready = true;

    // استرجاع أي اشتراك سابق (تسطيب جديد أو جهاز جديد) — بدون ده المستخدم
    // ممكن يحاول يشتري تاني بالغلط وهو أصلاً مشترك
    await this.restorePurchases();
  }

  /** يبدأ عملية شراء (أو ترقية/تغيير) لخطة شهرية أو سنوية */
  async purchase(plan: BillingPlan): Promise<void> {
    if (!this.ready || !this.currentUserId) {
      throw new Error('BillingService مش مهيأ — نادِ init(userId) الأول بعد تسجيل الدخول');
    }

    const product = this.store.get(PRODUCT_ID, CdvPurchase.Platform.GOOGLE_PLAY);
    if (!product) {
      throw new Error('منتج الاشتراك لسه معملوش تحميل من Google Play — جرب تاني بعد شوية');
    }

    const offer = product.offers?.find((o: any) => o.id?.includes(BASE_PLAN_IDS[plan]));
    if (!offer) {
      throw new Error(`مفيش عرض متاح لخطة "${plan}" — تأكد من الـ base plan في Play Console`);
    }

    await this.store.order(offer, {
      // ده اللي بيربط الشراء بالـ user id بتاعنا (obfuscatedAccountId في Play) —
      // نفس القيمة اللي الباك اند بيتحقق منها في verify_subscription_purchase_for_user.
      // من غير السطر ده، كل عمليات التحقق في الباك اند هتفشل.
      applicationUsername: this.currentUserId,
    });

    // النتيجة مبتوصلش هنا مباشرة — بتوصل عبر store.when().approved(...) تحت
  }

  /** بتتنادى تلقائي جوا init()، وتقدر تحطها كمان على زرار "استرجاع اشتراكي" */
  async restorePurchases(): Promise<void> {
    if (!this.ready) return;
    await this.store.restorePurchases();
  }

  private async onApproved(transaction: any): Promise<void> {
    const purchaseToken =
      transaction.nativePurchase?.purchaseToken ?? transaction.purchaseId ?? transaction.transactionId;

    if (!purchaseToken) {
      console.error('مفيش purchase token في الـ transaction — راجع تعليق onApproved فوق:', transaction);
      return;
    }

    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/payment/verify-purchase`, {
          purchase_token: purchaseToken,
        })
      );
      // الباك اند اتأكد من الشراء مع Google وعمل acknowledge — دلوقتي نقفل
      // الـ transaction محلياً في البلجن
      transaction.finish();
    } catch (err) {
      // متعملش finish() هنا لو فشل — سيبها pending عشان البلجن يحاول يبعتها
      // تاني، وبلّغ المستخدم إن في مشكلة
      console.error('فشل التحقق من الشراء مع الباك اند:', err);
    }
  }
}
