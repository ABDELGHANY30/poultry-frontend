import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-subscription',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="max-w-2xl mx-auto px-4 py-8">
    
    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-2xl font-bold text-gray-800 mb-2">
        {{ lang === 'ar' ? 'اختر خطتك' : 'Choose Your Plan' }}
      </h1>
      <p class="text-gray-500 text-sm">
        {{ lang === 'ar' ? 'ابدأ مجاناً وترقى متى تريد' : 'Start free, upgrade anytime' }}
      </p>
    </div>

    <!-- Current Plan -->
    <div *ngIf="status()" 
         [class]="status()?.is_pro ? 'bg-amber-50 border-2 border-amber-300' : 'bg-blue-50'"
         class="rounded-2xl p-4 mb-6 flex items-center justify-between">
      <div>
        <p [class]="status()?.is_pro ? 'text-amber-700' : 'text-blue-600'" class="text-sm font-semibold flex items-center gap-1">
          <span *ngIf="status()?.is_pro" class="bg-amber-400 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide">Pro</span>
          {{ lang === 'ar' ? 'خطتك الحالية' : 'Current Plan' }}:
          <span class="uppercase">{{ status()?.plan }}</span>
        </p>
        <p [class]="status()?.is_pro ? 'text-amber-500' : 'text-blue-400'" class="text-xs mt-0.5">
          {{ lang === 'ar' ? 'الأسئلة المتبقية اليوم' : 'Questions remaining today' }}:
          {{ status()?.remaining }} / {{ status()?.daily_limit === 999999 ? '∞' : status()?.daily_limit }}
        </p>
        <p *ngIf="status()?.is_pro && status()?.plan_expires_at" class="text-xs text-amber-500 mt-0.5">
          {{ lang === 'ar' ? 'ينتهي في' : 'Renews/expires' }}: {{ status()?.plan_expires_at | date:'d MMM y' }}
        </p>
      </div>
      <span class="text-2xl">{{ status()?.is_pro ? '⭐' : '🆓' }}</span>
    </div>

    <!-- ⚠️ TEST ONLY — زرار مؤقت لتجربة إن اللينك بيفتح صح من الموقع.
         هيتشال لما نبني تكامل Paymob API الحقيقي (لينك ديناميكي + webhook). -->
    <button
      (click)="testPaymobQuickLink()"
      class="w-full border-2 border-dashed border-purple-300 text-purple-600 py-2 rounded-xl text-sm font-semibold mb-4">
      🧪 {{ lang === 'ar' ? 'تجربة لينك الدفع (Paymob)' : 'Test Paymob Payment Link' }}
    </button>

    <!-- Plans -->
    <div class="grid grid-cols-1 gap-4">
      
      <!-- Free Plan -->
      <div class="border-2 border-gray-200 rounded-3xl p-6">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-lg font-bold text-gray-800">Free</h2>
            <p class="text-gray-400 text-sm">{{ lang === 'ar' ? 'مجاناً للأبد' : 'Free forever' }}</p>
          </div>
          <div class="text-3xl font-black text-gray-300">0</div>
        </div>
        <ul class="space-y-2 mb-4">
          <li class="flex items-center gap-2 text-sm text-gray-600">
            <span class="text-green-500">✅</span>
            {{ lang === 'ar' ? '10 أسئلة يومياً' : '10 questions/day' }}
          </li>
          <li class="flex items-center gap-2 text-sm text-gray-400">
            <span>❌</span>
            {{ lang === 'ar' ? 'تحليل الصور' : 'Image analysis' }}
          </li>
          <li class="flex items-center gap-2 text-sm text-gray-400">
            <span>❌</span>
            {{ lang === 'ar' ? 'تقارير متقدمة' : 'Advanced reports' }}
          </li>
        </ul>
        <div *ngIf="!status()?.is_pro" class="bg-gray-100 text-gray-500 text-center py-2 rounded-xl text-sm font-semibold">
          {{ lang === 'ar' ? 'خطتك الحالية' : 'Current Plan' }}
        </div>
      </div>

      <!-- Pro Monthly -->
      <div class="border-2 border-green-500 rounded-3xl p-6 relative">
        <div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs px-3 py-1 rounded-full font-bold">
          {{ lang === 'ar' ? 'الأكثر شيوعاً' : 'Most Popular' }}
        </div>
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-lg font-bold text-gray-800">Pro</h2>
            <p class="text-gray-400 text-sm">{{ lang === 'ar' ? 'شهري' : 'Monthly' }}</p>
          </div>
          <div>
            <span class="text-3xl font-black text-green-600">150</span>
            <span class="text-gray-400 text-sm"> {{ lang === 'ar' ? 'جنيه/شهر' : 'EGP/mo' }}</span>
          </div>
        </div>
        <ul class="space-y-2 mb-4">
          <li class="flex items-center gap-2 text-sm text-gray-600">
            <span class="text-green-500">✅</span>
            {{ lang === 'ar' ? 'أسئلة غير محدودة' : 'Unlimited questions' }}
          </li>
          <li class="flex items-center gap-2 text-sm text-gray-600">
            <span class="text-green-500">✅</span>
            {{ lang === 'ar' ? 'تحليل صور الطيور' : 'Bird image analysis' }}
          </li>
          <li class="flex items-center gap-2 text-sm text-gray-600">
            <span class="text-green-500">✅</span>
            {{ lang === 'ar' ? 'تقارير متقدمة' : 'Advanced reports' }}
          </li>
          <li class="flex items-center gap-2 text-sm text-gray-600">
            <span class="text-green-500">✅</span>
            {{ lang === 'ar' ? 'دعم أولوية' : 'Priority support' }}
          </li>
        </ul>
        <button 
          *ngIf="!status()?.is_pro"
          (click)="subscribe('pro_monthly')"
          [disabled]="loading()"
          class="w-full bg-green-600 text-white py-3 rounded-2xl font-bold hover:bg-green-700 transition disabled:opacity-50">
          {{ loading() ? '...' : (lang === 'ar' ? '👆 اشترك الآن' : '👆 Subscribe Now') }}
        </button>
        <div *ngIf="status()?.is_pro" class="w-full bg-green-100 text-green-700 py-3 rounded-2xl font-bold text-center flex items-center justify-center gap-2">
          <span>✅</span>
          {{ lang === 'ar' ? 'خطتك الحالية' : 'Current Plan' }}
        </div>
      </div>

      <!-- Pro Yearly -->
      <div class="border-2 border-amber-400 rounded-3xl p-6 relative">
        <div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-white text-xs px-3 py-1 rounded-full font-bold">
          {{ lang === 'ar' ? 'وفّر 44%' : 'Save 44%' }}
        </div>
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-lg font-bold text-gray-800">Pro</h2>
            <p class="text-gray-400 text-sm">{{ lang === 'ar' ? 'سنوي' : 'Yearly' }}</p>
          </div>
          <div>
            <span class="text-3xl font-black text-amber-600">1000</span>
            <span class="text-gray-400 text-sm"> {{ lang === 'ar' ? 'جنيه/سنة' : 'EGP/yr' }}</span>
          </div>
        </div>
        <ul class="space-y-2 mb-4">
          <li class="flex items-center gap-2 text-sm text-gray-600">
            <span class="text-green-500">✅</span>
            {{ lang === 'ar' ? 'كل مميزات Pro' : 'All Pro features' }}
          </li>
          <li class="flex items-center gap-2 text-sm text-gray-600">
            <span class="text-green-500">✅</span>
            {{ lang === 'ar' ? 'توفير 800 جنيه' : 'Save 800 EGP' }}
          </li>
        </ul>
        <button 
          *ngIf="!status()?.is_pro"
          (click)="subscribe('pro_yearly')"
          [disabled]="loading()"
          class="w-full bg-amber-500 text-white py-3 rounded-2xl font-bold hover:bg-amber-600 transition disabled:opacity-50">
          {{ loading() ? '...' : (lang === 'ar' ? '👆 اشترك سنوياً' : '👆 Subscribe Yearly') }}
        </button>
        <div *ngIf="status()?.is_pro" class="w-full bg-green-100 text-green-700 py-3 rounded-2xl font-bold text-center flex items-center justify-center gap-2">
          <span>✅</span>
          {{ lang === 'ar' ? 'خطتك الحالية' : 'Current Plan' }}
        </div>
      </div>

    </div>
  </div>
  `
})
export class SubscriptionComponent implements OnInit {
  private http = inject(HttpClient);
  lang = localStorage.getItem('lang') ?? 'ar';
  loading = signal(false);
  status = signal<any>(null);

  ngOnInit() {
    this.loadStatus();
  }

  loadStatus() {
    const token = localStorage.getItem('spa_token');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    this.http.get(`${environment.apiUrl}/payment/status`, { headers }).subscribe({
      next: (res: any) => this.status.set(res),
      error: () => {}
    });
  }

  subscribe(plan: string) {
    this.loading.set(true);
    const token = localStorage.getItem('spa_token');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

    // ⚠️ TEST ONLY — بينادي /payment/test-activate اللي بيحاكي شراء ناجح
    // من غير Google Play خالص، عشان تقدر تختبر باقي المنطق (تحديث الخطة،
    // الكريدت، الـ UI) وانت لسه معملتش إعدادات Play Console.
    //
    // لازم يترجع لما تربط Google Play Billing فعلياً — هيبقى الشكل وقتها:
    //   1. تنادي بلجن Play Billing (مثلاً cordova-plugin-purchase) عشان
    //      تفتح شاشة شراء حقيقية وتاخد purchase_token.
    //   2. تبعت التوكن ده لـ /payment/verify-purchase بدل /payment/test-activate.
    this.http.post(`${environment.apiUrl}/payment/test-activate?plan=${plan}`, {}, { headers }).subscribe({
      next: (res: any) => {
        this.loading.set(false);
        this.loadStatus(); // يحدّث الشاشة فوراً يبين إنك بقيت Pro
      },
      error: (err) => {
        this.loading.set(false);
        alert(this.lang === 'ar' ? 'حدث خطأ، حاول مرة أخرى' : 'Error, please try again');
      }
    });
  }

  // ⚠️ TEST ONLY — مؤقت بس عشان نتأكد إن زرار الموقع بيوصل فعلاً لصفحة
  // الدفع بتاعة Paymob. اللينك ده Quick Link بمبلغ ثابت (150 جنيه) ومش
  // مربوط بحساب المستخدم ولا بالباك اند خالص — لسه محتاجين API Keys
  // عشان نعمل لينك ديناميكي لكل مستخدم ومبلغه، ونربطه بـ webhook يفعّل
  // الاشتراك أوتوماتيك. الدالة دي والزرار المرتبط بيها هيتشالوا لما
  // نبني التكامل الحقيقي.
  testPaymobQuickLink() {
    window.open('https://paymob.link/mxQ1B', '_blank');
  }
}