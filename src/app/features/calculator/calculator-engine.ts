/**
 * محرك حاسبة المزرعة — شغال بالكامل جوه التطبيق (من غير سيرفر)
 * ترجمة حرفية لـ: poultry_calculator.py + cost_estimator.py
 * (نفس المعادلات ونفس النصوص ونفس شكل النتيجة اللي الواجهة بتقراه)
 */

export type PoultryType = 'broiler' | 'layer' | 'turkey' | 'rabbit' | 'quail' | 'duck';
export type HousingSystem = 'floor_litter' | 'battery_cage';
export type Season = 'summer' | 'winter' | 'moderate';

/**
 * round() بتاعة بايثون: بتحسب على القيمة الثنائية الدقيقة للرقم، ولو الرقم نص بالظبط
 * (زي 2.5) بتقرّب لأقرب رقم زوجي. بنقلدها عشان الأرقام تطلع زي الباك اند بالظبط.
 */
export function pyRound(x: number, digits = 0): number {
  if (!isFinite(x)) return x;
  const m = Math.pow(10, digits);
  const exact = x.toFixed(Math.min(100, digits + 30));
  const frac = exact.split('.')[1] ?? '';
  if (/^50*$/.test(frac.slice(digits))) {
    const fl = Math.floor(x * m);
    return (fl % 2 === 0 ? fl : fl + 1) / m;
  }
  return Number(x.toFixed(digits));
}

/** نفس f"{x:.Nf}" في بايثون */
export function fmt(x: number, digits = 0): string {
  return pyRound(x, digits).toFixed(digits);
}

const POULTRY_TYPES: PoultryType[] = ['broiler', 'layer', 'turkey', 'rabbit', 'quail', 'duck'];
const HOUSING_SYSTEMS: HousingSystem[] = ['floor_litter', 'battery_cage'];
const SEASONS: Season[] = ['summer', 'winter', 'moderate'];

export const VALID_HOUSING: Record<PoultryType, HousingSystem[]> = {
  broiler: ['floor_litter', 'battery_cage'],
  layer: ['battery_cage', 'floor_litter'],
  turkey: ['floor_litter'],
  rabbit: ['battery_cage', 'floor_litter'],
  quail: ['battery_cage', 'floor_litter'],
  duck: ['floor_litter'],
};

export const HOUSING_LABELS: Record<HousingSystem, string> = {
  floor_litter: 'أرضي (فرشة)',
  battery_cage: 'بطاريات (أقفاص)',
};

export const POULTRY_LABELS: Record<PoultryType, { label: string; icon: string }> = {
  broiler: { label: 'فروج تسمين', icon: '🐔' },
  layer: { label: 'دجاج بياض', icon: '🥚' },
  turkey: { label: 'ديك رومي', icon: '🦃' },
  rabbit: { label: 'أرانب', icon: '🐇' },
  quail: { label: 'سمان', icon: '🐦' },
  duck: { label: 'بط', icon: '🦆' },
};

export const DEFAULT_CYCLE_DAYS: Record<PoultryType, number> = {
  broiler: 35, layer: 400, turkey: 140, rabbit: 70, quail: 42, duck: 65,
};

const MIN_SENSIBLE_CYCLE_DAYS: Record<PoultryType, number> = {
  broiler: 21, layer: 150, turkey: 70, rabbit: 30, quail: 21, duck: 30,
};

const STOCKING_DENSITY: Record<PoultryType, Partial<Record<HousingSystem, number>>> = {
  broiler: { floor_litter: 0.065, battery_cage: 0.035 },
  layer: { floor_litter: 0.2, battery_cage: 0.045 },
  turkey: { floor_litter: 0.35 },
  rabbit: { battery_cage: 0.12, floor_litter: 0.25 },
  quail: { floor_litter: 0.02, battery_cage: 0.015 },
  duck: { floor_litter: 0.18 },
};

/** خريطة (نوع الطائر → أنظمة التربية الصالحة) — بديل GET /housing-options */
export function getHousingOptions(): Record<string, any> {
  const out: Record<string, any> = {};
  for (const pt of POULTRY_TYPES) {
    out[pt] = {
      label: POULTRY_LABELS[pt].label,
      icon: POULTRY_LABELS[pt].icon,
      housing_systems: VALID_HOUSING[pt].map(h => ({ value: h, label: HOUSING_LABELS[h] })),
    };
  }
  return out;
}

export interface FarmInput {
  bird_count: number;
  poultry_type: PoultryType;
  housing_system: HousingSystem;
  season: Season;
  house_length?: number | null;
  house_width?: number | null;
  house_height?: number | null;
  avg_weight_kg: number;
  target_age_days: number | null;
  egypt_location: string;
}

class PoultryFarmCalculator {
  warnings: string[] = [];
  tips: string[] = [];

  constructor(private f: FarmInput) {
    this.resolveCycleDays();
    this.checkHousingValidity();
  }

  private resolveCycleDays() {
    const f = this.f;
    const defaultDays = DEFAULT_CYCLE_DAYS[f.poultry_type] ?? 35;
    const minDays = MIN_SENSIBLE_CYCLE_DAYS[f.poultry_type] ?? 21;
    const label = POULTRY_LABELS[f.poultry_type].label;

    if (f.target_age_days == null) {
      f.target_age_days = defaultDays;
      this.tips.push(
        `📅 مدة الدورة: افترضنا ${defaultDays} يوم ` +
        `(القيمة المعتادة لـ ${label}) ` +
        `لحساب إجمالي العلف على الدورة كاملة. لو دورتك مختلفة، حدد المدة بنفسك.`
      );
    } else if (f.target_age_days < minDays) {
      this.warnings.push(
        `⚠️ مدة الدورة المدخلة (${f.target_age_days} يوم) قليلة جدًا وغير منطقية لـ` +
        ` '${label}' ` +
        `(المتوقع ${minDays} يوم على الأقل). ` +
        `لو قصدك 'عمر التسويق/التسمين' مش دورة الإنتاج الكاملة، تجاهل التحذير ده. ` +
        `لو نسيت تغيّر القيمة الافتراضية، غيّرها عشان 'إجمالي علف الدورة' يبقى دقيق.`
      );
    }
  }

  private checkHousingValidity() {
    const f = this.f;
    const valid = VALID_HOUSING[f.poultry_type] ?? [];
    if (!valid.includes(f.housing_system)) {
      const validLabels = valid.map(h => HOUSING_LABELS[h]).join('، ');
      this.warnings.push(
        `⚠️ نظام '${HOUSING_LABELS[f.housing_system]}' غير شائع عملياً لـ` +
        ` '${POULTRY_LABELS[f.poultry_type].label}'. ` +
        `الأنظمة الشائعة لهذا النوع: ${validLabels}. ` +
        `النتائج التالية تقديرية عامة وغير دقيقة لهذه التركيبة تحديداً.`
      );
    }
  }

  calculate(): any {
    const area = this.calcArea();
    const ventilation = this.calcVentilation();
    const cooling = this.calcCooling(area, ventilation);
    const heating = this.calcHeating();
    const water = this.calcWater();
    const feed = this.calcFeed();
    const lighting = this.calcLighting(area);
    const litter = this.calcLitter(area);
    this.generateTips();

    const f = this.f;
    return {
      input: {
        animal_count: f.bird_count,
        poultry_type: f.poultry_type,
        housing_system: f.housing_system,
        season: f.season,
        target_age_days_used: f.target_age_days,
      },
      area: { required_m2: area.required_m2, animals_per_m2: area.birds_per_m2 },
      ventilation: {
        airflow_m3_per_hour: ventilation.airflow,
        fans_count: ventilation.fans_count,
        fan_specs: ventilation.fan_specs,
        inlets_count: ventilation.inlets,
      },
      cooling: {
        pads_area_m2: cooling.pads_area,
        pads_length_m: cooling.pads_length,
        evaporative_coolers: cooling.coolers_count,
        water_pump_lpm: cooling.pump_lpm,
      },
      heating: {
        heaters_count: heating.count,
        heater_type: heating.type,
        specs: heating.specs,
      },
      water: {
        nipple_drinkers: water.nipples,
        bell_drinkers: water.bells,
        daily_liters: water.daily_liters,
        water_lines: water.lines,
      },
      feed: {
        feeders_count: feed.feeders,
        feeder_type: feed.feeder_type,
        daily_kg: feed.daily_kg,
        total_cycle_kg: feed.total_kg,
      },
      lighting: {
        bulbs_count: lighting.count,
        bulb_watts: lighting.watts,
        total_watts: lighting.total_watts,
      },
      litter: { material: litter.material, depth_cm: litter.depth_cm, tons: litter.tons },
      warnings: this.warnings,
      tips: this.tips,
      summary: {
        animal_count: f.bird_count,
        type: f.poultry_type,
        system: f.housing_system,
        season: f.season,
        area_m2: area.required_m2,
        fans: ventilation.fans_count,
        cooling_pads_m: cooling.pads_length,
        cooling_pump_lpm: cooling.pump_lpm,
        heaters: heating.count,
        daily_water_liters: water.daily_liters,
        daily_feed_kg: feed.daily_kg,
        total_feed_kg: feed.total_kg,
      },
    };
  }

  // ── المساحة ────────────────────────────────────────────────
  private calcArea() {
    const f = this.f;
    let density = STOCKING_DENSITY[f.poultry_type]?.[f.housing_system] ?? 0.1;

    if (f.season === 'summer') {
      if (f.poultry_type === 'rabbit') {
        density *= 1.3;
        this.tips.push('الارانب حساسة للحرارة - زيادة المساحة 30% في الصيف ضرورية');
      } else if (f.poultry_type === 'turkey') {
        density *= 1.2;
        this.tips.push('الرومي: قلل الكثافة 20% في الصيف لتفادي اجهاد الحرارة');
      } else if (f.poultry_type === 'duck') {
        density *= 1.1;
        this.tips.push('البط: قلل الكثافة 10% في الصيف - وفر مساحة اضافية حول مصادر المياه');
      } else {
        density *= 1.15;
        this.tips.push('الصيف: قلل الكثافة 15% لتقليل اجهاد الحرارة');
      }
    }

    const requiredM2 = Math.ceil(f.bird_count * density);

    if (f.house_length && f.house_width) {
      const actualM2 = f.house_length * f.house_width;
      if (actualM2 < requiredM2) {
        this.warnings.push(
          `المساحة المتاحة (${fmt(actualM2, 0)} م2) اقل من المطلوب (${requiredM2} م2). ` +
          `قلل العدد ل ${Math.trunc(actualM2 / density)} حيوان او وسع المكان.`
        );
      } else if (actualM2 > requiredM2 * 1.3) {
        this.tips.push(`المساحة كافية - يمكن زيادة العدد ل ${Math.trunc(actualM2 / density)} حيوان`);
      }
    }

    return {
      required_m2: requiredM2,
      birds_per_m2: pyRound(1 / density, 1),
      density_m2_per_bird: density,
    };
  }

  // ── التهوية ────────────────────────────────────────────────
  private calcVentilation() {
    const f = this.f;
    const n = f.bird_count;
    const w = f.avg_weight_kg;
    const s = f.season;
    let cfm: number;

    switch (f.poultry_type) {
      case 'broiler':
        cfm = w * (s === 'summer' ? 0.9 : s === 'winter' ? 0.1 : 0.4);
        break;
      case 'layer':
        cfm = s === 'summer' ? 0.5 : 0.1;
        break;
      case 'turkey':
        cfm = w * (s === 'summer' ? 1.2 : s === 'winter' ? 0.15 : 0.5);
        this.tips.push('الرومي يحتاج تهوية اعلى من الدجاج بسبب كبر حجمه وحساسيته للامونيا');
        break;
      case 'rabbit':
        cfm = w * (s === 'summer' ? 1.5 : s === 'winter' ? 0.3 : 0.8);
        this.tips.push('الارانب حساسة جدا للامونيا - تاكد من تجديد الهواء كل 5 دقائق على الاقل');
        break;
      case 'quail':
        cfm = s === 'summer' ? 0.3 : 0.05;
        break;
      case 'duck':
        cfm = w * (s === 'summer' ? 0.7 : s === 'winter' ? 0.12 : 0.35);
        this.tips.push(
          'البط: الفرشة تتبلل بسرعة اكبر من الدجاج بسبب طبيعة تعامله مع الماء - ' +
          'تهوية جيدة ضرورية لمنع ارتفاع الامونيا حتى لو الطقس معتدل'
        );
        break;
      default:
        cfm = w * 0.5;
    }

    const totalM3Hr = n * cfm * 1.699;
    const fanCap = 5000;
    const fans = Math.max(Math.ceil(totalM3Hr / fanCap), 2);

    return {
      airflow: pyRound(totalM3Hr),
      fans_count: fans,
      fan_specs: '18 بوصة (450mm)',
      fan_capacity: fanCap,
      inlets: 0,
    };
  }

  // ── التبريد ────────────────────────────────────────────────
  private calcCooling(area: { required_m2: number }, ventilation: { airflow: number }) {
    const f = this.f;
    if (f.season === 'winter') {
      return { pads_area: 0, pads_length: 0, coolers_count: 0, pump_lpm: 0 };
    }

    const airflowM3Min = ventilation.airflow / 60;
    const padVelocity = 80;
    const padsArea = airflowM3Min / padVelocity;
    const padHeight = 1.5;
    let padsLength = Math.ceil(padsArea / padHeight);

    if (f.house_width) {
      const minLength = Math.ceil(f.house_width * 0.7);
      if (padsLength < minLength) padsLength = minLength;
    }

    const pumpLpm = padsLength * 5.5;
    const pumpHp = Math.ceil(pumpLpm / 60);

    this.tips.push(
      `كوولينج باد (Evaporative Cooling):\n` +
      `   الطول: ${padsLength} متر × الارتفاع: ${padHeight} م\n` +
      `   النوع: CEL-DEK 7090 (سمك 10 سم)\n` +
      `   مضخة المياه: ${fmt(pumpLpm, 0)} لتر/دقيقة (${pumpHp} HP)\n` +
      `   خزان تعويض: 200-500 لتر\n` +
      `   نظف الباد شهريا لمنع تراكم الاملاح`
    );

    if (f.housing_system === 'floor_litter' && f.season === 'summer') {
      const fansExtra = Math.ceil(area.required_m2 / 50);
      this.tips.push(`تربية ارضية في الصيف: اضف ${fansExtra} مروحة تدوير هواء اضافية`);
    }

    if (f.poultry_type === 'rabbit') {
      this.warnings.push(
        'الارانب: درجة الحرارة المميتة فوق 35 درجة - ' +
        'كوولينج باد + شفاطات ضرورية في الصيف المصري'
      );
    }
    if (f.poultry_type === 'turkey') {
      this.tips.push('الرومي في الصيف: درجة الحرارة المثالية 18-24 درجة. فوق 30 درجة يبدا اجهاد الحرارة');
    }
    if (f.poultry_type === 'duck') {
      this.tips.push(
        'البط: تحمله للحرارة افضل نسبيا من الدجاج طالما عنده مياه كافية للغطس، ' +
        'لكن الكوولينج باد لازم يكون بعيد عن مصادر مياه الشرب لمنع تراكم رطوبة زائدة حواليه'
      );
    }

    return {
      pads_area: pyRound(padsArea, 1),
      pads_length: padsLength,
      coolers_count: 0,
      pump_lpm: pyRound(pumpLpm, 1),
    };
  }

  // ── التدفئة ────────────────────────────────────────────────
  private calcHeating() {
    const f = this.f;
    if (f.season === 'summer') return { count: 0, type: 'غير مطلوب', specs: '' };

    let heaters: number;
    let type: string;
    let specs: string;

    if (f.poultry_type === 'rabbit') {
      heaters = Math.ceil(f.bird_count / 50);
      type = 'دفاية كهرباء او حامل غاز صغير';
      specs = 'للصغار اقل من 3 اسابيع: 30-32 درجة - البالغة تتحمل حتى 10 درجة';
      this.tips.push(
        'الارانب البالغة تتحمل البرد جيدا (حتى 10 درجة)\n' +
        '   الصغار اقل من 3 اسابيع تحتاج 30-32 درجة\n' +
        '   وفر فرشة سميكة في الشتاء'
      );
    } else if (f.poultry_type === 'turkey') {
      heaters = Math.ceil(f.bird_count / 400);
      type = 'حامل غاز (Brooder) كبير';
      specs = 'اسبوع 1: 37 درجة - تنخفض 3 درجة/اسبوع حتى 20 درجة';
      this.tips.push(
        'كتاكيت الرومي:\n' +
        '   اسبوع 1: 37 درجة تحت الحامل\n' +
        '   اسبوع 2: 34 درجة\n' +
        '   اسبوع 3: 31 درجة\n' +
        '   الرومي اكثر حساسية من الدجاج للبرد في الاسابيع الاولى'
      );
    } else if (f.poultry_type === 'duck') {
      heaters = Math.ceil(f.bird_count / 500);
      type = 'حامل غاز (Brooder)';
      specs = 'اسبوع 1: 32-35 درجة - تنخفض 3 درجة/اسبوع حتى تتساوى بالجو (اسبوع 3-4)';
      this.tips.push(
        'بط صغير (بطط):\n' +
        '   اسبوع 1: 32-35 درجة\n' +
        '   البط يتخلص من الحاجة للتدفئة الاضافية اسرع من الدجاج (اسبوع 3-4 عادة)\n' +
        '   ريش البط عازل للماء والبرد بشكل طبيعي بعد اول اسبوعين'
      );
    } else if (f.housing_system === 'floor_litter') {
      heaters = Math.ceil(f.bird_count / 600);
      type = 'حامل غاز (Brooder)';
      specs = 'حامل غاز 30,000 BTU - يغطي 600 كتكوت';
      this.tips.push(
        'درجة الحرارة تحت الحامل اسبوع 1: 35 درجة\n' +
        '   تنخفض 3 درجة كل اسبوع حتى تصل 22 درجة'
      );
    } else {
      heaters = Math.ceil(f.bird_count / 500);
      type = 'حامل غاز';
      specs = '30,000 BTU';
    }
    return { count: heaters, type, specs };
  }

  // ── المياه ─────────────────────────────────────────────────
  private calcWater() {
    const f = this.f;
    const n = f.bird_count;
    const summer = f.season === 'summer';
    let dailyPer: number, birdsPerNipple: number, birdsPerBell: number;

    switch (f.poultry_type) {
      case 'broiler':
        dailyPer = 0.18 * (summer ? 1.8 : 1.0);
        if (summer) this.tips.push('الصيف: ضاعف مصادر المياه وتاكد من برودة المياه (10-15 درجة)');
        birdsPerNipple = 8; birdsPerBell = 80;
        break;
      case 'layer':
        dailyPer = summer ? 0.4 : 0.25;
        birdsPerNipple = 10; birdsPerBell = 80;
        break;
      case 'turkey':
        dailyPer = summer ? 0.7 : 0.4;
        birdsPerNipple = 5; birdsPerBell = 30;
        this.tips.push(
          'الرومي: يحتاج 400-700 مل/يوم\n' +
          '   استخدم نيبلات كبيرة او شاربات واسعة\n' +
          '   الرومي لا يشرب من شاربات صغيرة'
        );
        break;
      case 'rabbit':
        dailyPer = summer ? 0.5 : 0.3;
        birdsPerNipple = 3; birdsPerBell = 10;
        this.tips.push(
          'الارانب: 200-500 مل/يوم (اكثر في الصيف وفترة الرضاعة)\n' +
          '   الارانب المرضعة تحتاج ضعف الكمية العادية\n' +
          '   استخدم نيبلات خاصة بالارانب (افقية)\n' +
          '   الارانب حساسة للمياه الملوثة'
        );
        break;
      case 'quail':
        dailyPer = 0.05;
        birdsPerNipple = 5; birdsPerBell = 30;
        break;
      case 'duck':
        dailyPer = summer ? 0.65 : 0.4;
        birdsPerNipple = 15;
        birdsPerBell = 15;
        this.tips.push(
          'البط - المياه اهم نقطة في التربية:\n' +
          '   يحتاج حوض عمق 15-20 سم على الاقل يقدر يغطس فيه راسه (تنظيف العين والمنخار)\n' +
          '   النيبلات العادية غير كافية وحدها - الاعتماد على احواض/شاربات\n' +
          '   غيّر المياه 2-3 مرات يوميا - البط يوسخها بسرعة كبيرة\n' +
          '   مياه راكدة متسخة = خطر التسمم الوشيقي (Botulism) القاتل'
        );
        break;
      default:
        dailyPer = 0.3; birdsPerNipple = 8; birdsPerBell = 50;
    }

    const dailyLiters = dailyPer * n;
    const nipples = Math.ceil(n / birdsPerNipple);
    const bells = Math.ceil(n / birdsPerBell);
    const lines = f.house_length ? Math.ceil((f.house_width || 10) / 3) : Math.ceil(n / 1000);

    this.tips.push(
      `المياه اليومي: ${fmt(dailyLiters, 0)} لتر\n` +
      `   تاكد من ضغط المياه: 20-30 PSI للنيبل\n` +
      `   نظف الشاربات يوميا وعقم اسبوعيا`
    );

    return { nipples, bells, daily_liters: pyRound(dailyLiters), lines };
  }

  // ── العلف ──────────────────────────────────────────────────
  private calcFeed() {
    const f = this.f;
    const n = f.bird_count;
    const days = f.target_age_days as number;
    let dailyAvg: number, totalPerBird: number, birdsPerTube: number, feederType: string;

    switch (f.poultry_type) {
      case 'broiler':
        totalPerBird = f.avg_weight_kg * 1.8;
        dailyAvg = totalPerBird / days;
        birdsPerTube = 60;
        feederType = 'صواني للكتاكيت اسبوعين ثم انابيب الية';
        break;
      case 'layer':
        dailyAvg = 0.12;
        totalPerBird = dailyAvg * days;
        birdsPerTube = 15;
        feederType = 'معالف جرابيل او اوتوماتيك';
        break;
      case 'turkey':
        totalPerBird = f.avg_weight_kg * 2.5;
        dailyAvg = totalPerBird / days;
        birdsPerTube = 15;
        feederType = 'معالف واسعة او جرابيل كبيرة';
        this.tips.push(
          'الرومي - برنامج العلف:\n' +
          '   اسبوع 1-4 (starter): بروتين 28%\n' +
          '   اسبوع 5-12 (grower): بروتين 22%\n' +
          '   اسبوع 13+ (finisher): بروتين 18%\n' +
          '   FCR المستهدف: 2.5-2.8\n' +
          '   لا تستخدم علف الدجاج للرومي'
        );
        break;
      case 'rabbit':
        dailyAvg = 0.13;
        totalPerBird = dailyAvg * days;
        birdsPerTube = 8;
        feederType = 'معالف خاصة بالارانب (J-feeder) او صناديق علف';
        this.tips.push(
          'الارانب - برنامج العلف:\n' +
          '   ارانب التسمين: علف pelleted بروتين 16-18%\n' +
          '   ارانب الانتاج: علف pelleted + دريس البرسيم\n' +
          '   لا تزيد الحبوب - تسبب انتفاخ\n' +
          '   دريس البرسيم: 100-200 جم/ارنب/يوم\n' +
          '   الارانب الحوامل والمرضعة: زيادة 30-50%'
        );
        break;
      case 'quail':
        dailyAvg = 0.025;
        totalPerBird = dailyAvg * days;
        birdsPerTube = 30;
        feederType = 'معالف خاصة بالسمان';
        break;
      case 'duck':
        totalPerBird = f.avg_weight_kg * 2.4;
        dailyAvg = totalPerBird / days;
        birdsPerTube = 40;
        feederType = 'معالف مقاومة للماء (البط ينثر الماء على العلف بمنقاره)';
        this.tips.push(
          'البط - برنامج العلف:\n' +
          '   بروتين اعلى من الدجاج في كل مرحلة (بادئ 20-22%)\n' +
          '   النياسين (فيتامين B3) مهم جدا - نقصه يسبب تشوه ارجل\n' +
          '   لا تستخدم علف بياض دجاج (كالسيوم عالي يضر كلى البط)\n' +
          '   FCR المستهدف: 2.2-2.6 (افضل نسبيا من الفروج)'
        );
        break;
      default:
        dailyAvg = 0.15;
        totalPerBird = dailyAvg * days;
        birdsPerTube = 40;
        feederType = 'معالف الية';
    }

    const dailyTotal = dailyAvg * n;
    const totalCycle = totalPerBird * n;
    const feeders = Math.ceil(n / birdsPerTube);

    this.tips.push(
      `العلف اليومي المتوسط: ${fmt(dailyTotal, 0)} كجم\n` +
      `   اجمالي الدورة: ${fmt(totalCycle, 0)} كجم`
    );

    return {
      feeders,
      feeder_type: feederType,
      daily_kg: pyRound(dailyTotal, 1),
      total_kg: pyRound(totalCycle, 1),
    };
  }

  // ── الإضاءة ────────────────────────────────────────────────
  private calcLighting(area: { required_m2: number }) {
    const f = this.f;
    const requiredM2 = area.required_m2;
    let wattsPerM2: number;
    let program: string;

    switch (f.poultry_type) {
      case 'broiler': wattsPerM2 = 3; program = '23 ساعة نور + 1 ساعة ظلام'; break;
      case 'layer': wattsPerM2 = 5; program = '16 ساعة نور/يوم لتحفيز البيض'; break;
      case 'turkey': wattsPerM2 = 4; program = 'اسبوع 1: 24 ساعة - تنخفض تدريجيا ل 14 ساعة'; break;
      case 'rabbit':
        wattsPerM2 = 3;
        program = '14-16 ساعة اضاءة لتحفيز التكاثر';
        this.tips.push(
          'الارانب: الاضاءة الطبيعية كافية في معظم الحالات\n' +
          '   14-16 ساعة اضاءة تحفز التكاثر\n' +
          '   تجنب الاضاءة المباشرة القوية'
        );
        break;
      case 'quail': wattsPerM2 = 4; program = '17-18 ساعة نور لاقصى انتاج بيض'; break;
      case 'duck':
        wattsPerM2 = 3;
        program = 'بط تسمين: 18-20 ساعة نور | بط بياض: 16-17 ساعة';
        this.tips.push('البط اقل حساسية للاضاءة من الدجاج، لكن اضاءة منتظمة تحسن معدل النمو والانتاج');
        break;
      default: wattsPerM2 = 4; program = 'حسب النوع';
    }

    const totalWatts = requiredM2 * wattsPerM2;
    const bulbWatts = 15;
    const bulbs = Math.ceil(totalWatts / bulbWatts);
    const spacing = bulbs > 0 ? Math.sqrt(requiredM2 / bulbs) : 2;

    this.tips.push(
      `الاضاءة: ${bulbs} لمبة LED ${bulbWatts} وات\n` +
      `   المسافة بين اللمبات: ${fmt(spacing, 1)} متر\n` +
      `   برنامج الاضاءة: ${program}`
    );

    return { count: bulbs, watts: bulbWatts, total_watts: totalWatts, spacing_m: pyRound(spacing, 1) };
  }

  // ── الفرشة ─────────────────────────────────────────────────
  private calcLitter(area: { required_m2: number }) {
    const f = this.f;

    if (f.housing_system === 'battery_cage') {
      if (f.poultry_type === 'rabbit') {
        return { material: 'صواني تجميع السماد اسفل الاقفاص', depth_cm: 0, tons: 0 };
      }
      return { material: 'غير مطلوب (بطاريات)', depth_cm: 0, tons: 0 };
    }

    const requiredM2 = area.required_m2;
    let material: string, depthCm: number, densityKgM3: number;

    switch (f.poultry_type) {
      case 'turkey':
        material = 'نشارة خشب خشنة او قش القمح'; depthCm = 15; densityKgM3 = 150;
        this.tips.push(
          'فرشة الرومي: لازم تكون اسمك واجفى من فرشة الدجاج\n' +
          '   الرومي حساس لمشاكل القدم - جفاف الفرشة مهم\n' +
          '   قلب الفرشة كل اسبوع لمنع الابتلال'
        );
        break;
      case 'rabbit':
        material = 'قش ارز او نشارة خشب ناعمة'; depthCm = 10; densityKgM3 = 100;
        this.tips.push(
          'فرشة الارانب:\n' +
          '   قش الارز او نشارة الخشب الناعمة\n' +
          '   غير الفرشة كل اسبوع - الارانب حساسة للامونيا\n' +
          '   تجنب الفرشة المبللة تماما'
        );
        break;
      case 'broiler':
        material = 'نشارة خشب او قش ارز'; depthCm = 8; densityKgM3 = 150;
        break;
      case 'layer':
        material = 'نشارة خشب'; depthCm = 10; densityKgM3 = 150;
        break;
      case 'duck':
        material = 'قش خشن او نشارة خشب خشنة (تمتص الرطوبة الزائدة)'; depthCm = 12; densityKgM3 = 150;
        this.tips.push(
          'فرشة البط:\n' +
          '   اسمك من فرشة الدجاج (12 سم) لامتصاص الرطوبة الزائدة\n' +
          '   غيّرها او اضف طبقة جديدة اكتر من مرة اسبوعيا - تتبل بسرعة كبيرة\n' +
          '   فرشة رطبة = التهاب وسادة القدم + امونيا عالية'
        );
        break;
      default:
        material = 'نشارة خشب'; depthCm = 8; densityKgM3 = 150;
    }

    const volumeM3 = requiredM2 * (depthCm / 100);
    const weightTons = (volumeM3 * densityKgM3) / 1000;

    this.tips.push(
      `الفرشة: ${material}\n` +
      `   السمك: ${depthCm} سم\n` +
      `   الكمية: ${fmt(weightTons, 1)} طن`
    );

    return { material, depth_cm: depthCm, tons: pyRound(weightTons, 1) };
  }

  // ── نصائح وتحذيرات عامة ────────────────────────────────────
  private generateTips() {
    const f = this.f;

    if (f.poultry_type === 'broiler' && f.housing_system === 'battery_cage') {
      this.warnings.push(
        'تسمين بالبطاريات: احتمال أعلى لبثور/التهابات الصدر والأرجل نتيجة ' +
        'احتكاك السلك مع وزن الفروج المتزايد بسرعة. استخدم قفص مصمم خصيصًا ' +
        'للتسمين (أرضية مبطنة أو سلك ناعم/مغطى بلاستيك)، وتابع الطيور دوريًا ' +
        'لرصد أي علامات بثور أو التهابات مبكرًا'
      );
    }
    if (f.poultry_type === 'rabbit' && f.housing_system === 'floor_litter') {
      this.warnings.push(
        'أرانب بنظام أرضي: خطر أعلى للإصابة بالكوكسيديا (مرض طفيلي معوي) ' +
        'نتيجة تلامس الأرانب مع برازها وبولها على الفرشة. لازم تغيير الفرشة ' +
        'بشكل متكرر جدًا وبرنامج وقاية من الكوكسيديا صارم'
      );
    }
    if (f.season === 'summer' && f.egypt_location === 'upper') {
      this.warnings.push(
        'الصعيد: درجات حرارة تتجاوز 45 درجة في الصيف - ' +
        'كوولينج باد + شفاطات تونل + عزل جيد للسقف ضرورة قصوى'
      );
    }
    if (f.season === 'summer' && f.egypt_location === 'coastal') {
      this.tips.push(
        'السواحل: رطوبة جوية عالية تقلل كفاءة الكوولينج باد نسبيا - ' +
        'ركز على التهوية المستمرة اكثر من الاعتماد الكامل على التبريد بالتبخير'
      );
    }
    if (f.bird_count > 50000) {
      this.warnings.push(
        'لاعداد فوق 50,000 - ننصح بمراجعة تصميم التهوية والتبريد مع مهندس متخصص للتحكم الكامل في البيئة'
      );
    }
    if (f.poultry_type === 'rabbit' && f.bird_count > 1000) {
      this.tips.push(
        'مزرعة ارانب كبيرة:\n' +
        '   قسم المزرعة لاقسام (تسمين / اناث انتاج / ذكور)\n' +
        '   كل قسم له تهوية مستقلة\n' +
        '   اعزل المرضى فورا'
      );
    }
    if (f.poultry_type === 'turkey' && f.bird_count > 5000) {
      this.tips.push(
        'مزرعة رومي كبيرة:\n' +
        '   الرومي يحتاج مساحة اكبر من الدجاج\n' +
        '   قسم لمجموعات حسب العمر\n' +
        '   الرومي عدواني - تجنب الاكتظاظ'
      );
    }
    if (f.poultry_type === 'duck') {
      this.warnings.push(
        'البط حامل صامت لانفلونزا الطيور - لا تربّه قريبا من الدجاج او الرومي، ' +
        'وافصل معداته (احذية، ادوات) عن باقي المزرعة'
      );
      if (f.bird_count > 3000) {
        this.tips.push(
          'مزرعة بط كبيرة:\n' +
          '   المياه هي التحدي الاكبر - خطط لنظام صرف جيد يمنع تجمع المياه الراكدة\n' +
          '   افصل مصادر المياه عن منطقة الفرشة الجافة قدر الامكان'
        );
      }
    }
  }
}

export interface CalculatorInput {
  bird_count: number;
  poultry_type: string;
  housing_system: string;
  season?: string;
  house_length?: number | null;
  house_width?: number | null;
  house_height?: number | null;
  avg_weight_kg?: number | null;
  target_age_days?: number | null;
  egypt_location?: string;
}

/** بديل POST /calculator/calculate (الحساب فقط — التكلفة بتتضاف بـ calculateCosts) */
export function calculateFarm(d: CalculatorInput): any {
  const poultry = d.poultry_type as PoultryType;
  const housing = d.housing_system as HousingSystem;
  const season = (d.season ?? 'summer') as Season;
  if (!POULTRY_TYPES.includes(poultry)) throw new Error(`'${d.poultry_type}' is not a valid PoultryType`);
  if (!HOUSING_SYSTEMS.includes(housing)) throw new Error(`'${d.housing_system}' is not a valid HousingSystem`);
  if (!SEASONS.includes(season)) throw new Error(`'${d.season}' is not a valid Season`);

  const farm: FarmInput = {
    bird_count: d.bird_count,
    poultry_type: poultry,
    housing_system: housing,
    season,
    house_length: d.house_length,
    house_width: d.house_width,
    house_height: d.house_height,
    avg_weight_kg: d.avg_weight_kg ?? 2.0,
    target_age_days: d.target_age_days ?? null,
    egypt_location: d.egypt_location ?? 'delta',
  };
  return new PoultryFarmCalculator(farm).calculate();
}

// ══════════════════════════════════════════════════════════════
// 💰 تقدير التكلفة (cost_estimator.py)
// ══════════════════════════════════════════════════════════════
export type PriceItems = Record<string, { price: number }>;

export function calculateCosts(
  result: any,
  poultryType: string,
  prices: PriceItems,
  excludedCategories: string[],
  usedCustomPrices: boolean,
): any {
  const excluded = new Set(excludedCategories);
  const p = (key: string): number => prices[key]?.price ?? 0;

  const fanSpecs: string = result.ventilation.fan_specs;
  const fanKey = fanSpecs.includes('36') ? 'fan_36_inch' : fanSpecs.includes('24') ? 'fan_24_inch' : 'fan_18_inch';
  const fansCost = result.ventilation.fans_count * p(fanKey);

  let coolingCost = result.cooling.pads_area_m2 * p('cooling_pad_m2');
  if (result.cooling.pads_length_m > 0) coolingCost += p('cooling_pump');
  coolingCost += result.cooling.evaporative_coolers * p('evaporative_cooler');

  const heaterText: string = result.heating.heater_type;
  const heaterKey = heaterText.includes('هواء ساخن') || heaterText.includes('Hot Air')
    ? 'hot_air_heater'
    : heaterText.includes('كهرباء') ? 'electric_heater_small' : 'gas_brooder';
  const heatingCost = result.heating.heaters_count * p(heaterKey);

  const waterCost = result.water.nipple_drinkers * p('nipple_drinker') + result.water.bell_drinkers * p('bell_drinker');
  const feedEquipmentCost = result.feed.feeders_count * p('feeder_tube');
  const lightingCost = result.lighting.bulbs_count * p('led_bulb');
  const litterCost = result.litter.tons * p('litter_ton');
  const feedCycleCost = result.feed.total_cycle_kg * p(`feed_${poultryType}_kg`);

  const cageCost = result.input?.housing_system === 'battery_cage'
    ? result.input.animal_count * p('battery_cage_slot')
    : 0;

  const parts: Record<string, number> = {
    fans: fansCost, cooling: coolingCost, heating: heatingCost,
    water_equipment: waterCost, feed_equipment: feedEquipmentCost,
    lighting: lightingCost, litter: litterCost, cage_setup: cageCost,
  };
  const equipmentTotal = Object.entries(parts)
    .filter(([k]) => !excluded.has(k))
    .reduce((s, [, v]) => s + v, 0);
  const grandTotal = equipmentTotal + feedCycleCost;

  const breakdown: Record<string, number> = {};
  for (const [k, v] of Object.entries(parts)) breakdown[k] = pyRound(v);

  return {
    currency: 'EGP',
    breakdown,
    excluded_categories: [...excluded].sort(),
    equipment_total: pyRound(equipmentTotal),
    feed_cycle_cost: pyRound(feedCycleCost),
    grand_total: pyRound(grandTotal),
    used_custom_prices: usedCustomPrices,
    note: 'تكلفة تقديرية بناءً على آخر أسعار مسجلة يدوياً، قد تختلف عن سعر السوق الفعلي وقت الشراء',
  };
}

// ══════════════════════════════════════════════════════════════
// 📈 الجدوى الاقتصادية
// ══════════════════════════════════════════════════════════════
const DEFAULT_EGGS_PER_CYCLE: Partial<Record<PoultryType, number>> = { layer: 300, quail: 250 };
const DEFAULT_MORTALITY_PERCENT: Record<PoultryType, number> = {
  broiler: 5, layer: 8, turkey: 8, rabbit: 10, quail: 12, duck: 6,
};
export const DEFAULT_OTHER_COSTS_PERCENT_OF_FEED = 20.0;

export interface ProfitabilityInput {
  bird_count: number;
  poultry_type: string;
  feed_price_per_kg: number;
  chick_price: number;
  total_feed_kg: number;
  cycle_days?: number | null;
  mortality_percent?: number | null;
  other_costs_percent?: number;
  medicine_cost_per_bird?: number | null;
  labor_cost_per_bird?: number | null;
  utilities_cost_per_bird?: number | null;
  avg_weight_kg?: number;
  selling_price_per_kg?: number | null;
  is_egg_production?: boolean | null;
  eggs_per_bird_cycle?: number | null;
  egg_price?: number | null;
  broken_eggs_percent?: number;
}

/** بديل POST /calculator/profitability */
export function calculateProfitability(d: ProfitabilityInput): any {
  const type = d.poultry_type as PoultryType;
  if (!POULTRY_TYPES.includes(type)) throw new Error(`'${d.poultry_type}' is not a valid PoultryType`);

  const warnings: string[] = [];
  const cycleDays = d.cycle_days ?? DEFAULT_CYCLE_DAYS[type] ?? 35;
  const mortality = d.mortality_percent ?? DEFAULT_MORTALITY_PERCENT[type] ?? 8;
  const otherPct = d.other_costs_percent ?? DEFAULT_OTHER_COSTS_PERCENT_OF_FEED;
  const avgWeight = d.avg_weight_kg ?? 2.0;
  const brokenPct = d.broken_eggs_percent ?? 3.0;
  const isEgg = d.is_egg_production ?? (type === 'layer');
  let eggsPerBird = d.eggs_per_bird_cycle ?? null;
  const eggPrice = d.egg_price ?? null;
  const sellPrice = d.selling_price_per_kg ?? null;

  if (isEgg) {
    if (eggsPerBird == null) eggsPerBird = DEFAULT_EGGS_PER_CYCLE[type] ?? 280;
    if (eggPrice == null) warnings.push('⚠️ سعر البيضة مش متحدد - الإيراد المتوقع هيطلع صفر لحد ما تدخله');
  } else if (sellPrice == null) {
    warnings.push('⚠️ سعر بيع الكيلو مش متحدد - الإيراد المتوقع هيطلع صفر لحد ما تدخله');
  }

  const surviving = pyRound(d.bird_count * (1 - mortality / 100));

  const chicksCost = d.bird_count * d.chick_price;
  const feedCost = d.total_feed_kg * d.feed_price_per_kg;

  const hasItemized = [d.medicine_cost_per_bird, d.labor_cost_per_bird, d.utilities_cost_per_bird]
    .some(v => v != null);
  let otherCosts: number;
  let otherBreakdown: any = null;
  if (hasItemized) {
    const medicine = d.bird_count * (d.medicine_cost_per_bird || 0);
    const labor = d.bird_count * (d.labor_cost_per_bird || 0);
    const utilities = d.bird_count * (d.utilities_cost_per_bird || 0);
    otherCosts = medicine + labor + utilities;
    otherBreakdown = {
      medicine: pyRound(medicine, 2),
      labor: pyRound(labor, 2),
      utilities: pyRound(utilities, 2),
    };
  } else {
    otherCosts = feedCost * (otherPct / 100);
  }
  const totalCosts = chicksCost + feedCost + otherCosts;

  let revenue: number;
  let revenueBreakdown: any;
  if (isEgg) {
    const totalEggs = surviving * (eggsPerBird || 0) * (1 - brokenPct / 100);
    revenue = totalEggs * (eggPrice || 0);
    revenueBreakdown = { total_eggs_expected: pyRound(totalEggs), egg_price: eggPrice || 0 };
  } else {
    const liveWeight = surviving * avgWeight;
    revenue = liveWeight * (sellPrice || 0);
    revenueBreakdown = { total_live_weight_kg: pyRound(liveWeight, 1), selling_price_per_kg: sellPrice || 0 };
  }

  const netProfit = revenue - totalCosts;
  return {
    is_egg_production: isEgg,
    cycle_days: cycleDays,
    surviving_birds: surviving,
    mortality_percent: mortality,
    costs: {
      chicks_cost: pyRound(chicksCost, 2),
      feed_cost: pyRound(feedCost, 2),
      other_costs: pyRound(otherCosts, 2),
      other_costs_breakdown: otherBreakdown,
      total_costs: pyRound(totalCosts, 2),
    },
    revenue: { ...revenueBreakdown, total_revenue: pyRound(revenue, 2) },
    net_profit: pyRound(netProfit, 2),
    profit_margin_percent: revenue > 0 ? pyRound((netProfit / revenue) * 100, 1) : 0,
    profit_per_bird: d.bird_count ? pyRound(netProfit / d.bird_count, 2) : 0,
    roi_percent: totalCosts > 0 ? pyRound((netProfit / totalCosts) * 100, 1) : 0,
    warnings,
  };
}
