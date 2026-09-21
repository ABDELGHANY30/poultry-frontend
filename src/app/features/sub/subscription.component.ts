import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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
        <p class="text-xs text-stone-400">{{ lang === 'ar' ? 'سؤال متبقي اليوم' : 'questions left today' }}</p>
      </div>
    </div>

    <p *ngIf="errorMessage()" class="bg-red-50 text-red-700 text-sm text-center py-2.5 rounded-lg mb-6">
      {{ errorMessage() }}
    </p>

    <!-- Plans -->
    <div class="space-y-3">

      <!-- Free -->
      <div class="flex items-center justify-between border border-stone-200 rounded-xl px-5 py-4"
           [class.bg-stone-50]="!status()?.is_pro">
        <div>
          <p class="font-semibold text-stone-700">{{ lang === 'ar' ? 'مجانية' : 'Free' }}</p>
          <p class="text-sm text-stone-400">{{ lang === 'ar' ? '10 أسئلة كل يوم' : '10 questions per day' }}</p>
        </div>
        <span *ngIf="!status()?.is_pro" class="text-xs font-semibold text-stone-500 bg-stone-200 px-2.5 py-1 rounded-full">
          {{ lang === 'ar' ? 'الحالية' : 'Current' }}
        </span>
      </div>

      <!-- Pro Monthly -->
      <div class="relative border-2 rounded-xl px-5 py-4 flex items-center justify-between"
           [class.border-emerald-600]="!isCurrentPlan('monthly')"
           [class.border-emerald-700]="isCurrentPlan('monthly')"
           [class.bg-emerald-50]="isCurrentPlan('monthly')">
        <div>
          <p class="font-semibold text-stone-800">
            {{ lang === 'ar' ? 'شهري' : 'Monthly' }}
            <span class="text-emerald-700 font-bold ms-1">150 {{ lang === 'ar' ? 'ج.م' : 'EGP' }}</span>
          </p>
          <p class="text-sm text-stone-500">{{ lang === 'ar' ? 'أسئلة وصور بلا حد، تقارير متقدمة' : 'Unlimited Q&A and images, advanced reports' }}</p>
        </div>
        <button
          *ngIf="!isCurrentPlan('monthly')"
          (click)="subscribe('pro_monthly')"
          [disabled]="loading()"
          class="shrink-0 bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-emerald-800 transition disabled:opacity-50">
          {{ loading() ? '…' : (lang === 'ar' ? 'اشترك' : 'Subscribe') }}
        </button>
        <span *ngIf="isCurrentPlan('monthly')" class="shrink-0 text-xs font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
          {{ lang === 'ar' ? 'الحالية' : 'Current' }}
        </span>
      </div>

      <!-- Pro Yearly -->
      <div class="relative border-2 rounded-xl px-5 py-4 flex items-center justify-between"
           [class.border-amber-500]="!isCurrentPlan('yearly')"
           [class.border-amber-600]="isCurrentPlan('yearly')"
           [class.bg-amber-50]="isCurrentPlan('yearly')">
        <div class="absolute -top-2.5 left-5 bg-amber-500 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">
          {{ lang === 'ar' ? 'وفّر 800 ج.م' : 'Save 800 EGP' }}
        </div>
        <div class="pt-1.5">
          <p class="font-semibold text-stone-800">
            {{ lang === 'ar' ? 'سنوي' : 'Yearly' }}
            <span class="text-amber-700 font-bold ms-1">1000 {{ lang === 'ar' ? 'ج.م' : 'EGP' }}</span>
          </p>
          <p class="text-sm text-stone-500">{{ lang === 'ar' ? 'كل مميزات الشهري، بأقل تكلفة شهرياً' : 'Everything in monthly, at a lower monthly cost' }}</p>
        </div>
        <button
          *ngIf="!isCurrentPlan('yearly')"
          (click)="subscribe('pro_yearly')"
          [disabled]="loading()"
          class="shrink-0 bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-amber-700 transition disabled:opacity-50">
          {{ loading() ? '…' : (lang === 'ar' ? 'اشترك' : 'Subscribe') }}
        </button>
        <span *ngIf="isCurrentPlan('yearly')" class="shrink-0 text-xs font-semibold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full">
          {{ lang === 'ar' ? 'الحالية' : 'Current' }}
        </span>
      </div>

    </div>
  </div>
  `
})
export class SubscriptionComponent implements OnInit {
  private http = inject(HttpClient);
  lang = localStorage.getItem('lang') ?? 'ar';
  loading = signal(false);
  status = signal<any>(null);
  errorMessage = signal<string | null>(null);

  ngOnInit() {
    this.loadStatus();

    // لما Paymob يرجّع المستخدم من صفحة الدفع (نجاح أو فشل)، بيحط
    // query params على نفس الرابط. نستخدمها بس عشان نعمل refresh
    // للحالة ونوري رسالة مناسبة — التفعيل الفعلي بيحصل من الـ webhook
    // في الباك اند، مش من هنا (مينفعش نثق في القيم دي وحدها).
    const params = new URLSearchParams(window.location.search);
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
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  // بيتأكد إن الخطة دي هي الفعلية بالظبط (شهري/سنوي)، مش بس "المستخدم Pro"
  // — عشان لو المستخدم مشترك شهري، الكارت السنوي يفضل يوري زرار "اشترك"
  // بدل ما يتعامل معاه كأنه مشترك فيه هو كمان
  isCurrentPlan(period: 'monthly' | 'yearly'): boolean {
    return !!this.status()?.is_pro && this.status()?.billing_period === period;
  }

  planLabel(): string {
    const s = this.status();
    if (!s?.is_pro) return this.lang === 'ar' ? 'مجانية' : 'Free';
    if (s.billing_period === 'yearly') return this.lang === 'ar' ? 'Pro سنوي' : 'Pro Yearly';
    return this.lang === 'ar' ? 'Pro شهري' : 'Pro Monthly';
  }

  loadStatus() {
    const token = localStorage.getItem('spa_token');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    this.http.get(`${environment.apiUrl}/payment/status`, { headers }).subscribe({
      next: (res: any) => this.status.set(res),
      error: () => {}
    });
  }

  async subscribe(plan: string) {
    this.loading.set(true);
    this.errorMessage.set(null);
    const token = localStorage.getItem('spa_token');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

    // الباك اند بيسجل الطلب عند Paymob (بربطه بحساب المستخدم ده) ويرجّع
    // رابط دفع (payment_url) مخصص للمستخدم والمبلغ ده تحديداً.
    // التفعيل الفعلي للاشتراك بيحصل لاحقاً عن طريق webhook من Paymob
    // للباك اند (/payment/paymob-webhook) بعد نجاح الدفع فعلياً —
    // مش من هنا، عشان محدش يقدر يفعّل نفسه من غير ما يدفع فعلاً.
    this.http.post(`${environment.apiUrl}/payment/create-paymob`, { plan }, { headers }).subscribe({
      next: async (res: any) => {
        this.loading.set(false);
        const paymentUrl = res.payment_url;
        if (!paymentUrl) {
          this.errorMessage.set(this.lang === 'ar' ? 'حدث خطأ، حاول مرة أخرى' : 'Error, please try again');
          return;
        }
        if (Capacitor.isNativePlatform()) {
          // جوه التطبيق (Android) — نفتح متصفح النظام الخارجي، مش WebView
          // جوه التطبيق، عشان نلتزم بسياسة Google بخصوص أي دفع خارج
          // Play Billing.
          await Browser.open({ url: paymentUrl });
        } else {
          // شغال كموقع في براوزر عادي — نروح مباشرة لصفحة الدفع
          window.location.href = paymentUrl;
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(this.lang === 'ar' ? 'حدث خطأ، حاول مرة أخرى' : 'Error, please try again');
      }
    });
  }
}
