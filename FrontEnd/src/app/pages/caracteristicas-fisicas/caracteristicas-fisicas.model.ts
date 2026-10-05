export interface CaracteristicasFisicas {
  color_piel: string;
  color_ojos: string;
  color_cabello: string;
  ubicacion_principal: string;
  ubicacion_secundaria: string;
  peso_kg: number | null;
  estatura_cm: number | null;
}

export interface TextoCaracteristicasFisicas {
  id: number;
  clave?: string;
  campo?: string;
  titulo: string;
  contenido_html: string;
  orden: number;
}
