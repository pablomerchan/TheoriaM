import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MenuServicioItem, AsesoriaArticulo, CarruselDefinicion } from '../models/asesoria.model';

@Injectable({
  providedIn: 'root'
})
export class AsesoriaService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/asesoria';

  /**
   * Devuelve los menús de servicios de asesoría.
   * Si se pasa idUsuario, el backend filtra por ese usuario.
   */
  getMenus(idUsuario?: any): Observable<MenuServicioItem[]> {
    let params = new HttpParams();
    if (idUsuario !== undefined && idUsuario !== null) {
      params = params.set('id_usuario', idUsuario.toString());
    }
    return this.http.get<MenuServicioItem[]>(`${this.apiUrl}/menus`, { params });
  }

  /**
   * Devuelve los artículos de un menú, filtrados por usuario.
   * El backend filtra por id_usuario (incluyendo registros sin usuario asignado).
   */
  getArticulos(menuId: number, idUsuario?: any): Observable<AsesoriaArticulo[]> {
    let params = new HttpParams();
    if (idUsuario !== undefined && idUsuario !== null) {
      params = params.set('id_usuario', idUsuario.toString());
    }
    return this.http.get<AsesoriaArticulo[]>(`${this.apiUrl}/menus/${menuId}/articulos`, { params });
  }

  /**
   * Devuelve las definiciones de componentes dinámicos para un usuario y menú.
   * Cada definición tiene tipo_asesoria que filtra el contenido del componente.
   */
  getCarruseles(idUsuario: any, menuServicioId?: number): Observable<CarruselDefinicion[]> {
    let params = new HttpParams().set('id_usuario', idUsuario.toString());
    if (menuServicioId !== undefined && menuServicioId !== null) {
      params = params.set('menu_servicio_id', menuServicioId.toString());
    }
    return this.http.get<CarruselDefinicion[]>(`${this.apiUrl}/carruseles`, { params });
  }
}
