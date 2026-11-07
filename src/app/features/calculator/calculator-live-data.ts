/**
 * ربط الحاسبة ببيانات حيّة: أسعار السوق (/prices/latest) والطقس (/weather/summary).
 * الملف ده منطق صافي (من غير Angular) عشان يتختبر لوحده.
 *
 * قواعد الأسعار:
 *  - أولوية السعر في الحاسبة: سعر المستخدم المخصص > سعر السوق (لو مش أقدم من 14 يوم) > الافتراضي.
 *  - السوق بيدّي سعرين لكل صنف (price_min "سعر التنفيذ" و price_max "السعر المعلن"). مش مضمون
 *    أي واحد فيهم الأقل، فبنختار بشكل متحفّظ دايماً: في التكلفة الأعلى، وفي الإيراد الأقل.
 *  - الوحدات بتتحوّل (طن → كجم، ألف → واحدة، طبق → 30 بيضة)، ولو الوحدة غامضة بنتجاهل الصنف.
 *  - أي رقم برا النطاق المعقول بنتجاهله (غلط إدخال غالباً) وبنسجّل السبب في skipped.
 */

// ═══════════════════════════ أسعار السوق ═══════════════════════════

export interface MarketRow {
  id?: number | string;
  category: string;
  item_name_ar: string;
  price_min?: number | string | null;
  price_max?: number | string | null;
  unit?: string | null;
  notes?: string | null;
  created_at?: string | null;
}

export interface MarketEntry {
  /** السعر بعد تحويل الوحدة (جنيه لكل كجم / لكل واحدة) */
  price: number;
  /** تاريخ آخر تحديث للصنف في السوق (ISO) */
  updated_at: string;
  /** وصف الصنف اللي اتاخد منه السعر (للعرض) */
  source: string;
}

export interface MarketSnapshot {
  fetched_at: string;
  items: Record<string, MarketEntry>;
  skipped: string[];
}

/** مفاتيح بتدخل في سعر التكلفة (نفس مفاتيح DEFAULT_PRICES) */
export const MARKET_COST_KEYS = ['feed_broiler_kg', 'feed_layer_kg', 'chick_price_broiler'] as const;

/** مفاتيح الإيراد (مش في DEFAULT_PRICES): بتتحط في حقول الجدوى */
export const MARKET_SELL_KEYS: Record<string, string> = {
  broiler: 'sell_broiler',
  turkey: 'sell_turkey',
  rabbit: 'sell_rabbit',
  duck: 'sell_duck',
};

/** أقدم سعر سوق بنستخدمه، وبعده بنرجع للافتراضي */
export const MARKET_MAX_AGE_DAYS = 14;
/** بعد كام يوم نعلّم السعر "قديم": العلف بيتغير أبطأ من الفراخ والبيض والكتاكيت */
export const MARKET_STALE_DAYS = { feed: 7, other: 3 };

/** نطاقات معقولة (جنيه) - برا النطاق ده غالباً غلط إدخال. وسّعها لو الأسعار اتغيرت جداً */
const PLAUSIBLE = {
  feed_kg: [5, 200],
  chick: [1, 300],
  sell_kg: [20, 400],
  egg: [0.5, 20],
} as const;

/** تقسيم علف الفروج على المراحل (تقريبي): بادي ~10 أيام، نامي لحد ~24 يوم، ناهي الباقي */
export const BROILER_FEED_SPLIT: Record<string, number> = { 'بادي': 0.10, 'نامي': 0.40, 'ناهي': 0.50 };

const CATEGORY_ALIASES: Record<string, string[]> = {
  feed: ['feed', 'علف', 'اعلاف'],
  eggs: ['eggs', 'egg', 'بيض'],
  chicks: ['chicks', 'chick', 'كتكوت', 'كتاكيت'],
  broiler: ['broiler', 'poultry', 'دواجن', 'فراخ'],
  turkey: ['turkey', 'رومي'],
  rabbit: ['rabbit', 'ارانب', 'ارنب'],
  duck: ['duck', 'بط'],
};

export function normalizeAr(text: string | null | undefined): string {
  let t = (text ?? '').toString().trim().toLowerCase();
  t = t.replace(/[\u064B-\u0652\u0640]/g, '');           // تشكيل وتطويل
  t = t.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
  return t.replace(/\s+/g, ' ');
}

function canonicalCategory(raw: string): string | null {
  const n = normalizeAr(raw);
  for (const [canon, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (aliases.some(a => normalizeAr(a) === n)) return canon;
  }
  return null;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return isFinite(n) && n > 0 ? n : null;
}

/** السعر المتحفّظ: التكلفة = الأعلى، الإيراد = الأقل */
export function pickPrice(row: MarketRow, role: 'cost' | 'revenue'): number | null {
  const vals = [num(row.price_min), num(row.price_max)].filter((v): v is number => v !== null);
  if (!vals.length) return null;
  return role === 'cost' ? Math.max(...vals) : Math.min(...vals);
}

/** تحويل السعر لوحدة الحاسبة. بيرجّع null لو الوحدة غامضة أو مجهولة */
export function convertUnit(price: number, unit: string | null | undefined, kind: 'kg' | 'piece'): number | null {
  const u = normalizeAr(unit);
  if (!u) return null;
  if (kind === 'kg') {
    if (u.includes('طن')) return price / 1000;
    if (u.includes('كجم') || u.includes('كيلو') || u === 'kg') return price;
    return null; // شكارة/كيس... وزنها مش معروف
  }
  if (u.includes('الف') || u.includes('1000')) return price / 1000;
  if (u.includes('طبق')) return price / 30;               // طبق البيض = 30 بيضة
  if (u.includes('كرتون')) return null;                   // الكرتونة بتختلف (12/30...) - مش هنخمّن
  if (['بيضه', 'كتكوت', 'طائر', 'راس', 'قطعه', 'واحده'].some(k => u.includes(k))) return price;
  return null;
}

const round2 = (x: number) => Math.round(x * 100) / 100;

export function ageDays(iso: string | null | undefined, now: Date = new Date()): number {
  const t = iso ? new Date(iso).getTime() : NaN;
  if (!isFinite(t)) return Infinity;
  return Math.max(0, (now.getTime() - t) / 86400000);
}

export function isMarketUsable(entry: MarketEntry | undefined, now: Date = new Date()): boolean {
  return !!entry && ageDays(entry.updated_at, now) <= MARKET_MAX_AGE_DAYS;
}

export function isMarketStale(key: string, entry: MarketEntry, now: Date = new Date()): boolean {
  const limit = key.startsWith('feed_') ? MARKET_STALE_DAYS.feed : MARKET_STALE_DAYS.other;
  return ageDays(entry.updated_at, now) > limit;
}

/** يبني لقطة أسعار السوق للحاسبة من صفوف /prices/latest */
export function buildMarketSnapshot(rows: MarketRow[], now: Date = new Date()): MarketSnapshot {
  const items: Record<string, MarketEntry> = {};
  const skipped: string[] = [];

  // أحدث صف لكل (فئة، صنف)
  const latest = new Map<string, MarketRow & { _cat: string; _name: string }>();
  for (const r of rows || []) {
    const cat = canonicalCategory(r.category);
    if (!cat) continue;
    const name = normalizeAr(r.item_name_ar);
    const k = `${cat}|${name}`;
    const prev = latest.get(k);
    if (!prev || new Date(r.created_at ?? 0) > new Date(prev.created_at ?? 0)) {
      latest.set(k, { ...r, _cat: cat, _name: name });
    }
  }
  const inCat = (cat: string) => [...latest.values()].filter(r => r._cat === cat);

  const accept = (
    row: MarketRow, role: 'cost' | 'revenue', kind: 'kg' | 'piece',
    range: readonly [number, number], label: string,
  ): number | null => {
    const raw = pickPrice(row, role);
    if (raw === null) { skipped.push(`${label}: مفيش سعر`); return null; }
    const conv = convertUnit(raw, row.unit, kind);
    if (conv === null) { skipped.push(`${label}: وحدة غير معروفة (${row.unit ?? 'فاضية'})`); return null; }
    if (conv < range[0] || conv > range[1]) { skipped.push(`${label}: قيمة غير منطقية (${round2(conv)})`); return null; }
    return round2(conv);
  };
  const newest = (rs: MarketRow[]) => rs.reduce((a, b) => (new Date(b.created_at ?? 0) > new Date(a.created_at ?? 0) ? b : a)).created_at ?? now.toISOString();

  // ── علف الفروج: متوسط مرجّح لبادي/نامي/ناهي ──
  {
    const used: MarketRow[] = [];
    let sum = 0, wsum = 0;
    for (const [stage, w] of Object.entries(BROILER_FEED_SPLIT)) {
      const row = inCat('feed').find(r => r._name.startsWith(normalizeAr(stage)));
      if (!row) continue;
      const p = accept(row, 'cost', 'kg', PLAUSIBLE.feed_kg, `علف ${row.item_name_ar}`);
      if (p === null) continue;
      sum += p * w; wsum += w; used.push(row);
    }
    if (wsum > 0) {
      items['feed_broiler_kg'] = {
        price: round2(sum / wsum), updated_at: newest(used),
        source: `متوسط ${used.map(r => r.item_name_ar).join(' + ')}`,
      };
    }
  }

  // ── علف البياض: متوسط أصناف "بياض" ──
  {
    const prices: number[] = []; const used: MarketRow[] = [];
    for (const row of inCat('feed').filter(r => r._name.startsWith('بياض'))) {
      const p = accept(row, 'cost', 'kg', PLAUSIBLE.feed_kg, `علف ${row.item_name_ar}`);
      if (p !== null) { prices.push(p); used.push(row); }
    }
    if (prices.length) {
      items['feed_layer_kg'] = {
        price: round2(prices.reduce((a, b) => a + b, 0) / prices.length), updated_at: newest(used),
        source: `متوسط ${used.map(r => r.item_name_ar).join(' + ')}`,
      };
    }
  }

  // ── كتكوت التسمين: أبيض شركات ثم أبيض قطعان ──
  {
    const chicks = inCat('chicks');
    const row = chicks.find(r => r._name === 'ابيض شركات') ?? chicks.find(r => r._name === 'ابيض قطعان');
    if (row) {
      const p = accept(row, 'cost', 'piece', PLAUSIBLE.chick, `كتكوت ${row.item_name_ar}`);
      if (p !== null) items['chick_price_broiler'] = { price: p, updated_at: row.created_at ?? now.toISOString(), source: `كتكوت ${row.item_name_ar}` };
    }
  }

  // ── سعر بيع الكيلو الحي ──
  const sell = (key: string, row: (MarketRow & { _name: string }) | undefined, label: string) => {
    if (!row) return;
    const p = accept(row, 'revenue', 'kg', PLAUSIBLE.sell_kg, label);
    if (p !== null) items[key] = { price: p, updated_at: row.created_at ?? now.toISOString(), source: label };
  };
  sell('sell_broiler', inCat('broiler').find(r => r._name === 'ابيض'), 'فراخ بيضاء (بورصة)');

  for (const [cat, key, label] of [['turkey', 'sell_turkey', 'رومي'], ['rabbit', 'sell_rabbit', 'أرانب']] as const) {
    const rows = inCat(cat);
    const ps: number[] = [];
    for (const r of rows) { const p = accept(r, 'revenue', 'kg', PLAUSIBLE.sell_kg, `${label} ${r.item_name_ar}`); if (p !== null) ps.push(p); }
    if (ps.length) items[key] = { price: round2(ps.reduce((a, b) => a + b, 0) / ps.length), updated_at: newest(rows), source: `متوسط ${label} (بورصة)` };
  }
  {
    const rows = inCat('duck');
    const pekin = rows.find(r => r._name.includes('فرنساوي'));
    if (pekin) sell('sell_duck', pekin, pekin.item_name_ar);
    else {
      const ps: number[] = [];
      for (const r of rows) { const p = accept(r, 'revenue', 'kg', PLAUSIBLE.sell_kg, r.item_name_ar); if (p !== null) ps.push(p); }
      if (ps.length) items['sell_duck'] = { price: round2(ps.reduce((a, b) => a + b, 0) / ps.length), updated_at: newest(rows), source: 'متوسط البط (بورصة)' };
    }
  }

  // ── سعر البيضة ──
  for (const [key, needle, label] of [['egg_white', 'ابيض', 'بيض أبيض'], ['egg_red', 'احمر', 'بيض أحمر']] as const) {
    const row = inCat('eggs').find(r => r._name.includes(needle));
    if (!row) continue;
    const p = accept(row, 'revenue', 'piece', PLAUSIBLE.egg, label);
    if (p !== null) items[key] = { price: p, updated_at: row.created_at ?? now.toISOString(), source: label };
  }

  return { fetched_at: now.toISOString(), items, skipped };
}

// ═══════════════════════════ الطقس ═══════════════════════════

export interface WeatherDay {
  max: number;
  min: number;
  condition?: string;
  icon?: string;
  rain_chance?: number;
  /** متوسط رطوبة اليوم */
  humidity?: number | null;
  /** حرارة ورطوبة أسخن ساعة (بتتبعت من الباك اند المحدّث) */
  peak_temp?: number;
  peak_humidity?: number | null;
  peak_hour?: string | null;
}

export interface WeatherSummary {
  today: WeatherDay | null;
  tomorrow: WeatherDay | null;
  updated_at: number | null;
}

/** المحافظات (نفس الأسماء اللي weather.py بيفهمها) ومنطقة الحاسبة التقريبية لكل واحدة */
export const GOVERNORATES: { name: string; region: 'delta' | 'upper' | 'coastal' }[] = [
  { name: 'القاهرة', region: 'delta' },
  { name: 'الجيزة', region: 'delta' },
  { name: 'القليوبية', region: 'delta' },
  { name: 'الشرقية', region: 'delta' },
  { name: 'الدقهلية', region: 'delta' },
  { name: 'الغربية', region: 'delta' },
  { name: 'المنوفية', region: 'delta' },
  { name: 'البحيرة', region: 'delta' },
  { name: 'الاسماعيلية', region: 'delta' },
  { name: 'السويس', region: 'delta' },
  { name: 'جنوب سيناء', region: 'delta' },
  { name: 'الاسكندرية', region: 'coastal' },
  { name: 'مطروح', region: 'coastal' },
  { name: 'بورسعيد', region: 'coastal' },
  { name: 'دمياط', region: 'coastal' },
  { name: 'كفر الشيخ', region: 'coastal' },
  { name: 'شمال سيناء', region: 'coastal' },
  { name: 'الفيوم', region: 'upper' },
  { name: 'بني سويف', region: 'upper' },
  { name: 'المنيا', region: 'upper' },
  { name: 'اسيوط', region: 'upper' },
  { name: 'سوهاج', region: 'upper' },
  { name: 'قنا', region: 'upper' },
  { name: 'الاقصر', region: 'upper' },
  { name: 'اسوان', region: 'upper' },
  { name: 'البحر الاحمر', region: 'upper' },
  { name: 'الوادي الجديد', region: 'upper' },
];

export function findGovernorate(name: string | null | undefined) {
  const n = normalizeAr(name);
  return n ? GOVERNORATES.find(g => normalizeAr(g.name) === n) ?? null : null;
}

/**
 * الموسم المقترح من طقس اليوم:
 *  - أقصى حرارة ≥ 30 م ← صيف (بداية الإجهاد الحراري)
 *  - متوسط اليوم ≤ 16 م ← شتاء (نطاق جدول Aviagen للحد الأدنى للتهوية: -1 لـ 16 م)
 *  - غير كده ← معتدل
 * اقتراح بس: تصميم عنبر جديد لازم يتحسب على الصيف مهما كان طقس النهارده.
 */
export function suggestSeason(day: Pick<WeatherDay, 'max' | 'min'> | null): 'summer' | 'winter' | 'moderate' | null {
  if (!day || !isFinite(day.max) || !isFinite(day.min)) return null;
  if (day.max >= 30) return 'summer';
  if ((day.max + day.min) / 2 <= 16) return 'winter';
  return 'moderate';
}

/** الحرارة والرطوبة اللي بتتبعت لمحرك الحساب (نفس حدود التحقق فيه: -20..50 و 5..99) */
export function weatherForCalc(day: WeatherDay | null): { temp: number; rh: number | null; rhIsPeak: boolean } | null {
  if (!day) return null;
  const temp = day.peak_temp ?? day.max;
  if (!isFinite(temp) || temp < -20 || temp > 50) return null;
  const rhRaw = day.peak_humidity ?? day.humidity ?? null;
  const rhIsPeak = day.peak_humidity != null;
  const rh = rhRaw != null && isFinite(rhRaw) ? Math.min(99, Math.max(5, rhRaw)) : null;
  return { temp, rh, rhIsPeak };
}
