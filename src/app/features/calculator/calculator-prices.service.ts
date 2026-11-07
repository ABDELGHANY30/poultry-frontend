import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import {
  MarketEntry, MarketSnapshot, MARKET_COST_KEYS, MARKET_SELL_KEYS, isMarketStale, isMarketUsable,
} from './calculator-live-data';

/**
 * تخزين أسعار المستخدم محلياً على الجهاز (بديل price_store.py).
 * بيستخدم @capacitor/preferences: على الموبايل بيتخزن في UserDefaults/SharedPreferences
 * (ثابت ومش بيتمسح مع الكاش)، وعلى المتصفح بيشتغل تلقائياً فوق localStorage.
 */

export interface DefaultPrice { label: string; unit: string; price: number }

export const DEFAULT_PRICES: Record<string, DefaultPrice> = {
  fan_18_inch:          { label: 'شفاطة 18 بوصة', unit: 'قطعة', price: 2500 },
  fan_24_inch:          { label: 'شفاطة 24 بوصة', unit: 'قطعة', price: 4200 },
  fan_36_inch:          { label: 'شفاطة 36 بوصة (تونل)', unit: 'قطعة', price: 7500 },
  cooling_pad_m2:       { label: 'كوولينج باد CEL-DEK', unit: 'م²', price: 850 },
  cooling_pump:         { label: 'مضخة مياه تبريد', unit: 'قطعة', price: 3500 },
  evaporative_cooler:   { label: 'مبرد هوائي منزلي', unit: 'قطعة', price: 4000 },
  gas_brooder:          { label: 'حامل غاز (Brooder)', unit: 'قطعة', price: 1800 },
  hot_air_heater:       { label: 'سخان هواء ساخن (Hot Air)', unit: 'قطعة', price: 15000 },
  electric_heater_small:{ label: 'دفاية كهرباء صغيرة', unit: 'قطعة', price: 600 },
  nipple_drinker:       { label: 'حلمة مياه (نيبل)', unit: 'قطعة', price: 8 },
  bell_drinker:         { label: 'شارب بلدي / حوض', unit: 'قطعة', price: 90 },
  feeder_tube:          { label: 'معلف أوتوماتيك/أنبوب', unit: 'قطعة', price: 150 },
  led_bulb:             { label: 'لمبة LED', unit: 'قطعة', price: 45 },
  litter_ton:           { label: 'فرشة (نشارة خشب/قش)', unit: 'طن', price: 900 },
  feed_broiler_kg:      { label: 'علف تسمين', unit: 'كجم', price: 21 },
  feed_layer_kg:        { label: 'علف بياض', unit: 'كجم', price: 18 },
  feed_turkey_kg:       { label: 'علف رومي', unit: 'كجم', price: 23 },
  feed_rabbit_kg:       { label: 'علف أرانب (بيليت)', unit: 'كجم', price: 16 },
  feed_quail_kg:        { label: 'علف سمان', unit: 'كجم', price: 20 },
  feed_duck_kg:         { label: 'علف بط', unit: 'كجم', price: 20 },
  chick_price_broiler:  { label: 'سعر كتكوت التسمين', unit: 'طائر', price: 12 },
  chick_price_layer:    { label: 'سعر كتكوت البياض', unit: 'طائر', price: 15 },
  chick_price_turkey:   { label: 'سعر كتكوت الرومي', unit: 'طائر', price: 60 },
  chick_price_rabbit:   { label: 'سعر أرنوب صغير', unit: 'رأس', price: 70 },
  chick_price_quail:    { label: 'سعر كتكوت السمان', unit: 'طائر', price: 3 },
  chick_price_duck:     { label: 'سعر بطة صغيرة', unit: 'طائر', price: 18 },
  battery_cage_slot:    { label: 'تجهيز قفص بطارية (للطائر الواحد)', unit: 'طائر', price: 45 },
  medicine_per_bird:    { label: 'أدوية وتحصينات (للطائر/الدورة - اختياري)', unit: 'طائر', price: 3 },
  labor_per_bird:       { label: 'عمالة (للطائر/الدورة - اختياري)', unit: 'طائر', price: 2 },
  utilities_per_bird:   { label: 'كهرباء ومياه (للطائر/الدورة - اختياري)', unit: 'طائر', price: 1.5 },
};

export const VALID_EQUIPMENT_CATEGORIES = [
  'fans', 'cooling', 'heating', 'water_equipment',
  'feed_equipment', 'lighting', 'litter', 'cage_setup',
];

const STORAGE_KEY = 'calculator_user_prices_v1';
const MARKET_STORAGE_KEY = 'calculator_market_snapshot_v1';
const MAX_HISTORY_ENTRIES = 200;

interface HistoryEntry { key: string; label: string; old_price: number | null; new_price: number | null; changed_at: string }
interface UserOverrides {
  items: Record<string, number>;
  last_updated: string | null;
  history: HistoryEntry[];
  excluded_categories: string[];
}

const emptyOverrides = (): UserOverrides => ({
  items: {}, last_updated: null, history: [], excluded_categories: [],
});

@Injectable({ providedIn: 'root' })
export class CalculatorPricesService {
  private overrides: UserOverrides = emptyOverrides();
  /** آخر لقطة لأسعار السوق (بتتحفظ على الجهاز عشان الحاسبة تشتغل أوفلاين) */
  private market: MarketSnapshot | null = null;
  /** استنى الـ promise ده قبل أي قراءة/حساب عشان تضمن إن البيانات اتحملت من الجهاز */
  readonly ready: Promise<void> = this.load();

  private async load(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: STORAGE_KEY });
      if (value) {
        const data = JSON.parse(value);
        this.overrides = { ...emptyOverrides(), ...data };
      }
    } catch (e) {
      console.error('فشل قراءة الأسعار المحفوظة، هنستخدم الافتراضية:', e);
      this.overrides = emptyOverrides();
    }
    try {
      const { value } = await Preferences.get({ key: MARKET_STORAGE_KEY });
      if (value) this.market = JSON.parse(value);
    } catch {
      this.market = null;
    }
  }

  // ── أسعار السوق ───────────────────────────────────────────

  /** سعر السوق لمفتاح معين لو موجود ومش أقدم من الحد الأقصى */
  private marketEntry(key: string): MarketEntry | undefined {
    const e = this.market?.items?.[key];
    return isMarketUsable(e) ? e : undefined;
  }

  /** السعر الأساسي (من غير تخصيص المستخدم): السوق لو متاح، وإلا الافتراضي */
  private baselinePrice(key: string): number | undefined {
    if ((MARKET_COST_KEYS as readonly string[]).includes(key)) {
      const m = this.marketEntry(key);
      if (m) return m.price;
    }
    return DEFAULT_PRICES[key]?.price;
  }

  async setMarketSnapshot(snapshot: MarketSnapshot | null): Promise<void> {
    this.market = snapshot;
    if (snapshot) await Preferences.set({ key: MARKET_STORAGE_KEY, value: JSON.stringify(snapshot) });
    else await Preferences.remove({ key: MARKET_STORAGE_KEY });
  }

  /** ملخص حالة السوق للعرض: آخر جلب + عدد الأسعار المستخدمة فعلاً + هل فيها قديم */
  getMarketStatus(): { fetched_at: string | null; applied: number; stale: boolean; newest: string | null } {
    const items = this.market?.items ?? {};
    const costKeys = (MARKET_COST_KEYS as readonly string[]).filter(k => this.marketEntry(k));
    const usable = Object.entries(items).filter(([, e]) => isMarketUsable(e));
    const stale = usable.some(([k, e]) => isMarketStale(k, e));
    const newest = usable.map(([, e]) => e.updated_at).sort().pop() ?? null;
    return { fetched_at: this.market?.fetched_at ?? null, applied: costKeys.length, stale, newest };
  }

  /** سعر بيع الكيلو الحي لنوع الطائر من السوق (للجدوى) */
  getMarketSellPrice(poultryType: string): (MarketEntry & { stale: boolean }) | null {
    const key = MARKET_SELL_KEYS[poultryType];
    const e = key ? this.marketEntry(key) : undefined;
    return e ? { ...e, stale: isMarketStale(key, e) } : null;
  }

  /** سعر البيضة من السوق (أبيض/أحمر) */
  getMarketEggPrice(color: 'white' | 'red'): (MarketEntry & { stale: boolean }) | null {
    const key = color === 'white' ? 'egg_white' : 'egg_red';
    const e = this.marketEntry(key);
    return e ? { ...e, stale: isMarketStale(key, e) } : null;
  }

  private async persist(): Promise<void> {
    await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(this.overrides) });
  }

  /** نفس شكل GET /calculator/prices */
  getPrices(): any {
    const items: Record<string, any> = {};
    for (const [key, val] of Object.entries(DEFAULT_PRICES)) {
      const custom = this.overrides.items[key];
      const market = (MARKET_COST_KEYS as readonly string[]).includes(key) ? this.marketEntry(key) : undefined;
      items[key] = {
        label: val.label,
        unit: val.unit,
        // الأولوية: سعر المستخدم المخصص > سعر السوق > الافتراضي
        price: custom !== undefined ? custom : (market ? market.price : val.price),
        default_price: val.price,
        is_custom: custom !== undefined,
        source: custom !== undefined ? 'custom' : (market ? 'market' : 'default'),
        market_price: market?.price ?? null,
        market_source: market?.source ?? null,
        market_updated_at: market?.updated_at ?? null,
        market_stale: market ? isMarketStale(key, market) : false,
      };
    }
    return {
      items,
      last_updated: null,
      user_last_updated: this.overrides.last_updated,
      has_custom_prices: Object.keys(this.overrides.items).length > 0,
      excluded_categories: [...this.overrides.excluded_categories],
    };
  }

  /** نفس POST /calculator/prices */
  async updatePrices(updates: Record<string, number>): Promise<any> {
    const entries = Object.entries(updates || {});
    if (!entries.length) throw new Error('لازم تبعت سعر واحد على الأقل للتحديث');

    const now = new Date().toISOString();
    for (const [key, raw] of entries) {
      const newPrice = Number(raw);
      if (!isFinite(newPrice) || raw === null || (raw as any) === '') continue; // خانة فاضية/غلط: نتجاهلها
      if (newPrice < 0) continue; // سعر سالب: نتجاهله
      // السعر الأساسي = سعر السوق (لو متاح) أو الافتراضي. لو المستخدم حفظ من غير ما يعدّل،
      // السعر بيساوي الأساسي فمش هيتسجل كتخصيص (وإلا سعر السوق كان هيتثبّت بدل ما يتحدّث).
      const baseline = this.baselinePrice(key);
      const oldPrice = this.overrides.items[key] ?? baseline ?? null;
      if (oldPrice === newPrice) continue;
      // لو رجّع السعر للأساسي، نمسح التخصيص بدل ما يفضل معلّم "مخصص"
      if (baseline !== undefined && newPrice === baseline) delete this.overrides.items[key];
      else this.overrides.items[key] = newPrice;
      this.overrides.history.push({
        key, label: DEFAULT_PRICES[key]?.label ?? key,
        old_price: oldPrice, new_price: newPrice, changed_at: now,
      });
    }
    this.overrides.history = this.overrides.history.slice(-MAX_HISTORY_ENTRIES);
    this.overrides.last_updated = now;
    await this.persist();
    return this.getPrices();
  }

  /** نفس POST /calculator/prices/reset (keys فاضية = رجّع الكل) */
  async resetPrices(keys?: string[] | null): Promise<any> {
    const now = new Date().toISOString();
    // null أو قائمة فاضية = رجّع الكل (كانت القائمة الفاضية مبتعملش حاجة)
    const resetKeys = keys && keys.length ? keys : Object.keys(this.overrides.items);
    for (const key of resetKeys) {
      const old = this.overrides.items[key];
      delete this.overrides.items[key];
      const def = this.baselinePrice(key) ?? null;
      if (old !== undefined && old !== def) {
        this.overrides.history.push({
          key, label: DEFAULT_PRICES[key]?.label ?? key,
          old_price: old, new_price: def, changed_at: now,
        });
      }
    }
    this.overrides.history = this.overrides.history.slice(-MAX_HISTORY_ENTRIES);
    this.overrides.last_updated = now;
    await this.persist();
    return this.getPrices();
  }

  /** نفس GET /calculator/prices/history — الأحدث أولاً */
  getHistory(limit = 50): HistoryEntry[] {
    return [...this.overrides.history].reverse().slice(0, limit);
  }

  /** نفس POST /calculator/equipment/exclusions */
  async setExcludedCategories(categories: string[]): Promise<any> {
    this.overrides.excluded_categories = categories.filter(c => VALID_EQUIPMENT_CATEGORIES.includes(c));
    this.overrides.last_updated = new Date().toISOString();
    await this.persist();
    return this.getPrices();
  }
}
