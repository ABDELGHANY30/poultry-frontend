import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom, race, timer } from 'rxjs';
import { debounceTime, filter, map, take } from 'rxjs/operators';
import { App } from '@capacitor/app';
import {
  AdMob,
  AdMobBannerSize,
  AppOpenAdPluginEvents,
  AdMobRewardItem,
  BannerAdOptions,
  BannerAdPluginEvents,
  BannerAdPosition,
  BannerAdSize,
  InterstitialAdPluginEvents,
  RewardAdPluginEvents,
} from '@capacitor-community/admob';
import { environment } from '../../../environments/environment';
import { LoaderService } from './loading.service';

// الـ IDs الحقيقية من حساب AdMob (تطبيق MAZAR3.KO)
const AD_UNITS = {
  banner: 'ca-app-pub-7829941409327460/9262741257',
  rewarded: 'ca-app-pub-7829941409327460/9124954549',
  interstitial: 'ca-app-pub-7829941409327460/7259394440',
  appOpen: 'ca-app-pub-7829941409327460/8853491807',
  // rewardedInterstitial: 'ca-app-pub-7829941409327460/2885478708', // محفوظ لوقت تاني
};

// true = إعلانات تجريبية (للتطوير والاختبار المغلق)
// false = إعلانات حقيقية (الإنتاج)
const FORCE_TEST_ADS = false;

// Device ID بتاع موبايلك (أو موبايلاتك) عشان تشوف الإعلانات الحقيقية
// كإعلانات اختبار على جهازك بس، وتأمن من حظر الحساب بسبب الضغط بالغلط.
// الـ ID بيظهر في Logcat وقت تشغيل التطبيق (دوّر على: "Use RequestConfiguration.Builder().setTestDeviceIds")
const TESTING_DEVICES: string[] = [
  '92E27DA561817D30BBD5CFFE3EC6CF68',
];

const isTesting = !environment.production || FORCE_TEST_ADS;

const RETRY_DELAY_MS = 15000;
const MAX_RETRIES = 3;
const INTERSTITIAL_COOLDOWN_MS = 3 * 60 * 1000; // 3 دقايق بين كل إعلانين

// الآلة الحاسبة: يظهر إعلان بعد كل (N) عمليات حساب. 1 = بعد كل عملية (مع احترام الـ cooldown).
const CALCULATOR_ADS_EVERY = 1;

// إعلان فتح التطبيق: لو المستخدم رجع للتطبيق بعد غياب أطول من الوقت ده يظهر إعلان
const APP_OPEN_MIN_AWAY_MS = 2 * 60 * 1000;
// أقل فاصل بين إعلان فتح التطبيق وأي إعلان ملء شاشة قبله
const APP_OPEN_COOLDOWN_MS = 3 * 60 * 1000;
// أقصى انتظار لتحميل الإعلان وقت فتح التطبيق (بعدها نتجاهله ومنعطلش المستخدم)
const APP_OPEN_WAIT_MS = 4000;
// إعلان فتح التطبيق مايظهرش غير بعد ما شاشة التحميل (loading screen) تختفي ويفضل مختفي المدة دي
const LOADING_SETTLE_MS = 500;
// لو شاشة التحميل ما خلصتش (أو مبعتتش حالة) بعد المدة دي، نكمّل عادي
const LOADING_MAX_WAIT_MS = 15000;

@Injectable({ providedIn: 'root' })
export class AdsService {
  private loader = inject(LoaderService);
  private loaderVisible = false;      // شاشة التحميل ظاهرة دلوقتي
  private initialized = false;

  // Banner
  private bannerVisible = false;      // البانر معروض فعلاً (اتنده عليه showBanner ومتشالش)
  private bannerHiddenNative = false; // البانر مخفي دلوقتي على مستوى الـ native
  private keyboardOpen = false;       // الكيبورد مفتوح
  private pageHidden = false;         // الصفحة الحالية (زي المساعد الذكي) مش عايزة بانر
  private pendingBanner: 'top' | 'bottom' | null = null; // showBanner اتنده عليه قبل ما init() يخلص

  // Rewarded
  private rewardedLoaded = false;
  private loadingRewarded = false;
  private retryCount = 0;
  private rewardUserId: string | null = null; // للتحقق من المكافأة من جهة السيرفر (SSV)
  private rewardLoadedUserId: string | null = null; // الـ userId اللي الإعلان الجاهز اتحمّل بيه
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  // Interstitial
  private interstitialLoaded = false;
  private loadingInterstitial = false;
  private lastInterstitialAt = 0;

  // App open
  private appOpenLoaded = false;
  private loadingAppOpen = false;
  private fullscreenAdActive = false; // إعلان ملء الشاشة شغال (عشان رجوع التطبيق منه ما يتحسبش فتح جديد)
  private hiddenAt = 0;

  // Calculator
  private calculatorUses = 0;

  /** ينادَى مرة واحدة بس (من app.component.ts بعد ما الـ Splash يخلص) */
  async init() {
    if (this.initialized) return;

    try {
      await AdMob.initialize({
        initializeForTesting: isTesting,
        testingDevices: TESTING_DEVICES,
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

    // تشخيص: سبب فشل البانر بيظهر في Logcat (دوّر على [AdMob]).
    // code 3 = No fill (مفيش إعلان متاح) | 1 = Invalid request (ID غلط/نوع غلط) | 2 = Network | 0 = Internal
    await AdMob.addListener(BannerAdPluginEvents.FailedToLoad, (err: any) => {
      console.error('[AdMob] banner failed to load', err?.code, err?.message);
    });
    await AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
      console.log('[AdMob] banner loaded');
    });

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

    // إعلان فتح التطبيق: بعد ما يتقفل أو يفشل عرضه، جهّز واحد جديد
    await AdMob.addListener(AppOpenAdPluginEvents.Closed, () => {
      this.appOpenLoaded = false;
      this.endFullscreenAd();
      this.preloadAppOpen();
    });
    await AdMob.addListener(AppOpenAdPluginEvents.FailedToShow, () => {
      this.appOpenLoaded = false;
      this.endFullscreenAd();
      this.preloadAppOpen();
    });
    await AdMob.addListener(AppOpenAdPluginEvents.FailedToLoad, (err: any) => {
      console.error('[AdMob] app open failed to load', err?.code, err?.message);
    });

    // نتابع حالة شاشة التحميل عشان إعلان فتح التطبيق مايظهرش فوقها
    this.loader.visible$.subscribe((v) => (this.loaderVisible = !!v));

    this.preloadRewarded();
    this.preloadInterstitial();
    this.preloadAppOpen();
    this.setupAppOpenAd();

    // لو حد نادى showBanner قبل ما init() يخلص، نعرضه دلوقتي
    if (this.pendingBanner) {
      const pos = this.pendingBanner;
      this.pendingBanner = null;
      await this.showBanner(pos);
    }
  }

  // ---------------- App Open ----------------

  private async preloadAppOpen() {
    if (!this.initialized || this.loadingAppOpen || this.appOpenLoaded) return;

    this.loadingAppOpen = true;
    try {
      await AdMob.loadAppOpen({ adId: AD_UNITS.appOpen });
      this.appOpenLoaded = true;
    } catch {
      this.appOpenLoaded = false;
    } finally {
      this.loadingAppOpen = false;
    }
  }

  /** إعلان عند أول فتح للتطبيق، وعند الرجوع من الخلفية بعد غياب أطول من دقيقتين. */
  private setupAppOpenAd() {
    // أول فتح: نستنى شاشة التحميل تخلص الأول
    this.showAppOpenAfterLoading();

    // الرجوع من الخلفية
    App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        // لو الخروج بسبب إعلان ملء شاشة ما نحسبهوش غياب
        this.hiddenAt = this.fullscreenAdActive ? 0 : Date.now();
        return;
      }
      const hiddenAt = this.hiddenAt;
      this.hiddenAt = 0;
      if (this.fullscreenAdActive || !hiddenAt) return;
      if (Date.now() - hiddenAt >= APP_OPEN_MIN_AWAY_MS) this.showAppOpenAfterLoading();
    });
  }

  /** يستنى شاشة التحميل تختفي (وتفضل مختفية LOADING_SETTLE_MS) وبعدين يعرض إعلان فتح التطبيق. */
  private async showAppOpenAfterLoading() {
    await this.waitForLoadingDone();
    await this.showAppOpenAd(true);
  }

  private waitForLoadingDone(): Promise<void> {
    const done$ = (this.loader.visible$ as Observable<boolean>).pipe(
      debounceTime(LOADING_SETTLE_MS), // لو التحميل بدأ تاني خلال الفترة دي، العد بيتصفّر
      filter((v) => !v),
      take(1),
      map(() => undefined)
    );
    const timeout$ = timer(LOADING_MAX_WAIT_MS).pipe(map(() => undefined));
    return firstValueFrom(race(done$, timeout$)).then(() => undefined);
  }

  private async showAppOpenAd(coldStart: boolean) {
    if (!this.initialized || this.fullscreenAdActive) return;
    if (Date.now() - this.lastInterstitialAt < APP_OPEN_COOLDOWN_MS) return;

    if (coldStart) {
      // استنى الإعلان يتحمّل شوية، ولو اتأخر نسيبه
      const start = Date.now();
      while (!this.appOpenLoaded && Date.now() - start < APP_OPEN_WAIT_MS) {
        await new Promise((r) => setTimeout(r, 250));
      }
    }

    if (!this.appOpenLoaded) {
      this.preloadAppOpen();
      return;
    }

    // أمان إضافي: لو شاشة التحميل ظهرت تاني في اللحظة دي، ماتعرضش الإعلان فوقها
    if (this.loaderVisible) return;

    this.fullscreenAdActive = true;
    try {
      await AdMob.showAppOpen();
      this.lastInterstitialAt = Date.now(); // الإعلانات البينية تحترم الفاصل بعده
    } catch (e) {
      console.error('showAppOpen failed', e);
      this.appOpenLoaded = false;
      this.endFullscreenAd();
      this.preloadAppOpen();
    }
    // لو اتعرض، علامة fullscreenAdActive بتتصفّر من حدث Closed
  }

  // ---------------- Banner ----------------

  /** يظهر بانر ثابت. نادِ عليه مرة واحدة بعد init(). */
  async showBanner(position: 'top' | 'bottom' = 'bottom') {
    if (!this.initialized) {
      // قبل كده كان بيرجع هنا من غير أي رسالة والبانر مايظهرش أبداً لو اتنده عليه بدري
      this.pendingBanner = position;
      return;
    }

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

    this.fullscreenAdActive = true;
    try {
      await AdMob.showInterstitial();
      this.lastInterstitialAt = Date.now();
      return true;
    } catch (e) {
      console.error('showInterstitial failed', e);
      this.interstitialLoaded = false;
      this.preloadInterstitial();
      return false;
    } finally {
      this.endFullscreenAd();
    }
  }

  /** بنأخّر تصفير العلامة شوية عشان حدث visibilitychange بتاع قفل الإعلان ما يتحسبش رجوع للتطبيق. */
  private endFullscreenAd() {
    setTimeout(() => { this.fullscreenAdActive = false; }, 1500);
  }

  // ---------------- Calculator ----------------

  /**
   * نادِ عليها لما المستخدم يضغط زرار "احسب" (بعد ما النتيجة تظهر).
   * بتعرض إعلان بيني كل CALCULATOR_ADS_EVERY عملية، وبتحترم الـ cooldown (3 دقايق).
   * ما تناديهاش وقت الكتابة في الخانات.
   */
  async onCalculatorUsed(): Promise<boolean> {
    this.calculatorUses++;
    if (this.calculatorUses % CALCULATOR_ADS_EVERY !== 0) return false;
    return this.showInterstitial();
  }

  // ---------------- Rewarded ----------------

  private async preloadRewarded() {
    if (!this.initialized || this.loadingRewarded || this.rewardedLoaded) return;

    this.loadingRewarded = true;
    const userId = this.rewardUserId;
    try {
      await AdMob.prepareRewardVideoAd({
        adId: AD_UNITS.rewarded,
        isTesting,
        ...(userId ? { ssv: { userId } } : {}),
      });
      this.rewardedLoaded = true;
      this.rewardLoadedUserId = userId;
      this.retryCount = 0;
    } catch {
      this.rewardedLoaded = false;
      this.scheduleRetry();
    } finally {
      this.loadingRewarded = false;
      // لو الـ userId اتحدد وإحنا بنحمّل، الإعلان الجاهز مش مربوط بيه فالتحقق (SSV) هيفشل → أعد التحميل
      if (this.rewardedLoaded && this.rewardUserId !== this.rewardLoadedUserId) {
        this.rewardedLoaded = false;
        this.preloadRewarded();
      }
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

  /** بيحدد المستخدم اللي هيتبعت لجوجل مع الإعلان (SSV). لو اتغيّر بنعيد تحميل الإعلان. */
  setRewardUser(userId: string) {
    if (!userId || this.rewardUserId === userId) return;
    this.rewardUserId = userId;
    this.rewardedLoaded = false;
    this.preloadRewarded();
  }

  /** هل إعلان المكافأة جاهز للعرض؟ (مفيد لإظهار/إخفاء الزرار) */
  isRewardedReady(): boolean {
    return this.rewardedLoaded;
  }

  /**
   * يعرض إعلان مكافأة.
   * - الحد اليومي (3 فيديوهات) وإضافة الأسئلة نفسها بيتعملوا في الباك إند (credites.py).
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

      this.fullscreenAdActive = true;
      try {
        await AdMob.showRewardVideoAd();
      } catch {
        this.rewardedLoaded = false;
        finish(null);
        this.preloadRewarded();
      } finally {
        this.endFullscreenAd();
      }
    });
  }
}
