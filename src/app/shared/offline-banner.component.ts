import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OfflineSyncService } from '../../app/core/services/offline-sync.service'; // ⚠️ عدّل المسار حسب مكان الملف عندك

@Component({
  selector: 'app-offline-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="!offline.isOnline()"
         class="bg-amber-500 text-white text-xs font-bold text-center py-1.5 px-3 flex items-center justify-center gap-1.5">
      📡 غير متصل بالإنترنت — البيانات اللي تسجلها هتتحفظ وتتزامن تلقائي لما النت يرجع
    </div>

    <div *ngIf="offline.isOnline() && offline.pendingCount() > 0"
         class="bg-blue-500 text-white text-xs font-bold text-center py-1.5 px-3 flex items-center justify-center gap-1.5">
      {{ offline.syncing() ? '🔄 جاري مزامنة' : '⏳ في انتظار مزامنة' }} {{ offline.pendingCount() }} سجل محفوظ محلياً...
    </div>
  `
})
export class OfflineBannerComponent {
  offline = inject(OfflineSyncService);
}