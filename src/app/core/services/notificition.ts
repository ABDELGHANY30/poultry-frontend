import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment'; // عدّل المسار حسب مكان الملف عندك

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <div class="relative">
    <button (click)="togglePanel()" class="relative p-2 text-gray-600">
      🔔
      <span *ngIf="unreadCount() > 0"
            class="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
        {{ unreadCount() > 9 ? '9+' : unreadCount() }}
      </span>
    </button>

    <!-- Backdrop لقفل البانل لو ضغط برّه -->
    <div *ngIf="showPanel()" (click)="showPanel.set(false)" class="fixed inset-0 z-40"></div>

    <div *ngIf="showPanel()"
         class="absolute left-0 mt-2 w-80 max-w-[90vw] bg-white rounded-2xl shadow-lg border border-gray-100 z-50 overflow-hidden">
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 class="font-bold text-gray-800 text-sm">
          {{ lang === 'ar' ? 'الإشعارات' : 'Notifications' }}
        </h3>
        <button *ngIf="unreadCount() > 0" (click)="markAllRead()" class="text-xs text-green-600 font-semibold">
          {{ lang === 'ar' ? 'تعليم الكل كمقروء' : 'Mark all read' }}
        </button>
      </div>

      <div class="max-h-96 overflow-y-auto">
        <div *ngIf="loading()" class="text-center text-sm text-gray-400 py-6">
          {{ lang === 'ar' ? 'جاري التحميل...' : 'Loading...' }}
        </div>

        <div *ngIf="!loading() && notifications().length === 0" class="text-center text-sm text-gray-400 py-6">
          {{ lang === 'ar' ? 'لا توجد إشعارات' : 'No notifications' }}
        </div>

        <a *ngFor="let n of notifications()"
           routerLink="/marketplace/my-orders"
           (click)="onNotificationClick(n)"
           class="block px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition"
           [class.bg-green-50]="!n.is_read">
          <div class="flex items-start gap-2">
            <span class="text-sm mt-0.5">{{ n.is_read ? '📭' : '📬' }}</span>
            <div class="flex-1">
              <p class="text-sm font-semibold text-gray-800">{{ n.title }}</p>
              <p class="text-xs text-gray-400 mt-0.5">{{ n.created_at | date:'dd/MM/yyyy hh:mm a' }}</p>
            </div>
          </div>
        </a>
      </div>
    </div>
  </div>
  `
})
export class NotificationBellComponent implements OnInit {
  private http = inject(HttpClient);
  lang = localStorage.getItem('lang') ?? 'ar';

  showPanel = signal(false);
  loading = signal(false);
  notifications = signal<any[]>([]);
  unreadCount = signal(0);

  private headers() {
    const token = localStorage.getItem('spa_token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  ngOnInit() {
    this.loadUnreadCount();
    // تحديث دوري بسيط كل دقيقة عشان العدد يفضل محدّث حتى لو المستخدم
    // ما فتحش البانل بنفسه — بديل بسيط عن WebSocket/Push في هذه المرحلة.
    setInterval(() => this.loadUnreadCount(), 60_000);
  }

  togglePanel() {
    this.showPanel.set(!this.showPanel());
    if (this.showPanel()) this.loadNotifications();
  }

  loadUnreadCount() {
    this.http.get<any>(`${environment.apiUrl}/notifications/?unread_only=true&limit=1`, { headers: this.headers() })
      .subscribe({
        next: res => this.unreadCount.set(res.unread_count ?? 0),
        error: () => {} // فشل صامت — جرس الإشعارات مش عنصر حرج يستاهل رسالة خطأ للمستخدم
      });
  }

  loadNotifications() {
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}/notifications/`, { headers: this.headers() })
      .subscribe({
        next: res => {
          this.notifications.set(res.notifications ?? []);
          this.unreadCount.set(res.unread_count ?? 0);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
  }

  onNotificationClick(notification: any) {
    this.showPanel.set(false);
    if (notification.is_read) return;

    this.http.patch(`${environment.apiUrl}/notifications/${notification.id}/read`, {}, { headers: this.headers() })
      .subscribe({
        next: () => {
          notification.is_read = true;
          this.unreadCount.set(Math.max(0, this.unreadCount() - 1));
        }
      });
  }

  markAllRead() {
    this.http.patch(`${environment.apiUrl}/notifications/read-all`, {}, { headers: this.headers() })
      .subscribe({
        next: () => {
          const updated = this.notifications().map(n => ({ ...n, is_read: true }));
          this.notifications.set(updated);
          this.unreadCount.set(0);
        }
      });
  }
}