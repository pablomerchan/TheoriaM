import {
  Component,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  Input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Subscription } from 'rxjs';

export interface PrendaClasificacion {
  descripcion: string;
  categoria: string;
  tipo: string;
  material: string;
  estado: string;
  clima: string;
  ocasiones: string[];
}

export interface MiGuardaRopasConfig {
  prenda?: PrendaClasificacion;
  opciones?: {
    categorias: string[];
    tipos: string[];
    materiales: string[];
    estados: string[];
    climas: string[];
    ocasiones: string[];
  };
}

@Component({
  selector: 'app-mi-guarda-ropas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './mi-guarda-ropas.component.html',
  styleUrls: ['./mi-guarda-ropas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MiGuardaRopasComponent implements OnInit, OnChanges, OnDestroy {
  // ── Inputs ────────────────────────────────────────────────────────────────
  @Input() idUsuario: any = '1';
  @Input() tipoAsesoria?: string;

  // ── Servicios ─────────────────────────────────────────────────────────────
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  private readonly apiUrl = 'http://localhost:3000/api/asesoria/articulo';
  private subscription = new Subscription();

  // ── Opciones de Clasificación (Valores por defecto en caso de fallo) ───────
  categoriasOptions: string[] = [
    'Superior > Camisa',
    'Superior > Camiseta',
    'Superior > Top',
    'Superior > Blusa',
    'Inferior > Pantalón',
    'Inferior > Falda',
    'Inferior > Short',
    'Abrigo > Chaqueta',
    'Abrigo > Blazer',
    'Calzado > Tenis'
  ];

  tiposOptions: string[] = [
    'Manga corta',
    'Manga larga',
    'Sin mangas',
    'Tres cuartos',
    'Regular'
  ];

  materialesOptions: string[] = [
    'Lino',
    'Algodón',
    'Lana',
    'Seda',
    'Mezclilla (Denim)',
    'Poliéster'
  ];

  estadosOptions: string[] = [
    'Excelente',
    'Bueno',
    'Regular',
    'Desgastado'
  ];

  climasOptions: string[] = [
    'Verano',
    'Primavera',
    'Otoño',
    'Invierno',
    'Templado',
    'Lluvia'
  ];

  // ── Estado de Ocasiones/Tags ──────────────────────────────────────────────
  ocasionesSeleccionadas: string[] = ['Casual', 'Fin de semana', 'Playa'];
  nuevaOcasionalVal: string = '';

  // ── Control de Formularios y Modales de Desplegables ──────────────────────
  prendaForm!: FormGroup;
  activeDropdown: string | null = null; // 'categoria' | 'tipo' | 'material' | 'estado' | 'clima'
  isLoading: boolean = false;

  // ── Notificaciones / Toast ────────────────────────────────────────────────
  showToast: boolean = false;
  toastMessage: string = '';
  toastType: 'success' | 'info' | 'error' = 'success';

  // Copia de los datos originales cargados del backend para la función Descartar
  private originalData: PrendaClasificacion | null = null;

  constructor() {
    this.initForm();
  }

  ngOnInit(): void {
    this.cargarConfiguracion();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const changed = changes['idUsuario'] || changes['tipoAsesoria'];
    if (changed && !changed.firstChange) {
      this.cargarConfiguracion();
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  // ── Inicialización del Formulario Reactivo ──────────────────────────────
  private initForm(): void {
    this.prendaForm = this.fb.group({
      descripcion: ['Camisa blanca', [Validators.required, Validators.maxLength(150)]],
      categoria: ['Superior > Camisa', [Validators.required]],
      tipo: ['Manga corta', [Validators.required]],
      material: ['Lino', [Validators.required]],
      estado: ['Excelente', [Validators.required]],
      clima: ['Verano', [Validators.required]]
    });
  }

  // ── Carga dinámica de la base de datos (tbl_articulo) ──────────────────────
  private cargarConfiguracion(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    let params = new HttpParams().set('id_usuario', this.idUsuario.toString());
    if (this.tipoAsesoria) {
      params = params.set('tipo_asesoria', this.tipoAsesoria);
    }

    this.subscription.add(
      this.http.get<any>(this.apiUrl, { params }).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response && response.texto_html) {
            this.parsearConfiguracion(response.texto_html);
          }
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('[MiGuardaRopas] Error al cargar la configuración de la BD:', err);
          this.isLoading = false;
          // Si hay error, se conservan los valores por defecto del constructor y HTML
          this.originalData = { ...this.prendaForm.value, ocasiones: [...this.ocasionesSeleccionadas] };
          this.cdr.markForCheck();
        }
      })
    );
  }

  private parsearConfiguracion(rawJson: string): void {
    try {
      const config = JSON.parse(rawJson) as MiGuardaRopasConfig;
      if (config) {
        // Cargar opciones dinámicamente si vienen de la BD
        if (config.opciones) {
          this.categoriasOptions = config.opciones.categorias || this.categoriasOptions;
          this.tiposOptions = config.opciones.tipos || this.tiposOptions;
          this.materialesOptions = config.opciones.materiales || this.materialesOptions;
          this.estadosOptions = config.opciones.estados || this.estadosOptions;
          this.climasOptions = config.opciones.climas || this.climasOptions;
        }

        // Cargar datos por defecto de la prenda
        if (config.prenda) {
          this.prendaForm.patchValue({
            descripcion: config.prenda.descripcion || 'Camisa blanca',
            categoria: config.prenda.categoria || 'Superior > Camisa',
            tipo: config.prenda.tipo || 'Manga corta',
            material: config.prenda.material || 'Lino',
            estado: config.prenda.estado || 'Excelente',
            clima: config.prenda.clima || 'Verano'
          });

          if (Array.isArray(config.prenda.ocasiones)) {
            this.ocasionesSeleccionadas = [...config.prenda.ocasiones];
          }
        }

        // Guardar estado original
        this.originalData = {
          ...this.prendaForm.value,
          ocasiones: [...this.ocasionesSeleccionadas]
        };
      }
    } catch (e) {
      console.error('[MiGuardaRopas] Error al parsear JSON de configuración de tbl_articulo:', e);
      // Fallback seguro de guardado original
      this.originalData = {
        ...this.prendaForm.value,
        ocasiones: [...this.ocasionesSeleccionadas]
      };
    }
  }

  // ── Gestión de Desplegables Interactivos ──────────────────────────────────
  toggleDropdown(dropdownName: string, event: Event): void {
    event.stopPropagation();
    if (this.activeDropdown === dropdownName) {
      this.activeDropdown = null;
    } else {
      this.activeDropdown = dropdownName;
    }
    this.cdr.markForCheck();
  }

  selectOption(controlName: string, optionValue: string): void {
    const control = this.prendaForm.get(controlName);
    if (control) {
      control.setValue(optionValue);
      control.markAsDirty();
    }
    this.activeDropdown = null;
    this.cdr.markForCheck();
  }

  closeDropdowns(): void {
    if (this.activeDropdown !== null) {
      this.activeDropdown = null;
      this.cdr.markForCheck();
    }
  }

  // ── Gestión de Chips/Etiquetas de Ocasión ──────────────────────────────────
  removerOcasion(idx: number): void {
    this.ocasionesSeleccionadas.splice(idx, 1);
    this.cdr.markForCheck();
  }

  agregarOcasion(inputElement: HTMLInputElement): void {
    const val = inputElement.value ? inputElement.value.trim() : '';
    if (val) {
      // Validar duplicados y vacío de forma segura
      if (this.ocasionesSeleccionadas.map(o => o.toLowerCase()).includes(val.toLowerCase())) {
        this.triggerToast('La etiqueta ya está agregada.', 'info');
      } else {
        this.ocasionesSeleccionadas.push(val);
        inputElement.value = '';
      }
    }
    this.cdr.markForCheck();
  }

  // ── Botones de Acción ─────────────────────────────────────────────────────
  guardarPrenda(): void {
    if (this.prendaForm.invalid) {
      this.triggerToast('Por favor, ingresa una descripción para la prenda.', 'error');
      return;
    }

    const data: PrendaClasificacion = {
      ...this.prendaForm.value,
      ocasiones: [...this.ocasionesSeleccionadas]
    };

    console.log('[MiGuardaRopas] Guardando prenda digitalizada:', data);
    this.triggerToast('¡Prenda digitalizada y guardada exitosamente!', 'success');
  }

  descartarCambios(): void {
    if (this.originalData) {
      this.prendaForm.patchValue({
        descripcion: this.originalData.descripcion,
        categoria: this.originalData.categoria,
        tipo: this.originalData.tipo,
        material: this.originalData.material,
        estado: this.originalData.estado,
        clima: this.originalData.clima
      });
      this.ocasionesSeleccionadas = [...this.originalData.ocasiones];
      this.triggerToast('Cambios descartados. Formulario restablecido.', 'info');
    } else {
      this.initForm();
      this.ocasionesSeleccionadas = ['Casual', 'Fin de semana', 'Playa'];
    }
    this.activeDropdown = null;
    this.cdr.markForCheck();
  }

  anadirNuevaPrenda(): void {
    // Limpia el formulario y permite registrar otra prenda
    this.prendaForm.reset({
      descripcion: '',
      categoria: this.categoriasOptions[0] || '',
      tipo: this.tiposOptions[0] || '',
      material: this.materialesOptions[0] || '',
      estado: this.estadosOptions[0] || '',
      clima: this.climasOptions[0] || ''
    });
    this.ocasionesSeleccionadas = [];
    this.activeDropdown = null;
    this.triggerToast('Formulario limpio. Introduce los detalles de tu nueva prenda.', 'info');
    this.cdr.markForCheck();
  }

  // ── Toasts de Feedback ────────────────────────────────────────────────────
  private triggerToast(message: string, type: 'success' | 'info' | 'error' = 'success'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    this.cdr.markForCheck();

    setTimeout(() => {
      this.showToast = false;
      this.cdr.markForCheck();
    }, 3500);
  }
}
