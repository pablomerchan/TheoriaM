import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Asesoria } from '../models/asesoria-carousel.model';

/**
 * Servicio para obtener items del carrusel de asesorías desde la tabla 'tbl_asesoria'.
 * Soporta filtros por:
 *   - id_usuario: Solo items del usuario especificado
 *   - asesoria_id: Solo items asociados a la asesoría/menú especificado
 *   - tipo_asesoria: Solo items del tipo especificado (categoría)
 */
@Injectable({
  providedIn: 'root'
})
export class AsesoriaCarouselService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/asesorias';

  /**
   * Obtiene items del carrusel de asesorías con filtros opcionales.
   *
   * Filtros soportados:
   *   - usuarioId: ID del usuario (filtro por id_usuario en la BD)
   *   - asesoriaId: ID de la asesoría/menú asociado (asesoria_id en la BD)
   *   - tipoAsesoria: Tipo/categoría de asesoría (tipo_asesoria en la BD)
   *
   * El backend filtra automáticamente por visible=1 y aplica los filtros especificados.
   *
   * @param usuarioId - Opcional. ID del usuario propietario de los items
   * @param asesoriaId - Opcional. ID de la asesoría/menú asociado
   * @param tipoAsesoria - Opcional. Tipo/categoría de asesoría
   * @returns Observable con array de items del carrusel
   */
  getAsesorias(
    usuarioId?: any,
    asesoriaId?: number | null,
    tipoAsesoria?: string | null
  ): Observable<Asesoria[]> {
    let params = new HttpParams();

    // Filtro por usuario (id_usuario)
    if (usuarioId !== undefined && usuarioId !== null) {
      params = params.set('id_usuario', usuarioId.toString());
      console.debug(`[AsesoriaCarousel] Aplicando filtro id_usuario: ${usuarioId}`);
    }

    // Filtro por asesoría/menú (asesoria_id)
    if (asesoriaId !== undefined && asesoriaId !== null) {
      params = params.set('asesoria_id', asesoriaId.toString());
      console.debug(`[AsesoriaCarousel] Aplicando filtro asesoria_id: ${asesoriaId}`);
    }

    // Filtro por tipo de asesoría (tipo_asesoria)
    if (tipoAsesoria !== undefined && tipoAsesoria !== null) {
      params = params.set('tipo_asesoria', tipoAsesoria);
      console.debug(`[AsesoriaCarousel] Aplicando filtro tipo_asesoria: ${tipoAsesoria}`);
    }

    // Log de parámetros finales
    if (params.keys().length === 0) {
      console.debug(`[AsesoriaCarousel] Cargando items sin filtros específicos`);
    }

    return this.http.get<Asesoria[]>(this.apiUrl, { params });
  }
}
