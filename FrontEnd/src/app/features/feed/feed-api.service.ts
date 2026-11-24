import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClientService } from '../../core/api-client.service';
import {
  ArticuloIndiceFeed,
  ComentarioFeed,
  OpcionMenuFeed,
  PaginaFeed,
  RespuestaMeGustaFeed
} from './feed.models';

const LIMITE_POR_TANDA = 10;

@Injectable({
  providedIn: 'root'
})
export class FeedApiService {
  private readonly api = inject(ApiClientService);

  listar(cursor: string | null, menuId = 'inicio'): Observable<PaginaFeed> {
    let params = new HttpParams()
      .set('limite', LIMITE_POR_TANDA)
      .set('menu', menuId);
    if (cursor) {
      params = params.set('cursor', cursor);
    }
    return this.api.get<PaginaFeed>('v1/feed', params);
  }

  listarMenu(): Observable<OpcionMenuFeed[]> {
    return this.api.get<OpcionMenuFeed[]>('v1/feed/menu');
  }

  listarIndice(menuId: string): Observable<ArticuloIndiceFeed[]> {
    const params = new HttpParams().set('menu', menuId);
    return this.api.get<ArticuloIndiceFeed[]>('v1/feed/indice', params);
  }

  alternarMeGusta(articuloId: number): Observable<RespuestaMeGustaFeed> {
    return this.api.post<RespuestaMeGustaFeed>(
      `v1/feed/articulos/${articuloId}/me-gusta`,
      {}
    );
  }

  crearComentario(articuloId: number, contenido: string): Observable<ComentarioFeed> {
    return this.api.post<ComentarioFeed>(
      `v1/feed/articulos/${articuloId}/comentarios`,
      { contenido }
    );
  }
}
