import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment'; // عدّل المسار حسب مكان الملف عندك

@Component({
  selector: 'app-verify-identity',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
  <div class="page-wrapper">
    <div class="flex items-center gap-2 mb-4">
      <a routerLink="/marketplace" class="text-gray-400 text-xl">←</a>
      <h1 class="text-xl font-bold">
        {{ lang === 'ar' ? '🪪 تسجيل بيانات الهوية' : '🪪 Identity Verification' }}
      </h1>
    </div>

    <div class="bg-amber-50 rounded-2xl p-4 mb-5 text-sm text-amber-700">
      {{ lang === 'ar'
        ? 'قبل ما تقدر تبيع أو تشتري في السوق، لازم تسجّل بيانات بطاقة الرقم القومي مرة واحدة فقط.'
        : 'Before you can buy or sell in the marketplace, you need to verify your national ID once.' }}
    </div>

    <div *ngIf="alreadyVerified()" class="bg-green-50 rounded-2xl p-6 text-center">
      <p class="text-3xl mb-2">✓</p>
      <p class="font-bold text-green-700">
        {{ lang === 'ar' ? 'تم توثيق حسابك بالفعل' : 'Your account is already verified' }}
      </p>
      <p class="text-xs text-gray-500 mt-1">
        {{ lang === 'ar' ? 'جاري تحويلك...' : 'Redirecting...' }}
      </p>
      <a [routerLink]="returnTo || '/marketplace'" class="text-sm text-green-600 underline mt-2 inline-block">
        {{ lang === 'ar' ? 'أكمل الآن' : 'Continue now' }}
      </a>
    </div>

    <form *ngIf="!alreadyVerified()" (ngSubmit)="submit()" class="space-y-4">
      <div>
        <label class="text-sm font-semibold text-gray-700 block mb-1.5">
          {{ lang === 'ar' ? 'الرقم القومي (14 رقم)' : 'National ID (14 digits)' }}
        </label>
        <input type="text" [(ngModel)]="form.national_id" name="national_id"
               maxlength="14" inputmode="numeric"
               placeholder="29001011234567"
               class="form-input w-full py-2.5 rounded-xl border border-gray-200 text-sm" />
      </div>

      <div>
        <label class="text-sm font-semibold text-gray-700 block mb-1.5">
          {{ lang === 'ar' ? 'صورة البطاقة (الوجه)' : 'ID front image' }}
        </label>
        <input type="file" accept="image/*" (change)="onFileSelected($event, 'front')"
               class="w-full text-sm" />
        <img *ngIf="frontPreview()" [src]="frontPreview()" class="mt-2 rounded-xl border border-gray-200 max-h-40" />
      </div>

      <div>
        <label class="text-sm font-semibold text-gray-700 block mb-1.5">
          {{ lang === 'ar' ? 'صورة البطاقة (الظهر)' : 'ID back image' }}
        </label>
        <input type="file" accept="image/*" (change)="onFileSelected($event, 'back')"
               class="w-full text-sm" />
        <img *ngIf="backPreview()" [src]="backPreview()" class="mt-2 rounded-xl border border-gray-200 max-h-40" />
      </div>

      <div *ngIf="errorMsg()" class="bg-red-50 text-red-600 text-sm p-3 rounded-xl">
        {{ errorMsg() }}
      </div>

      <button type="submit" [disabled]="submitting() || !isFormValid()" class="w-full btn-primary btn">
        {{ submitting() ? '...' : (lang === 'ar' ? 'إرسال البيانات' : 'Submit') }}
      </button>

      <p class="text-[11px] text-gray-400 text-center">
        {{ lang === 'ar'
          ? 'بياناتك محمية ومتاحة فقط للمراجعة الإدارية عند الحاجة.'
          : 'Your data is protected and only accessible for administrative review when needed.' }}
      </p>
    </form>
  </div>
  `
})
export class VerifyIdentityComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  lang = localStorage.getItem('lang') ?? 'ar';

  alreadyVerified = signal(false);
  submitting = signal(false);
  errorMsg = signal('');
  returnTo: string | null = null;

  form = { national_id: '' };
  frontFile: File | null = null;
  backFile: File | null = null;
  frontPreview = signal<string | null>(null);
  backPreview = signal<string | null>(null);

  private headers() {
    const token = localStorage.getItem('spa_token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  ngOnInit() {
    this.returnTo = this.route.snapshot.queryParamMap.get('returnTo');

    this.http.get<any>(`${environment.apiUrl}/identity-verification/status`, { headers: this.headers() })
      .subscribe({
        next: res => {
          const verified = res.is_verified === true;
          this.alreadyVerified.set(verified);
          if (verified) {
            // موثّق بالفعل -> ودّيه على طول لمكانه الأصلي بدل ما يسيبه واقف
            setTimeout(() => {
              this.router.navigate([this.returnTo || '/marketplace']);
            }, 1200);
          }
        },
        error: () => {}
      });
  }

  onFileSelected(event: Event, side: 'front' | 'back') {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (side === 'front') {
      this.frontFile = file;
      this.frontPreview.set(URL.createObjectURL(file));
    } else {
      this.backFile = file;
      this.backPreview.set(URL.createObjectURL(file));
    }
  }

  isFormValid(): boolean {
    return /^\d{14}$/.test(this.form.national_id) && !!this.frontFile && !!this.backFile;
  }

 submit() {
  if (!this.isFormValid() || !this.frontFile || !this.backFile) return;

  this.submitting.set(true);
  this.errorMsg.set('');

  const formData = new FormData();
  formData.append('national_id', this.form.national_id);
  formData.append('front_image', this.frontFile);
  formData.append('back_image', this.backFile);

  const token = localStorage.getItem('spa_token');
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`
    // ⚠️ لا تضع 'Content-Type' هنا نهائياً ليقوم المتصفح بإنشاء boundary الـ multipart
  });

  this.http.post(`${environment.apiUrl}/identity-verification/submit`, formData, { headers })
    .subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigate([this.returnTo || '/marketplace']);
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMsg.set(
          err?.error?.detail ?? (this.lang === 'ar' ? 'حدث خطأ، حاول مرة أخرى' : 'Error, try again')
        );
      }
    });
}
}
