import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { FeedApiService } from '../feed-api.service';
import { MARCADOR_INDICE_FEED } from '../feed.constants';
import { FeedContractService } from '../feed-contract.service';
import { BlockTextComponent } from './block-text.component';

describe('BlockTextComponent', () => {
  let fixture: ComponentFixture<BlockTextComponent>;
  const listarIndice = vi.fn(() => of([{ id: 12, titulo: 'Guía de colores' }]));

  beforeEach(async () => {
    listarIndice.mockClear();
    await TestBed.configureTestingModule({
      imports: [BlockTextComponent],
      providers: [
        { provide: FeedApiService, useValue: { listarIndice } },
        { provide: FeedContractService, useValue: { texto: (clave: string) => clave } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(BlockTextComponent);
  });

  it('deja que Angular sanitice el HTML antes de mostrarlo', () => {
    fixture.componentRef.setInput(
      'payload',
      {
        contenido: '<p>Texto seguro</p><img src="x" onerror="alert(1)"><script>alert(1)</script>'
      }
    );
    fixture.detectChanges();

    const contenido = fixture.nativeElement.querySelector('.text-block') as HTMLElement;
    expect(contenido.textContent).toContain('Texto seguro');
    expect(contenido.querySelector('script')).toBeNull();
    expect(contenido.querySelector('img')?.hasAttribute('onerror')).toBe(false);
  });

  it('reemplaza el marcador del editor con el índice del menú actual', () => {
    fixture.componentRef.setInput('payload', {
      contenido: `<p>Introducción</p>${MARCADOR_INDICE_FEED}<p>Conclusión</p>`
    });
    fixture.componentRef.setInput('menuId', 'consejos');
    fixture.detectChanges();

    expect(listarIndice).toHaveBeenCalledWith('consejos');
    expect(fixture.nativeElement.textContent).toContain('Guía de colores');
    expect(fixture.nativeElement.textContent).not.toContain(MARCADOR_INDICE_FEED);
  });
});
