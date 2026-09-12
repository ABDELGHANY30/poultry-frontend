import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AdminService, AdminUser, AiLog, AdminStats, ArticlePayload, PriceStoreData } from '../../core/services/admin.service';

type Tab = 'stats' | 'prices' | 'users' | 'content' | 'logs';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
  <div class="page-wrapper">

    <!-- Header -->
    <div class="rounded-3xl text-white px-6 py-5 flex items-center gap-4 mb-4"
         style="background:linear-gradient(135deg,#1e1b4b 0%,#3730a3 100%)">
      <div class="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-2xl flex-shrink-0">⚙️</div>
      <div class="flex-1">
        <h1 class="text-lg font-black">{{ 'ADMIN.TITLE' | translate }}</h1>
        <p class="text-white/60 text-sm">{{ 'ADMIN.SUBTITLE' | translate }}</p>
      </div>
      <span class="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">Admin</span>
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 flex-wrap mb-4">
      <button *ngFor="let t of TABS" class="btn btn-sm"
        [class.bg-indigo-700]="tab() === t.key" [class.text-white]="tab() === t.key"
        [class.btn-ghost]="tab() !== t.key"
        (click)="tab.set(t.key)">
        {{ t.icon }} {{ t.label }}
      </button>
    </div>

    <!-- Loading Indicator -->
    <div *ngIf="loading()" class="py-12 text-center">
      <span class="loading loading-spinner loading-lg text-primary"></span>
      <p class="text-sm text-[var(--c-muted)] mt-2">جاري تحميل البيانات...</p>
    </div>

    <div *ngIf="!loading()">

      <!-- ══ STATS ══ -->
      <div *ngIf="tab() === 'stats'" class="space-y-5 animate-in">
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div class="card text-center py-4 animate-in" *ngFor="let s of computedStats()">
            <div class="text-2xl mb-1">{{ s.icon }}</div>
            <p class="text-xl font-black" [style.color]="s.color">{{ s.value }}</p>
            <p class="text-[10px] text-[var(--c-muted)] font-semibold mt-0.5">{{ s.label | translate }}</p>
          </div>
        </div>
      </div>

      <!-- ══ PRICES MANAGEMENT ══ -->
      <div *ngIf="tab() === 'prices'" class="animate-in">
        <div class="card">
          <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 class="section-title mb-0">💰 إدارة أسعار المستلزمات والمعدات</h2>
              <p class="text-xs text-[var(--c-muted)]">أي تعديل هنا سينعكس فوراً على حاسبة التكاليف للمستخدمين</p>
            </div>
            <button class="btn btn-primary" [disabled]="isSubmitting()" (click)="savePrices()">
              <span *ngIf="isSubmitting()" class="loading loading-spinner loading-xs"></span>
              💾 حفظ التغييرات
            </button>
          </div>

          <div *ngIf="priceSuccessMsg()" class="alert alert-success text-sm py-2 mb-4">
            ✅ {{ priceSuccessMsg() }}
          </div>

          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div *ngFor="let item of priceItemsList()" class="p-3 border border-gray-200 rounded-xl bg-gray-50/50 flex flex-col justify-between">
              <div class="flex justify-between items-start mb-2">
                <span class="font-bold text-sm text-gray-800">{{ item.value.label }}</span>
                <span class="badge badge-sm badge-neutral">{{ item.value.unit }}</span>
              </div>
              <div class="flex items-center gap-2 mt-1">
                <input 
                  type="number" 
                  class="form-input text-lg font-black text-indigo-700 w-full" 
                  [(ngModel)]="item.value.price" 
                  min="0"
                />
                <span class="text-xs font-bold text-gray-500 flex-shrink-0">ج.م</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ══ USERS ══ -->
      <div *ngIf="tab() === 'users'" class="animate-in">
        <div class="card overflow-hidden">
          <div class="flex items-center justify-between mb-4">
            <h2 class="section-title mb-0">👥 {{ 'ADMIN.USERS' | translate }}</h2>
            <span class="badge badge-info">{{ users().length }} {{ 'ADMIN.TOTAL_USERS' | translate }}</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-[var(--c-border)]">
                  <th class="text-start pb-3 text-xs font-bold text-[var(--c-muted)] uppercase ps-1">{{ 'ADMIN.USER' | translate }}</th>
                  <th class="text-start pb-3 text-xs font-bold text-[var(--c-muted)] uppercase">{{ 'ADMIN.ROLE' | translate }}</th>
                  <th class="text-center pb-3 text-xs font-bold text-[var(--c-muted)] uppercase">{{ 'ADMIN.FLOCKS' | translate }}</th>
                  <th class="text-start pb-3 text-xs font-bold text-[var(--c-muted)] uppercase">{{ 'ADMIN.JOINED' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let u of users()" class="border-b border-gray-50 hover:bg-gray-50">
                  <td class="py-3 ps-1">
                    <div class="flex items-center gap-2.5">
                      <div class="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black flex-shrink-0">
                        {{ (u.name || u.email || 'U').charAt(0) }}
                      </div>
                      <div>
                        <p class="font-bold text-sm">{{ u.name || 'مستخدم' }}</p>
                        <p class="text-[10px] text-[var(--c-faint)]">{{ u.email }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="py-3">
                    <span class="badge" [class.badge-info]="u.role==='admin'" [class.badge-neutral]="u.role==='farmer' || u.role==='user'">{{ u.role }}</span>
                  </td>
                  <td class="py-3 text-center font-bold text-indigo-600">{{ u.flocks ?? 0 }}</td>
                  <td class="py-3 text-xs text-[var(--c-muted)]">{{ u.created_at ? (u.created_at | date:'mediumDate') : '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ══ CONTENT ══ -->
      <div *ngIf="tab() === 'content'" class="animate-in">
        <div class="card border-2 border-dashed border-indigo-200">
          <h2 class="section-title">➕ {{ 'ADMIN.ADD_ARTICLE' | translate }}</h2>
          <div class="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label class="form-label">{{ 'ADMIN.TITLE_EN' | translate }}</label>
              <input class="form-input" [(ngModel)]="newArt.titleEn" placeholder="Article title in English" />
            </div>
            <div>
              <label class="form-label">{{ 'ADMIN.TITLE_AR' | translate }}</label>
              <input class="form-input" [(ngModel)]="newArt.titleAr" placeholder="عنوان المقالة" dir="rtl" />
            </div>
            <div>
              <label class="form-label">{{ 'ADMIN.CATEGORY' | translate }}</label>
              <select class="form-select" [(ngModel)]="newArt.category">
                <option value="broiler">🐔 Broiler</option>
                <option value="disease">🔬 Disease</option>
                <option value="vaccine">💉 Vaccine</option>
                <option value="feeding">🌾 Feeding</option>
                <option value="hygiene">🧹 Hygiene</option>
              </select>
            </div>
            <div>
              <label class="form-label">{{ 'ADMIN.TAGS' | translate }}</label>
              <input class="form-input" [(ngModel)]="newArt.tags" placeholder="vaccine, broiler, day14" />
            </div>
          </div>
          <div class="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label class="form-label">{{ 'ADMIN.CONTENT_EN' | translate }}</label>
              <textarea class="form-input" [(ngModel)]="newArt.contentEn" rows="7" placeholder="Full English content (Markdown)..."></textarea>
            </div>
            <div>
              <label class="form-label">{{ 'ADMIN.CONTENT_AR' | translate }}</label>
              <textarea class="form-input" [(ngModel)]="newArt.contentAr" rows="7" dir="rtl" placeholder="المحتوى العربي..."></textarea>
            </div>
          </div>
          <div class="flex items-center gap-4 flex-wrap">
            <button class="btn-primary btn" [disabled]="isSubmitting()" (click)="publishArticle()">
              <span *ngIf="isSubmitting()" class="loading loading-spinner loading-xs"></span>
              ✓ {{ 'ADMIN.PUBLISH' | translate }}
            </button>
          </div>
        </div>
      </div>

      <!-- ══ AI LOGS ══ -->
      <div *ngIf="tab() === 'logs'" class="animate-in">
        <div class="card">
          <h2 class="section-title mb-4">🤖 {{ 'ADMIN.AI_LOGS' | translate }}</h2>
          <div class="space-y-3">
            <div *ngFor="let log of logs()" class="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-none">
              <div class="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-xs flex-shrink-0">
                {{ (log.user_name || 'U').charAt(0) }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-bold">{{ log.user_name || 'مستخدم' }} - <span class="text-[10px] text-gray-400">{{ log.created_at | date:'medium' }}</span></p>
                <p class="text-xs text-gray-600 italic mt-0.5">"{{ log.query }}"</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

  </div>
  `,
})
export class AdminPanelComponent implements OnInit {
  private adminService = inject(AdminService);

  tab = signal<Tab>('stats');
  loading = signal<boolean>(true);
  isSubmitting = signal<boolean>(false);
  priceSuccessMsg = signal<string>('');

  // Signals للبيانات
  stats = signal<AdminStats>({
    total_users: 0,
    total_flocks: 0,
    ai_queries_today: 0,
    articles_count: 0,
    active_alerts: 0,
    new_users_this_week: 0
  });

  users = signal<AdminUser[]>([]);
  logs = signal<AiLog[]>([]);
  priceData = signal<PriceStoreData>({ items: {}, last_updated: null });

  newArt: ArticlePayload = { titleEn: '', titleAr: '', category: 'broiler', tags: '', contentEn: '', contentAr: '' };

  readonly TABS = [
    { key: 'stats' as Tab, icon: '📊', label: 'الإحصائيات' },
    { key: 'prices' as Tab, icon: '💰', label: 'إدارة الأسعار' },
    { key: 'users' as Tab, icon: '👥', label: 'المستخدمين' },
    { key: 'content' as Tab, icon: '📝', label: 'المقالات' },
    { key: 'logs' as Tab, icon: '🤖', label: 'سجلات الذكاء' },
  ];

  computedStats = computed(() => [
    { icon: '👥', value: this.stats().total_users, label: 'ADMIN.S.USERS', color: '#1d4ed8' },
    { icon: '🐔', value: this.stats().total_flocks, label: 'ADMIN.S.FLOCKS', color: '#1e7d48' },
    { icon: '🤖', value: this.stats().ai_queries_today, label: 'ADMIN.S.AI_TODAY', color: '#7c3aed' },
    { icon: '📚', value: this.stats().articles_count, label: 'ADMIN.S.ARTICLES', color: '#92400e' },
    { icon: '🔔', value: this.stats().active_alerts, label: 'ADMIN.S.ALERTS', color: '#dc2626' },
    { icon: '💉', value: this.stats().new_users_this_week || 0, label: 'ADMIN.S.VACC', color: '#0284c7' },
  ]);

  priceItemsList = computed(() => {
    const items = this.priceData().items || {};
    return Object.keys(items).map(key => ({
      key: key,
      value: items[key]
    }));
  });

  ngOnInit() {
    this.loadAdminData();
    this.loadPrices();
  }

  loadAdminData() {
    this.loading.set(true);
    this.adminService.getStats().subscribe({ next: (data) => this.stats.set(data), error: () => {} });
    this.adminService.getUsers().subscribe({ next: (data) => this.users.set(data), error: () => {} });
    this.adminService.getAiLogs().subscribe({
      next: (data) => {
        this.logs.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  loadPrices() {
    this.adminService.getPrices().subscribe({
      next: (data) => this.priceData.set(data),
      error: (err) => console.error('خطأ في جلب الأسعار:', err)
    });
  }

  savePrices() {
    this.isSubmitting.set(true);
    const updatedPrices: { [key: string]: number } = {};
    const currentItems = this.priceData().items;

    Object.keys(currentItems).forEach(key => {
      updatedPrices[key] = currentItems[key].price;
    });

    this.adminService.updatePrices(updatedPrices).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.priceSuccessMsg.set('تم حفظ وتحديث الأسعار بنجاح في النظام!');
        setTimeout(() => this.priceSuccessMsg.set(''), 4000);
      },
      error: (err) => {
        console.error('خطأ أثناء حفظ الأسعار:', err);
        this.isSubmitting.set(false);
      }
    });
  }

  publishArticle() {
    if (!this.newArt.titleEn || !this.newArt.titleAr) return;
    this.isSubmitting.set(true);
    this.adminService.publishArticle(this.newArt).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.newArt = { titleEn: '', titleAr: '', category: 'broiler', tags: '', contentEn: '', contentAr: '' };
      },
      error: () => this.isSubmitting.set(false)
    });
  }
}