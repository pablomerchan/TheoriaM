import { Injectable } from '@angular/core';

import { FEED_MOCK_CONTRACT } from './data/feed-mock-contract';

@Injectable({
  providedIn: 'root'
})
export class FeedContractService {
  texto(clave: string): string {
    const texto = FEED_MOCK_CONTRACT.textos[clave];
    if (texto === undefined) {
      throw new Error(`No existe la clave de texto "${clave}" en el contrato del feed.`);
    }
    return texto;
  }

  saludo(seudonimo: string): string {
    return this.texto('feed.greeting').replace('{seudonimo}', seudonimo);
  }
}
