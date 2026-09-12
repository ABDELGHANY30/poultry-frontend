import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Article } from '../models';

export const ARTICLES: Article[] = [
  {
    id: 'a1', category: 'broiler', icon: '🐔', readTimeMinutes: 8, published: true,
    tags: ['broiler', 'management', 'weekly'],
    titleEn: 'Week-by-Week Broiler Management Guide',
    titleAr: 'دليل إدارة الفروج أسبوعاً بأسبوع',
    summaryEn: 'A complete guide from chick placement to slaughter covering temperature, feed, water, and health.',
    summaryAr: 'دليل شامل من استلام الكتاكيت حتى الذبح يغطي الحرارة والعلف والماء والصحة.',
    contentEn: `## Week 1 (Days 1–7): The Critical Period

Warm the brooding area to **34–35°C** before chick arrival. Place drinkers and feeders at chick height. Use paper or cardboard litter for the first 3 days to prevent chicks from eating bedding.

**Key targets:**
- Temperature under brooder: 32–35°C
- 24-hour lighting for first 3 days
- Starter feed (22–24% protein) available ad libitum
- Water: clean, warm, chlorinated

**Signs of good brooding:** Chicks spread evenly, active, eating and drinking.

## Week 2 (Days 8–14)
Reduce temperature to **29–32°C**. Expand the brooding area. Perform **Gumboro (IBD) vaccination** on Day 14 via drinking water (withhold water 2 hours before).

## Week 3 (Days 15–21)
Temperature: **26–29°C**. Birds should be fully feathered. **Newcastle booster** on Day 21. Switch to grower feed (20–22% protein) if not already done.

## Weeks 4–6 (Days 22–42): Finishing Phase
Full house ventilation. Temperature: 20–26°C. Switch to **finisher feed** (18–20% protein) around Day 25. Weigh a sample (50–100 birds) weekly to monitor growth. Target: 2.0–2.5 kg at Day 35–42.`,
    contentAr: `## الأسبوع الأول (الأيام 1-7): الفترة الحرجة

سخن منطقة الحضانة إلى **34-35°م** قبل وصول الكتاكيت. ضع الشاربات والمعالف على ارتفاع الكتاكيت. استخدم ورقاً أو كرتوناً فرشاً للأيام الثلاثة الأولى.

**الأهداف الرئيسية:**
- الحرارة تحت المدفأة: 32-35°م
- إضاءة 24 ساعة لأول 3 أيام
- علف بادئ (22-24% بروتين) بدون تحديد
- ماء نظيف ودافئ

**علامات الحضانة الجيدة:** الكتاكيت موزعة بالتساوي، نشطة، تأكل وتشرب.

## الأسبوع الثاني (الأيام 8-14)
خفض الحرارة إلى **29-32°م**. توسيع منطقة الحضانة. تطعيم **غامبورو (IBD)** يوم 14 عبر ماء الشرب (احجب الماء ساعتين قبله).

## الأسبوع الثالث (الأيام 15-21)
الحرارة: **26-29°م**. يجب أن تكون الطيور مكتملة الريش. **جرعة نيوكاسل المعززة** يوم 21. التحول لعلف الناشئ (20-22% بروتين).

## الأسابيع 4-6 (الأيام 22-42): مرحلة الإنهاء
تهوية كاملة للبيت. حرارة: 20-26°م. تحول لـ**علف الناهي** (18-20% بروتين) حول اليوم 25. وزن عينة (50-100 طائر) أسبوعياً. الهدف: 2.0-2.5 كجم عند اليوم 35-42.`,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'a2', category: 'vaccine', icon: '💉', readTimeMinutes: 5, published: true,
    tags: ['vaccine', 'broiler', 'schedule'],
    titleEn: 'Essential Vaccination Schedule for Broilers & Layers',
    titleAr: 'جدول التطعيم الأساسي للفروج ودجاج البياض',
    summaryEn: 'Complete vaccination programs with timing, method, storage, and administration tips.',
    summaryAr: 'برامج تطعيم كاملة مع التوقيت والطريقة والتخزين ونصائح الإعطاء.',
    contentEn: `## Broiler Vaccination Schedule

| Day | Vaccine | Disease | Method |
|-----|---------|---------|--------|
| 1   | Marek's | Marek's Disease | Injection (hatchery) |
| 7   | ND + IB | Newcastle + Infectious Bronchitis | Eye drop or spray |
| 14  | IBD (Gumboro) | Gumboro Disease | Drinking water |
| 21  | ND Booster | Newcastle | Drinking water |
| 28  | IBD Booster (optional) | Gumboro | Drinking water |

## Layer Vaccination Schedule

| Day | Vaccine | Method |
|-----|---------|--------|
| 1 | Marek's | Injection |
| 7 | ND + IB | Eye drop |
| 14 | IBD | Water |
| 21 | ND Booster | Water |
| 28 | ILT | Eye drop |
| 56 | EDS + ND | Injection |
| 112 | ND + IB Pre-Lay | Injection |

## Critical Tips
- **Always check expiry date** before using vaccines
- Store at **2–8°C** — never freeze live vaccines
- Use within **2 hours** of reconstitution
- **Withhold water 2 hours** before water-administered vaccines
- Use **chlorine-free, cool water** for water vaccination
- **No antibiotics** on vaccination day`,
    contentAr: `## جدول تطعيم الفروج

| اليوم | اللقاح | المرض | الطريقة |
|-------|--------|-------|---------|
| 1 | ماريك | مرض ماريك | حقن (مفرخة) |
| 7 | نيوكاسل + IB | نيوكاسل + التهاب الشعب | قطرة عين أو رذاذ |
| 14 | IBD (غامبورو) | مرض غامبورو | ماء الشرب |
| 21 | معزز نيوكاسل | نيوكاسل | ماء الشرب |
| 28 | معزز IBD (اختياري) | غامبورو | ماء الشرب |

## جدول تطعيم دجاج البياض

| اليوم | اللقاح | الطريقة |
|-------|--------|---------|
| 1 | ماريك | حقن |
| 7 | نيوكاسل + IB | قطرة عين |
| 14 | IBD | ماء |
| 21 | معزز نيوكاسل | ماء |
| 28 | ILT | قطرة عين |
| 56 | EDS + نيوكاسل | حقن |
| 112 | نيوكاسل + IB قبل الإنتاج | حقن |

## نصائح حاسمة
- **تحقق دائماً من تاريخ الانتهاء** قبل استخدام اللقاحات
- احفظ بين **2-8°م** — لا تجمد اللقاحات الحية
- استخدم خلال **ساعتين** من التخفيف
- **احجب الماء ساعتين** قبل التطعيم بالماء
- استخدم **ماءً بارداً بدون كلور**
- **لا مضادات حيوية** يوم التطعيم`,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'a3', category: 'disease', icon: '🔬', readTimeMinutes: 10, published: true,
    tags: ['disease', 'treatment', 'diagnosis'],
    titleEn: 'Identifying and Treating Common Poultry Diseases',
    titleAr: 'التعرف على أمراض الدواجن الشائعة وعلاجها',
    summaryEn: 'Recognize Newcastle, Gumboro, CRD, Coccidiosis and more with treatment protocols.',
    summaryAr: 'تعرف على أعراض نيوكاسل وغامبورو وأمراض الجهاز التنفسي والكوكسيديا مع بروتوكولات العلاج.',
    contentEn: `## Newcastle Disease (ND)
**Signs:** Twisted neck, green/white diarrhea, respiratory distress, sudden death, drop in egg production
**Prevention:** Regular ND vaccination (Day 7 + booster Day 21)
**Treatment:** No specific treatment. Supportive care only (vitamins, electrolytes).

## Gumboro Disease (IBD)
**Signs:** Sudden onset, severe depression, ruffled feathers, white watery diarrhea, affects 14–21 day birds
**Prevention:** IBD vaccine at Day 14
**Treatment:** Supportive — vitamins C and E, electrolytes, soft feed

## Chronic Respiratory Disease (CRD / Mycoplasma)
**Cause:** Mycoplasma gallisepticum
**Signs:** Coughing, nasal discharge, rattling breathing, swollen sinuses, reduced growth
**Treatment:** Tylosin, Doxycycline, or Enrofloxacin (veterinary prescription required)

## Coccidiosis
**Cause:** Eimeria species
**Signs:** Bloody/brown diarrhea, huddling, severe weight loss, high mortality in 2–6 week birds
**Prevention:** Coccidiostat in feed or water throughout the growing period
**Treatment:** Amprolium or Toltrazuril in water for 3–5 days

## Infectious Bronchitis (IB)
**Signs:** Coughing, sneezing, nasal discharge, reduced feed, drop in egg production/quality
**Prevention:** IB component in Day 7 vaccine
**Treatment:** Supportive care, antibiotics to prevent secondary infection

## General Rules
- Isolate sick birds **immediately**
- Disinfect equipment between flocks
- Notify authorities for suspected notifiable diseases
- Always consult a **licensed veterinarian** for treatment`,
    contentAr: `## مرض نيوكاسل (ND)
**الأعراض:** التواء الرقبة، إسهال أخضر/أبيض، ضيق تنفس، نفوق مفاجئ، انخفاض الإنتاج
**الوقاية:** تطعيم منتظم (اليوم 7 + معزز اليوم 21)
**العلاج:** لا يوجد علاج محدد. رعاية داعمة فقط (فيتامينات، إلكتروليتات).

## مرض غامبورو (IBD)
**الأعراض:** بداية مفاجئة، كآبة شديدة، ريش منتفش، براز أبيض مائي، يصيب طيور 14-21 يوم
**الوقاية:** لقاح IBD يوم 14
**العلاج:** داعم — فيتامين C وE، إلكتروليتات، علف لين

## أمراض الجهاز التنفسي المزمنة (CRD / ميكوبلازما)
**السبب:** ميكوبلازما غالوسيبتيكوم
**الأعراض:** سعال، إفرازات أنفية، تنفس خشن، تورم الجيوب، تراجع النمو
**العلاج:** تيلوسين أو دوكسيسيكلين أو إنروفلوكساسين (وصفة بيطرية)

## الكوكسيديا
**السبب:** طفيليات أيميريا
**الأعراض:** براز دموي/بني، تجمع، نقص وزن شديد، نفوق مرتفع في طيور 2-6 أسابيع
**الوقاية:** مضاد كوكسيديا في العلف أو الماء طوال فترة التربية
**العلاج:** أمبروليوم أو تولترازوريل في الماء لمدة 3-5 أيام

## القواعد العامة
- عزل الطيور المريضة **فوراً**
- تعقيم المعدات بين القطعان
- إبلاغ السلطات عن الأمراض المشتبه بها
- استشر دائماً **طبيباً بيطرياً مرخصاً** للعلاج`,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'a4', category: 'feeding', icon: '🌾', readTimeMinutes: 6, published: true,
    tags: ['feeding', 'nutrition', 'FCR'],
    titleEn: 'Optimal Feeding Programs for Broilers and Layers',
    titleAr: 'برامج التغذية المثلى للفروج ودجاج البياض',
    summaryEn: 'Starter, grower, and finisher programs with FCR targets and water management.',
    summaryAr: 'برامج البادئ والناشئ والناهي مع أهداف التحويل الغذائي وإدارة المياه.',
    contentEn: `## Broiler Feeding Phases

### Starter (Days 1–10)
- Protein: **22–24%** | Energy: 2,900–3,000 Kcal/kg
- Form: fine crumble | Expected consumption: ~150g/bird total

### Grower (Days 11–24)
- Protein: **20–22%** | Energy: 3,000–3,100 Kcal/kg
- Form: coarse crumble or pellet

### Finisher (Days 25–slaughter)
- Protein: **18–20%** | Energy: 3,100–3,200 Kcal/kg
- Form: pellet | Withdraw 8–12 hours before slaughter

## Water Management
- Water:Feed ratio = **1.8:1** (normal) → **2.5:1** (hot weather)
- Always provide fresh, clean water
- Clean drinkers **daily**

## FCR Targets
| Age | Target FCR |
|-----|-----------|
| Day 35 | ≤ 1.75 |
| Day 42 | ≤ 1.85 |
| Day 49 | ≤ 2.00 |

A high FCR (>2.2) signals: poor feed quality, disease, or management issues.`,
    contentAr: `## مراحل تغذية الفروج

### البادئ (الأيام 1-10)
- بروتين: **22-24%** | طاقة: 2900-3000 سعر/كجم
- شكل: فتيت ناعم | استهلاك متوقع: ~150 غ/طائر إجمالاً

### الناشئ (الأيام 11-24)
- بروتين: **20-22%** | طاقة: 3000-3100 سعر/كجم
- شكل: فتيت خشن أو حبوب

### الناهي (الأيام 25-الذبح)
- بروتين: **18-20%** | طاقة: 3100-3200 سعر/كجم
- شكل: حبوب | سحب 8-12 ساعة قبل الذبح

## إدارة المياه
- نسبة الماء للعلف = **1.8:1** (طبيعي) ← **2.5:1** (جو حار)
- وفر دائماً ماءً نظيفاً وطازجاً
- نظف الشاربات **يومياً**

## أهداف معدل التحويل الغذائي
| العمر | FCR المستهدف |
|-------|------------|
| اليوم 35 | ≤ 1.75 |
| اليوم 42 | ≤ 1.85 |
| اليوم 49 | ≤ 2.00 |

FCR مرتفع (>2.2) يشير إلى: جودة علف رديئة، مرض، أو مشاكل في الإدارة.`,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'a5', category: 'hygiene', icon: '🧹', readTimeMinutes: 7, published: true,
    tags: ['hygiene', 'biosecurity', 'disinfection'],
    titleEn: 'Farm Biosecurity and Hygiene Protocols',
    titleAr: 'بروتوكولات الأمن الحيوي ونظافة المزرعة',
    summaryEn: 'Essential biosecurity steps to prevent disease entry and spread between flocks.',
    summaryAr: 'خطوات الأمن الحيوي الأساسية لمنع دخول الأمراض وانتشارها بين القطعان.',
    contentEn: `## Between-Flock Cleanout Protocol

### Step 1 — Remove all birds and organic matter
### Step 2 — Dry clean (sweep, scrape, blow out)
### Step 3 — Soak with water + detergent (30 minutes)
### Step 4 — High-pressure wash until runoff is clear
### Step 5 — Apply disinfectant (quaternary ammonium, iodine, or glutaraldehyde)
### Step 6 — Terminal fumigation with formaldehyde (optional, high-risk farms)
### Step 7 — Rest period: minimum **14 days** empty

## Daily Biosecurity During Flock
- Change footwear at farm entrance (footbath)
- Visitors wear coveralls and boot covers
- Do NOT share equipment between farms
- Dispose of dead birds in pit or incinerator **daily**
- Rodent and wild bird control

## Disinfectant Rotation
Rotate every cycle to prevent resistance:
1. Quaternary ammonium compounds (Quats)
2. Glutaraldehyde-based
3. Iodine-based (Iodophor)
4. Hydrogen peroxide-based`,
    contentAr: `## بروتوكول التنظيف بين القطعان

### الخطوة 1 — إزالة جميع الطيور والمواد العضوية
### الخطوة 2 — تنظيف جاف (كنس، كشط، نفخ)
### الخطوة 3 — نقع بالماء والمنظف (30 دقيقة)
### الخطوة 4 — غسيل بضغط عالٍ حتى يكون الصرف نظيفاً
### الخطوة 5 — تطبيق مطهر (أمونيوم رباعي، أيودين، أو غلوتارالدهيد)
### الخطوة 6 — تبخير نهائي بالفورمالدهيد (اختياري، مزارع عالية المخاطر)
### الخطوة 7 — فترة راحة: **14 يوماً** على الأقل فارغة

## الأمن الحيوي اليومي أثناء القطيع
- تغيير الأحذية عند مدخل المزرعة (حوض تعقيم)
- الزوار يرتدون ملابس واقية وأغطية أحذية
- عدم مشاركة المعدات بين المزارع
- التخلص من الطيور النافقة في حفرة أو محرقة **يومياً**
- مكافحة القوارض والطيور البرية

## تناوب المطهرات
تناوب كل دورة لمنع المقاومة:
1. مركبات الأمونيوم الرباعي
2. مستحضرات الغلوتارالدهيد
3. مستحضرات الأيودين
4. مستحضرات بيروكسيد الهيدروجين`,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'a6', category: 'broiler', icon: '🌡️', readTimeMinutes: 5, published: true,
    tags: ['temperature', 'ventilation', 'heat-stress'],
    titleEn: 'Temperature & Ventilation Management',
    titleAr: 'إدارة درجة الحرارة والتهوية',
    summaryEn: 'Week-by-week temperature targets and recognizing heat/cold stress.',
    summaryAr: 'أهداف الحرارة أسبوعاً بأسبوع والتعرف على الإجهاد الحراري والبرودي.',
    contentEn: `## Temperature Targets by Week

| Week | Brooder Temp | House Temp | Humidity |
|------|-------------|------------|----------|
| 1 | 32–35°C | 28–30°C | 60–70% |
| 2 | 29–32°C | 26–28°C | 60–70% |
| 3 | 26–29°C | 24–26°C | 55–65% |
| 4 | 23–26°C | 22–24°C | 50–65% |
| 5+ | — | 20–23°C | 50–65% |

## Heat Stress Recognition
- Birds spread near walls, away from feeders
- Rapid panting, wings held away from body
- Reduced feed intake, increased water consumption
- Increased mortality

**Action:** Increase ventilation, provide ice water, reduce stocking density, spray roof with water.

## Cold Stress Recognition
- Birds huddle under heat source
- Loud persistent cheeping
- Slow to reach feeders and drinkers

**Action:** Check and repair heat source, reduce ventilation inlets.`,
    contentAr: `## أهداف الحرارة أسبوعاً بأسبوع

| الأسبوع | حرارة المدفأة | حرارة البيت | الرطوبة |
|---------|--------------|-------------|---------|
| 1 | 32-35°م | 28-30°م | 60-70% |
| 2 | 29-32°م | 26-28°م | 60-70% |
| 3 | 26-29°م | 24-26°م | 55-65% |
| 4 | 23-26°م | 22-24°م | 50-65% |
| 5+ | — | 20-23°م | 50-65% |

## التعرف على الإجهاد الحراري
- الطيور منتشرة قرب الجدران بعيداً عن المعالف
- لهث سريع، أجنحة بعيدة عن الجسم
- انخفاض أكل الطعام، زيادة الشرب
- زيادة النفوق

**الإجراء:** زد التهوية، وفر ماءً بارداً، قلل الكثافة، رش السقف بالماء.

## التعرف على الإجهاد البرودي
- الطيور متجمعة تحت مصدر الحرارة
- صراخ مستمر وعالٍ
- بطء في الوصول للمعالف والشاربات

**الإجراء:** تحقق من وأصلح مصدر الحرارة، قلل فتحات التهوية.`,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
];

@Injectable({ providedIn: 'root' })
export class LibraryService {
  getArticles() { return of(ARTICLES); }
  getArticle(id: string) { return of(ARTICLES.find(a => a.id === id)); }
}
