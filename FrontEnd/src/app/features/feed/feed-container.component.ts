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

  readonly articulos = signal<ArticuloFeed[]>([]);
  readonly cargando = signal(false);
  readonly cursor = signal<string | null>(null);
  readonly finDeLista = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    this.route.queryParamMap
      .pipe(
        map((params) => params.get('filtro')),
        distinctUntilChanged(),
        takeUntilDestroyed()
      )
      .subscribe(() => this.recargar());
  }

  texto(clave: string): string {
    return this.contrato.texto(clave);
  }

  cargarMas(): void {
    if (this.cargando() || this.finDeLista()) {
      return;
    }

    this.cargando.set(true);
    this.error.set(null);
    this.solicitudActual = this.api
      .listar(this.cursor())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pagina) => {
          this.articulos.update((actuales) => [...actuales, ...pagina.items]);
          this.cursor.set(pagina.siguienteCursor);
          this.finDeLista.set(pagina.siguienteCursor === null);
          this.cargando.set(false);
          this.solicitudActual = null;
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

  private recargar(): void {
    this.solicitudActual?.unsubscribe();
    this.solicitudActual = null;
    this.articulos.set([]);
    this.cargando.set(false);
    this.cursor.set(null);
    this.finDeLista.set(false);
    this.error.set(null);
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
