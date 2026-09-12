import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * صفحة قبول دعوة الانضمام لمزرعة (اللينك اللي بيتبعت للعامل/البيطري).
 * ⚠️ لو المستخدم مش عامل login، بنوديه لصفحة /login الأول (لازم تتأكد إن
 * /login عندك بيقبل returnUrl، وإلا هيرجع للصفحة دي تاني بعد الدخول من غير
 * توجيه تلقائي — عدّل الجزء ده لو نظام اللوجن عندك مختلف).
 */
@Component({
  selector: 'app-join-farm',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <div class="page-wrapper flex items-center justify-center min-h-[60vh]">
    <div class="card max-w-sm w-full text-center">
      <div *ngIf="status() === 'loading'" class="py-6">
        <p class="text-sm text-[var(--c-muted)]">جاري التحقق من الدعوة...</p>
      </div>

      <div *ngIf="status() === 'success'" class="py-6">
        <div class="text-4xl mb-3">✅</div>
        <p class="font-bold mb-2">تم قبول الدعوة بنجاح!</p>
        <p class="text-sm text-[var(--c-muted)] mb-4">تقدر دلوقتي تشوف القطعان المشتركة معاك.</p>
        <a routerLink="/team" class="inline-block px-6 py-2.5 rounded-xl bg-green-600 text-white font-bold no-underline">
          روح لقطعاني المشتركة
        </a>
      </div>

      <div *ngIf="status() === 'error'" class="py-6">
        <div class="text-4xl mb-3">⚠️</div>
        <p class="font-bold mb-2">مش قادرين نقبل الدعوة</p>
        <p class="text-sm text-[var(--c-muted)]">{{ errorMessage() }}</p>
      </div>
    </div>
  </div>
  `,
})
export class JoinFarmComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);

  status = signal<'loading' | 'success' | 'error'>('loading');
  errorMessage = signal('');

  ngOnInit() {
    const token = localStorage.getItem('spa_token'); // ⚠️ وحّد الاسم ده مع باقي الملفات
    if (!token) {
      // مش عامل تسجيل دخول — نرجعله هنا بعد ما يدخل
      // ⚠️ افترضت إن صفحة اللوجن عندك /auth/login (مطابق لهيكل app_routes.ts) — عدّلها لو مختلفة
      const inviteId = this.route.snapshot.paramMap.get('id');
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: `/join-farm/${inviteId}` } });
      return;
    }

    const inviteId = this.route.snapshot.paramMap.get('id');
    if (!inviteId) {
      this.status.set('error');
      this.errorMessage.set('لينك الدعوة غير صالح.');
      return;
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.post(`${environment.apiUrl}/farm-members/${inviteId}/accept`, {}, { headers }).subscribe({
      next: () => this.status.set('success'),
      error: (err) => {
        this.status.set('error');
        this.errorMessage.set(
          err?.error?.detail === 'الدعوة دي مش لإيميلك'
            ? 'الدعوة دي مش لحسابك — تأكد إنك داخل بنفس الإيميل اللي اتبعتله الدعوة.'
            : 'الدعوة دي غير موجودة أو اتقبلت/اتلغت بالفعل.'
        );
      },
    });
  }
}
