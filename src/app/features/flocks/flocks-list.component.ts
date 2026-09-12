// import { Component, OnInit, inject, signal } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import { RouterLink } from '@angular/router';
// import { TranslateModule } from '@ngx-translate/core';
// import { FlockService } from '../../core/services/flock.service';
// import { Flock, FlockCreate, FlockType } from '../../core/models';

// @Component({
//   selector: 'app-flocks-list',
//   standalone: true,
//   imports: [CommonModule, FormsModule, RouterLink, TranslateModule],
//   template: `
//   <div class="page-wrapper">

//     <div class="flex items-center justify-between">
//       <div>
//         <h1 class="text-2xl font-black text-primary-900">🐔 {{ 'FLOCK.TITLE' | translate }}</h1>
//         <p class="text-sm text-[var(--c-muted)] mt-0.5">{{ flocks().length }} {{ 'FLOCK.TOTAL' | translate }}</p>
//       </div>
//       <button class="btn-primary btn" (click)="toggleForm()">
//         {{ showForm() ? '✕' : '+' }} {{ showForm() ? ('COMMON.CANCEL' | translate) : ('FLOCK.ADD' | translate) }}
//       </button>
//     </div>

//     <div *ngIf="showForm()" class="card animate-in border-2 border-primary-200">
//       <h2 class="section-title">➕ {{ 'FLOCK.ADD' | translate }}</h2>
//       <div class="grid sm:grid-cols-2 gap-4">
        
//         <!-- 1. اسم القطيع (يظهر دائماً) -->
//         <div>
//           <label class="form-label">{{ 'FLOCK.NAME' | translate }}</label>
//           <input class="form-input" [(ngModel)]="form.name" [placeholder]="'FLOCK.NAME_PH' | translate" />
//         </div>
        
//         <!-- 2. نوع القطيع (يظهر دائماً ويتحكم في باقي الحقول) -->
//         <div>
//           <label class="form-label">{{ 'FLOCK.TYPE' | translate }}</label>
//           <select class="form-select" [(ngModel)]="form.type" (change)="onTypeChange()">
//             <option value=""> {{ 'FLOCK.CHOOSE' | translate  }} </option>
//             <option value="broiler">🐔 {{ 'FLOCK.BROILER' | translate }}</option>
//             <option value="layer">🥚 {{ 'FLOCK.LAYER' | translate }}</option>
//             <option value="rabbit">🐇 {{ 'FLOCK.RABBIT' | translate }}</option>
//             <option value="turkey">🦃 {{ 'FLOCK.TURKEY' | translate }}</option>
//             <option value="duck">🦆 {{ 'FLOCK.DUCK' | translate }}</option>
//           </select>
//         </div>

//         <!-- 3. تاريخ البدء (يظهر دائماً) -->
//         <div>
//           <label class="form-label">{{ 'FLOCK.START_DATE' | translate }}</label>
//           <input class="form-input" type="date" [(ngModel)]="form.startDate" />
//         </div>

//         <!-- 🌟 الجزء المشروط: لا يظهر السلالة والعدد إلا إذا تم اختيار النوع 🌟 -->
//         <ng-container *ngIf="form.type">
          
//           <!-- 4. العدد الأولي / الأمهات -->
//           <div>
//             <label class="form-label">
//               {{ form.type === 'rabbit' ? ('FLOCK.RABBIT_COUNT' | translate) : ('FLOCK.COUNT' | translate) }}
//             </label>
//             <input class="form-input" type="number" [(ngModel)]="form.initialCount" min="1" placeholder="500" />
//           </div>

//           <!-- 5. السلالة المفلترة تلقائياً حسب النوع المختار -->
//           <div>
//             <label class="form-label">{{ 'FLOCK.breed' | translate }}</label>
//             <select class="form-select" [(ngModel)]='form.breed'>
//               <option value="">{{ 'FLOCK.CHOOSE_BREED' | translate }} </option>
              
//               <!-- سلالات دجاج التسمين -->
//               <ng-container *ngIf="form.type === 'broiler'">
//                 <option value="cobb500">{{ 'FLOCK.cobb' | translate }}</option>
//                 <option value="ross300">{{ 'FLOCK.ross' | translate }}</option>
//                 <option value="hyber">{{ 'FLOCK.hyper' | translate }}</option>
//               </ng-container>

//               <!-- سلالات دجاج البياض -->
//               <ng-container *ngIf="form.type === 'layer'">
//                 <option value="hy_line">{{ 'FLOCK.hyline' | translate }}</option>
//                 <option value="lohmann">{{ 'FLOCK.lohmann' | translate }}</option>
//                 <option value="isa_brown">{{ 'FLOCK.isa_brown' | translate }}</option>
//               </ng-container>

//               <!-- سلالات الأرانب -->
//               <ng-container *ngIf="form.type === 'rabbit'">
//                 <option value="new_zealand">{{ 'FLOCK.new_zealand' | translate }}</option>
//                 <option value="california">{{ 'FLOCK.california' | translate }}</option>
//                 <option value="v_line">{{ 'FLOCK.v_line' | translate }}</option>
//               </ng-container>

//               <!-- سلالات الرومي -->
//               <ng-container *ngIf="form.type === 'turkey'">
//                 <option value="nicholas">{{ 'FLOCK.nicholas' | translate }}</option>
//                 <option value="hybrid_converter">{{ 'FLOCK.hybrid' | translate }}</option>
//                 <option value="bronze">{{ 'FLOCK.bronze' | translate }}</option>
//               </ng-container>
//               <!-- سلالات البط -->
// <ng-container *ngIf="form.type === 'duck'">
//   <option value="pekin">{{ 'FLOCK.BREEDS.PEKIN' | translate }}</option>
//   <option value="mullard">{{ 'FLOCK.BREEDS.MULLARD' | translate }}</option>
//   <option value="muscovy">{{ 'FLOCK.BREEDS.MUSCOVY' | translate }}</option>
//   <option value="baladi">{{ 'FLOCK.BREEDS.BALADI' | translate }}</option>
//   <option value="rouen">{{ 'FLOCK.BREEDS.ROUEN' | translate }}</option>
// </ng-container>
//             </select>
//           </div>

//         </ng-container>
//       </div>

//       <div class="flex gap-3 mt-4">
//         <button class="btn-primary btn" (click)="submit()" [disabled]="!isValid()">
//           ✓ {{ 'COMMON.SAVE' | translate }}
//         </button>
//         <button class="btn-ghost btn" (click)="showForm.set(false)">{{ 'COMMON.CANCEL' | translate }}</button>
//       </div>
//     </div>

//     <!-- 📊 قائمة كروت القطعان -->
//     <div class="grid sm:grid-cols-2 xl:grid-cols-2 gap-4" *ngIf="flocks().length > 0">
//       <a *ngFor="let f of flocks()" [routerLink]="['/flocks', f.id]"
//          class="block bg-white rounded-3xl border border-[var(--c-border)] overflow-hidden
//                 no-underline hover:-translate-y-1 hover:shadow-card-lg transition-all duration-200 animate-in">

//         <div class="h-2" 
//              [class.bg-primary-500]="f.type==='broiler'" 
//              [class.bg-purple-500]="f.type==='layer'"
//              [class.bg-blue-500]="f.type==='rabbit'"
//              [class.bg-amber-500]="f.type==='turkey'"></div>

//         <div class="px-5 pt-4 pb-3 flex items-start justify-between"
//              [class.bg-primary-50]="f.type==='broiler'" 
//              [class.bg-purple-50]="f.type==='layer'"
//              [class.bg-blue-50]="f.type==='rabbit'"
//              [class.bg-amber-50]="f.type==='turkey'">
//           <div>
//             <p class="text-xs font-bold uppercase tracking-wide mb-1"
//                [class.text-primary-600]="f.type==='broiler'" 
//                [class.text-purple-600]="f.type==='layer'"
//                [class.text-blue-600]="f.type==='rabbit'"
//                [class.text-amber-600]="f.type==='turkey'">
//               {{ (f.type === 'broiler' ? 'FLOCK.BROILER' : f.type === 'layer' ? 'FLOCK.LAYER' : f.type === 'rabbit' ? 'FLOCK.RABBIT' : 'FLOCK.TURKEY') | translate }}
//             </p>
//             <h3 class="font-black text-base text-[var(--c-text)]">{{ f.name }}</h3>
//           </div>
//           <div class="text-3xl">
//             {{ f.type === 'broiler' ? '🐔' : f.type === 'layer' ? '🥚' : f.type === 'rabbit' ? '🐇' : '🦃' }}
//           </div>
//         </div>

//         <div class="px-5 py-2 border-b border-[var(--c-border)]">
//           <div class="flex justify-between text-[10px] text-[var(--c-muted)] font-semibold mb-1">
//             <span>{{ 'FLOCK.PROGRESS' | translate }}</span>
//             <span>{{ 'FLOCK.DAY' | translate }} {{ f.ageInDays }}</span>
//           </div>
//           <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
//             <div class="h-full rounded-full transition-all duration-700"
//                  [class.bg-primary-500]="f.type==='broiler'"
//                  [class.bg-purple-500]="f.type==='layer'"
//                  [class.bg-blue-500]="f.type==='rabbit'"
//                  [class.bg-amber-500]="f.type==='turkey'"
//                  [style.width]="Math.min(100, f.ageInDays / (f.type==='broiler' ? 42 : f.type==='rabbit' ? 60 : f.type==='turkey' ? 140 : 160) * 100) + '%'">
//             </div>
//           </div>
//         </div>

//         <div class="grid grid-cols-3 divide-x divide-[var(--c-border)]">
//           <div class="px-4 py-3 text-center">
//             <p class="text-base font-black text-primary-700">{{ f.currentCount | number }}</p>
//             <p class="text-[10px] text-[var(--c-muted)] font-semibold">{{ 'FLOCK.BIRDS' | translate }}</p>
//           </div>
//           <div class="px-4 py-3 text-center">
//             <p class="text-base font-black"
//                [class.text-green-600]="f.mortalityRate<=2"
//                [class.text-amber-600]="f.mortalityRate>2 && f.mortalityRate<=4"
//                [class.text-red-600]="f.mortalityRate>4">
//               {{ f.mortalityRate | number:'1.1-1' }}%
//             </p>
//             <p class="text-[10px] text-[var(--c-muted)] font-semibold">{{ 'FLOCK.MORTALITY' | translate }}</p>
//           </div>
//           <div class="px-4 py-3 text-center">
//             <p class="text-xs font-bold text-[var(--c-text)]">{{ f.startDate }}</p>
//             <p class="text-[10px] text-[var(--c-muted)] font-semibold">{{ 'FLOCK.START' | translate }}</p>
//           </div>
//         </div>

//         <div class="px-5 py-3 flex items-center justify-between border-t border-[var(--c-border)]">
//           <span class="badge" [class.badge-success]="f.status==='active'" [class.badge-neutral]="f.status==='closed'">
//             {{ f.status === 'active' ? ('FLOCK.ACTIVE' | translate) : ('FLOCK.CLOSED' | translate) }}
//           </span>
//           <span class="text-xs font-semibold text-primary-600">{{ 'COMMON.VIEW_DETAILS' | translate }} →</span>
//         </div>
//       </a>
//     </div>

//     <div *ngIf="flocks().length === 0" class="text-center py-16">
//       <p class="text-6xl mb-4">🐣</p>
//       <h3 class="text-xl font-bold text-[var(--c-text)] mb-2">{{ 'FLOCK.EMPTY_TITLE' | translate }}</h3>
//       <p class="text-[var(--c-muted)] text-sm mb-6">{{ 'FLOCK.EMPTY_SUB' | translate }}</p>
//       <button class="btn-primary btn btn-lg" (click)="showForm.set(true)">
//         + {{ 'FLOCK.ADD' | translate }}
//       </button>
//     </div>

//   </div>
//   `,
// })
// export class FlocksListComponent implements OnInit {
//   private svc = inject(FlockService);
//   flocks = this.svc.flocks;
//   showForm = signal(false);
//   Math = Math;

//   // تهيئة الفورم بنوع فارغ لتطبيق شرط الإخفاء التلقائي عند التحميل الأول
//   form: FlockCreate = {
//     name: '', 
//     type: '' as unknown as FlockType, 
//     initialCount: 500, 
//     startDate: new Date().toISOString().split('T')[0],
//     breed: ''  
//   };

//   ngOnInit() { 
//     this.svc.getFlocks().subscribe(); 
//   }

//   // تصفير السلالة المختارة فور تغيير النوع لمنع تداخل قيم قديمة
//   onTypeChange() {
//     this.form.breed = '';
//   }

//   toggleForm() {
//     this.showForm.set(!this.showForm());
//     if (!this.showForm()) {
//       this.resetForm();
//     }
//   }

//   resetForm() {
//     this.form = { 
//       name: '', 
//       type: '' as unknown as FlockType, 
//       initialCount: 500, 
//       startDate: new Date().toISOString().split('T')[0],
//       breed: ''
//     };
//   }

//   isValid(): boolean {
//     return !!this.form.name && 
//            !!this.form.type &&
//            this.form.initialCount > 0 && 
//            !!this.form.startDate && 
//            !!this.form.breed;
//   }

//   submit() {
//     if (!this.isValid()) return;

//     this.svc.createFlock({ ...this.form }).subscribe({
//       next: () => {
//         this.resetForm();
//         this.showForm.set(false);
//         this.svc.getFlocks().subscribe(); 
//       },
//       error: (err) => console.error('خطأ أثناء الحفظ:', err)
//     });
//   }
// }
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { FlockService } from '../../core/services/flock.service';
import { Flock, FlockCreate, FlockType } from '../../core/models';

@Component({
  selector: 'app-flocks-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule],
  template: `
  <div class="page-wrapper">

    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-black text-primary-900">🐔 {{ 'FLOCK.TITLE' | translate }}</h1>
        <p class="text-sm text-[var(--c-muted)] mt-0.5">{{ activeFlocks().length }} {{ 'FLOCK.TOTAL' | translate }}</p>
      </div>
      <button class="btn-primary btn" (click)="toggleForm()">
        {{ showForm() ? '✕' : '+' }} {{ showForm() ? ('COMMON.CANCEL' | translate) : ('FLOCK.ADD' | translate) }}
      </button>
    </div>

    <div *ngIf="showForm()" class="card animate-in border-2 border-primary-200">
      <h2 class="section-title">➕ {{ 'FLOCK.ADD' | translate }}</h2>
      <div class="grid sm:grid-cols-2 gap-4">
        
        <!-- 1. اسم القطيع -->
        <div>
          <label class="form-label">{{ 'FLOCK.NAME' | translate }}</label>
          <input class="form-input" [(ngModel)]="form.name" [placeholder]="'FLOCK.NAME_PH' | translate" />
        </div>
        
        <!-- 2. نوع القطيع -->
        <div>
         <label class="form-label">{{ 'FLOCK.TYPE' | translate }}</label>

<select class="form-select" [(ngModel)]="form.type" (change)="onTypeChange()">
  <option value="">
    {{ 'FLOCK.CHOOSE' | translate }}
  </option>

  <option value="broiler">🐔 {{ 'FLOCK.BROILER' | translate }}</option>
  <option value="layer">🥚 {{ 'FLOCK.LAYER' | translate }}</option>
  <option value="rabbit">🐇 {{ 'FLOCK.RABBIT' | translate }}</option>
  <option value="turkey">🦃 {{ 'FLOCK.TURKEY' | translate }}</option>
  <option value="duck">🦆 {{ 'FLOCK.DUCK' | translate }}</option>
  <option value="quail">🐦 {{ 'FLOCK.QUAIL' | translate }}</option>
</select>
        </div>

        <!-- 3. تاريخ البدء -->
        <div>
          <label class="form-label">{{ 'FLOCK.START_DATE' | translate }}</label>
          <input class="form-input" type="date" [(ngModel)]="form.startDate" />
        </div>

        <!-- الجزء المشروط -->
        <ng-container *ngIf="form.type">
          
          <!-- 4. العدد الأولي -->
          <div>
            <label class="form-label">
              {{ form.type === 'rabbit' ? ('FLOCK.RABBIT_COUNT' | translate) : ('FLOCK.COUNT' | translate) }}
            </label>
            <input class="form-input" type="number" [(ngModel)]="form.initialCount" min="1" placeholder="500" />
          </div>

          <!-- 5. السلالة المختارة حسب النوع المختار -->
      <div>
  <label class="form-label">{{ 'FLOCK.breed' | translate }}</label>
  <select class="form-select" [(ngModel)]="form.breed">
    <option value="">{{ 'FLOCK.CHOOSE_BREED' | translate }}</option>

    <!-- Broiler -->
    <ng-container *ngIf="form.type === 'broiler'">
      <option value="cobb500">{{ 'FLOCK.COBB500' | translate }}</option>
      <option value="ross308">{{ 'FLOCK.ROSS308' | translate }}</option>
      <option value="arbor_acres">{{ 'FLOCK.ARBOR_ACRES' | translate }}</option>
      <option value="hubbard">{{ 'FLOCK.HUBBARD' | translate }}</option>
      <option value="avian48">{{ 'FLOCK.AVIAN48' | translate }}</option>
      <option value="indian_river">{{ 'FLOCK.INDIAN_RIVER' | translate }}</option>
      <option value="sasso">{{ 'FLOCK.SASSO' | translate }}</option>
      <option value="hybro">{{ 'FLOCK.HYBRO' | translate }}</option>
    </ng-container>

    <!-- Layer -->
    <ng-container *ngIf="form.type === 'layer'">
      <option value="hyline_brown">{{ 'FLOCK.HYLINE_BROWN' | translate }}</option>
      <option value="hyline_white">{{ 'FLOCK.HYLINE_WHITE' | translate }}</option>
      <option value="lohmann_brown">{{ 'FLOCK.LOHMANN_BROWN' | translate }}</option>
      <option value="lohmann_white">{{ 'FLOCK.LOHMANN_WHITE' | translate }}</option>
      <option value="isa_brown">{{ 'FLOCK.ISA_BROWN' | translate }}</option>
      <option value="dekalb_white">{{ 'FLOCK.DEKALB_WHITE' | translate }}</option>
      <option value="babcock">{{ 'FLOCK.BABCOCK' | translate }}</option>
      <option value="nick_chick">{{ 'FLOCK.NICK_CHICK' | translate }}</option>
      <option value="fayoumi">{{ 'FLOCK.FAYOUMI' | translate }}</option>
      <option value="gemmiza">{{ 'FLOCK.GEMMIZA' | translate }}</option>
      <option value="montazah">{{ 'FLOCK.MONTAZAH' | translate }}</option>
      <option value="maamoura">{{ 'FLOCK.MAAMOURA' | translate }}</option>
      <option value="dandarawi">{{ 'FLOCK.DANDARAWI' | translate }}</option>
      <option value="sina">{{ 'FLOCK.SINA' | translate }}</option>
      <option value="bandarah">{{ 'FLOCK.BANDARAH' | translate }}</option>
      <option value="baladi">{{ 'FLOCK.BALADI' | translate }}</option>
    </ng-container>

    <!-- Rabbit -->
    <ng-container *ngIf="form.type === 'rabbit'">
      <option value="new_zealand_white">{{ 'FLOCK.NEW_ZEALAND_WHITE' | translate }}</option>
      <option value="california">{{ 'FLOCK.CALIFORNIA' | translate }}</option>
      <option value="chinchilla">{{ 'FLOCK.CHINCHILLA' | translate }}</option>
      <option value="flemish_giant">{{ 'FLOCK.FLEMISH_GIANT' | translate }}</option>
      <option value="v_line">{{ 'FLOCK.V_LINE' | translate }}</option>
      <option value="hyplus">{{ 'FLOCK.HYPLUS' | translate }}</option>
      <option value="bouscat">{{ 'FLOCK.BOUSCAT' | translate }}</option>
      <option value="baladi">{{ 'FLOCK.BALADI' | translate }}</option>
      <option value="baladi_red">{{ 'FLOCK.BALADI_RED' | translate }}</option>
      <option value="moshtohor">{{ 'FLOCK.MOSHTOHOR' | translate }}</option>
    </ng-container>

    <!-- Turkey -->
    <ng-container *ngIf="form.type === 'turkey'">
      <option value="broad_breasted_white">{{ 'FLOCK.BROAD_BREASTED_WHITE' | translate }}</option>
      <option value="nicholas">{{ 'FLOCK.NICHOLAS' | translate }}</option>
      <option value="hybrid_converter">{{ 'FLOCK.HYBRID_CONVERTER' | translate }}</option>
      <option value="bronze">{{ 'FLOCK.BRONZE' | translate }}</option>
      <option value="bourbon_red">{{ 'FLOCK.BOURBON_RED' | translate }}</option>
      <option value="black">{{ 'FLOCK.BLACK' | translate }}</option>
      <option value="baladi">{{ 'FLOCK.BALADI' | translate }}</option>
    </ng-container>

    <!-- Duck -->
    <ng-container *ngIf="form.type === 'duck'">
      <option value="pekin">{{ 'FLOCK.PEKIN' | translate }}</option>
      <option value="muscovy">{{ 'FLOCK.MUSCOVY' | translate }}</option>
      <option value="mullard">{{ 'FLOCK.MULLARD' | translate }}</option>
      <option value="rouen">{{ 'FLOCK.ROUEN' | translate }}</option>
      <option value="aylesbury">{{ 'FLOCK.AYLESBURY' | translate }}</option>
      <option value="khaki_campbell">{{ 'FLOCK.KHAKI_CAMPBELL' | translate }}</option>
      <option value="indian_runner">{{ 'FLOCK.INDIAN_RUNNER' | translate }}</option>
      <option value="baladi">{{ 'FLOCK.BALADI' | translate }}</option>
      <option value="sudani">{{ 'FLOCK.SUDANI' | translate }}</option>
      <option value="damyati">{{ 'FLOCK.DAMYATI' | translate }}</option>
    </ng-container>

    <!-- Quail -->
    <ng-container *ngIf="form.type === 'quail'">
      <option value="japanese">{{ 'FLOCK.JAPANESE' | translate }}</option>
      <option value="texas_a_and_m">{{ 'FLOCK.TEXAS_A_AND_M' | translate }}</option>
      <option value="english_white">{{ 'FLOCK.ENGLISH_WHITE' | translate }}</option>
      <option value="english_black">{{ 'FLOCK.ENGLISH_BLACK' | translate }}</option>
      <option value="golden">{{ 'FLOCK.GOLDEN' | translate }}</option>
      <option value="italian">{{ 'FLOCK.ITALIAN' | translate }}</option>
    </ng-container>

  </select>
</div>

          <!-- 6. أسلوب التربية — فرشة/أقفاص/نطاق حر حسب النوع -->
      <div>
  <label class="form-label">أسلوب التربية</label>
  <select 
    class="form-select" 
    name="housingSystem" 
    [(ngModel)]="housingSystem">
    
    <option [ngValue]="''" disabled selected>اختر أسلوب التربية</option>
    <option *ngFor="let h of housingOptionsFor(form.type)" [value]="h.value">
      {{ h.label }}
    </option>
  </select>
</div>

        </ng-container>
      </div>

      <div class="flex gap-3 mt-4">
        <button class="btn-primary btn" (click)="submit()" [disabled]="!isValid()">
          ✓ {{ 'COMMON.SAVE' | translate }}
        </button>
        <button class="btn-ghost btn" (click)="showForm.set(false)">{{ 'COMMON.CANCEL' | translate }}</button>
      </div>
    </div>

    <!-- 📊 قائمة كروت القطعان -->
    <div class="grid sm:grid-cols-2 xl:grid-cols-2 gap-4" *ngIf="activeFlocks().length > 0">
      <a *ngFor="let f of activeFlocks()" [routerLink]="['/flocks', f.id]"
         class="block bg-white rounded-3xl border border-[var(--c-border)] overflow-hidden
                no-underline hover:-translate-y-1 hover:shadow-card-lg transition-all duration-200 animate-in">

        <!-- شريط اللون العلوي المخصص حسب النوع -->
        <div class="h-2" 
             [class.bg-primary-500]="f.type==='broiler'" 
             [class.bg-purple-500]="f.type==='layer'"
             [class.bg-blue-500]="f.type==='rabbit'"
             [class.bg-amber-500]="f.type==='turkey'"
             [class.bg-cyan-600]="f.type==='duck'"
             [class.bg-emerald-500]="f.type==='quail'">
            </div>

        <!-- خلفية الهيدر المخصصة -->
        <div class="px-5 pt-4 pb-3 flex items-start justify-between"
             [class.bg-primary-50]="f.type==='broiler'" 
             [class.bg-purple-50]="f.type==='layer'"
             [class.bg-blue-50]="f.type==='rabbit'"
             [class.bg-amber-50]="f.type==='turkey'"
             [class.bg-cyan-50]="f.type==='duck'"
             [class.bg-emerald-50]="f.type==='quail'">
          <div>
            <p class="text-xs font-bold uppercase tracking-wide mb-1"
               [class.text-primary-600]="f.type==='broiler'" 
               [class.text-purple-600]="f.type==='layer'"
               [class.text-blue-600]="f.type==='rabbit'"
               [class.text-amber-600]="f.type==='turkey'"
               [class.text-cyan-700]="f.type==='duck'">
          {{ (
  f.type === 'broiler' ? 'FLOCK.BROILER' :
  f.type === 'layer' ? 'FLOCK.LAYER' :
  f.type === 'rabbit' ? 'FLOCK.RABBIT' :
  f.type === 'turkey' ? 'FLOCK.TURKEY' :
  f.type === 'duck' ? 'FLOCK.DUCK' :
  f.type === 'quail' ? 'FLOCK.QUAIL' :
  ''
) | translate }}  
          </p>
            <h3 class="font-black text-base text-[var(--c-text)]">{{ f.name }}</h3>
          </div>
          <div class="text-3xl">
{{ f.type === 'broiler' ? '🐔'
 : f.type === 'layer' ? '🥚'
 : f.type === 'rabbit' ? '🐇'
 : f.type === 'turkey' ? '🦃'
 : f.type === 'duck' ? '🦆'
 : '🐦' }}
        </div>
        </div>

        <!-- شريط تقدم الدورة (دورة التسمين للبط حوالي 60-70 يوم تجارياً) -->
        <div class="px-5 py-2 border-b border-[var(--c-border)]">
          <div class="flex justify-between text-[10px] text-[var(--c-muted)] font-semibold mb-1">
            <span>{{ 'FLOCK.PROGRESS' | translate }}</span>
            <span>{{ 'FLOCK.DAY' | translate }} {{ f.ageInDays }}</span>
          </div>
          <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all duration-700"
                 [class.bg-primary-500]="f.type==='broiler'"
                 [class.bg-purple-500]="f.type==='layer'"
                 [class.bg-blue-500]="f.type==='rabbit'"
                 [class.bg-amber-500]="f.type==='turkey'"
                 [class.bg-cyan-600]="f.type==='duck'"
                 [class.bg-emerald-500]="f.type==='quail'"
                 [style.width]="Math.min(100, f.ageInDays / (f.type==='broiler' ? 42 : f.type==='rabbit' ? 60 : f.type==='duck' ? 65 :f.type==='quail'?42 :f.type==='turkey' ? 140 : 160) * 100) + '%'">
            </div>
          </div>
        </div>

        <div class="grid grid-cols-3 divide-x divide-[var(--c-border)]">
          <div class="px-4 py-3 text-center">
            <p class="text-base font-black text-primary-700">{{ f.currentCount | number }}</p>
            <p class="text-[10px] text-[var(--c-muted)] font-semibold">{{ 'FLOCK.BIRDS' | translate }}</p>
          </div>
          <div class="px-4 py-3 text-center">
            <p class="text-base font-black"
               [class.text-green-600]="f.mortalityRate<=2"
               [class.text-amber-600]="f.mortalityRate>2 && f.mortalityRate<=4"
               [class.text-red-600]="f.mortalityRate>4">
              {{ f.mortalityRate | number:'1.1-1' }}%
            </p>
            <p class="text-[10px] text-[var(--c-muted)] font-semibold">{{ 'FLOCK.MORTALITY' | translate }}</p>
          </div>
          <div class="px-4 py-3 text-center">
            <p class="text-xs font-bold text-[var(--c-text)]">{{ f.startDate }}</p>
            <p class="text-[10px] text-[var(--c-muted)] font-semibold">{{ 'FLOCK.START' | translate }}</p>
          </div>
        </div>

        <div class="px-5 py-3 flex items-center justify-between border-t border-[var(--c-border)]">
          <span class="badge" [class.badge-success]="f.status==='active'" [class.badge-neutral]="f.status==='closed'">
            {{ f.status === 'active' ? ('FLOCK.ACTIVE' | translate) : ('FLOCK.CLOSED' | translate) }}
          </span>
          <span class="text-xs font-semibold text-primary-600">{{ 'COMMON.VIEW_DETAILS' | translate }} →</span>
        </div>
      </a>
    </div>

    <div *ngIf="activeFlocks().length === 0" class="text-center py-16">
      <p class="text-6xl mb-4">🐣</p>
      <h3 class="text-xl font-bold text-[var(--c-text)] mb-2">{{ 'FLOCK.EMPTY_TITLE' | translate }}</h3>
      <p class="text-[var(--c-muted)] text-sm mb-6">{{ 'FLOCK.EMPTY_SUB' | translate }}</p>
      <button class="btn-primary btn btn-lg" (click)="showForm.set(true)">
        + {{ 'FLOCK.ADD' | translate }}
      </button>
    </div>

  </div>
  `,
})
export class FlocksListComponent implements OnInit {
  private svc = inject(FlockService);
  flocks = this.svc.flocks;
  // 🐔 القطعان النشطة بس هي اللي تتعرض في القايمة الرئيسية (مكان الإضافة)
  // القطعان المقفولة (closed) بتختفي من هنا تلقائيًا
  activeFlocks = () => this.flocks().filter(f => f.status === 'active');
  showForm = signal(false);
  Math = Math;

  // 🏠 أسلوب التربية — منفصل عمدًا عن form:FlockCreate عشان مانضطرش نعدّل
  // الـ interface بتاعها هنا (لسه محتاج يتضاف housingSystem؟: string فيها
  // وفي الباك إند FlockCreate schema عشان يتبعت ويتحفظ فعليًا)
  housingSystem = '';

  housingOptionsFor(type: string): { value: string; label: string }[] {
    const map: Record<string, { value: string; label: string }[]> = {
      broiler: [{ value: 'floor', label: 'فرشة (أرضي)' },{value:'cage',label:'بطاريات'}],
      layer: [{ value: 'floor', label: 'فرشة (أرضي)' }, { value: 'cage', label: 'بطاريات' }],
      turkey: [{ value: 'floor', label: 'فرشة (أرضي)' }],
      duck: [{ value: 'floor', label: 'فرشة (أرضي)' }, { value: 'free_range', label: 'نطاق حر (مع مياه)' }],
      quail: [{ value: 'cage', label: 'بطاريات' }, { value: 'floor', label: 'فرشة (أرضي)' }],
      rabbit: [{ value: 'cage', label: 'بطاريات' }],
    };
    return map[type] || [{ value: 'floor', label: 'فرشة (أرضي)' }];
  }

  form: FlockCreate = {
    name: '', 
    type: '' as unknown as FlockType, 
    initialCount: 500, 
    startDate: new Date().toISOString().split('T')[0],
    breed: ''  
  };

  ngOnInit() { 
    this.svc.getFlocks().subscribe(); 
  }

  onTypeChange() {
    this.form.breed = '';
    // 🏠 لو النوع عنده خيار تربية واحد بس (زي الأرانب = أقفاص دايمًا)، نختاره
    // تلقائي عشان مانضايقش المستخدم بقايمة فيها اختيار واحد بس
    const opts = this.housingOptionsFor(this.form.type as unknown as string);
    this.housingSystem = opts.length === 1 ? opts[0].value : '';
  }

  toggleForm() {
    this.showForm.set(!this.showForm());
    if (!this.showForm()) {
      this.resetForm();
    }
  }

  resetForm() {
    this.form = { 
      name: '', 
      type: '' as unknown as FlockType, 
      initialCount: 500, 
      startDate: new Date().toISOString().split('T')[0],
      breed: ''
    };
    this.housingSystem = '';
  }

  isValid(): boolean {
    return !!this.form.name && 
           !!this.form.type &&
           this.form.initialCount > 0 && 
           !!this.form.startDate && 
           !!this.form.breed &&
           !!this.housingSystem;
  }

  submit() {
    if (!this.isValid()) return;

    // ⚠️ housingSystem بيتبعت هنا لو الـ FlockCreate interface وendpoint الباك
    // إند اتحدّثوا يقبلوه — لو لسه معملتش الجزئين دول، القيمة دي هتتبعت
    // لكن الباك إند هيتجاهلها (مش هتتحفظ) لحد ما تحدّث flocks_1_.py/schemas.py
    const payload: any = { ...this.form, housingSystem: this.housingSystem };

    this.svc.createFlock(payload).subscribe({
      next: () => {
        this.resetForm();
        this.showForm.set(false);
        this.svc.getFlocks().subscribe(); 
      },
      error: (err) => console.error('خطأ أثناء الحفظ:', err)
    });
  }
}