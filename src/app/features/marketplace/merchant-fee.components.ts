import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { environment } from '../../../environments/environment';

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

      <button (click)="pay()" [disabled]="loading()" class="btn-primary btn w-full">
        {{ loading() ? '...' :
           (isNative ? (lang === 'ar' ? 'أكمل من الموقع' : 'Continue on website')
                     : (lang === 'ar' ? '💳 ادفع عبر Paymob' : '💳 Pay with Paymob')) }}
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

  private headers() {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('spa_token')}` });
  }

  ngOnInit() {
    this.returnTo = this.route.snapshot.queryParamMap.get('returnTo') || this.returnTo;

    this.http.get<any>(`${environment.apiUrl}/marketplace-payments/merchant/status`, { headers: this.headers() })
      .subscribe({
        next: (res) => {
          this.fee.set(res.fee_egp ?? 200);
          if (!res.identity_verified) {
            this.router.navigate(['/verify-identity'], { queryParams: { returnTo: this.returnTo } });
          } else if (res.is_merchant) {
            this.router.navigate([this.returnTo]); // تاجر بالفعل -> مفيش دفع تاني
          }
        },
        error: () => this.router.navigate(['/auth/login']),
      });
  }

  pay() {
    // التطبيق مبيبدأش عمليات دفع (نفس سياسة صفحة الاشتراك) — بيفتح الموقع والمستخدم يكمّل من هناك
    if (this.isNative) {
      Browser.open({ url: environment.websiteUrl + '/merchant-fee' });
      return;
    }

    this.loading.set(true);
    this.errorMsg.set('');
    this.http.post<any>(`${environment.apiUrl}/marketplace-payments/merchant/checkout`, {}, { headers: this.headers() })
      .subscribe({
        next: (res) => {
          if (res.payment_url) {
            window.location.href = res.payment_url;
          } else {
            this.loading.set(false);
            this.errorMsg.set(this.lang === 'ar' ? 'حدث خطأ، حاول مرة أخرى' : 'Error, try again');
          }
        },
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
}
