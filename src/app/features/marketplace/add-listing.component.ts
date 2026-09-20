// import { Component, inject, signal } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import { Router } from '@angular/router';
// import { HttpClient, HttpHeaders } from '@angular/common/http';
// import { environment } from '../../../environments/environment';

// @Component({
//   selector: 'app-add-listing',
//   standalone: true,
//   imports: [CommonModule, FormsModule],
//   template: `
//   <div class="page-wrapper">
//     <h1 class="text-xl font-bold mb-4">
//       {{ lang === 'ar' ? '➕ إضافة إعلان' : '➕ Add Listing' }}
//     </h1>

//     <div class="card space-y-4">

//       <div>
//         <label class="form-label">{{ lang === 'ar' ? 'عنوان الإعلان *' : 'Title *' }}</label>
//         <input [(ngModel)]="form.title" class="form-input" 
//                [placeholder]="lang === 'ar' ? 'مثال: دجاج فروج للبيع' : 'Example: Broiler chickens for sale'"/>
//       </div>

//       <div>
//         <label class="form-label">{{ lang === 'ar' ? 'النوع *' : 'Category *' }}</label>
//         <select [(ngModel)]="form.category" class="form-input">
//           <option value="chickens">🐔 {{ lang === 'ar' ? 'دواجن' : 'Chickens' }}</option>
//           <option value="eggs">🥚 {{ lang === 'ar' ? 'بيض' : 'Eggs' }}</option>
//           <option value="equipment">⚙️ {{ lang === 'ar' ? 'معدات' : 'Equipment' }}</option>
//           <option value="feed">🌾 {{ lang === 'ar' ? 'علف' : 'Feed' }}</option>
//           <option value="other">📦 {{ lang === 'ar' ? 'أخرى' : 'Other' }}</option>
//         </select>
//       </div>

//       <div>
//         <label class="form-label">{{ lang === 'ar' ? 'الوصف' : 'Description' }}</label>
//         <textarea [(ngModel)]="form.description" class="form-input" rows="3"
//                   [placeholder]="lang === 'ar' ? 'اكتب تفاصيل الإعلان...' : 'Write details...'"></textarea>
//       </div>

//       <div class="grid grid-cols-2 gap-3">
//         <div>
//           <label class="form-label">{{ lang === 'ar' ? 'السعر (جنيه)' : 'Price (EGP)' }}</label>
//           <input [(ngModel)]="form.price" type="number" class="form-input" placeholder="0"/>
//         </div>
//         <div>
//           <label class="form-label">{{ lang === 'ar' ? 'الكمية' : 'Quantity' }}</label>
//           <input [(ngModel)]="form.quantity" type="number" class="form-input" placeholder="0"/>
//         </div>
//       </div>

//       <div class="flex items-center gap-2">
//         <input [(ngModel)]="form.price_negotiable" type="checkbox" id="neg" class="w-4 h-4"/>
//         <label for="neg" class="text-sm text-gray-600">
//           {{ lang === 'ar' ? 'السعر قابل للتفاوض' : 'Price is negotiable' }}
//         </label>
//       </div>

//   <div>
//   <label class="form-label">{{ lang === 'ar' ? 'المحافظة/المنطقة *' : 'Location *' }}</label>
  
//   <div class="relative w-full">
//     <input 
//       type="text"
//       [(ngModel)]="form.location"
//       (focus)="showDropdown = true"
//       (input)="showDropdown = true"
//       class="form-input w-full pr-10 text-base md:text-sm"
//       [placeholder]="lang === 'ar' ? 'اكتب اسم المحافظة للبحث السريع...' : 'Type to search governorate...'"
//     />
    
//     <span class="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
//       ▼
//     </span>

//     <div *ngIf="showDropdown" 
//          class="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl">
      
//       <div (click)="selectGov(''); showDropdown = false" 
//            class="px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-100 font-medium text-blue-600">
//         <!-- {{ lang === 'ar' ? 'مسح الاختيار ❌' : 'Clear Selection ❌' }} -->
//       </div>

//       <div *ngFor="let gov of governorates"
//            [class.hidden]="form.location && !((lang === 'ar' ? gov.nameAr : gov.nameEn).toLowerCase().includes(form.location.toLowerCase()))"
//            (click)="selectGov(lang === 'ar' ? gov.nameAr : gov.nameEn); showDropdown = false"
//            class="px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-50 last:border-none">
//         {{ lang === 'ar' ? gov.nameAr : gov.nameEn }}
//       </div>
//     </div>
//   </div>
// </div>

// <div *ngIf="showDropdown" class="fixed inset-0 z-40" (click)="showDropdown = false"></div>

//       <div>
//         <label class="form-label">{{ lang === 'ar' ? 'رقم الهاتف *' : 'Phone *' }}</label>
//         <input [(ngModel)]="form.phone" type="tel" class="form-input" placeholder="01XXXXXXXXX"/>
//       </div>

//       <div *ngIf="error()" class="bg-red-50 text-red-600 text-sm p-3 rounded-xl">
//         {{ error() }}
//       </div>

//       <button (click)="submit()"
//               [disabled]="loading()"
//               class="btn-primary btn w-full">
//         {{ loading() ? '...' : (lang === 'ar' ? '✅ نشر الإعلان' : '✅ Publish') }}
//       </button>

//     </div>
//   </div>
//   `
// })
// export class AddListingComponent {
//   private http = inject(HttpClient);
//   private router = inject(Router);
//   lang = localStorage.getItem('lang') ?? 'ar';
//   loading = signal(false);
//   error = signal('');

//   form = {
//     title: '',
//     description: '',
//     category: 'chickens',
//     price: null as number | null,
//     price_negotiable: false,
//     quantity: null as number | null,
//     unit: '',
//     location: '',
//     phone: '',
//     images: []
//   };
//   governorates = [
//   { id: 'cairo', nameAr: 'القاهرة', nameEn: 'Cairo' },
//   { id: 'giza', nameAr: 'الجيزة', nameEn: 'Giza' },
//   { id: 'alexandria', nameAr: 'الإسكندرية', nameEn: 'Alexandria' },
//   { id: 'qalyubia', nameAr: 'القليوبية', nameEn: 'Qalyubia' },
//   { id: 'gharbia', nameAr: 'الغربية', nameEn: 'Gharbia' },
//   { id: 'dakahlia', nameAr: 'الدقهلية', nameEn: 'Dakahlia' },
//   { id: 'beheira', nameAr: 'البحيرة', nameEn: 'Beheira' },
//   { id: 'sharqia', nameAr: 'الشرقية', nameEn: 'Sharqia' },
//   { id: 'monufia', nameAr: 'المنوفية', nameEn: 'Monufia' },
//   { id: 'kafr-elsheikh', nameAr: 'كفر الشيخ', nameEn: 'Kafr El-Sheikh' },
//   { id: 'damietta', nameAr: 'دمياط', nameEn: 'Damietta' },
//   { id: 'port-said', nameAr: 'بورسعيد', nameEn: 'Port Said' },
//   { id: 'ismailia', nameAr: 'الإسماعيلية', nameEn: 'Ismailia' },
//   { id: 'suez', nameAr: 'السويس', nameEn: 'Suez' },
//   { id: 'sinai-north', nameAr: 'شمال سيناء', nameEn: 'North Sinai' },
//   { id: 'sinai-south', nameAr: 'جنوب سيناء', nameEn: 'South Sinai' },
//   { id: 'beni-suef', nameAr: 'بني سويف', nameEn: 'Beni Suef' },
//   { id: 'fayoum', nameAr: 'الفيوم', nameEn: 'Fayoum' },
//   { id: 'minya', nameAr: 'المنيا', nameEn: 'Minya' },
//   { id: 'assiut', nameAr: 'أسيوط', nameEn: 'Assiut' },
//   { id: 'sohag', nameAr: 'سوهاج', nameEn: 'Sohag' },
//   { id: 'qena', nameAr: 'قنا', nameEn: 'Qena' },
//   { id: 'luxor', nameAr: 'الأقصر', nameEn: 'Luxor' },
//   { id: 'aswan', nameAr: 'أسوان', nameEn: 'Aswan' },
//   { id: 'red-sea', nameAr: 'البحر الأحمر', nameEn: 'Red Sea' },
//   { id: 'new-valley', nameAr: 'الوادي الجديد', nameEn: 'New Valley' },
//   { id: 'matrouh', nameAr: 'مطروح', nameEn: 'Matrouh' }
// ];
// onGovChange(event: any) {
//   const selectedName = event.target.value;
//   // البحث في مصفوفة المحافظات عن العنصر المطابق للاسم المكتوب (عربي أو إنجليزي)
//   const foundGov = this.governorates.find(g => 
//     g.nameAr === selectedName || g.nameEn === selectedName
//   );
  
//   if (foundGov) {
//     // إذا وجدناه، نقوم بتثبيت الـ id في الفورم ليرسل للباك إند بشكل سليم
//     this.form.location = foundGov.id;
//   }
// }
// // 1. متغير للتحكم في ظهور واختفاء الصندوق
// showDropdown = false;

// // 2. دالة الاختيار السريع عند الضغط على المحافظة
// selectGov(govName: string) {
//   this.form.location = govName;
//   this.showDropdown = false;
// }

// submit() {
//     if (!this.form.title || !this.form.location || !this.form.phone) {
//       this.error.set(this.lang === 'ar' ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
//       return;
//     }

//     const token = localStorage.getItem('spa_token');
//     if (!token) {
//       this.error.set(this.lang === 'ar' ? 'يرجى تسجيل الدخول أولاً' : 'Please login first');
//       this.router.navigate(['/login']);
//       return;
//     }

//     this.loading.set(true);
//     this.error.set('');

//     // 🔑 هنا تعريف المتغير المفقود headers
//     const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

//     this.http.post(`${environment.apiUrl}/listings/`, this.form, { headers }).subscribe({
//       next: () => {
//         this.loading.set(false);
//         this.router.navigate(['/marketplace']);
//       },
//       error: (err) => {
//         this.loading.set(false);

//         // 🚦 إذا كانت الهوية غير موثقة (403 Forbidden) -> التوجيه لصفحة توثيق الهوية
//         if (err.status === 403) {
//           this.router.navigate(['/verify-identity']);
//         } else if (err.status === 401) {
//           this.error.set(this.lang === 'ar' ? 'جلسة الدخول انتهت، يرجى إعادة تسجيل الدخول' : 'Session expired');
//           this.router.navigate(['/login']);
//         } else {
//           this.error.set(this.lang === 'ar' ? 'حدث خطأ، حاول مرة أخرى' : 'Error, try again');
//         }
//       }
//     });
//   }
// }
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-listing-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <div class="page-wrapper max-w-3xl mx-auto p-4">

    <!-- زر العودة -->
    <button (click)="goBack()" class="mb-4 text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1">
      ← {{ lang === 'ar' ? 'الرجوع للمتجر' : 'Back to marketplace' }}
    </button>

    <!-- حالة التحميل -->
    <div *ngIf="loading()" class="text-center py-12 text-gray-500">
      {{ lang === 'ar' ? 'جاري تحميل تفاصيل الإعلان...' : 'Loading listing details...' }}
    </div>

    <!-- حالة وجود خطأ -->
    <div *ngIf="error()" class="bg-red-50 text-red-600 p-4 rounded-xl text-center mb-4">
      {{ error() }}
    </div>

    <!-- تفاصيل الإعلان -->
    <div *ngIf="!loading() && listing()" class="card space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">

      <!-- العنوان والنوع -->
      <div>
        <div class="flex justify-between items-start gap-2">
          <h1 class="text-2xl font-bold text-gray-900">{{ listing().title }}</h1>
          <span class="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">
            {{ listing().category }}
          </span>
        </div>
        <p class="text-xs text-gray-400 mt-1">
          📍 {{ listing().location }}
        </p>
      </div>

      <!-- السعر والكمية -->
      <div class="bg-gray-50 p-4 rounded-xl grid grid-cols-2 gap-4">
        <div>
          <span class="block text-xs text-gray-500 mb-1">
            {{ lang === 'ar' ? 'السعر' : 'Price' }}
          </span>
          <span class="text-xl font-extrabold text-green-600">
            {{ listing().price ? (listing().price + ' ' + (lang === 'ar' ? 'جنيه' : 'EGP')) : (lang === 'ar' ? 'غير محدد' : 'N/A') }}
          </span>
          <span *ngIf="listing().price_negotiable" class="text-xs text-gray-500 block">
            ({{ lang === 'ar' ? 'قابل للتفاوض' : 'Negotiable' }})
          </span>
        </div>

        <div>
          <span class="block text-xs text-gray-500 mb-1">
            {{ lang === 'ar' ? 'الكمية المتاحة' : 'Quantity' }}
          </span>
          <span class="text-lg font-bold text-gray-800">
            {{ listing().quantity ?? (lang === 'ar' ? 'غير محدد' : 'N/A') }}
          </span>
        </div>
      </div>

      <!-- الوصف -->
      <div>
        <h3 class="text-sm font-semibold text-gray-700 mb-2">
          {{ lang === 'ar' ? 'الوصف' : 'Description' }}
        </h3>
        <p class="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
          {{ listing().description || (lang === 'ar' ? 'لا يوجد وصف متاح.' : 'No description provided.') }}
        </p>
      </div>

      <!-- معلومات التواصل -->
      <div class="border-t pt-4">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">
          {{ lang === 'ar' ? 'معلومات التواصل' : 'Contact Information' }}
        </h3>

        <div *ngIf="listing().phone" class="flex items-center justify-between bg-emerald-50 p-3.5 rounded-xl border border-emerald-100">
          <span class="text-sm font-bold text-emerald-800 dir-ltr">{{ listing().phone }}</span>
          <a [href]="'tel:' + listing().phone" class="btn-primary text-xs py-2 px-4 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
            📞 {{ lang === 'ar' ? 'اتصال الآن' : 'Call Now' }}
          </a>
        </div>
      </div>

    </div>
  </div>
  `
})
export class ListingDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);

  lang = localStorage.getItem('lang') ?? 'ar';
  listing = signal<any>(null);
  loading = signal<boolean>(true);
  error = signal<string>('');

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadListingDetails(id);
    } else {
      this.loading.set(false);
      this.error.set(this.lang === 'ar' ? 'رقم الإعلان غير صحيح' : 'Invalid listing ID');
    }
  }

  loadListingDetails(id: string) {
    this.loading.set(true);
    this.error.set('');

    const token = localStorage.getItem('spa_token');
    let headers = new HttpHeaders();

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    // الطلب الأول مع إرسال التوكن إن وجد
    this.http.get(`${environment.apiUrl}/listings/${id}`, { headers }).subscribe({
      next: (data) => {
        this.listing.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        // 🟢 الحل الجوهري: إذا أرجع السيرفر 401 (توكن غير صالح أو منتهي)
        // نعيد المحاولة فوراً بطلب عام بدون توكن بدلاً من التوجيه لصفحة الـ Login
        if (err.status === 401 && token) {
          this.fetchPublicListing(id);
        } else {
          this.loading.set(false);
          this.error.set(this.lang === 'ar' ? 'تعذر تحميل تفاصيل الإعلان' : 'Failed to load listing details');
        }
      }
    });
  }

  // طلب هادئ بدون توكن لضمان فتح الإعلان للجميع
  private fetchPublicListing(id: string) {
    this.http.get(`${environment.apiUrl}/listings/${id}`).subscribe({
      next: (data) => {
        this.listing.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(this.lang === 'ar' ? 'تعذر تحميل تفاصيل الإعلان' : 'Failed to load listing details');
      }
    });
  }

  goBack() {
    this.router.navigate(['/marketplace']);
  }
}