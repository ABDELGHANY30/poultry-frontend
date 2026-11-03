import { Injectable } from '@angular/core';
import {
  AdMob,
  AdMobBannerSize,
  AdMobRewardItem,
  BannerAdOptions,
  BannerAdPluginEvents,
  BannerAdPosition,
  BannerAdSize,
  InterstitialAdPluginEvents,
  RewardAdPluginEvents,
} from '@capacitor-community/admob';
import { environment } from '../../../environments/environment';

// الـ IDs الحقيقية من حساب AdMob (تطبيق Mazar3.ko)
const AD_UNITS = {
  banner: 'ca-app-pub-7829941409327460/6288043809',
  rewarded: 'ca-app-pub-7829941409327460/9305545265', // اتأكد إنها تابعة لـ Mazar3.ko
  interstitial: 'ca-app-pub-7829941409327460/9761431136',
  // rewardedInterstitial: 'ca-app-pub-7829941409327460/2885478708', // محفوظ لوقت تاني
};

// true = إعلانات تجريبية (للتطوير والاختبار المغلق)
// false = إعلانات حقيقية (غيّرها قبل النشر في الإنتاج)
const FORCE_TEST_ADS = true;

const isTesting = !environment.production || FORCE_TEST_ADS;

const RETRY_DELAY_MS = 15000;
const MAX_RETRIES = 3;
const INTERSTITIAL_COOLDOWN_MS = 3 * 60 * 1000; // 3 دقايق بين كل إعلانين

@Injectable({ providedIn: 'root' })
export class AdsService {
  private initialized = false;

  // Banner
  private bannerVisible = false;      // البانر معروض فعلاً (اتنده عليه showBanner ومتشالش)
  private bannerHiddenNative = false; // البانر مخفي دلوقتي على مستوى الـ native
  private keyboardOpen = false;       // الكيبورد مفتوح
  private pageHidden = false;         // الصفحة الحالية (زي المساعد الذكي) مش عايزة بانر

  // Rewarded
  private rewardedLoaded = false;
  private loadingRewarded = false;
  private retryCount = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  // Interstitial
  private interstitialLoaded = false;
  private loadingInterstitial = false;
  private lastInterstitialAt = 0;

  /** ينادَى مرة واحدة بس (من app.component.ts بعد ما الـ Splash يخلص) */
  async init() {
    if (this.initialized) return;

    try {
      await AdMob.initialize({
        initializeForTesting: isTesting,
      });
    } catch (e) {
      console.error('AdMob init failed', e);
      return;
    }

    this.initialized = true;

    // ظبط padding الواجهة حسب ارتفاع البانر الفعلي
    await AdMob.addListener(
      BannerAdPluginEvents.SizeChanged,
      (size: AdMobBannerSize) => {
        document.documentElement.style.setProperty(
          '--banner-height',
          `${size.height}px`
        );
      }
    );

    // لما المستخدم يقفل إعلان المكافأة، جهّز واحد جديد
    await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
      this.rewardedLoaded = false;
      this.retryCount = 0;
      this.preloadRewarded();
    });

    // لما المستخدم يقفل الإعلان البيني، جهّز واحد جديد
    await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
      this.interstitialLoaded = false;
      this.preloadInterstitial();
    });

    this.preloadRewarded();
    this.preloadInterstitial();
  }

  // ---------------- Banner ----------------

  /** يظهر بانر ثابت. نادِ عليه مرة واحدة بعد init(). */
  async showBanner(position: 'top' | 'bottom' = 'bottom') {
    if (!this.initialized) return;

    const options: BannerAdOptions = {
      adId: AD_UNITS.banner,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position:
        position === 'top'
          ? BannerAdPosition.TOP_CENTER
          : BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting,
    };

    try {
      await AdMob.showBanner(options);
      this.bannerVisible = true;
      this.bannerHiddenNative = false;
      await this.syncBanner(); // لو الصفحة الحالية أو الكيبورد مانعين البانر، يتخفى فوراً
    } catch (e) {
      console.error('showBanner failed', e);
    }
  }

  async hideBanner() {
    try {
      await AdMob.hideBanner();
    } catch {}
    this.bannerVisible = false;
    this.bannerHiddenNative = false;
    document.documentElement.style.setProperty('--banner-height', '0px');
  }

  async removeBanner() {
    try {
      await AdMob.removeBanner();
    } catch {}
    this.bannerVisible = false;
    this.bannerHiddenNative = false;
    document.documentElement.style.setProperty('--banner-height', '0px');
  }

  /** يخفي البانر مؤقتاً لما الكيبورد يفتح. */
  async suspendBanner() {
    this.keyboardOpen = true;
    await this.syncBanner();
  }

  /** يرجّع البانر لما الكيبورد يقفل (لو الصفحة الحالية تسمح). */
  async resumeBanner() {
    this.keyboardOpen = false;
    await this.syncBanner();
  }

  /** نادِ عليها من أي صفحة مش عايز فيها بانر (مثلاً في ngOnInit). */
  async hideBannerForPage() {
    this.pageHidden = true;
    await this.syncBanner();
  }

  /** نادِ عليها لما تسيب الصفحة دي (مثلاً في ngOnDestroy) عشان البانر يرجع. */
  async showBannerForPage() {
    this.pageHidden = false;
    await this.syncBanner();
  }

  /** يطابق حالة البانر الفعلية مع اللي مفروض يكون (معروض، مفيش كيبورد، والصفحة تسمح). */
  private async syncBanner() {
    if (!this.bannerVisible) return;

    const shouldShow = !this.pageHidden && !this.keyboardOpen;

    if (shouldShow && this.bannerHiddenNative) {
      this.bannerHiddenNative = false;
      try {
        await AdMob.resumeBanner(); // بيطلق SizeChanged فالـ padding بيرجع تلقائياً
      } catch {}
    } else if (!shouldShow && !this.bannerHiddenNative) {
      this.bannerHiddenNative = true;
      try {
        await AdMob.hideBanner();
      } catch {}
      document.documentElement.style.setProperty('--banner-height', '0px');
    }
  }

  // ---------------- Interstitial ----------------

  private async preloadInterstitial() {
    if (!this.initialized || this.loadingInterstitial || this.interstitialLoaded) return;

    this.loadingInterstitial = true;
    try {
      await AdMob.prepareInterstitial({
        adId: AD_UNITS.interstitial,
        isTesting,
      });
      this.interstitialLoaded = true;
    } catch {
      this.interstitialLoaded = false;
    } finally {
      this.loadingInterstitial = false;
    }
  }

  /**
   * نادِ عليها في فاصل طبيعي (بعد حفظ بيانات أو الخروج من شاشة).
   * مش هتظهر لو لسه ما عدّاش 3 دقايق على آخر إعلان، أو لو الإعلان مش جاهز.
   * ما تناديهاش وقت ما المستخدم بيكتب أو بيدخل بيانات.
   */
  async showInterstitial(): Promise<boolean> {
    if (!this.initialized) return false;

    if (Date.now() - this.lastInterstitialAt < INTERSTITIAL_COOLDOWN_MS) return false;

    if (!this.interstitialLoaded) {
      this.preloadInterstitial();
      return false;
    }

    try {
      await AdMob.showInterstitial();
      this.lastInterstitialAt = Date.now();
      return true;
    } catch (e) {
      console.error('showInterstitial failed', e);
      this.interstitialLoaded = false;
      this.preloadInterstitial();
      return false;
    }
  }

  // ---------------- Rewarded ----------------

  private async preloadRewarded() {
    if (!this.initialized || this.loadingRewarded || this.rewardedLoaded) return;

    this.loadingRewarded = true;
    try {
      await AdMob.prepareRewardVideoAd({
        adId: AD_UNITS.rewarded,
        isTesting,
      });
      this.rewardedLoaded = true;
      this.retryCount = 0;
    } catch {
      this.rewardedLoaded = false;
      this.scheduleRetry();
    } finally {
      this.loadingRewarded = false;
    }
  }

  private scheduleRetry() {
    if (this.retryCount >= MAX_RETRIES || this.retryTimer) return;

    this.retryCount++;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.preloadRewarded();
    }, RETRY_DELAY_MS);
  }

  /** هل إعلان المكافأة جاهز للعرض؟ (مفيد لإظهار/إخفاء الزرار) */
  isRewardedReady(): boolean {
    return this.rewardedLoaded;
  }

  /**
   * يعرض إعلان مكافأة.
   * - الحد اليومي (3 مرات) وإضافة الكريديت نفسها لازم يتعملوا في الباك إند.
   * - بيرجع الـ reward لو المستخدم كمّل الإعلان، أو null لو قفله بدري أو مش جاهز.
   */
  async showRewarded(): Promise<AdMobRewardItem | null> {
    if (!this.rewardedLoaded) {
      this.retryCount = 0;
      this.preloadRewarded();
      return null;
    }

    return new Promise<AdMobRewardItem | null>(async (resolve) => {
      let earned: AdMobRewardItem | null = null;
      let done = false;

      const rewardHandle = await AdMob.addListener(
        RewardAdPluginEvents.Rewarded,
        (reward) => {
          earned = reward;
        }
      );

      const dismissHandle = await AdMob.addListener(
        RewardAdPluginEvents.Dismissed,
        () => finish(earned)
      );

      const finish = (result: AdMobRewardItem | null) => {
        if (done) return;
        done = true;
        rewardHandle.remove();
        dismissHandle.remove();
        resolve(result);
      };

      try {
        await AdMob.showRewardVideoAd();
      } catch {
        this.rewardedLoaded = false;
        finish(null);
        this.preloadRewarded();
      }
    });
  }
}