import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlockImageComponent } from './block-image.component';

describe('BlockImageComponent', () => {
  let fixture: ComponentFixture<BlockImageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlockImageComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(BlockImageComponent);
  });

  it('renderiza la imagen con texto alternativo, dimensiones y carga diferida', () => {
    fixture.componentRef.setInput('payload', {
      url: '/media/bienvenida.jpg',
      alt: 'Imagen de bienvenida',
      ancho: 1200,
      alto: 800
    });
    fixture.detectChanges();

    const imagen = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(imagen.alt).toBe('Imagen de bienvenida');
    expect(imagen.width).toBe(1200);
    expect(imagen.height).toBe(800);
    expect(imagen.getAttribute('loading')).toBe('lazy');
  });
});
