export type ValorFormulario = string | number | boolean | null;

interface CampoBase {
  clave: string;
  claveEtiqueta: string;
  requerido: boolean;
}

export type CampoFormulario =
  | (CampoBase & {
      tipo: 'texto' | 'areaTexto';
      maxLength?: number;
    })
  | (CampoBase & {
      tipo: 'numero';
      minimo?: number;
      maximo?: number;
      paso?: number;
    })
  | (CampoBase & {
      tipo: 'seleccion';
      opciones: Array<{ valor: string; claveEtiqueta: string }>;
    })
  | (CampoBase & {
      tipo: 'casilla';
    });

export interface DefinicionFormulario {
  formId: string;
  claveTitulo: string;
  claveDescripcion: string;
  campos: CampoFormulario[];
}

export const FORMS_MOCK_CONTRACT: readonly DefinicionFormulario[] = [
  {
    formId: 'estado-animo',
    claveTitulo: 'feed.form.estado.title',
    claveDescripcion: 'feed.form.estado.description',
    campos: [
      {
        clave: 'estado',
        tipo: 'seleccion',
        claveEtiqueta: 'feed.form.estado.field',
        requerido: true,
        opciones: [
          { valor: 'bien', claveEtiqueta: 'feed.form.estado.option.positive' },
          { valor: 'regular', claveEtiqueta: 'feed.form.estado.option.neutral' },
          { valor: 'apoyo', claveEtiqueta: 'feed.form.estado.option.negative' }
        ]
      },
      {
        clave: 'comentario',
        tipo: 'areaTexto',
        claveEtiqueta: 'feed.form.comment.field',
        requerido: false,
        maxLength: 1000
      }
    ]
  }
];
