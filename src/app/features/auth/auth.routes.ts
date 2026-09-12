// auth.routes.ts
import { Routes } from '@angular/router';
export const authRoutes: Routes = [
  { path: 'login',    loadComponent: () => import('./login.component').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./register.component').then(m => m.RegisterComponent) },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
