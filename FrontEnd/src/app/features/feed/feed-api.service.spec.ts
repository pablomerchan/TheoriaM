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
});
