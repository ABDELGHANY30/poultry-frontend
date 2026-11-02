import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface DisClass { id: string; name: string; also?: string; strong: string; weak: string; best: string; warn: string; }
interface Purpose { goal: string; use: string; avoid: string; }

const CLASSES: DisClass[] = [
  { id: 'chlorine', name: '🧴 الكلور (هيبوكلوريت)', also: 'ماء جافيل ومركبات الكلور',
    strong: 'بكتيريا وفيروسات (حتى غير المغلّفة) وفطريات، وبيشتغل بسرعة وسعره رخيص',
    weak: 'بيفقد فاعليته بسرعة مع الأوساخ والمواد العضوية، ومش ثابت',
    best: 'مياه الشرب (بتركيز منخفض)، أحواض الأقدام، والأرضيات والأسطح بعد غسيل كويس. في الملف: كلور 2% مع جير للرومي، وكلور 1% لحوض الأقدام في البط',
    warn: 'ماتخلطوش أبدًا بحمض أو أمونيا. بيآكل المعادن. غيّر المحلول بانتظام' },
  { id: 'quat', name: '🧼 الأمونيوم الرباعي', also: 'كواتيرنري (QAC)',
    strong: 'بكتيريا وفيروسات مغلّفة (زي النيوكاسل والإنفلونزا والتهاب الشعب)، وريحته خفيفة',
    weak: 'ضعيف ضد الفيروسات غير المغلّفة (زي الجامبورو) والجراثيم المتحوصلة، وبيتأثر بالمياه العسرة وبقايا الصابون والأوساخ',
    best: 'أسطح ومعدات نضيفة بعد الغسيل الجيد، والروتين اليومي',
    warn: 'اشطف بقايا الصابون قبله، وماتعتمدش عليه لوحده بعد مرض فيروسي صعب' },
  { id: 'peroxy', name: '💥 البيروكسيجين', also: 'زي Virkon (بيروكسي مونو سلفات)',
    strong: 'نطاق واسع: بكتيريا وفيروسات (منها غير المغلّفة) وفطريات، وبيتحمل جزء من الأوساخ أكتر من الكلور',
    weak: 'أغلى نسبيًا، وبيتأثر بزمن التحضير (يتحضّر طازة)',
    best: 'أحواض الأقدام، تطهير العنبر والمعدات بعد الغسيل، والرش الدوري',
    warn: 'ممكن يآكل بعض المعادن ومهيّج: نظارة وقفازات وقناع' },
  { id: 'aldehyde', name: '🧪 الألدهيدات', also: 'جلوتارالدهيد وفورمالدهيد (فورمالين)',
    strong: 'نطاق واسع جدًا يشمل الفيروسات غير المغلّفة والفطريات، وفورمالدهيد بيقتل حتى الجراثيم المتحوصلة',
    weak: 'أبطأ مفعولًا، وسامّ ومهيّج',
    best: 'تدخين العنبر الفاضي بعد الغسيل (زي بروتوكول الرومي في الملف)، والمعدات، والمفرخات',
    warn: 'للعنبر الفاضي بس، بدون طيور وبعد التهوية. فورمالدهيد بيحتاج ملابس واقية وقناع والتزام بالقوانين' },
  { id: 'iodine', name: '🟤 اليودوفور (اليود)', also: 'مركبات اليود',
    strong: 'بكتيريا وفيروسات وفطريات، وكويس للأدوات الصغيرة وتطهير الأيدي',
    weak: 'بيفقد فاعليته بسرعة مع الأوساخ، وبيصبغ الأسطح',
    best: 'غمر الأدوات الصغيرة وتطهير الأيدي وأغراض التعامل مع البيض',
    warn: 'مش اقتصادي للأسطح الكبيرة، وغيّر المحلول لما يبهت لونه' },
  { id: 'phenol', name: '🛢️ الفينولات والكريزول', also: 'مشتقات الفينول',
    strong: 'بكتيريا، وبتشتغل حتى مع وجود أوساخ عضوية، وثابتة',
    weak: 'ضعيفة ضد الفيروسات غير المغلّفة',
    best: 'أرضيات وجدران العنبر الفاضي وأحواض الأقدام الخارجية',
    warn: 'سامة للكتاكيت: ماتتستخدمش في وجود طيور ولا على المعالف والمشارب، وسيب العنبر يتهوّى كويس' },
  { id: 'caustic', name: '⚗️ الصودا الكاوية والجير', also: 'هيدروكسيد الصوديوم، جير',
    strong: 'الصودا قوية ضد فيروسات وبكتيريا كتير، والجير رخيص وبيقلل الرطوبة',
    weak: 'الجير لوحده كمطهر ضعيف',
    best: 'أرضيات العنبر الفاضي والمداخل والممرات، وبعد التفشيات. جير مع الكلور للرومي في الملف',
    warn: 'الصودا كاوية للجلد والعين والمعادن: وقاية كاملة، وبعيد عن الطيور' },
  { id: 'lines', name: '🚰 منظفات خطوط المياه', also: 'حمضية أو قلوية، وبيروكسيد/حمض بيروستيك',
    strong: 'بتذيب الطبقة الحيوية والترسبات في خطوط المياه والحلمات',
    weak: 'مش مطهر أسطح عام',
    best: 'خطوط المياه: املأها واتركها 12–24 ساعة ثم اشطف (حسب الملف)',
    warn: 'ماتخلطش حمض مع كلور في نفس المحلول' },
];

const PURPOSES: Purpose[] = [
  { goal: '🚰 مياه الشرب', use: 'كلور بتركيز منخفض مناسب للمياه', avoid: 'أي مطهر أسطح (فينول، فورمالين) في المياه. وأوقف الكلور 24–48 ساعة حوالين لقاح المياه الحي' },
  { goal: '🚰 خطوط المياه والحلمات', use: 'منظف حمضي أو قلوي مخصص للخطوط، أو بيروكسيجين', avoid: 'خلط الحمض بالكلور' },
  { goal: '🥾 أحواض الأقدام', use: 'بيروكسيجين أو كلور أو أمونيوم رباعي', avoid: 'ترك المحلول من غير تغيير: الأوساخ بتضعفه، فغيّره بانتظام' },
  { goal: '🏠 العنبر الفاضي بعد الغسيل (أرضيات وجدران)', use: 'كلور أو بيروكسيجين أو أمونيوم رباعي أو فينولات (في الفاضي بس)', avoid: 'التطهير على أسطح لسه فيها فرشة أو أوساخ، وفي وجود طيور (للفينول والصودا والفورمالين)' },
  { goal: '🦠 فيروس غير مغلّف (زي الجامبورو)', use: 'ألدهيدات أو كلور أو بيروكسيجين أو صودا', avoid: 'الأمونيوم الرباعي لوحده' },
  { goal: '🦠 فيروس مغلّف أو بكتيريا (نيوكاسل، إنفلونزا، سالمونيلا)', use: 'معظم المطهرات بتنفع: أمونيوم رباعي أو فينولات أو كلور أو بيروكسيجين', avoid: 'تقليل التركيز أو الزمن عن الملصق' },
  { goal: '🍄 الفطريات والفرشة العفنة', use: 'كلور أو بيروكسيجين أو ألدهيدات', avoid: 'الاعتماد على المطهر من غير تجفيف الفرشة والعنبر' },
  { goal: '🪱 الكوكسيديا (الأوسيستات)', use: 'الإزالة الجافة والغسيل الجيد والتجفيف والحرارة هي الأساس، ومطهر مخصص ضد الكوكسيديا حسب توصية البيطري', avoid: 'الاعتماد على المطهرات العادية: الأوسيستات مقاومة لمعظمها' },
  { goal: '🔧 المعالف والمشارب والأدوات', use: 'غسيل ثم أمونيوم رباعي أو بيروكسيجين أو كلور، أو يود للأدوات الصغيرة', avoid: 'فينولات وفورمالين، واشطف كويس بعد التطهير لأنها بتلمس العلف والمياه' },
  { goal: '💨 تدخين أو ضباب العنبر الفاضي', use: 'فورمالدهيد (زي بروتوكول الرومي في الملف)', avoid: 'الدخول أو وجود طيور أثناء التدخين، وماتدخلش من غير تهوية وملابس واقية' },
];

/** 🧪 دليل المطهرات: أنواعها، بتنفع مع إيه، وإستخدم إيه لإيه. */
@Component({
  selector: 'app-disinfectants-guide',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="rounded-xl border border-blue-200 bg-blue-50/40">
    <button type="button" (click)="open.set(!open())" class="w-full flex items-center justify-between p-3 text-right">
      <span class="text-sm font-black">🧪 دليل المطهرات: إيه بينفع مع إيه</span>
      <span class="text-xs font-bold text-blue-700">{{ open() ? 'إخفاء ▲' : 'عرض ▼' }}</span>
    </button>

    <div *ngIf="open()" class="px-3 pb-3">
      <div class="rounded-lg bg-white border border-gray-200 p-2 mb-3 text-[11px] text-gray-700">
        <p class="mb-1 font-bold">قواعد ثابتة لأي مطهر:</p>
        <ul class="list-disc pr-4 mb-0 space-y-0.5">
          <li>نضّف وجفّف الأول: المطهر أقل فاعلية على الأوساخ والسطح المبلول زيادة</li>
          <li>اتبع التركيز وزمن التلامس حسب الملصق، ولا تخلط مطهرات مختلفة (خصوصًا الكلور مع الأحماض أو الأمونيا)</li>
          <li>نظارات وقفازات وقناع، وتهوية جيدة، وماتدخلش أثناء التدخين</li>
        </ul>
      </div>

      <div class="flex gap-2 mb-3">
        <button type="button" (click)="mode.set('types')" class="flex-1 py-1.5 rounded-lg text-xs font-bold border"
                [class.bg-blue-600]="mode() === 'types'" [class.text-white]="mode() === 'types'"
                [class.border-gray-200]="mode() !== 'types'" [class.text-gray-600]="mode() !== 'types'">أنواع المطهرات</button>
        <button type="button" (click)="mode.set('use')" class="flex-1 py-1.5 rounded-lg text-xs font-bold border"
                [class.bg-blue-600]="mode() === 'use'" [class.text-white]="mode() === 'use'"
                [class.border-gray-200]="mode() !== 'use'" [class.text-gray-600]="mode() !== 'use'">أستخدم إيه لإيه؟</button>
      </div>

      <div *ngIf="mode() === 'types'" class="space-y-2">
        <div *ngFor="let c of classes" class="rounded-lg bg-white border border-gray-200 p-3">
          <button type="button" (click)="toggle(c.id)" class="w-full text-right">
            <p class="mb-0 text-sm font-bold">{{ c.name }}</p>
            <p *ngIf="c.also" class="mb-0 text-[11px] text-gray-500">{{ c.also }}</p>
          </button>
          <div class="mt-2 text-xs space-y-1">
            <p class="mb-0"><b class="text-green-700">✅ قوي ضد:</b> {{ c.strong }}</p>
            <ng-container *ngIf="opened()[c.id]">
              <p class="mb-0"><b class="text-amber-700">⚠️ ضعيف أو محدود:</b> {{ c.weak }}</p>
              <p class="mb-0"><b class="text-blue-700">📍 أنسب لـ:</b> {{ c.best }}</p>
              <p class="mb-0 rounded bg-red-50 text-red-700 p-1.5"><b>🚫 انتبه:</b> {{ c.warn }}</p>
            </ng-container>
            <button type="button" (click)="toggle(c.id)" class="text-[11px] font-bold text-blue-700">{{ opened()[c.id] ? 'أقل ▲' : 'التفاصيل ▼' }}</button>
          </div>
        </div>
      </div>

      <div *ngIf="mode() === 'use'" class="space-y-2">
        <div *ngFor="let p of purposes" class="rounded-lg bg-white border border-gray-200 p-3 text-xs">
          <p class="mb-1 text-sm font-bold">{{ p.goal }}</p>
          <p class="mb-1"><b class="text-green-700">✅ الأنسب:</b> {{ p.use }}</p>
          <p class="mb-0"><b class="text-red-700">🚫 تجنّب:</b> {{ p.avoid }}</p>
        </div>
      </div>

      <p class="mt-3 mb-0 text-[10px] text-gray-500">
        القواعد العامة وأمثلة التركيزات (كلور 2% للرومي، 1% لحوض البط، ترتيب الغسيل ثم التطهير) من ملف المعلومات. مقارنة أنواع المطهرات نفسها معلومة بيطرية عامة مش من الملف، فراجع ملصق المنتج والطبيب البيطري وقت الاختيار، خصوصًا بعد أي مرض.
      </p>
    </div>
  </div>
  `,
})
export class DisinfectantsGuideComponent {
  @Input() set startOpen(v: boolean) { this.open.set(!!v); }
  open = signal(false);
  mode = signal<'types' | 'use'>('types');
  opened = signal<Record<string, boolean>>({});
  classes = CLASSES;
  purposes = PURPOSES;
  toggle(id: string) { this.opened.update(o => ({ ...o, [id]: !o[id] })); }
}
