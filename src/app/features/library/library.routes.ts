// library.routes.ts
import { Routes } from '@angular/router';

export const libraryRoutes: Routes = [
  { path: '', loadComponent: () => import('./library-list.component').then(m => m.LibraryListComponent) },
  { path: ':id', loadComponent: () => import('./article-detail.component').then(m => m.ArticleDetailComponent) },
];
