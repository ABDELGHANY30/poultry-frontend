import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * صفحة الرجوع من Paymob (redirection_url). مبتفعّلش حاجة بنفسها —
 * بتسأل الباك إند عن حالة العملية (اللي بيتحدّث من الـ webhook) وبتعرض النتيجة.
 */
@Component({
  selector: 'app-payment-result',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <div class="page-wrapper">
    <div class="card text-center py-10 px-5">

      <ng-container *ngIf="state() === 'checking'">
        <div class="text-4xl mb-3 animate-pulse">⏳</div>
        <p class="font-bold text-gray-800">{{ lang === 'ar' ? 'بنتأكد من الدفع...' : 'Confirming payment...' }}</p>
      </ng-container>

      <ng-container *ngIf="state() === 'paid'">
        <div class="text-5xl mb-3">✅</div>
        <p class="font-bold text-emerald-700 text-lg mb-1">
          {{ purpose() === 'merchant_fee'
              ? (lang === 'ar' ? 'تم تفعيل حساب التاجر' : 'Merchant account activated')
              : (lang === 'ar' ? 'تم فتح رقم التاجر' : 'Contact unlocked') }}
        </p>
        <a [routerLink]="purpose() === 'merchant_fee' ? '/marketplace/add-listing' : '/market-hub'"
           class="btn-primary btn inline-flex mt-4">
          {{ purpose() === 'merchant_fee'
              ? (lang === 'ar' ? '➕ أضف إعلانك' : '➕ Add listing')
              : (lang === 'ar' ? 'ارجع للسوق' : 'Back to market') }}
        </a>
      </ng-container>

      <ng-container *ngIf="state() === 'failed'">
        <div class="text-5xl mb-3">❌</div>
        <p class="font-bold text-red-600 mb-1">{{ lang === 'ar' ? 'لم تكتمل عملية الدفع' : 'Payment was not completed' }}</p>
        <a routerLink="/market-hub" class="btn btn-sm inline-flex mt-4">{{ lang === 'ar' ? 'رجوع' : 'Back' }}</a>
      </ng-container>

      <ng-container *ngIf="state() === 'timeout'">
        <div class="text-5xl mb-3">🕐</div>
        <p class="font-bold text-gray-800 mb-1">{{ lang === 'ar' ? 'العملية لسه بتتأكد' : 'Still processing' }}</p>
        <p class="text-xs text-gray-500 mb-4">
          {{ lang === 'ar' ? 'لو الدفع تم، هيتفعّل تلقائياً خلال دقايق.' : 'If the payment went through, it will activate shortly.' }}
        </p>
        <button (click)="retry()" class="btn-primary btn btn-sm">{{ lang === 'ar' ? 'تحديث' : 'Refresh' }}</button>
      </ng-container>

    </div>
  </div>
  `
})
export class PaymentResultComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  lang = localStorage.getItem('lang') ?? 'ar';
  state = signal<'checking' | 'paid' | 'failed' | 'timeout'>('checking');
  purpose = signal<string>('');

  private query = '';
  private timer: any;
  private tries = 0;

  ngOnInit() {
    const q = this.route.snapshot.queryParamMap;
    const ref = q.get('ref');
    const order = q.get('order'); // Paymob بيضيفه في رابط الرجوع
    if (ref) this.query = `ref=${encodeURIComponent(ref)}`;
    else if (order) this.query = `order=${encodeURIComponent(order)}`;
    else { this.router.navigate(['/market-hub']); return; }
    this.poll();
  }

  ngOnDestroy() { clearTimeout(this.timer); }

  retry() { this.tries = 0; this.state.set('checking'); this.poll(); }

  private poll() {
    this.http.get<any>(`${environment.apiUrl}/marketplace-payments/status?${this.query}`).subscribe({
      next: (res) => {
        this.purpose.set(res.purpose);
        if (res.status === 'paid') return this.state.set('paid');
        if (res.status === 'failed') return this.state.set('failed');
        this.next();
      },
      error: () => this.next(),
    });
  }

  // الـ webhook ممكن يتأخر كام ثانية — بنسأل كل 2 ثانية لحد 30 ثانية
  private next() {
    if (++this.tries >= 15) { this.state.set('timeout'); return; }
    this.timer = setTimeout(() => this.poll(), 2000);
  }
}
