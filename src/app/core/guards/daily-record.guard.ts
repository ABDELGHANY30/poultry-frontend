import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * dailyRecordGuard
 * ──────────────────────────────────────────────────────────────
 * لما المستخدم يفتح الموقع (بيتحط على route "dashboard")، الـ guard ده بيتحقق:
 * هل عنده قطيع نشط لسه محسجلش بياناته النهاردة؟ لو أيوه، وميضغطش "تخطي الآن"
 * قبل كده النهاردة، بيوديه تلقائي لصفحة تسجيل بيانات القطيع ده.
 *
 * لو أكتر من قطيع لسه محسجلش، بنوديه لصفحة "/flocks" (قايمة القطعان) بدل ما
 * نختار قطيع عشوائي بالنيابة عنه — يختار هو مين يسجله الأول.
 *
 * "تخطي الآن" بيتخزن في localStorage بمفتاح مربوط باليوم والقطيع، فمش هيضايقه
 * تاني في نفس اليوم، لكن هيرجع يسأله تاني بكرة لو لسه محسجلش.
 */
export const dailyRecordGuard: CanActivateFn = async () => {
  const http = inject(HttpClient);
  const router = inject(Router);

  const token = localStorage.getItem('spa_token');
  if (!token) return true; // authGuard هيتكفل بيه، مش شغلنا هنا

  try {
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    const status = await firstValueFrom(
      http.get<{ has_active_flocks: boolean; needs_recording: string[] }>(
        `${environment.apiUrl}/flocks/today-status`,
        { headers }
      )
    );

    if (!status?.has_active_flocks || !status.needs_recording?.length) {
      return true; // مفيش قطعان، أو كلهم متسجلين النهاردة بالفعل
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const pending = status.needs_recording.filter(
      (flockId) => localStorage.getItem(`daily_reminder_skip:${flockId}:${todayStr}`) !== '1'
    );
    if (!pending.length) return true; // كلهم اتخطوا النهاردة بالفعل

    if (pending.length === 1) {
      return router.parseUrl(`/flocks/${pending[0]}?prompt=daily`);
    }
    // أكتر من قطيع محتاج تسجيل — سيبه يختار من القايمة بدل ما نفرض عليه واحد
    return router.parseUrl('/flocks');
  } catch {
    return true; // أي خطأ في الشبكة/الـ API متمنعش المستخدم من فتح الداشبورد
  }
};