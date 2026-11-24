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

  it('recupera la preferencia guardada y muestra solo los controles de ajuste', () => {
    localStorage.setItem('theoriam.feed.article-font-size', '26');
    createComponent();

    expect(component.tamanoFuente()).toBe(26);
    const fontButtons = fixture.nativeElement.querySelectorAll('.font-controls button');
    expect(fontButtons.length).toBe(2);
    expect(fixture.nativeElement.querySelector('.font-controls').textContent).not.toContain('26px');
  });

  it('cambia y persiste el contraste de lectura en todos los artículos', () => {
    createComponent();

    const anotherFixture = TestBed.createComponent(ArticleHostComponent);
    anotherFixture.componentRef.setInput('articulo', { ...articulo, id: 2 });
    anotherFixture.componentRef.setInput('posicion', 2);
    anotherFixture.componentRef.setInput('totalArticulos', 2);
    anotherFixture.detectChanges();

    component.preferenciasLectura.alternarContraste();
    fixture.detectChanges();
    anotherFixture.detectChanges();

    expect(component.preferenciasLectura.contrasteOscuro()).toBe(true);
    expect(fixture.nativeElement.querySelector('.feed-article').classList.contains('dark-contrast')).toBe(true);
    expect(anotherFixture.nativeElement.querySelector('.feed-article').classList.contains('dark-contrast')).toBe(true);
    expect(localStorage.getItem('theoriam.feed.article-contrast')).toBe('dark');
  });

  it('restaura el contraste elegido al cargar el feed', () => {
    localStorage.setItem('theoriam.feed.article-contrast', 'dark');
    createComponent();

    expect(component.preferenciasLectura.contrasteOscuro()).toBe(true);
    expect(fixture.nativeElement.querySelector('.feed-article').classList.contains('dark-contrast')).toBe(true);
  });

  it('expande el contenido y usa un control de modo lectura con icono accesible', () => {
    createComponent();
    component.contenidoExpandible.set(true);
    fixture.detectChanges();

    const contentToggle = fixture.nativeElement.querySelector('.content-toggle') as HTMLButtonElement;
    expect(contentToggle.textContent.trim()).toBe('Ver más');
    contentToggle.click();
    fixture.detectChanges();
    expect(contentToggle.textContent.trim()).toBe('Ver menos');
    expect(contentToggle.getAttribute('aria-expanded')).toBe('true');

    const readingModeButton = fixture.nativeElement.querySelector('.reading-mode-button') as HTMLButtonElement;
    expect(readingModeButton.querySelector('svg')).not.toBeNull();
    expect(readingModeButton.getAttribute('aria-label')).toBe('Activar modo lectura');
    readingModeButton.click();
    fixture.detectChanges();
    expect(readingModeButton.getAttribute('aria-label')).toBe('Salir del modo lectura');
  });
});
