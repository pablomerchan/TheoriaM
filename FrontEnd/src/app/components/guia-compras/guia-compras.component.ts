import {
  Component,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  Input,
  Output,
  EventEmitter
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

export interface TarjetaConfig {
  icono_url: string;
  titulo: string;
  descripcion: string;
  navegacion_subtema?: string;
  navegacion_route?: string;
}

export interface GuiaComprasConfig {
  introduccion: string;
  media_url: string;
  media_tipo: 'imagen' | 'video';
  tarjetas: TarjetaConfig[];
}

@Component({
  selector: 'app-guia-compras',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './guia-compras.component.html',
  styleUrls: ['./guia-compras.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GuiaComprasComponent implements OnInit, OnChanges, OnDestroy {
  // ── Inputs / Outputs ──────────────────────────────────────────────────────
  @Input() idUsuario: any = '1';
  @Input() tipoAsesoria?: string;
  @Output() navigateToSubtema = new EventEmitter<string>();

  // ── Servicios ─────────────────────────────────────────────────────────────
  private http = inject(HttpClient);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  private readonly apiUrl = 'http://localhost:3000/api/asesoria/articulo';
  private subscription = new Subscription();

  // ── Estado del Componente ─────────────────────────────────────────────────
  isLoading: boolean = false;
  config: GuiaComprasConfig | null = null;

  // ── Configuración Fallback (Mockups) ──────────────────────────────────────
  private readonly fallbackConfig: GuiaComprasConfig = {
    introduccion: "La inteligencia artificial de TheorIA M usará los datos de tus características físicas, gustos y preferencias en busca de sugerirte las mejores prendas que te ayuden a lograr el objetivo de lograr la mejor versión de tu figura.",
    media_url: "/images/avatar_sketch.svg",
    media_tipo: "imagen",
    tarjetas: [
      {
        icono_url: "/images/iconos/camera.svg",
        titulo: "Tu armario basico",
        descripcion: "Segun tus caracteristicas fisicas te presentamos un armario basico.",
        navegacion_subtema: "Guardarropa"
      },
      {
        icono_url: "/images/iconos/camera.svg",
        titulo: "Busqueda por evento/ ocasion",
        descripcion: "Bodas, entrevistas trabajo, con clientes, cena con amigos, fin de semana",
        navegacion_subtema: "Bríndame asesoría"
      },
      {
        icono_url: "/images/iconos/camera.svg",
        titulo: "Por roles de vida",
        descripcion: "Trabajo, estudio, deporte",
        navegacion_subtema: "Bríndame asesoría"
      },
      {
        icono_url: "/images/iconos/camera.svg",
        titulo: "Regalos",
        descripcion: "Segun tus caracteristicas fisicas te presentamos un armario basico.",
        navegacion_subtema: "Guardarropa"
      },
      {
        icono_url: "/images/iconos/camera.svg",
        titulo: "Alertas de precios",
        descripcion: "Tus guardados que esperaban promociones o descuentos",
        navegacion_subtema: "Guia de compras"
      },
      {
        icono_url: "/images/iconos/camera.svg",
        titulo: "Actualizar mi perfil",
        descripcion: "Tener actualizados tus datos te permitira aprovechar mejor las asesorias de la IA",
        navegacion_route: "/datos-morfologicos"
      },
      {
        icono_url: "/images/iconos/camera.svg",
        titulo: "Accesorios",
        descripcion: "Los accesorios que mejor combinan y favorecen tu figura",
        navegacion_subtema: "Guardarropa"
      },
      {
        icono_url: "/images/iconos/camera.svg",
        titulo: "Optimizar tu armario",
        descripcion: "En base a lo que ya tienes la IA puede sugerirte prendas claves que te multiples combinaciones y ampliar tus posibilidades",
        navegacion_subtema: "Guardarropa"
      }
    ]
  };

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

  // ── Cargar Datos de la API ────────────────────────────────────────────────
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
          } else {
            this.config = this.fallbackConfig;
          }
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('[GuiaCompras] Error al cargar configuración de la BD:', err);
          this.isLoading = false;
          this.config = this.fallbackConfig;
          this.cdr.markForCheck();
        }
      })
    );
  }

  private parsearConfiguracion(rawJson: string): void {
    try {
      const parsed = JSON.parse(rawJson) as GuiaComprasConfig;
      if (parsed && parsed.introduccion && Array.isArray(parsed.tarjetas)) {
        this.config = parsed;
      } else {
        this.config = this.fallbackConfig;
      }
    } catch (e) {
      console.error('[GuiaCompras] Error al parsear JSON de la BD:', e);
      this.config = this.fallbackConfig;
    }
  }

  // ── Control de Navegación del Componente ──────────────────────────────────
  handleCardClick(tarjeta: TarjetaConfig, event: Event): void {
    event.preventDefault();
    if (tarjeta.navegacion_route) {
      console.log('[GuiaCompras] Navegando a ruta Angular:', tarjeta.navegacion_route);
      this.router.navigate([tarjeta.navegacion_route]);
    } else if (tarjeta.navegacion_subtema) {
      console.log('[GuiaCompras] Solicitando cambio de subtema:', tarjeta.navegacion_subtema);
      this.navigateToSubtema.emit(tarjeta.navegacion_subtema);
    }
  }
}
