import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-subscription',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="max-w-2xl mx-auto px-4 py-10 font-[system-ui]">

    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-[28px] leading-tight font-bold text-stone-800 mb-1">
        {{ lang === 'ar' ? 'ارفع سقف قطيعك' : 'Raise your flock\\'s ceiling' }}
      </h1>
      <p class="text-stone-500 text-[15px]">
        {{ lang === 'ar' ? 'من أسئلة محدودة يومياً لمساعد بيتابعك على مدار الساعة' : 'From a daily question limit to round-the-clock guidance' }}
      </p>
    </div>

    <!-- Current status strip -->
    <div *ngIf="status()" class="flex items-center justify-between border-b border-stone-200 pb-4 mb-8">
      <div class="flex items-baseline gap-2">
        <span class="text-2xl">{{ status()?.is_pro ? '🌾' : '🐣' }}</span>
        <div>
          <p class="text-sm text-stone-400">{{ lang === 'ar' ? 'خطتك الحالية' : 'Your plan' }}</p>
          <p class="font-semibold text-stone-800">
            {{ planLabel() }}
            <span *ngIf="status()?.is_pro && status()?.plan_expires_at" class="text-stone-400 font-normal text-sm">
              — {{ lang === 'ar' ? 'حتى' : 'until' }} {{ status()?.plan_expires_at | date:'d MMM' }}
            </span>
          </p>
        </div>
      </div>
      <div class="text-right">
        <p class="text-2xl font-bold text-stone-800 tabular-nums">
          {{ status()?.remaining }}<span class="text-stone-300">/{{ status()?.daily_limit === 999999 ? '∞' : status()?.daily_limit }}</span>
        </p>
        <p class="text-xs text-stone-400">{{ lang === 'ar' ? 'نقطة متبقية اليوم' : 'points left today' }}</p>
      </div>
    </div>

    <p *ngIf="errorMessage()" class="bg-red-50 text-red-700 text-sm text-center py-2.5 rounded-lg mb-6">
      {{ errorMessage() }}
    </p>

    <!-- التطبيق (Capacitor) مينفعش يدير عملية دفع خارج Google Play Billing —
         بنكتفي بمعلومة بسيطة وليها بس، من غير ما التطبيق يبدأ أي عملية
         دفع بنفسه -->
    <div *ngIf="isNative && !status()?.is_pro" class="bg-stone-100 rounded-xl px-4 py-3 mb-6 text-sm text-stone-600">
      {{ lang === 'ar'
        ? 'للاشتراك، افتح موقعنا من متصفحك وادفع من هناك (فوري / إنستاباي / بطاقة). '
        : 'To subscribe, open our website in your browser and pay there (Fawry / InstaPay / card). ' }}
      <a (click)="openWebsite()" class="text-emerald-700 font-semibold underline cursor-pointer">
        {{ lang === 'ar' ? 'افتح الموقع' : 'Open website' }}
      </a>
    </div>

    <!-- Plans -->
    <div class="space-y-3">

      <!-- Free -->
      <div class="flex items-center justify-between border border-stone-200 rounded-xl px-5 py-4"
           [class.bg-stone-50]="!status()?.is_pro">
        <div>
          <p class="font-semibold text-stone-700">{{ lang === 'ar' ? 'مجانية' : 'Free' }}</p>
          <p class="text-sm text-stone-400">{{ lang === 'ar' ? '10 نقاط كل يوم' : '10 points per day' }}</p>
        </div>
        <span *ngIf="!status()?.is_pro" class="text-xs font-semibold text-stone-500 bg-stone-200 px-2.5 py-1 rounded-full">
          {{ lang === 'ar' ? 'الحالية' : 'Current' }}
        </span>
      </div>

      <!-- Pro tiers: p150 / p200 / p350 -->
      <div *ngFor="let p of tiers" class="relative border-2 rounded-xl px-5 py-4 flex items-center justify-between"
           [class.border-emerald-600]="!isCurrentPlan(p.id)"
           [class.border-emerald-700]="isCurrentPlan(p.id)"
           [class.bg-emerald-50]="isCurrentPlan(p.id)">
        <div>
          <p class="font-semibold text-stone-800">
            {{ p.label[lang] }}
            <span class="text-emerald-700 font-bold ms-1">{{ p.price }} {{ lang === 'ar' ? 'ج.م' : 'EGP' }}</span>
          </p>
          <p class="text-sm text-stone-500">
            {{ lang === 'ar' ? p.points + ' نقطة يومياً — أسئلة نصية 1 نقطة، اتخاذ قرار 2، تحليل صورة 4' : p.points + ' points/day — text Q&A 1pt, decisions 2pt, image analysis 4pt' }}
          </p>
        </div>
        <button
          *ngIf="!isCurrentPlan(p.id) && !isNative"
          (click)="subscribe(p.id)"
          [disabled]="loadingPlan() === p.id"
          class="shrink-0 bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-emerald-800 transition disabled:opacity-50">
          {{ loadingPlan() === p.id ? '…' : (lang === 'ar' ? 'اشترك' : 'Subscribe') }}
        </button>
        <span *ngIf="isCurrentPlan(p.id)" class="shrink-0 text-xs font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
          {{ lang === 'ar' ? 'الحالية' : 'Current' }}
        </span>
      </div>

    </div>
  </div>
  `
})
export class SubscriptionComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  lang = localStorage.getItem('lang') ?? 'ar';
  loadingPlan = signal<string | null>(null);
  status = signal<any>(null);
  errorMessage = signal<string | null>(null);
  isNative = Capacitor.isNativePlatform();

  // الأسعار والنقاط اليومية لكل باقة — لو غيّرت رقم هنا، لازم يتغيّر
  // نفس الرقم في credites.py (DAILY_CREDITS) وpay.py (PLANS) في الباك اند
  tiers: { id: string; price: number; points: number; label: Record<string, string> }[] = [
    { id: 'p150', price: 150, points: 30, label: { ar: 'باقة 150', en: 'Package 150' } },
    { id: 'p200', price: 200, points: 45, label: { ar: 'باقة 200', en: 'Package 200' } },
    { id: 'p350', price: 350, points: 100, label: { ar: 'باقة 350', en: 'Package 350' } },
  ];

  // بس بيفتح الموقع من برا — التطبيق مش بيبدأ ولا بيدير أي عملية دفع؛
  // المستخدم نفسه هو اللي بيكمل الاشتراك من الموقع بمحض إرادته، زي ما
  // اتفقنا (الفرق ده هو اللي بيخلي الأمر مقبول في سياسة Google Play)
  openWebsite() {
    Browser.open({ url: environment.websiteUrl + '/subscription' });
  }

  ngOnInit() {
    this.loadStatus();
    this.errorMessage.set(null); // مسح أي رسالة خطأ قديمة قبل ما نتشيك من جديد

    // لما Paymob يرجّع المستخدم من صفحة الدفع (نجاح أو فشل)، بيحط
    // query params على نفس الرابط. نستخدمها بس عشان نعمل refresh
    // للحالة ونوري رسالة مناسبة — التفعيل الفعلي بيحصل من الـ webhook
    // في الباك اند، مش من هنا (مينفعش نثق في القيم دي وحدها).
    const params = this.route.snapshot.queryParamMap;
    if (params.has('success') || params.has('payment_status')) {
      this.loadStatus();
      if (params.get('success') === 'true' || params.get('payment_status') === 'success') {
        this.errorMessage.set(null);
      } else {
        this.errorMessage.set(
          this.lang === 'ar'
            ? 'لم تكتمل عملية الدفع، حاول مرة أخرى'
            : 'Payment was not completed, please try again'
        );
      }
      // بنمسح الـ query params عن طريق Router نفسه (مش window.history
      // مباشرة) عشان حالة الـ Router جوه Angular تتحدث هي كمان — لو
      // عدّلنا الرابط من غيره، Angular ممكن يرجّع نفس الـ params دي تاني
      // لما تتنقل بعيد عن الصفحة وترجعلها تاني (السبب الأرجح للمشكلة
      // اللي كانت بتحصل).
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        replaceUrl: true,
      });
    }
  }

  // بيتأكد إن الباقة دي هي الفعلية بالظبط (p150/p200/p350)، مش بس
  // "المستخدم Pro" — عشان لو مشترك في باقة معينة، الباقات التانية تفضل
  // توري زرار "اشترك" بدل ما تتعامل معاه كأنه مشترك فيها هو كمان
  isCurrentPlan(tierId: string): boolean {
    return !!this.status()?.is_pro && this.status()?.billing_period === tierId;
  }

  planLabel(): string {
    const s = this.status();
    if (!s?.is_pro) return this.lang === 'ar' ? 'مجانية' : 'Free';
    const tier = this.tiers.find(t => t.id === s.billing_period);
    return tier ? tier.label[this.lang] : (this.lang === 'ar' ? 'Pro' : 'Pro');
  }

  loadStatus() {
    this.http.get(`${environment.apiUrl}/payment/status`).subscribe({
      next: (res: any) => this.status.set(res),
      error: () => {}
    });
  }

  async subscribe(plan: string) {
    this.loadingPlan.set(plan);
    this.errorMessage.set(null);

    // الباك اند بيسجل الطلب عند Paymob (بربطه بحساب المستخدم ده) ويرجّع
    // رابط دفع (payment_url) مخصص للمستخدم والمبلغ ده تحديداً.
    // التفعيل الفعلي للاشتراك بيحصل لاحقاً عن طريق webhook من Paymob
    // للباك اند (/payment/paymob-webhook) بعد نجاح الدفع فعلياً —
    // مش من هنا، عشان محدش يقدر يفعّل نفسه من غير ما يدفع فعلاً.
    //
    // الدالة دي بقت خاصة بنسخة الموقع بس (isNative بيخفي زرار الاشتراك
    // خالص جوه التطبيق) — التطبيق نفسه مبيبدأش ولا بيدير أي عملية دفع.
    this.http.post(`${environment.apiUrl}/payment/create-paymob`, { plan }).subscribe({
      next: (res: any) => {
        const paymentUrl = res.payment_url;
        if (!paymentUrl) {
          this.loadingPlan.set(null);
          this.errorMessage.set(this.lang === 'ar' ? 'حدث خطأ، حاول مرة أخرى' : 'Error, please try again');
          return;
        }
        window.location.href = paymentUrl;
        this.loadingPlan.set(null);
      },
      error: (err) => {
        this.loadingPlan.set(null);
        this.errorMessage.set(this.lang === 'ar' ? 'حدث خطأ، حاول مرة أخرى' : 'Error, please try again');
      }
    });
  }
}
