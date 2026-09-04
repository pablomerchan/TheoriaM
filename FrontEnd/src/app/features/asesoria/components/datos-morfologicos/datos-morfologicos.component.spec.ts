import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { DatosMorfologicosComponent } from './datos-morfologicos.component';
import { MorfologiaService } from './services/morfologia.service';
import { MaestrasService } from '../../../../services/maestras.service';

describe('DatosMorfologicosComponent (Unit Tests)', () => {
  let component: DatosMorfologicosComponent;
  let fixture: ComponentFixture<DatosMorfologicosComponent>;
  let morfologiaServiceSpy: any;
  let maestrasServiceSpy: any;

  const mockMorfologiaData = {
    usuario_id: '1',
    sexo: 'femenino',
    edad: 28,
    ubicacion_principal: 'París',
    ubicacion_secundaria: 'Milán',
    estatura_cm: 170,
    peso_kg: 60,
    medida_hombros_cm: 40,
    medida_cintura_cm: 65,
    medida_cadera_cm: 95,
    medida_busto_cm: 88,
    climas: ['Templado'],
    rasgos: [
      { elemento: 'Piel', muestra_visual: 'data:image/png;base64,123', descripcion: 'Claro cálido', es_imagen: true },
      { elemento: 'Ojos', muestra_visual: 'data:image/png;base64,456', descripcion: 'Verde esmeralda', es_imagen: true },
      { elemento: 'Cabello', muestra_visual: 'data:image/png;base64,789', descripcion: 'Castaño oscuro', es_imagen: true }
    ]
  };

  beforeEach(async () => {
    morfologiaServiceSpy = {
      getDatos: vi.fn().mockReturnValue(of(mockMorfologiaData)),
      saveDatos: vi.fn().mockReturnValue(of({ id: 42, mensaje: 'Guardado con éxito' })),
      setActiveMenuId: vi.fn(),
      activeMenuId$: of(null),
      morfologia$: of(null)
    };

    maestrasServiceSpy = {
      getMenuOptions: vi.fn().mockReturnValue(of(['Claro cálido', 'Verde', 'Castaño', 'Templado'])),
      getUbicaciones: vi.fn().mockReturnValue(of(['París', 'Milán', 'Madrid']))
    };

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, DatosMorfologicosComponent],
      providers: [
        { provide: MorfologiaService, useValue: morfologiaServiceSpy },
        { provide: MaestrasService, useValue: maestrasServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DatosMorfologicosComponent);
    component = fixture.componentInstance;
    component.idUsuario = '1';
    fixture.detectChanges();
  });

  it('debería crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('debería inicializar el formulario con datos cargados', () => {
    expect(component.form).toBeTruthy();
    expect(component.form.get('sexo')?.value).toBe('femenino');
    expect(component.form.get('edad')?.value).toBe(28);
    expect(component.rasgosArray.length).toBe(3);
  });

  it('debería requerir las medidas corporales si el sexo es femenino', () => {
    const sexoCtrl = component.form.get('sexo');
    const hombrosCtrl = component.form.get('medida_hombros_cm');

    // Cambiar a femenino
    sexoCtrl?.setValue('femenino');
    fixture.detectChanges();
    expect(hombrosCtrl?.validator).toBeDefined();

    // Cambiar a masculino
    sexoCtrl?.setValue('masculino');
    fixture.detectChanges();
    // Debe limpiar los validadores
    expect(hombrosCtrl?.errors).toBeNull();
  });

  it('debería validar campos obligatorios vacíos', () => {
    component.form.get('edad')?.setValue(null);
    expect(component.form.valid).toBe(false);
  });

  it('debería permitir editar un rasgo inline en la tabla', () => {
    expect(component.editingIndex).toBeNull();

    // Iniciar edición del primer rasgo
    component.editarRasgo(0);
    expect(component.editingIndex).toBe(0);

    // Guardar cambios
    component.guardarRasgo();
    expect(component.editingIndex).toBeNull();
  });

  it('debería permitir cancelar la edición de un rasgo', () => {
    component.editarRasgo(1);
    expect(component.editingIndex).toBe(1);

    component.cancelarEdicion();
    expect(component.editingIndex).toBeNull();
  });

  it('debería permitir agregar un nuevo rasgo personalizado', () => {
    const longitudInicial = component.rasgosArray.length;
    component.agregarRasgo();

    expect(component.rasgosArray.length).toBe(longitudInicial + 1);
    expect(component.editingIndex).toBe(component.rasgosArray.length - 1);
  });

  it('debería permitir eliminar un rasgo existente de la tabla', () => {
    const longitudInicial = component.rasgosArray.length;
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    component.eliminarRasgo(0);

    expect(component.rasgosArray.length).toBe(longitudInicial - 1);
  });

  it('debería actualizar el estado de climas seleccionados', () => {
    expect(component.isClimaSelected('Cálido')).toBe(false);

    component.toggleClima('Cálido');
    expect(component.isClimaSelected('Cálido')).toBe(true);

    component.toggleClima('Cálido');
    expect(component.isClimaSelected('Cálido')).toBe(false);
  });

  it('debería procesar correctamente el envío del formulario', () => {
    component.onSubmit();
    expect(morfologiaServiceSpy.saveDatos).toHaveBeenCalled();
    expect(component.guardadoExitoso).toBe(true);
  });
});
