import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';

import { FeedContractService } from '../feed-contract.service';

interface ImagenFeed {
  url: string;
  alt: string;
  ancho: number;
  alto: number;
}

@Component({
  selector: 'app-block-image',
  standalone: true,
  imports: [NgOptimizedImage],
  templateUrl: './block-image.component.html',
  styleUrl: './block-image.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlockImageComponent {
  private readonly contrato = inject(FeedContractService);

  @Input({ required: true }) payload!: Record<string, unknown>;

  imagen(): ImagenFeed | null {
    const { url, alt, ancho, alto } = this.payload;
    if (
      typeof url === 'string' &&
      url.length > 0 &&
      typeof alt === 'string' &&
      typeof ancho === 'number' &&
      Number.isInteger(ancho) &&
      ancho > 0 &&
      typeof alto === 'number' &&
      Number.isInteger(alto) &&
      alto > 0
    ) {
      return { url, alt, ancho, alto };
    }
    return null;
  }

  textoInvalido(): string {
    return this.contrato.texto('feed.block.image.invalid');
  }
}
