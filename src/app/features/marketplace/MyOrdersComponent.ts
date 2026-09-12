import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
  <div class="page-wrapper">
    <div class="flex items-center gap-2 mb-4">
      <a routerLink="/marketplace" class="text-gray-400 text-xl">←</a>
      <h1 class="text-xl font-bold">
        {{ lang === 'ar' ? '📋 طلباتي' : '📋 My Orders' }}
      </h1>
    </div>

    <!-- Role Switcher: كمشتري / كمورد -->
    <div class="flex gap-2 mb-4 bg-gray-100 rounded-2xl p-1">
      <button (click)="setRole('buyer')"
              class="flex-1 py-2.5 rounded-xl text-sm font-bold transition"
              [class.bg-white]="role() === 'buyer'"
              [class.shadow-sm]="role() === 'buyer'"
              [class.text-green-700]="role() === 'buyer'"
              [class.text-gray-500]="role() !== 'buyer'">
        🛍️ {{ lang === 'ar' ? 'كمشتري' : 'As Buyer' }}
      </button>
      <button (click)="setRole('seller')"
              class="flex-1 py-2.5 rounded-xl text-sm font-bold transition"
              [class.bg-white]="role() === 'seller'"
              [class.shadow-sm]="role() === 'seller'"
              [class.text-green-700]="role() === 'seller'"
              [class.text-gray-500]="role() !== 'seller'">
        🏪 {{ lang === 'ar' ? 'كمورد (طلبات وردتني)' : 'As Seller' }}
      </button>
    </div>

    <div *ngIf="loading()" class="text-center py-8 text-gray-400">
      {{ lang === 'ar' ? 'جاري التحميل...' : 'Loading...' }}
    </div>

    <div *ngIf="!loading() && orders().length === 0" class="text-center py-12 text-gray-400">
      <p class="text-4xl mb-2">📋</p>
      <p class="font-semibold">{{ lang === 'ar' ? 'لا توجد طلبات' : 'No orders' }}</p>
    </div>

    <div class="space-y-3">
      <div *ngFor="let order of orders()"
           class="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">

        <div class="flex items-start justify-between gap-3">
          <div class="flex-1">
            <h3 class="font-bold text-gray-800 text-base">{{ order.listing_title }}</h3>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-xs px-2 py-0.5 rounded-full font-semibold"
                    [class]="statusBadgeClass(order.status)">
                {{ statusLabel(order.status) }}
              </span>
              <span class="text-xs text-gray-400">{{ order.created_at | date:'dd/MM/yyyy' }}</span>
            </div>
          </div>
        </div>

        <!-- [كمورد] زرار تحديث الحالة -->
        <div *ngIf="role() === 'seller' && order.status !== 'completed' && order.status !== 'cancelled'"
             class="flex gap-2 mt-3">
          <button *ngIf="order.status === 'new'"
                  (click)="updateStatus(order, 'contacted')"
                  class="flex-1 bg-blue-50 text-blue-600 text-center py-2 rounded-xl text-sm font-bold hover:bg-blue-100 transition">
            {{ lang === 'ar' ? 'تم التواصل' : 'Contacted' }}
          </button>
          <button *ngIf="order.status === 'contacted'"
                  (click)="updateStatus(order, 'in_progress')"
                  class="flex-1 bg-amber-50 text-amber-600 text-center py-2 rounded-xl text-sm font-bold hover:bg-amber-100 transition">
            {{ lang === 'ar' ? 'قيد التنفيذ' : 'In Progress' }}
          </button>
          <button (click)="updateStatus(order, 'completed')"
                  class="flex-1 bg-green-600 text-white text-center py-2 rounded-xl text-sm font-bold hover:bg-green-700 transition">
            ✓ {{ lang === 'ar' ? 'تم البيع' : 'Mark Completed' }}
          </button>
          <button (click)="updateStatus(order, 'cancelled')"
                  class="bg-red-50 text-red-500 px-3 rounded-xl text-sm font-bold hover:bg-red-100 transition">
            ✕
          </button>
        </div>

        <!-- [كمشتري] زرار التقييم لو الطلب مكتمل ومفيش تقييم لسه -->
        <div *ngIf="role() === 'buyer' && order.status === 'completed' && !order.already_rated" class="mt-3">
          <button *ngIf="ratingOrderId() !== order.id"
                  (click)="openRatingForm(order)"
                  class="w-full bg-amber-50 text-amber-600 text-center py-2 rounded-xl text-sm font-bold hover:bg-amber-100 transition">
            ⭐ {{ lang === 'ar' ? 'قيّم المورد والمنتج' : 'Rate supplier & product' }}
          </button>

          <!-- فورم التقييم -->
          <div *ngIf="ratingOrderId() === order.id" class="mt-3 bg-gray-50 rounded-xl p-4 space-y-3">

            <div>
              <label class="text-sm font-semibold text-gray-700 block mb-1">
                {{ lang === 'ar' ? 'تقييم المورد' : 'Rate the supplier' }}
              </label>
              <div class="flex gap-1">
                <span *ngFor="let s of [1,2,3,4,5]"
                      (click)="ratingForm.supplier_stars = s"
                      class="text-2xl cursor-pointer select-none"
                      [class.opacity-100]="s <= ratingForm.supplier_stars"
                      [class.opacity-30]="s > ratingForm.supplier_stars">
                  ⭐
                </span>
              </div>
              <textarea [(ngModel)]="ratingForm.supplier_comment" rows="2" class="form-input mt-2 w-full"
                        [placeholder]="lang === 'ar' ? 'تعليق (اختياري)' : 'Comment (optional)'"></textarea>
            </div>

            <div>
              <label class="text-sm font-semibold text-gray-700 block mb-1">
                {{ lang === 'ar' ? 'تقييم المنتج (اختياري)' : 'Rate the product (optional)' }}
              </label>
              <div class="flex gap-1">
                <span *ngFor="let s of [1,2,3,4,5]"
                      (click)="ratingForm.product_stars = s"
                      class="text-2xl cursor-pointer select-none"
                      [class.opacity-100]="ratingForm.product_stars !== null && s <= ratingForm.product_stars!"
                      [class.opacity-30]="ratingForm.product_stars === null || s > ratingForm.product_stars!">
                  ⭐
                </span>
                <button *ngIf="ratingForm.product_stars !== null"
                        (click)="ratingForm.product_stars = null"
                        class="text-xs text-gray-400 mr-2 self-center">
                  {{ lang === 'ar' ? 'إلغاء' : 'clear' }}
                </button>
              </div>
              <textarea *ngIf="ratingForm.product_stars !== null"
                        [(ngModel)]="ratingForm.product_comment" rows="2" class="form-input mt-2 w-full"
                        [placeholder]="lang === 'ar' ? 'تعليق على المنتج (اختياري)' : 'Product comment (optional)'"></textarea>
            </div>

            <div *ngIf="ratingError()" class="bg-red-50 text-red-600 text-sm p-2 rounded-lg">
              {{ ratingError() }}
            </div>

            <div class="flex gap-2">
              <button (click)="submitRating(order)"
                      [disabled]="submittingRating() || ratingForm.supplier_stars === 0"
                      class="flex-1 btn-primary btn">
                {{ submittingRating() ? '...' : (lang === 'ar' ? '✅ إرسال التقييم' : '✅ Submit') }}
              </button>
              <button (click)="closeRatingForm()" class="px-4 py-2 rounded-xl text-sm text-gray-500">
                {{ lang === 'ar' ? 'إلغاء' : 'Cancel' }}
              </button>
            </div>
          </div>
        </div>

        <div *ngIf="role() === 'buyer' && order.status === 'completed' && order.already_rated"
             class="mt-3 text-center text-sm text-green-600 font-semibold">
          ✓ {{ lang === 'ar' ? 'تم تقييم هذا الطلب' : 'You already rated this order' }}
        </div>

      </div>
    </div>
  </div>
  `
})
export class MyOrdersComponent implements OnInit {
  private http = inject(HttpClient);
  lang = localStorage.getItem('lang') ?? 'ar';

  role = signal<'buyer' | 'seller'>('buyer');
  orders = signal<any[]>([]);
  loading = signal(false);

  ratingOrderId = signal<string | null>(null);
  submittingRating = signal(false);
  ratingError = signal('');

  ratingForm: {
    supplier_stars: number;
    supplier_comment: string;
    product_stars: number | null;
    product_comment: string;
  } = {
    supplier_stars: 0,
    supplier_comment: '',
    product_stars: null,
    product_comment: '',
  };

  private headers() {
    const token = localStorage.getItem('spa_token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  ngOnInit() {
    this.loadOrders();
  }

  setRole(role: 'buyer' | 'seller') {
    this.role.set(role);
    this.closeRatingForm();
    this.loadOrders();
  }

  loadOrders() {
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}/orders/mine?role=${this.role()}`, { headers: this.headers() })
      .subscribe({
        next: res => {
          this.orders.set(res.orders ?? []);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
  }

  statusLabel(status: string): string {
    const labels: any = {
      new: this.lang === 'ar' ? 'جديد' : 'New',
      contacted: this.lang === 'ar' ? 'تم التواصل' : 'Contacted',
      in_progress: this.lang === 'ar' ? 'قيد التنفيذ' : 'In Progress',
      completed: this.lang === 'ar' ? 'مكتمل' : 'Completed',
      cancelled: this.lang === 'ar' ? 'ملغي' : 'Cancelled',
    };
    return labels[status] ?? status;
  }

  statusBadgeClass(status: string): string {
    const classes: any = {
      new: 'bg-gray-100 text-gray-600',
      contacted: 'bg-blue-50 text-blue-600',
      in_progress: 'bg-amber-50 text-amber-600',
      completed: 'bg-green-50 text-green-600',
      cancelled: 'bg-red-50 text-red-500',
    };
    return classes[status] ?? 'bg-gray-100 text-gray-600';
  }

  // ---------- [Seller] تحديث حالة الطلب ----------
  updateStatus(order: any, status: string) {
    this.http.patch(
      `${environment.apiUrl}/orders/${order.id}/status`,
      { status },
      { headers: this.headers() }
    ).subscribe({
      next: () => this.loadOrders(),
      error: () => alert(this.lang === 'ar' ? 'حدث خطأ أثناء تحديث الحالة' : 'Error updating status')
    });
  }

  // ---------- [Buyer] التقييم ----------
  openRatingForm(order: any) {
    this.ratingOrderId.set(order.id);
    this.ratingError.set('');
    this.ratingForm = { supplier_stars: 0, supplier_comment: '', product_stars: null, product_comment: '' };
  }

  closeRatingForm() {
    this.ratingOrderId.set(null);
    this.ratingError.set('');
  }

  submitRating(order: any) {
    if (this.ratingForm.supplier_stars === 0) {
      this.ratingError.set(this.lang === 'ar' ? 'يرجى تحديد تقييم المورد' : 'Please rate the supplier');
      return;
    }

    this.submittingRating.set(true);
    this.ratingError.set('');

    const payload: any = {
      order_id: order.id,
      supplier_stars: this.ratingForm.supplier_stars,
      supplier_comment: this.ratingForm.supplier_comment || null,
    };
    if (this.ratingForm.product_stars !== null) {
      payload.product_stars = this.ratingForm.product_stars;
      payload.product_comment = this.ratingForm.product_comment || null;
    }

    this.http.post(`${environment.apiUrl}/ratings/`, payload, { headers: this.headers() }).subscribe({
      next: () => {
        this.submittingRating.set(false);
        this.closeRatingForm();
        // نعلّم الطلب محليًا كمُقيَّم بدل ما نعيد تحميل القائمة كاملة
        const updated = this.orders().map(o => o.id === order.id ? { ...o, already_rated: true } : o);
        this.orders.set(updated);
      },
      error: (err) => {
        this.submittingRating.set(false);
        this.ratingError.set(
          err?.error?.detail ?? (this.lang === 'ar' ? 'حدث خطأ، حاول مرة أخرى' : 'Error, try again')
        );
      }
    });
  }
}