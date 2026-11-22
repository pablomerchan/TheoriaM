import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ArticleHostComponent } from './article-host.component';
import { FeedApiService } from './feed-api.service';
import { FeedContractService } from './feed-contract.service';
import { ArticuloFeed } from './feed.models';

describe('ArticleHostComponent reading controls', () => {
  let fixture: ComponentFixture<ArticleHostComponent>;
  let component: ArticleHostComponent;

  const articulo: ArticuloFeed = {
    id: 1,
    titulo: 'Artículo de prueba',
    publicado_en: '2026-01-01T00:00:00Z',
    me_gusta: false,
    total_me_gusta: 0,
    comentarios: [],
    bloques: []
  };

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ArticleHostComponent],
      providers: [
        { provide: FeedContractService, useValue: { texto: (clave: string) => clave } },
        {
          provide: FeedApiService,
          useValue: {
            alternarMeGusta: () => of({ me_gusta: false, total_me_gusta: 0 }),
            crearComentario: () => of({})
          }
        }
      ]
    }).compileComponents();
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(ArticleHostComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('articulo', articulo);
    fixture.componentRef.setInput('posicion', 1);
    fixture.componentRef.setInput('totalArticulos', 1);
    fixture.detectChanges();
  }

  it('usa 20 px por defecto y persiste el tamaño dentro de 16-28 px', () => {
    createComponent();

    expect(component.tamanoFuente()).toBe(20);
    for (let i = 0; i < 6; i++) {
      component.aumentarTamanoFuente();
    }
    component.aumentarTamanoFuente();
    expect(component.tamanoFuente()).toBe(28);
    expect(localStorage.getItem('theoriam.feed.article-font-size')).toBe('28');

    for (let i = 0; i < 8; i++) {
      component.disminuirTamanoFuente();
    }
    expect(component.tamanoFuente()).toBe(16);
    expect(localStorage.getItem('theoriam.feed.article-font-size')).toBe('16');
  });

  it('recupera y permite restablecer una preferencia guardada', () => {
    localStorage.setItem('theoriam.feed.article-font-size', '26');
    createComponent();

    expect(component.tamanoFuente()).toBe(26);
    component.restablecerTamanoFuente();

    expect(component.tamanoFuente()).toBe(20);
    expect(localStorage.getItem('theoriam.feed.article-font-size')).toBe('20');
  });
});
