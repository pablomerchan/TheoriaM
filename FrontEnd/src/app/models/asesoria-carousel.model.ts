import { SafeHtml } from '@angular/platform-browser';

/**
 * Modelo de datos para items del carrusel de asesorías (tbl_asesoria).
 * Origen: Tabla 'tbl_asesoria' en la BD 'asesoria'.
 * Se filtra por:
 *   - id_usuario: ID del usuario propietario del item
 *   - tipo_asesoria: Categoría del item (ej: 'Prendas', 'Accesorios', etc.)
 *   - visible: Solo mostrar items visibles (visible=true o visible=1)
 */
export interface Asesoria {
  /** ID único del item en la BD */
  id: number;

  /** Nombre visible del item o slide */
  nombre?: string;

  /** URL de la imagen asociada */
  imagen_url: string;

  /** Campo HTML crudo que llega de la API (columna 'text_html' en la BD).
   *  Puede contener el marcador <!-- CAROUSEL_MARKER --> para insertar el carrusel. */
  text_html?: string;

  /** Versión sanitizada de text_html, usada por el template via [innerHTML]. */
  texto_html?: string | SafeHtml;

  /** Orden de visualización en el carrusel (ascendente). */
  orden?: number;

  /** ID del usuario propietario de este item. Filtro: items mostrados solo para su usuario. */
  id_usuario?: number;

  /** ID de la asesoría/menú asociado (referencia a tbl_menu_servicios). */
  asesoria_id?: number;

  /** Tipo de asesoría/categoría (ej: 'Blusa Wrap', 'Accesorios', etc.). */
  tipo_asesoria?: string;

  /** Visibilidad del item. Solo mostrar si visible=true o visible=1. */
  visible?: boolean | number;

  /** Grupo al que pertenece este item. Usado para agrupar carruseles. */
  grupo_id?: string;
}
