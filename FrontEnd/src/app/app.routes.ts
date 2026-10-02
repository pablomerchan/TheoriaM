import { Routes } from '@angular/router';
import { ServiceLandingPageComponent } from './components/service_landing_page/service_landing_page.component';
import { DatosMorfologicosComponent } from './pages/datos-morfologicos/datos-morfologicos.component';
import { AsesoriaComponent } from './pages/asesoria/asesoria';
import { WebmasterDashboardComponent } from './components/webmaster-dashboard/webmaster-dashboard.component';
import { WebmasterArticuloComponent } from './components/webmaster-articulo/webmaster-articulo.component';
import { WebmasterArticuloAddComponent } from './components/webmaster-articulo/webmaster-articulo-add.component';
import { CentroInformacionComponent } from './components/centro_informacion/centro_informacion.component';
import { CentroContactoComponent } from './components/centro_contacto/centro_contacto.component';
import { NuevoUsuarioComponent } from './components/nuevo-usuario/nuevo-usuario.component';
import { IniciarSesionComponent } from './components/iniciar-sesion/iniciar-sesion.component';

export const routes: Routes = [
  { path: '', component: ServiceLandingPageComponent },
  { path: 'datos-morfologicos', component: DatosMorfologicosComponent },
  { path: 'asesoria', component: AsesoriaComponent },
  { path: 'ctrinfo', component: CentroInformacionComponent },
  { path: 'centro-contacto', component: CentroContactoComponent },
  { path: 'nuevo-usuario', component: NuevoUsuarioComponent },
  { path: 'iniciar-sesion', component: IniciarSesionComponent },
  { path: 'webmaster', component: WebmasterDashboardComponent },
  { path: 'webmaster/articulos', component: WebmasterArticuloComponent },
  { path: 'webmaster/articulos/nuevo', component: WebmasterArticuloAddComponent },
  { path: '**', redirectTo: '' }
];
