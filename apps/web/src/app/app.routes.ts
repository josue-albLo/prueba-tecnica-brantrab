import { Routes } from '@angular/router';
import { PanelOfertas } from './ofertas/components/panel-ofertas/panel-ofertas';

export const routes: Routes = [
  {
    path: 'ofertas',
    component: PanelOfertas,
  },
  { path: '**', redirectTo: 'ofertas' },
];
