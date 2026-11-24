import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';

import { FeedArticleIndexComponent } from '../feed-article-index.component';
import { MARCADOR_INDICE_FEED } from '../feed.constants';
import { FeedContractService } from '../feed-contract.service';

interface SegmentoContenidoFeed {
  tipo: 'html' | 'indice';
  contenido?: string;
}

@Component({
  selector: 'app-block-text',
  standalone: true,
  imports: [FeedArticleIndexComponent],
  templateUrl: './block-text.component.html',
  styleUrl: './block-text.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlockTextComponent {
  private readonly contrato = inject(FeedContractService);

  @Input({ required: true }) payload!: Record<string, unknown>;
  @Input() menuId = 'inicio';
  @Output() readonly navegarAArticulo = new EventEmitter<number>();

  contenido(): string | null {
    const contenido = this.payload['contenido'];
    return typeof contenido === 'string' ? contenido : null;
  }

  segmentos(): SegmentoContenidoFeed[] | null {
    const contenido = this.contenido();
    if (!contenido) {
      return null;
    }

    const partes = contenido.split(MARCADOR_INDICE_FEED);
    const segmentos: SegmentoContenidoFeed[] = [];
    for (let indice = 0; indice < partes.length; indice++) {
      if (partes[indice]) {
        segmentos.push({ tipo: 'html', contenido: partes[indice] });
      }
      if (indice < partes.length - 1) {
        segmentos.push({ tipo: 'indice' });
      }
    }
    return segmentos;
  }

  textoInvalido(): string {
    return this.contrato.texto('feed.block.text.invalid');
  }
}
