import { pyRound } from './calculator-engine';

/**
 * تصدير تقرير PDF لنتيجة الحاسبة — أوفلاين بالكامل (بديل report_generator.py).
 *
 * الفكرة: بنبني التقرير كـ HTML عربي RTL، الـ WebView بيرسمه بخط الجهاز العربي
 * (فمفيش مشكلة تشكيل حروف/اتجاه)، وبعدين بنصوّر كل قسم بـ html2canvas ونرصّه
 * في صفحات A4 بـ jsPDF. كل قسم بيتحط كامل في صفحة واحدة (مش بيتقطع نصه).
 *
 * الباكدجات المطلوبة:
 *   npm i jspdf html2canvas @capacitor/filesystem @capacitor/share
 *   npx cap sync
 */

const BREAKDOWN_LABELS: Record<string, string> = {
  fans: 'الشفاطات',
  cooling: 'التبريد',
  heating: 'التدفئة',
  water_equipment: 'معدات المياه',
  feed_equipment: 'معدات العلف',
  lighting: 'الإضاءة',
  litter: 'الفرشة',
  cage_setup: 'تجهيز الأقفاص',
};

const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c]);

/** نفس _fmt في بايثون: رقم صحيح بفواصل آلاف، و"—" لو القيمة مش رقم */
export function fmtNum(n: unknown): string {
  if (typeof n !== 'number' || !isFinite(n)) return n == null ? '—' : esc(n);
  return pyRound(n, 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

const pad = (n: number) => String(n).padStart(2, '0');
function nowStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const box = (label: string, value: string) =>
  `<div class="box"><div class="label">${label}</div><div class="value">${value}</div></div>`;

/** التقرير مقسّم لأقسام (كل قسم HTML مستقل) عشان نرصّها في الصفحات من غير ما نقطع قسم من النص */
export function buildReportBlocks(result: any, poultryLabel: string, housingLabel: string): string[] {
  const inp = result.input ?? {};
  const area = result.area ?? {};
  const vent = result.ventilation ?? {};
  const cooling = result.cooling ?? {};
  const heating = result.heating ?? {};
  const water = result.water ?? {};
  const feed = result.feed ?? {};
  const lighting = result.lighting ?? {};
  const litter = result.litter ?? {};
  const costs = result.costs ?? null;
  const warnings: string[] = result.warnings ?? [];

  const blocks: string[] = [];

  blocks.push(
    `<h1>🏗️ تقرير حاسبة المزرعة</h1>
     <p class="subtitle">نوع الطائر: <b>${esc(poultryLabel)}</b> — نظام التربية: <b>${esc(housingLabel)}</b> —
     عدد الطيور: <b>${fmtNum(inp.animal_count)}</b></p>`
  );

  blocks.push(
    `<h2>📐 المساحة والتهوية</h2><div class="grid">
      ${box('المساحة المطلوبة', `${fmtNum(area.required_m2)} م²`)}
      ${box('عدد الشفاطات', fmtNum(vent.fans_count))}
      ${box('مواصفة الشفاط', esc(vent.fan_specs ?? '—'))}
     </div>`
  );

  blocks.push(
    `<h2>❄️ التبريد والتدفئة</h2><div class="grid">
      ${box('طول كوولينج باد', `${fmtNum(cooling.pads_length_m)} م`)}
      ${box('مضخة المياه', `${fmtNum(cooling.water_pump_lpm)} لتر/د`)}
      ${box('عدد الدفايات', `${fmtNum(heating.heaters_count)} (${esc(heating.heater_type ?? '')})`)}
     </div>`
  );

  blocks.push(
    `<h2>💧 المياه والعلف والإضاءة</h2><div class="grid">
      ${box('حلمات المياه', fmtNum(water.nipple_drinkers))}
      ${box('إجمالي العلف للدورة', `${fmtNum(feed.total_cycle_kg)} كجم`)}
      ${box('لمبات LED', fmtNum(lighting.bulbs_count))}
      ${box('الفرشة', `${fmtNum(litter.tons)} طن`)}
     </div>`
  );

  if (costs) {
    const excluded = new Set<string>(costs.excluded_categories ?? []);
    let rows = '';
    for (const [key, amount] of Object.entries<number>(costs.breakdown ?? {})) {
      if (!amount) continue; // بند بصفر نخفيه
      const label = BREAKDOWN_LABELS[key] ?? key;
      rows += excluded.has(key)
        ? `<tr style="color:#9ca3af;"><td>${label} <span style="font-size:10px;">(متوفر بالفعل - غير محسوب)</span></td><td>${fmtNum(amount)} ج.م</td></tr>`
        : `<tr><td>${label}</td><td>${fmtNum(amount)} ج.م</td></tr>`;
    }
    if (rows) {
      blocks.push(
        `<h2>💰 تفصيل التكلفة التقديرية</h2>
         <table><tr><th>البند</th><th>التكلفة</th></tr>${rows}
         <tr><th>العلف (دورة كاملة)</th><th>${fmtNum(costs.feed_cycle_cost)} ج.م</th></tr></table>`
      );
    }
    blocks.push(
      `<div class="total"><div class="label">الإجمالي الكلي التقديري</div>
       <div class="value">${fmtNum(costs.grand_total)} جنيه</div></div>`
    );
  }

  if (warnings.length) {
    blocks.push(
      `<div class="warnings"><b>⚠️ تنبيهات:</b><ul>${warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul></div>`
    );
  }

  blocks.push(
    `<footer>تقرير تقديري تم إنشاؤه بتاريخ ${nowStamp()} —
     الأسعار المستخدمة: ${costs?.used_custom_prices ? 'أسعارك الشخصية' : 'الأسعار الافتراضية'}.
     الأرقام تقديرية وقد تختلف عن سعر السوق الفعلي وقت الشراء.</footer>`
  );

  return blocks;
}

const REPORT_CSS = `
  .rpt { direction: rtl; text-align: right; color:#1f2937; font-size: 13px; line-height: 1.6; background:#fff;
         font-family: 'Noto Sans Arabic','Noto Naskh Arabic','Droid Arabic Naskh','Geeza Pro','Tahoma',sans-serif; }
  .rpt h1 { color:#166534; border-bottom:3px solid #166534; padding-bottom:10px; font-size:22px; margin:0 0 8px; }
  .rpt h2 { color:#166534; margin:0 0 6px; font-size:15px; }
  .rpt .subtitle { color:#6b7280; margin:0; }
  .rpt table { width:100%; border-collapse:collapse; margin-top:6px; }
  .rpt th, .rpt td { border:1px solid #e5e7eb; padding:7px 10px; text-align:right; }
  .rpt th { background:#f0fdf4; color:#166534; }
  .rpt .grid { display:flex; flex-wrap:wrap; gap:10px; }
  .rpt .box { background:#f9fafb; border-radius:10px; padding:10px 14px; flex:1 1 30%; box-sizing:border-box; }
  .rpt .label { color:#6b7280; font-size:11px; }
  .rpt .value { font-weight:bold; font-size:14px; margin-top:2px; }
  .rpt .total { background:#166534; color:#fff; padding:16px; border-radius:12px; text-align:center; }
  .rpt .total .label { color:#d1fae5; }
  .rpt .total .value { color:#fff; font-size:24px; }
  .rpt .warnings { background:#fffbeb; border:1px solid #fde68a; border-radius:10px; padding:10px 16px; }
  .rpt .warnings ul { margin:6px 0 0; padding-right:18px; padding-left:0; }
  .rpt .warnings li { margin-bottom:4px; }
  .rpt footer { color:#9ca3af; font-size:10px; text-align:center; }
`;

// A4 بالمللي: هامش 15 مم من كل ناحية
const PAGE_W = 210, PAGE_H = 297, MARGIN = 15, GAP = 5;
const CONTENT_W = PAGE_W - MARGIN * 2;
const CONTENT_H = PAGE_H - MARGIN * 2;
const RENDER_PX_WIDTH = 680; // عرض الرسم بالبكسل (نسبته قريبة من عرض المحتوى على A4)

/** بيولّد الـ PDF ويرجّعه base64 (من غير الـ data:...) */
export async function generateReportPdfBase64(result: any, poultryLabel: string, housingLabel: string): Promise<string> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);

  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${RENDER_PX_WIDTH}px;background:#fff;`;
  host.innerHTML = `<style>${REPORT_CSS}</style>`;
  const nodes: HTMLElement[] = buildReportBlocks(result, poultryLabel, housingLabel).map(html => {
    const el = document.createElement('div');
    el.className = 'rpt';
    el.innerHTML = html;
    host.appendChild(el);
    return el;
  });
  document.body.appendChild(host);

  try {
    if ((document as any).fonts?.ready) await (document as any).fonts.ready;

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    let y = MARGIN;
    let firstOnPage = true;

    for (const el of nodes) {
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: false, logging: false });
      const hMm = (canvas.height * CONTENT_W) / canvas.width;

      // قسم أطول من صفحة كاملة (نادر - تنبيهات كتير): نقطّعه شرائح
      if (hMm > CONTENT_H) {
        if (!firstOnPage) { pdf.addPage(); y = MARGIN; }
        const sliceHpx = Math.floor((CONTENT_H * canvas.width) / CONTENT_W);
        for (let sy = 0; sy < canvas.height; sy += sliceHpx) {
          const h = Math.min(sliceHpx, canvas.height - sy);
          const part = document.createElement('canvas');
          part.width = canvas.width;
          part.height = h;
          const ctx = part.getContext('2d')!;
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, part.width, part.height);
          ctx.drawImage(canvas, 0, sy, canvas.width, h, 0, 0, canvas.width, h);
          if (sy > 0) pdf.addPage();
          pdf.addImage(part.toDataURL('image/jpeg', 0.92), 'JPEG', MARGIN, MARGIN, CONTENT_W, (h * CONTENT_W) / canvas.width);
          y = MARGIN + (h * CONTENT_W) / canvas.width + GAP;
        }
        firstOnPage = false;
        continue;
      }

      if (!firstOnPage && y + hMm > PAGE_H - MARGIN) { pdf.addPage(); y = MARGIN; }
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', MARGIN, y, CONTENT_W, hMm);
      y += hMm + GAP;
      firstOnPage = false;
    }

    const uri = pdf.output('datauristring');
    return uri.substring(uri.indexOf(',') + 1);
  } finally {
    document.body.removeChild(host);
  }
}

/** بيولّد التقرير ويحفظه/يشاركه: على الموبايل (Share sheet → حفظ في الملفات أو واتساب...)، وعلى المتصفح تحميل مباشر */
export async function exportFarmReportPdf(result: any, poultryLabel: string, housingLabel: string): Promise<void> {
  const base64 = await generateReportPdfBase64(result, poultryLabel, housingLabel);
  const d = new Date();
  const fileName = `farm-report-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.pdf`;

  const { Capacitor } = await import('@capacitor/core');
  if (Capacitor.isNativePlatform()) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'),
      import('@capacitor/share'),
    ]);
    const saved = await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache });
    await Share.share({ title: 'تقرير المزرعة', url: saved.uri, dialogTitle: 'حفظ / مشاركة التقرير' });
  } else {
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }
}
