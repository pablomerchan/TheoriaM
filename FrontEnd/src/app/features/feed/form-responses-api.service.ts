import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClientService } from '../../core/api-client.service';
import { ValorFormulario } from './data/forms-mock-contract';

export interface RespuestaFormulario {
  id: number;
  articulo_id: number;
  form_id: string;
  datos: Record<string, unknown>;
  client_request_id: string;
  creado_en: string;
  actualizado_en: string;
}

export interface SolicitudRespuestaFormulario {
  articulo_id: number;
  client_request_id: string;
  datos: Record<string, ValorFormulario>;
}

@Injectable({
  providedIn: 'root',
})
export class FormResponsesApiService {
  private readonly api = inject(ApiClientService);

  obtener(formId: string, articuloId: number): Observable<RespuestaFormulario | null> {
    const params = new HttpParams().set('articulo_id', articuloId);
    return this.api.get<RespuestaFormulario | null>(
      `v1/formularios/${encodeURIComponent(formId)}/respuesta`,
      params,
    );
  }

  guardar(
    formId: string,
    solicitud: SolicitudRespuestaFormulario,
  ): Observable<RespuestaFormulario> {
    return this.api.put<RespuestaFormulario>(
      `v1/formularios/${encodeURIComponent(formId)}/respuestas`,
      solicitud,
    );
  }
}
