/**
 * ⚠️ يحتاج تركيب: npm install @capacitor/share && npx cap sync android
 * (ده plugin رسمي من Capacitor نفسها، مش زي cordova-plugin-purchase —
 * بيتحمّل بـ import عادي زي أي مكتبة تانية، مفيهوش مشكلة الـ native bridge)
 */
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Share } from '@capacitor/share';
import { Clipboard } from '@capacitor/clipboard'; // npm install @capacitor/clipboard
import { ReferralService } from '../../core/services/referral.service'; // ⚠️ عدّل المسار

const APP_STORE_LINK = 'https://play.google.com/store/apps/details?id=com.yourcompany.yourapp'; // ⚠️ عدّله بعد النشر

@Component({
  selector: 'app-referral-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (referralService.stats(); as s) {
      <div class="rounded-2xl p-4 bg-emerald-50 border border-emerald-200">
        <p class="font-black text-emerald-900 mb-1">ادعُ صديق، وخد 10 كريدت هدية 🎁</p>
        <p class="text-xs text-emerald-700 mb-3">
          صاحبك بياخد 10 كريدت هدية كمان — كل واحد فيكم مكسبان
        </p>

        <div class="flex items-center gap-2 mb-3">
          <code class="flex-1 bg-white rounded-lg px-3 py-2 font-mono font-bold text-center">
            {{ s.referral_code }}
          </code>
          <button (click)="copyCode(s.referral_code)" class="p-2 rounded-lg bg-white border">
            📋
          </button>
        </div>

        <button (click)="share(s.referral_code)" class="w-full rounded-xl bg-emerald-500 text-white font-bold py-3">
          شارك مع الأصدقاء
        </button>

        @if (shareError()) {
          <p class="text-xs text-red-600 mt-2 text-center">
            ⚠️ {{ shareError() }} — انسخ الكود بالزرار 📋 وابعته يدويًا لحد ما نحل المشكلة
          </p>
        }

        @if (s.total_referred > 0) {
          <p class="text-xs text-emerald-700 mt-2 text-center">
            جبت {{ s.total_referred }} {{ s.total_referred === 1 ? 'صديق' : 'أصدقاء' }} لحد دلوقتي 🎉
          </p>
        }

        @if (copied()) {
          <p class="text-xs text-center mt-2">اتنسخ ✅</p>
        }
      </div>
    }
  `,
})
export class ReferralCardComponent implements OnInit {
  referralService = inject(ReferralService);
  copied = signal(false);
  shareError = signal<string | null>(null);

  async ngOnInit() {
    await this.referralService.refresh();
  }

  async share(code: string) {
    this.shareError.set(null);
    const message = `جرب تطبيق [اسم تطبيقك] لإدارة مزرعتك بذكاء 🐔\nاستخدم كود الدعوة ده وهتاخد كريدت هدية: ${code}\n${APP_STORE_LINK}`;

    // 🔍 تشخيص: لو مش شغال، افتح الـ console (أو logcat لو على موبايل حقيقي)
    // وشوف السطر ده — بيوريك بالظبط هو شغال جوه تطبيق حقيقي (native) ولا
    // جوه متصفح عادي (web)، وده بيفرق مع Web Share API
    console.log('[Referral Share] isNativePlatform:', (window as any).Capacitor?.isNativePlatform?.());

    try {
      await Share.share({
        title: 'ادعُ صديق',
        text: message,
        dialogTitle: 'شارك مع الأصدقاء',
      });
    } catch (err: any) {
      // ⚠️ المستخدم لما يقفل شاشة المشاركة من غير ما يختار، برضو بيرمي error
      // شكله زي الفشل الحقيقي — مفيش طريقة موثوقة نفرّق بيهم من غير فحص
      // رسالة الخطأ نفسها. بنعرضه للمستخدم بدل ما نبلعه، عشان لو فيه مشكلة
      // حقيقية (Share plugin مش متسجل، مثلاً) تبان بدل ما تختفي بصمت.
      console.error('[Referral Share] فشلت المشاركة:', err);
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('cancel')) {
        return; // ✅ المستخدم قفل الشاشة بنفسه — ده مش خطأ، متعرضش رسالة
      }
      this.shareError.set(
        msg.includes('not implemented') || msg.includes('not available')
          ? 'المشاركة مش متاحة في البيئة دي (جرّب من التطبيق نفسه على الموبايل، مش من المتصفح)'
          : 'حصل خطأ أثناء فتح شاشة المشاركة'
      );
    }
  }

  async copyCode(code: string) {
    try {
      await Clipboard.write({ string: code });
    } catch {
      // ⚠️ Fallback لو @capacitor/clipboard مش شغال لأي سبب (مثلاً بره تطبيق native)
      await navigator.clipboard?.writeText(code).catch(() => {});
    }
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }
}
