import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

const CATEGORIES = [
  { value: 'broiler',   label: 'بورصة الفراخ',     icon: '🐔', color: '#e8f5e9', headerColor: '#2d9e5f', unit: 'كجم' },
  { value: 'eggs',      label: 'بورصة البيض',       icon: '🥚', color: '#e3f2fd', headerColor: '#1565c0', unit: 'بيضة' },
  { value: 'chicks',    label: 'الكتاكيت',          icon: '🐣', color: '#fff8e1', headerColor: '#f57f17', unit: 'كتكوت' },
  { value: 'breeders',  label: 'الأمهات',           icon: '🐓', color: '#fce4ec', headerColor: '#c62828', unit: 'كجم' },
  { value: 'turkey',    label: 'الرومي',            icon: '🦃', color: '#f3e5f5', headerColor: '#6a1b9a', unit: 'كجم' },
  { value: 'rabbit',    label: 'الأرانب',           icon: '🐇', color: '#e8eaf6', headerColor: '#283593', unit: 'كجم' },
  { value: 'duck',      label: 'البط',              icon: '🦆', color: '#e0f2f1', headerColor: '#00695c', unit: 'كجم' },
  { value: 'feed',      label: 'الأعلاف',           icon: '🌾', color: '#f9fbe7', headerColor: '#827717', unit: 'طن' },
];

@Component({
  selector: 'app-prices',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="page-wrapper" dir="rtl">

    <!-- Header -->
    <div class="rounded-3xl text-white px-6 py-5 mb-4"
         style="background:linear-gradient(135deg,#0f2d1a 0%,#2d9e5f 100%)">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold">📈 أسعار السوق</h1>
          <p class="text-white/70 text-xs mt-1">
            ⏱ آخر تحديث: {{ lastUpdate() | date:'d MMMM yyyy':'':'ar' }}
          </p>
        </div>
        <button *ngIf="isAdmin()" (click)="showAddForm.set(!showAddForm())"
                class="bg-white/20 text-white text-sm font-bold px-4 py-2 rounded-2xl hover:bg-white/30 transition">
          {{ showAddForm() ? '✕' : '+ تحديث' }}
        </button>
      </div>
    </div>

    <!-- Category Tabs -->
    <div class="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
      <button (click)="selectedTab.set('')"
              class="flex-shrink-0 px-4 py-2 rounded-2xl text-xs font-bold border transition"
              [class.bg-green-600]="selectedTab() === ''"
              [class.text-white]="selectedTab() === ''"
              [class.border-green-600]="selectedTab() === ''"
              [class.bg-white]="selectedTab() !== ''"
              [class.border-gray-200]="selectedTab() !== ''"
              [class.text-gray-600]="selectedTab() !== ''">
        🌟 الكل
      </button>
      <button *ngFor="let c of categories"
              (click)="selectedTab.set(c.value)"
              class="flex-shrink-0 px-4 py-2 rounded-2xl text-xs font-bold border transition"
              [class.text-white]="selectedTab() === c.value"
              [class.bg-white]="selectedTab() !== c.value"
              [class.border-gray-200]="selectedTab() !== c.value"
              [class.text-gray-600]="selectedTab() !== c.value"
              [style.background-color]="selectedTab() === c.value ? c.headerColor : ''"
              [style.border-color]="selectedTab() === c.value ? c.headerColor : ''">
        {{ c.icon }} {{ c.label }}
      </button>
    </div>

    <!-- Add Form (Admin) -->
    <div *ngIf="showAddForm() && isAdmin()" class="card border-2 border-green-200 mb-4 space-y-3">
      <h2 class="font-bold text-gray-800">📝 تحديث سعر جديد</h2>

      <div class="grid grid-cols-2 gap-3">
        <!-- 1️⃣ اختار الصنف (الفئة) -->
        <div>
          <label class="form-label">الصنف</label>
          <select [(ngModel)]="form.category" class="form-input" (ngModelChange)="onCategoryChange($event)">
            <option *ngFor="let c of categories" [value]="c.value">{{ c.icon }} {{ c.label }}</option>
          </select>
        </div>
        <div>
          <label class="form-label">الوحدة</label>
          <input [(ngModel)]="form.unit" class="form-input"/>
        </div>
      </div>

      <!-- 2️⃣ الاسم بيقلب اختيارات بناءً على الصنف اللي اخترته فوق -->
      <div>
        <label class="form-label">الاسم</label>
        <select [(ngModel)]="form.item_name_ar" class="form-input">
          <option value=""> اختر الاسم</option>
          <option *ngFor="let item of getItemOptions(form.category)" [value]="item">
            {{ item }}
          </option>
        </select>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="form-label">سعر التنفيذ (جنيه)</label>
          <input [(ngModel)]="form.price_min" type="number" class="form-input" placeholder="0"/>
        </div>
        <div>
          <label class="form-label">السعر المعلن (جنيه)</label>
          <input [(ngModel)]="form.price_max" type="number" class="form-input" placeholder="0"/>
        </div>
      </div>

      <div>
        <label class="form-label">ملاحظات</label>
        <input [(ngModel)]="form.notes" class="form-input" placeholder="مثال: أسعار القاهرة والجيزة"/>
      </div>

      <button (click)="addPrice()" [disabled]="saving()" class="btn-primary btn w-full">
        {{ saving() ? '...' : '✅ حفظ السعر' }}
      </button>
    </div>

    <!-- Loading -->
    <div *ngIf="loading()" class="text-center py-8 text-gray-400">
      <p>جاري التحميل...</p>
    </div>

    <!-- Prices by Category -->
    <div *ngIf="!loading()" class="space-y-4">
      <div *ngFor="let group of visibleGroups()">

        <!-- Category Header -->
        <div class="rounded-2xl px-5 py-3 flex items-center justify-between text-white font-black text-base"
             [style.background-color]="getCategoryColor(group.category, 'header')">
          <span>{{ getCategoryLabel(group.category) }}</span>
          <span class="text-2xl">{{ getCategoryIcon(group.category) }}</span>
        </div>

        <!-- Price Cards -->
       <!-- Price Cards -->
        <div class="space-y-2 px-1">
          <div *ngFor="let price of group.items"
               class="rounded-2xl border p-4 relative"
               [style.background-color]="getCategoryColor(group.category, 'bg')"
               style="border-color: #e0e0e0">

            <!-- Item Name & Delete Button -->
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <p class="font-black text-gray-800 text-base">{{ price.item_name_ar }}</p>
                
                <!-- 🗑️ زرار المسح (يظهر للآدمين فقط) -->
                <button *ngIf="isAdmin()" 
                        (click)="deletePrice(price.id)" 
                        title="حذف السعر"
                        class="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded-lg transition text-xs font-bold flex items-center gap-1">
                  🗑️ <span class="text-[10px]">حذف</span>
                </button>
              </div>

              <span class="text-lg">{{ getCategoryIcon(group.category) }}</span>
            </div>

            <!-- Price Row -->
            <div class="grid grid-cols-2 gap-3">
              <div class="bg-white rounded-xl p-3 text-center shadow-sm">
                <p class="text-xs text-gray-400 mb-1">سعر التنفيذ</p>
                <p class="font-black text-green-600 text-xl">{{ price.price_min | number }}</p>
                <p class="text-[10px] text-gray-400">جنيه</p>
              </div>
              <div class="bg-white rounded-xl p-3 text-center shadow-sm border border-blue-100">
                <p class="text-xs text-blue-400 mb-1">السعر المعلن</p>
                <p class="font-black text-blue-600 text-xl">{{ price.price_max | number }}</p>
                <p class="text-[10px] text-gray-400">جنيه</p>
              </div>
            </div>

            <!-- Notes & Date -->
            <div class="flex items-center justify-between mt-2">
              <p *ngIf="price.notes" class="text-[10px] text-gray-400">📍 {{ price.notes }}</p>
              <p class="text-[10px] text-gray-300 mr-auto">{{ price.created_at | date:'dd/MM' }}</p>
            </div>

          </div>
        </div>

      </div>

      <!-- Empty State -->
      <div *ngIf="visibleGroups().length === 0" class="text-center py-12 text-gray-400">
        <p class="text-4xl mb-2">📊</p>
        <p class="font-semibold">لا توجد أسعار بعد</p>
        <p class="text-sm mt-1" *ngIf="isAdmin()">اضغط "تحديث" لإضافة أول سعر</p>
      </div>
    </div>

  </div>
  `
})
export class PricesComponent implements OnInit {
  private http = inject(HttpClient);

  itemOptionsByCategory: Record<string, string[]> = {
    broiler: ["فراخ بيضاء تسمين (لحم)", "فراخ ساسو (لحم)", "فراخ بلدي (لحم)", "فراخ أمهات بيضاء"],
    chicks: ["كتكوت أبيض قطعان", "كتكوت أبيض شركات", "كتكوت ساسو", "كتكوت بلدي هجين", "كتكوت روزي"],
feed: [
"علف القاهرة للأعلاف",
"علف الأيمان",
"علف النماء",
"علف الفجر",
"علف السلام",
"علف المجد",
"علف الصفا",
"علف الدقهلية للأعلاف",
"علف القائد",
"علف الهيثم",
"علف السفير",
"علف النبيل",
"علف الفتح",
"علف نيوهوب (New Hope)",
"علف الأهرام",
"علف الوادي",
"علف النور والبركة",
"علف سامي عايد",
"علف زهور القاطون",
"علف الإيطالية",
"علف المؤسسة",
"علف الاستثمار",
"علف الفريد",
"علف المصرية الهولندية",
"علف العامة للأعلاف"
    ],
    eggs: ["كرتونة بيض أبيض", "كرتونة بيض أحمر", "كرتونة بيض بلدي"],
    breeders: ["أمهات تسمين بيضاء", "أمهات بياض أحمر", "أمهات ساسو"],
    rabbit: ["أرانب تسمين (لحم)", "سلالات أرانب (إناث)", "سلالات أرانب (ذكور)"],
    turkey: ["كتكوت رومي أبيض", "كتكوت رومي أسود", "رومي لحم"],
    duck: ["بط مولار (كتكوت)", "بط مسكوفي (كتكوت)", "بط فرنسي (لحم)"]
  };

  getItemOptions(category: string): string[] {
    return this.itemOptionsByCategory[category] || [];
  }

  loading = signal(false);
  saving = signal(false);
  showAddForm = signal(false);
  prices = signal<any[]>([]);
  isAdmin = signal(false);
  selectedTab = signal('');

  categories = CATEGORIES;

  form = {
    category: 'broiler',
    item_name_ar: '',
    price_min: null as number | null,
    price_max: null as number | null,
    unit: 'كجم',
    notes: '',
  };

  lastUpdate = computed(() => {
    const p = this.prices();
    if (!p.length) return new Date();
    return new Date(p[0].created_at);
  });
deletePrice(priceId: number | string) {
    if (!confirm('هل أنت تأكد من حذف هذا السعر؟')) return;

    this.http.delete(`${environment.apiUrl}/prices/${priceId}`, { headers: this.headers() }).subscribe({
      next: () => {
        // إعادة تحميل الأسعار بعد الحذف
        this.loadPrices();
      },
      error: (err) => {
        console.error('خطأ أثناء الحذف:', err);
        alert('حدث خطأ أثناء حذف السعر');
      }
    });
  }
  visibleGroups = computed(() => {
    const tab = this.selectedTab();
    const groups: { category: string; items: any[] }[] = [];
    const map = new Map<string, any[]>();

    for (const p of this.prices()) {
      if (tab && p.category !== tab) continue;
      if (!map.has(p.category)) map.set(p.category, []);
      map.get(p.category)!.push(p);
    }

    for (const cat of CATEGORIES) {
      if (map.has(cat.value)) {
        groups.push({ category: cat.value, items: map.get(cat.value)! });
      }
    }
    return groups;
  });

  private headers() {
    const token = localStorage.getItem('spa_token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  ngOnInit() {
    this.loadPrices();
    this.checkAdmin();
  }

  checkAdmin() {
    try {
      const user = JSON.parse(localStorage.getItem('spa_user') || '{}');
      this.isAdmin.set(user.role === 'admin');
    } catch { }
  }

  loadPrices() {
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}/prices/latest`).subscribe({
      next: res => { this.prices.set(res.prices ?? []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  onCategoryChange(cat: string) {
    const found = CATEGORIES.find(c => c.value === cat);
    if (found) this.form.unit = found.unit;
    this.form.item_name_ar = ''; // تصفير الاختيار عند تغير الصنف
  }

  addPrice() {
    if (!this.form.item_name_ar || (!this.form.price_min && !this.form.price_max)) return;
    this.saving.set(true);

    this.http.post(`${environment.apiUrl}/prices/`, this.form, { headers: this.headers() }).subscribe({
      next: () => {
        this.saving.set(false);
        this.showAddForm.set(false);
        this.form = { category: 'broiler', item_name_ar: '', price_min: null, price_max: null, unit: 'كجم', notes: '' };
        this.loadPrices();
      },
      error: () => this.saving.set(false)
    });
  }

  getCategoryColor(cat: string, type: 'bg' | 'header'): string {
    const found = CATEGORIES.find(c => c.value === cat);
    return type === 'header' ? (found?.headerColor ?? '#2d9e5f') : (found?.color ?? '#f5f5f5');
  }

  getCategoryIcon(cat: string): string {
    return CATEGORIES.find(c => c.value === cat)?.icon ?? '📦';
  }

  getCategoryLabel(cat: string): string {
    return CATEGORIES.find(c => c.value === cat)?.label ?? cat;
  }
}