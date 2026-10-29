import { Component, Input, Output, EventEmitter, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment'; // ⚠️ عدّل المسار حسب مكان الملف عندك
import { AuthService } from '../../core/services/auth.service'; // ⚠️ عدّل المسار حسب مكان الملف عندك

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

    <!-- View: قطيع واحد: كارت واحد فيه الصحة والإحصائيات -->
    <div *ngIf="viewMode() === 'single' && !loading() && data() as d"
         class="rounded-2xl border border-gray-100 bg-white shadow-sm p-4 mb-5">

      <div class="text-sm text-gray-500 mb-3">{{ d.flock_name }}</div>

      <div class="flex items-center gap-2">
        <!-- الدايرة -->
        <div class="relative w-20 h-20 flex-shrink-0">
          <svg class="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="#f1f5f9" stroke-width="7"/>
            <circle cx="40" cy="40" r="34" fill="none" [attr.stroke]="ringColor(d.status)"
                    stroke-width="7" stroke-linecap="round"
                    [attr.stroke-dasharray]="213.6"
                    [attr.stroke-dashoffset]="213.6 - (213.6 * d.score / 100)"
                    style="transition: stroke-dashoffset 0.6s ease"/>
          </svg>
          <div class="absolute inset-0 flex items-center justify-center">
            <span class="text-2xl font-medium" [class]="textClass(d.status)">{{ d.score }}</span>
          </div>
        </div>

        <!-- الإحصائيات -->
        <div class="flex-1 bg-gray-50 rounded-xl py-3 text-center">
          <div class="text-base leading-none mb-1">🐣</div>
          <div class="text-lg font-medium text-gray-800 leading-tight">{{ birds !== null ? (birds | number) : '—' }}</div>
          <div class="text-[11px] text-gray-400">إجمالي الطيور</div>
        </div>
        <div class="flex-1 bg-gray-50 rounded-xl py-3 text-center">
          <div class="text-base leading-none mb-1">📉</div>
          <div class="text-lg font-medium text-red-600 leading-tight">{{ dead !== null ? (dead | number) : '—' }}</div>
          <div class="text-[11px] text-gray-400">النفوق</div>
        </div>
        <div class="flex-1 bg-gray-50 rounded-xl py-3 text-center">
          <div class="text-base leading-none mb-1">🌡️</div>
          <div class="text-lg font-medium text-gray-800 leading-tight">{{ temp !== null ? temp + '°' : '—' }}</div>
          <div class="text-[11px] text-gray-400">الحرارة</div>
        </div>
      </div>

      <div class="text-xs mt-2" [class]="textClass(d.status)">صحة القطيع</div>

      <!-- 🔎 أسباب النقص -->
      <div *ngIf="d.factors.length" class="border-t border-gray-100 pt-3 mt-3">
        <button type="button" (click)="showFactors.set(!showFactors())"
                class="w-full flex items-center justify-between text-xs font-medium text-red-600 bg-red-50 rounded-lg px-2.5 py-2">
          <span>⚠️ في {{ d.factors.length }} سبب نقص {{ 100 - d.score }} درجة</span>
          <span>{{ showFactors() ? 'إخفاء ▲' : 'عرض التفاصيل ▼' }}</span>
        </button>

        <div *ngIf="showFactors()" class="space-y-1.5 mt-2">
          <button *ngFor="let f of d.factors" type="button" (click)="factorClick.emit(f)"
                  class="w-full flex items-center justify-between text-xs bg-red-50 hover:bg-red-100 transition-colors rounded-lg px-2.5 py-1.5 text-right">
            <span class="text-gray-700 font-medium">{{ f.label }}</span>
            <span class="flex items-center gap-1 flex-shrink-0">
              <span class="text-red-500 font-black">{{ f.impact }}</span>
              <span class="text-red-300">←</span>
            </span>
          </button>
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

  /** بينبعت لما المستخدم يدوس على سبب نقص معين — الصفحة الأب هي اللي تقرر تودّيه فين بالظبط */
  @Output() factorClick = new EventEmitter<HealthFactor>();

  /** بيتبعت لما القطيع المعروض يتغيّر، عشان الصفحة الأب تجيب إحصائياته */
  @Output() flockSelected = new EventEmitter<string>();

  /** إحصائيات القطيع المعروض (بتجيلها من الصفحة الأب) */
  @Input() birds: number | null = null;
  @Input() dead: number | null = null;
  @Input() temp: number | null = null;

  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private destroyRef = inject(DestroyRef);
  private allFetched = false;
  data = signal<HealthScoreData | null>(null);
  showFactors = signal(false);
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

  // 💾 حفظ آخر قايمة قطعان ودرجات الصحة على الجهاز (موبايل بس، ومربوط بـ id المستخدم)
  private cacheKey(): string | null {
    if (!this.auth.isNative) return null;
    const u: any = this.auth.currentUser();
    const id = u?.id ?? u?.user_id;
    return id == null || id === '' ? null : `health_cache_v1_${id}`;
  }

  private readCache(): any {
    const k = this.cacheKey();
    if (!k) return {};
    try { return JSON.parse(localStorage.getItem(k) || 'null') || {}; } catch { return {}; }
  }

  private writeCache(patch: any): void {
    const k = this.cacheKey();
    if (!k) return;
    try { localStorage.setItem(k, JSON.stringify({ ...this.readCache(), ...patch })); } catch { /* مش مشكلة */ }
  }

  private onOnline = () => {
    this.allFetched = false;
    this.loadFlocksList();
    if (this.viewMode() === 'all') this.showAllFlocks();
  };

  ngOnInit() {
    // عرض المحفوظ فوراً لحد ما السيرفر يرد
    const c = this.readCache();
    if (Array.isArray(c.flocks) && c.flocks.length) {
      this.flocksList.set(c.flocks);
      const wanted = this.flockId ?? c.selected;
      this.selectedFlockId.set(c.flocks.some((f: any) => f.id === wanted) ? wanted : c.flocks[0].id);
    }
    this.loadFlocksList();
    // 🌐 أول ما النت يرجع نحدّث
    window.addEventListener('online', this.onOnline);
    this.destroyRef.onDestroy(() => window.removeEventListener('online', this.onOnline));
  }

  /** بتجيب قايمة كل القطعان بتاعت المستخدم، وتفلتر القطعان المغلقة (status !== 'active') قبل ما تعرضها */
  loadFlocksList() {
    this.http.get<{ id: string; name: string; status?: string }[]>(`${environment.apiUrl}/flocks/`).subscribe({
      next: (flocks) => {
        // ⚠️ لو عندك اسم حالة مختلف عن "active" (زي "open" أو "ongoing")، عدّل الشرط ده
        const activeOnly = (flocks || []).filter(f => !f.status || f.status === 'active');
        this.flocksList.set(activeOnly);
        this.writeCache({ flocks: activeOnly.map(f => ({ id: f.id, name: f.name })) });
        // القطيع المبدئي: اللي جاي من @Input لو موجود (وكان نشط)، وإلا أول قطيع نشط في القايمة
        const initial = (this.flockId && activeOnly.some(f => f.id === this.flockId))
          ? this.flockId
          : activeOnly[0]?.id;
        this.selectedFlockId.set(initial);
        this.writeCache({ selected: initial });
        this.load();
      },
      error: () => {
        // فشل جلب القايمة مش لازم يوقف عرض الكارت — نكمل بالـ flockId الأصلي لو موجود
        // أوفلاين: بنكمل بالمحفوظ (لو فيه) أو بالـ flockId الأصلي
        this.selectedFlockId.set(this.selectedFlockId() ?? this.flockId);
        this.load();
      }
    });
  }

  showSingleFlock(id: string) {
    this.viewMode.set('single');
    if (this.selectedFlockId() !== id) {
      this.selectedFlockId.set(id);
      this.writeCache({ selected: id });
      this.load();
    }
  }

  /** بيجيب صحة كل القطعان مرة واحدة (طلب لكل قطيع) ويرتبهم من الأسوأ للأحسن */
  showAllFlocks() {
    this.viewMode.set('all');
    if (this.allFetched) return; // متجيبهاش تاني لو أصلاً اتحدّثت من السيرفر

    // عرض آخر نسخة محفوظة فوراً (لو فيه) ونحدّث في الخلفية
    const cachedAll = this.readCache().all;
    if (this.allFlocksData().length === 0 && Array.isArray(cachedAll) && cachedAll.length) {
      this.allFlocksData.set(cachedAll);
    }
    this.allFlocksLoading.set(this.allFlocksData().length === 0);
    const requests = this.flocksList().map(f =>
      this.http.get<HealthScoreData>(`${environment.apiUrl}/ai/health-score?flock_id=${f.id}`)
        .pipe(map(res => ({ ...res, flock_id: f.id })))
    );

    forkJoin(requests).subscribe({
      next: (results) => {
        // الأسوأ حالاً (أقل سكور) فوق، عشان يلفت النظر الأول
        const sorted = results.sort((a, b) => a.score - b.score);
        this.allFlocksData.set(sorted);
        this.allFetched = true;
        this.writeCache({ all: sorted });
        this.allFlocksLoading.set(false);
      },
      error: () => {
        this.allFlocksLoading.set(false);
      }
    });
  }

  load() {
    this.error.set(false);
    this.showFactors.set(false); // نقفل تفاصيل الأسباب لما نغيّر القطيع/نعيد التحميل
    const id = this.selectedFlockId();
    if (id) this.flockSelected.emit(id);

    // آخر درجة صحة محفوظة للقطيع ده تظهر فوراً (وتفضل لو السيرفر مردّش)
    const cachedScore: HealthScoreData | undefined = id ? this.readCache().scores?.[id] : undefined;
    if (cachedScore) this.data.set(cachedScore);
    this.loading.set(!cachedScore);
    const params = id ? `?flock_id=${id}` : '';

    this.http.get<HealthScoreData>(`${environment.apiUrl}/ai/health-score${params}`).subscribe({
      next: (res) => {
        this.data.set(res);
        this.loading.set(false);
        if (id) this.writeCache({ scores: { ...(this.readCache().scores || {}), [id]: res } });
      },
      error: () => {
        this.loading.set(false);
        // لو فيه نسخة محفوظة معروضة بنسيبها؛ الخطأ بيظهر بس لو مفيش حاجة نعرضها
        if (!cachedScore) this.error.set(true);
      }
    });
  }
}