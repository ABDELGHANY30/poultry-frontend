import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BillingService, BillingPlan } from '../../core/services/billing.service'; // ⚠️ عدّل المسار

@Component({
  selector: 'app-upgrade-screen',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-4">
      <h2 class="font-black text-lg mb-4">اشترك في Pro</h2>

      <button
        (click)="subscribe('monthly')"
        [disabled]="loading()"
        class="w-full mb-3 rounded-xl bg-amber-500 text-white font-bold py-3"
      >
        شهري — 150 جنيه
      </button>

      <button
        (click)="subscribe('yearly')"
        [disabled]="loading()"
        class="w-full rounded-xl border-2 border-amber-500 text-amber-600 font-bold py-3"
      >
        سنوي — 1200 جنيه (وفّر شهرين)
      </button>

      @if (errorMessage()) {
        <p class="text-red-500 text-sm mt-3">{{ errorMessage() }}</p>
      }
    </div>
  `,
})
export class UpgradeScreenComponent {
  private billing = inject(BillingService);

  loading = signal(false);
  errorMessage = signal<string | null>(null);

  async subscribe(plan: BillingPlan) {
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      await this.billing.purchase(plan);
      // النجاح الفعلي (تحديث is_pro) بيوصل بعد ما onApproved في
      // BillingService يخلص ويأكد مع الباك اند — استخدم /payment/status
      // أو state management بتاعك عشان تعكس الحالة الجديدة في الواجهة
    } catch (err: any) {
      this.errorMessage.set(err?.message ?? 'حصل خطأ غير متوقع، حاول تاني');
    } finally {
      this.loading.set(false);
    }
  }
}
