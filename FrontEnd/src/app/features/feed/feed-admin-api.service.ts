import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClientService } from '../../core/api-client.service';

export interface CondicionFeed {
  atributo: string;
  operador: string;
  valor: unknown;
}

export interface ReglasFeed {
  modo: 'todos' | 'alguno';
  condiciones: CondicionFeed[];
}

export interface ArticuloAdministrableFeed {
  id: number;
  titulo: string;
  publicado_en: string;
  estado: 0 | 1 | 2;
  contenido: string;
  contenido_editable: boolean;
  reglas: ReglasFeed | null;
}

export interface GuardarArticuloFeed {
  titulo: string;
  contenido?: string;
  estado: 0 | 1 | 2;
  reglas: ReglasFeed | null;
}

@Injectable({ providedIn: 'root' })
export class FeedAdminApiService {
  private readonly api = inject(ApiClientService);

  listar(): Observable<ArticuloAdministrableFeed[]> {
    return this.api.get<ArticuloAdministrableFeed[]>('v1/feed/admin/articulos');
  }

  crear(articulo: GuardarArticuloFeed): Observable<{ id: number }> {
    return this.api.post<{ id: number }>('v1/feed/admin/articulos', articulo);
  }

  actualizar(
    id: number,
    articulo: GuardarArticuloFeed
  ): Observable<{ id: number }> {
    return this.api.put<{ id: number }>(
      `v1/feed/admin/articulos/${id}`,
      articulo
    );
  }
}
