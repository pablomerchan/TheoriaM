import { Routes } from '@angular/router';
import { LandingPageComponent } from './pages/landing-page/landing-page.component';
import { DatosMorfologicosComponent } from './pages/datos-morfologicos/datos-morfologicos.component';
import { AsesoriaComponent } from './pages/asesoria/asesoria';
import { WebmasterDashboardComponent } from './components/webmaster-dashboard/webmaster-dashboard.component';
import { WebmasterArticuloComponent } from './components/webmaster-articulo/webmaster-articulo.component';
import { WebmasterArticuloAddComponent } from './components/webmaster-articulo/webmaster-articulo-add.component';

export const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'datos-morfologicos', component: DatosMorfologicosComponent },
  { path: 'asesoria', component: AsesoriaComponent },
  { path: 'webmaster', component: WebmasterDashboardComponent },
  { path: 'webmaster/articulos', component: WebmasterArticuloComponent },
  { path: 'webmaster/articulos/nuevo', component: WebmasterArticuloAddComponent },
  { path: '**', redirectTo: '' }
];
