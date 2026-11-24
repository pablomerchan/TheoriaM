import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClientService } from '../../core/api-client.service';
import { OpcionMenuFeed } from './feed.models';

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
  prioridad: number;
  contenido: string;
  contenido_editable: boolean;
  reglas: ReglasFeed | null;
  asignaciones: AsignacionMenuFeed[];
}

export interface AsignacionMenuFeed {
  menu_id: string;
  orden: number;
}

export interface GuardarArticuloFeed {
  titulo: string;
  contenido?: string;
  estado: 0 | 1 | 2;
  prioridad: number;
  reglas: ReglasFeed | null;
  asignaciones: AsignacionMenuFeed[];
}

@Injectable({ providedIn: 'root' })
export class FeedAdminApiService {
  private readonly api = inject(ApiClientService);

  listarArchivosHtml(): Observable<string[]> {
    return this.api.get<string[]>('v1/feed/admin/articulos/archivos-html');
  }

  listar(): Observable<ArticuloAdministrableFeed[]> {
    return this.api.get<ArticuloAdministrableFeed[]>('v1/feed/admin/articulos');
  }

  listarMenus(): Observable<OpcionMenuFeed[]> {
    return this.api.get<OpcionMenuFeed[]>('v1/feed/menu');
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
