import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment'; // ⚠️ عدّل المسار حسب مكان الملف عندك

interface HealthFactor {
  impact: number;
  label: string;
}

interface HealthScoreData {
  flock_id: string;
  flock_name: string;
  score: number;
  stars: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  factors: HealthFactor[];
}

@Component({
  selector: 'app-health-score-widget',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- شريط التحكم: تابات القطعان + زرار عرض الكل -->
    <div *ngIf="flocksList().length > 1" class="flex items-center gap-2 mb-2">
      <div class="flex gap-2 overflow-x-auto pb-1 flex-1">
        <button *ngFor="let f of flocksList()"
                (click)="showSingleFlock(f.id)"
                class="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
                [class]="(viewMode() === 'single' && selectedFlockId() === f.id)
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 text-gray-500'">
          {{ f.name }}
        </button>
      </div>
      <button (click)="showAllFlocks()"
              class="flex-shrink-0 text-xs font-black px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
              [class]="viewMode() === 'all' ? 'bg-indigo-500 text-white' : 'bg-indigo-50 text-indigo-600'">
        📋 كل القطعان
      </button>
    </div>

    <!-- View: كل القطعان في قائمة مختصرة -->
    <div *ngIf="viewMode() === 'all'" class="rounded-2xl border-2 border-gray-100 bg-white shadow-sm overflow-hidden">
      <div class="p-3 border-b bg-gray-50">
        <span class="text-xs font-black text-gray-500">صحة كل القطعان — الأسوأ حالاً فوق</span>
      </div>

      <div *ngIf="allFlocksLoading()" class="p-4 space-y-2">
        <div class="h-12 bg-gray-100 rounded-xl animate-pulse" *ngFor="let i of [1,2,3]"></div>
      </div>

      <div *ngIf="!allFlocksLoading()" class="divide-y">
        <button *ngFor="let d of allFlocksData()" (click)="showSingleFlock(d.flock_id)"
                class="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors text-right">
          <div class="flex items-center gap-2.5">
            <div class="w-2 h-8 rounded-full" [class]="barClass(d.status)"></div>
            <div>
              <div class="text-sm font-bold text-gray-800">{{ d.flock_name }}</div>
              <span class="text-[10px] font-black px-1.5 py-0.5 rounded-full" [class]="badgeClass(d.status)">
                {{ statusLabel(d.status) }}
              </span>
            </div>
          </div>
          <span class="text-lg font-black" [class]="textClass(d.status)">{{ d.score }}</span>
        </button>
      </div>
    </div>

    <!-- View: قطيع واحد بالتفصيل -->
    <div *ngIf="viewMode() === 'single' && !loading() && data() as d" class="rounded-2xl border-2 overflow-hidden bg-white shadow-sm"
         [class]="borderClass(d.status)">

      <!-- شريط علوي ملوّن حسب الحالة -->
      <div class="h-1.5" [class]="barClass(d.status)"></div>

      <div class="p-4">
        <!-- الهيدر: اسم القطيع + badge الحالة -->
        <div class="flex items-center justify-between mb-4">
          <div>
            <div class="text-[11px] text-gray-400 font-medium">صحة القطيع</div>
            <div class="text-sm font-black text-gray-800">{{ d.flock_name }}</div>
          </div>
          <span class="text-[11px] font-black px-2.5 py-1 rounded-full" [class]="badgeClass(d.status)">
            {{ statusLabel(d.status) }}
          </span>
        </div>

        <!-- العداد الدائري + النجوم -->
        <div class="flex items-center gap-4 mb-4">
          <div class="relative w-20 h-20 flex-shrink-0">
            <svg class="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="#f1f5f9" stroke-width="8"/>
              <circle cx="40" cy="40" r="34" fill="none" [attr.stroke]="ringColor(d.status)"
                      stroke-width="8" stroke-linecap="round"
                      [attr.stroke-dasharray]="213.6"
                      [attr.stroke-dashoffset]="213.6 - (213.6 * d.score / 100)"
                      style="transition: stroke-dashoffset 0.6s ease"/>
            </svg>
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="text-xl font-black" [class]="textClass(d.status)">{{ d.score }}</span>
            </div>
          </div>

          <div class="flex-1">
            <div class="text-lg leading-none mb-1">{{ '⭐'.repeat(d.stars) }}{{ '☆'.repeat(5 - d.stars) }}</div>
            <div class="text-[11px] text-gray-400">من 100 نقطة</div>
          </div>
        </div>

        <!-- الأسباب -->
        <div *ngIf="d.factors.length" class="space-y-1.5 border-t pt-3">
          <div class="text-[11px] font-black text-gray-500 mb-2">⚠️ أسباب نقص {{ 100 - d.score }} درجة</div>
          <div *ngFor="let f of d.factors" class="flex items-center justify-between text-xs bg-red-50 rounded-lg px-2.5 py-1.5">
            <span class="text-gray-700 font-medium">{{ f.label }}</span>
            <span class="text-red-500 font-black flex-shrink-0">{{ f.impact }}</span>
          </div>
        </div>

        <div *ngIf="!d.factors.length" class="flex items-center gap-2 text-xs text-green-700 font-black bg-green-50 rounded-lg px-3 py-2.5 border-t-0">
          <span class="text-base">✅</span>
          <span>مفيش أي مشاكل مسجلة — القطيع في أحسن حال</span>
        </div>
      </div>
    </div>

    <div *ngIf="viewMode() === 'single' && loading()" class="rounded-2xl border-2 border-gray-100 p-4 bg-white h-40">
      <div class="flex items-center justify-between mb-4">
        <div class="space-y-1.5">
          <div class="h-2.5 w-16 bg-gray-100 rounded animate-pulse"></div>
          <div class="h-3 w-24 bg-gray-100 rounded animate-pulse"></div>
        </div>
        <div class="h-5 w-14 bg-gray-100 rounded-full animate-pulse"></div>
      </div>
      <div class="flex items-center gap-4">
        <div class="w-20 h-20 rounded-full bg-gray-100 animate-pulse"></div>
        <div class="flex-1 h-4 bg-gray-100 rounded animate-pulse"></div>
      </div>
    </div>

    <div *ngIf="error()" class="rounded-2xl border-2 border-dashed border-gray-200 p-6 bg-gray-50 text-xs text-gray-400 text-center">
      🐔 مفيش قطيع نشط لعرض صحته دلوقتي
    </div>
  `
})
export class HealthScoreWidgetComponent implements OnInit {
  @Input() flockId?: string;

  private http = inject(HttpClient);
  data = signal<HealthScoreData | null>(null);
  loading = signal(true);
  error = signal(false);

  flocksList = signal<{ id: string; name: string }[]>([]);
  selectedFlockId = signal<string | undefined>(undefined);

  viewMode = signal<'single' | 'all'>('single');
  allFlocksData = signal<HealthScoreData[]>([]);
  allFlocksLoading = signal(false);

  private readonly styles = {
    excellent: { border: 'border-green-200', bar: 'bg-green-400', badge: 'bg-green-100 text-green-700', text: 'text-green-600', ring: '#22c55e', label: 'ممتازة' },
    good:      { border: 'border-blue-200',  bar: 'bg-blue-400',  badge: 'bg-blue-100 text-blue-700',   text: 'text-blue-600',  ring: '#3b82f6', label: 'جيدة' },
    warning:   { border: 'border-amber-200', bar: 'bg-amber-400', badge: 'bg-amber-100 text-amber-700', text: 'text-amber-600', ring: '#f59e0b', label: 'تحتاج انتباه' },
    critical:  { border: 'border-red-200',   bar: 'bg-red-400',   badge: 'bg-red-100 text-red-700',     text: 'text-red-600',  ring: '#ef4444', label: 'حرجة' },
  } as const;

  borderClass = (status: HealthScoreData['status']) => this.styles[status]?.border ?? this.styles.good.border;
  barClass = (status: HealthScoreData['status']) => this.styles[status]?.bar ?? this.styles.good.bar;
  badgeClass = (status: HealthScoreData['status']) => this.styles[status]?.badge ?? this.styles.good.badge;
  textClass = (status: HealthScoreData['status']) => this.styles[status]?.text ?? this.styles.good.text;
  ringColor = (status: HealthScoreData['status']) => this.styles[status]?.ring ?? this.styles.good.ring;
  statusLabel = (status: HealthScoreData['status']) => this.styles[status]?.label ?? this.styles.good.label;

  ngOnInit() {
    this.loadFlocksList();
  }

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('spa_token'); // ⚠️ وحّد الاسم ده مع باقي الملفات
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  /** بتجيب قايمة كل القطعان بتاعت المستخدم، وتفلتر القطعان المغلقة (status !== 'active') قبل ما تعرضها */
  loadFlocksList() {
    this.http.get<{ id: string; name: string; status?: string }[]>(`${environment.apiUrl}/flocks/`, { headers: this.authHeaders() }).subscribe({
      next: (flocks) => {
        // ⚠️ لو عندك اسم حالة مختلف عن "active" (زي "open" أو "ongoing")، عدّل الشرط ده
        const activeOnly = (flocks || []).filter(f => !f.status || f.status === 'active');
        this.flocksList.set(activeOnly);
        // القطيع المبدئي: اللي جاي من @Input لو موجود (وكان نشط)، وإلا أول قطيع نشط في القايمة
        const initial = (this.flockId && activeOnly.some(f => f.id === this.flockId))
          ? this.flockId
          : activeOnly[0]?.id;
        this.selectedFlockId.set(initial);
        this.load();
      },
      error: () => {
        // فشل جلب القايمة مش لازم يوقف عرض الكارت — نكمل بالـ flockId الأصلي لو موجود
        this.selectedFlockId.set(this.flockId);
        this.load();
      }
    });
  }

  showSingleFlock(id: string) {
    this.viewMode.set('single');
    if (this.selectedFlockId() !== id) {
      this.selectedFlockId.set(id);
      this.load();
    }
  }

  /** بيجيب صحة كل القطعان مرة واحدة (طلب لكل قطيع) ويرتبهم من الأسوأ للأحسن */
  showAllFlocks() {
    this.viewMode.set('all');
    if (this.allFlocksData().length > 0) return; // متجيبهاش تاني لو أصلاً محملة

    this.allFlocksLoading.set(true);
    const requests = this.flocksList().map(f =>
      this.http.get<HealthScoreData>(`${environment.apiUrl}/ai/health-score?flock_id=${f.id}`, { headers: this.authHeaders() })
        .pipe(map(res => ({ ...res, flock_id: f.id })))
    );

    forkJoin(requests).subscribe({
      next: (results) => {
        // الأسوأ حالاً (أقل سكور) فوق، عشان يلفت النظر الأول
        this.allFlocksData.set(results.sort((a, b) => a.score - b.score));
        this.allFlocksLoading.set(false);
      },
      error: () => {
        this.allFlocksLoading.set(false);
      }
    });
  }

  load() {
    this.loading.set(true);
    this.error.set(false);
    const id = this.selectedFlockId();
    const params = id ? `?flock_id=${id}` : '';

    this.http.get<HealthScoreData>(`${environment.apiUrl}/ai/health-score${params}`, { headers: this.authHeaders() }).subscribe({
      next: (res) => {
        this.data.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      }
    });
  }
}