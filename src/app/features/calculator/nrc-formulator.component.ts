import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Preferences } from '@capacitor/preferences';
import {
  formulate, FormulaResult, FormulaCheck, getProfileGroups, getIngredients, getAttrLabel, isInSet,
  profileTable, EDITABLE_ATTRS, PREMIX_PCT, SET_LABELS, ProfileGroup, ProfileInfo, IngredientInfo,
} from './feed-formulator-engine';

const STORAGE_KEY = 'nrc_formulator_v1';
const DEFAULT_PROFILE = 'layer_peak';

/** أسماء مختصرة للقيم عشان تتحط في شبكة صغيرة على الموبايل */
const SHORT_LABELS: Record<string, string> = {
  me: 'طاقة (ك.كالوري)', cp: 'بروتين %', lys: 'ليسين %', met: 'ميثيونين %', mc: 'ميث+سيست %',
  ca: 'كالسيوم %', avp: 'فوسفور متاح %', p: 'فوسفور كلي %', na: 'صوديوم %', cf: 'ألياف %',
  ndf: 'NDF %', adl: 'ADL %',
};

@Component({
  selector: 'app-nrc-formulator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div>

    <!-- Header -->
    <div class="rounded-3xl text-white px-6 py-5 mb-4"
         style="background:linear-gradient(135deg,#1e1b4b 0%,#4f46e5 100%)">
      <h1 class="text-xl font-bold">🧬 حاسبة NRC لتركيب العلف</h1>
      <p class="text-white/70 text-sm mt-1">أقل تكلفة تحقق احتياج النوع والمرحلة</p>
    </div>

    <!-- 1) النوع والمرحلة -->
    <div class="card space-y-4 mb-4">
      <div>
        <label class="form-label">🐾 النوع</label>
        <select [(ngModel)]="groupId" (ngModelChange)="onGroupChange()" class="form-input">
          <option *ngFor="let g of groups" [value]="g.id">{{ g.icon }} {{ g.label }}</option>
        </select>
      </div>

      <div>
        <label class="form-label">📈 المرحلة</label>
        <select [(ngModel)]="profileKey" (ngModelChange)="onProfileChange()" class="form-input">
          <option *ngFor="let p of stages()" [value]="p.key">{{ p.ar }}</option>
        </select>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="form-label">⚖️ كمية الخلطة (كجم)</label>
          <input type="number" min="1" [(ngModel)]="batchKg" class="form-input" placeholder="100"/>
        </div>
        <div *ngIf="profile().isPerDay">
          <label class="form-label">🍽️ علف الدجاجة/يوم (جم)</label>
          <input type="number" min="50" [(ngModel)]="intakeG" class="form-input" placeholder="150"/>
        </div>
      </div>

      <p class="text-[11px] text-gray-400 leading-relaxed">
        📚 المصدر: {{ profile().src }}
      </p>
    </div>

    <!-- 2) الخامات والأسعار -->
    <div class="card mb-4">
      <button (click)="showIngredients.set(!showIngredients())"
              class="w-full flex items-center justify-between text-sm font-bold text-gray-700">
        <span>🌾 الخامات والأسعار <span class="text-xs font-normal text-gray-400">({{ availableCount() }} من {{ ingList.length }} متاحة)</span></span>
        <span>{{ showIngredients() ? '▲' : '▼' }}</span>
      </button>

      <div *ngIf="showIngredients()" class="mt-3 space-y-3">
        <p class="text-xs text-gray-500 leading-relaxed">
          علّم على الخامات اللي عندك، واكتب سعرك الفعلي بالجنيه للكجم. الأسعار الافتراضية <b>أرقام نسبية للمثال فقط</b> (الذرة = 1).
        </p>

        <div class="flex gap-2 flex-wrap">
          <button *ngFor="let s of setIds" (click)="applySet(s)"
                  class="text-xs px-3 py-1.5 rounded-full border border-indigo-200 text-indigo-700 bg-indigo-50">
            {{ setLabel(s) }}
          </button>
        </div>

        <div *ngFor="let i of ingList" class="border border-gray-100 rounded-xl p-2"
             [class.opacity-50]="!isAvailable(i.key)">
          <div class="flex items-center gap-2">
            <input type="checkbox" [checked]="isAvailable(i.key)" (change)="toggleIngredient(i.key)"
                   class="w-4 h-4 flex-shrink-0"/>
            <span class="text-sm flex-1 min-w-0 truncate">{{ i.ar }}</span>
            <input type="number" step="any" min="0" class="form-input text-sm py-1 px-2 w-24 flex-shrink-0"
                   [placeholder]="'' + i.price" [ngModel]="priceValue(i.key)"
                   (ngModelChange)="setPrice(i.key, $event)"/>
            <button (click)="toggleLab(i.key)" class="text-base flex-shrink-0"
                    [class.opacity-40]="labCount(i.key) === 0" title="تحليل معملي">🔬</button>
          </div>

          <div *ngIf="openLab() === i.key" class="mt-2 pt-2 border-t border-gray-100">
            <p class="text-[11px] text-gray-500 mb-2">
              لو عندك تحليل معملي للخامة دي اكتب القيم (% على أساس العلف الطازج). الفاضي بياخد القيمة النموذجية.
            </p>
            <div class="grid grid-cols-3 gap-2">
              <div *ngFor="let a of editableAttrs()">
                <label class="text-[10px] text-gray-500 block">{{ shortLabel(a) }}</label>
                <input type="number" step="any" class="form-input text-xs py-1 px-2"
                       [placeholder]="'' + i.values[a]" [ngModel]="labValue(i.key, a)"
                       (ngModelChange)="setLab(i.key, a, $event)"/>
              </div>
            </div>
            <button *ngIf="labCount(i.key) > 0" (click)="resetLab(i.key)"
                    class="text-xs text-red-500 mt-2">↺ رجّع القيم النموذجية</button>
          </div>
        </div>

        <div class="border border-gray-100 rounded-xl p-2 flex items-center gap-2">
          <span class="text-sm flex-1">💊 سعر البريمكس (جنيه/كجم)</span>
          <input type="number" step="any" min="0" class="form-input text-sm py-1 px-2 w-24"
                 placeholder="12" [(ngModel)]="premixPrice"/>
        </div>
      </div>
    </div>

    <!-- زر الحساب -->
    <button (click)="calculate()" class="btn-primary btn w-full py-3 text-base mb-4">🧮 احسب التركيبة</button>

    <!-- النتيجة -->
    <div *ngIf="result() as r" id="nrc-result" class="space-y-4">

      <!-- مفيش حل -->
      <div *ngIf="!r.formula_pct" class="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
        ❌ {{ r.message }}
      </div>

      <ng-container *ngIf="r.formula_pct">

        <!-- حالة القيود -->
        <div *ngIf="r.ok" class="bg-green-50 border border-green-200 rounded-2xl p-3 text-sm text-green-700 font-semibold">
          ✅ كل القيود الغذائية متحققة
        </div>
        <div *ngIf="!r.ok" class="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-sm text-amber-800">
          ⚠️ فيه {{ failedChecks(r).length }} قيد مش متحقق. خفّف حدود خامة أو أضف الأحماض الأمينية أو الصويا (من قايمة الخامات) وجرّب تاني.
        </div>

        <!-- التركيبة -->
        <div class="card">
          <p class="text-sm font-bold text-gray-700 mb-3">📋 التركيبة ({{ r.ar }})</p>
          <div class="grid grid-cols-12 text-[11px] text-gray-400 pb-1 border-b">
            <span class="col-span-6">الخامة</span>
            <span class="col-span-3 text-center">النسبة %</span>
            <span class="col-span-3 text-center">كجم</span>
          </div>
          <div *ngFor="let row of formulaRows(r)" class="grid grid-cols-12 py-1.5 border-b border-gray-50 text-sm">
            <span class="col-span-6 truncate">{{ row.name }}</span>
            <span class="col-span-3 text-center font-semibold">{{ row.pct | number:'1.2-2' }}</span>
            <span class="col-span-3 text-center text-gray-600">{{ row.kg | number:'1.0-2' }}</span>
          </div>
          <div class="grid grid-cols-12 py-1.5 border-b border-gray-50 text-sm text-indigo-700">
            <span class="col-span-6">💊 بريمكس (من المورّد)</span>
            <span class="col-span-3 text-center font-semibold">{{ r.premix_pct | number:'1.2-2' }}</span>
            <span class="col-span-3 text-center">{{ r.premix_kg | number:'1.0-2' }}</span>
          </div>
          <div class="grid grid-cols-12 pt-2 text-sm font-bold">
            <span class="col-span-6">الإجمالي</span>
            <span class="col-span-3 text-center">100</span>
            <span class="col-span-3 text-center">{{ lastBatch | number:'1.0-2' }}</span>
          </div>
        </div>

        <!-- التكلفة -->
        <div class="rounded-2xl p-4 text-center text-white" style="background:linear-gradient(135deg,#1e1b4b 0%,#4f46e5 100%)">
          <ng-container *ngIf="allRealPrices(r); else relativeCost">
            <p class="text-xs text-white/70">تكلفة الكجم</p>
            <p class="text-2xl font-black">{{ r.cost_index_per_kg | number:'1.2-2' }} جنيه</p>
            <p class="text-xs text-white/70 mt-1">إجمالي الخلطة ({{ lastBatch | number:'1.0-2' }} كجم): {{ (r.cost_index_per_kg || 0) * lastBatch | number:'1.0-0' }} جنيه</p>
          </ng-container>
          <ng-template #relativeCost>
            <p class="text-xs text-white/70">رقم تكلفة نسبي للكجم</p>
            <p class="text-2xl font-black">{{ r.cost_index_per_kg | number:'1.2-2' }}</p>
            <p class="text-xs text-white/70 mt-1">اكتب أسعارك الفعلية لكل الخامات المستخدمة (والبريمكس) عشان تطلع التكلفة بالجنيه</p>
          </ng-template>
        </div>

        <!-- القيود الغذائية -->
        <div class="card">
          <p class="text-sm font-bold text-gray-700 mb-3">🔍 التحليل الغذائي مقابل الاحتياج</p>
          <div *ngFor="let ch of r.checks" class="flex items-center gap-2 py-1.5 border-b border-gray-50 text-sm">
            <span class="w-5 flex-shrink-0">{{ ch.ok ? '✅' : '❌' }}</span>
            <span class="flex-1 min-w-0">{{ ch.label }}</span>
            <span class="font-semibold" [class.text-red-600]="!ch.ok">{{ ch.value }}</span>
            <span class="text-[11px] text-gray-400 w-20 text-left flex-shrink-0" dir="ltr">{{ reqText(ch) }}</span>
          </div>
          <p *ngIf="r.analysis && r.analysis['ca_p_ratio']" class="text-xs text-gray-500 mt-3">
            نسبة كالسيوم/فوسفور: <b>{{ r.analysis['ca_p_ratio'] | number:'1.1-1' }}</b>
          </p>
        </div>

      </ng-container>

      <!-- ملاحظات مهمة -->
      <div class="bg-gray-50 rounded-2xl p-4 text-xs text-gray-600 leading-relaxed space-y-1.5">
        <p *ngIf="groupNote()">📌 {{ groupNote() }}</p>
        <p>💊 البريمكس (فيتامينات ومعادن) محسوب بنسبة {{ premixPct }}% — اشتريه حسب نوع الطائر وأضفه بنسبة المورّد.</p>
        <p>🧪 قيم الخامات نموذجية وبتختلف من شحنة لشحنة؛ استبدلها بتحليل معملي لو متاح.</p>
        <p>📉 أرقام NRC 1994 قديمة نسبياً؛ السلالات الحديثة قد تحتاج أكثر.</p>
        <p>🧑‍⚕️ النتيجة لا تغني عن مختص تغذية. جرّب على دفعة صغيرة وتابع الأداء.</p>
      </div>
    </div>

  </div>
  `
})
export class NrcFormulatorComponent implements OnInit {
  groups: ProfileGroup[] = getProfileGroups();
  setIds = ['basic', 'local', 'all'];
  premixPct = PREMIX_PCT;

  groupId = '';
  profileKey = DEFAULT_PROFILE;
  batchKg: number | null = 100;
  intakeG: number | null = null;
  premixPrice: number | null = null;
  lastBatch = 100;

  ingList: IngredientInfo[] = [];

  excluded = signal<string[]>([]);
  prices = signal<Record<string, number>>({});
  lab = signal<Record<string, Record<string, Record<string, number>>>>({ poultry: {}, rabbit: {} });
  result = signal<FormulaResult | null>(null);
  showIngredients = signal(false);
  openLab = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    this.setProfile(DEFAULT_PROFILE);
    let loaded = false;
    try {
      const { value } = await Preferences.get({ key: STORAGE_KEY });
      if (value) {
        const s = JSON.parse(value);
        if (s.profileKey && this.findProfile(s.profileKey)) this.setProfile(s.profileKey);
        this.batchKg = s.batchKg ?? 100;
        this.intakeG = s.intakeG ?? null;
        this.premixPrice = s.premixPrice ?? null;
        this.prices.set(s.prices ?? {});
        this.lab.set({ poultry: {}, rabbit: {}, ...(s.lab ?? {}) });
        if (Array.isArray(s.excluded)) { this.excluded.set(s.excluded); loaded = true; }
      }
    } catch (e) {
      console.error('فشل قراءة إعدادات NRC المحفوظة:', e);
    }
    // أول مرة (مفيش إعدادات محفوظة): الخامات المحلية. من غير حفظ هنا عشان ما نمسحش إعدادات قديمة بالغلط
    if (!loaded) this.applySet('local', false);
  }

  private async persist(): Promise<void> {
    try {
      await Preferences.set({
        key: STORAGE_KEY,
        value: JSON.stringify({
          profileKey: this.profileKey, batchKg: this.batchKg, intakeG: this.intakeG, premixPrice: this.premixPrice,
          excluded: this.excluded(), prices: this.prices(), lab: this.lab(),
        }),
      });
    } catch (e) {
      console.error('فشل حفظ إعدادات NRC:', e);
    }
  }

  // ── النوع والمرحلة ──
  private findProfile(key: string): ProfileInfo | undefined {
    for (const g of this.groups) {
      const p = g.profiles.find(x => x.key === key);
      if (p) return p;
    }
    return undefined;
  }

  private setProfile(key: string): void {
    this.profileKey = key;
    this.groupId = this.groups.find(g => g.profiles.some(p => p.key === key))?.id ?? this.groups[0].id;
    this.ingList = getIngredients(key);
  }

  stages(): ProfileInfo[] {
    return this.groups.find(g => g.id === this.groupId)?.profiles ?? [];
  }

  profile(): ProfileInfo {
    return this.findProfile(this.profileKey) ?? this.groups[0].profiles[0];
  }

  onGroupChange(): void {
    const first = this.stages()[0];
    if (first) { this.profileKey = first.key; this.onProfileChange(); }
  }

  onProfileChange(): void {
    const hadList = this.ingList.length > 0;
    const hadRabbit = this.ingList.some(i => i.key === 'alfalfa_hay');
    this.ingList = getIngredients(this.profileKey);
    const nowRabbit = this.ingList.some(i => i.key === 'alfalfa_hay');
    // لو اتنقلنا بين جدول الدواجن وجدول الأرانب: الخامات مختلفة، فنرجع للخامات المحلية
    if (hadList && hadRabbit !== nowRabbit) this.applySet('local');
    this.openLab.set(null);
    this.result.set(null);
  }

  // ── الخامات ──
  setLabel(s: string): string { return SET_LABELS[s]; }
  isAvailable(key: string): boolean { return !this.excluded().includes(key); }
  availableCount(): number { return this.ingList.filter(i => this.isAvailable(i.key)).length; }

  toggleIngredient(key: string): void {
    const cur = this.excluded();
    this.excluded.set(cur.includes(key) ? cur.filter(k => k !== key) : [...cur, key]);
    this.persist();
  }

  applySet(setId: string, save = true): void {
    this.excluded.set(this.ingList.filter(i => !isInSet(this.profileKey, setId, i.key)).map(i => i.key));
    if (save) this.persist();
  }

  // ── الأسعار ──
  priceValue(key: string): number | null { return this.prices()[key] ?? null; }

  setPrice(key: string, v: number | null): void {
    const next = { ...this.prices() };
    if (v === null || v === undefined || !isFinite(Number(v)) || Number(v) <= 0) delete next[key];
    else next[key] = Number(v);
    this.prices.set(next);
    this.persist();
  }

  // ── التحليل المعملي ──
  editableAttrs(): string[] { return EDITABLE_ATTRS[profileTable(this.profileKey)]; }
  shortLabel(a: string): string { return SHORT_LABELS[a] ?? getAttrLabel(a); }
  toggleLab(key: string): void { this.openLab.set(this.openLab() === key ? null : key); }

  private tbl(): string { return profileTable(this.profileKey); }
  labValue(key: string, attr: string): number | null { return this.lab()[this.tbl()]?.[key]?.[attr] ?? null; }
  labCount(key: string): number { return Object.keys(this.lab()[this.tbl()]?.[key] ?? {}).length; }

  setLab(key: string, attr: string, v: number | null): void {
    const t = this.tbl();
    const all = { ...this.lab() };
    const table = { ...(all[t] ?? {}) };
    const ing = { ...(table[key] ?? {}) };
    if (v === null || v === undefined || !isFinite(Number(v)) || Number(v) < 0) delete ing[attr];
    else ing[attr] = Number(v);
    if (Object.keys(ing).length) table[key] = ing; else delete table[key];
    all[t] = table;
    this.lab.set(all);
    this.persist();
  }

  resetLab(key: string): void {
    const t = this.tbl();
    const all = { ...this.lab() };
    const table = { ...(all[t] ?? {}) };
    delete table[key];
    all[t] = table;
    this.lab.set(all);
    this.persist();
  }

  // ── الحساب ──
  calculate(): void {
    const batch = Number(this.batchKg) > 0 ? Number(this.batchKg) : 100;
    this.lastBatch = batch;
    const info = this.profile();
    const premix = Number(this.premixPrice) > 0 ? Number(this.premixPrice) : undefined;
    try {
      this.result.set(formulate(this.profileKey, {
        prices: this.prices(),
        ingredientOverrides: this.lab()[this.tbl()] ?? {},
        exclude: this.excluded(),
        batchKg: batch,
        only: 'all',
        intakeG: info.isPerDay && Number(this.intakeG) > 0 ? Number(this.intakeG) : null,
        premixPrice: premix,
      }));
    } catch (e) {
      console.error('فشل حساب التركيبة:', e);
      this.result.set({ profile: this.profileKey, ok: false, message: 'حصل خطأ أثناء الحساب، حاول تاني' });
    }
    this.persist();
    setTimeout(() => document.getElementById('nrc-result')?.scrollIntoView({ behavior: 'smooth' }), 100);
  }

  // ── عرض النتيجة ──
  formulaRows(r: FormulaResult): { name: string; pct: number; kg: number }[] {
    return Object.entries(r.formula_pct ?? {})
      .sort((a, b) => b[1] - a[1])
      .map(([k, pct]) => ({ name: r.names?.[k] ?? k, pct, kg: r.batch_kg?.[k] ?? 0 }));
  }

  failedChecks(r: FormulaResult): FormulaCheck[] { return (r.checks ?? []).filter(c => !c.ok); }

  reqText(ch: FormulaCheck): string {
    const lo = ch.min !== null && ch.min !== undefined;
    const hi = ch.max !== null && ch.max !== undefined;
    if (lo && hi) return ch.min + ' – ' + ch.max;
    if (lo) return '≥ ' + ch.min;
    if (hi) return '≤ ' + ch.max;
    return '';
  }

  /** هل كل الخامات المستخدمة (والبريمكس) ليها سعر فعلي من المستخدم؟ */
  allRealPrices(r: FormulaResult): boolean {
    const used = Object.keys(r.formula_pct ?? {});
    return used.length > 0 && used.every(k => (this.prices()[k] ?? 0) > 0) && Number(this.premixPrice) > 0;
  }

  groupNote(): string {
    const g = this.groupId;
    if (g === 'broiler_ross' || g === 'broiler_cobb' || g === 'broiler_breeder')
      return 'التسمين السريع وأمهات التسمين الحديثة: راجع دليل الشركة لأنه أدق من NRC 1994.';
    if (g === 'muscovy' || g === 'pigeon' || g === 'mulard' || g === 'goose')
      return 'مفيش جدول NRC خاص بالنوع ده (الأرقام من أبحاث منشورة ومراجع قريبة)، فالدقة أقل من باقي الأنواع.';
    return '';
  }
}
