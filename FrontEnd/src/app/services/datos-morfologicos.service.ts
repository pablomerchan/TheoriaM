import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DatosMorfologicos } from '../models/datos-morfologicos.model';

@Injectable({ providedIn: 'root' })
export class DatosMorfologicosService {
  private baseUrl = 'http://localhost:3000/api/datos-morfologicos';

  constructor(private http: HttpClient) {}

  /** Guarda los datos morfológicos del usuario */
  saveDatos(datos: DatosMorfologicos): Observable<{ id: number; mensaje: string }> {
    return this.http.post<{ id: number; mensaje: string }>(this.baseUrl, datos);
  }

  /** Obtiene el último registro de un usuario */
  getDatos(usuarioId: string): Observable<DatosMorfologicos> {
    return this.http.get<DatosMorfologicos>(`${this.baseUrl}/${usuarioId}`);
  }
}
