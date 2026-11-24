import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { FeedApiService } from './feed-api.service';
import { FeedContractService } from './feed-contract.service';
import { FeedArticleIndexComponent } from './feed-article-index.component';

describe('FeedArticleIndexComponent', () => {
  let fixture: ComponentFixture<FeedArticleIndexComponent>;
  const listarIndice = vi.fn(() =>
    of([
      { id: 12, titulo: 'Guía de colores' },
      { id: 17, titulo: 'Cómo combinar prendas' }
    ])
  );

  beforeEach(async () => {
    listarIndice.mockClear();
    await TestBed.configureTestingModule({
      imports: [FeedArticleIndexComponent],
      providers: [
        { provide: FeedApiService, useValue: { listarIndice } },
        { provide: FeedContractService, useValue: { texto: (clave: string) => clave } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(FeedArticleIndexComponent);
    fixture.componentRef.setInput('menuId', 'consejos');
    fixture.detectChanges();
  });

  it('lista los artículos del menú como enlaces que solicitan desplazamiento', () => {
    const links = fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>;
    expect(listarIndice).toHaveBeenCalledWith('consejos');
    expect(Array.from(links).map((link) => link.textContent.trim())).toEqual([
      'Guía de colores',
      'Cómo combinar prendas'
    ]);

    const navegar = vi.spyOn(fixture.componentInstance.navegarAArticulo, 'emit');
    links[1].click();
    expect(navegar).toHaveBeenCalledWith(17);
  });
});
