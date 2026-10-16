import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../environments/environment';
import { ApiClientService } from './api-client.service';
import { authInterceptor } from './auth.interceptor';
import { SessionService } from './session.service';

describe('ApiClientService', () => {
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting()
      ]
    });
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
    localStorage.clear();
  });

  it('usa la URL base y adjunta el token a las peticiones del API', () => {
    TestBed.inject(SessionService).establecerSesion('token-prueba', {
      id: 'usuario-1',
      seudonimo: 'persona'
    });

    TestBed.inject(ApiClientService).get<{ items: unknown[] }>('v1/feed').subscribe();

    const request = httpTestingController.expectOne(`${environment.apiBaseUrl}/v1/feed`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-prueba');
    request.flush({ items: [] });
  });

  it('no envía el token a URLs fuera del API configurado', () => {
    TestBed.inject(SessionService).establecerSesion('token-prueba', {
      id: 'usuario-1',
      seudonimo: 'persona'
    });

    TestBed.inject(HttpClient).get('https://example.invalid/recurso').subscribe();

    const request = httpTestingController.expectOne('https://example.invalid/recurso');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });
});
