/**
 * محرك تركيب العلف بأقل تكلفة (NRC وغيره) — شغال أوفلاين بالكامل.
 * ترجمة لـ feed_formulator.py: نفس القيود، نفس هامش الأمان، ونفس التحقق بعد التقريب.
 * الجداول في feed-formulator-data.ts (متولّدة من ملف بايثون)، والحل بـ lp-solver.ts.
 */
import { pyRound } from './calculator-engine';
import { solveLp } from './lp-solver';
import {
  PREMIX_PCT, PREMIX_PRICE, BB_INTAKE_DEFAULT,
  POULTRY_INGREDIENTS, RABBIT_INGREDIENTS, PROFILES, BASE_MAX, RABBIT_MAX, SETS, LABELS, SHOW_ATTRS,
} from './feed-formulator-data';

export { PREMIX_PCT, PREMIX_PRICE, BB_INTAKE_DEFAULT, LABELS };

const TABLES: Record<string, Record<string, any>> = { poultry: POULTRY_INGREDIENTS, rabbit: RABBIT_INGREDIENTS };

export interface FormulateOptions {
  /** أسعار الخامات (جنيه/كجم) — اللي مش مذكور بياخد السعر النسبي الافتراضي */
  prices?: Record<string, number> | null;
  /** قيم تحليل معملي بتحل محل القيم النموذجية: { corn: { cp: 8.4, me: 3300 } } */
  ingredientOverrides?: Record<string, Record<string, number>> | null;
  exclude?: string[];
  batchKg?: number;
  /** 'basic' | 'local' | 'all' أو قائمة مفاتيح خامات */
  only?: string | string[] | null;
  margin?: number;
  /** كمية العلف اليومية للدجاجة بالجرام (أمهات التسمين فقط) */
  intakeG?: number | null;
  /** سعر البريمكس (جنيه/كجم) — الافتراضي رقم نسبي زي باقي الأسعار الافتراضية */
  premixPrice?: number;
}

export interface FormulaCheck {
  attr: string; label: string; value: number; min?: number | null; max?: number | null; ok: boolean;
}

export interface FormulaResult {
  profile: string;
  ok: boolean;
  message?: string;
  set?: string;
  table?: string;
  ar?: string;
  src?: string;
  formula_pct?: Record<string, number>;
  premix_pct?: number;
  batch_kg?: Record<string, number>;
  premix_kg?: number;
  analysis?: Record<string, number | null>;
  checks?: FormulaCheck[];
  cost_index_per_kg?: number;
  names?: Record<string, string>;
}

// ═════════ أمهات التسمين: تحويل الاحتياج اليومي لنسبة في العليقة ═════════
function perDayToPct(d: any, g: number) {
  return {
    me: pyRound((d.me / g) * 1000),
    cp: pyRound((d.cp / g) * 100, 2),
    lys: pyRound(d.lys / g / 10, 3),
    met: pyRound(d.met / g / 10, 3),
    mc: pyRound(d.mc / g / 10, 3),
    ca: pyRound((d.ca / g) * 100, 2),
    avp: pyRound(d.avp / g / 10, 3),
    na: pyRound(d.na / g / 10, 3),
  };
}

function resolveProfile(p: any, intakeG?: number | null): any {
  if (!('per_day' in p)) return p;
  const g = Number(intakeG || p.intake_g || BB_INTAKE_DEFAULT);
  const q = { ...p, intake_g: g };
  q.mins = perDayToPct(p.per_day, g);
  q.maxs = { me: q.mins.me + 200, ca: pyRound(q.mins.ca * 1.2, 2), cf: 6.0 };
  q.src = p.src + ` | استهلاك مفترض ${g} جم/يوم`;
  return q;
}

// ═════════ التركيب ═════════
export function formulate(profile: string, opts: FormulateOptions = {}): FormulaResult {
  if (!(profile in PROFILES)) throw new Error(`Unknown profile: ${profile}`);
  const margin = opts.margin ?? 0.015;
  const batchKg = opts.batchKg ?? 100;
  const premixPrice = opts.premixPrice ?? PREMIX_PRICE;

  const p = resolveProfile(PROFILES[profile], opts.intakeG);
  const tname: string = p.table ?? 'poultry';

  const ing: Record<string, any> = {};
  for (const [k, v] of Object.entries(TABLES[tname])) ing[k] = { ...(v as any) };
  for (const [k, v] of Object.entries(opts.ingredientOverrides ?? {})) if (ing[k]) Object.assign(ing[k], v);
  for (const [k, v] of Object.entries(opts.prices ?? {})) if (ing[k] && isFinite(v)) ing[k].price = v;

  const only = opts.only;
  const pool: string[] | null = typeof only === 'string' ? (SETS[tname][only] ?? null) : (only ?? null);
  const excluded = new Set(opts.exclude ?? []);
  const names = Object.keys(ing).filter(k => !excluded.has(k) && (pool === null || pool.includes(k)));

  const maxinc: Record<string, number> = { ...(tname === 'rabbit' ? RABBIT_MAX : BASE_MAX), ...(p.max ?? {}) };
  const n = names.length;
  const free = 100.0 - PREMIX_PCT;
  const c = names.map(k => ing[k].price as number);

  const A_ub: number[][] = [];
  const b_ub: number[] = [];
  const row = (attr: string) => names.map(k => (ing[k][attr] ?? 0.0) as number);

  const mins: Record<string, number> = p.mins;
  const maxs: Record<string, number> = p.maxs ?? {};
  for (const [attr, val] of Object.entries(mins)) {
    const m = attr === 'me' ? 1.0 + margin / 3 : 1.0 + margin;
    A_ub.push(row(attr).map(v => -v / 100.0));
    b_ub.push(-val * m);
  }
  for (const [attr, val] of Object.entries(maxs)) {
    const v_ = attr === 'cf' ? val * (1.0 - margin) : val;
    A_ub.push(row(attr).map(v => v / 100.0));
    b_ub.push(v_);
  }
  for (const [grp, lim] of (p.groups ?? []) as [string[], number][]) {
    A_ub.push(names.map(k => (grp.includes(k) ? 1.0 : 0.0)));
    b_ub.push(lim);
  }

  const lb = names.map(() => 0);
  const ub = names.map(k => maxinc[k] ?? 100);
  const si = names.indexOf('salt');
  if (si >= 0) { lb[si] = 0.20; ub[si] = maxinc['salt'] ?? 0.5; }

  const res = solveLp({ c, A_ub, b_ub, A_eq: [names.map(() => 1.0)], b_eq: [free], lb, ub });
  if (!res.success) {
    return {
      profile, ok: false,
      message: 'لا يوجد حل بالقيود الحالية — خفّف حدود الخامات أو أضف خامة (مثل الصويا أو الأحماض الأمينية).',
    };
  }

  const x: Record<string, number> = {};
  names.forEach((k, i) => { if (res.x[i] > 0.004) x[k] = pyRound(res.x[i], 2); });

  const tot = pyRound(Object.values(x).reduce((s, v) => s + v, 0) + PREMIX_PCT, 2);
  if (tot !== 100.0) {
    const diff = 100.0 - tot;
    for (const big of Object.keys(x).sort((a, b) => x[b] - x[a])) { // صحّح فرق التقريب على خامة لديها هامش
      if (x[big] + diff <= (maxinc[big] ?? 100) + 1e-9 && x[big] + diff >= 0) {
        x[big] = pyRound(x[big] + diff, 2);
        break;
      }
    }
  }

  const analysis = analyze(x, ing, tname);
  const checks = verify(p, analysis, x, maxinc);
  const cost = Object.entries(x).reduce((s, [k, v]) => s + (ing[k].price * v) / 100, 0) + (premixPrice * PREMIX_PCT) / 100;

  const batch: Record<string, number> = {};
  const nm: Record<string, string> = {};
  for (const [k, v] of Object.entries(x)) { batch[k] = pyRound((v * batchKg) / 100, 2); nm[k] = ing[k].ar; }

  return {
    profile, set: typeof only === 'string' ? only : 'custom', table: tname, ar: p.ar, src: p.src,
    ok: checks.every(ch => ch.ok),
    formula_pct: x, premix_pct: PREMIX_PCT,
    batch_kg: batch, premix_kg: pyRound((PREMIX_PCT * batchKg) / 100, 2),
    analysis, checks, cost_index_per_kg: pyRound(cost, 3), names: nm,
  };
}

function analyze(x: Record<string, number>, ing: Record<string, any>, tname: string): Record<string, number | null> {
  const a: Record<string, number> = {};
  for (const k of SHOW_ATTRS[tname]) {
    a[k] = Object.entries(x).reduce((s, [i, v]) => s + ((ing[i][k] ?? 0.0) * v) / 100, 0);
  }
  const ph = a['avp'] !== undefined ? a['avp'] : a['p'];
  const out: Record<string, number | null> = {};
  for (const [k, v] of Object.entries(a)) out[k] = pyRound(v, 3);
  out['ca_p_ratio'] = ph ? pyRound(a['ca'] / ph, 3) : null;
  return out;
}

function verify(p: any, a: Record<string, number | null>, x: Record<string, number>, maxinc: Record<string, number>): FormulaCheck[] {
  const out: FormulaCheck[] = [];
  const mins: Record<string, number> = p.mins;
  const maxs: Record<string, number> = p.maxs ?? {};
  const chk = (attr: string, val: number, lo?: number, hi?: number) => {
    const ok = (lo === undefined || val >= lo) && (hi === undefined || val <= hi + 1e-6);
    out.push({ attr, label: LABELS[attr] ?? attr, value: pyRound(val, 3), min: lo ?? null, max: hi ?? null, ok });
  };
  for (const attr of [...Object.keys(mins), ...Object.keys(maxs).filter(k => !(k in mins))]) {
    chk(attr, (a[attr] as number) ?? 0, mins[attr], maxs[attr]);
  }
  for (const [grp, lim] of (p.groups ?? []) as [string[], number][]) {
    const s = grp.reduce((t, k) => t + (x[k] ?? 0), 0);
    out.push({ attr: 'group', label: 'مجموع الحبوب النشوية %', value: pyRound(s, 2), min: null, max: lim, ok: s <= lim + 1e-6 });
  }
  for (const [k, v] of Object.entries(x)) {
    if (v > (maxinc[k] ?? 100) + 1e-6) out.push({ attr: k, label: `حد ${k}`, value: v, max: maxinc[k], ok: false });
  }
  return out;
}

// ═════════ دوال مساعدة للواجهة ═════════
export interface ProfileInfo { key: string; ar: string; table: string; src: string; isPerDay: boolean }
export interface ProfileGroup { id: string; label: string; icon: string; profiles: ProfileInfo[] }

const GROUPS: { id: string; label: string; icon: string; match: (k: string) => boolean }[] = [
  { id: 'broiler_ross', label: 'تسمين Ross 308', icon: '🐔', match: k => k.startsWith('ross_') },
  { id: 'broiler_cobb', label: 'تسمين Cobb 500', icon: '🐔', match: k => k.startsWith('cobb_') },
  { id: 'broiler_breeder', label: 'أمهات التسمين', icon: '🐓', match: k => k.startsWith('broiler_breeder') },
  { id: 'layer', label: 'دجاج بياض (W-36)', icon: '🥚', match: k => k.startsWith('layer_') },
  { id: 'turkey', label: 'رومي', icon: '🦃', match: k => k.startsWith('turkey_') },
  { id: 'duck', label: 'بط بكيني', icon: '🦆', match: k => k.startsWith('duck_') },
  { id: 'muscovy', label: 'مسكوفي', icon: '🦆', match: k => k.startsWith('muscovy_') },
  { id: 'mulard', label: 'مولار', icon: '🦆', match: k => k.startsWith('mulard_') },
  { id: 'goose', label: 'إوز', icon: '🪿', match: k => k.startsWith('goose_') },
  { id: 'quail', label: 'سمان', icon: '🐦', match: k => k.startsWith('quail_') },
  { id: 'pigeon', label: 'حمام', icon: '🕊️', match: k => k.startsWith('pigeon_') },
  { id: 'rabbit', label: 'أرانب', icon: '🐇', match: k => k.startsWith('rabbit_') },
];

export function getProfileGroups(): ProfileGroup[] {
  return GROUPS.map(g => ({
    id: g.id, label: g.label, icon: g.icon,
    profiles: Object.keys(PROFILES).filter(g.match).map(k => ({
      key: k, ar: PROFILES[k].ar, table: PROFILES[k].table ?? 'poultry', src: PROFILES[k].src, isPerDay: 'per_day' in PROFILES[k],
    })),
  })).filter(g => g.profiles.length > 0);
}

export interface IngredientInfo { key: string; ar: string; price: number; values: Record<string, number> }

/** خامات الجدول الخاص بالمرحلة (دواجن/حمام أو أرانب) مع القيم النموذجية */
export function getIngredients(profile: string): IngredientInfo[] {
  const tname: string = PROFILES[profile].table ?? 'poultry';
  return Object.entries(TABLES[tname]).map(([key, v]: [string, any]) => {
    const values: Record<string, number> = {};
    for (const a of EDITABLE_ATTRS[tname]) values[a] = v[a] ?? 0;
    return { key, ar: v.ar, price: v.price, values };
  });
}

/** القيم اللي يقدر المستخدم يعدّلها من تحليل معملي */
export const EDITABLE_ATTRS: Record<string, string[]> = {
  poultry: ['me', 'cp', 'lys', 'met', 'mc', 'ca', 'avp', 'na', 'cf'],
  rabbit: ['cp', 'lys', 'mc', 'ca', 'p', 'na', 'ndf', 'adl'],
};

export const SET_LABELS: Record<string, string> = {
  all: 'كل الخامات',
  local: 'خامات محلية متاحة',
  basic: 'أساسية (ذرة + صويا)',
};

/** هل الخامة ضمن المجموعة المختارة؟ (للعرض في قائمة الخامات) */
export function isInSet(profile: string, set: string, ingredient: string): boolean {
  const tname: string = PROFILES[profile].table ?? 'poultry';
  const pool = SETS[tname][set] ?? null;
  return pool === null || pool.includes(ingredient);
}

export function profileTable(profile: string): string {
  return PROFILES[profile].table ?? 'poultry';
}

export function getAttrLabel(attr: string): string {
  return LABELS[attr] ?? attr;
}
