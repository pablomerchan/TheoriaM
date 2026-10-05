import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { CaracteristicasFisicas, TextoCaracteristicasFisicas } from '../pages/caracteristicas-fisicas/caracteristicas-fisicas.model';

@Injectable({ providedIn: 'root' })
export class CaracteristicasFisicasService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api/caracteristicas-fisicas';

  // TODO: establecer la ruta REST de guardado cuando sea proporcionada.
  private readonly saveEndpoint = '';

  getTextosDescriptivos(): Observable<TextoCaracteristicasFisicas[]> {
    return this.http.get<TextoCaracteristicasFisicas[]>(`${this.baseUrl}/textos-descriptivos`);
  }

  getTextosAyuda(): Observable<TextoCaracteristicasFisicas[]> {
    return this.http.get<TextoCaracteristicasFisicas[]>(`${this.baseUrl}/textos-ayuda`);
  }

  saveProfile(datos: CaracteristicasFisicas): Observable<unknown> {
    if (!this.saveEndpoint) {
      return throwError(() => new Error(
        'La ruta REST para guardar el perfil aún no está configurada.'
      ));
    }

    return this.http.post<unknown>(this.saveEndpoint, datos);
  }
}
