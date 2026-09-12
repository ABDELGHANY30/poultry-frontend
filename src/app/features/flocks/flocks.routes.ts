import { Routes } from '@angular/router';

export const flocksRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./flocks-list.component').then(m => m.FlocksListComponent),
  },
  {
    path: ':id',
    loadComponent: () => import('./flock-detail.component').then(m => m.FlockDetailComponent),
  },
];
