import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { environment } from '../../../environments/environment';
import { markFromApp } from '../../core/services/deep-link.service';

/**
 * 🆕 الدفع من التطبيق من غير تسجيل دخول تاني:
 * - المستخدم مسجّل دخول في التطبيق أصلاً، فالتطبيق بيطلب لينك الدفع من السيرفر بحسابه (?from_app=true)
 *   ويفتح صفحة دفع XPay (200 جنيه) مباشرة في المتصفح الداخلي. مفيش موقع ولا تسجيل دخول في النص.
 * - بعد الدفع صفحة النتيجة بتحوّله للتطبيق، والتطبيق بيتأكد من الدفع ويفعّل. ولو قفل المتصفح بنعيد فحص الحالة.
 * - الموقع: نفس الزرار بيفتح صفحة الدفع على طول.
 */
@Component({
  selector: 'app-merchant-fee',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <div class="page-wrapper">
    <div class="flex items-center gap-2 mb-4">
      <a routerLink="/market-hub" class="text-gray-400 text-xl">←</a>
      <h1 class="text-xl font-bold">{{ lang === 'ar' ? '🏪 حساب تاجر' : '🏪 Merchant account' }}</h1>
    </div>

    <div class="card text-center py-8 px-5">
      <div class="text-5xl mb-3">🏪</div>
      <h2 class="text-lg font-bold text-gray-800 mb-2">
        {{ lang === 'ar' ? 'فعّل حساب التاجر عشان تنشر إعلاناتك' : 'Activate your merchant account to post listings' }}
      </h2>
      <p class="text-sm text-gray-500 mb-1">
        {{ lang === 'ar' ? 'رسوم مرة واحدة فقط — مفيش اشتراك شهري' : 'One-time fee — no monthly subscription' }}
      </p>
      <p class="text-3xl font-black text-emerald-700 my-4">
        {{ fee() }} {{ lang === 'ar' ? 'جنيه' : 'EGP' }}
      </p>

      <div *ngIf="errorMsg()" class="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-3">{{ errorMsg() }}</div>

      <p class="text-[11px] text-gray-400 leading-relaxed mb-3">
        ⚠️ {{ lang === 'ar' ? 'التطبيق والموقع منصة لعرض الإعلانات والتواصل فقط، وغير مسؤولين عن أي عمليات بيع أو شراء بين المستخدمين. تأكد من البائع والمنتج قبل أي تحويل أو استلام.' : 'This app and website only list ads and connect users, and are not responsible for any sale or purchase between users. Check the seller and the product before any transfer or handover.' }}
      </p>

      <button (click)="pay()" [disabled]="loading()" class="btn-primary btn w-full">
        {{ loading() ? '...' : (lang === 'ar' ? '💳 ادفع الآن' : '💳 Pay now') }}
      </button>
    </div>
  </div>
  `
})
export class MerchantFeeComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  lang = localStorage.getItem('lang') ?? 'ar';
  isNative = Capacitor.isNativePlatform();
  fee = signal(200);
  loading = signal(false);
  errorMsg = signal('');
  returnTo = '/marketplace/add-listing';


  ngOnInit() {
    const qp = this.route.snapshot.queryParamMap;
    this.returnTo = qp.get('returnTo') || this.returnTo;

    // الموقع: جاي من التطبيق -> نفتكر ده قبل أي redirect (مثلاً لتسجيل الدخول)
    if (!this.isNative && qp.get('from') === 'app') markFromApp();

    this.loadStatus();
  }

  private loadStatus() {
    this.http.get<any>(`${environment.apiUrl}/marketplace-payments/merchant/status`)
      .subscribe({
        next: (res) => {
          this.fee.set(res.fee_egp ?? 200);
          if (!res.identity_verified) {
            this.router.navigate(['/verify-identity'], { queryParams: { returnTo: this.returnTo } });
          } else if (res.is_merchant) {
            this.router.navigate([this.returnTo]); // تاجر بالفعل -> مفيش دفع تاني
          }
        },
        error: (err) => {
          if (err?.status === 401) this.router.navigate(['/auth/login'], { queryParams: { returnTo: '/merchant-fee' } });
          else this.errorMsg.set(this.lang === 'ar' ? 'تعذر تحميل حالة الحساب، حاول مرة أخرى' : 'Could not load account status');
        },
      });
  }

  pay() {
    this.loading.set(true);
    this.errorMsg.set('');
    // from_app=true: السيرفر بيخلّي رابط الرجوع يحوّل المستخدم للتطبيق بعد الدفع
    const url = `${environment.apiUrl}/marketplace-payments/merchant/checkout${this.isNative ? '?from_app=true' : ''}`;
    this.http.post<any>(url, {}).subscribe({
      next: (res) => this.openPayment(res.payment_url),
      error: (err) => {
        this.loading.set(false);
        if (err?.error?.detail?.code === 'already_merchant') {
          this.router.navigate([this.returnTo]);
          return;
        }
        const d = err?.error?.detail;
        this.errorMsg.set(typeof d === 'string' ? d : (this.lang === 'ar' ? 'حدث خطأ، حاول مرة أخرى' : 'Error, try again'));
      },
    });
  }

  private async openPayment(paymentUrl?: string) {
    if (!paymentUrl) {
      this.loading.set(false);
      this.errorMsg.set(this.lang === 'ar' ? 'حدث خطأ، حاول مرة أخرى' : 'Error, try again');
      return;
    }

    if (this.isNative) {
      this.loading.set(false);
      try {
        // لما المستخدم يقفل المتصفح (دفع أو لأ) نعيد فحص الحالة — لو بقى تاجر هيتحوّل لوحده
        const handle = await Browser.addListener('browserFinished', () => {
          handle.remove();
          this.loadStatus();
        });
      } catch { /* مش مشكلة لو الـ listener مش متاح */ }
      await Browser.open({ url: paymentUrl });
      return;
    }

    window.location.href = paymentUrl;
  }
}
