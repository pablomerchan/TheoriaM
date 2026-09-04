import { Component, OnInit, Input, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MorfologiaService } from './services/morfologia.service';
import { Morfologia, RasgoColorimetrico } from './models/morfologia.model';
import { MaestrasService } from '../../../../services/maestras.service';

@Component({
  selector: 'app-datos-morfologicos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './datos-morfologicos.component.html',
  styleUrls: ['./datos-morfologicos.component.scss']
})
export class DatosMorfologicosComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private morfologiaService = inject(MorfologiaService);
  private maestrasService = inject(MaestrasService);

  @Input() idUsuario: string = '1';

  form!: FormGroup;
  editingIndex: number | null = null;

  // Options
  opcionesSexo: string[] = ['femenino', 'masculino', 'otro'];
  opcionesColorPiel: string[] = [];
  opcionesColorOjos: string[] = [];
  opcionesColorCabello: string[] = [];
  opcionesClimas: string[] = [];
  opcionesUbicaciones: string[] = [];

  // UI state
  enviando = false;
  guardadoExitoso = false;
  errorMsg = '';
  dragOverElement: string | null = null;

  private subscription: Subscription = new Subscription();

  ngOnInit(): void {
    this.initForm();
    this.loadDropdownOptions();
    this.loadUserData();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private initForm(): void {
    this.form = this.fb.group({
      usuario_id: [this.idUsuario],
      sexo: ['', Validators.required],
      edad: [null, [Validators.required, Validators.min(1), Validators.max(120)]],
      ubicacion_principal: ['', Validators.required],
      ubicacion_secundaria: ['', Validators.required],
      estatura_cm: [null, [Validators.required, Validators.min(50), Validators.max(280)]],
      peso_kg: [null, [Validators.required, Validators.min(10), Validators.max(500)]],
      medida_hombros_cm: [null],
      medida_cintura_cm: [null],
      medida_cadera_cm: [null],
      medida_busto_cm: [null],
      climas: [[]],
      rasgos: this.fb.array([])
    });

    // Reactive validator adjustments based on gender
    this.subscription.add(
      this.form.get('sexo')?.valueChanges.subscribe(sexo => {
        const measurementControls = ['medida_hombros_cm', 'medida_cintura_cm', 'medida_cadera_cm', 'medida_busto_cm'];
        measurementControls.forEach(ctrlName => {
          const ctrl = this.form.get(ctrlName);
          if (sexo === 'femenino') {
            ctrl?.setValidators([Validators.required, Validators.min(10), Validators.max(300)]);
          } else {
            ctrl?.clearValidators();
          }
          ctrl?.updateValueAndValidity();
        });
      })
    );
  }

  private loadDropdownOptions(): void {
    this.maestrasService.getMenuOptions('Color de piel').subscribe(opts => this.opcionesColorPiel = opts);
    this.maestrasService.getMenuOptions('Color de ojos').subscribe(opts => this.opcionesColorOjos = opts);
    this.maestrasService.getMenuOptions('Color de cabello').subscribe(opts => this.opcionesColorCabello = opts);
    this.maestrasService.getMenuOptions('Clima habitual de residencia').subscribe(opts => this.opcionesClimas = opts);
    this.maestrasService.getUbicaciones().subscribe(opts => this.opcionesUbicaciones = opts);
  }

  private loadUserData(): void {
    this.subscription.add(
      this.morfologiaService.getDatos(this.idUsuario).subscribe(data => {
        if (data) {
          this.form.patchValue({
            usuario_id: data.usuario_id || this.idUsuario,
            sexo: data.sexo,
            edad: data.edad || null,
            ubicacion_principal: data.ubicacion_principal,
            ubicacion_secundaria: data.ubicacion_secundaria,
            estatura_cm: data.estatura_cm || null,
            peso_kg: data.peso_kg || null,
            medida_hombros_cm: data.medida_hombros_cm || null,
            medida_cintura_cm: data.medida_cintura_cm || null,
            medida_cadera_cm: data.medida_cadera_cm || null,
            medida_busto_cm: data.medida_busto_cm || null,
            climas: data.climas || []
          });

          this.populateRasgos(data.rasgos);
        }
      })
    );
  }

  get rasgosArray(): FormArray {
    return this.form.get('rasgos') as FormArray;
  }

  private populateRasgos(rasgos: RasgoColorimetrico[]): void {
    const array = this.rasgosArray;
    array.clear();
    rasgos.forEach(r => {
      array.push(this.fb.group({
        elemento: [r.elemento, Validators.required],
        muestra_visual: [r.muestra_visual],
        descripcion: [r.descripcion, Validators.required],
        es_imagen: [r.es_imagen]
      }));
    });
  }

  // Drag and Drop & File Upload handlers
  onDragOver(event: DragEvent, element: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOverElement = element;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOverElement = null;
  }

  onDrop(event: DragEvent, element: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOverElement = null;

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      this.processImageFile(file, element);
    }
  }

  onFileSelected(event: Event, element: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.processImageFile(file, element);
    }
  }

  private processImageFile(file: File, element: string): void {
    if (!file.type.startsWith('image/')) {
      this.errorMsg = 'Por favor selecciona únicamente archivos de imagen.';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      this.updateRasgoImage(element, base64String);
    };
    reader.readAsDataURL(file);
  }

  private updateRasgoImage(element: string, base64String: string): void {
    const array = this.rasgosArray;
    let found = false;

    for (let i = 0; i < array.length; i++) {
      const group = array.at(i);
      if (group.get('elemento')?.value.toLowerCase() === element.toLowerCase()) {
        group.get('muestra_visual')?.setValue(base64String);
        group.get('es_imagen')?.setValue(true);
        found = true;
        break;
      }
    }

    if (!found) {
      array.push(this.fb.group({
        elemento: [element, Validators.required],
        muestra_visual: [base64String],
        descripcion: ['', Validators.required],
        es_imagen: [true]
      }));
    }
    this.errorMsg = '';
  }

  // Interactive Table CRUD actions
  editarRasgo(index: number): void {
    this.editingIndex = index;
  }

  guardarRasgo(): void {
    const row = this.rasgosArray.at(this.editingIndex!);
    if (row.valid) {
      this.editingIndex = null;
    } else {
      this.errorMsg = 'Por favor completa los campos de rasgo válidamente antes de guardar.';
    }
  }

  cancelarEdicion(): void {
    this.editingIndex = null;
    this.errorMsg = '';
    // Reload data to reset edits
    this.loadUserData();
  }

  eliminarRasgo(index: number): void {
    if (confirm('¿Estás seguro de que deseas eliminar este rasgo?')) {
      this.rasgosArray.removeAt(index);
    }
  }

  agregarRasgo(): void {
    const array = this.rasgosArray;
    const newGroup = this.fb.group({
      elemento: ['', Validators.required],
      muestra_visual: [''],
      descripcion: ['', Validators.required],
      es_imagen: [false]
    });
    array.push(newGroup);
    this.editingIndex = array.length - 1;
  }

  // Toggle climates
  toggleClima(clima: string): void {
    const ctrl = this.form.get('climas');
    const currentClimas: string[] = ctrl?.value || [];
    if (currentClimas.includes(clima)) {
      ctrl?.setValue(currentClimas.filter(c => c !== clima));
    } else {
      ctrl?.setValue([...currentClimas, clima]);
    }
  }

  isClimaSelected(clima: string): boolean {
    const currentClimas: string[] = this.form.get('climas')?.value || [];
    return currentClimas.includes(clima);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.errorMsg = 'Por favor completa todos los campos requeridos correctamente.';
      return;
    }

    this.enviando = true;
    this.errorMsg = '';
    this.guardadoExitoso = false;

    const data: Morfologia = this.form.value;

    this.morfologiaService.saveDatos(data).subscribe({
      next: () => {
        this.enviando = false;
        this.guardadoExitoso = true;
        setTimeout(() => this.guardadoExitoso = false, 5000);
      },
      error: (err) => {
        this.enviando = false;
        this.errorMsg = 'Ocurrió un error al guardar tus datos morfológicos.';
        console.error(err);
      }
    });
  }
}
