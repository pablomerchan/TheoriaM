import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';

import { FeedContractService } from './feed-contract.service';
import { BloqueFeed, ArticuloFeed } from './feed.models';
import { BlockImageComponent } from './blocks/block-image.component';
import { BlockTextComponent } from './blocks/block-text.component';
import { BlockVideoComponent } from './blocks/block-video.component';
import { BlockFormComponent } from './blocks/block-form.component';

@Component({
  selector: 'app-article-host',
  standalone: true,
  imports: [
    CommonModule,
    BlockImageComponent,
    BlockTextComponent,
    BlockVideoComponent,
    BlockFormComponent,
  ],
  templateUrl: './article-host.component.html',
  styleUrl: './article-host.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleHostComponent {
  private readonly contrato = inject(FeedContractService);

  @Input({ required: true }) articulo!: ArticuloFeed;
  @Input({ required: true }) posicion!: number;
  @Input({ required: true }) totalArticulos!: number;

  texto(clave: string): string {
    return this.contrato.texto(clave);
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
}
