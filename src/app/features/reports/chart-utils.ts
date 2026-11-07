// chart-utils.ts — دوال نقية لرسم الخطوط/الأعمدة (بدون Angular، سهلة الاختبار)

export interface ChartSeries {
  name: string;
  color: string;
  values: (number | null | undefined)[];
  dashed?: boolean;
}

/** أقرب خطوة "مستديرة" (1 / 2 / 5 × 10^n) */
export function niceStep(raw: number): number {
  if (!isFinite(raw) || raw <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const frac = raw / pow;
  const nice = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  return nice * pow;
}

/**
 * نطاق المحور الرأسي بقيم مستديرة: {min, max, step}.
 * بنجرّب خطوات (1/2/2.5/5 × 10^n) ونختار أضيق نطاق بيطلع منه 3–6 تقسيمات.
 */
export function niceScale(min: number, max: number, count = 4): { min: number; max: number; step: number } {
  if (!isFinite(min) || !isFinite(max)) return { min: 0, max: 1, step: 0.25 };
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1;
    min -= pad;
    max += pad;
  }
  const base = Math.pow(10, Math.floor(Math.log10((max - min) / count)));
  let best: { min: number; max: number; step: number } | null = null;
  for (const m of [0.5, 1, 2, 2.5, 5, 10]) {
    const step = base * m;
    const lo = Math.floor(min / step + 1e-9) * step;
    const hi = Math.ceil(max / step - 1e-9) * step;
    const n = Math.round((hi - lo) / step);
    if (n < 3 || n > 6) continue;
    if (!best || hi - lo < best.max - best.min) best = { min: round(lo, step), max: round(hi, step), step };
  }
  if (best) return best;
  const step = niceStep((max - min) / count);
  return { min: round(Math.floor(min / step) * step, step), max: round(Math.ceil(max / step) * step, step), step };
}

function round(v: number, step: number): number {
  const decimals = step >= 1 ? 0 : Math.min(4, Math.ceil(-Math.log10(step)));
  return Number(v.toFixed(decimals));
}

export function formatTick(v: number, step: number): string {
  const decimals = step >= 1 ? 0 : Math.min(3, Math.ceil(-Math.log10(step)));
  return v.toFixed(decimals);
}

/** قيم التقسيمات من min إلى max */
export function ticksFor(scale: { min: number; max: number; step: number }): number[] {
  const out: number[] = [];
  const n = Math.round((scale.max - scale.min) / scale.step);
  for (let i = 0; i <= n; i++) out.push(round(scale.min + i * scale.step, scale.step));
  return out;
}

/** مسارات SVG مقسّمة عند القيم الفاضية (null) عشان الخط ما يوصلش فوق فجوة بيانات */
export function buildSegments(
  values: (number | null | undefined)[],
  x: (i: number) => number,
  y: (v: number) => number,
): string[] {
  const segs: string[] = [];
  let cur: string[] = [];
  values.forEach((v, i) => {
    if (v === null || v === undefined || !isFinite(v as number)) {
      if (cur.length) segs.push(cur.join(' '));
      cur = [];
    } else {
      cur.push(`${cur.length ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v as number).toFixed(1)}`);
    }
  });
  if (cur.length) segs.push(cur.join(' '));
  return segs;
}

/** أرقام العناصر اللي هنكتب تحتها تاريخ (موزعة بالتساوي، بدون تكرار) */
export function pickLabelIndexes(n: number, maxLabels = 5): number[] {
  if (n <= 0) return [];
  if (n <= maxLabels) return Array.from({ length: n }, (_, i) => i);
  const set = new Set<number>();
  for (let k = 0; k < maxLabels; k++) set.add(Math.round((k * (n - 1)) / (maxLabels - 1)));
  return Array.from(set).sort((a, b) => a - b);
}

/** "2026-11-06" → "11-06" */
export function shortDate(d: string): string {
  return d && d.length >= 10 ? d.slice(5, 10) : d;
}
