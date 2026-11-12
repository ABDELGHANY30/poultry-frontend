import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { markFromApp } from '../../core/services/deep-link.service';

/**
 * بديل أزرار "اتصال / واتساب" في كارت الإعلان:
 *   <app-contact-unlock [listing]="l" (browserClosed)="reloadListings()" />
 * المشتري مش محتاج توثيق بطاقة (التوثيق للتاجر بس).
 * الـ listing لازم يجيلك من GET /listings (فيه id, phone, phone_masked, contact_unlocked, is_mine).
 * - لو الرقم مفتوح (صاحب الإعلان أو دافع 50 جنيه): زراري اتصال + واتساب.
 * - لو مقفول: الرقم مخفي + زرار دفع Paymob.
 *
 * 🆕 الدفع من التطبيق من غير تسجيل دخول تاني:
 * - التطبيق (Capacitor): المستخدم مسجّل دخول أصلاً، فبنطلب لينك الدفع من السيرفر بحسابه (?from_app=true)
 *   ونفتح صفحة دفع XPay مباشرة في المتصفح الداخلي — مفيش موقع ولا تسجيل دخول. وبعد النجاح
 *   صفحة النتيجة بترجّع المستخدم للتطبيق وهو اللي بيتأكد من الدفع.
 * - browserClosed: بيتبعت لما المستخدم يقفل متصفح الموقع (حتى لو قفله من غير دفع) —
 *   اربطه بإعادة تحميل الإعلانات عشان الرقم يظهر لو الدفع تم.
 */
@Component({
  selector: 'app-contact-unlock',
  standalone: true,
  imports: [CommonModule],
  template: `
  <ng-container *ngIf="listing?.contact_unlocked && listing?.phone; else locked">
    <div class="flex gap-2">
      <a [href]="'tel:' + listing.phone" (click)="contacted.emit()"
         class="flex-1 text-center py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold no-underline">
        📞 {{ lang === 'ar' ? 'اتصال' : 'Call' }}
      </a>
      <a [href]="whatsappUrl()" target="_blank" rel="noopener" (click)="contacted.emit()"
         class="flex-1 text-center py-2 rounded-xl bg-green-500 text-white text-sm font-bold no-underline">
        💬 {{ lang === 'ar' ? 'واتساب' : 'WhatsApp' }}
      </a>
    </div>
  </ng-container>

  <ng-template #locked>
    <div class="rounded-xl border border-gray-200 bg-gray-50 p-3">
      <div class="flex items-center justify-between mb-2 text-sm">
        <span class="text-gray-500">📱 {{ listing?.phone_masked || '••••••••••' }}</span>
        <span class="text-[11px] text-gray-400">{{ lang === 'ar' ? 'رقم التاجر مخفي' : 'Number hidden' }}</span>
      </div>
      <div *ngIf="errorMsg()" class="text-xs text-red-600 mb-2">{{ errorMsg() }}</div>
      <button (click)="unlock()" [disabled]="loading()"
              class="w-full py-2 rounded-xl bg-gray-800 text-white text-sm font-bold">
        {{ loading() ? '...' : (lang === 'ar' ? '🔓 اعرض الرقم — 50 جنيه' : '🔓 Show number — 50 EGP') }}
      </button>
      <p class="text-[10px] text-gray-400 text-center mt-1.5">
        {{ lang === 'ar' ? 'دفع مرة واحدة لهذا الإعلان — اتصال أو واتساب' : 'One-time payment for this listing — call or WhatsApp' }}
      </p>
      <p class="text-[10px] text-gray-400 text-center leading-relaxed mt-1">
        ⚠️ {{ lang === 'ar' ? 'التطبيق والموقع منصة لعرض الإعلانات والتواصل فقط، وغير مسؤولين عن أي عمليات بيع أو شراء بين المستخدمين. تأكد من البائع والمنتج قبل أي تحويل أو استلام.' : 'This app and website only list ads and connect users, and are not responsible for any sale or purchase between users. Check the seller and the product before any transfer or handover.' }}
      </p>
    </div>
  </ng-template>
  `
})
export class ContactUnlockComponent implements OnInit {
  @Input({ required: true }) listing: any;
  @Output() contacted = new EventEmitter<void>();    // الأب يسجّل الاتصال (registerContact)
  @Output() browserClosed = new EventEmitter<void>(); // المستخدم قفل متصفح الموقع — الأب يحدّث الإعلانات

  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  lang = localStorage.getItem('lang') ?? 'ar';
  isNative = Capacitor.isNativePlatform();
  loading = signal(false);
  errorMsg = signal('');

  ngOnInit() {
    if (this.isNative) return;

    const qp = this.route.snapshot.queryParamMap;
    // جاي من التطبيق -> نفتكر ده عشان صفحة النتيجة تعرض "ارجع للتطبيق"
    if (qp.get('from') === 'app') markFromApp();

    // التطبيق فتح الموقع بـ ?unlock=<id> -> نبدأ الدفع تلقائياً للإعلان ده
    const target = qp.get('unlock');
    if (target && String(this.listing?.id) === target && !this.listing?.contact_unlocked && !this.listing?.is_mine) {
      this.unlock();
    }
  }

  whatsappUrl(): string {
    let d = (this.listing?.phone || '').replace(/\D/g, '');
    if (d.startsWith('00')) d = d.slice(2);
    if (d.startsWith('0')) d = '20' + d.slice(1); // مصر
    return `https://wa.me/${d}`;
  }

  unlock() {
    if (!this.auth.isAuthenticated()) { this.router.navigate(['/auth/login'], { queryParams: { returnTo: '/market-hub' } }); return; }

    this.loading.set(true);
    this.errorMsg.set('');

    // from_app=true: السيرفر بيخلّي رابط الرجوع يحوّل المستخدم للتطبيق بعد الدفع
    const url = `${environment.apiUrl}/marketplace-payments/contact/${this.listing.id}/checkout${this.isNative ? '?from_app=true' : ''}`;
    this.http.post<any>(url, {}).subscribe({
      next: (res) => this.openPayment(res.payment_url),
      error: (err) => {
        this.loading.set(false);
        const d = err?.error?.detail;
        if (d?.code === 'already_unlocked') { window.location.reload(); return; } // الرقم مفتوح بالفعل
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
        const handle = await Browser.addListener('browserFinished', () => {
          handle.remove();
          this.browserClosed.emit();
        });
      } catch { /* مش مشكلة لو الـ listener مش متاح */ }
      await Browser.open({ url: paymentUrl });
      return;
    }

    window.location.href = paymentUrl;
  }
}
