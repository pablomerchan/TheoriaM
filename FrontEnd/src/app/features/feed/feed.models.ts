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
  me_gusta: boolean;
  total_me_gusta: number;
  comentarios: ComentarioFeed[];
  bloques: BloqueFeed[];
}

export interface ComentarioFeed {
  id: number;
  autor: string;
  contenido: string;
  creado_en: string;
}

export interface RespuestaMeGustaFeed {
  me_gusta: boolean;
  total_me_gusta: number;
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
