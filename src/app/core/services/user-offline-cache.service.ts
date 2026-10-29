import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

/**
 * 📴 تخزين بيانات الأوفلاين.
 *
 * - موبايل (Capacitor) بس. على الويب `enabled = false` ومفيش أي حاجة بتتخزن في المتصفح —
 *   نفس سياسة AuthService (التوكن في كوكي HttpOnly ومفيش بيانات في localStorage).
 * - كل مفتاح مربوط بمعرّف المستخدم: `off:<userId>:<key>` ← مستخدم تاني على نفس الجهاز
 *   مايشوفش ولا يبعت بيانات غيره.
 * - مش بيعتمد على AuthService (AuthService هو اللي بينادي clearCaches وقت الخروج، فكده نتفادى circular DI).
 */
const PREFIX = 'off:';

/** مفاتيح بتفضل بعد الخروج لأنها بيانات المستخدم اللي لسه ماتبعتتش (متضيعش) */
const KEEP_ON_LOGOUT = ['pending_records', 'failed_records'];

@Injectable({ providedIn: 'root' })
export class UserOfflineCacheService {
  readonly enabled = Capacitor.isNativePlatform();

  private k(userId: string, key: string): string { return `${PREFIX}${userId}:${key}`; }

  async get<T = any>(userId: string | null, key: string): Promise<T | null> {
    if (!this.enabled || !userId) return null;
    try {
      const { value } = await Preferences.get({ key: this.k(userId, key) });
      return value ? (JSON.parse(value) as T) : null;
    } catch {
      return null;
    }
  }

  /** بترجّع true بس لو الكتابة نجحت فعلاً (بنقرا القيمة تاني للتأكد — التخزين الممتلي ممكن يفشل بصمت) */
  async set(userId: string | null, key: string, value: unknown): Promise<boolean> {
    if (!this.enabled || !userId) return false;
    try {
      const fullKey = this.k(userId, key);
      const raw = JSON.stringify(value);
      await Preferences.set({ key: fullKey, value: raw });
      const check = await Preferences.get({ key: fullKey });
      return check.value === raw;
    } catch {
      return false;
    }
  }

  async remove(userId: string | null, key: string): Promise<void> {
    if (!this.enabled || !userId) return;
    try { await Preferences.remove({ key: this.k(userId, key) }); } catch { /* ignore */ }
  }

  /**
   * وقت تسجيل الخروج: نمسح النسخ المخزّنة (قطيع/سجلات/برنامج) للمستخدم ده،
   * ونسيب السجلات المنتظرة والمرفوضة بتاعته بس (بتتبعت لما هو نفسه يدخل تاني).
   */
  async clearCaches(userId: string | null): Promise<void> {
    if (!this.enabled || !userId) return;
    try {
      const { keys } = await Preferences.keys();
      const own = `${PREFIX}${userId}:`;
      const keep = KEEP_ON_LOGOUT.map(k => own + k);
      await Promise.all(
        keys.filter(k => k.startsWith(own) && !keep.includes(k)).map(k => Preferences.remove({ key: k }))
      );
    } catch { /* ignore */ }
  }
}
