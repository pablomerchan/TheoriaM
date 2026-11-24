import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { distinctUntilChanged, map, Subscription } from 'rxjs';

import { SessionService } from '../../core/session.service';
import { InfiniteScrollDirective } from '../../shared/infinite-scroll.directive';
import { FeedContractService } from './feed-contract.service';
import { FeedApiService } from './feed-api.service';
import { ArticuloFeed } from './feed.models';
import { ArticleHostComponent } from './article-host.component';

@Component({
  selector: 'app-feed-container',
  standalone: true,
  imports: [InfiniteScrollDirective, ArticleHostComponent],
  templateUrl: './feed-container.component.html',
  styleUrl: './feed-container.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeedContainerComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly api = inject(FeedApiService);
  private readonly contrato = inject(FeedContractService);
  private readonly destroyRef = inject(DestroyRef);
  private solicitudActual: Subscription | null = null;
  private articuloObjetivo: number | null = null;

  readonly articulos = signal<ArticuloFeed[]>([]);
  readonly cargando = signal(false);
  readonly cursor = signal<string | null>(null);
  readonly finDeLista = signal(false);
  readonly error = signal<string | null>(null);
  readonly menuId = signal('inicio');

  constructor() {
    this.route.queryParamMap
      .pipe(
        map((params) => ({
          menuId: params.get('menu') ?? 'inicio',
          filtro: params.get('filtro')
        })),
        distinctUntilChanged(
          (anterior, actual) =>
            anterior.menuId === actual.menuId && anterior.filtro === actual.filtro
        ),
        takeUntilDestroyed()
      )
      .subscribe(({ menuId }) => this.recargar(menuId));
  }

  texto(clave: string): string {
    return this.contrato.texto(clave);
  }

  navegarAArticulo(articuloId: number): void {
    this.articuloObjetivo = articuloId;
    this.error.set(null);
    this.resolverNavegacionAArticulo();
  }

  cargarMas(): void {
    if (this.cargando() || this.finDeLista()) {
      return;
    }

    this.cargando.set(true);
    this.error.set(null);
    this.solicitudActual = this.api
      .listar(this.cursor(), this.menuId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pagina) => {
          this.articulos.update((actuales) => [...actuales, ...pagina.items]);
          this.cursor.set(pagina.siguienteCursor);
          this.finDeLista.set(pagina.siguienteCursor === null);
          this.cargando.set(false);
          this.solicitudActual = null;
          this.resolverNavegacionAArticulo();
        },
        error: (error: unknown) => {
          console.error('No fue posible cargar los artículos del feed:', error);
          if (error instanceof HttpErrorResponse && error.status === 401) {
            this.session.cerrarSesion();
            void this.router.navigate(['/is'], {
              queryParams: { returnUrl: this.router.url }
            });
            return;
          }
          this.error.set(this.mensajeError(error));
          this.cargando.set(false);
          this.solicitudActual = null;
        }
      });
  }

  private recargar(menuId: string): void {
    this.menuId.set(menuId);
    this.articuloObjetivo = null;
    this.solicitudActual?.unsubscribe();
    this.solicitudActual = null;
    this.articulos.set([]);
    this.cargando.set(false);
    this.cursor.set(null);
    this.finDeLista.set(false);
    this.error.set(null);
    this.cargarMas();
  }

  private resolverNavegacionAArticulo(): void {
    const articuloId = this.articuloObjetivo;
    if (articuloId === null) {
      return;
    }

    if (this.articulos().some((articulo) => articulo.id === articuloId)) {
      this.articuloObjetivo = null;
      if (typeof window !== 'undefined') {
        window.requestAnimationFrame(() => {
          const articulo = document.getElementById(`feed-article-${articuloId}`);
          articulo?.scrollIntoView({ block: 'start' });
          articulo?.focus({ preventScroll: true });
        });
      }
      return;
    }

    if (this.finDeLista()) {
      this.articuloObjetivo = null;
      this.error.set(this.contrato.texto('feed.index.targetUnavailable'));
      return;
    }

    this.cargarMas();
  }

  private mensajeError(error: unknown): string {
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
    return this.contrato.texto('feed.loadError');
  }
}
