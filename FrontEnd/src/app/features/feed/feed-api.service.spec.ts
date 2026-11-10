import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { FeedApiService } from './feed-api.service';

describe('FeedApiService', () => {
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('solicita la primera tanda sin cursor', () => {
    TestBed.inject(FeedApiService).listar(null).subscribe();

    const request = httpTestingController.expectOne(
      `${environment.apiBaseUrl}/v1/feed?limite=10`
    );
    expect(request.request.method).toBe('GET');
    request.flush({ items: [], siguienteCursor: null });
  });

  it('envía el cursor recibido al solicitar la siguiente tanda', () => {
    const cursor = 'eyJwdWJsaWNhZG9fZW4iOiIyMDI2LTEwLTE1In0';
    TestBed.inject(FeedApiService).listar(cursor).subscribe();

    const request = httpTestingController.expectOne(
      `${environment.apiBaseUrl}/v1/feed?limite=10&cursor=${cursor}`
    );
    expect(request.request.method).toBe('GET');
    request.flush({ items: [], siguienteCursor: null });
  });

  it('solicita las opciones del menú del feed', () => {
    TestBed.inject(FeedApiService).listarMenu().subscribe();

    const request = httpTestingController.expectOne(
      `${environment.apiBaseUrl}/v1/feed/menu`
    );
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('alternar Me gusta envía la solicitud para el artículo', () => {
    TestBed.inject(FeedApiService).alternarMeGusta(17).subscribe();

    const request = httpTestingController.expectOne(
      `${environment.apiBaseUrl}/v1/feed/articulos/17/me-gusta`
    );
    expect(request.request.method).toBe('POST');
    request.flush({ me_gusta: true, total_me_gusta: 1 });
  });

  it('crear comentario envía el contenido al artículo', () => {
    TestBed.inject(FeedApiService).crearComentario(17, 'Muy útil').subscribe();

    const request = httpTestingController.expectOne(
      `${environment.apiBaseUrl}/v1/feed/articulos/17/comentarios`
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ contenido: 'Muy útil' });
    request.flush({
      id: 5,
      autor: 'ana',
      contenido: 'Muy útil',
      creado_en: '2026-10-15T12:30:45'
    });
  });
});
