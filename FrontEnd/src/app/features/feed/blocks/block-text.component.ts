import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';

import { FeedContractService } from '../feed-contract.service';

@Component({
  selector: 'app-block-text',
  standalone: true,
  templateUrl: './block-text.component.html',
  styleUrl: './block-text.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlockTextComponent {
  private readonly contrato = inject(FeedContractService);

  @Input({ required: true }) payload!: Record<string, unknown>;

  contenido(): string | null {
    const contenido = this.payload['contenido'];
    return typeof contenido === 'string' ? contenido : null;
  }

  textoInvalido(): string {
    return this.contrato.texto('feed.block.text.invalid');
  }
}
