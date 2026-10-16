import { Routes } from '@angular/router';
import { ServiceLandingPageComponent } from './components/service_landing_page/service_landing_page.component';
import { WebmasterDashboardComponent } from './components/webmaster-dashboard/webmaster-dashboard.component';
import { WebmasterArticuloComponent } from './components/webmaster-articulo/webmaster-articulo.component';
import { WebmasterArticuloAddComponent } from './components/webmaster-articulo/webmaster-articulo-add.component';
import { CentroInformacionComponent } from './components/centro_informacion/centro_informacion.component';
import { CentroContactoComponent } from './components/centro_contacto/centro_contacto.component';
import { NuevoUsuarioComponent } from './components/nuevo-usuario/nuevo-usuario.component';
import { IniciarSesionComponent } from './components/iniciar-sesion/iniciar-sesion.component';
import { CaracteristicasFisicasComponent } from './components/caracteristicas_fisicas/caracteristicas_fisicas.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: ServiceLandingPageComponent }, //Raiz
  { path: 'ci', component: CentroInformacionComponent }, // Centro informacion
  { path: 'cc', component: CentroContactoComponent }, // Centro de contacto
  { path: 'nu', component: NuevoUsuarioComponent }, // Nuevo usuario
  { path: 'is', component: IniciarSesionComponent }, // Iniciar sesion
  { path: 'cf', component: CaracteristicasFisicasComponent, canActivate: [authGuard] }, // Caracteristicas fisicas
  {
    path: 'feed',
    loadComponent: () =>
      import('./features/feed/feed-shell.component').then((module) => module.FeedShellComponent),
    canActivate: [authGuard],
    children: [{
      path: '',
      loadComponent: () =>
        import('./features/feed/feed-container.component').then((module) => module.FeedContainerComponent)
    }]
  },
  { path: 'webmaster', component: WebmasterDashboardComponent },
  { path: 'webmaster/articulos', component: WebmasterArticuloComponent },
  { path: 'webmaster/articulos/nuevo', component: WebmasterArticuloAddComponent },
  { path: '**', redirectTo: '' }
];
