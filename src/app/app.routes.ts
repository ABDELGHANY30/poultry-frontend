// // import { Routes } from '@angular/router';
// // import { authGuard } from './core/guards/auth.guard';
// // import { adminGuard } from './core/guards/admin.guard';
// // import { LayoutComponent } from './layout/layout.component';

// // export const routes: Routes = [
// //   {
// //     path: '',
// //     component: LayoutComponent,
// //     // canActivateChild: [authGuard],
// //     children: [
// //       { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
// //       {
// //         path: 'dashboard',
// //         loadComponent: () =>
// //           import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
// //       },
// //       {
// //         path: 'ai-assistant',
// //         loadComponent: () =>
// //           import('./features/ai-assistant/ai-assistant.component').then(m => m.AiAssistantComponent),
// //       },
// //       {
// //         path: 'flocks',
// //         loadChildren: () =>
// //           import('./features/flocks/flocks.routes').then(m => m.flocksRoutes),
// //       },
// //       {
// //         path: 'alerts',
// //         loadComponent: () =>
// //           import('./features/alerts/alerts.component').then(m => m.AlertsComponent),
// //       },
// //       {
// //         path: 'library',
// //         loadChildren: () =>
// //           import('./features/library/library.routes').then(m => m.libraryRoutes),
// //       },
// //       // {
// //       //   path: 'admin',
// //       //   canActivate: [adminGuard],
// //       //   loadChildren: () =>
// //       //     import('./features/admin/admin.routes').then(m => m.adminRoutes),
// //       // },
// //     ]
// //   },
// //   // {
// //   //   path: 'auth',
// //   //   loadChildren: () =>
// //   //     import('./features/auth/auth.routes').then(m => m.authRoutes),
// //   // },
// //   // { path: '**', redirectTo: './features/auth/login.component.ts' },
// // ];
// // import { Routes } from '@angular/router';
// // import { authGuard } from './core/guards/auth.guard';
// // import { LayoutComponent } from './layout/layout.component';
// // import { subscribeOn } from 'rxjs';
// // import { AiAssistantComponent } from './features/ai-assistant/ai-assistant.component';
// // import { SubscriptionComponent } from './features/sub/subscription.component';
// // import { ReportsComponent } from './features/reports/reports.component.';
// // import { MarketplaceComponent } from './features/marketplace/marketplace.component';
// // import { AddListingComponent } from './features/marketplace/add-listing.component';
// // import { CalculatorComponent } from './features/calculator/calculator.component';
// // import { PricesComponent } from './features/prices/prices.component';
// // import { LearningComponent } from './features/learning/learning.component';
// // import { MarketHubComponent } from './features/marckethub/markethub';
// // import { DecisionSimulatorComponent } from './features/desicion/desicion.component';
// // import { ProfitIndicatorWidgetComponent } from './features/profit indicator widget/profit indicator widget.component';

// // export const routes: Routes = [
// //   // ── Auth (بدون layout) ──────────────────────────────
// //   {
// //     path: 'auth',
// //     loadChildren: () =>
// //       import('./features/auth/auth.routes').then(m => m.authRoutes),
// //   },

// //   // ── App (مع layout) ─────────────────────────────────
// //   {
// //     path: '',
// //     component: LayoutComponent,
// //     canActivateChild: [authGuard],
// //   children: [
// //       { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
// //       {
// //         path: 'dashboard',
// //         loadComponent: () =>
// //           import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
// //       },
// //       {
// //         path: 'learning',
// //         loadComponent: () =>
// //           import('./features/learning/learning.component').then(m => m.LearningComponent),
// //       },
// //       // الفاصلة الزيادة اتحذفت من هنا
// //       { path: 'subscription', component: SubscriptionComponent },
// //       { path: 'decisionS', component: DecisionSimulatorComponent },
// //       { path: 'profit', component: ProfitIndicatorWidgetComponent },
// //       { path: 'reports', component: ReportsComponent },
      

// // // ...

// // { path: 'market-hub', component: MarketHubComponent },
// // { path: 'marketplace', redirectTo: 'market-hub', pathMatch: 'full' },
// // { path: 'marketplace/add', component: AddListingComponent },
// // { path: 'calculator', component: CalculatorComponent },
// // { path: 'prices', redirectTo: 'market-hub', pathMatch: 'full' },
// //       {
// //         path: 'ai-assistant',
// //         loadComponent: () =>
// //           import('./features/ai-assistant/ai-assistant.component').then(m => m.AiAssistantComponent),
// //       },
// //       {
// //         path: 'flocks',
// //         loadChildren: () =>
// //           import('./features/flocks/flocks.routes').then(m => m.flocksRoutes),
// //       },
// //       {
// //         path: 'alerts',
// //         loadComponent: () =>
// //           import('./features/alerts/alerts.component').then(m => m.AlertsComponent),
// //       },
// //     ]},

// //   // ── Fallback ─────────────────────────────────────────
// //   { path: '**', redirectTo: 'auth/login' },
// // ];
// import { Routes } from '@angular/router';
// import { authGuard } from './core/guards/auth.guard';
// import { adminGuard } from './core/guards/admin.guard'; // 👈 استيراد guard الأدمن
// import { LayoutComponent } from './layout/layout.component';

// import { SubscriptionComponent } from './features/sub/subscription.component';
// import { ReportsComponent } from './features/reports/reports.component.';
// import { AddListingComponent } from './features/marketplace/add-listing.component';
// import { CalculatorComponent } from './features/calculator/calculator.component';
// import { MarketHubComponent } from './features/marckethub/markethub';
// import { DecisionSimulatorComponent } from './features/desicion/desicion.component';
// import { ProfitIndicatorWidgetComponent } from './features/profit indicator widget/profit indicator widget.component';

// export const routes: Routes = [
//   // ── Auth (بدون layout) ──────────────────────────────
//   {
//     path: 'auth',
//     loadChildren: () =>
//       import('./features/auth/auth.routes').then(m => m.authRoutes),
//   },

//   // ── App (مع layout) ─────────────────────────────────
//   {
//     path: '',
//     component: LayoutComponent,
//     canActivateChild: [authGuard],
//     children: [
//       { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
//       {
//         path: 'dashboard',
//         loadComponent: () =>
//           import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
//       },
//       {
//         path: 'learning',
//         loadComponent: () =>
//           import('./features/learning/learning.component').then(m => m.LearningComponent),
//       },
//       { path: 'subscription', component: SubscriptionComponent },
//       { path: 'decisionS', component: DecisionSimulatorComponent },
//       { path: 'profit', component: ProfitIndicatorWidgetComponent },
//       { path: 'reports', component: ReportsComponent },
      
//       { path: 'market-hub', component: MarketHubComponent },
//       { path: 'marketplace', redirectTo: 'market-hub', pathMatch: 'full' },
//       { path: 'marketplace/add', component: AddListingComponent },
//       { path: 'calculator', component: CalculatorComponent },
//       { path: 'prices', redirectTo: 'market-hub', pathMatch: 'full' },
//       {
//         path: 'ai-assistant',
//         loadComponent: () =>
//           import('./features/ai-assistant/ai-assistant.component').then(m => m.AiAssistantComponent),
//       },
//       {
//         path: 'flocks',
//         loadChildren: () =>
//           import('./features/flocks/flocks.routes').then(m => m.flocksRoutes),
//       },
//       {
//         path: 'alerts',
//         loadComponent: () =>
//           import('./features/alerts/alerts.component').then(m => m.AlertsComponent),
//       },

//       // ── Admin Panel (محمي بـ adminGuard) ─────────────────
//       {
//         path: 'admin',
//         canActivate: [adminGuard],
//         loadComponent: () =>
//           import('./features/admin/admin-panel.component').then(m => m.AdminPanelComponent), // 👈 اضبط المسار المباشر لملف AdminPanelComponent عندك
//       },
//     ]
//   },

//   // ── Fallback ─────────────────────────────────────────
//   { path: '**', redirectTo: 'auth/login' },
// ];
// import { Routes } from '@angular/router';
// import { authGuard } from './core/guards/auth.guard';
// import { adminGuard } from './core/guards/admin.guard'; // 👈 استيراد حارس الأدمن

// import { LayoutComponent } from './layout/layout.component';
// import { SubscriptionComponent } from './features/sub/subscription.component';
// import { ReportsComponent } from './features/reports/reports.component.';
// import { AddListingComponent } from './features/marketplace/add-listing.component';
// import { CalculatorComponent } from './features/calculator/calculator.component';
// import { MarketHubComponent } from './features/marckethub/markethub';
// import { DecisionSimulatorComponent } from './features/desicion/desicion.component';
// import { ProfitIndicatorWidgetComponent } from './features/profit indicator widget/profit indicator widget.component';

// export const routes: Routes = [
//   // ── Auth (بدون layout) ──────────────────────────────
//   {
//     path: 'auth',
//     loadChildren: () =>
//       import('./features/auth/auth.routes').then(m => m.authRoutes),
//   },

//   // ── App (مع layout) ─────────────────────────────────
//   {
//     path: '',
//     component: LayoutComponent,
//     children: [
//       { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
//       {
//         path: 'dashboard',
//         loadComponent: () =>
//           import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
//       },
//       {
//         path: 'learning',
//         loadComponent: () =>
//           import('./features/learning/learning.component').then(m => m.LearningComponent),
//       },
//       { path: 'subscription', component: SubscriptionComponent },
//       { path: 'decisionS', component: DecisionSimulatorComponent },
//       { path: 'profit', component: ProfitIndicatorWidgetComponent },
//       { path: 'reports', component: ReportsComponent },

//       { path: 'market-hub', component: MarketHubComponent },
//       { path: 'marketplace', redirectTo: 'market-hub', pathMatch: 'full' },
//       { path: 'marketplace/add', component: AddListingComponent },
//       { path: 'calculator', component: CalculatorComponent },
//       { path: 'prices', redirectTo: 'market-hub', pathMatch: 'full' },
//       {
//         path: 'ai-assistant',
//         // من غير authGuard عمداً — الزائر يقدر يدخل ويسأل 3 أسئلة مجاناً قبل ما نطلب منه يسجل
//         loadComponent: () =>
//           import('./features/ai-assistant/ai-assistant.component').then(m => m.AiAssistantComponent),
//       },
//       {
//         path: 'flocks',
//         // ⚠️ الوحيدة اللي محمية — أي محاولة وصول من غير تسجيل دخول بتتحول لصفحة اللوجين
//         canActivate: [authGuard],
//         loadChildren: () =>
//           import('./features/flocks/flocks.routes').then(m => m.flocksRoutes),
//       },
//       {
//         path: 'alerts',
//         loadComponent: () =>
//           import('./features/alerts/alerts.component').then(m => m.AlertsComponent),
//       },

//       // ── 👑 Admin Panel (تمت إضافتها وحمايتها بـ adminGuard) ─────────────────
//       {
//         path: 'admin',
//         canActivate: [adminGuard],
//         loadComponent: () =>
//           import('./features/admin/admin-panel.component').then(m => m.AdminPanelComponent),
//       },
//     ]
//   },

//   // ── Fallback ─────────────────────────────────────────
//   { path: '**', redirectTo: 'auth/login' },
// ];
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard'; // 👈 استيراد حارس الأدمن
import { proGuard } from './core/guards/pro.guard'; // 👈 استيراد حارس الاشتراك Pro
import { dailyRecordGuard } from './core/guards/daily-record.guard'; // 👈 حارس التذكير بتسجيل بيانات اليوم

import { LayoutComponent } from './layout/layout.component';
import { SubscriptionComponent } from './features/sub/subscription.component';
import { ReportsComponent } from './features/reports/reports.component.';
import { AddListingComponent } from './features/marketplace/add-listing.component';
import { CalculatorComponent } from './features/calculator/calculator.component';
import { MarketHubComponent } from './features/marckethub/markethub';
import { DecisionSimulatorComponent } from './features/desicion/desicion.component';
import { ProfitIndicatorWidgetComponent } from './features/profit indicator widget/profit indicator widget.component';
import { AiAssistantComponent } from './features/ai-assistant/ai-assistant.component';
import { MyOrdersComponent } from './features/marketplace/MyOrdersComponent';
import { SellerDashboardComponent } from './features/marketplace/seller-dashboard.component';

export const routes: Routes = [
  // ── Auth (بدون layout) ──────────────────────────────
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then(m => m.authRoutes),
  },

  // 🔗 لينك قبول دعوة الانضمام لمزرعة — بره الـ layout المحمي عمدًا، لأن
  // المستخدم ممكن يفتحه قبل ما يعمل login أصلاً (الكومبوننت بيتصرف بنفسه
  // لو مفيش توكن)
  {
    path: 'join-farm/:id',
    loadComponent: () =>
      import('./features/team/join-farm.component').then(m => m.JoinFarmComponent),
  },

  // ── App (مع layout) ─────────────────────────────────
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        canActivate: [dailyRecordGuard],
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        // 👷 صفحة دعوة الأعضاء (عمال/بيطريين) + قطعان المشاركة معاك
        path: 'team',
        loadComponent: () =>
          import('./features/team/team.component').then(m => m.TeamComponent),
      },
      {
        path: 'learning',
        loadComponent: () =>
          import('./features/learning/learning.component').then(m => m.LearningComponent),
      },{
  path: 'verify-identity',
  loadComponent: () =>
    import('./features/verify-identity/verify-identity.component').then(m => m.VerifyIdentityComponent),
},
      { path: 'subscription', component: SubscriptionComponent },

      // ⚠️ محمية بـ proGuard — مشتركي Pro فقط، وإلا يتحول لـ /subscription
      { path: 'decisionS', component: DecisionSimulatorComponent, canActivate: [proGuard] },
      { path: 'profit', component: ProfitIndicatorWidgetComponent, canActivate: [proGuard] },
      { path: 'reports', component: ReportsComponent, canActivate: [proGuard] },

      { path: 'market-hub', component: MarketHubComponent },
      { path: 'marketplace', redirectTo: 'market-hub', pathMatch: 'full' },
      { path: 'marketplace/add', component: AddListingComponent },
      { path: 'marketplace/my-orders', component:MyOrdersComponent  },
      { path: 'marketplace/seller-dashboard', component: SellerDashboardComponent },
      { path: 'calculator', component: CalculatorComponent },
      { path: 'prices', redirectTo: 'market-hub', pathMatch: 'full' },
     
      // {
      //   path: 'ai-assistant',
      //   // من غير authGuard عمداً — الزائر يقدر يدخل ويسأل 3 أسئلة مجاناً قبل ما نطلب منه يسجل
      //   loadComponent: () =>
      //     import('./features/ai-assistant/ai-assistant.component').then(m => m.AiAssistantComponent),
      // },
      // 1. ضيف الـ Import فوق خالص في ملف app.routes.ts

// 2. غير الراوت لشكل العادي:
{
  path: 'ai-assistant',
  component: AiAssistantComponent,
},
      {
        path: 'flocks',
        // ⚠️ الوحيدة اللي محمية — أي محاولة وصول من غير تسجيل دخول بتتحول لصفحة اللوجين
        canActivate: [authGuard],
        loadChildren: () =>
          import('./features/flocks/flocks.routes').then(m => m.flocksRoutes),
      },
      {
        path: 'alerts',
        loadComponent: () =>
          import('./features/alerts/alerts.component').then(m => m.AlertsComponent),
      },
  {
        path: 'steak',
        loadComponent: () =>
          import('./features/streak-badge/streak-badge.component').then(m => m.StreakMiniComponent),
      },  {
        path: 'referral',
        loadComponent: () =>
          import('./features/referral_card.component.ts/referral-card.component').then(m => m.ReferralCardComponent),
      },
      // ── 👑 Admin Panel (تمت إضافتها وحمايتها بـ adminGuard) ─────────────────
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin/admin-panel.component').then(m => m.AdminPanelComponent),
      },
    ]
  },

  // ── Fallback ─────────────────────────────────────────
  { path: '**', redirectTo: 'auth/login' },
];