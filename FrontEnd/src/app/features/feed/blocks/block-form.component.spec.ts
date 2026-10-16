import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { SessionService } from '../../../core/session.service';
import { BlockFormComponent } from './block-form.component';

describe('BlockFormComponent', () => {
  let fixture: ComponentFixture<BlockFormComponent>;
  let httpTestingController: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [BlockFormComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    TestBed.inject(SessionService).establecerSesion('token-prueba', {
      id: 'usuario-prueba',
      seudonimo: 'Persona',
    });
    httpTestingController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(BlockFormComponent);
    fixture.componentRef.setInput('articuloId', 17);
    fixture.componentRef.setInput('formId', 'estado-animo');
  });

  afterEach(() => {
    httpTestingController.verify();
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('crea controles tipados, restaura la respuesta y permite editarla', () => {
    fixture.detectChanges();
    httpTestingController
      .expectOne(`${environment.apiBaseUrl}/v1/formularios/estado-animo/respuesta?articulo_id=17`)
      .flush({
        id: 5,
        articulo_id: 17,
        form_id: 'estado-animo',
        datos: { estado: 'bien', comentario: 'Todo bien' },
        client_request_id: '11111111-1111-4111-8111-111111111111',
        creado_en: '2026-10-16T10:00:00Z',
        actualizado_en: '2026-10-16T10:00:00Z',
      });
    fixture.detectChanges();

    const componente = fixture.componentInstance;
    expect(componente.form.controls['estado']?.value).toBe('bien');
    expect(componente.form.controls['comentario']?.value).toBe('Todo bien');
    expect(componente.form.disabled).toBe(true);

    const editar = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    editar.click();
    fixture.detectChanges();
    expect(componente.form.enabled).toBe(true);
  });

  it('guarda el borrador e identifica de forma idempotente el envío', () => {
    fixture.detectChanges();
    httpTestingController
      .expectOne(`${environment.apiBaseUrl}/v1/formularios/estado-animo/respuesta?articulo_id=17`)
      .flush(null);
    fixture.detectChanges();

    const componente = fixture.componentInstance;
    componente.form.controls['estado']?.setValue('bien');
    const claveBorrador = 'theoriam_feed_form:usuario-prueba:17:estado-animo';
    const borrador = sessionStorage.getItem(claveBorrador);
    expect(borrador).not.toBeNull();
    expect(JSON.parse(borrador ?? '{}')).toEqual({
      datos: { estado: 'bien', comentario: null },
      client_request_id: null,
    });

    const clientRequestId = '22222222-2222-4222-8222-222222222222';
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(clientRequestId);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    componente.guardar();
    const request = httpTestingController.expectOne(
      `${environment.apiBaseUrl}/v1/formularios/estado-animo/respuestas`,
    );
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      articulo_id: 17,
      client_request_id: clientRequestId,
      datos: { estado: 'bien', comentario: null },
    });
    request.flush(
      { codigo: 'error_temporal', mensaje: 'Error temporal', detalle: null },
      { status: 503, statusText: 'Service Unavailable' },
    );

    expect(componente.estado()).toBe('error');
    componente.guardar();
    const reintento = httpTestingController.expectOne(
      `${environment.apiBaseUrl}/v1/formularios/estado-animo/respuestas`,
    );
    expect(reintento.request.body.client_request_id).toBe(clientRequestId);
    reintento.flush({
      id: 6,
      articulo_id: 17,
      form_id: 'estado-animo',
      datos: { estado: 'bien', comentario: null },
      client_request_id: clientRequestId,
      creado_en: '2026-10-16T10:00:00Z',
      actualizado_en: '2026-10-16T10:00:00Z',
    });

    expect(componente.estado()).toBe('guardado');
    expect(sessionStorage.getItem(claveBorrador)).toBeNull();
  });
});
