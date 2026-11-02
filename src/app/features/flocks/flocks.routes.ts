import { Routes } from '@angular/router';

export const flocksRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./flocks-list.component').then(m => m.FlocksListComponent),
  },
  // 🧹 لازم قبل ':id' عشان "prepare" ماتتفسرش على إنها id قطيع
  {
    path: 'prepare',
    loadComponent: () => import('./prepare.component').then(m => m.PrepareComponent),
  },
  // 📊 التقرير السنوي (قبل ':id' برضه)
  {
    path: 'annual',
    loadComponent: () => import('./annual-report.component').then(m => m.AnnualReportComponent),
  },
  {
    path: ':id',
    loadComponent: () => import('./flock-detail.component').then(m => m.FlockDetailComponent),
  },
];
