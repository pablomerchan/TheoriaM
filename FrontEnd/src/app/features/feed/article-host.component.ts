import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  ElementRef,
  AfterViewInit,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { FeedContractService } from './feed-contract.service';
import { FeedApiService } from './feed-api.service';
import { FeedReadingPreferencesService } from './feed-reading-preferences.service';
import { BloqueFeed, ArticuloFeed, ComentarioFeed } from './feed.models';
import { BlockImageComponent } from './blocks/block-image.component';
import { BlockTextComponent } from './blocks/block-text.component';
import { BlockVideoComponent } from './blocks/block-video.component';
import { BlockFormComponent } from './blocks/block-form.component';

const DEFAULT_FONT_SIZE = 20;
const MIN_FONT_SIZE = 16;
const MAX_FONT_SIZE = 28;
const FONT_SIZE_STORAGE_KEY = 'theoriam.feed.article-font-size';

@Component({
  selector: 'app-article-host',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BlockImageComponent,
    BlockTextComponent,
    BlockVideoComponent,
    BlockFormComponent,
  ],
  templateUrl: './article-host.component.html',
  styleUrl: './article-host.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleHostComponent implements OnChanges, AfterViewInit, OnDestroy {
  private readonly contrato = inject(FeedContractService);
  private readonly api = inject(FeedApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly preferenciasLectura = inject(FeedReadingPreferencesService);

  @Input({ required: true }) articulo!: ArticuloFeed;
  @Input({ required: true }) posicion!: number;
  @Input({ required: true }) totalArticulos!: number;
  @Input() menuId = 'inicio';
  @Output() readonly navegarAArticulo = new EventEmitter<number>();
  @ViewChild('articleElement') private articleElement?: ElementRef<HTMLElement>;
  @ViewChild('articleContentViewport') private articleContentViewport?: ElementRef<HTMLElement>;
  @ViewChild('articleContent') private articleContent?: ElementRef<HTMLElement>;

  readonly tamanoFuente = signal(this.leerTamanoFuente());
  readonly modoLectura = signal(false);
  readonly contenidoExpandible = signal(false);
  readonly contenidoExpandido = signal(false);
  readonly progresoLectura = signal(0);
  readonly interacciones = signal<{
    me_gusta: boolean;
    total_me_gusta: number;
    comentarios: ComentarioFeed[];
  } | null>(null);
  readonly comentariosAbiertos = signal(false);
  readonly comentarioBorrador = signal('');
  readonly actualizandoMeGusta = signal(false);
  readonly enviandoComentario = signal(false);
  readonly errorInteraccion = signal<string | null>(null);

  private progressObserver?: IntersectionObserver;
  private contentResizeObserver?: ResizeObserver;
  private contentMutationObserver?: MutationObserver;
  private progressFrame: number | null = null;
  private contentMeasureFrame: number | null = null;
  private isTrackingScroll = false;

  private readonly onScrollOrResize = (): void => {
    if (this.progressFrame !== null) {
      return;
    }

    this.progressFrame = window.requestAnimationFrame(() => {
      this.progressFrame = null;
      this.actualizarProgreso();
    });
  };

  ngAfterViewInit(): void {
    const content = this.articleContent?.nativeElement;
    if (content) {
      if (typeof ResizeObserver !== 'undefined') {
        this.contentResizeObserver = new ResizeObserver(() => this.programarMedicionContenido());
        this.contentResizeObserver.observe(content);
      }
      if (typeof MutationObserver !== 'undefined') {
        this.contentMutationObserver = new MutationObserver(() => this.programarMedicionContenido());
        this.contentMutationObserver.observe(content, {
          childList: true,
          subtree: true,
          characterData: true
        });
      }
      this.programarMedicionContenido();
    }

    const element = this.articleElement?.nativeElement;
    if (!element || typeof IntersectionObserver === 'undefined') {
      this.iniciarSeguimientoScroll();
      this.actualizarProgreso();
      return;
    }

    this.progressObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        this.iniciarSeguimientoScroll();
        this.actualizarProgreso();
      } else {
        this.detenerSeguimientoScroll();
      }
    });
    this.progressObserver.observe(element);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['articulo']) {
      this.contenidoExpandido.set(false);
      this.contenidoExpandible.set(false);
      this.interacciones.set({
        me_gusta: this.articulo.me_gusta,
        total_me_gusta: this.articulo.total_me_gusta,
        comentarios: [...this.articulo.comentarios]
      });
    }
  }

  ngOnDestroy(): void {
    this.progressObserver?.disconnect();
    this.contentResizeObserver?.disconnect();
    this.contentMutationObserver?.disconnect();
    this.detenerSeguimientoScroll();
    if (this.contentMeasureFrame !== null) {
      window.cancelAnimationFrame(this.contentMeasureFrame);
      this.contentMeasureFrame = null;
    }
  }

  texto(clave: string): string {
    return this.contrato.texto(clave);
  }

  disminuirTamanoFuente(): void {
    this.establecerTamanoFuente(this.tamanoFuente() - 2);
  }

  aumentarTamanoFuente(): void {
    this.establecerTamanoFuente(this.tamanoFuente() + 2);
  }

  alternarModoLectura(): void {
    this.modoLectura.update((activo) => !activo);
  }

  alternarContenido(): void {
    const expandido = !this.contenidoExpandido();
    this.contenidoExpandido.set(expandido);
    if (!expandido) {
      this.programarMedicionContenido();
    }
  }

  alternarMeGusta(): void {
    if (this.actualizandoMeGusta()) {
      return;
    }
    this.actualizandoMeGusta.set(true);
    this.errorInteraccion.set(null);
    this.api
      .alternarMeGusta(this.articulo.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          const actual = this.obtenerInteracciones();
          this.interacciones.set({
            ...actual,
            me_gusta: respuesta.me_gusta,
            total_me_gusta: respuesta.total_me_gusta
          });
          this.actualizandoMeGusta.set(false);
        },
        error: (error: unknown) => {
          console.error('No fue posible registrar el Me gusta:', error);
          this.errorInteraccion.set(this.mensajeErrorInteraccion(error));
          this.actualizandoMeGusta.set(false);
        }
      });
  }

  alternarComentarios(): void {
    this.comentariosAbiertos.update((abiertos) => !abiertos);
  }

  publicarComentario(): void {
    const contenido = this.comentarioBorrador().trim();
    if (!contenido || this.enviandoComentario()) {
      return;
    }
    this.enviandoComentario.set(true);
    this.errorInteraccion.set(null);
    this.api
      .crearComentario(this.articulo.id, contenido)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (comentario) => {
          const actual = this.obtenerInteracciones();
          this.interacciones.set({
            ...actual,
            comentarios: [...actual.comentarios, comentario]
          });
          this.comentarioBorrador.set('');
          this.enviandoComentario.set(false);
        },
        error: (error: unknown) => {
          console.error('No fue posible guardar el comentario:', error);
          this.errorInteraccion.set(this.mensajeErrorInteraccion(error));
          this.enviandoComentario.set(false);
        }
      });
  }

  meGusta(): boolean {
    return this.obtenerInteracciones().me_gusta;
  }

  totalMeGusta(): number {
    return this.obtenerInteracciones().total_me_gusta;
  }

  comentarios(): ComentarioFeed[] {
    return this.obtenerInteracciones().comentarios;
  }

  aspectoBloque(bloque: BloqueFeed): string | null {
    const ancho = bloque.payload['ancho'];
    const alto = bloque.payload['alto'];
    if (
      typeof ancho === 'number' &&
      Number.isFinite(ancho) &&
      ancho > 0 &&
      typeof alto === 'number' &&
      Number.isFinite(alto) &&
      alto > 0
    ) {
      return `${ancho} / ${alto}`;
    }
    return null;
  }

  formId(bloque: BloqueFeed): string | null {
    const formId = bloque.payload['formId'];
    return typeof formId === 'string' && formId.length > 0 ? formId : null;
  }

  private obtenerInteracciones(): {
    me_gusta: boolean;
    total_me_gusta: number;
    comentarios: ComentarioFeed[];
  } {
    return (
      this.interacciones() ?? {
        me_gusta: this.articulo.me_gusta,
        total_me_gusta: this.articulo.total_me_gusta,
        comentarios: this.articulo.comentarios
      }
    );
  }

  private mensajeErrorInteraccion(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const respuesta: unknown = error.error;
      if (
        typeof respuesta === 'object' &&
        respuesta !== null &&
        'mensaje' in respuesta &&
        typeof respuesta.mensaje === 'string'
      ) {
        return respuesta.mensaje;
      }
    }
    return this.texto('feed.interaction.error');
  }

  private leerTamanoFuente(): number {
    if (typeof localStorage === 'undefined') {
      return DEFAULT_FONT_SIZE;
    }

    try {
      const guardado = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
      if (guardado === null) {
        return DEFAULT_FONT_SIZE;
      }
      const valor = Number(guardado);
      return Number.isFinite(valor)
        ? Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(valor)))
        : DEFAULT_FONT_SIZE;
    } catch (error) {
      console.warn('No fue posible recuperar el tamaño de letra guardado:', error);
      return DEFAULT_FONT_SIZE;
    }
  }

  private establecerTamanoFuente(valor: number): void {
    const nuevoTamano = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, valor));
    this.tamanoFuente.set(nuevoTamano);

    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(FONT_SIZE_STORAGE_KEY, String(nuevoTamano));
    } catch (error) {
      console.warn('No fue posible guardar el tamaño de letra:', error);
    }
  }

  private iniciarSeguimientoScroll(): void {
    if (this.isTrackingScroll) {
      return;
    }
    window.addEventListener('scroll', this.onScrollOrResize, { passive: true });
    window.addEventListener('resize', this.onScrollOrResize);
    this.isTrackingScroll = true;
  }

  private detenerSeguimientoScroll(): void {
    if (!this.isTrackingScroll) {
      return;
    }
    window.removeEventListener('scroll', this.onScrollOrResize);
    window.removeEventListener('resize', this.onScrollOrResize);
    this.isTrackingScroll = false;

    if (this.progressFrame !== null) {
      window.cancelAnimationFrame(this.progressFrame);
      this.progressFrame = null;
    }
  }

  private programarMedicionContenido(): void {
    if (this.contentMeasureFrame !== null) {
      return;
    }
    this.contentMeasureFrame = window.requestAnimationFrame(() => {
      this.contentMeasureFrame = null;
      const viewport = this.articleContentViewport?.nativeElement;
      const content = this.articleContent?.nativeElement;
      if (!viewport || !content || this.contenidoExpandido()) {
        return;
      }
      const esExpandible = content.getBoundingClientRect().height > viewport.clientHeight + 1;
      this.contenidoExpandible.set(esExpandible);
      if (!esExpandible) {
        this.contenidoExpandido.set(false);
      }
    });
  }

  private actualizarProgreso(): void {
    const element = this.articleElement?.nativeElement;
    if (!element) {
      return;
    }

    const rect = element.getBoundingClientRect();
    const recorrido = rect.height - window.innerHeight;
    const porcentaje = Math.round(
      recorrido > 0
        ? Math.min(100, Math.max(0, (-rect.top / recorrido) * 100))
        : rect.top < 0 ? 100 : 0
    );
    if (porcentaje !== this.progresoLectura()) {
      this.progresoLectura.set(porcentaje);
    }
  }
}
