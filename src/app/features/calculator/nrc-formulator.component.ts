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

/** أنواع مقفولة بملصق "غير متاح" (شيل النوع من القايمة لو عايز ترجّعه) */
const DISABLED_GROUPS: string[] = ['goose'];

/** استهلاك الطائر اليومي (جم) المعروف من ملفاتك — باقي المراحل المستخدم بيكتبه بنفسه */
const DEFAULT_INTAKE_G: Record<string, number> = { layer_peak: 105 };

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
  <div class="pb-6">

    <!-- Header -->
    <div class="rounded-3xl text-white px-4 py-3 sm:px-6 sm:py-4 mb-3"
         style="background:linear-gradient(135deg,#1e1b4b 0%,#4f46e5 100%)">
      <h1 class="text-lg font-bold">🧬 تركيب العلف</h1>
      <p class="text-white/70 text-xs mt-0.5">اختار الطائر والمرحلة وهتظهر لك الخلطة على طول</p>
    </div>

    <!-- الاختيارات -->
    <div class="card space-y-4 mb-4">

      <div>
        <p class="text-sm font-bold text-gray-700 mb-2">1️⃣ اختار الطائر</p>
        <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
          <button *ngFor="let g of groups" (click)="pickGroup(g.id)" [disabled]="isDisabledGroup(g.id)"
                  class="relative rounded-2xl py-3 px-1 min-h-[76px] text-center border-2 transition-all"
                  [class.border-indigo-500]="groupId === g.id" [class.bg-indigo-50]="groupId === g.id"
                  [class.border-gray-100]="groupId !== g.id" [class.bg-white]="groupId !== g.id"
                  [class.opacity-50]="isDisabledGroup(g.id)">
            <div class="text-2xl leading-none">{{ g.icon }}</div>
            <div class="text-xs font-semibold leading-tight mt-1 text-gray-700">{{ g.label }}</div>
            <span *ngIf="isDisabledGroup(g.id)"
                  class="absolute -top-1.5 -left-1.5 bg-gray-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md -rotate-12 shadow">
              غير متاح
            </span>
          </button>
        </div>
      </div>

      <div>
        <p class="text-sm font-bold text-gray-700 mb-2">2️⃣ المرحلة</p>
        <select [ngModel]="profileKey" (ngModelChange)="profileKey = $event; onProfileChange()" class="form-input nrc-num">
          <option *ngFor="let p of stages()" [value]="p.key">{{ stageLabel(p) }}</option>
        </select>
      </div>

      <div>
        <p class="text-sm font-bold text-gray-700 mb-2">3️⃣ كمية العلف</p>
        <div class="flex gap-1 p-1 bg-gray-100 rounded-xl mb-3">
          <button (click)="setQtyMode('kg')" class="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all"
                  [class.bg-white]="qtyMode === 'kg'" [class.shadow]="qtyMode === 'kg'"
                  [class.text-indigo-700]="qtyMode === 'kg'" [class.text-gray-500]="qtyMode !== 'kg'">⚖️ بالكيلو</button>
          <button (click)="setQtyMode('birds')" class="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all"
                  [class.bg-white]="qtyMode === 'birds'" [class.shadow]="qtyMode === 'birds'"
                  [class.text-indigo-700]="qtyMode === 'birds'" [class.text-gray-500]="qtyMode !== 'birds'">🐔 من عدد الطيور</button>
        </div>

        <div *ngIf="qtyMode === 'kg'" class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-gray-500 block mb-1">الكمية (كجم)</label>
            <input type="number" inputmode="decimal" min="1" [ngModel]="batchKg" (ngModelChange)="batchKg = $event; calculate()"
                   class="form-input nrc-num" placeholder="100"/>
          </div>
          <div *ngIf="profile().isPerDay">
            <label class="text-xs text-gray-500 block mb-1">علف الدجاجة/يوم (جم)</label>
            <input type="number" inputmode="decimal" min="50" [ngModel]="intakeG" (ngModelChange)="intakeG = $event; calculate()"
                   class="form-input nrc-num" placeholder="150"/>
          </div>
        </div>

        <div *ngIf="qtyMode === 'birds'">
          <div class="grid grid-cols-2 gap-3">
            <div class="order-1">
              <label class="text-xs text-gray-500 block mb-1">عدد الطيور</label>
              <input type="number" inputmode="decimal" min="1" [ngModel]="animals" (ngModelChange)="animals = $event; calculate()"
                     class="form-input nrc-num" placeholder="1000"/>
            </div>
            <div class="order-3 col-span-2">
              <label class="text-xs text-gray-500 block mb-1">علف الطائر/يوم (جم)</label>
              <input type="number" inputmode="decimal" min="1" [ngModel]="intakeG" (ngModelChange)="intakeG = $event; calculate()"
                     class="form-input nrc-num" [placeholder]="profile().isPerDay ? '150' : 'جم'"/>
            </div>
            <div class="order-2">
              <label class="text-xs text-gray-500 block mb-1">لمدة (أيام)</label>
              <input type="number" inputmode="decimal" min="1" [ngModel]="days" (ngModelChange)="days = $event; calculate()"
                     class="form-input nrc-num" placeholder="7"/>
            </div>
          </div>
          <div *ngIf="computedBatch() !== null" class="mt-2 bg-indigo-50 rounded-xl px-3 py-2 text-sm text-indigo-800">
            🧮 الكمية المطلوبة: <b>{{ computedBatch() | number:'1.0-1' }}</b> كجم
            <span class="text-xs">({{ perDayKg() | number:'1.0-1' }} كجم في اليوم)</span>
          </div>
          <p *ngIf="computedBatch() === null" class="mt-2 text-xs text-amber-700">
            اكتب عدد الطيور وكام جرام بياكل الطائر في اليوم عشان تظهر الكمية.
          </p>
          <p class="mt-1 text-xs text-gray-400">استهلاك الطائر بيختلف بالعمر والسلالة — راجع جدول سلالتك أو سجلاتك.</p>
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

        <div *ngFor="let row of formulaRows(r); trackBy: trackByKey" class="py-3 border-b border-gray-100">
          <div class="flex items-start gap-2">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-gray-800 leading-snug">{{ row.name }}</p>
              <p *ngIf="row.note" class="text-xs text-gray-400 leading-snug">{{ row.note }}</p>
            </div>
            <div class="text-left flex-shrink-0">
              <div class="text-base font-black text-gray-900 whitespace-nowrap">{{ row.kg | number:'1.0-1' }} <span class="text-xs font-normal text-gray-400">كجم</span></div>
              <div class="text-xs text-gray-400" dir="ltr">{{ row.pct | number:'1.0-1' }}%</div>
            </div>
            <button (click)="toggleIngredient(row.key)" class="nrc-tap text-gray-400 text-lg leading-none" aria-label="مش عندي الخامة دي" title="مش عندي الخامة دي">✕</button>
          </div>
          <div class="flex items-center gap-2 mt-2 flex-wrap">
            <span class="text-xs text-gray-500">سعر الكجم</span>
            <input type="number" inputmode="decimal" step="any" min="0" class="form-input nrc-num w-24" placeholder="جنيه"
                   [value]="priceValue(row.key) ?? ''" (change)="onPriceChange(row.key, $event)"/>
            <span *ngIf="rowCost(row) !== null" class="text-sm text-indigo-700 font-semibold whitespace-nowrap">= {{ rowCost(row) | number:'1.0-0' }} جنيه</span>
          </div>
        </div>

        <div class="py-2.5 text-indigo-700">
          <div class="flex items-center gap-2">
            <span class="flex-1 text-sm">💊 بريمكس (فيتامينات ومعادن)</span>
            <span class="text-base font-black">{{ r.premix_kg | number:'1.0-2' }} <span class="text-xs font-normal">كجم</span></span>
            
          </div>
          <div class="flex items-center gap-2 mt-2 flex-wrap">
            <span class="text-xs text-gray-500">سعر الكجم</span>
            <input type="number" inputmode="decimal" step="any" min="0" class="form-input nrc-num w-24" placeholder="جنيه"
                   [value]="premixPrice ?? ''" (change)="onPremixChange($event)"/>
            <span *ngIf="premixCost(r) !== null" class="text-sm font-semibold whitespace-nowrap">= {{ premixCost(r) | number:'1.0-0' }} جنيه</span>
          </div>
        </div>

        <!-- التكلفة -->
        <div *ngIf="costSummary(r) as cs" class="mt-2">
          <div *ngIf="cs.complete" class="bg-indigo-50 rounded-xl px-3 py-3 text-indigo-900 space-y-1">
            <p class="text-sm">💰 إجمالي التكلفة: <b class="text-lg">{{ cs.total | number:'1.0-0' }}</b> جنيه</p>
            <p class="text-xs">سعر كجم العلف: <b>{{ cs.perKg | number:'1.2-2' }}</b> جنيه</p>
            <p *ngIf="cs.perAnimal !== null" class="text-xs">
              تكلفة الطائر الواحد: <b>{{ cs.perAnimal | number:'1.2-2' }}</b> جنيه
              (<b>{{ cs.perAnimalDay | number:'1.2-2' }}</b> جنيه في اليوم)
            </p>
          </div>
          <div *ngIf="!cs.complete" class="bg-gray-50 border border-dashed border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-600 leading-relaxed">
            💰 اكتب <b>سعر الكجم</b> تحت كل خامة (وسعر البريمكس) وهتظهر التكلفة.
            ناقص سعر <b>{{ cs.missing }}</b>.
            <span *ngIf="cs.total > 0">المحسوب لحد دلوقتي: <b>{{ cs.total | number:'1.0-0' }}</b> جنيه.</span>
            الخلطة بتتظبط على أسعارك كل ما تكتب أكتر.
          </div>
        </div>

        <p class="text-xs text-gray-400 mt-1">لو في خامة مش عندك اضغط ✕ جنبها وهتتغير الخلطة.</p>

        <div *ngIf="r.ok" class="mt-3 bg-green-50 rounded-xl px-3 py-2 text-sm text-green-700 font-semibold">
          ✅ الخلطة مطابقة لاحتياج الطائر
        </div>
        <div *ngIf="!r.ok" class="mt-3 bg-amber-50 rounded-xl px-3 py-2 text-sm text-amber-800">
          ⚠️ الخلطة مش مطابقة تماماً (فيه {{ failedChecks(r).length }} قيد). جرّب تفعّل خامات أكتر من الخيارات المتقدمة.
        </div>

        <button (click)="showDetails.set(!showDetails())" class="mt-3 py-2 text-sm text-indigo-700 font-semibold">
          {{ showDetails() ? '▲ إخفاء' : '▼ عرض' }} التحليل الغذائي
        </button>
        <div *ngIf="showDetails()" class="mt-2">
          <div *ngFor="let ch of r.checks" class="flex items-start gap-2 py-2 border-b border-gray-50 text-sm">
            <span class="w-5 flex-shrink-0">{{ ch.ok ? '✅' : '❌' }}</span>
            <span class="flex-1 min-w-0 leading-snug">{{ ch.label }}</span>
            <div class="flex-shrink-0 text-left">
              <div class="font-semibold whitespace-nowrap" [class.text-red-600]="!ch.ok">{{ ch.value }}</div>
              <div class="text-xs text-gray-400" dir="ltr">{{ reqText(ch) }}</div>
            </div>
          </div>
          <p class="text-xs text-gray-400 mt-2">📚 المصدر: {{ r.src }}</p>
        </div>
      </div>
    </div>

    <!-- خيارات متقدمة (مخفية) -->
    <div class="card mt-4">
      <button (click)="showAdvanced.set(!showAdvanced())"
              class="w-full flex items-center justify-between py-1 text-sm font-bold text-gray-600">
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
                  class="text-sm px-4 py-2 rounded-full border border-indigo-200 text-indigo-700 bg-indigo-50">
            {{ setLabel(s) }}
          </button>
        </div>

        <div *ngFor="let sec of ingSections" class="space-y-2">
          <div class="pt-2">
            <p class="text-xs font-bold text-gray-700">{{ sec.group.icon }} {{ sec.group.label }}</p>
            <p class="text-xs text-gray-400">{{ sec.group.hint }}</p>
          </div>

          <div *ngFor="let i of sec.items" class="border border-gray-100 rounded-xl p-3"
               [class.opacity-50]="!isAvailable(i.key)">
            <div class="flex items-start gap-3">
              <input type="checkbox" [checked]="isAvailable(i.key)" (change)="toggleIngredient(i.key)"
                     class="w-6 h-6 flex-shrink-0 mt-0.5"/>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-800">{{ i.ar }}</p>
                <p *ngIf="i.note" class="text-xs text-gray-500 leading-snug">{{ i.note }}</p>
                <div class="flex flex-wrap gap-1 mt-1">
                  <span *ngFor="let st of i.stats" class="text-[11px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{{ st }}</span>
                </div>
              </div>
              <button (click)="toggleLab(i.key)" class="nrc-tap text-lg flex-shrink-0"
                      [class.opacity-40]="labCount(i.key) === 0" aria-label="تحليل معملي" title="تحليل معملي">🔬</button>
            </div>
            <div class="flex items-center gap-2 mt-2">
              <span class="text-xs text-gray-500">سعر الكجم (جنيه)</span>
              <input type="number" inputmode="decimal" step="any" min="0" class="form-input nrc-num w-28"
                     [placeholder]="'' + i.price" [ngModel]="priceValue(i.key)"
                     (ngModelChange)="setPrice(i.key, $event)"/>
            </div>

            <div *ngIf="openLab() === i.key" class="mt-2 pt-2 border-t border-gray-100">
              <p class="text-xs text-gray-500 mb-2">
                لو عندك تحليل معملي للخامة اكتب القيم (% على أساس العلف الطازج). الفاضي بياخد القيمة النموذجية.
              </p>
              <div class="grid grid-cols-2 gap-3">
                <div *ngFor="let a of editableAttrs()">
                  <label class="text-xs text-gray-500 block mb-0.5">{{ shortLabel(a) }}</label>
                  <input type="number" step="any" class="form-input nrc-num"
                         [placeholder]="'' + i.values[a]" [ngModel]="labValue(i.key, a)"
                         (ngModelChange)="setLab(i.key, a, $event)"/>
                </div>
              </div>
              <button *ngIf="labCount(i.key) > 0" (click)="resetLab(i.key)"
                      class="text-sm text-red-500 mt-3 py-1">↺ رجّع القيم النموذجية</button>
            </div>
          </div>
        </div>

        <div class="border border-gray-100 rounded-xl p-2 flex items-center gap-2">
          <span class="text-sm flex-1">💊 سعر البريمكس (جنيه/كجم)</span>
          <input type="number" step="any" min="0" class="form-input nrc-num w-28" inputmode="decimal"
                 placeholder="12" [ngModel]="premixPrice" (ngModelChange)="premixPrice = $event; calculate()"/>
        </div>
      </div>
    </div>

    <!-- تنبيه -->
    <p class="text-xs text-gray-400 leading-relaxed mt-4 px-1">
      <span *ngIf="groupNote()">📌 {{ groupNote() }} </span>
      البريمكس بنسبة {{ premixPct }}% — اشتريه حسب نوع الطائر. أرقام NRC 1994 قديمة نسبياً، والنتيجة لا تغني عن مختص تغذية؛ جرّب على دفعة صغيرة.
    </p>

  </div>
  `,
  styles: [`
    :host { display: block; }
    /* 16px يمنع زووم iOS عند الضغط على الخانة، وارتفاع مريح للمس */
    .nrc-num { font-size: 16px !important; min-height: 42px; }
    .nrc-tap { min-width: 40px; min-height: 40px; display: inline-flex; align-items: center; justify-content: center; }
  `]
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
  qtyMode: 'kg' | 'birds' = 'kg';
  animals: number | null = null;
  days: number | null = 7;

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
        if (s.profileKey && this.findProfile(s.profileKey) && !this.isProfileDisabled(s.profileKey)) this.setProfile(s.profileKey);
        this.batchKg = s.batchKg ?? 100;
        this.intakeG = s.intakeG ?? DEFAULT_INTAKE_G[this.profileKey] ?? null;
        this.qtyMode = s.qtyMode === 'birds' ? 'birds' : 'kg';
        this.animals = s.animals ?? null;
        this.days = s.days ?? 7;
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
          qtyMode: this.qtyMode, animals: this.animals, days: this.days,
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
    this.intakeG = DEFAULT_INTAKE_G[key] ?? null;
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

  isDisabledGroup(id: string): boolean { return DISABLED_GROUPS.includes(id); }

  private isProfileDisabled(key: string): boolean {
    return this.groups.some(g => this.isDisabledGroup(g.id) && g.profiles.some(p => p.key === key));
  }

  pickGroup(id: string): void {
    if (this.isDisabledGroup(id)) return;
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
    this.intakeG = DEFAULT_INTAKE_G[this.profileKey] ?? null;
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
    const batch = this.resolveBatch();
    this.lastBatch = batch;
    const info = this.profile();
    const premix = Number(this.premixPrice) > 0 ? Number(this.premixPrice) : undefined;
    try {
      this.result.set(formulate(this.profileKey, {
        prices: this.effectivePrices(),
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

  // ── الكمية من عدد الطيور ──
  setQtyMode(m: 'kg' | 'birds'): void {
    this.qtyMode = m;
    this.calculate();
  }

  /** الكمية (كجم) = عدد الطيور × استهلاك الطائر (جم) × الأيام ÷ 1000 — null لو البيانات ناقصة */
  computedBatch(): number | null {
    const n = Number(this.animals), g = Number(this.intakeG), d = Number(this.days) > 0 ? Number(this.days) : 1;
    return n > 0 && g > 0 ? (n * g * d) / 1000 : null;
  }

  perDayKg(): number {
    return (Number(this.animals) * Number(this.intakeG)) / 1000;
  }

  private resolveBatch(): number {
    if (this.qtyMode === 'birds') {
      const c = this.computedBatch();
      if (c !== null) return c;
    }
    return Number(this.batchKg) > 0 ? Number(this.batchKg) : 100;
  }

  // ── الأسعار والتكلفة ──
  /**
   * الأسعار اللي بيتحسب عليها الاختيار الأمثل. الخامة اللي المستخدم كتب سعرها تتاخد زي ما هي،
   * والباقي (أرقام نسبية افتراضية) بنقيسه على مستوى أسعاره عشان ما تبقاش رخيصة بشكل وهمي.
   */
  private effectivePrices(): Record<string, number> {
    const user = this.prices();
    const ratios: number[] = [];
    for (const i of this.ingList) {
      const u = user[i.key];
      if (u > 0 && i.price > 0) ratios.push(u / i.price);
    }
    if (!ratios.length) return { ...user };
    ratios.sort((a, b) => a - b);
    const mid = ratios.length >> 1;
    const factor = ratios.length % 2 ? ratios[mid] : (ratios[mid - 1] + ratios[mid]) / 2;
    const out: Record<string, number> = {};
    for (const i of this.ingList) out[i.key] = user[i.key] > 0 ? user[i.key] : i.price * factor;
    return out;
  }

  trackByKey = (_: number, row: { key: string }) => row.key;

  /** السعر بيتطبّق لما المستخدم يخلّص كتابة (مش مع كل رقم) عشان الخلطة ما تتغيرش وهو بيكتب */
  onPriceChange(key: string, ev: Event): void {
    const v = (ev.target as HTMLInputElement).value;
    this.setPrice(key, v === '' ? null : Number(v));
  }

  onPremixChange(ev: Event): void {
    const v = (ev.target as HTMLInputElement).value;
    this.premixPrice = v === '' || !(Number(v) > 0) ? null : Number(v);
    this.calculate();
  }

  rowCost(row: { key: string; kg: number }): number | null {
    const p = this.prices()[row.key] ?? 0;
    return p > 0 ? row.kg * p : null;
  }

  premixCost(r: FormulaResult): number | null {
    const p = Number(this.premixPrice);
    return p > 0 ? (r.premix_kg ?? 0) * p : null;
  }

  costSummary(r: FormulaResult) {
    let total = 0, missing = 0;
    for (const row of this.formulaRows(r)) {
      const c = this.rowCost(row);
      if (c === null) missing++; else total += c;
    }
    const px = this.premixCost(r);
    if (px === null) missing++; else total += px;

    const animals = this.qtyMode === 'birds' && Number(this.animals) > 0 ? Number(this.animals) : 0;
    const days = Number(this.days) > 0 ? Number(this.days) : 1;
    return {
      total, missing, complete: missing === 0,
      perKg: this.lastBatch > 0 ? total / this.lastBatch : 0,
      perAnimal: animals ? total / animals : null,
      perAnimalDay: animals ? total / animals / days : null,
    };
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