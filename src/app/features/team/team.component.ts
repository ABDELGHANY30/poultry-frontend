import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <div class="page-wrapper">
    <a routerLink="/dashboard" class="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-800 no-underline mb-3">
      ← رجوع
    </a>

    <!-- 🔔 دعوات لسه معلقة وموجهة لإيميلي — قبول/رفض من جوه التطبيق مباشرة -->
    <div *ngIf="pendingInvites().length > 0" class="rounded-2xl border-2 border-green-300 bg-green-50 p-4 mb-4">
      <h3 class="font-black text-green-800 mb-2">🔔 عندك دعوة لمشاركة مزرعة</h3>
      <div *ngFor="let inv of pendingInvites()" class="bg-white rounded-xl p-3 mb-2 last:mb-0">
        <p class="text-sm mb-2">
          <span class="font-bold">{{ inv.owner_name || 'مربي' }}</span> بيدعوك تنضم كـ
          <span class="font-bold">{{ inv.role === 'vet' ? 'طبيب بيطري' : 'عامل مزرعة' }}</span>
          {{ inv.can_add_records ? '(تقدر تسجل بيانات)' : '(عرض بس)' }}
        </p>
        <div class="flex gap-2">
          <button (click)="acceptInvite(inv)" class="flex-1 py-2 rounded-lg bg-green-600 text-white text-sm font-bold">✅ قبول</button>
          <button (click)="rejectInvite(inv)" class="flex-1 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-bold">✕ رفض</button>
        </div>
      </div>
    </div>

    <div class="flex gap-2 mb-4">
      <button (click)="activeTab.set('invite')" class="flex-1 py-2 rounded-xl text-sm font-bold border"
              [class.bg-green-600]="activeTab() === 'invite'" [class.text-white]="activeTab() === 'invite'"
              [class.text-gray-500]="activeTab() !== 'invite'">
        👷 دعوة أعضاء
      </button>
      <button (click)="activeTab.set('shared')" class="flex-1 py-2 rounded-xl text-sm font-bold border"
              [class.bg-green-600]="activeTab() === 'shared'" [class.text-white]="activeTab() === 'shared'"
              [class.text-gray-500]="activeTab() !== 'shared'">
        🏠 قطعاني المشتركة
      </button>
      <button (click)="activeTab.set('activity')" class="flex-1 py-2 rounded-xl text-sm font-bold border"
              [class.bg-green-600]="activeTab() === 'activity'" [class.text-white]="activeTab() === 'activity'"
              [class.text-gray-500]="activeTab() !== 'activity'">
        📋 نشاط الفريق
      </button>
    </div>

    <!-- 👷 تبويب الدعوة (لصاحب الحساب) -->
    <div *ngIf="activeTab() === 'invite'">
      <div class="card mb-4">
        <h2 class="section-title mb-3">دعوة عضو جديد</h2>
        <div class="space-y-2">
          <input type="email" [(ngModel)]="inviteForm.invited_email" placeholder="إيميل العضو"
                 class="form-input text-sm w-full"/>
          <select [(ngModel)]="inviteForm.role" class="form-input text-sm w-full">
            <option value="worker">عامل مزرعة</option>
            <option value="vet">طبيب بيطري</option>
          </select>
          <label class="flex items-center gap-2 text-sm">
            <input type="checkbox" [(ngModel)]="inviteForm.can_add_records"/>
            يقدر يسجل بيانات يومية
          </label>
          <label class="flex items-center gap-2 text-sm">
            <input type="checkbox" [(ngModel)]="inviteForm.can_view_financials"/>
            يقدر يشوف البيانات المالية
          </label>
          <button (click)="sendInvite()" [disabled]="!inviteForm.invited_email || inviting()"
                  class="w-full py-2.5 rounded-xl bg-green-600 text-white font-bold disabled:opacity-40">
            {{ inviting() ? 'جاري الإرسال...' : 'إرسال الدعوة' }}
          </button>
          <div *ngIf="lastInviteLink()" class="bg-gray-50 rounded-lg p-2">
            <p class="text-xs text-gray-500 mb-2">
              ⚠️ لو العضو معندوش حساب لسه، ابعتله اللينك ده يعمل حساب بيه:
            </p>
            <div class="flex gap-2">
              <a [href]="whatsappShareUrl()" target="_blank" rel="noopener"
                 class="flex-1 py-2 rounded-lg bg-green-500 text-white text-xs font-bold text-center no-underline">
                📱 واتساب
              </a>
              <a [href]="telegramShareUrl()" target="_blank" rel="noopener"
                 class="flex-1 py-2 rounded-lg bg-blue-500 text-white text-xs font-bold text-center no-underline">
                ✈️ تيليجرام
              </a>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <h2 class="section-title mb-3">الأعضاء المدعوين</h2>
        <div *ngIf="members().length === 0" class="text-center py-4 text-[var(--c-muted)] text-sm">لسه معملتش أي دعوة.</div>
        <div *ngFor="let m of members()" class="bg-gray-50 rounded-lg px-3 py-2 mb-1.5">
          <div class="flex items-center justify-between text-sm">
            <div>
              <span class="font-bold">{{ m.invited_email }}</span>
              <span class="text-[var(--c-muted)] text-xs"> — {{ m.role === 'vet' ? 'بيطري' : 'عامل' }}</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded-full font-bold mr-1"
                    [class.bg-amber-100]="m.status === 'pending'" [class.text-amber-700]="m.status === 'pending'"
                    [class.bg-green-100]="m.status === 'active'" [class.text-green-700]="m.status === 'active'"
                    [class.bg-gray-200]="m.status === 'revoked' || m.status === 'rejected'" [class.text-gray-500]="m.status === 'revoked' || m.status === 'rejected'">
                {{ statusLabel(m.status) }}
              </span>
            </div>
            <div class="flex gap-2 flex-shrink-0">
              <button *ngIf="m.status !== 'revoked'" (click)="openEditMember(m)" class="text-xs text-blue-600 font-bold">✏️ تعديل</button>
              <button *ngIf="m.status !== 'revoked'" (click)="revokeMember(m)" class="text-xs text-red-500 font-bold">🗑️ إلغاء</button>
            </div>
          </div>

          <!-- ✏️ فورم التعديل — صلاحيات + تقييد قطعان -->
          <div *ngIf="editingMemberId() === m.id" class="mt-2 bg-white rounded-lg p-3 space-y-2 border">
            <select [(ngModel)]="editForm.role" class="form-input text-xs w-full">
              <option value="worker">عامل مزرعة</option>
              <option value="vet">طبيب بيطري</option>
            </select>
            <label class="flex items-center gap-2 text-xs">
              <input type="checkbox" [(ngModel)]="editForm.can_add_records"/> يقدر يسجل بيانات يومية
            </label>
            <label class="flex items-center gap-2 text-xs">
              <input type="checkbox" [(ngModel)]="editForm.can_view_financials"/> يقدر يشوف البيانات المالية
            </label>

            <div class="border-t pt-2">
              <p class="text-xs font-bold text-gray-600 mb-1">القطعان المسموح له بيها</p>
              <label class="flex items-center gap-2 text-xs mb-1.5">
                <input type="checkbox" [checked]="editFlockIds().length === 0" (change)="setUnrestricted()"/>
                كل قطعانك (بدون تقييد)
              </label>
              <div *ngIf="editFlockIds().length > 0 || myFlocks().length" class="max-h-32 overflow-y-auto space-y-1">
                <label *ngFor="let f of myFlocks()" class="flex items-center gap-2 text-xs">
                  <input type="checkbox" [checked]="editFlockIds().includes(f.id)" (change)="toggleFlockScope(f.id)"/>
                  {{ f.name }}
                </label>
              </div>
            </div>

            <div class="flex gap-2">
              <button (click)="saveEditMember(m)" class="flex-1 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold">حفظ</button>
              <button (click)="editingMemberId.set(null)" class="flex-1 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold">إلغاء</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 🏠 تبويب القطعان المشتركة (للعضو) -->
    <div *ngIf="activeTab() === 'shared'">
      <div class="card">
        <h2 class="section-title mb-3">قطعان مشاركة معاك</h2>
        <div *ngIf="sharedFlocks().length === 0" class="text-center py-4 text-[var(--c-muted)] text-sm">
          مفيش قطعان مشتركة معاك دلوقتي. لو حد دعاك، لازم تقبل الدعوة الأول من اللينك اللي بعتهولك.
        </div>
        <div *ngFor="let f of sharedFlocks()" class="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-3 mb-1.5">
          <div (click)="openSharedFlock(f)" class="cursor-pointer flex-1">
            <span class="font-bold">{{ f.name }}</span>
            <span class="text-[var(--c-muted)] text-xs"> — {{ f.type }}</span>
          </div>
          <button (click)="leaveFarm(f)" class="text-xs text-red-500 font-bold flex-shrink-0 ml-2">🚪 سيب المزرعة</button>
          <span (click)="openSharedFlock(f)" class="text-green-600 text-sm font-bold cursor-pointer">فتح ←</span>
        </div>
      </div>
    </div>

    <!-- 📋 نشاط الفريق — كل حاجة حصلت (تسجيل بيانات، انضمام، مغادرة، دعوات) في مكان واحد -->
    <div *ngIf="activeTab() === 'activity'">
      <div class="card">
        <h2 class="section-title mb-3">نشاط الفريق</h2>
        <div *ngIf="activityFeed().length === 0" class="text-center py-4 text-[var(--c-muted)] text-sm">
          مفيش أي نشاط من الفريق مسجل لسه.
        </div>
        <div *ngFor="let ev of activityFeed()" class="flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2.5 mb-1.5">
          <span class="text-lg flex-shrink-0">{{ activityIcon(ev.type) }}</span>
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <span class="font-bold text-sm">{{ ev.title_ar }}</span>
              <span class="text-[10px] text-[var(--c-muted)] flex-shrink-0">{{ ev.created_at | date:'short' }}</span>
            </div>
            <p class="text-xs text-[var(--c-muted)] mt-0.5">{{ ev.message_ar }}</p>
            <span *ngIf="ev.flock_name" class="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600 font-bold mt-1 inline-block">{{ ev.flock_name }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
  `,
})
export class TeamComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);

  activeTab = signal<'invite' | 'shared' | 'activity'>('invite');
  activityFeed = signal<any[]>([]);
  members = signal<any[]>([]);
  sharedFlocks = signal<any[]>([]);
  pendingInvites = signal<any[]>([]);
  inviting = signal(false);
  lastInviteLink = signal<string | null>(null);

  // ✏️ تعديل صلاحيات/تقييد قطعان عضو موجود
  editingMemberId = signal<string | null>(null);
  editFlockIds = signal<string[]>([]);
  myFlocks = signal<any[]>([]);
  editForm: { role: string; can_add_records: boolean; can_view_financials: boolean } = {
    role: 'worker', can_add_records: true, can_view_financials: false,
  };

  inviteForm: { invited_email: string; role: string; can_add_records: boolean; can_view_financials: boolean } = {
    invited_email: '', role: 'worker', can_add_records: true, can_view_financials: false,
  };

  ngOnInit() {
    this.loadMembers();
    this.loadSharedFlocks();
    this.loadPendingInvites();
    this.loadMyFlocks();
    this.loadActivityFeed();
  }

  loadActivityFeed() {
    this.http.get<any[]>(`${environment.apiUrl}/farm-members/activity-feed`, { headers: this.headers() })
      .subscribe({ next: (res) => this.activityFeed.set(res || []), error: () => this.activityFeed.set([]) });
  }

  activityIcon(type: string): string {
    return ({
      member_activity: '📝', farm_invite: '✉️', member_joined: '✅', member_left: '🚪',
    } as Record<string, string>)[type] ?? '🔔';
  }

  loadMyFlocks() {
    this.http.get<any[]>(`${environment.apiUrl}/flocks`, { headers: this.headers() })
      .subscribe({ next: (res) => this.myFlocks.set(res || []), error: () => this.myFlocks.set([]) });
  }

  openEditMember(m: any) {
    this.editingMemberId.set(m.id);
    this.editForm = { role: m.role, can_add_records: m.can_add_records, can_view_financials: m.can_view_financials };
    this.http.get<any>(`${environment.apiUrl}/farm-members/${m.id}/flocks`, { headers: this.headers() })
      .subscribe({
        next: (res) => this.editFlockIds.set(res?.flock_ids || []),
        error: () => this.editFlockIds.set([]),
      });
  }

  setUnrestricted() { this.editFlockIds.set([]); }

  toggleFlockScope(flockId: string) {
    const current = this.editFlockIds();
    this.editFlockIds.set(
      current.includes(flockId) ? current.filter(id => id !== flockId) : [...current, flockId]
    );
  }

  saveEditMember(m: any) {
    this.http.patch(`${environment.apiUrl}/farm-members/${m.id}`, this.editForm, { headers: this.headers() })
      .subscribe({
        next: () => {
          this.http.put(`${environment.apiUrl}/farm-members/${m.id}/flocks`, { flock_ids: this.editFlockIds() }, { headers: this.headers() })
            .subscribe({
              next: () => { this.editingMemberId.set(null); this.loadMembers(); },
              error: () => alert('اتحفظت الصلاحيات، لكن حصل خطأ في حفظ تقييد القطعان'),
            });
        },
        error: () => alert('حصل خطأ أثناء حفظ التعديلات'),
      });
  }

  leaveFarm(f: any) {
    if (!confirm(`متأكد إنك عايز تسيب المزرعة دي؟ مش هتقدر توصل لقطيع "${f.name}" تاني إلا لو اتدعيت من جديد.`)) return;
    this.http.post(`${environment.apiUrl}/farm-members/leave/${f.owner_user_id}`, {}, { headers: this.headers() })
      .subscribe({ next: () => this.loadSharedFlocks(), error: () => alert('حصل خطأ أثناء مغادرة المزرعة') });
  }

  loadPendingInvites() {
    this.http.get<any[]>(`${environment.apiUrl}/farm-members/pending-for-me`, { headers: this.headers() })
      .subscribe({ next: (res) => this.pendingInvites.set(res || []), error: () => this.pendingInvites.set([]) });
  }

  acceptInvite(inv: any) {
    this.http.post(`${environment.apiUrl}/farm-members/${inv.id}/accept`, {}, { headers: this.headers() })
      .subscribe({
        next: () => { this.loadPendingInvites(); this.loadSharedFlocks(); },
        error: () => alert('حصل خطأ أثناء قبول الدعوة'),
      });
  }

  rejectInvite(inv: any) {
    this.http.post(`${environment.apiUrl}/farm-members/${inv.id}/reject`, {}, { headers: this.headers() })
      .subscribe({ next: () => this.loadPendingInvites(), error: () => alert('حصل خطأ أثناء رفض الدعوة') });
  }

  // 📱 مشاركة لينك الدعوة عبر واتساب/تيليجرام — مجرد رابط، مفيش API ولا حساب مدفوع مطلوب
  private shareText(): string {
    return `تم دعوتك للانضمام كعضو مشارك في إدارة القطعان. اضغط الرابط عشان توافق: ${this.lastInviteLink()}`;
  }
  whatsappShareUrl(): string {
    return `https://wa.me/?text=${encodeURIComponent(this.shareText())}`;
  }
  telegramShareUrl(): string {
    return `https://t.me/share/url?url=${encodeURIComponent(this.lastInviteLink() || '')}&text=${encodeURIComponent('تم دعوتك للانضمام كعضو مشارك في إدارة القطعان')}`;
  }

  private headers() {
    const token = localStorage.getItem('spa_token'); // ⚠️ وحّد الاسم ده مع باقي الملفات
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  loadMembers() {
    this.http.get<any[]>(`${environment.apiUrl}/farm-members`, { headers: this.headers() })
      .subscribe({ next: (res) => this.members.set(res || []), error: () => this.members.set([]) });
  }

  loadSharedFlocks() {
    this.http.get<any[]>(`${environment.apiUrl}/flocks/shared`, { headers: this.headers() })
      .subscribe({ next: (res) => this.sharedFlocks.set(res || []), error: () => this.sharedFlocks.set([]) });
  }

  sendInvite() {
    if (!this.inviteForm.invited_email) return;
    this.inviting.set(true);
    this.http.post<any>(`${environment.apiUrl}/farm-members/invite`, this.inviteForm, { headers: this.headers() })
      .subscribe({
        next: (res) => {
          this.inviting.set(false);
          // ⚠️ ده لينك افتراضي لحد ما تربطه بمسار /join-farm فعلي عندك + إرسال إيميل حقيقي
          this.lastInviteLink.set(`${window.location.origin}/join-farm/${res.id}`);
          this.inviteForm = { invited_email: '', role: 'worker', can_add_records: true, can_view_financials: false };
          this.loadMembers();
        },
        error: () => { this.inviting.set(false); alert('حصل خطأ أثناء إرسال الدعوة'); },
      });
  }

  revokeMember(m: any) {
    if (!confirm(`متأكد إنك عايز تلغي صلاحية ${m.invited_email}؟`)) return;
    this.http.delete(`${environment.apiUrl}/farm-members/${m.id}`, { headers: this.headers() })
      .subscribe({ next: () => this.loadMembers(), error: () => alert('حصل خطأ أثناء الإلغاء') });
  }

  openSharedFlock(f: any) {
    this.router.navigate(['/flocks', f.id]);
  }

  statusLabel(status: string): string {
    return ({ pending: 'بانتظار الموافقة', active: 'نشط', revoked: 'ملغي' } as Record<string, string>)[status] ?? status;
  }
}
