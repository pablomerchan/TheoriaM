import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FeedApiService } from './feed-api.service';
import { FeedContractService } from './feed-contract.service';
import { ArticuloIndiceFeed } from './feed.models';

@Component({
  selector: 'app-feed-article-index',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './feed-article-index.component.html',
  styleUrl: './feed-article-index.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeedArticleIndexComponent implements OnInit {
  private readonly api = inject(FeedApiService);
  private readonly contrato = inject(FeedContractService);
  private readonly destroyRef = inject(DestroyRef);

  @Input() menuId = 'inicio';
  @Output() readonly navegarAArticulo = new EventEmitter<number>();

  readonly articulos = signal<ArticuloIndiceFeed[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.api
      .listarIndice(this.menuId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (articulos) => {
          this.articulos.set(articulos);
          this.cargando.set(false);
        },
        error: (error: unknown) => {
          console.error('No fue posible cargar el índice de artículos:', error);
          this.error.set(this.contrato.texto('feed.index.error'));
          this.cargando.set(false);
        }
      });
  }

  texto(clave: string): string {
    return this.contrato.texto(clave);
  }

  seleccionarArticulo(event: MouseEvent, articuloId: number): void {
    if (
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    this.navegarAArticulo.emit(articuloId);
  }
}
