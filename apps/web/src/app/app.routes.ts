import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'ofertas',
    title: 'Panel de evaluación',
    loadComponent: () =>
      import('./ofertas/components/panel-ofertas/panel-ofertas').then((c) => c.PanelOfertas),
  },
  {
    path: 'metricas',
    title: 'Métricas',
    loadComponent: () =>
      import('./ofertas/components/metricas/metricas').then((c) => c.Metricas),
  },
  { path: '**', redirectTo: 'ofertas' },
];
