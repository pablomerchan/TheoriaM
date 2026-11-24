import { BreakpointObserver } from '@angular/cdk/layout';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { SessionService } from '../../core/session.service';
import { FeedApiService } from './feed-api.service';
import { FeedContractService } from './feed-contract.service';
import { FeedReadingPreferencesService } from './feed-reading-preferences.service';
import { FeedShellComponent } from './feed-shell.component';

describe('FeedShellComponent contrast control', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [FeedShellComponent],
      providers: [
        provideRouter([]),
        {
          provide: BreakpointObserver,
          useValue: { observe: () => of({ breakpoints: {} }) }
        },
        { provide: SessionService, useValue: { usuario: () => null } },
        { provide: FeedApiService, useValue: { listarMenu: () => of([]) } },
        {
          provide: FeedContractService,
          useValue: {
            texto: (clave: string) => clave,
            saludo: (seudonimo: string) => seudonimo
          }
        }
      ]
    }).compileComponents();
  });

  it('muestra el cambio de contraste en la barra superior y aplica la preferencia al feed', () => {
    const fixture = TestBed.createComponent(FeedShellComponent);
    fixture.detectChanges();

    const shell = fixture.nativeElement.querySelector('.feed-shell') as HTMLElement;
    const button = fixture.nativeElement.querySelector('.contrast-toggle') as HTMLButtonElement;
    expect(button.closest('.topbar')).not.toBeNull();
    expect(button.closest('.feed-article')).toBeNull();
    expect(button.querySelector('svg')).not.toBeNull();
    expect(button.getAttribute('aria-label')).toBe('feed.reading.contrast.toDark');
    expect(button.getAttribute('aria-pressed')).toBe('false');

    button.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.preferenciasLectura.contrasteOscuro()).toBe(true);
    expect(shell.classList.contains('dark-contrast')).toBe(true);
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });
});
