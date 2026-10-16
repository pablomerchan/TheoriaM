import { Injectable } from '@angular/core';

import { DefinicionFormulario, FORMS_MOCK_CONTRACT } from './data/forms-mock-contract';

@Injectable({
  providedIn: 'root'
})
export class FeedFormDefinitionService {
  obtener(formId: string): DefinicionFormulario | null {
    return FORMS_MOCK_CONTRACT.find((formulario) => formulario.formId === formId) ?? null;
  }
}
