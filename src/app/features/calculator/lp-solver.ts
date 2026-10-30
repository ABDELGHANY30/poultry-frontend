/**
 * حلّال برمجة خطية صغير (Two-phase Simplex بقاعدة Bland) — بديل scipy.optimize.linprog.
 * بيحل:  min c·x   بشرط  A_ub·x ≤ b_ub ،  A_eq·x = b_eq ،  lb ≤ x ≤ ub
 * مناسب للمسائل الصغيرة (عشرات المتغيرات) زي تركيب العلف، ومن غير أي مكتبة خارجية.
 */

export interface LpProblem {
  c: number[];
  A_ub: number[][];
  b_ub: number[];
  A_eq: number[][];
  b_eq: number[];
  lb: number[];
  ub: number[]; // Infinity = من غير حد أعلى
}

export interface LpResult {
  success: boolean;
  x: number[];
  fun: number;
}

const EPS = 1e-9;
const MAX_ITER = 50000;

interface Row { a: number[]; b: number; kind: 'le' | 'ge' | 'eq' }

export function solveLp(p: LpProblem): LpResult {
  const n = p.c.length;
  const fail: LpResult = { success: false, x: [], fun: NaN };

  // 1) إزاحة الحدود الدنيا: x = lb + y  (y ≥ 0)
  const rows: Row[] = [];
  const dot = (a: number[], v: number[]) => a.reduce((s, ai, i) => s + ai * v[i], 0);

  p.A_ub.forEach((a, i) => rows.push({ a: a.slice(), b: p.b_ub[i] - dot(a, p.lb), kind: 'le' }));
  p.A_eq.forEach((a, i) => rows.push({ a: a.slice(), b: p.b_eq[i] - dot(a, p.lb), kind: 'eq' }));
  for (let i = 0; i < n; i++) {
    if (isFinite(p.ub[i])) {
      const cap = p.ub[i] - p.lb[i];
      if (cap < -EPS) return fail;
      const a = new Array(n).fill(0);
      a[i] = 1;
      rows.push({ a, b: Math.max(cap, 0), kind: 'le' });
    }
  }

  // 2) نخلّي كل b ≥ 0
  for (const r of rows) {
    if (r.b < 0) {
      r.a = r.a.map(v => -v);
      r.b = -r.b;
      r.kind = r.kind === 'le' ? 'ge' : r.kind === 'ge' ? 'le' : 'eq';
    }
  }

  const m = rows.length;
  const nSlack = rows.filter(r => r.kind !== 'eq').length;
  const nArt = rows.filter(r => r.kind !== 'le').length;
  const nCols = n + nSlack + nArt;
  const firstArt = n + nSlack;

  // 3) بناء الجدول: صفوف القيود + عمود الطرف الأيمن في الآخر
  const T: number[][] = [];
  const basis: number[] = [];
  let sIdx = n, aIdx = firstArt;
  for (const r of rows) {
    const t = new Array(nCols + 1).fill(0);
    for (let j = 0; j < n; j++) t[j] = r.a[j];
    t[nCols] = r.b;
    if (r.kind === 'le') { t[sIdx] = 1; basis.push(sIdx); sIdx++; }
    else if (r.kind === 'ge') { t[sIdx] = -1; sIdx++; t[aIdx] = 1; basis.push(aIdx); aIdx++; }
    else { t[aIdx] = 1; basis.push(aIdx); aIdx++; }
    T.push(t);
  }

  const pivot = (pr: number, pc: number) => {
    const prow = T[pr];
    const pv = prow[pc];
    for (let j = 0; j <= nCols; j++) prow[j] /= pv;
    for (let i = 0; i < m; i++) {
      if (i === pr) continue;
      const f = T[i][pc];
      if (f === 0) continue;
      const ri = T[i];
      for (let j = 0; j <= nCols; j++) ri[j] -= f * prow[j];
      ri[pc] = 0;
    }
    basis[pr] = pc;
  };

  /** بيعمل simplex على متجه تكلفة معيّن؛ allowedCols = عدد الأعمدة المسموح تدخل الأساس */
  const optimize = (cost: number[], allowedCols: number): boolean => {
    // صف التكلفة المخفّضة
    const red = new Array(nCols + 1).fill(0);
    for (let j = 0; j <= nCols; j++) red[j] = j < nCols ? cost[j] : 0;
    for (let i = 0; i < m; i++) {
      const cb = cost[basis[i]];
      if (cb !== 0) for (let j = 0; j <= nCols; j++) red[j] -= cb * T[i][j];
    }
    for (let it = 0; it < MAX_ITER; it++) {
      // Bland: أول عمود تكلفته المخفّضة سالبة
      let pc = -1;
      for (let j = 0; j < allowedCols; j++) {
        if (red[j] < -EPS) { pc = j; break; }
      }
      if (pc === -1) return true; // وصلنا للحل الأمثل
      // اختبار النسبة
      let pr = -1, best = Infinity;
      for (let i = 0; i < m; i++) {
        const a = T[i][pc];
        if (a > EPS) {
          const ratio = T[i][nCols] / a;
          if (ratio < best - 1e-12 || (Math.abs(ratio - best) <= 1e-12 && pr !== -1 && basis[i] < basis[pr])) {
            best = ratio; pr = i;
          }
        }
      }
      if (pr === -1) return false; // unbounded (مش متوقع هنا)
      // تحديث صف التكلفة ثم الـ pivot
      const f = red[pc];
      pivot(pr, pc);
      for (let j = 0; j <= nCols; j++) red[j] -= f * T[pr][j];
      red[pc] = 0;
    }
    return false;
  };

  // 4) المرحلة الأولى: نقلّل مجموع المتغيرات الصناعية
  if (nArt > 0) {
    const cost1 = new Array(nCols).fill(0);
    for (let j = firstArt; j < nCols; j++) cost1[j] = 1;
    if (!optimize(cost1, nCols)) return fail;
    let infeas = 0;
    for (let i = 0; i < m; i++) if (basis[i] >= firstArt) infeas += T[i][nCols];
    if (infeas > 1e-7) return fail;

    // نطلّع أي متغير صناعي لسه في الأساس (بقيمة صفر)
    for (let i = 0; i < m; i++) {
      if (basis[i] >= firstArt) {
        let pc = -1;
        for (let j = 0; j < firstArt; j++) {
          if (Math.abs(T[i][j]) > 1e-7) { pc = j; break; }
        }
        if (pc !== -1) pivot(i, pc);
        else for (let j = 0; j < firstArt; j++) T[i][j] = 0; // صف زيادة (redundant) وقيمته صفر: نصفّره عشان ما يأثرش
      }
    }
  }

  // 5) المرحلة الثانية: الدالة الأصلية (من غير الأعمدة الصناعية)
  const cost2 = new Array(nCols).fill(0);
  for (let j = 0; j < n; j++) cost2[j] = p.c[j];
  if (!optimize(cost2, firstArt)) return fail;

  const x = p.lb.slice();
  for (let i = 0; i < m; i++) if (basis[i] < n) x[basis[i]] += T[i][nCols];
  const fun = x.reduce((s, v, i) => s + v * p.c[i], 0);
  return { success: true, x, fun };
}
