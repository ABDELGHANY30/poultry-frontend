import { Injectable } from '@angular/core';
import {
  AdMob,
  BannerAdOptions,
  BannerAdPosition,
  BannerAdSize,
  AdMobRewardItem,
  RewardAdPluginEvents,
} from '@capacitor-community/admob';

// ✅ الـ IDs الحقيقية بتاعتك من حساب AdMob
const AD_UNITS = {
  banner: 'ca-app-pub-7829941409327460/8790539946',
  rewarded: 'ca-app-pub-7829941409327460/9305545265',
};

@Injectable({ providedIn: 'root' })
export class AdsService {
  private initialized = false;
  private rewardedLoaded = false;

  /** ينادَى مرة واحدة بس عند بدء التطبيق (مثلاً في app.component.ts) */
  async init() {
    if (this.initialized) return;

    await AdMob.initialize({
      initializeForTesting: !environmentIsProduction(),
    });

    this.initialized = true;

    this.preloadRewarded();

    AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
      this.rewardedLoaded = false;
      this.preloadRewarded(); // جهّز واحد جديد فورًا للمرة الجاية
    });
  }

  // ---------------- Banner ----------------

  /** يظهر بانر ثابت. نادِ عليه في الصفحات اللي عايز البانر يبان فيها. */
  async showBanner(position: 'top' | 'bottom' = 'bottom') {
    const options: BannerAdOptions = {
      adId: AD_UNITS.banner,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: position === 'top' ? BannerAdPosition.TOP_CENTER : BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: !environmentIsProduction(),
    };
    await AdMob.showBanner(options);
  }

  async hideBanner() {
    await AdMob.hideBanner();
  }

  async removeBanner() {
    await AdMob.removeBanner();
  }

  // ---------------- Rewarded ----------------

  private async preloadRewarded() {
    try {
      await AdMob.prepareRewardVideoAd({
        adId: AD_UNITS.rewarded,
        isTesting: !environmentIsProduction(),
      });
      this.rewardedLoaded = true;
    } catch {
      this.rewardedLoaded = false;
    }
  }

  /**
   * يعرض إعلان مكافأة (3 كريديت مقابل مشاهدة الفيديو).
   * الحد الأقصى اليومي (3 مرات) لازم يتفحص في الباك إند قبل ما تنادي الدالة دي،
   * مش هنا - AdMob مبيعرفش يفرض حدود استخدام.
   * بيرجع الـ reward لو المستخدم كمّل الإعلان، أو null لو قفله بدري أو مش جاهز.
   */
  async showRewarded(): Promise<AdMobRewardItem | null> {
    if (!this.rewardedLoaded) return null;

    return new Promise((resolve) => {
      const rewardListener = AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward) => {
        rewardListener.then((l) => l.remove());
        resolve(reward);
      });

      AdMob.showRewardVideoAd().catch(() => resolve(null));
    });
  }
}

// عدّل الدالة دي لتقرأ من environment.production بتاعك
function environmentIsProduction(): boolean {
  return false; // 🔴 خليها true في نسخة الإنتاج، أو اربطها بـ environment.ts
}
