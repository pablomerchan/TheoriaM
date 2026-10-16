import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlockVideoComponent } from './block-video.component';

describe('BlockVideoComponent', () => {
  let fixture: ComponentFixture<BlockVideoComponent>;
  let intersectionObserver: MockIntersectionObserver;

  beforeEach(async () => {
    vi.stubGlobal(
      'IntersectionObserver',
      class implements IntersectionObserver {
        readonly root: Element | null = null;
        readonly rootMargin = '0px';
        readonly thresholds: ReadonlyArray<number> = [];
        private target: Element | null = null;

        constructor(private readonly callback: IntersectionObserverCallback) {
          intersectionObserver = this;
        }

        observe(target: Element): void {
          this.target = target;
        }

        unobserve(): void {}

        disconnect(): void {}

        takeRecords(): IntersectionObserverEntry[] {
          return [];
        }

        simularVisibilidad(isIntersecting: boolean): void {
          if (!this.target) {
            throw new Error('El observador todavía no tiene un video.');
          }
          const rect = new DOMRectReadOnly(0, 0, 0, 0);
          this.callback(
            [
              {
                boundingClientRect: rect,
                intersectionRatio: isIntersecting ? 1 : 0,
                intersectionRect: rect,
                isIntersecting,
                rootBounds: null,
                target: this.target,
                time: 0,
              },
            ],
            this,
          );
        }
      },
    );
    await TestBed.configureTestingModule({
      imports: [BlockVideoComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(BlockVideoComponent);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  });

  afterEach(() => {
    fixture.destroy();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('muestra poster, subtítulos y transcripción accesible con carga diferida', () => {
    fixture.componentRef.setInput('payload', {
      url: '/media/intro.mp4',
      poster: '/media/intro.jpg',
      ancho: 1280,
      alto: 720,
      subtitulos_url: '/media/intro.vtt',
      transcripcion: 'Video de introducción al feed.',
    });
    fixture.detectChanges();

    const video = fixture.nativeElement.querySelector('video') as HTMLVideoElement;
    expect(video.getAttribute('preload')).toBe('none');
    expect(video.getAttribute('poster')).toBe('/media/intro.jpg');
    expect(video.hasAttribute('playsinline')).toBe(true);
    expect(fixture.nativeElement.querySelector('track')?.getAttribute('src')).toBe(
      '/media/intro.vtt',
    );
    expect(fixture.nativeElement.querySelector('.video-transcript')?.textContent).toContain(
      'Video de introducción al feed.',
    );
  });

  it('advierte cuando el contenido no incluye subtítulos ni transcripción', () => {
    fixture.componentRef.setInput('payload', {
      url: '/media/intro.mp4',
      ancho: 1280,
      alto: 720,
    });
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.video-accessibility-error')?.textContent,
    ).toContain('Este video aún no tiene subtítulos ni transcripción.');
  });

  it('pausa la reproducción cuando el video sale del viewport', () => {
    fixture.componentRef.setInput('payload', {
      url: '/media/intro.mp4',
      poster: '/media/intro.jpg',
      ancho: 1280,
      alto: 720,
      transcripcion: 'Transcripción disponible.',
    });
    fixture.detectChanges();

    intersectionObserver.simularVisibilidad(false);
    expect(vi.mocked(HTMLMediaElement.prototype.pause)).toHaveBeenCalledOnce();
  });
});

interface MockIntersectionObserver extends IntersectionObserver {
  simularVisibilidad(isIntersecting: boolean): void;
}
