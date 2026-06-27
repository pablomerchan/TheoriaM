import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PersonaPerfil {
  id: string;
  nombre: string;
  email: string;
  genero?: string;
  edad?: number;
  tipo_cuerpo?: string;
  gustos_json?: string;
}

/**
 * Servicio seguro para obtener datos del perfil del usuario (desde tbl_persona en asesoria.db).
 * Preparado para integrarse con un mecanismo de autenticación futuro (JWT/OAuth2).
 */
@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/persona/mi-perfil';

  /**
   * Obtiene el perfil de la persona activa de forma segura
   * y contextual, basándose en la sesión/cookies del cliente.
   */
  getMiPerfil(): Observable<PersonaPerfil> {
    return this.http.get<PersonaPerfil>(this.apiUrl);
  }
}
