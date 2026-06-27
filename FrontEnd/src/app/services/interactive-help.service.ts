import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AyudaItem } from '../models/ayuda-item.model';

@Injectable({ providedIn: 'root' })
export class InteractiveHelpService {
  private baseUrl = 'http://localhost:3000/api/ayuda/datos-personales';

  constructor(private http: HttpClient) {}

  /** Obtiene todos los ítems de ayuda */
  getAllHelp(): Observable<AyudaItem[]> {
    return this.http.get<AyudaItem[]>(this.baseUrl);
  }

  /** Obtiene el ítem de ayuda para un campo específico */
  getHelpByCampo(campo: string): Observable<AyudaItem> {
    return this.http.get<AyudaItem>(`${this.baseUrl}/${campo}`);
  }
}
