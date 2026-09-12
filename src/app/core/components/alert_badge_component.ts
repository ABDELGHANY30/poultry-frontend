import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AlertService } from '../../core/services/alert.service'; // 👈 عدّل المسار حسب مكانك في المشروع

/**
 * كومبوننت جرس التنبيهات — تحطه مرة واحدة في الـ navbar/header بتاع الموقع
 * (اللي بيفضل ظاهر في كل الصفحات). بمجرد ما يتحمّل، بيبدأ الـ polling
 * تلقائيًا فيفضل العداد محدّث بغض النظر عن الصفحة اللي المستخدم فيها.
 *
 * الاستخدام في الـ template بتاع الـ navbar:
 *   <app-alert-badge></app-alert-badge>
 */
@Component({
  selector: 'app-alert-badge',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <a routerLink="/alerts"
       class="relative inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-black/5 transition-colors"
       aria-label="التنبيهات">
      <span class="text-xl">🔔</span>
      <span *ngIf="svc.activeCount() > 0"
            class="absolute -top-0.5 -end-0.5 min-w-[18px] h-[18px] px-1 rounded-full
                   bg-red-500 text-white text-[10px] font-black flex items-center justify-center
                   animate-in">
        {{ svc.activeCount() > 99 ? '99+' : svc.activeCount() }}
      </span>
    </a>
  `,
})
export class AlertBadgeComponent implements OnInit {
  svc = inject(AlertService);

  ngOnInit() {
    this.svc.startPolling(); // كل 60 ثانية — عدّل الرقم في alert.service.ts لو حابب
  }
}
