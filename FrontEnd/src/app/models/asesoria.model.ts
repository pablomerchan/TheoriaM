import { SafeHtml } from '@angular/platform-browser';

export interface MenuServicioItem {
  id: number;
  tema: string;
  subtema: string;
  texto_html: string | SafeHtml;
  imagen_url: string;
  imagen_alt: string;
  texto_derecho_html?: string | SafeHtml;
  orden?: number;
  visible?: boolean | number;
  id_usuario?: number;
}

export interface AsesoriaArticulo {
  id: number;
  menu_servicio_id: number;
  texto_html: string | SafeHtml;
  imagen_url: string;
  imagen_alt: string;
  orden?: number;
  /** Tipo de asesoría: determina qué componente se usa para renderizar. */
  tipo_asesoria?: string;
  /** id del usuario propietario del artículo. */
  id_usuario?: number;
  /** Partes del HTML cuando contiene el marcador CAROUSEL_MARKER. */
  texto_html_parts?: (string | SafeHtml)[];
}

/**
 * Definición de un componente dinámico proveniente de tbl_menu_asesoria.
 * El campo 'componente' indica qué renderizar:
 *   - 'carousel'   → AsesoriaCarouselComponent (datos de tbl_carrusel_items)
 *   - 'rapida'     → AsesoriaRapidaComponent   (datos de tbl_asesoria_rapida)
 *   - 'articulo'   → ArticuloComponent          (datos de tbl_articulo)
 *   - 'texto_gpt'  → TextoGPTComponent          (datos de tbl_articulo, solo texto_html)
 * El campo tipo_asesoria filtra el contenido del componente.
 */
export interface CarruselDefinicion {
  id: number;
  menu_servicio_id: number;
  tipo_asesoria: string;
  orden: number;
  /** Tipo de componente a renderizar */
  componente: 'carousel' | 'rapida' | 'articulo' | 'texto_gpt' | 'sugerencia_diaria' | 'mi_guarda_ropas' | 'guia_compras';
  titulo?: string;
}
