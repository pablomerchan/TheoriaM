export interface DatosMorfologicos {
  usuario_id?: string;
  sexo: string;
  edad: number;
  color_piel: string;
  color_ojos: string;
  color_cabello: string;
  peso_kg: number;
  estatura_cm: number;
  climas: string[];
  ubicacion_principal: string;
  ubicacion_secundaria: string;
  medida_hombros_cm?: number;
  medida_cintura_cm?: number;
  medida_cadera_cm?: number;
  medida_busto_cm?: number;
}
