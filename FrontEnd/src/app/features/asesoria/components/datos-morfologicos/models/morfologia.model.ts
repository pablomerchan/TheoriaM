export interface RasgoColorimetrico {
  elemento: string;
  muestra_visual: string; // Base64 data URL, image URL, or hex color representation
  descripcion: string;
  es_imagen: boolean;
}

export interface Morfologia {
  usuario_id?: string;
  sexo: string;
  edad: number;
  ubicacion_principal: string;
  ubicacion_secundaria: string;
  estatura_cm: number;
  peso_kg: number;
  medida_hombros_cm?: number;
  medida_cintura_cm?: number;
  medida_cadera_cm?: number;
  medida_busto_cm?: number;
  rasgos: RasgoColorimetrico[];
  climas: string[];
}
