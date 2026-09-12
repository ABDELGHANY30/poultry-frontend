import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Network } from '@capacitor/network';
import { Preferences } from '@capacitor/preferences';
import { environment } from '../../../environments/environment'; // ⚠️ عدّل المسار حسب مكان الملف عندك

const QUEUE_KEY = 'spa_offline_queue';
const CACHE_FLOCKS_KEY = 'spa_cached_flocks';

interface QueuedRecord {
  id: string;          // معرف محلي مؤقت (مش من السيرفر)
  flock_id: string;
  payload: any;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class OfflineSyncService {
  private http = inject(HttpClient);

  isOnline = signal(true);
  pendingCount = signal(0);
  syncing = signal(false);

  /** لازم تتنادى مرة واحدة بس، في AppComponent.ngOnInit() */
  async init() {
    const status = await Network.getStatus();
    this.isOnline.set(status.connected);
    await this.refreshPendingCount();

    Network.addListener('networkStatusChange', async (status) => {
      const wasOffline = !this.isOnline();
      this.isOnline.set(status.connected);
      if (status.connected && wasOffline) {
        await this.syncQueue();
      }
    });

    if (this.isOnline()) {
      await this.syncQueue(); // لو فيه سجلات متأخرة من مرة فاتت
    }
  }

  private headers() {
    const token = localStorage.getItem('spa_token'); // ⚠️ وحّد الاسم ده مع باقي الملفات
    return new HttpHeaders({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' });
  }

  private async getQueue(): Promise<QueuedRecord[]> {
    const { value } = await Preferences.get({ key: QUEUE_KEY });
    return value ? JSON.parse(value) : [];
  }

  private async setQueue(queue: QueuedRecord[]) {
    await Preferences.set({ key: QUEUE_KEY, value: JSON.stringify(queue) });
    this.pendingCount.set(queue.length);
  }

  private async refreshPendingCount() {
    this.pendingCount.set((await this.getQueue()).length);
  }

  /**
   * استخدم الدالة دي بدل الاستدعاء المباشر لـ FlockService.addRecord() في
   * فورم التسجيل اليومي. بترجع { queued: true } لو اتحفظت محلياً بدل ما تتبعت،
   * عشان تقدر تعرض رسالة مناسبة للمربي ("هتتزامن لما النت يرجع").
   */
  async submitRecord(flockId: string, payload: any): Promise<{ queued: boolean }> {
    if (this.isOnline()) {
      try {
        await firstValueFrom(
          this.http.post(`${environment.apiUrl}/flocks/${flockId}/records`, payload, { headers: this.headers() })
        );
        return { queued: false };
      } catch {
        // ظاهرياً أونلاين بس الطلب فشل (انقطاع مفاجئ) — نحفظ محلي بدل ما نضيع البيانات
        await this.enqueue(flockId, payload);
        return { queued: true };
      }
    }
    await this.enqueue(flockId, payload);
    return { queued: true };
  }

  private async enqueue(flockId: string, payload: any) {
    const queue = await this.getQueue();
    queue.push({
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      flock_id: flockId,
      payload,
      created_at: new Date().toISOString(),
    });
    await this.setQueue(queue);
  }

  /** بيحاول يبعت كل السجلات المتراكمة، ويسيب في القايمة بس اللي فشل */
  async syncQueue() {
    if (this.syncing()) return;
    const queue = await this.getQueue();
    if (!queue.length) return;

    this.syncing.set(true);
    const remaining: QueuedRecord[] = [];

    for (const item of queue) {
      try {
        await firstValueFrom(
          this.http.post(`${environment.apiUrl}/flocks/${item.flock_id}/records`, item.payload, { headers: this.headers() })
        );
      } catch {
        remaining.push(item);
      }
    }

    await this.setQueue(remaining);
    this.syncing.set(false);
  }

  // ── كاش للقراءة (عرض القطعان حتى وانت أوفلاين) ──────────────

  /** ينادَى بعد أي جلب ناجح لقائمة القطعان، عشان نخزن آخر نسخة معروفة */
  async cacheFlocks(flocks: any[]) {
    await Preferences.set({ key: CACHE_FLOCKS_KEY, value: JSON.stringify(flocks) });
  }

  /** يرجع آخر نسخة متخزنة من القطعان، أو مصفوفة فاضية لو مفيش كاش خالص */
  async getCachedFlocks(): Promise<any[]> {
    const { value } = await Preferences.get({ key: CACHE_FLOCKS_KEY });
    return value ? JSON.parse(value) : [];
  }
}