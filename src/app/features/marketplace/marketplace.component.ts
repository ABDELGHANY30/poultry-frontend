import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-marketplace',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
  <div class="page-wrapper">

    <!-- Header -->
    <div class="rounded-3xl text-white px-6 py-5 mb-4 flex items-center justify-between"
         style="background:linear-gradient(135deg,#0f2d1a 0%,#2d9e5f 100%)">
      <div>
        <h1 class="text-xl font-bold">🛒 {{ lang === 'ar' ? 'السوق' : 'Marketplace' }}</h1>
        <p class="text-white/70 text-sm">{{ lang === 'ar' ? 'بيع واشتري دواجن ومعدات' : 'Buy & sell poultry and equipment' }}</p>
      </div>
      <a routerLink="/marketplace/add"
         class="bg-white text-green-700 font-bold px-4 py-2 rounded-2xl text-sm hover:bg-green-50 transition">
        + {{ lang === 'ar' ? 'إعلان' : 'Add' }}
      </a>
    </div>

    <!-- Filters -->
    <div class="flex gap-2 overflow-x-auto pb-2 mb-4">
      <button *ngFor="let c of categories"
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

    <!-- Listings -->
    <div class="space-y-3">
      <div *ngFor="let item of listings()"
           class="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
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

            <div class="flex items-center gap-3 mt-2 text-xs text-gray-400">
              <span>📍 {{ item.location }}</span>
              <span>👤 {{ item.seller_name }}</span>
              <span>{{ item.created_at | date:'dd/MM' }}</span>
            </div>
          </div>
        </div>

        <!-- Contact Button -->
        <div class="flex gap-2 mt-3">
          <a [href]="'tel:' + item.phone"
             class="flex-1 bg-green-600 text-white text-center py-2 rounded-xl text-sm font-bold hover:bg-green-700 transition">
            📞 {{ lang === 'ar' ? 'اتصل' : 'Call' }}
          </a>
          <a [href]="'https://wa.me/2' + item.phone"
             target="_blank"
             class="flex-1 bg-green-500 text-white text-center py-2 rounded-xl text-sm font-bold hover:bg-green-600 transition">
            💬 {{ lang === 'ar' ? 'واتساب' : 'WhatsApp' }}
          </a>
        </div>
      </div>

      <!-- Empty state -->
      <div *ngIf="listings().length === 0 && !loading()"
           class="text-center py-12 text-gray-400">
        <p class="text-4xl mb-2">🛒</p>
        <p class="font-semibold">{{ lang === 'ar' ? 'لا توجد إعلانات بعد' : 'No listings yet' }}</p>
        <a routerLink="/marketplace/add" class="btn-primary btn mt-3 inline-flex">
          + {{ lang === 'ar' ? 'أضف أول إعلان' : 'Add first listing' }}
        </a>
      </div>

      <div *ngIf="loading()" class="text-center py-8 text-gray-400">
        <p>{{ lang === 'ar' ? 'جاري التحميل...' : 'Loading...' }}</p>
      </div>
    </div>

  </div>
  `
})
export class MarketplaceComponent implements OnInit {
  private http = inject(HttpClient);
  lang = localStorage.getItem('lang') ?? 'ar';
  listings = signal<any[]>([]);
  loading = signal(false);
  selectedCategory = signal('');

  categories = [
    { value: '', label: this.lang === 'ar' ? '🌟 الكل' : '🌟 All' },
    { value: 'chickens', label: this.lang === 'ar' ? '🐔 دواجن' : '🐔 Chickens' },
    { value: 'eggs', label: this.lang === 'ar' ? '🥚 بيض' : '🥚 Eggs' },
    { value: 'equipment', label: this.lang === 'ar' ? '⚙️ معدات' : '⚙️ Equipment' },
    { value: 'feed', label: this.lang === 'ar' ? '🌾 علف' : '🌾 Feed' },
    { value: 'other', label: this.lang === 'ar' ? '📦 أخرى' : '📦 Other' },
  ];

  ngOnInit() { this.loadListings(); }

  filterCategory(cat: string) {
    this.selectedCategory.set(cat);
    this.loadListings();
  }

  loadListings() {
    this.loading.set(true);
    const cat = this.selectedCategory();
    const url = cat
      ? `${environment.apiUrl}/listings/?category=${cat}`
      : `${environment.apiUrl}/listings/`;

    this.http.get<any>(url).subscribe({
      next: res => { this.listings.set(res.listings); this.loading.set(false); },
      error: () => this.loading.set(false)
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
}