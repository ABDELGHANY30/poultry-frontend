// market-compare.ts — مقارنة سعر التعادل (من تقرير الدورة) بأسعار السوق اللي المستخدم شايفها في اللوحة.
// دالة نقية بدون Angular عشان تتختبر لوحدها.

export interface MarketRow {
  name: string;
  /** سعر التنفيذ في السوق (ج/كجم حي) */
  sell: number;
  /** الهامش للكيلو = سعر السوق − التعادل */
  margin: number;
  pct: number;
  /** ربح الطائر لو اتباع بالوزن الحالي (null لو الوزن مش معروف) */
  perBird: number | null;
}

export interface MarketCompare {
  cost: number;
  weight: number | null;
  rows: MarketRow[];
  basisLabel: '(فعلي)' | '(تقديري)';
  partial: boolean;
  note: string;
}

/** نوع القطيع → فئات سعر الكيلو الحي في بورصة اللوحة. البياض مش مدعوم (وحدة البيض مش كيلو). */
const LIVE_CATEGORIES: Record<string, string[]> = {
  broiler: ['broiler', 'poultry'],
  turkey: ['turkey'],
  rabbit: ['rabbit'],
  duck: ['duck'],
};

const isPerKg = (p: any): boolean => !p?.unit || /كيلو|كجم|kg/i.test(String(p.unit));

const marketPrice = (p: any): number => {
  const v = Number(p?.price_min) > 0 ? Number(p.price_min) : Number(p?.price_max);
  return isFinite(v) && v > 0 ? v : 0;
};

/**
 * report: رد /reports/end-of-cycle (فيه unit_economics) — prices: عناصر /prices/latest اللي اللوحة عارضاها.
 * بنستخدم سعر "التنفيذ" (الأقل عادةً) عشان الهامش يبقى متحفّظ، ومن غير ما نخمّن السلالة: بنعرض كل صنف.
 */
export function buildMarketCompare(report: any, prices: any[] | null | undefined, maxRows = 3): MarketCompare | null {
  const ue = report?.unit_economics;
  const cost = Number(ue?.cost_per_kg);
  if (!ue || !(cost > 0)) return null;
  const cats = LIVE_CATEGORIES[String(report?.flock_type ?? '')];
  if (!cats) return null;

  let items: any[] = [];
  for (const cat of cats) {
    items = (prices ?? []).filter(p => String(p?.category ?? '').toLowerCase() === cat && isPerKg(p) && marketPrice(p) > 0);
    if (items.length) break;
  }
  if (!items.length) return null;

  const weight = Number(ue.weight_kg) > 0 ? Number(Number(ue.weight_kg).toFixed(3)) : null; // نشيل أي ضوضاء عشرية
  const rows: MarketRow[] = items.slice(0, maxRows).map(p => {
    const sell = marketPrice(p);
    const margin = sell - cost;
    return {
      name: String(p.item_name_ar ?? p.item_name ?? ''),
      sell, margin, pct: (margin / cost) * 100,
      perBird: weight !== null ? margin * weight : null,
    };
  });

  const bases = Object.values(ue.basis ?? {}).filter(Boolean);
  const partial = ue.chick_cost_known === false;
  const note =
    'التعادل = التكلفة حتى النهارده — هتزيد مع باقي الدورة.' +
    (weight !== null ? ` محسوب على وزن ${weight} كجم${ue.weight_date ? ` (بتاريخ ${ue.weight_date})` : ''}.` : '') +
    ' السوق = سعر التنفيذ المعروض فوق.' +
    (partial ? ' تكلفة الكتاكيت مش محسوبة (مفيش سعر).' : '');
  return { cost, weight, rows, basisLabel: bases.length > 0 && bases.every(b => b === 'actual') ? '(فعلي)' : '(تقديري)', partial, note };
}
