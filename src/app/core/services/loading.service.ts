// loader.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoaderService {
  visible$ = new BehaviorSubject(true);
  progress$ = new BehaviorSubject(0);

  private pending = 0;
  private timer: any = null;       // مؤقت تحريك الشريط
  private hideTimer: any = null;   // مؤقت الإخفاء المؤجل

  /**
   * بعد ما آخر طلب يخلص بنستنى المدة دي قبل ما نخفي الشاشة. لو طلب جديد بدأ
   * خلالها (زي طلب الأسعار اللي بيبدأ بعد ما صفحة السوق تتحمّل) الشاشة بتفضل
   * ظاهرة. لو لسه بتختفي بدري، زوّد الرقم ده (مثلاً 800).
   */
  private readonly GRACE_MS = 500;
  private readonly FADE_MS = 200;

  start() {
    // أي إخفاء مؤجل لازم يتلغي أول ما يبدأ طلب جديد. الكود القديم ماكانش بيلغيه،
    // فكان الـ setTimeout القديم يخفي الشاشة والطلب الجديد لسه شغال.
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    if (this.pending++ === 0) {
      if (!this.timer) {
        // بداية جديدة فعلاً (مش استكمال لشاشة لسه في فترة الانتظار)
        this.progress$.next(0);
        this.timer = setInterval(() => {
          const p = this.progress$.value;
          this.progress$.next(p + (90 - p) * 0.06);
        }, 100);
      }
      this.visible$.next(true);
    }
  }

  stop() {
    if (--this.pending > 0) return;
    this.pending = 0;

    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => this.finish(), this.GRACE_MS);
  }

  private finish() {
    clearInterval(this.timer);
    this.timer = null;
    this.progress$.next(100);
    this.hideTimer = setTimeout(() => {
      this.visible$.next(false);
      this.hideTimer = null;
    }, this.FADE_MS);
  }
}