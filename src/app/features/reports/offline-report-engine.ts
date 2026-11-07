// offline-report-engine.ts — حساب التقارير على الجهاز (بدون نت)
// ─────────────────────────────────────────────────────────────────────────────
// نسخة TypeScript من app/services/report_metrics.py + report_events.py، بنفس القواعد والأرقام،
// وبتطلّع نفس شكل الرد اللي بيرجّعه السيرفر عشان نفس القوالب تشتغل.
//
// بتشتغل على: سجلات القطيع المخزّنة (records_cache) + السجلات اللي لسه ما اتبعتتش (pending_records)
// + برنامج الدورة المخزّن (cycle_full) للمستهدفات.
// مش بتغطي (محتاجة السيرفر): الماليات، تحصينات/علاجات/تنبيهات، التحليل النصي، المقارنة بين المربيين، الـ PDF.
// كل تقرير محلي عليه offline=true و events_partial=true.

export type Kind = 'weekly' | 'monthly' | 'yearly';

export interface EngineFlock {
  id: string; name: string; type: string;
  initialCount: number; currentCount: number;
  startDate: string | null; status: string;
  openingFeedKg?: number | null;
}

export interface Rec {
  date: string; mortality: number;
  feedKg: number | null;      // null = غير مسجل (0 اتخزن في الفورم القديم كـ "فاضي")
  weightKg: number | null; tempC: number | null; waterL: number | null;
  eggs: number | null; broken: number | null; notes: string | null;
}

export type Targets = Record<string, any> | null;

// ── أدوات ───────────────────────────────────────────────────────────────
const num = (v: any): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return isFinite(n) ? n : null;
};

/**
 * round بنفس سلوك بايثون بالظبط: تقريب لأقرب زوجي عند التعادل الحقيقي (على القيمة الثنائية الفعلية).
 * toFixed بيدّي التقريب الصحيح لكل الحالات ماعدا التعادل التام (بيختار الأكبر) فبنعالجه هنا.
 */
export function pyRound(x: number, nd = 0): number {
  if (!isFinite(x)) return x;
  const sign = x < 0 ? -1 : 1;
  const a = Math.abs(x);
  const exact = a.toFixed(Math.min(nd + 40, 100));
  const dot = exact.indexOf('.');
  const trunc = nd === 0 ? exact.slice(0, dot) : exact.slice(0, dot + 1 + nd);
  const rest = exact.slice(dot + 1 + nd);
  const isTie = /^50*$/.test(rest);
  const up = Number(a.toFixed(nd));
  if (isTie) {
    const lastDigit = Number(trunc.replace('.', '').slice(-1));
    return sign * (lastDigit % 2 === 0 ? Number(trunc) : up);
  }
  return sign * up;
}

/** عرض رقم مقرّب بخانة عشرية واحدة زي f-string في بايثون ("3.0") */
export const f1 = (n: number): string => pyRound(n, 1).toFixed(1);

/** صيغة {:g} في بايثون (6 أرقام معنوية بدون أصفار زيادة) */
export function g(n: number): string {
  return String(Number(n.toPrecision(6)));
}


/** جمع بتعويض الخطأ (Neumaier) — نفس دقة sum() في بايثون 3.12+ */
export function fsum(a: number[]): number {
  let s = 0, c = 0;
  for (const x of a) {
    const t = s + x;
    c += Math.abs(s) >= Math.abs(x) ? s - t + x : x - t + s;
    s = t;
  }
  return s + c;
}

const MS = 86400000;
export const parseDate = (s: string): number => {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
export const fmtDate = (t: number): string => new Date(t).toISOString().slice(0, 10);
export const addDays = (s: string, n: number): string => fmtDate(parseDate(s) + n * MS);
export const diffDays = (a: string, b: string): number => Math.round((parseDate(a) - parseDate(b)) / MS);
const minD = (a: string, b: string) => (a <= b ? a : b);
const maxD = (a: string, b: string) => (a >= b ? a : b);

export function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── تطبيع السجلات (سيرفر camelCase/snake_case + الطابور المحلي) ─────────────
export function normalizeRecord(r: any): Rec | null {
  const date = String(r?.recordDate ?? r?.record_date ?? r?.date ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const feed = num(r.feedConsumedKg ?? r.feed_consumed_kg);
  return {
    date, mortality: num(r.mortality) ?? 0,
    feedKg: feed && feed > 0 ? feed : null,
    weightKg: num(r.avgWeightKg ?? r.avg_weight_kg),
    tempC: num(r.temperatureCelsius ?? r.temperature_celsius),
    waterL: num(r.waterConsumedL ?? r.water_consumed_l),
    eggs: num(r.eggCount ?? r.egg_count), broken: num(r.brokenEggCount ?? r.broken_egg_count),
    notes: r.notes ? String(r.notes) : null,
  };
}

/** يدمج السجلات المخزّنة مع اللي لسه في طابور الإرسال (آخر نسخة بتكسب) — مرتّبة بالتاريخ */
export function mergeRecords(server: any[], pending: any[], flockId: string): Rec[] {
  const byDate = new Map<string, Rec>();
  for (const r of server ?? []) { const n = normalizeRecord(r); if (n) byDate.set(n.date, n); }
  const q = (pending ?? []).filter(p => p?.flockId === flockId)
    .sort((a, b) => String(a.queuedAt ?? '').localeCompare(String(b.queuedAt ?? '')));
  for (const p of q) {
    const date = String(p.payload?.record_date ?? p.date ?? '').slice(0, 10);
    if (!date) continue;
    if (p.kind === 'patch') {
      // تعديل على سجل موجود: بنطبّق الحقول اللي اتبعتت بس
      const base = byDate.get(date);
      if (!base) continue;
      const merged: any = { ...base };
      const m = normalizeRecord({ ...p.payload, record_date: date });
      if (m) {
        const keys: [string, keyof Rec][] = [['mortality', 'mortality'], ['feed_consumed_kg', 'feedKg'], ['avg_weight_kg', 'weightKg'],
          ['temperature_celsius', 'tempC'], ['water_consumed_l', 'waterL'], ['egg_count', 'eggs'], ['broken_egg_count', 'broken'], ['notes', 'notes']];
        for (const [snake, camel] of keys) if (p.payload && p.payload[snake] !== undefined && p.payload[snake] !== null) merged[camel] = (m as any)[camel];
      }
      byDate.set(date, merged as Rec);
    } else {
      const n = normalizeRecord({ ...p.payload, record_date: date });
      if (n) byDate.set(date, n);
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

// ── ملخص فترة ───────────────────────────────────────────────────────────
export function summarizeRecords(records: Rec[], ps: string, pe: string, today: string, flock: EngineFlock) {
  const recs = records.filter(r => r.date >= ps && r.date <= pe);
  const start = flock.startDate ? maxD(ps, flock.startDate.slice(0, 10)) : ps;
  const span = Math.max(diffDays(minD(pe, today), start) + 1, 1);
  const feeds = recs.map(r => r.feedKg).filter((v): v is number => v !== null);
  const weights = recs.filter(r => r.weightKg !== null).map(r => ({ d: r.date, w: r.weightKg as number }));
  const temps = recs.map(r => r.tempC).filter((v): v is number => v !== null);
  const eggs = recs.filter(r => r.eggs !== null);
  const waters = recs.map(r => r.waterL).filter((v): v is number => !!v);
  let gain: number | null = null, adg: number | null = null;
  if (weights.length >= 2) {
    const first = weights[0], last = weights[weights.length - 1];
    gain = pyRound(last.w - first.w, 3);
    const d = diffDays(last.d, first.d);
    adg = d > 0 ? pyRound((gain * 1000) / d, 1) : null; // بايثون بتستخدم الـ gain المقرّب (3 خانات)
  }
  const totalMort = recs.reduce((a, r) => a + (r.mortality || 0), 0);
  const totalEggs = eggs.length ? eggs.reduce((a, r) => a + (r.eggs as number), 0) : null;
  const brokenSum = eggs.reduce((a, r) => a + (r.broken || 0), 0);
  const sum = fsum;
  return {
    days_recorded: recs.length, span_days: span,
    completeness_pct: Math.min(pyRound((recs.length / span) * 100), 100),
    total_mortality: totalMort,
    mortality_pct: flock.initialCount ? pyRound((totalMort / flock.initialCount) * 100, 2) : null,
    total_feed_kg: pyRound(sum(feeds), 1), feed_days: feeds.length,
    avg_daily_feed_kg: feeds.length ? pyRound(sum(feeds) / feeds.length, 1) : null,
    weight_start_kg: weights.length ? weights[0].w : null,
    weight_end_kg: weights.length ? weights[weights.length - 1].w : null,
    weight_gain_kg: gain, avg_daily_gain_g: adg,
    avg_temperature: temps.length ? pyRound(sum(temps) / temps.length, 1) : null,
    max_temperature: temps.length ? Math.max(...temps) : null,
    total_eggs: totalEggs,
    avg_hen_day_pct: eggs.length && flock.currentCount ? pyRound((sum(eggs.map(r => r.eggs as number)) / eggs.length / flock.currentCount) * 100, 1) : null,
    broken_egg_pct: totalEggs ? pyRound((brokenSum / totalEggs) * 100, 1) : null,
    total_water_l: waters.length ? pyRound(sum(waters), 1) : null,
  };
}
export type Summary = ReturnType<typeof summarizeRecords>;

export function dailyBreakdown(records: Rec[], ps: string, pe: string, targets: Targets) {
  return records.filter(r => r.date >= ps && r.date <= pe).map(r => {
    const t = (targets && targets[r.date]) || {};
    const wt = t.weight_g;
    return {
      date: r.date, mortality: r.mortality || 0, feed_kg: r.feedKg ?? 0, weight_kg: r.weightKg,
      temperature: r.tempC, eggs: r.eggs,
      target_weight_kg: wt ? pyRound(Number(wt) / 1000, 3) : null,
      target_temperature: t.temperature_c ?? null,
    };
  });
}

export function previousPeriod(kind: Kind | 'daily', ps: string, pe: string): [string, string] {
  if (kind === 'weekly') return [addDays(ps, -7), addDays(pe, -7)];
  if (kind === 'monthly') { const last = addDays(ps, -1); return [last.slice(0, 8) + '01', last]; }
  if (kind === 'yearly') { const y = Number(ps.slice(0, 4)) - 1; return [`${y}-01-01`, `${y}-12-31`]; }
  const span = diffDays(pe, ps) + 1;
  return [addDays(ps, -span), addDays(ps, -1)];
}

export function monthRange(year: number, month: number): [string, string] {
  const first = `${year}-${String(month).padStart(2, '0')}-01`;
  const last = fmtDate(Date.UTC(year, month, 0));
  return [first, last];
}

function cmpItem(label: string, cur: number | null, prev: number | null, good: 'down' | 'up' | null) {
  if (cur === null) return null;
  const change = prev === null || prev === 0 ? null : pyRound(((cur - prev) / Math.abs(prev)) * 100);
  let trend: string | null = null;
  if (prev !== null && cur !== prev) {
    const dir = cur > prev ? 'up' : 'down';
    trend = good === null ? dir : `${dir}_${dir === good ? 'good' : 'bad'}`;
  }
  return { label, current: cur, previous: prev, change_pct: change, trend };
}

export function buildComparison(cur: Summary, prev: Summary) {
  if (!prev || prev.days_recorded === 0) return { has_previous_period: false };
  return {
    has_previous_period: true,
    mortality: cmpItem('النفوق', cur.total_mortality, prev.total_mortality, 'down'),
    feed_kg: cmpItem('العلف (كجم)', cur.total_feed_kg, prev.total_feed_kg, null),
    weight_gain_kg: cmpItem('زيادة الوزن (كجم)', cur.weight_gain_kg, prev.weight_gain_kg, 'up'),
    eggs: cmpItem('البيض', cur.total_eggs, prev.total_eggs, 'up'),
    net_financial: null, // الماليات محتاجة السيرفر
  };
}

// ── الأحداث (نفس قواعد report_events.py، بدون تحصينات/علاجات/تنبيهات) ───────
const HEAT_STRESS: Record<string, number> = { broiler: 32, layer: 28, turkey: 32, duck: 33, quail: 32, rabbit: 30 };
const BROODING_DAYS = 14, HEAT_ABOVE_TARGET_C = 3.0;
const MORTALITY_MIN_ABS = 3, MORTALITY_MIN_PCT = 0.1, MORTALITY_CRITICAL_PCT = 2.0;
const BASELINE_DAYS = 7, BASELINE_MIN = 3;
const TREATMENT_KEYWORDS = ['علاج', 'دواء', 'مضاد', 'فيتامين', 'تحصين', 'لقاح', 'جرعة', 'عزل', 'كوكسيديا', 'إسهال', 'نفوق مفاجئ', 'طوارئ'];
const SEV_RANK: Record<string, number> = { critical: 0, warning: 1, info: 2 };

export interface EventItem { date: string; type: string; severity: string; title_ar: string; reason_ar: string; value: number | null; }

const avg = (a: (number | null)[]): number | null => {
  const v = a.filter((x): x is number => x !== null);
  return v.length ? fsum(v) / v.length : null;
};

function priorWindow(sorted: Rec[], idx: number): Rec[] {
  const lo = addDays(sorted[idx].date, -BASELINE_DAYS);
  const out: Rec[] = [];
  for (let j = idx - 1; j >= 0 && sorted[j].date >= lo; j--) out.push(sorted[j]);
  return out.reverse();
}

function heatLimit(flock: EngineFlock, date: string, targets: Targets): [number | null, string | null] {
  const t = targets && targets[date];
  if (t && t.temperature_c !== null && t.temperature_c !== undefined) {
    return [Number(t.temperature_c) + HEAT_ABOVE_TARGET_C, `مستهدف البرنامج لليوم + ${g(HEAT_ABOVE_TARGET_C)}°م`];
  }
  if (flock.startDate && diffDays(date, flock.startDate.slice(0, 10)) < BROODING_DAYS) return [null, null];
  return [HEAT_STRESS[flock.type] ?? 32, 'حد الإجهاد الحراري التقريبي لهذا النوع'];
}

export function detectRecordEvents(flock: EngineFlock, sorted: Rec[], ps: string, pe: string, targets: Targets): EventItem[] {
  const ev: EventItem[] = [];
  const meta = (targets && (targets as any)._meta) || {};
  const feedTol = meta.feed_tol_pct ?? 15, weightTol = meta.weight_tol_pct ?? 10;
  const count = flock.currentCount || 0;
  type LastW = { r: Rec; w: number; tgt: number; dev: number };
  let lastW = null as LastW | null;

  sorted.forEach((r, idx) => {
    if (r.date < ps || r.date > pe) return;
    const prior = priorWindow(sorted, idx);
    const enough = prior.length >= BASELINE_MIN;
    const [heatLim, heatBasis] = heatLimit(flock, r.date, targets);
    const temp = r.tempC;
    const hot = heatLim !== null && temp !== null && temp >= heatLim;

    // نفوق غير معتاد
    const tm = r.mortality || 0;
    if (enough) {
      const pAvg = avg(prior.map(p => p.mortality || 0));
      const floor = Math.max(MORTALITY_MIN_ABS, (count * MORTALITY_MIN_PCT) / 100);
      if (pAvg !== null && tm >= floor && tm > 2 * pAvg) {
        let reason: string;
        if (hot) {
          reason = `تزامن مع ارتفاع حرارة مسجل (${g(temp as number)}°م، فوق ${g(heatLim as number)}°م — ${heatBasis}) — احتمال إجهاد حراري، يحتاج تأكيد ميداني`;
        } else {
          const pw = avg(prior.map(p => p.waterL));
          if (pw && r.waterL !== null && r.waterL < pw * 0.7) reason = 'تزامن مع انخفاض ملحوظ في استهلاك المياه نفس اليوم — علامة شائعة على مرض ناشئ، يحتاج فحص بيطري';
          else reason = 'لا يوجد تفسير واضح من البيانات المسجلة (حرارة/مياه) — يحتاج فحص ميداني وبيطري لتحديد السبب';
        }
        ev.push({ date: r.date, type: 'mortality', severity: count && tm >= (MORTALITY_CRITICAL_PCT / 100) * count ? 'critical' : 'warning',
          title_ar: `ارتفاع غير معتاد في النفوق: ${tm} حالة (متوسط الأيام السابقة ${f1(pAvg)})`, reason_ar: reason, value: tm });
      }
    }

    // العلف
    let feedFired = false;
    const todayFeed = r.feedKg;
    const priorFeeds = prior.map(p => p.feedKg).filter((v): v is number => v !== null);
    if (todayFeed !== null && priorFeeds.length >= BASELINE_MIN) {
      const base = fsum(priorFeeds) / priorFeeds.length;
      if (todayFeed < base * 0.7) {
        const drop = pyRound((1 - todayFeed / base) * 100);
        ev.push({ date: r.date, type: 'feed', severity: 'warning', title_ar: `انخفاض استهلاك العلف بنسبة ${drop}% عن المتوسط`,
          reason_ar: hot ? `تزامن مع ارتفاع الحرارة (${g(temp as number)}°م) — الطيور بتقلل الأكل طبيعياً في الحر الشديد`
            : 'انخفاض غير مبرر بالحرارة المسجلة — يحتاج فحص لجودة العلف أو بداية مرض يقلل الشهية', value: todayFeed });
        feedFired = true;
      }
    }
    const tday = (targets && targets[r.date]) || {};
    if (tday.feed_g_per_bird && todayFeed !== null && count && !feedFired) {
      const tgt = Number(tday.feed_g_per_bird);
      const actual = (todayFeed * 1000) / count;
      const dev = ((actual - tgt) / tgt) * 100;
      if (dev <= -80 || dev >= 300) {
        ev.push({ date: r.date, type: 'feed', severity: 'warning',
          title_ar: `العلف المسجل (~${pyRound(actual)} جم/طائر) بعيد جداً عن المستهدف (${pyRound(tgt)} جم)`,
          reason_ar: 'غالباً وحدة العلف (كجم/جرام/طن) أو الكمية اتسجلت غلط — راجع السجل قبل ما تعتبرها مشكلة صحة', value: todayFeed });
      } else if (dev <= -feedTol) {
        ev.push({ date: r.date, type: 'feed', severity: 'warning',
          title_ar: `استهلاك العلف أقل من مستهدف البرنامج بنسبة ${pyRound(Math.abs(dev))}% (~${pyRound(actual)} جم مقابل ${pyRound(tgt)})`,
          reason_ar: 'انخفاض الشهية غالباً أول عرض لمرض قادم — راجع المياه والحرارة وجودة العلف', value: todayFeed });
      }
    }

    // المياه
    const priorWaters = prior.map(p => p.waterL).filter((v): v is number => !!v);
    if (r.waterL !== null && priorWaters.length >= BASELINE_MIN) {
      const base = fsum(priorWaters) / priorWaters.length;
      if (base > 0 && r.waterL < base * 0.75) {
        ev.push({ date: r.date, type: 'water', severity: 'warning', title_ar: `انخفاض استهلاك المياه بنسبة ${pyRound((1 - r.waterL / base) * 100)}% عن المتوسط`,
          reason_ar: 'انخفاض المياه غالباً أول علامة تسبق أعراض المرض بيوم أو اثنين — يستحق متابعة لصيقة', value: r.waterL });
      }
    }

    // الوزن
    const tw = r.weightKg;
    let sane = true;
    const wt = (targets && targets[r.date]) || {};
    if (tw !== null && wt.weight_g && tw * 1000 > Number(wt.weight_g) * 3) {
      sane = false;
      ev.push({ date: r.date, type: 'weight', severity: 'warning',
        title_ar: `وزن مسجل غير منطقي (${pyRound(tw * 1000)} جم مقابل مستهدف ${pyRound(Number(wt.weight_g))} جم)`,
        reason_ar: 'الحقل لازم يكون متوسط وزن الطائر الواحد — لو وزنت مجموعة اقسم الوزن الكلي على عدد الطيور', value: tw });
    }
    if (tw !== null && sane) {
      let prevW: number | null = null;
      for (let j = idx - 1; j >= 0; j--) {
        if (sorted[j].weightKg !== null && diffDays(r.date, sorted[j].date) <= 14) { prevW = sorted[j].weightKg; break; }
        if (diffDays(r.date, sorted[j].date) > 14) break;
      }
      if (prevW && tw < prevW * 0.98) {
        const dp = pyRound((1 - tw / prevW) * 100, 1);
        ev.push({ date: r.date, type: 'weight', severity: dp >= 10 ? 'critical' : 'warning',
          title_ar: `تراجع في متوسط الوزن المسجل (${g(prevW)} → ${g(tw)} كجم، -${f1(dp)}%)`,
          reason_ar: 'راجع دقة الميزان وعدد الطيور المُوزنة أولاً؛ لو الرقم صحيح فهو مؤشر مرض أو نقص تغذية يحتاج فحص', value: tw });
      }
      if (wt.weight_g) {
        const tgtKg = Number(wt.weight_g) / 1000;
        lastW = { r, w: tw, tgt: tgtKg, dev: ((tw - tgtKg) / tgtKg) * 100 };
      }
    }

    // البيض
    if (r.eggs !== null) {
      const pe_ = prior.map(p => p.eggs).filter((v): v is number => v !== null);
      if (pe_.length >= BASELINE_MIN) {
        const base = fsum(pe_) / pe_.length;
        if (base > 0) {
          const drop = pyRound((1 - r.eggs / base) * 100);
          if (drop >= 5) {
            ev.push({ date: r.date, type: 'production', severity: drop >= 15 ? 'critical' : 'warning',
              title_ar: `انخفاض إنتاج البيض بنسبة ${drop}% عن المتوسط`,
              reason_ar: hot ? `تزامن مع ارتفاع حرارة مسجل (${g(temp as number)}°م) — إجهاد حراري معروف بتأثيره على الإنتاج`
                : 'انخفاض بدون تفسير حراري واضح من البيانات — راجع برنامج الإضاءة والتغذية والصحة العامة', value: r.eggs });
          }
        }
      }
      if (r.broken && r.eggs && r.broken / r.eggs > 0.05) {
        ev.push({ date: r.date, type: 'production', severity: 'warning', title_ar: `نسبة كسر بيض مرتفعة: ${r.broken} من أصل ${r.eggs}`,
          reason_ar: 'كسر فوق 5% غالباً بسبب نقص كالسيوم في العلف أو مشكلة في الأعشاش/أرضية الجمع', value: r.broken });
      }
    }

    if (r.notes && TREATMENT_KEYWORDS.some(k => r.notes!.includes(k))) {
      ev.push({ date: r.date, type: 'note', severity: 'info', title_ar: 'ملاحظة من المربي فيها إشارة لتدخل علاجي/إجراء', reason_ar: r.notes, value: null });
    }
  });

  if (lastW && lastW.dev <= -weightTol) {
    ev.push({ date: lastW.r.date, type: 'weight', severity: lastW.dev <= -2 * weightTol ? 'critical' : 'warning',
      title_ar: `الوزن أقل من مستهدف البرنامج بنسبة ${pyRound(Math.abs(lastW.dev))}% (${g(lastW.w)} كجم مقابل ${g(lastW.tgt)})`,
      reason_ar: 'قارن العلف المستهلك والتحصينات والحرارة في الأيام السابقة؛ لو الوزن مسجل بدقة يحتاج مراجعة التغذية والصحة', value: lastW.w });
  }
  return ev;
}

export function collectEvents(flock: EngineFlock, sorted: Rec[], ps: string, pe: string, targets: Targets, limit = 25) {
  const all = detectRecordEvents(flock, sorted, ps, pe, targets)
    .sort((a, b) => b.date.localeCompare(a.date))
    .sort((a, b) => (SEV_RANK[a.severity] ?? 3) - (SEV_RANK[b.severity] ?? 3));
  const summary = {
    total: all.length, critical: all.filter(e => e.severity === 'critical').length,
    warning: all.filter(e => e.severity === 'warning').length, info: all.filter(e => e.severity === 'info').length,
  };
  return { events: all.slice(0, limit), summary, truncated: all.length > limit };
}

// ── مستهدفات من برنامج الدورة المخزّن (cycle_full) ───────────────────────
export function targetsFromProgram(full: any, startDate: string | null, from: string, to: string): Targets {
  if (!full?.has_program || !startDate) return null;
  const start = startDate.slice(0, 10);
  const days: any[] = full.days || [];
  if (!days.length) return null;
  const cycleLen: number | null = full.is_repeating ? full.cycle_length : null;
  const out: Record<string, any> = { _meta: { feed_tol_pct: 15, weight_tol_pct: 10 } };
  for (let d = maxD(from, start); d <= to; d = addDays(d, 1)) {
    const raw = diffDays(d, start);
    const age = cycleLen ? raw % cycleLen : raw;
    const lookup = full.is_repeating ? age : Math.max(age, 1);
    const row = days.find(x => x.day === lookup) ?? (lookup > full.last_day ? days[days.length - 1] : days[0]);
    out[d] = {
      temperature_c: row?.temperature ?? null,
      weight_g: cycleLen && raw < cycleLen ? null : row?.weight_g ?? null,
      feed_g_per_bird: row?.feed_g_per_bird ?? null,
    };
  }
  return out;
}

// ── مؤشرات الدورة ──────────────────────────────────────────────────────
export function computeCycleKpis(flock: EngineFlock, recs: Rec[], today: string) {
  const initial = flock.initialCount || 0, current = flock.currentCount || 0;
  const totalMort = Math.max(initial - current, 0);
  const recordedMort = recs.reduce((a, r) => a + (r.mortality || 0), 0);
  const mortalityRate = initial ? pyRound((totalMort / initial) * 100, 2) : 0;
  const totalFeed = fsum(recs.map(r => r.feedKg ?? 0)) + (flock.openingFeedKg || 0);
  const weights = recs.filter(r => r.weightKg !== null);
  const finalW = weights.length ? (weights[weights.length - 1].weightKg as number) : null;
  const wDate = weights.length ? weights[weights.length - 1].date : null;
  const lastDate = recs.length ? recs[recs.length - 1].date : null;
  const end = flock.status === 'closed' && lastDate ? lastDate : lastDate ?? today;
  const start = flock.startDate ? flock.startDate.slice(0, 10) : null;
  const cycleDays = start && end ? diffDays(end, start) : null;
  let fcr: number | null = null;
  if (flock.type !== 'layer' && finalW && current > 0 && totalFeed > 0) fcr = pyRound(totalFeed / (finalW * current), 2);
  let epef: number | null = null;
  if (flock.type === 'broiler' && fcr && cycleDays && cycleDays > 0 && finalW) {
    epef = pyRound(((100 - mortalityRate) * finalW) / (cycleDays * fcr) * 100);
  }
  const eggsArr = recs.filter(r => r.eggs !== null);
  const totalEggs = eggsArr.length ? eggsArr.reduce((a, r) => a + (r.eggs as number), 0) || null : null;
  const perDozen = totalEggs && totalFeed ? pyRound(totalFeed / (totalEggs / 12), 2) : null;
  const notes: string[] = [];
  const span = lastDate && start ? Math.max(diffDays(lastDate, start) + 1, 1) : null;
  const completeness = span ? Math.min(pyRound((recs.length / span) * 100), 100) : null;
  if (completeness !== null && completeness < 70) notes.push(`التسجيل اليومي ناقص (${recs.length} يوم من ${span}) — الأرقام تقريبية.`);
  if (flock.type !== 'layer' && !weights.length) notes.push('مفيش أوزان مسجلة — مش هنقدر نحسب FCR أو EPEF.');
  else if (wDate && lastDate && diffDays(lastDate, wDate) > 7) notes.push(`آخر وزن مسجل بتاريخ ${wDate} (قديم) — FCR مبني عليه.`);
  if (initial && Math.abs(totalMort - recordedMort) > 0.02 * initial) notes.push(`النفوق المسجل يوميًا (${recordedMort}) مختلف عن (العدد الابتدائي − الحالي = ${totalMort}) — راجع تعديلات العدد.`);
  const missingFeed = recs.length - recs.filter(r => r.feedKg !== null).length;
  if (missingFeed > 0) notes.push(`${missingFeed} يوم بدون علف مسجل.`);
  return {
    cycle_days: cycleDays, initial_count: initial, final_count: current, total_mortality: totalMort, recorded_mortality: recordedMort,
    mortality_rate: mortalityRate, total_feed_kg: pyRound(totalFeed, 1), final_weight_kg: finalW, final_weight_date: wDate,
    fcr, epef, total_eggs: totalEggs, feed_per_dozen_eggs_kg: perDozen, days_recorded: recs.length,
    completeness_pct: completeness, data_quality_notes: notes,
  };
}

const OFFLINE_NOTE = '📴 محسوب على جهازك من سجلاتك المحفوظة — من غير الماليات والتحصينات والعلاجات والتحليل النصي.';

// ── تجميع التقارير (نفس شكل رد السيرفر) ────────────────────────────────
export function assemblePeriodReport(kind: Kind, flock: EngineFlock, records: Rec[], ps: string, pe: string, today: string, targets: Targets) {
  const cur = summarizeRecords(records, ps, pe, today, flock);
  if (cur.days_recorded === 0) return { has_data: false, period_start: ps, period_end: pe, message: 'لا توجد بيانات مسجلة لهذه الفترة', offline: true };
  const [pps, ppe] = previousPeriod(kind, ps, pe);
  const prev = summarizeRecords(records, pps, ppe, today, flock);
  const { events, summary, truncated } = collectEvents(flock, records, ps, pe, targets, kind === 'yearly' ? 40 : 25);
  const notes: string[] = [];
  if (cur.completeness_pct < 70) notes.push(`سجّلت ${cur.days_recorded} يوم من ${cur.span_days} — الأرقام تقريبية.`);
  if (cur.span_days > cur.feed_days && cur.feed_days > 0 && cur.days_recorded > cur.feed_days) notes.push(`${cur.days_recorded - cur.feed_days} يوم بدون علف مسجل.`);
  notes.push(OFFLINE_NOTE);
  const out: any = {
    has_data: true, flock_id: flock.id, flock_name: flock.name, flock_type: flock.type, period_start: ps, period_end: pe, ...cur,
    daily_breakdown: dailyBreakdown(records, ps, pe, targets), comparison: buildComparison(cur, prev), financial: null,
    events, events_summary: summary, events_truncated: truncated, data_quality_notes: notes, narrative: '', offline: true, events_partial: true,
  };
  if (kind === 'yearly') {
    const y = Number(ps.slice(0, 4));
    out.monthly_breakdown = [];
    for (let m = 1; m <= 12; m++) {
      const [s, e] = monthRange(y, m);
      const ms = summarizeRecords(records, s, e, today, flock);
      if (ms.days_recorded) out.monthly_breakdown.push({ month: m, total_mortality: ms.total_mortality, total_feed_kg: ms.total_feed_kg, weight_gain_kg: ms.weight_gain_kg, total_eggs: ms.total_eggs });
    }
  }
  return out;
}

export function assembleDailyReport(flock: EngineFlock, records: Rec[], target: string, today: string, targets: Targets) {
  const rec = records.find(r => r.date === target);
  if (!rec) return { has_data: false, date: target, message: 'لا يوجد تسجيل بيانات لهذا اليوم', offline: true };
  const prev = [...records].reverse().find(r => r.date < target);
  const delta = (a: number | null, b: number | null) => (a === null || b === null ? null : pyRound(a - b, 2));
  const { events, summary } = collectEvents(flock, records, target, target, targets, 15);
  return {
    has_data: true, flock_id: flock.id, flock_name: flock.name, date: target, mortality: rec.mortality,
    mortality_delta: prev ? rec.mortality - prev.mortality : null, feed_consumed_kg: rec.feedKg,
    feed_delta: prev && rec.feedKg !== null ? delta(rec.feedKg, prev.feedKg) : null,
    avg_weight_kg: rec.weightKg, weight_delta: prev ? delta(rec.weightKg, prev.weightKg) : null,
    temperature_celsius: rec.tempC, water_consumed_l: rec.waterL, water_delta: prev ? delta(rec.waterL, prev.waterL) : null,
    egg_count: rec.eggs, broken_egg_count: rec.broken, notes: rec.notes, financial: null,
    events, events_summary: summary, offline: true, events_partial: true,
  };
}

export function assembleCycleReport(flock: EngineFlock, records: Rec[], today: string, targets: Targets) {
  const k = computeCycleKpis(flock, records, today);
  const start = flock.startDate ? flock.startDate.slice(0, 10) : records[0]?.date ?? today;
  const last = records.length ? records[records.length - 1].date : today;
  const evEnd = flock.status === 'active' ? maxD(last, today) : last;
  const { events, summary, truncated } = collectEvents(flock, records, start, evEnd, targets, 40);
  return {
    flock_id: flock.id, flock_name: flock.name, flock_type: flock.type, status: flock.status, ...k,
    fcr_note: 'FCR = إجمالي العلف ÷ (آخر وزن مسجل × العدد الحالي)', vaccinations_completed: '—', treatments_count: null,
    supplier_feedback_count: null, financial: null, events, events_summary: summary, events_truncated: truncated,
    data_quality_notes: [...k.data_quality_notes, OFFLINE_NOTE + ' والعلف الافتتاحي (لو فيه) مش محسوب.'],
    period_start: start, period_end: last, narrative: '', offline: true, events_partial: true,
  };
}

export function mortalityTrend(records: Rec[], today: string, days = 60) {
  const since = addDays(today, -days);
  return records.filter(r => r.date >= since).map(r => ({ date: r.date, mortality: r.mortality || 0 }));
}

// ── نظرة المزرعة (نفس شكل /reports/farm-summary) ───────────────────────────
export function farmPeriodStart(period: 'today' | 'week' | 'month', today: string): string {
  return period === 'today' ? today : addDays(today, period === 'week' ? -6 : -29);
}

export function assembleFarmEntry(flock: EngineFlock, recs: Rec[], ps: string, today: string, targets: Targets) {
  const s = summarizeRecords(recs, ps, today, today, flock);
  const { events, summary } = collectEvents(flock, recs, ps, today, targets, 25);
  return {
    flock_id: flock.id, flock_name: flock.name, flock_type: flock.type, events_summary: summary,
    total_mortality: s.total_mortality, total_feed_kg: s.total_feed_kg, completeness_pct: s.completeness_pct,
    top_events: events.slice(0, 3),
  };
}

export function assembleFarmSummary(entries: ReturnType<typeof assembleFarmEntry>[], period: 'today' | 'week' | 'month', ps: string, today: string) {
  if (!entries.length) return { has_data: false, message: 'مفيش قطعان نشطة محفوظة على الجهاز', offline: true };
  const flocks = [...entries].sort((a, b) => b.events_summary.critical - a.events_summary.critical || b.events_summary.warning - a.events_summary.warning);
  return {
    has_data: true, period, period_start: ps, period_end: today, flocks_count: entries.length,
    total_mortality: entries.reduce((a, e) => a + e.total_mortality, 0),
    total_critical_events: entries.reduce((a, e) => a + e.events_summary.critical, 0),
    total_warning_events: entries.reduce((a, e) => a + e.events_summary.warning, 0),
    flocks, offline: true, events_partial: true,
  };
}
