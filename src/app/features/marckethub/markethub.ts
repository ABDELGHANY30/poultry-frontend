import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

const PRICE_CATEGORIES = [
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
  selector: 'app-market-hub',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <!-- Shared Header -->
    <div class="rounded-3xl text-white px-6 py-5 mb-4 flex items-center justify-between"
         style="background:linear-gradient(135deg,#0f2d1a 0%,#2d9e5f 100%)">
      <div>
        <h1 class="text-xl font-bold">
          {{ activeTab() === 'listings'
              ? (lang === 'ar' ? '🛒 السوق' : '🛒 Marketplace')
              : (lang === 'ar' ? '📈 أسعار السوق' : '📈 Market Prices') }}
        </h1>
        <p class="text-white/70 text-sm mt-1" *ngIf="activeTab() === 'listings'">
          {{ lang === 'ar' ? 'بيع واشتري دواجن ومعدات' : 'Buy & sell poultry and equipment' }}
        </p>
        <p class="text-white/70 text-xs mt-1" *ngIf="activeTab() === 'prices'">
          ⏱️ {{ lang === 'ar' ? 'آخر تحديث' : 'Last update' }}: {{ lastUpdate() | date:'d MMMM yyyy':'':(lang === 'ar' ? 'ar' : 'en') }}
        </p>
      </div>

      <a *ngIf="activeTab() === 'listings'" routerLink="/marketplace/add-listing"
         class="bg-white text-green-700 font-bold px-4 py-2 rounded-2xl text-sm hover:bg-green-50 transition">
        + {{ lang === 'ar' ? 'إعلان' : 'Add' }}
      </a>
      <button *ngIf="activeTab() === 'prices' && isAdmin()" (click)="showAddForm.set(!showAddForm())"
              class="bg-white/20 text-white text-sm font-bold px-4 py-2 rounded-2xl hover:bg-white/30 transition">
        {{ showAddForm() ? '✕' : (lang === 'ar' ? '+ تحديث' : '+ Update') }}
      </button>
    </div>

    <!-- Tab Switcher: السوق / الأسعار / طلباتي -->
    <div class="flex gap-2 mb-4 bg-gray-100 rounded-2xl p-1">
      <button (click)="setTab('prices')"
              class="flex-1 py-2.5 rounded-xl text-sm font-bold transition"
              [class.bg-white]="activeTab() === 'prices'"
              [class.shadow-sm]="activeTab() === 'prices'"
              [class.text-green-700]="activeTab() === 'prices'"
              [class.text-gray-500]="activeTab() !== 'prices'">
        📈 {{ lang === 'ar' ? 'الأسعار' : 'Prices' }}
      </button>
      <button (click)="setTab('listings')"
              class="flex-1 py-2.5 rounded-xl text-sm font-bold transition"
              [class.bg-white]="activeTab() === 'listings'"
              [class.shadow-sm]="activeTab() === 'listings'"
              [class.text-green-700]="activeTab() === 'listings'"
              [class.text-gray-500]="activeTab() !== 'listings'">
        🛒 {{ lang === 'ar' ? 'السوق' : 'Marketplace' }}
      </button>
      <a routerLink="/marketplace/my-orders"
         class="flex-1 py-2.5 rounded-xl text-sm font-bold transition text-center text-gray-500">
        📋 {{ lang === 'ar' ? 'طلباتي' : 'My Orders' }}
      </a>
    </div>

    <!-- ======================= MARKETPLACE TAB ======================= -->
    <ng-container *ngIf="activeTab() === 'listings'">

      <!-- 🔍 شريط البحث -->
      <div class="relative mb-3">
        <input type="text"
               [ngModel]="searchQuery()"
               (ngModelChange)="onSearchInput($event)"
               [placeholder]="lang === 'ar' ? 'ابحث عن دواجن، بيض، معدات...' : 'Search chickens, eggs, equipment...'"
               class="form-input w-full pr-10 pl-4 py-2.5 rounded-2xl border border-gray-200 text-sm" />
        <span class="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400">🔍</span>
        <button *ngIf="searchQuery()" (click)="clearSearch()"
                class="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400 text-sm">✕</button>
      </div>

      <!-- Category Filters -->
      <div class="flex gap-2 overflow-x-auto pb-2 mb-3">
        <button *ngFor="let c of listingCategories"
                (click)="filterCategory(c.value)"
                class="flex-shrink-0 px-4 py-2 rounded-2xl text-sm font-semibold border transition"
                [class.bg-green-600]="selectedCategory() === c.value"
                [class.text-white]="selectedCategory() === c.value"
                [class.border-green-600]="selectedCategory() === c.value"
                [class.bg-white]="selectedCategory() !== c.value"
                [class.border-gray-200]="selectedCategory() !== c.value"
                [class.text-gray-600]="selectedCategory() !== c.value">
          {{ c.label }}
        </button>
      </div>

      <!-- زرار فتح الفلاتر المتقدمة + الترتيب -->
      <div class="flex items-center justify-between mb-3">
        <button (click)="showFilters.set(!showFilters())"
                class="flex items-center gap-1 text-sm font-semibold px-3 py-1.5 rounded-xl border transition"
                [class.bg-green-50]="activeFilterCount() > 0"
                [class.border-green-300]="activeFilterCount() > 0"
                [class.text-green-700]="activeFilterCount() > 0"
                [class.bg-white]="activeFilterCount() === 0"
                [class.border-gray-200]="activeFilterCount() === 0"
                [class.text-gray-600]="activeFilterCount() === 0">
          ⚙️ {{ lang === 'ar' ? 'فلاتر' : 'Filters' }}
          <span *ngIf="activeFilterCount() > 0"
                class="bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {{ activeFilterCount() }}
          </span>
        </button>

        <select [ngModel]="sortBy()" (ngModelChange)="onSortChange($event)"
                class="text-sm border border-gray-200 rounded-xl px-3 py-1.5 bg-white text-gray-600">
          <option value="newest">{{ lang === 'ar' ? '🕒 الأحدث' : '🕒 Newest' }}</option>
          <option value="relevance" *ngIf="searchQuery()">{{ lang === 'ar' ? '🎯 الأقرب للبحث' : '🎯 Best match' }}</option>
          <option value="rating">{{ lang === 'ar' ? '⭐ الأعلى تقييمًا' : '⭐ Top rated' }}</option>
          <option value="price_asc">{{ lang === 'ar' ? '💰 الأقل سعرًا' : '💰 Price: low to high' }}</option>
          <option value="price_desc">{{ lang === 'ar' ? '💰 الأعلى سعرًا' : '💰 Price: high to low' }}</option>
        </select>
      </div>

      <!-- Panel الفلاتر المتقدمة -->
      <div *ngIf="showFilters()" class="bg-gray-50 rounded-2xl p-4 mb-4 space-y-4">

        <div>
          <label class="text-sm font-semibold text-gray-700 block mb-1.5">
            {{ lang === 'ar' ? 'نطاق السعر (جنيه)' : 'Price range (EGP)' }}
          </label>
          <div class="flex items-center gap-2">
            <input type="number" [(ngModel)]="filters.min_price" (ngModelChange)="applyFilters()"
                   [placeholder]="lang === 'ar' ? 'من' : 'Min'"
                   class="form-input flex-1 py-2 rounded-xl border border-gray-200 text-sm" />
            <span class="text-gray-400">—</span>
            <input type="number" [(ngModel)]="filters.max_price" (ngModelChange)="applyFilters()"
                   [placeholder]="lang === 'ar' ? 'إلى' : 'Max'"
                   class="form-input flex-1 py-2 rounded-xl border border-gray-200 text-sm" />
          </div>
        </div>

        <div>
          <label class="text-sm font-semibold text-gray-700 block mb-1.5">
            {{ lang === 'ar' ? 'الكمية المتاحة (على الأقل)' : 'Minimum quantity' }}
          </label>
          <input type="number" [(ngModel)]="filters.min_quantity" (ngModelChange)="applyFilters()"
                 [placeholder]="lang === 'ar' ? 'مثلاً 100' : 'e.g. 100'"
                 class="form-input w-full py-2 rounded-xl border border-gray-200 text-sm" />
        </div>

        <div>
          <label class="text-sm font-semibold text-gray-700 block mb-1.5">
            {{ lang === 'ar' ? 'منشور بعد تاريخ' : 'Posted after' }}
          </label>
          <input type="date" [(ngModel)]="filters.posted_after" (ngModelChange)="applyFilters()"
                 class="form-input w-full py-2 rounded-xl border border-gray-200 text-sm" />
        </div>

        <div>
          <label class="text-sm font-semibold text-gray-700 block mb-1.5">
            {{ lang === 'ar' ? 'تقييم المورد' : 'Supplier rating' }}
          </label>
          <div class="flex gap-2">
            <button *ngFor="let r of [3, 4, 4.5]"
                    (click)="setMinRating(r)"
                    class="px-3 py-1.5 rounded-xl text-sm font-semibold border transition"
                    [class.bg-amber-50]="filters.min_rating === r"
                    [class.border-amber-300]="filters.min_rating === r"
                    [class.text-amber-700]="filters.min_rating === r"
                    [class.bg-white]="filters.min_rating !== r"
                    [class.border-gray-200]="filters.min_rating !== r"
                    [class.text-gray-600]="filters.min_rating !== r">
              ⭐ {{ r }}+
            </button>
          </div>
        </div>

        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" [(ngModel)]="filters.verified_only" (ngModelChange)="applyFilters()" />
          <span class="text-sm font-semibold text-gray-700">
            ✓ {{ lang === 'ar' ? 'الموردين الموثّقين فقط' : 'Verified suppliers only' }}
          </span>
        </label>

        <button *ngIf="activeFilterCount() > 0" (click)="resetFilters()"
                class="w-full text-center text-sm text-red-500 font-semibold py-1">
          {{ lang === 'ar' ? 'مسح كل الفلاتر' : 'Clear all filters' }}
        </button>
      </div>

      <!-- Listings -->
      <div class="space-y-3">
        <div *ngFor="let item of listings()"
             class="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"
             [class.opacity-60]="item.status === 'closed'">
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-lg">{{ categoryIcon(item.category) }}</span>
                <span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                  {{ categoryLabel(item.category) }}
                </span>
              </div>
              <h3 class="font-bold text-gray-800 text-base">{{ item.title }}</h3>
              <p class="text-gray-500 text-sm mt-1 line-clamp-2">{{ item.description }}</p>

              <div class="flex items-center gap-3 mt-2">
                <span *ngIf="item.price" class="text-green-600 font-black text-lg">
                  {{ item.price | number }} {{ lang === 'ar' ? 'جنيه' : 'EGP' }}
                  <span *ngIf="item.price_negotiable" class="text-xs font-normal text-gray-400">
                    ({{ lang === 'ar' ? 'قابل للتفاوض' : 'Negotiable' }})
                  </span>
                </span>
                <span *ngIf="!item.price" class="text-gray-400 text-sm">
                  {{ lang === 'ar' ? 'السعر عند التواصل' : 'Price on contact' }}
                </span>
              </div>

              <div class="flex items-center gap-2 mt-2 flex-wrap">
                <span class="flex items-center gap-1 text-xs text-amber-500 font-bold" *ngIf="item.seller_ratings_count > 0">
                  ⭐ {{ item.seller_avg_rating }}
                  <span class="text-gray-400 font-normal">({{ item.seller_ratings_count }})</span>
                </span>
                <span *ngIf="item.seller_ratings_count === 0" class="text-xs text-gray-400">
                  {{ lang === 'ar' ? 'لا يوجد تقييمات بعد' : 'No ratings yet' }}
                </span>
                <span *ngIf="item.seller_is_verified"
                      class="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">
                  ✓ {{ lang === 'ar' ? 'مورد موثّق' : 'Verified' }}
                </span>
                <span *ngIf="item.is_mine"
                      class="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">
                  👤 {{ lang === 'ar' ? 'إعلانك' : 'Your listing' }}
                </span>
                <span *ngIf="item.status === 'closed'"
                      class="flex items-center gap-1 text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-bold">
                  🔒 {{ lang === 'ar' ? 'مغلق' : 'Closed' }}
                </span>
              </div>

              <div class="flex items-center gap-3 mt-2 text-xs text-gray-400">
                <span>📍 {{ item.location }}</span>
                <span>👤 {{ item.seller_name }}</span>
                <span>{{ item.created_at | date:'dd/MM' }}</span>
              </div>
            </div>
          </div>

          <div class="flex gap-2 mt-3" *ngIf="!item.is_mine && item.status === 'active'">
            <a [href]="'tel:' + item.phone"
               (click)="registerContact(item)"
               class="flex-1 bg-green-600 text-white text-center py-2 rounded-xl text-sm font-bold hover:bg-green-700 transition">
              📞 {{ lang === 'ar' ? 'اتصل' : 'Call' }}
            </a>
            <a [href]="'https://wa.me/2' + item.phone"
               target="_blank"
               (click)="registerContact(item)"
               class="flex-1 bg-green-500 text-white text-center py-2 rounded-xl text-sm font-bold hover:bg-green-600 transition">
              💬 {{ lang === 'ar' ? 'واتساب' : 'WhatsApp' }}
            </a>
          </div>

          <div class="flex gap-2 mt-3" *ngIf="item.is_mine">
            <button *ngIf="item.status === 'active'"
                    (click)="closeListing(item)"
                    class="flex-1 bg-red-50 text-red-500 text-center py-2 rounded-xl text-sm font-bold hover:bg-red-100 transition">
              🔒 {{ lang === 'ar' ? 'إغلاق الإعلان (تم البيع)' : 'Close listing (sold)' }}
            </button>
            <button *ngIf="item.status === 'closed'"
                    (click)="reopenListing(item)"
                    class="flex-1 bg-green-50 text-green-600 text-center py-2 rounded-xl text-sm font-bold hover:bg-green-100 transition">
              🔓 {{ lang === 'ar' ? 'إعادة فتح الإعلان' : 'Reopen listing' }}
            </button>
          </div>
        </div>

        <div *ngIf="listings().length === 0 && !loadingListings() && !hasActiveSearchOrFilters()"
             class="text-center py-12 text-gray-400">
          <p class="text-4xl mb-2">🛒</p>
          <p class="font-semibold">{{ lang === 'ar' ? 'لا توجد إعلانات بعد' : 'No listings yet' }}</p>
          <a routerLink="/marketplace/add-listing" class="btn-primary btn mt-3 inline-flex">
            + {{ lang === 'ar' ? 'أضف أول إعلان' : 'Add first listing' }}
          </a>
        </div>

        <div *ngIf="listings().length === 0 && !loadingListings() && hasActiveSearchOrFilters()"
             class="text-center py-12 text-gray-400">
          <p class="text-4xl mb-2">🔍</p>
          <p class="font-semibold">{{ lang === 'ar' ? 'لا توجد نتائج مطابقة' : 'No matching results' }}</p>
          <button (click)="resetSearchAndFilters()" class="text-green-600 text-sm font-medium">
            
            {{ lang === 'ar' ? 'مسح البحث والفلاتر' : 'Clear search & filters' }}
          </button>
        </div>

        <div *ngIf="loadingListings()" class="text-center py-8 text-gray-400">
          <p>{{ lang === 'ar' ? 'جاري التحميل...' : 'Loading...' }}</p>
        </div>
      </div>
          </ng-container>

    <!-- ======================= PRICES TAB ======================= -->
    <ng-container *ngIf="activeTab() === 'prices'">
      <!-- محتوى تبويب الأسعار كما هو — لصق الكود الأصلي هنا (انظر README) -->
      <!-- Category Tabs -->
      <div class="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        <button (click)="selectedPriceTab.set('')"
                class="flex-shrink-0 px-4 py-2 rounded-2xl text-xs font-bold border transition"
                [class.bg-green-600]="selectedPriceTab() === ''"
                [class.text-white]="selectedPriceTab() === ''"
                [class.border-green-600]="selectedPriceTab() === ''"
                [class.bg-white]="selectedPriceTab() !== ''"
                [class.border-gray-200]="selectedPriceTab() !== ''"
                [class.text-gray-600]="selectedPriceTab() !== ''">
          🌟 {{ lang === 'ar' ? 'الكل' : 'All' }}
        </button>
        <button *ngFor="let c of priceCategories"
                (click)="selectedPriceTab.set(c.value)"
                class="flex-shrink-0 px-4 py-2 rounded-2xl text-xs font-bold border transition"
                [class.text-white]="selectedPriceTab() === c.value"
                [class.bg-white]="selectedPriceTab() !== c.value"
                [class.border-gray-200]="selectedPriceTab() !== c.value"
                [class.text-gray-600]="selectedPriceTab() !== c.value"
                [style.background-color]="selectedPriceTab() === c.value ? c.headerColor : ''"
                [style.border-color]="selectedPriceTab() === c.value ? c.headerColor : ''">
          {{ c.icon }} {{ c.label }}
        </button>
      </div>

      <!-- Add Form (Admin) -->
   <div *ngIf="showAddForm() && isAdmin()" class="card border-2 border-green-200  mb-4 space-y-3">
  <h2 class="font-bold text-gray-800">📝 تحديث سعر جديد</h2>

  <div class="grid grid-cols-2 gap-3">
    <!-- 1️⃣ اختار الصنف (الفئة) -->
    <div>
      <label class="form-label">الصنف</label>
      <select [(ngModel)]="priceForm.category" class="form-input" (ngModelChange)="onPriceCategoryChange($event)">
        <option *ngFor="let c of priceCategories" [value]="c.value">{{ c.icon }} {{ c.label }}</option>
      </select>
    </div>
    <div>
      <label class="form-label">الوحدة</label>
      <input [(ngModel)]="priceForm.unit" class="form-input"/>
    </div>
  </div>

  <!-- 2️⃣ الاسم بيقلب اختيارات بناءً على الصنف اللي اخترته فوق -->
  <div>
    <label class="form-label">الاسم</label>
    <select [(ngModel)]="priceForm.item_name_ar" class="form-input">
      <option value=""> اختر الاسم </option>
      <option *ngFor="let item of getItemOptions(priceForm.category)" [value]="item">
        {{ item }}
      </option>
    </select>
  </div>

  <div class="grid grid-cols-2 gap-3">
    <div>
      <label class="form-label">سعر التنفيذ (جنيه)</label>
      <input [(ngModel)]="priceForm.price_min" type="number" class="form-input" placeholder="0"/>
    </div>
    <div>
      <label class="form-label">السعر المعلن (جنيه)</label>
      <input [(ngModel)]="priceForm.price_max" type="number" class="form-input" placeholder="0"/>
    </div>
  </div>

  <div>
    <label class="form-label">ملاحظات</label>
    <input [(ngModel)]="priceForm.notes" class="form-input" placeholder="مثال: أسعار القاهرة والجيزة"/>
  </div>

  <button (click)="addPrice()" [disabled]="savingPrice()" class="btn-primary btn w-full">
    {{ savingPrice() ? '...' : '✅ حفظ السعر' }}
  </button>
</div>

      <!-- Loading -->
      <div *ngIf="loadingPrices()" class="text-center py-8 text-gray-400">
        <p>جاري التحميل...</p>
      </div>

      <!-- Prices by Category -->
      <div *ngIf="!loadingPrices()" class="space-y-4">
        <div *ngFor="let group of visiblePriceGroups()">

          <!-- Category Header -->
          <div class="rounded-2xl px-5 py-3 flex items-center justify-between text-white font-black text-base"
               [style.background-color]="getPriceCategoryColor(group.category, 'header')">
            <span>{{ getPriceCategoryLabel(group.category) }}</span>
            <span class="text-2xl">{{ getPriceCategoryIcon(group.category) }}</span>
          </div>

          <!-- Price Cards -->
      <div class="space-y-2 px-1">
  <div *ngFor="let price of group.items"
       class="rounded-2xl border p-4"
       [style.background-color]="getPriceCategoryColor(group.category, 'bg')"
       style="border-color: #e0e0e0">

    <!-- Item Name & Actions -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <p class="font-black text-gray-800 text-base">{{ price.item_name_ar }}</p>

        <!-- 🗑️ زر مسح السعر (يظهر للآدمين فقط) -->
        <button *ngIf="isAdmin()" 
                (click)="deletePrice(price.id)" 
                title="حذف السعر"
                class="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded-lg transition text-xs font-bold flex items-center gap-1">
          🗑️ <span class="text-[10px]">مسح</span>
        </button>
      </div>

      <span class="text-lg">{{ getPriceCategoryIcon(group.category) }}</span>
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
        <div *ngIf="visiblePriceGroups().length === 0" class="text-center py-12 text-gray-400">
          <p class="text-4xl mb-2">📊</p>
          <p class="font-semibold">لا توجد أسعار بعد</p>
          <p class="text-sm mt-1" *ngIf="isAdmin()">اضغط "تحديث" لإضافة أول سعر</p>
        </div>
      </div>
    </ng-container>
        
      
  `
})
// 🟢 1. مصفوفة الأصناف حسب القسم (خارج الكلاس في أعلى الملف)

// 🟢 2. كلاس الكومبوننت (نسخة واحدة بدون دمج أو تكرار)
// export class MarketHubComponent implements OnInit {
//   private http = inject(HttpClient);
//   lang = localStorage.getItem('lang') ?? 'ar';

//   activeTab = signal<'listings' | 'prices'>('prices');

//   // ---------- Marketplace state ----------
//   listings = signal<any[]>([]);
//   loadingListings = signal(false);
//   selectedCategory = signal('');
//   private listingsLoadedOnce = false;

//   // منع إنشاء أكتر من Order لنفس الإعلان في نفس الجلسة لو المستخدم ضغط
//   // اتصل وواتساب مرتين ورا بعض بالغلط (تقليل الضوضاء في جدول orders)
//   private contactedListingIds = new Set<string>();

//   listingCategories = [
//     { value: '', label: this.lang === 'ar' ? '🌟 الكل' : '🌟 All' },
//     { value: 'chickens', label: this.lang === 'ar' ? '🐔 دواجن' : '🐔 Chickens' },
//     { value: 'eggs', label: this.lang === 'ar' ? '🥚 بيض' : '🥚 Eggs' },
//     { value: 'equipment', label: this.lang === 'ar' ? '⚙️ معدات' : '⚙️ Equipment' },
//     { value: 'feed', label: this.lang === 'ar' ? '🌾 علف' : '🌾 Feed' },
//     { value: 'other', label: this.lang === 'ar' ? '📦 أخرى' : '📦 Other' },
//   ];

//   // ---------- Prices state ----------
//   loadingPrices = signal(false);
//   savingPrice = signal(false);
//   showAddForm = signal(false);
//   prices = signal<any[]>([]);
//   isAdmin = signal(false);
//   selectedPriceTab = signal('');
//   private pricesLoadedOnce = false;

//   priceCategories = PRICE_CATEGORIES;

//   priceForm = {
//     category: 'broiler',
//     item_name_ar: '',
//     price_min: null as number | null,
//     price_max: null as number | null,
//     unit: 'كجم',
//     notes: '',
//   };

//   lastUpdate = computed(() => {
//     const p = this.prices();
//     if (!p.length) return new Date();
//     return new Date(p[0].created_at);
//   });

//   visiblePriceGroups = computed(() => {
//     const tab = this.selectedPriceTab();
//     const groups: { category: string; items: any[] }[] = [];
//     const map = new Map<string, any[]>();

//     for (const p of this.prices()) {
//       if (tab && p.category !== tab) continue;
//       if (!map.has(p.category)) map.set(p.category, []);
//       map.get(p.category)!.push(p);
//     }

//     for (const cat of PRICE_CATEGORIES) {
//       if (map.has(cat.value)) {
//         groups.push({ category: cat.value, items: map.get(cat.value)! });
//       }
//     }
//     return groups;
//   });

//   private headers() {
//     const token = localStorage.getItem('spa_token');
//     return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
//   }

//   ngOnInit() {
//     this.loadListings();
//     this.checkAdmin();
//   }

//   setTab(tab: 'listings' | 'prices') {
//     this.activeTab.set(tab);
//     if (tab === 'listings' && !this.listingsLoadedOnce) {
//       this.loadListings();
//     }
//     if (tab === 'prices' && !this.pricesLoadedOnce) {
//       this.loadPrices();
//     }
//   }

//   // ---------- Marketplace methods ----------
//   filterCategory(cat: string) {
//     this.selectedCategory.set(cat);
//     this.loadListings();
//   }

//   loadListings() {
//     this.loadingListings.set(true);
//     const cat = this.selectedCategory();
//     const url = cat
//       ? `${environment.apiUrl}/listings/?category=${cat}`
//       : `${environment.apiUrl}/listings/`;

//     this.http.get<any>(url).subscribe({
//       next: res => {
//         this.listings.set(res.listings ?? []);
//         this.loadingListings.set(false);
//         this.listingsLoadedOnce = true;
//       },
//       error: () => this.loadingListings.set(false)
//     });
//   }

//   categoryIcon(cat: string): string {
//     const icons: any = { chickens: '🐔', eggs: '🥚', equipment: '⚙️', feed: '🌾', other: '📦' };
//     return icons[cat] ?? '📦';
//   }

//   categoryLabel(cat: string): string {
//     const labels: any = {
//       chickens: this.lang === 'ar' ? 'دواجن' : 'Chickens',
//       eggs: this.lang === 'ar' ? 'بيض' : 'Eggs',
//       equipment: this.lang === 'ar' ? 'معدات' : 'Equipment',
//       feed: this.lang === 'ar' ? 'علف' : 'Feed',
//       other: this.lang === 'ar' ? 'أخرى' : 'Other',
//     };
//     return labels[cat] ?? cat;
//   }

//   /**
//    * يُستدعى عند الضغط على "اتصل" أو "واتساب".
//    * ننشئ Order في الخلفية (status=new) بدون انتظار الاستجابة وبدون
//    * منع فتح رابط tel:/wa.me — لو فشل الطلب (مثلاً مستخدم غير مسجّل
//    * دخول) بنتجاهله بصمت، لأن هدفنا هنا تسجيل التواصل فقط، مش حجب
//    * إمكانية الاتصال بالبائع.
//    */
//   private ContactedListingIds = new Set<string>();
//   registerContact(item: any) {
//     const token = localStorage.getItem('spa_token');
//     if (!token) return; // مستخدم غير مسجّل دخول — تجاهل تسجيل الطلب بصمت

//     if (this.contactedListingIds.has(item.id)) return; // تم التسجيل من قبل في هذه الجلسة
//     this.contactedListingIds.add(item.id);

//     this.http.post(
//       `${environment.apiUrl}/orders/`,
//       { listing_id: item.id },
//       { headers: this.headers() }
//     ).subscribe({
//       next: () => { /* نجاح صامت — مفيش داعي لإشعار المستخدم */ },
//       error: () => { this.contactedListingIds.delete(item.id); } // فشل: نسمح بإعادة المحاولة مرة تانية
//     });
//   }

//   // ---------- Prices methods ----------

//   checkAdmin() {
//     try {
//       const user = JSON.parse(localStorage.getItem('spa_user') ?? '{}');
//       this.isAdmin.set(user.role === 'admin');
//     } catch { }
//   }

//   loadPrices() {
//     this.loadingPrices.set(true);
//     this.http.get<any>(`${environment.apiUrl}/prices/latest`).subscribe({
//       next: res => {
//         this.prices.set(res.prices ?? []);
//         this.loadingPrices.set(false);
//         this.pricesLoadedOnce = true;
//       },
//       error: () => this.loadingPrices.set(false)
//     });
//   }

//   onPriceCategoryChange(cat: string) {
//     const found = PRICE_CATEGORIES.find(c => c.value === cat);
//     if (found) this.priceForm.unit = found.unit;
//     this.priceForm.item_name_ar = ''; // تصفير الاختيار عند التغيير
//   }

//   addPrice() {
//     if (!this.priceForm.item_name_ar || (!this.priceForm.price_min && !this.priceForm.price_max)) return;
//     this.savingPrice.set(true);

//     this.http.post(`${environment.apiUrl}/prices/`, this.priceForm, { headers: this.headers() }).subscribe({
//       next: () => {
//         this.savingPrice.set(false);
//         this.showAddForm.set(false);
//         this.priceForm = { category: 'broiler', item_name_ar: '', price_min: null, price_max: null, unit: 'كجم', notes: '' };
//         this.loadPrices();
//       },
//       error: () => this.savingPrice.set(false)
//     });
//   }
// // أضف هذه الدالة داخل الكلاس
// // في ملف markethub.ts
// getItemOptions(category: string): string[] {
//   if (!category) return [];

//   const optionsMap: Record<string, string[]> = {
//     // إذا كانت القيمة تأتي بالإنجليزية:
//     poultry: ['أبيض', 'ساسو', 'بلدي', 'أمهات', 'بط', 'رومي'],
//     chicks: ['أبيض شركات', 'أبيض قطعان', 'ساسو', 'بلدي'],
//     feed: ['بادي 23%', 'نامي 21%', 'ناهي 19%', 'بياض'],
//     eggs: ['أبيض', 'أحمر', 'بلدي'],
//     equipment: ['سقايات', 'علافات', 'خلايا تبريد', 'شفاطات'],

//     // أضف النسخة العربية أيضاً للأمان (في حال كانت قيمة الـ category عربية):
//     'دواجن': ['أبيض', 'ساسو', 'بلدي', 'أمهات', 'بط', 'رومي'],
//     'كتكوت': ['أبيض شركات', 'أبيض قطعان', 'ساسو', 'بلدي'],
//     'أعلاف': ['بادي 23%', 'نامي 21%', 'ناهي 19%', 'بياض'],
//     'بيض': ['أبيض', 'أحمر', 'بلدي'],
//     'معدات': ['سقايات', 'علافات', 'خلايا تبريد', 'شفاطات']
//   };

//   return optionsMap[category] || [];
// }
//   deletePrice(priceId: number | string) {
//     if (!confirm('هل أنت تأكد من حذف هذا السعر؟')) return;

//     this.http.delete(`${environment.apiUrl}/prices/${priceId}`, { headers: this.headers() }).subscribe({
//       next: () => this.loadPrices(),
//       error: (err) => {
//         console.error('خطأ أثناء الحذف:', err);
//         alert('حدث خطأ أثناء حذف السعر');
//       }
//     });
//   }

//   getPriceCategoryColor(cat: string, type: 'bg' | 'header'): string {
//     const found = PRICE_CATEGORIES.find(c => c.value === cat);
//     return type === 'header' ? (found?.headerColor ?? '#2d9e5f') : (found?.color ?? '#f5f5f5');
//   }

//   getPriceCategoryIcon(cat: string): string {
//     return PRICE_CATEGORIES.find(c => c.value === cat)?.icon ?? '📦';
//   }

//   getPriceCategoryLabel(cat: string): string {
//     return PRICE_CATEGORIES.find(c => c.value === cat)?.label ?? cat;
//   }}
export class MarketHubComponent implements OnInit {
  private http = inject(HttpClient);
  lang = localStorage.getItem('lang') ?? 'ar';

  activeTab = signal<'prices' | 'listings'>('prices');

  listings = signal<any[]>([]);
  loadingListings = signal(false);
  selectedCategory = signal('');
  private listingsLoadedOnce = false;

  searchQuery = signal('');
  showFilters = signal(false);
  sortBy = signal<'newest' | 'relevance' | 'rating' | 'price_asc' | 'price_desc'>('newest');

  filters: {
    min_price: number | null;
    max_price: number | null;
    min_quantity: number | null;
    posted_after: string | null;
    min_rating: number | null;
    verified_only: boolean;
  } = {
    min_price: null,
    max_price: null,
    min_quantity: null,
    posted_after: null,
    min_rating: null,
    verified_only: false,
  };

  private searchInput$ = new Subject<string>();

  activeFilterCount = computed(() => {
    let count = 0;
    if (this.filters.min_price !== null) count++;
    if (this.filters.max_price !== null) count++;
    if (this.filters.min_quantity !== null) count++;
    if (this.filters.posted_after !== null) count++;
    if (this.filters.min_rating !== null) count++;
    if (this.filters.verified_only) count++;
    return count;
  });

  hasActiveSearchOrFilters = computed(() =>
    this.searchQuery().trim().length > 0 || this.activeFilterCount() > 0
  );

  private contactedListingIds = new Set<string>();

  listingCategories = [
    { value: '', label: this.lang === 'ar' ? '🌟 الكل' : '🌟 All' },
    { value: 'chickens', label: this.lang === 'ar' ? '🐔 دواجن' : '🐔 Chickens' },
    { value: 'eggs', label: this.lang === 'ar' ? '🥚 بيض' : '🥚 Eggs' },
    { value: 'equipment', label: this.lang === 'ar' ? '⚙️ معدات' : '⚙️ Equipment' },
    { value: 'feed', label: this.lang === 'ar' ? '🌾 علف' : '🌾 Feed' },
    { value: 'other', label: this.lang === 'ar' ? '📦 أخرى' : '📦 Other' },
  ];

  loadingPrices = signal(false);
  savingPrice = signal(false);
  showAddForm = signal(false);
  prices = signal<any[]>([]);
  isAdmin = signal(false);
  selectedPriceTab = signal('');
  private pricesLoadedOnce = false;

  priceCategories = PRICE_CATEGORIES;

  priceForm = {
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

  visiblePriceGroups = computed(() => {
    const tab = this.selectedPriceTab();
    const groups: { category: string; items: any[] }[] = [];
    const map = new Map<string, any[]>();

    for (const p of this.prices()) {
      if (tab && p.category !== tab) continue;
      if (!map.has(p.category)) map.set(p.category, []);
      map.get(p.category)!.push(p);
    }

    for (const cat of PRICE_CATEGORIES) {
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
    this.checkAdmin();

    if (this.activeTab() === 'prices') {
      this.loadPrices();
    } else {
      this.loadListings();
    }

    this.searchInput$.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(() => this.loadListings());
  }

  setTab(tab: 'listings' | 'prices') {
    this.activeTab.set(tab);
    if (tab === 'listings' && !this.listingsLoadedOnce) {
      this.loadListings();
    }
    if (tab === 'prices' && !this.pricesLoadedOnce) {
      this.loadPrices();
    }
  }

  filterCategory(cat: string) {
    this.selectedCategory.set(cat);
    this.loadListings();
  }

  onSearchInput(value: string) {
    this.searchQuery.set(value);
    this.searchInput$.next(value);
  }

  clearSearch() {
    this.searchQuery.set('');
    this.loadListings();
  }

  onSortChange(value: 'newest' | 'relevance' | 'rating' | 'price_asc' | 'price_desc') {
    this.sortBy.set(value);
    this.loadListings();
  }

  setMinRating(value: number) {
    this.filters.min_rating = this.filters.min_rating === value ? null : value;
    this.applyFilters();
  }

  applyFilters() {
    this.loadListings();
  }

  resetFilters() {
    this.filters = {
      min_price: null,
      max_price: null,
      min_quantity: null,
      posted_after: null,
      min_rating: null,
      verified_only: false,
    };
    this.loadListings();
  }

  resetSearchAndFilters() {
    this.searchQuery.set('');
    this.resetFilters();
  }

  loadListings() {
    this.loadingListings.set(true);

    const params: string[] = [];
    const cat = this.selectedCategory();
    if (cat) params.push(`category=${encodeURIComponent(cat)}`);

    const q = this.searchQuery().trim();
    if (q) params.push(`q=${encodeURIComponent(q)}`);

    if (this.filters.min_price !== null) params.push(`min_price=${this.filters.min_price}`);
    if (this.filters.max_price !== null) params.push(`max_price=${this.filters.max_price}`);
    if (this.filters.min_quantity !== null) params.push(`min_quantity=${this.filters.min_quantity}`);
    if (this.filters.posted_after) params.push(`posted_after=${this.filters.posted_after}`);
    if (this.filters.min_rating !== null) params.push(`min_rating=${this.filters.min_rating}`);
    if (this.filters.verified_only) params.push(`verified_only=true`);

    if (this.sortBy() !== 'newest') params.push(`sort_by=${this.sortBy()}`);

    if (localStorage.getItem('spa_token')) params.push(`include_mine_closed=true`);

    const url = `${environment.apiUrl}/listings/${params.length ? '?' + params.join('&') : ''}`;

    this.http.get<any>(url).subscribe({
      next: res => {
        this.listings.set(res.listings ?? []);
        this.loadingListings.set(false);
        this.listingsLoadedOnce = true;
      },
      error: () => this.loadingListings.set(false)
    });
  }

  categoryIcon(cat: string): string {
    const icons: any = { chickens: '🐔', eggs: '🥚', equipment: '⚙️', feed: '🌾', other: '📦' };
    return icons[cat] ?? '📦';
  }

  categoryLabel(cat: string): string {
    const labels: any = {
      chickens: this.lang === 'ar' ? 'دواجن' : 'Chickens',
      eggs: this.lang === 'ar' ? 'بيض' : 'Eggs',
      equipment: this.lang === 'ar' ? 'معدات' : 'Equipment',
      feed: this.lang === 'ar' ? 'علف' : 'Feed',
      other: this.lang === 'ar' ? 'أخرى' : 'Other',
    };
    return labels[cat] ?? cat;
  }

  registerContact(item: any) {
    const token = localStorage.getItem('spa_token');
    if (!token) return;

    if (this.contactedListingIds.has(item.id)) return;
    this.contactedListingIds.add(item.id);

    this.http.post(
      `${environment.apiUrl}/orders/`,
      { listing_id: item.id },
      { headers: this.headers() }
    ).subscribe({
      next: () => { },
      error: () => { this.contactedListingIds.delete(item.id); }
    });
  }

  closeListing(item: any) {
    if (!confirm(this.lang === 'ar'
      ? 'هل أنت متأكد من إغلاق هذا الإعلان؟ لن يظهر للمشترين الجدد بعد الآن.'
      : 'Close this listing? It will no longer be visible to new buyers.')) return;

    this.updateListingStatus(item, 'closed');
  }

  reopenListing(item: any) {
    this.updateListingStatus(item, 'active');
  }

  private updateListingStatus(item: any, newStatus: 'active' | 'closed') {
    this.http.patch(
      `${environment.apiUrl}/listings/${item.id}/status`,
      { status: newStatus },
      { headers: this.headers() }
    ).subscribe({
      next: () => {
        const updated = this.listings().map(l => l.id === item.id ? { ...l, status: newStatus } : l);
        this.listings.set(updated);
      },
      error: () => alert(this.lang === 'ar' ? 'حدث خطأ، حاول مرة أخرى' : 'Error, try again')
    });
  }

  checkAdmin() {
    try {
      const user = JSON.parse(localStorage.getItem('spa_user') ?? '{}');
      this.isAdmin.set(user.role === 'admin');
    } catch { }
  }

  loadPrices() {
    this.loadingPrices.set(true);
    this.http.get<any>(`${environment.apiUrl}/prices/latest`).subscribe({
      next: res => {
        const data = Array.isArray(res) ? res : (res?.prices ?? []);
        this.prices.set(data);
        this.loadingPrices.set(false);
        this.pricesLoadedOnce = true;
      },
      error: (err) => {
        console.error('Error loading prices:', err);
        this.loadingPrices.set(false);
      }
    });
  }

  onPriceCategoryChange(cat: string) {
    const found = PRICE_CATEGORIES.find(c => c.value === cat);
    if (found) this.priceForm.unit = found.unit;
    this.priceForm.item_name_ar = '';
  }

  getItemOptions(category: string): string[] {
    if (!category) return [];

    const optionsMap: Record<string, string[]> = {
      broiler: ['أبيض', 'ساسو', 'بلدي', 'أمهات أبيض', 'أمهات ساسو', 'بط مسبك', 'رومي'],
      poultry: ['أبيض', 'ساسو', 'بلدي', 'أمهات', 'بط', 'رومي'],
      'دواجن': ['أبيض', 'ساسو', 'بلدي', 'أمهات', 'بط', 'رومي'],

      chick: ['أبيض شركات', 'أبيض قطعان', 'ساسو', 'بلدي', 'هجين', 'روزي'],
      chicks: ['أبيض شركات', 'أبيض قطعان', 'ساسو', 'بلدي'],
      'كتكوت': ['أبيض شركات', 'أبيض قطعان', 'ساسو', 'بلدي'],

      feed: ['بادي 23%', 'نامي 21%', 'ناهي 19%', 'بياض 14%', 'بياض 16%', 'بياض 18%'],
      'علف': ['بادي 23%', 'نامي 21%', 'ناهي 19%', 'بياض'],
      'أعلاف': ['بادي 23%', 'نامي 21%', 'ناهي 19%', 'بياض'],

      egg: ['بيض أبيض', 'بيض أحمر', 'بيض بلدي'],
      eggs: ['بيض أبيض', 'بيض أحمر', 'بيض بلدي'],
      'بيض': ['بيض أبيض', 'بيض أحمر', 'بيض بلدي'],

      duck: ['بط فرنساوي', 'بط مسكوفي', 'بط مولار'],
      mother: ['أمهات أبيض', 'أمهات ساسو'],
      material: ['صويا 44%', 'صويا 46%', 'ذرة صفراء محلي', 'ذرة صفراء مستورد'],

      equipment: ['سقايات', 'علافات', 'خلايا تبريد', 'شفاطات'],
      'معدات': ['سقايات', 'علافات', 'خلايا تبريد', 'شفاطات']
    };

    return optionsMap[category] || ['عام'];
  }

  addPrice() {
    if (!this.priceForm.item_name_ar || (!this.priceForm.price_min && !this.priceForm.price_max)) return;
    this.savingPrice.set(true);

    this.http.post(`${environment.apiUrl}/prices/`, this.priceForm, { headers: this.headers() }).subscribe({
      next: () => {
        this.savingPrice.set(false);
        this.showAddForm.set(false);
        this.priceForm = { category: 'broiler', item_name_ar: '', price_min: null, price_max: null, unit: 'كجم', notes: '' };
        this.loadPrices();
      },
      error: () => this.savingPrice.set(false)
    });
  }

  deletePrice(priceId: number | string) {
    if (!confirm('هل أنت تأكد من حذف هذا السعر؟')) return;

    this.http.delete(`${environment.apiUrl}/prices/${priceId}`, { headers: this.headers() }).subscribe({
      next: () => this.loadPrices(),
      error: (err) => {
        console.error('خطأ أثناء الحذف:', err);
        alert('حدث خطأ أثناء حذف السعر');
      }
    });
  }

  getPriceCategoryColor(cat: string, type: 'bg' | 'header'): string {
    const found = PRICE_CATEGORIES.find(c => c.value === cat);
    return type === 'header' ? (found?.headerColor ?? '#2d9e5f') : (found?.color ?? '#f5f5f5');
  }

  getPriceCategoryIcon(cat: string): string {
    return PRICE_CATEGORIES.find(c => c.value === cat)?.icon ?? '📦';
  }

  getPriceCategoryLabel(cat: string): string {
    return PRICE_CATEGORIES.find(c => c.value === cat)?.label ?? cat;
  }
}
