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
import { HttpClient, HttpParams } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';

export interface AsesoriaRapidaItem {
  id: number;
  id_usuario: number;
  imagen_url: string;
  velocidad_reproduccion: number;
  orden: number;
  tipo_asesoria?: string;
  texto_html?: string;
}

/**
 * Reproductor continuo de fotos que emula un video.
 * - Sin controles de navegación manual.
 * - Avance automático según velocidad_reproduccion de cada foto.
 * - Transición fade entre imágenes.
 * - Filtrado por id_usuario y tipo_asesoria.
 */
@Component({
  selector: 'app-asesoria-rapida',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './asesoria-rapida.component.html',
  styleUrls: ['./asesoria-rapida.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AsesoriaRapidaComponent implements OnInit, OnChanges, OnDestroy {

  // ── Inputs ────────────────────────────────────────────────────────────────
  /** ID del usuario. Filtra las fotos de tbl_asesoria_rapida. */
  @Input() idUsuario: any = '1';

  /** Tipo de asesoría opcional para filtrar un subconjunto de fotos. */
  @Input() tipoAsesoria?: string;

  // ── Servicios ─────────────────────────────────────────────────────────────
  private http      = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);
  private cdr       = inject(ChangeDetectorRef);

  private readonly apiUrl = 'http://localhost:3000/api/asesoria/rapida';

  // ── Estado ────────────────────────────────────────────────────────────────
  fotos: AsesoriaRapidaItem[] = [];
  currentIndex = 0;

  /**
   * Texto fijo que se muestra a la derecha de las imágenes.
   * Proviene del campo texto_html del primer registro con contenido.
   * Es el mismo para todas las fotos del grupo (texto estático del panel derecho).
   */
  textoHtml: SafeHtml = '';

  // ── Internos ──────────────────────────────────────────────────────────────
  private timer: ReturnType<typeof setTimeout> | null = null;
  private subscription = new Subscription();

  // ══════════════════════════════════════════════════════════════════════════
  //  Ciclo de vida
  // ══════════════════════════════════════════════════════════════════════════

  ngOnInit(): void {
    this.cargarFotos();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const changed = changes['idUsuario'] || changes['tipoAsesoria'];
    if (changed && !changed.firstChange) {
      this.detener();
      this.currentIndex = 0;
      this.cargarFotos();
    }
  }

  ngOnDestroy(): void {
    this.detener();
    this.subscription.unsubscribe();
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Carga de datos
  // ══════════════════════════════════════════════════════════════════════════

  private cargarFotos(): void {
    let params = new HttpParams().set('id_usuario', this.idUsuario.toString());
    if (this.tipoAsesoria) {
      params = params.set('tipo_asesoria', this.tipoAsesoria);
    }

    this.subscription.add(
      this.http.get<AsesoriaRapidaItem[]>(this.apiUrl, { params }).subscribe({
        next: (data) => {
          this.fotos = data.filter(f => !!f.imagen_url);
          this.currentIndex = 0;

          // Tomar el texto del primer registro que lo tenga — es el texto fijo del panel derecho
          const conTexto = data.find(f => !!f.texto_html);
          this.textoHtml = conTexto?.texto_html
            ? this.sanitizer.bypassSecurityTrustHtml(conTexto.texto_html)
            : '';

          if (this.fotos.length > 0) {
            this.programarSiguiente();
          }
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('[AsesoriaRapida] Error al cargar fotos:', err);
          this.fotos = [];
          this.cdr.markForCheck();
        }
      })
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Reproducción continua
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Programa el avance a la siguiente foto usando la velocidad del item actual.
   * Cada foto puede tener su propia velocidad_reproduccion.
   */
  private programarSiguiente(): void {
    this.detener();
    const velocidad = this.fotos[this.currentIndex]?.velocidad_reproduccion ?? 1500;
    this.timer = setTimeout(() => {
      this.currentIndex = (this.currentIndex + 1) % this.fotos.length;
      this.cdr.markForCheck();
      this.programarSiguiente();
    }, velocidad);
  }

  private detener(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
