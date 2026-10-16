export interface BloqueFeed {
  id: number;
  orden: number;
  tipo: string;
  payload: Record<string, unknown>;
}

export interface ArticuloFeed {
  id: number;
  titulo: string;
  publicado_en: string;
  bloques: BloqueFeed[];
}

export interface PaginaFeed {
  items: ArticuloFeed[];
  siguienteCursor: string | null;
}

export type DestinoMenuFeed = 'feed' | 'ruta' | 'panel' | 'accion';

export interface OpcionMenuFeed {
  id: string;
  etiqueta: string;
  icono: string;
  destino: DestinoMenuFeed;
  valor: string;
  criterio_filtro: string | null;
}
