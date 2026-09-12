
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

// ══════════════════════════════════════════════════════════════
// البيانات دلوقتي بتتجاب من الباك اند عبر /learning/ui-bundle
// (كانت قبل كده Hardcoded هنا: POULTRY_TYPES, PROGRAMS, DISEASES, TIPS)
// ══════════════════════════════════════════════════════════════

@Component({
  selector: 'app-learning',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="page-wrapper" dir="rtl">

    <!-- Header -->
    <div class="rounded-3xl text-white px-5 py-5 mb-4 relative overflow-hidden"
         style="background:linear-gradient(135deg,#0f2d1a 0%,#2d9e5f 100%)">
      <div class="absolute inset-0 opacity-5"
           style="background:repeating-linear-gradient(45deg,transparent,transparent 20px,white 20px,white 21px)"></div>
    </div>

    <!-- 📦 بانر يظهر لما البيانات المعروضة تكون من نسخة الأوفلاين المخزنة محلياً مش من السيرفر -->
    <div *ngIf="isOffline()"
         class="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-2xl px-4 py-2 mb-4">
      <span>📴</span> لا يوجد اتصال بالسيرفر — بتشوف آخر نسخة محفوظة على جهازك
    </div>

    <!-- Main Tabs -->
    <div class="grid grid-cols-4 gap-2 mb-4">
      <button *ngFor="let tab of mainTabs"
              (click)="activeTab.set(tab.id)"
              class="py-2.5 rounded-2xl text-xs font-bold transition flex flex-col items-center gap-1"
              [class.text-white]="activeTab() === tab.id"
              [class.shadow-md]="activeTab() === tab.id"
              [style.background]="activeTab() === tab.id ? '#2d9e5f' : '#f5f5f5'"
              [style.color]="activeTab() !== tab.id ? '#666' : ''">
        <span class="text-lg">{{ tab.icon }}</span>
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <!-- ══ البرامج ══ -->
    <div *ngIf="activeTab() === 'programs'">

      <!-- اختيار النوع -->
      <div *ngIf="!selectedType()">
        <p class="text-sm font-bold text-gray-600 mb-3">اختر نوع الطائر أو الحيوان:</p>
        <div class="grid grid-cols-2 gap-3">
          <div *ngFor="let t of poultryTypes"
               (click)="selectedType.set(t.id)"
               class="rounded-2xl p-5 flex flex-col items-center gap-2 cursor-pointer border-2 transition hover:shadow-md"
               [style.background]="t.color"
               [style.border-color]="t.accent">
            <span class="text-4xl">{{ t.icon }}</span>
            <p class="font-black text-sm text-center" [style.color]="t.accent">{{ t.label }}</p>
          </div>
        </div>
      </div>

      <!-- البرامج بعد اختيار النوع -->
      <div *ngIf="selectedType() && !selectedProgram()">
        <button (click)="selectedType.set(null)"
                class="flex items-center gap-1 text-green-600 font-bold text-sm mb-4">
          ← رجوع
        </button>

        <div class="flex items-center gap-2 mb-4">
          <span class="text-3xl">{{ currentType()?.icon }}</span>
          <h2 class="font-black text-gray-800 text-lg">{{ currentType()?.label }}</h2>
        </div>

        <div class="space-y-3">
          <div *ngFor="let prog of currentPrograms()"
               (click)="selectedProgram.set(prog)"
               class="rounded-2xl p-4 border-2 cursor-pointer flex items-center gap-3 transition hover:shadow-md"
               [style.background]="prog.color"
               [style.border-color]="prog.accent">
            <span class="text-3xl">{{ prog.icon }}</span>
            <div>
              <p class="font-black text-base" [style.color]="prog.accent">{{ prog.label }}</p>
              <p class="text-xs text-gray-500 mt-0.5">{{ prog.items.length }} عنصر</p>
            </div>
            <span class="mr-auto text-gray-400">←</span>
          </div>
        </div>
      </div>

      <!-- تفاصيل البرنامج -->
      <div *ngIf="selectedProgram()">
        <button (click)="selectedProgram.set(null)"
                class="flex items-center gap-1 text-green-600 font-bold text-sm mb-4">
          ← رجوع
        </button>

        <!-- بحث -->
        <div class="relative mb-4">
          <input [(ngModel)]="searchQuery"
                 placeholder="ابحث بالاسم أو التفاصيل..."
                 class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm pr-10"
                 dir="rtl"/>
          <span class="absolute left-3 top-3 text-gray-400">🔍</span>
        </div>

        <!-- فلاتر النوع -->
        <div class="flex gap-2 overflow-x-auto pb-2 mb-4">
          <button (click)="typeFilter.set('all')"
                  class="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition"
                  [class.text-white]="typeFilter() === 'all'"
                  [style.background]="typeFilter() === 'all' ? selectedProgram()?.accent : ''"
                  [style.border-color]="typeFilter() === 'all' ? selectedProgram()?.accent : '#e0e0e0'">
            الكل ≡
          </button>
          <button *ngFor="let f of uniqueTypes()"
                  (click)="typeFilter.set(f)"
                  class="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition"
                  [class.text-white]="typeFilter() === f"
                  [style.background]="typeFilter() === f ? selectedProgram()?.accent : ''"
                  [style.border-color]="typeFilter() === f ? selectedProgram()?.accent : '#e0e0e0'">
            {{ typeIcon(f) }} {{ f }}
          </button>
        </div>

        <!-- معلومة إضافية عن البرنامج -->
        <div *ngIf="selectedProgram()?.extraInfo"
             class="flex items-start gap-2 rounded-2xl p-3 mb-4 text-sm"
             [style.background]="selectedProgram()?.color"
             [style.color]="selectedProgram()?.accent">
          <span class="flex-shrink-0">💡</span>
          <span class="leading-relaxed">{{ selectedProgram()?.extraInfo }}</span>
        </div>

        <!-- البنود -->
        <div class="space-y-2">
          <div *ngFor="let item of filteredItems()"
               class="bg-white rounded-2xl border p-4 relative"
               [class.border-red-200]="item.important"
               [class.border-gray-100]="!item.important">
            <!-- مهم badge -->
            <span *ngIf="item.important"
                  class="absolute top-3 left-3 text-[10px] font-black text-white px-2 py-0.5 rounded-full"
                  [style.background]="selectedProgram()?.accent">
              ★
            </span>

            <div class="flex items-start gap-3">
              <div class="flex-shrink-0 text-center">
                <div class="text-[10px] font-black px-2 py-1 rounded-xl text-white"
                     [style.background]="selectedProgram()?.accent">
                  {{ item.day }}
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-bold text-gray-800 text-sm">{{ item.title }}</p>
                <p class="text-xs text-gray-500 mt-1 leading-relaxed">{{ item.desc }}</p>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5 inline-block"
                      [style.background]="selectedProgram()?.color"
                      [style.color]="selectedProgram()?.accent">
                  {{ typeIcon(item.type) }} {{ item.type }}
                </span>
              </div>
            </div>
          </div>

          <div *ngIf="filteredItems().length === 0" class="text-center py-8 text-gray-400 text-sm">
            لا توجد نتائج
          </div>
        </div>
      </div>
    </div>

    <!-- ══ الأمراض ══ -->
    <div *ngIf="activeTab() === 'diseases'">

      <div *ngIf="!selectedDisease()">
        <p class="text-sm font-bold text-gray-600 mb-3">اختر مرضاً لتعرف أعراضه وعلاجه:</p>

        <!-- فلترة نوع الطائر/الحيوان -->
        <div class="flex gap-2 overflow-x-auto pb-1 mb-3">
          <button *ngFor="let t of animalTypes"
                  (click)="animalTypeFilter.set(t.id)"
                  class="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1"
                  [class.text-white]="animalTypeFilter() === t.id"
                  [style.background]="animalTypeFilter() === t.id ? '#2d9e5f' : ''"
                  [style.border-color]="animalTypeFilter() === t.id ? '#2d9e5f' : '#e0e0e0'">
            <span>{{ t.icon }}</span> {{ t.label }}
          </button>
        </div>

        <!-- فلترة الخطورة -->
        <div class="flex gap-2 mb-3">
          <button *ngFor="let f of ['الكل','خطر','متوسط']"
                  (click)="diseaseFilter.set(f)"
                  class="flex-1 py-2 rounded-xl text-xs font-bold border transition"
                  [class.text-white]="diseaseFilter() === f"
                  [style.background]="diseaseFilter() === f ? '#2d9e5f' : ''"
                  [style.border-color]="diseaseFilter() === f ? '#2d9e5f' : '#e0e0e0'">
            {{ f }}
          </button>
        </div>

        <div class="space-y-2">
          <div *ngFor="let d of filteredDiseases()"
               (click)="selectedDisease.set(d)"
               class="bg-white rounded-2xl border p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition"
               [style.border-color]="d.levelColor + '44'">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                 [style.background]="d.levelBg">
              {{ d.icon }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-bold text-gray-800 text-sm">{{ d.name }}</p>
              <p class="text-xs text-gray-400 mt-0.5 truncate">{{ d.symptoms[0] }}</p>
            </div>
            <span class="text-xs font-black px-2 py-1 rounded-lg flex-shrink-0"
                  [style.background]="d.levelBg"
                  [style.color]="d.levelColor">
              {{ d.level }}
            </span>
          </div>
        </div>
      </div>

      <!-- تفاصيل مرض -->
      <div *ngIf="selectedDisease()">
        <button (click)="selectedDisease.set(null)"
                class="flex items-center gap-1 text-green-600 font-bold text-sm mb-4">
          ← رجوع
        </button>

        <div class="space-y-3">
          <!-- Header -->
          <div class="rounded-2xl p-4 flex items-center gap-3"
               [style.background]="selectedDisease()?.levelBg">
            <span class="text-4xl">{{ selectedDisease()?.icon }}</span>
            <div>
              <h2 class="font-black text-gray-800 text-lg">{{ selectedDisease()?.name }}</h2>
              <span class="text-xs font-black px-2 py-0.5 rounded-full text-white"
                    [style.background]="selectedDisease()?.levelColor">
                {{ selectedDisease()?.level }}
              </span>
            </div>
          </div>

          <!-- الأعراض -->
          <div class="card">
            <h3 class="font-black text-gray-800 mb-3 flex items-center gap-2">
              <span class="w-7 h-7 bg-red-100 rounded-xl flex items-center justify-center text-sm">🔍</span>
              الأعراض
            </h3>
            <div class="space-y-1.5">
              <div *ngFor="let s of selectedDisease()?.symptoms"
                   class="flex items-start gap-2 text-sm bg-red-50 rounded-xl px-3 py-2">
                <span class="text-red-400 flex-shrink-0 mt-0.5">⚠️</span>
                <span class="text-gray-700">{{ s }}</span>
              </div>
            </div>
          </div>

          <!-- العلاج -->
          <div class="rounded-2xl p-4 border border-green-200 bg-green-50">
            <h3 class="font-black text-green-800 mb-2 flex items-center gap-2">
              <span>💊</span> العلاج
            </h3>
            <p class="text-sm text-green-700 leading-relaxed">{{ selectedDisease()?.treatment }}</p>
          </div>

          <!-- الوقاية -->
          <div class="rounded-2xl p-4 border border-blue-200 bg-blue-50">
            <h3 class="font-black text-blue-800 mb-2 flex items-center gap-2">
              <span>🛡️</span> الوقاية
            </h3>
            <p class="text-sm text-blue-700 leading-relaxed">{{ selectedDisease()?.prevention }}</p>
          </div>

          <!-- التفريق -->
          <div class="card" *ngIf="selectedDisease()?.diffFrom?.length">
            <h3 class="font-black text-gray-800 mb-3 flex items-center gap-2">
              <span class="w-7 h-7 bg-amber-100 rounded-xl flex items-center justify-center text-sm">🔄</span>
              الفرق بينه وبين
            </h3>
            <div class="space-y-2">
              <div *ngFor="let d of selectedDisease()?.diffFrom"
                   class="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-800">
                {{ d }}
              </div>
            </div>
          </div>

          <!-- معلومة إضافية -->
          <div class="card" *ngIf="selectedDisease()?.extraInfo">
            <h3 class="font-black text-gray-800 mb-2 flex items-center gap-2">
              <span class="w-7 h-7 bg-gray-100 rounded-xl flex items-center justify-center text-sm">💡</span>
              معلومة إضافية
            </h3>
            <p class="text-sm text-gray-600 leading-relaxed">{{ selectedDisease()?.extraInfo }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ النصائح ══ -->
    <div *ngIf="activeTab() === 'tips'">
      <div class="space-y-4">
        <div *ngFor="let group of tips"
             class="rounded-2xl p-4 border-2"
             [style.background]="group.color"
             [style.border-color]="group.accent + '44'">
          <h3 class="font-black text-base mb-3 flex items-center gap-2"
              [style.color]="group.accent">
            <span class="text-xl">{{ group.icon }}</span>
            {{ group.title }}
          </h3>
          <div class="space-y-2">
            <div *ngFor="let tip of group.tips"
                 class="flex items-start gap-2 bg-white rounded-xl px-3 py-2.5 text-sm text-gray-700">
              <span [style.color]="group.accent" class="flex-shrink-0 font-bold">✓</span>
              {{ tip }}
            </div>
          </div>
          <p *ngIf="group.extraInfo" class="text-xs mt-3 leading-relaxed opacity-80" [style.color]="group.accent">
            💡 {{ group.extraInfo }}
          </p>
        </div>
      </div>
    </div>

    <!-- ══ دروس ══ -->
    <div *ngIf="activeTab() === 'lessons'">

      <div *ngIf="!selectedLesson()">

        <!-- فلترة الدروس حسب التصنيف -->
        <div class="flex gap-2 overflow-x-auto pb-1 mb-3">
          <button *ngFor="let c of lessonCategories()"
                  (click)="lessonCategoryFilter.set(c.id)"
                  class="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition"
                  [class.text-white]="lessonCategoryFilter() === c.id"
                  [style.background]="lessonCategoryFilter() === c.id ? '#2d9e5f' : ''"
                  [style.border-color]="lessonCategoryFilter() === c.id ? '#2d9e5f' : '#e0e0e0'">
            {{ c.label }}
          </button>
        </div>

        <!-- فلترة الدروس حسب المستوى -->
        <div class="flex gap-2 mb-3">
          <button *ngFor="let lv of ['الكل','مبتدئ','متوسط','متقدم']"
                  (click)="lessonLevelFilter.set(lv)"
                  class="flex-1 py-2 rounded-xl text-xs font-bold border transition"
                  [class.text-white]="lessonLevelFilter() === lv"
                  [style.background]="lessonLevelFilter() === lv ? '#2d9e5f' : ''"
                  [style.border-color]="lessonLevelFilter() === lv ? '#2d9e5f' : '#e0e0e0'">
            {{ lv }}
          </button>
        </div>

        <div class="space-y-3">
          <div *ngFor="let lesson of filteredLessons()"
               (click)="selectedLesson.set(lesson)"
               class="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 cursor-pointer hover:border-green-300 hover:bg-green-50 transition shadow-sm">
            <div class="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center text-2xl flex-shrink-0">
              {{ lesson.icon }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-bold text-gray-800 text-sm">{{ lesson.title }}</p>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-[10px] px-2 py-0.5 rounded-full font-bold"
                      [class.bg-green-100]="lesson.level === 'مبتدئ'"
                      [class.text-green-700]="lesson.level === 'مبتدئ'"
                      [class.bg-blue-100]="lesson.level === 'متوسط'"
                      [class.text-blue-700]="lesson.level === 'متوسط'"
                      [class.bg-purple-100]="lesson.level === 'متقدم'"
                      [class.text-purple-700]="lesson.level === 'متقدم'">
                  {{ lesson.level }}
                </span>
                <span class="text-[10px] text-gray-400">⏱ {{ lesson.duration }} دقيقة</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full font-bold bg-gray-100 text-gray-500">
                  {{ lesson.categoryLabel }}
                </span>
              </div>
            </div>
            <span class="text-gray-300">←</span>
          </div>
        </div>
      </div>

      <!-- درس مفتوح -->
      <div *ngIf="selectedLesson()">
        <button (click)="selectedLesson.set(null)"
                class="flex items-center gap-1 text-green-600 font-bold text-sm mb-4">
          ← رجوع
        </button>
        <div class="card">
          <div class="flex items-center gap-3 mb-5">
            <div class="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center text-3xl">
              {{ selectedLesson()?.icon }}
            </div>
            <div>
              <h2 class="font-black text-gray-800">{{ selectedLesson()?.title }}</h2>
              <p class="text-xs text-gray-400 mt-0.5">⏱ {{ selectedLesson()?.duration }} دقيقة قراءة</p>
            </div>
          </div>

          <div class="space-y-5">
            <div *ngFor="let section of selectedLesson()?.sections; let i = index">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">
                  {{ i + 1 }}
                </div>
                <h3 class="font-bold text-gray-800 text-sm">{{ section.title }}</h3>
              </div>
              <pre class="text-sm text-gray-600 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-xl p-3">{{ section.content }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
  `
})
export class LearningComponent implements OnInit {
  activeTab = signal('programs');
  selectedType = signal<string | null>(null);
  selectedProgram = signal<any>(null);
  selectedDisease = signal<any>(null);
  selectedLesson = signal<any>(null);
  typeFilter = signal('all');
  diseaseFilter = signal('الكل');
  animalTypeFilter = signal('all');
  lessonCategoryFilter = signal('all');
  lessonLevelFilter = signal('الكل');
  searchQuery = '';

  // فلتر الأمراض حسب نوع الطائر/الحيوان: دواجن (عام دجاج) / رومي / بط / سمان / أرانب
  animalTypes = [
    { id: 'all',     label: 'الكل',   icon: '🐾' },
    { id: 'poultry', label: 'دواجن',  icon: '🐔' },
    { id: 'turkey',  label: 'رومي',   icon: '🦃' },
    { id: 'duck',    label: 'بط',     icon: '🦆' },
    { id: 'quail',   label: 'سمان',   icon: '🐦' },
    { id: 'rabbit',  label: 'أرانب',  icon: '🐇' },
  ];

  // ── الاتصال بالباك اند ──────────────────────────────────
  private http = inject(HttpClient);
  private apiBase = `${environment.apiUrl}/learning`; // ✅ مؤكد من الـ Swagger
  private dataLoaded = signal(false); // بيتحول true لما البيانات توصل، يخلي الـ computed تعيد الحساب

  // 📦 مفتاح تخزين نسخة الأوفلاين من بيانات صفحة التعلّم (lessons/diseases/programs/tips)
  // بيتخزن في localStorage الجهاز بعد أول تحميل ناجح من السيرفر، وبيتقرأ منه لو مفيش نت
  private readonly OFFLINE_CACHE_KEY = 'learning_ui_bundle_cache_v1';
  isOffline = signal(false); // true لو البيانات المعروضة جايه من الكاش المحلي مش من السيرفر دلوقتي

  poultryTypes: any[] = [];
  tips: any[] = [];
  private programsData: Record<string, any[]> = {};
  private diseasesData: any[] = [];

  mainTabs = [
    { id: 'programs', label: 'برامج',  icon: '📋' },
    { id: 'diseases', label: 'أمراض',  icon: '🔍' },
    { id: 'tips',     label: 'نصائح',  icon: '⭐' },
    { id: 'lessons',  label: 'دروس',   icon: '📖' },
  ];

  lessons: any[] = [];

  currentType = computed(() => {
    this.dataLoaded(); // اعتماد على الإشارة دي يخلي الحساب يتكرر لما البيانات توصل من الباك اند
    return this.poultryTypes.find(t => t.id === this.selectedType());
  });
  currentPrograms = computed(() => {
    this.dataLoaded();
    return this.programsData[this.selectedType() || ''] || [];
  });

  uniqueTypes(): string[] {
  const items = this.selectedProgram()?.items || [];
  return [...new Set(items.map((i: any) => i.type))] as string[];
}

  filteredItems = computed(() => {
    const items = this.selectedProgram()?.items || [];
    const q = this.searchQuery.toLowerCase();
    const t = this.typeFilter();
    return items.filter((i: any) => {
      const matchQ = !q || i.title.toLowerCase().includes(q) || i.day.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q);
      const matchT = t === 'all' || i.type === t;
      return matchQ && matchT;
    });
  });

  filteredDiseases = computed(() => {
    this.dataLoaded();
    const f = this.diseaseFilter();
    const at = this.animalTypeFilter();
    return this.diseasesData.filter((d: any) => {
      const matchSeverity = f === 'الكل' || d.level === f;
      // مرض 'all' (زي إجهاد الحرارة) بيظهر مهما كان الفلتر المختار
      const matchAnimal = at === 'all' || d.animalType === at || d.animalType === 'all';
      return matchSeverity && matchAnimal;
    });
  });

  // بيبني قايمة تصنيفات الدروس تلقائياً من البيانات الجايه من السيرفر (management/disease/nutrition/...)
  lessonCategories = computed(() => {
    this.dataLoaded();
    const labels = new Map<string, string>();
    labels.set('all', 'الكل');
    for (const l of this.lessons) {
      if (l.category && !labels.has(l.category)) {
        labels.set(l.category, l.categoryLabel || l.category);
      }
    }
    return Array.from(labels, ([id, label]) => ({ id, label }));
  });

  filteredLessons = computed(() => {
    this.dataLoaded();
    const cat = this.lessonCategoryFilter();
    const lvl = this.lessonLevelFilter();
    return this.lessons.filter((l: any) => {
      const matchCategory = cat === 'all' || l.category === cat;
      const matchLevel = lvl === 'الكل' || l.level === lvl;
      return matchCategory && matchLevel;
    });
  });

  ngOnInit(): void {
    this.http.get<any>(`${this.apiBase}/ui-bundle`).subscribe({
      next: (data) => {
        this.applyBundle(data);
        this.isOffline.set(false);

        // 📦 [تخزين الأوفلاين] بعد أي تحميل ناجح من السيرفر، بنخزن نسخة كاملة من البيانات
        // في localStorage الجهاز عشان لو النت قطع بعد كده نقدر نعرضها بدل ما تظهر شاشة فاضية/إيرور
        try {
          localStorage.setItem(this.OFFLINE_CACHE_KEY, JSON.stringify(data));
        } catch (e) {
          console.warn('تعذّر حفظ نسخة الأوفلاين محلياً:', e);
        }
      },
      error: (err) => {
        console.error('فشل تحميل بيانات صفحة التعلّم من الباك اند:', err);

        // 📦 [قراءة الأوفلاين] لو فشل الاتصال بالسيرفر (مفيش نت / السيرفر واقع)،
        // بنحاول نجيب آخر نسخة اتخزنت في localStorage ونعرضها بدل ما نسيب المستخدم من غير بيانات
        const cached = this.loadOfflineCache();
        if (cached) {
          this.applyBundle(cached);
          this.isOffline.set(true);
        }
      }
    });
  }

  // بيوزع بيانات الـ ui-bundle (جايه من السيرفر أو من الكاش المحلي) على متغيرات الكومبوننت
  private applyBundle(data: any): void {
    this.poultryTypes = data.poultry_types || [];
    this.tips = data.tips || [];
    this.lessons = data.lessons || [];
    this.programsData = data.programs || {};
    this.diseasesData = data.diseases || [];
    this.dataLoaded.set(true); // يخلي currentType/currentPrograms/filteredDiseases تعيد الحساب بالبيانات الجديدة
  }

  // 📦 [قراءة الأوفلاين] بيرجع آخر نسخة متخزنة من ui-bundle من localStorage، أو null لو مفيش
  private loadOfflineCache(): any | null {
    try {
      const raw = localStorage.getItem(this.OFFLINE_CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('تعذّر قراءة نسخة الأوفلاين المحلية:', e);
      return null;
    }
  }

  typeIcon(type: string): string {
    const map: any = { 'تحصين': '💉', 'مضاد حيوي': '💊', 'فيتامين': '⚗️', 'تغذية': '🌾', 'إضاءة': '💡', 'تنبيه': '⚠️', 'تكاثر': '🐇', 'معادلة': '🧮', 'ملاحظة': '📝', 'أمن حيوي': '🛡️' };
    return map[type] ?? '📌';
  }
}


