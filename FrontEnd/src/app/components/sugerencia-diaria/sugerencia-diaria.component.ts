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
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Subscription } from 'rxjs';

export interface Prenda {
  nombre: string;
  imagen: string;
}

export interface ClimaConfig {
  ciudad: string;
  temperatura: string;
  estado: string;
}

export interface SugerenciaDiariaData {
  guardarropas: string;
  gustos: string;
  medidas: string;
  dia: string;
  hora: string;
  contexto: string;
  clima: ClimaConfig;
  lucir: string;
  razonamiento: string;
  prendas: Prenda[];
}

@Component({
  selector: 'app-sugerencia-diaria',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sugerencia-diaria.component.html',
  styleUrls: ['./sugerencia-diaria.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SugerenciaDiariaComponent implements OnInit, OnChanges, OnDestroy {
  // ── Inputs ────────────────────────────────────────────────────────────────
  @Input() idUsuario: any = '1';
  @Input() tipoAsesoria?: string;

  // ── Services ─────────────────────────────────────────────────────────────
  private http = inject(HttpClient);
  private cdr  = inject(ChangeDetectorRef);

  private readonly apiUrl = 'http://localhost:3000/api/asesoria/articulo';
  private subscription = new Subscription();

  // ── Options for Dropdowns (Mapeadas para interacción) ──────────────────────
  guardarropasOptions: string[] = ['Disponible', 'No disponible'];
  gustosOptions: string[] = ['Disponibles', 'No disponibles'];
  medidasOptions: string[] = ['Si', 'No'];
  diaOptions: string[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  horaOptions: string[] = ['07 AM', '08 AM', '09 AM', '10 AM', '11 AM', '12 PM', '01 PM', '02 PM', '03 PM', '04 PM', '05 PM', '06 PM', '07 PM', '08 PM'];
  contextoOptions: string[] = ['laboral', 'Deportivo', 'Informal', 'Coctel', 'Gala'];
  ciudadOptions: string[] = ['Medellín', 'Bogotá', 'Cali', 'Barranquilla', 'Cartagena'];
  tempOptions: string[] = ['15 C', '18 C', '20 C', '22 C', '25 C', '28 C', '30 C'];
  climaOptions: string[] = ['Lluvia', 'Soleado', 'Nublado', 'Tormenta', 'Templado'];
  lucirOptions: string[] = ['Formal', 'Casual', 'Elegante', 'Deportivo'];

  // ── Component State ───────────────────────────────────────────────────────
  isLoading: boolean = false;
  isRecalculating: boolean = false;
  showToast: boolean = false;
  toastMessage: string = '';

  // Current selections
  guardarropasSel: string = 'No disponible';
  gustosSel: string = 'No disponibles';
  medidasSel: string = 'Si';
  diaSel: string = 'Lunes';
  horaSel: string = '07 AM';
  contextoSel: string = 'laboral';
  ciudadSel: string = 'Medellín';
  tempSel: string = '22 C';
  climaSel: string = 'Lluvia';
  lucirSel: string = 'Formal';

  razonamientoText: string = 'Lucir formal, cómoda pero protegida para la lluvia';
  prendasRecomendadas: Prenda[] = [
    { nombre: 'Blazer Lavanda', imagen: '/images/prendas/BlazerLavanda.png' },
    { nombre: 'Camisa Blanca', imagen: '/images/prendas/CamisaBlanca.png' },
    { nombre: 'Pantalón Negro', imagen: '/images/prendas/PantalonNegro.png' },
    { nombre: 'Botines Lluvia', imagen: '/images/prendas/BotinesLluvia.png' }
  ];

  // ══════════════════════════════════════════════════════════════════════════
  //  Lifecycle
  // ══════════════════════════════════════════════════════════════════════════

  ngOnInit(): void {
    this.cargarSugerencia();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const changed = changes['idUsuario'] || changes['tipoAsesoria'];
    if (changed && !changed.firstChange) {
      this.cargarSugerencia();
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Data Loading
  // ══════════════════════════════════════════════════════════════════════════

  private cargarSugerencia(): void {
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
          console.error('[SugerenciaDiaria] Error al cargar sugerencia:', err);
          this.isLoading = false;
          // Se conservan los valores por defecto del mockup en caso de error
          this.cdr.markForCheck();
        }
      })
    );
  }

  /**
   * Procesa de forma segura el JSON almacenado en el backend
   */
  private parsearConfiguracion(rawJson: string): void {
    try {
      const config = JSON.parse(rawJson) as SugerenciaDiariaData;
      if (config) {
        this.guardarropasSel = config.guardarropas || this.guardarropasSel;
        this.gustosSel = config.gustos || this.gustosSel;
        this.medidasSel = config.medidas || this.medidasSel;
        this.diaSel = config.dia || this.diaSel;
        this.horaSel = config.hora || this.horaSel;
        this.contextoSel = config.contexto || this.contextoSel;
        if (config.clima) {
          this.ciudadSel = config.clima.ciudad || this.ciudadSel;
          this.tempSel = config.clima.temperatura || this.tempSel;
          this.climaSel = config.clima.estado || this.climaSel;
        }
        this.lucirSel = config.lucir || this.lucirSel;
        this.razonamientoText = config.razonamiento || this.razonamientoText;
        if (Array.isArray(config.prendas)) {
          this.prendasRecomendadas = config.prendas;
        }
      }
    } catch (e) {
      console.error('[SugerenciaDiaria] Error al parsear JSON de configuración:', e);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Interactions
  // ══════════════════════════════════════════════════════════════════════════

  recalcular(): void {
    this.isRecalculating = true;
    this.cdr.markForCheck();

    // Simular el recálculo basado en datos climáticos y contexto
    setTimeout(() => {
      this.isRecalculating = false;

      // Variar el razonamiento y las prendas de forma dinámica según el contexto seleccionado
      if (this.contextoSel === 'Deportivo') {
        this.razonamientoText = `Estilo deportivo y transpirable, óptimo para el clima de ${this.ciudadSel} (${this.tempSel}).`;
        this.prendasRecomendadas = [
          { nombre: 'Chaqueta Deportiva', imagen: '/images/prendas/ChaquetasBlazersCortosNegra.png' },
          { nombre: 'Top Halter Cómodo', imagen: '/images/prendas/TopsDeCuelloHalterNegra.png' },
          { nombre: 'Leggins Deportivos', imagen: '/images/prendas/BodyAjustadoNegra.png' },
          { nombre: 'Tenis de Running', imagen: '/images/prendas/BodyAjustadoNegra.png' } // Reusado/Placeholder estilizado
        ];
      } else if (this.contextoSel === 'Informal') {
        this.razonamientoText = `Look casual cómodo y versátil adaptado a un día de ${this.climaSel.toLowerCase()} moderada.`;
        this.prendasRecomendadas = [
          { nombre: 'Blusa Wrap Casual', imagen: '/images/prendas/BlusasTpoCruzadasNegra.png' },
          { nombre: 'Jean Clásico', imagen: '/images/prendas/BodyAjustadoNegra.png' },
          { nombre: 'Mocasines Confort', imagen: '/images/prendas/BlusasTpoCruzadasNegra.png' }
        ];
      } else {
        // Restablecer al mockup (Formal / Laboral)
        this.razonamientoText = `Lucir ${this.lucirSel.toLowerCase()}, cómoda pero protegida para la ${this.climaSel.toLowerCase()}.`;
        this.prendasRecomendadas = [
          { nombre: 'Blazer Lavanda', imagen: '/images/prendas/BlazerLavanda.png' },
          { nombre: 'Camisa Blanca', imagen: '/images/prendas/CamisaBlanca.png' },
          { nombre: 'Pantalón Negro', imagen: '/images/prendas/PantalonNegro.png' },
          { nombre: 'Botines Lluvia', imagen: '/images/prendas/BotinesLluvia.png' }
        ];
      }

      this.triggerToast('¡Sugerencia recalculada con éxito!');
      this.cdr.markForCheck();
    }, 1200);
  }

  aceptarSugerencia(): void {
    this.triggerToast('¡Sugerencia del día aceptada y registrada en tu guardarropa!');
  }

  private triggerToast(message: string): void {
    this.toastMessage = message;
    this.showToast = true;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.showToast = false;
      this.cdr.markForCheck();
    }, 4000);
  }
}
