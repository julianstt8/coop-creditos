import type { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    title: 'Dashboard · OPA Créditos',
    loadComponent: () => import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'creditos',
    title: 'Créditos · OPA Créditos',
    loadComponent: () =>
      import('./features/creditos/list/credito-list.page').then((m) => m.CreditoListPage),
  },
  {
    path: 'creditos/nuevo',
    title: 'Nuevo crédito · OPA Créditos',
    loadComponent: () =>
      import('./features/creditos/create/credito-create.page').then((m) => m.CreditoCreatePage),
  },
  {
    path: 'creditos/:id',
    title: 'Detalle del crédito · OPA Créditos',
    loadComponent: () =>
      import('./features/creditos/detail/credito-detail.page').then((m) => m.CreditoDetailPage),
  },
  { path: '**', redirectTo: 'dashboard' },
];
