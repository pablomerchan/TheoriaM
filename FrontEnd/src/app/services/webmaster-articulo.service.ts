import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WebmasterArticuloService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/webmaster';

  list(idUsuario?: any, tipoAsesoria?: string, visibleOnly: boolean = true): Observable<any[]> {
    let params = new HttpParams();
    if (idUsuario !== undefined && idUsuario !== null) params = params.set('id_usuario', idUsuario.toString());
    if (tipoAsesoria) params = params.set('tipo_asesoria', tipoAsesoria);
    params = params.set('visible_only', visibleOnly ? '1' : '0');
    return this.http.get<any[]>(`${this.apiUrl}/articulos`, { params });
  }

  get(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/articulo/${id}`);
  }

  getMenuByArticulo(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/articulo/${id}/menu`);
  }

  create(payload: any, menu_servicio_id: number = 28, menu_titulo?: string, menu_principal?: string, menu_observacion?: string): Observable<any> {
    let params = new HttpParams().set('menu_servicio_id', menu_servicio_id.toString());
    if (menu_titulo) params = params.set('menu_titulo', menu_titulo);
    if (menu_principal) params = params.set('menu_principal', menu_principal);
    if (menu_observacion) params = params.set('menu_observacion', menu_observacion);
    return this.http.post<any>(`${this.apiUrl}/articulo`, payload, { params });
  }

  update(id: number, updates: any, menu_updates?: any): Observable<any> {
    const body: any = { updates };
    if (menu_updates) body.menu_updates = menu_updates;
    return this.http.put<any>(`${this.apiUrl}/articulo/${id}`, body);
  }

  delete(id: number, soft: boolean = true): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/articulo/${id}?soft=${soft}`);
  }
}
