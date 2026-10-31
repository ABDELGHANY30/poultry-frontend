import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Preferences } from '@capacitor/preferences';
import {
  formulate, FormulaResult, FormulaCheck, getProfileGroups, getIngredients, getAttrLabel, isInSet,
  profileTable, EDITABLE_ATTRS, PREMIX_PCT, SET_LABELS, ProfileGroup, ProfileInfo, IngredientInfo,
  INGREDIENT_GROUPS, IngredientGroup, getIngredientNote,
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
    <div class="rounded-3xl text-white px-6 py-4 mb-4"
         style="background:linear-gradient(135deg,#1e1b4b 0%,#4f46e5 100%)">
      <h1 class="text-lg font-bold">🧬 تركيب العلف</h1>
      <p class="text-white/70 text-xs mt-0.5">اختار الطائر والمرحلة وهتظهر لك الخلطة على طول</p>
    </div>

    <!-- الاختيارات -->
    <div class="card space-y-4 mb-4">

      <div>
        <p class="text-sm font-bold text-gray-700 mb-2">1️⃣ اختار الطائر</p>
        <div class="grid grid-cols-3 gap-2">
          <button *ngFor="let g of groups" (click)="pickGroup(g.id)"
                  class="rounded-2xl py-2.5 px-1 text-center border-2 transition-all"
                  [class.border-indigo-500]="groupId === g.id" [class.bg-indigo-50]="groupId === g.id"
                  [class.border-gray-100]="groupId !== g.id" [class.bg-white]="groupId !== g.id">
            <div class="text-2xl leading-none">{{ g.icon }}</div>
            <div class="text-[11px] font-semibold leading-tight mt-1 text-gray-700">{{ g.label }}</div>
          </button>
        </div>
      </div>

      <div>
        <p class="text-sm font-bold text-gray-700 mb-2">2️⃣ المرحلة</p>
        <select [ngModel]="profileKey" (ngModelChange)="profileKey = $event; onProfileChange()" class="form-input">
          <option *ngFor="let p of stages()" [value]="p.key">{{ stageLabel(p) }}</option>
        </select>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <p class="text-sm font-bold text-gray-700 mb-2">3️⃣ الكمية (كجم)</p>
          <input type="number" min="1" [ngModel]="batchKg" (ngModelChange)="batchKg = $event; calculate()"
                 class="form-input" placeholder="100"/>
        </div>
        <div *ngIf="profile().isPerDay">
          <p class="text-sm font-bold text-gray-700 mb-2">علف الدجاجة/يوم (جم)</p>
          <input type="number" min="50" [ngModel]="intakeG" (ngModelChange)="intakeG = $event; calculate()"
                 class="form-input" placeholder="150"/>
        </div>
      </div>
    </div>

    <!-- النتيجة -->
    <div *ngIf="result() as r" class="space-y-4">

      <div *ngIf="!r.formula_pct" class="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
        ❌ {{ r.message }}
        <button (click)="showAdvanced.set(true)" class="block mt-2 text-indigo-700 font-semibold">⚙️ افتح الخامات وفعّل خامات أكتر</button>
      </div>

      <div *ngIf="r.formula_pct" class="card">
        <p class="text-base font-bold text-gray-800">🌾 الخلطة لـ {{ lastBatch | number:'1.0-2' }} كجم</p>
        <p class="text-xs text-gray-400 mb-3">{{ stageLabel(profile()) }}</p>

        <div *ngFor="let row of formulaRows(r)" class="flex items-center gap-2 py-2.5 border-b border-gray-100">
          <div class="flex-1 min-w-0">
            <p class="text-sm text-gray-800">{{ row.name }}</p>
            <p *ngIf="row.note" class="text-[11px] text-gray-400">{{ row.note }}</p>
          </div>
          <span class="text-base font-black text-gray-900">{{ row.kg | number:'1.0-1' }} <span class="text-xs font-normal text-gray-400">كجم</span></span>
          <span class="text-[11px] text-gray-400 w-12 text-left" dir="ltr">{{ row.pct | number:'1.0-1' }}%</span>
          <button (click)="toggleIngredient(row.key)" class="text-gray-300 text-lg leading-none px-1" title="مش عندي الخامة دي">✕</button>
        </div>

        <div class="flex items-center gap-2 py-2.5 text-indigo-700">
          <span class="flex-1 text-sm">💊 بريمكس (فيتامينات ومعادن)</span>
          <span class="text-base font-black">{{ r.premix_kg | number:'1.0-2' }} <span class="text-xs font-normal">كجم</span></span>
          <span class="w-12"></span><span class="w-6"></span>
        </div>

        <p class="text-[11px] text-gray-400 mt-1">لو في خامة مش عندك اضغط ✕ جنبها وهتتغير الخلطة.</p>

        <div *ngIf="r.ok" class="mt-3 bg-green-50 rounded-xl px-3 py-2 text-sm text-green-700 font-semibold">
          ✅ الخلطة مطابقة لاحتياج الطائر
        </div>
        <div *ngIf="!r.ok" class="mt-3 bg-amber-50 rounded-xl px-3 py-2 text-sm text-amber-800">
          ⚠️ الخلطة مش مطابقة تماماً (فيه {{ failedChecks(r).length }} قيد). جرّب تفعّل خامات أكتر من الخيارات المتقدمة.
        </div>

        <div *ngIf="allRealPrices(r)" class="mt-3 bg-indigo-50 rounded-xl px-3 py-2 text-sm text-indigo-800">
          💰 التكلفة: <b>{{ r.cost_index_per_kg | number:'1.2-2' }}</b> جنيه/كجم —
          إجمالي <b>{{ (r.cost_index_per_kg || 0) * lastBatch | number:'1.0-0' }}</b> جنيه
        </div>

        <button (click)="showDetails.set(!showDetails())" class="mt-3 text-xs text-indigo-700 font-semibold">
          {{ showDetails() ? '▲ إخفاء' : '▼ عرض' }} التحليل الغذائي
        </button>
        <div *ngIf="showDetails()" class="mt-2">
          <div *ngFor="let ch of r.checks" class="flex items-center gap-2 py-1.5 border-b border-gray-50 text-sm">
            <span class="w-5 flex-shrink-0">{{ ch.ok ? '✅' : '❌' }}</span>
            <span class="flex-1 min-w-0">{{ ch.label }}</span>
            <span class="font-semibold" [class.text-red-600]="!ch.ok">{{ ch.value }}</span>
            <span class="text-[11px] text-gray-400 w-20 text-left flex-shrink-0" dir="ltr">{{ reqText(ch) }}</span>
          </div>
          <p class="text-[11px] text-gray-400 mt-2">📚 المصدر: {{ r.src }}</p>
        </div>
      </div>
    </div>

    <!-- خيارات متقدمة (مخفية) -->
    <div class="card mt-4">
      <button (click)="showAdvanced.set(!showAdvanced())"
              class="w-full flex items-center justify-between text-sm font-bold text-gray-600">
        <span>⚙️ خيارات متقدمة <span class="text-xs font-normal text-gray-400">(الخامات، الأسعار، التحليل المعملي)</span></span>
        <span>{{ showAdvanced() ? '▲' : '▼' }}</span>
      </button>

      <div *ngIf="showAdvanced()" class="mt-3 space-y-3">
        <p class="text-xs text-gray-500 leading-relaxed">
          اختار الخامات اللي تقدر تشتريها: <b>✔️ متاحة</b> / بدون علامة = مش متاحة. تحت كل خامة مكتوب بتضيف إيه.
          الأملاح والأحماض الأمينية خليها متاحة لو تقدر، لأنها بتساعد في ضبط الخلطة.
          واكتب سعرك بالجنيه للكجم لو عايز التكلفة.
        </p>

        <div class="flex gap-2 flex-wrap">
          <button *ngFor="let s of setIds" (click)="applySet(s)"
                  class="text-xs px-3 py-1.5 rounded-full border border-indigo-200 text-indigo-700 bg-indigo-50">
            {{ setLabel(s) }}
          </button>
        </div>

        <div *ngFor="let sec of ingSections" class="space-y-2">
          <div class="pt-2">
            <p class="text-xs font-bold text-gray-700">{{ sec.group.icon }} {{ sec.group.label }}</p>
            <p class="text-[11px] text-gray-400">{{ sec.group.hint }}</p>
          </div>

          <div *ngFor="let i of sec.items" class="border border-gray-100 rounded-xl p-2"
               [class.opacity-50]="!isAvailable(i.key)">
            <div class="flex items-center gap-2">
              <input type="checkbox" [checked]="isAvailable(i.key)" (change)="toggleIngredient(i.key)"
                     class="w-5 h-5 flex-shrink-0"/>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-800">{{ i.ar }}</p>
                <p *ngIf="i.note" class="text-[11px] text-gray-500">{{ i.note }}</p>
                <div class="flex flex-wrap gap-1 mt-1">
                  <span *ngFor="let st of i.stats" class="text-[10px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{{ st }}</span>
                </div>
              </div>
              <div class="flex-shrink-0 text-center">
                <input type="number" step="any" min="0" class="form-input text-sm py-1 px-2 w-20"
                       [placeholder]="'' + i.price" [ngModel]="priceValue(i.key)"
                       (ngModelChange)="setPrice(i.key, $event)"/>
                <span class="text-[10px] text-gray-400">جنيه/كجم</span>
              </div>
              <button (click)="toggleLab(i.key)" class="text-base flex-shrink-0"
                      [class.opacity-40]="labCount(i.key) === 0" title="تحليل معملي">🔬</button>
            </div>

            <div *ngIf="openLab() === i.key" class="mt-2 pt-2 border-t border-gray-100">
              <p class="text-[11px] text-gray-500 mb-2">
                لو عندك تحليل معملي للخامة اكتب القيم (% على أساس العلف الطازج). الفاضي بياخد القيمة النموذجية.
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
        </div>

        <div class="border border-gray-100 rounded-xl p-2 flex items-center gap-2">
          <span class="text-sm flex-1">💊 سعر البريمكس (جنيه/كجم)</span>
          <input type="number" step="any" min="0" class="form-input text-sm py-1 px-2 w-24"
                 placeholder="12" [ngModel]="premixPrice" (ngModelChange)="premixPrice = $event; calculate()"/>
        </div>
      </div>
    </div>

    <!-- تنبيه -->
    <p class="text-[11px] text-gray-400 leading-relaxed mt-4 px-1">
      <span *ngIf="groupNote()">📌 {{ groupNote() }} </span>
      البريمكس بنسبة {{ premixPct }}% — اشتريه حسب نوع الطائر. أرقام NRC 1994 قديمة نسبياً، والنتيجة لا تغني عن مختص تغذية؛ جرّب على دفعة صغيرة.
    </p>

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
  ingSections: { group: IngredientGroup; items: IngredientInfo[] }[] = [];

  excluded = signal<string[]>([]);
  prices = signal<Record<string, number>>({});
  lab = signal<Record<string, Record<string, Record<string, number>>>>({ poultry: {}, rabbit: {} });
  result = signal<FormulaResult | null>(null);
  showIngredients = signal(false);
  openLab = signal<string | null>(null);
  showAdvanced = signal(false);
  showDetails = signal(false);

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
    this.calculate();
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
    this.buildSections();
  }

  private buildSections(): void {
    this.ingSections = INGREDIENT_GROUPS
      .map(g => ({ group: g, items: this.ingList.filter(i => i.group === g.id) }))
      .filter(sec => sec.items.length > 0);
  }

  stages(): ProfileInfo[] {
    return this.groups.find(g => g.id === this.groupId)?.profiles ?? [];
  }

  profile(): ProfileInfo {
    return this.findProfile(this.profileKey) ?? this.groups[0].profiles[0];
  }

  pickGroup(id: string): void {
    this.groupId = id;
    this.onGroupChange();
  }

  /** اسم المرحلة من غير تكرار اسم الطائر (الموجود فوق) */
  stageLabel(p: ProfileInfo): string {
    const parts = p.ar.split(' — ');
    if (parts.length < 2) return p.ar;
    let label = parts.slice(1).join(' — ');
    const m = parts[0].match(/\(([^)]*)\)/);
    if (m) label += ' · ' + m[1];
    return label;
  }

  onGroupChange(): void {
    const first = this.stages()[0];
    if (first) { this.profileKey = first.key; this.onProfileChange(); }
  }

  onProfileChange(): void {
    const hadList = this.ingList.length > 0;
    const hadRabbit = this.ingList.some(i => i.key === 'alfalfa_hay');
    this.ingList = getIngredients(this.profileKey);
    this.buildSections();
    const nowRabbit = this.ingList.some(i => i.key === 'alfalfa_hay');
    // لو اتنقلنا بين جدول الدواجن وجدول الأرانب: الخامات مختلفة، فنرجع للخامات المحلية
    if (hadList && hadRabbit !== nowRabbit) this.applySet('local');
    this.openLab.set(null);
    this.calculate();
  }

  // ── الخامات ──
  setLabel(s: string): string { return SET_LABELS[s]; }
  isAvailable(key: string): boolean { return !this.excluded().includes(key); }
  availableCount(): number { return this.ingList.filter(i => this.isAvailable(i.key)).length; }

  toggleIngredient(key: string): void {
    const cur = this.excluded();
    this.excluded.set(cur.includes(key) ? cur.filter(k => k !== key) : [...cur, key]);
    this.calculate();
  }

  applySet(setId: string, save = true): void {
    this.excluded.set(this.ingList.filter(i => !isInSet(this.profileKey, setId, i.key)).map(i => i.key));
    if (save) this.calculate();
  }

  // ── الأسعار ──
  priceValue(key: string): number | null { return this.prices()[key] ?? null; }

  setPrice(key: string, v: number | null): void {
    const next = { ...this.prices() };
    if (v === null || v === undefined || !isFinite(Number(v)) || Number(v) <= 0) delete next[key];
    else next[key] = Number(v);
    this.prices.set(next);
    this.calculate();
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
    this.calculate();
  }

  resetLab(key: string): void {
    const t = this.tbl();
    const all = { ...this.lab() };
    const table = { ...(all[t] ?? {}) };
    delete table[key];
    all[t] = table;
    this.lab.set(all);
    this.calculate();
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
  }

  // ── عرض النتيجة ──
  formulaRows(r: FormulaResult): { key: string; name: string; note: string; pct: number; kg: number }[] {
    return Object.entries(r.formula_pct ?? {})
      .sort((a, b) => b[1] - a[1])
      .map(([k, pct]) => ({ key: k, name: r.names?.[k] ?? k, note: getIngredientNote(k), pct, kg: r.batch_kg?.[k] ?? 0 }));
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
