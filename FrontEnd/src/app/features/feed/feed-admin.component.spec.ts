import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { FeedAdminComponent } from './feed-admin.component';
import { FeedAdminApiService } from './feed-admin-api.service';

describe('FeedAdminComponent', () => {
  let fixture: ComponentFixture<FeedAdminComponent>;
  let httpTestingController: HttpTestingController;
  let api: {
    listar: ReturnType<typeof vi.fn>;
    listarMenus: ReturnType<typeof vi.fn>;
    listarArchivosHtml: ReturnType<typeof vi.fn>;
    crear: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    api = {
      listar: vi.fn(() => of([])),
      listarMenus: vi.fn(() => of([{
        id: 'inicio',
        etiqueta: 'Inicio',
        icono: '⌂',
        destino: 'feed',
        valor: '',
        criterio_filtro: null
      }])),
      listarArchivosHtml: vi.fn(() => of(['PresentacionTheoriam.html'])),
      crear: vi.fn(() => of({ id: 1 }))
    };
    await TestBed.configureTestingModule({
      imports: [FeedAdminComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: FeedAdminApiService,
          useValue: api
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FeedAdminComponent);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('carga el archivo HTML de public/articulos dentro del contenido editable', () => {
    const component = fixture.componentInstance;
    component.archivoHtml = 'Los colores que más te favorecen.html';

    component.cargarHtml();

    const request = httpTestingController.expectOne(
      '/articulos/Los%20colores%20que%20m%C3%A1s%20te%20favorecen.html'
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.responseType).toBe('text');
    request.flush(
      '<article><h1>Colores</h1><img src="imgs/portada.png" ' +
      'srcset="imgs/portada-small.png 1x, imgs/portada.png 2x"></article>'
    );

    expect(component.contenido).toBe(
      '<article><h1>Colores</h1><img src="/articulos/imgs/portada.png" ' +
      'srcset="/articulos/imgs/portada-small.png 1x, /articulos/imgs/portada.png 2x"></article>'
    );
    expect(component.mensaje).toContain('HTML cargado');
    expect(component.cargandoHtml).toBe(false);
  });

  it('filtra los archivos HTML por nombre sin distinguir mayúsculas', () => {
    const component = fixture.componentInstance;
    component.archivosHtml = ['PresentacionTheoriam.html', 'Colores.html'];
    component.busquedaArchivoHtml = 'PRESENTACION';

    expect(component.archivosHtmlFiltrados).toEqual(['PresentacionTheoriam.html']);
  });

  it('rechaza rutas fuera de public/articulos', () => {
    const component = fixture.componentInstance;
    component.archivoHtml = '../privado/articulo.html';

    component.cargarHtml();

    httpTestingController.expectNone('/articulos/../privado/articulo.html');
    expect(component.error).toContain('ubicado en FrontEnd/public/articulos');
  });

  it('guarda la prioridad configurada para el artículo', () => {
    const component = fixture.componentInstance;
    component.titulo = 'Artículo prioritario';
    component.contenido = '<p>Contenido</p>';
    component.estado = 1;
    component.prioridad = -3;

    component.guardar();

    expect(api.crear).toHaveBeenCalledWith({
      titulo: 'Artículo prioritario',
      contenido: '<p>Contenido</p>',
      estado: 1,
      prioridad: -3,
      asignaciones: [{ menu_id: 'inicio', orden: 0 }],
      reglas: null
    });
  });

  it('guarda la asignación y el orden configurados para un menú', () => {
    const component = fixture.componentInstance;
    component.titulo = 'Artículo de consejos';
    component.contenido = '<p>Contenido</p>';
    component.estado = 1;
    component.asignaciones = [{ menu_id: 'consejos', orden: 4 }];

    component.guardar();

    expect(api.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        asignaciones: [{ menu_id: 'consejos', orden: 4 }]
      })
    );
  });

  it('rechaza una prioridad que no sea entera', () => {
    const component = fixture.componentInstance;
    component.titulo = 'Artículo';
    component.contenido = '<p>Contenido</p>';
    component.prioridad = 1.5;

    component.guardar();

    expect(api.crear).not.toHaveBeenCalled();
    expect(component.error).toContain('número entero');
  });
});
