import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { FormResponsesApiService } from './form-responses-api.service';

describe('FormResponsesApiService', () => {
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTestingController.verify());

  it('consulta la respuesta para el formulario y el artículo', () => {
    TestBed.inject(FormResponsesApiService).obtener('estado-animo', 17).subscribe();

    const request = httpTestingController.expectOne(
      `${environment.apiBaseUrl}/v1/formularios/estado-animo/respuesta?articulo_id=17`,
    );
    expect(request.request.method).toBe('GET');
    request.flush(null);
  });

  it('guarda solo artículo, formulario, identificador idempotente y datos', () => {
    const solicitud = {
      articulo_id: 17,
      client_request_id: '11111111-1111-4111-8111-111111111111',
      datos: { estado: 'bien', comentario: null },
    };
    TestBed.inject(FormResponsesApiService).guardar('estado-animo', solicitud).subscribe();

    const request = httpTestingController.expectOne(
      `${environment.apiBaseUrl}/v1/formularios/estado-animo/respuestas`,
    );
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(solicitud);
    expect(request.request.body.usuario_id).toBeUndefined();
    request.flush({
      id: 3,
      articulo_id: 17,
      form_id: 'estado-animo',
      datos: solicitud.datos,
      client_request_id: solicitud.client_request_id,
      creado_en: '2026-10-16T10:00:00Z',
      actualizado_en: '2026-10-16T10:00:00Z',
    });
  });
});
