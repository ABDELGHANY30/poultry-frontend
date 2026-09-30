import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { environment } from '../../../environments/environment';

/**
 * بديل أزرار "اتصال / واتساب" في كارت الإعلان:
 *   <app-contact-unlock [listing]="l" />
 * الـ listing لازم يجيلك من GET /listings (فيه id, phone, phone_masked, contact_unlocked, is_mine).
 * - لو الرقم مفتوح (صاحب الإعلان أو دافع 50 جنيه): زراري اتصال + واتساب.
 * - لو مقفول: الرقم مخفي + زرار دفع Paymob.
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
    </div>
  </ng-template>
  `
})
export class ContactUnlockComponent {
  @Input({ required: true }) listing: any;
  @Output() contacted = new EventEmitter<void>(); // الأب يسجّل الاتصال (registerContact)

  private http = inject(HttpClient);
  private router = inject(Router);

  lang = localStorage.getItem('lang') ?? 'ar';
  loading = signal(false);
  errorMsg = signal('');

  whatsappUrl(): string {
    let d = (this.listing?.phone || '').replace(/\D/g, '');
    if (d.startsWith('00')) d = d.slice(2);
    if (d.startsWith('0')) d = '20' + d.slice(1); // مصر
    return `https://wa.me/${d}`;
  }

  unlock() {
    const token = localStorage.getItem('spa_token');
    if (!token) { this.router.navigate(['/auth/login'], { queryParams: { returnTo: '/market-hub' } }); return; }

    // التطبيق مبيبدأش دفع — بيفتح الموقع والمستخدم يكمّل من هناك (نفس سياسة الاشتراك)
    if (Capacitor.isNativePlatform()) {
      Browser.open({ url: environment.websiteUrl + '/market-hub' });
      return;
    }

    this.loading.set(true);
    this.errorMsg.set('');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.post<any>(`${environment.apiUrl}/marketplace-payments/contact/${this.listing.id}/checkout`, {}, { headers })
      .subscribe({
        next: (res) => {
          if (res.payment_url) window.location.href = res.payment_url;
          else { this.loading.set(false); this.errorMsg.set(this.lang === 'ar' ? 'حدث خطأ، حاول مرة أخرى' : 'Error, try again'); }
        },
        error: (err) => {
          this.loading.set(false);
          const d = err?.error?.detail;
          if (d?.code === 'already_unlocked') { window.location.reload(); return; } // الرقم مفتوح بالفعل
          this.errorMsg.set(typeof d === 'string' ? d : (this.lang === 'ar' ? 'حدث خطأ، حاول مرة أخرى' : 'Error, try again'));
        },
      });
  }
}
