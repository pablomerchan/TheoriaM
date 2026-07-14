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
  ElementRef,
  forwardRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AsesoriaCarouselService } from '../../services/asesoria-carousel.service';
import { Asesoria } from '../../models/asesoria-carousel.model';
import { Subscription } from 'rxjs';

const POST_SPEECH_DELAY_MS = 2500;

/** Velocidad del efecto typewriter: ms por carácter. */
const TYPEWRITER_SPEED_MS = 18;

/** Pausa antes de iniciar el typewriter al cambiar de slide (ms). */
const TYPEWRITER_START_DELAY_MS = 300;

/**
 * Carrusel de asesorías incrustado en el contenido HTML.
 *
 * UBICACIÓN: Se renderiza dentro del campo 'texto_html' (tbl_asesoria) cuando
 *            se detecta el marcador <!-- CAROUSEL_MARKER -->
 *
 * FILTROS SOPORTADOS:
 *   1. usuarioId (id_usuario): Solo items del usuario especificado
 *   2. tipoAsesoria (tipo_asesoria): Solo items de este tipo/categoría
 *   3. asesoriaId (asesoria_id): Items asociados a esta asesoría/menú
 *   4. tipoPrenda: Filtro adicional opcional por tipo de prenda
 *
 * FLUJO:
 *   1. El componente padre (asesoria.ts) detecta <!-- CAROUSEL_MARKER --> en el HTML
 *   2. Separa el contenido en dos partes (antes y después del marcador)
 *   3. Inserta <app-asesoria-carousel> en el medio, pasando filtros
 *   4. Este componente carga items del servicio con los filtros aplicados
 *   5. Renderiza un carrusel de imágenes + HTML sanitizado
 *
 * CONFIGURACIÓN DEL CARRUSEL:
 *   - Auto-play: Cambia cada 5 segundos
 *   - Pausa/Reanuda: Clic en la imagen
 *   - Navegar: Flechas o indicadores de puntos
 *   - TTS: Puede leer el contenido en voz alta (cuando se implementa)
 */
@Component({
  selector: 'app-asesoria-carousel',
  standalone: true,
  imports: [CommonModule, forwardRef(() => AsesoriaCarouselComponent)],
  templateUrl: './asesoria-carousel.component.html',
  styleUrls: ['./asesoria-carousel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AsesoriaCarouselComponent implements OnInit, OnChanges, OnDestroy {
  // ══════════════════════════════════════════════════════════════════════════
  //  INPUTS - Filtros pasados desde el componente padre
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * ID del usuario. Filtro principal: solo mostrar items que pertenecen a este usuario.
   * Se mapea a 'id_usuario' en tbl_asesoria.
   * Obligatorio en la mayoría de casos (viene de AuthService u otro lugar).
   */
  @Input() usuarioId?: any;

  /**
   * ID de la asesoría/menú activo. Items mostrados solo si coinciden con este ID.
   * Se mapea a 'asesoria_id' en tbl_asesoria (referencia a tbl_menu_servicios).
   */
  @Input() asesoriaId?: number;

  /**
   * Tipo/categoría de asesoría. Filtro adicional opcional.
   * Se mapea a 'tipo_asesoria' en tbl_carrusel_items.
   */
  @Input() tipoAsesoria?: string;

  /** Diapositivas proporcionadas directamente (modo instancia de grupo). */
  @Input() slides?: Asesoria[];

  /** Grupos de diapositivas cuando actúa como contenedor principal. */
  grupos: { id: string, nombre: string, activo: boolean, slides: Asesoria[] }[] = [];

  // ══════════════════════════════════════════════════════════════════════════
  //  DEPENDENCIAS INYECTADAS
  // ══════════════════════════════════════════════════════════════════════════
  private asesoriaService = inject(AsesoriaCarouselService);
  private sanitizer       = inject(DomSanitizer);
  private cdr             = inject(ChangeDetectorRef);
  private elementRef      = inject(ElementRef);

  // ══════════════════════════════════════════════════════════════════════════
  //  ESTADO DEL CARRUSEL
  // ══════════════════════════════════════════════════════════════════════════

  /** Array de items cargados del backend (con filtros aplicados). */
  asesorias: Asesoria[] = [];

  /** Índice actual del slide (0-based). */
  currentIndex: number = 0;

  // ──────────────────────────────────────────────────────────────────────────
  //  FLAGS DE CONTROL
  // ──────────────────────────────────────────────────────────────────────────

  /** true si el usuario ha pulsado el botón de pausa manualmente. */
  isPaused: boolean = false;

  /** true mientras la API Speech Synthesis está leyendo el slide actual. */
  isSpeaking: boolean = false;

  /** Estado del indicador flash central estilo YouTube ('play' | 'pause' | null). */
  flashState: 'play' | 'pause' | null = null;

  // ── Typewriter ────────────────────────────────────────────────────────────
  /** Texto parcial que se muestra durante la animación typewriter. */
  typewriterText: string = '';

  /** true mientras el efecto typewriter está en curso. */
  isTyping: boolean = false;

  // ── Control de Video ──────────────────────────────────────────────────────
  /** Progreso del video en porcentaje (0-100) */
  videoProgressPercent: number = 0;

  /** Indica si el video está reproduciéndose actualmente */
  isVideoPlaying: boolean = false;

  /** Volumen del video (0 a 1) */
  videoVolume: number = 0.8;

  /** Guarda el último volumen antes de mutear */
  private lastVolume: number = 0.8;

  // ──────────────────────────────────────────────────────────────────────────
  //  INTERNOS (Control de timers y suscripciones)
  // ──────────────────────────────────────────────────────────────────────────
  private autoPlayInterval: ReturnType<typeof setInterval> | null = null;
  private postSpeechTimeout: ReturnType<typeof setTimeout> | null = null;
  private flashTimeout: ReturnType<typeof setTimeout> | null = null;
  private sequenceTimeout: ReturnType<typeof setTimeout> | null = null;
  private isPlayingSequence: boolean = false;
  private typewriterInterval: ReturnType<typeof setInterval> | null = null;
  private typewriterStartTimeout: ReturnType<typeof setTimeout> | null = null;
  private observer: IntersectionObserver | null = null;
  private activeVideoWasPlayingBeforeHidden: boolean = false;
  private readonly documentVisibilityHandler = (): void => {
    if (typeof document === 'undefined') {
      return;
    }
    if (document.visibilityState === 'hidden') {
      this.onComponentHidden();
    } else if (document.visibilityState === 'visible') {
      this.onComponentVisible();
    }
  };
  private subscription = new Subscription();

  /** Retardo actual entre slides en milisegundos (auto-avance). */
  autoPlayDelay: number = 5000;

  /** true si la lectura automática de textos está habilitada */
  autoReadEnabled: boolean = false;

  /** true si el texto debe ocultarse para maximizar la imagen */
  hideTextEnabled: boolean = false;
  /** Altura fija temporal en px que usará la imagen al ocultar el texto */
  private carouselFixedHeightPx: number | null = null;

  /** true si el panel de ajustes está abierto */
  showSettingsPanel: boolean = false;

  /**
   * Controla que el efecto typewriter se ejecute únicamente la primera vez
   * que el componente carga datos. En navegaciones posteriores entre slides
   * o recargas, el texto se muestra directamente sin animación.
   */
  private typewriterHasRunOnce: boolean = false;

  // ══════════════════════════════════════════════════════════════════════════
  //  Ciclo de vida
  // ══════════════════════════════════════════════════════════════════════════

  ngOnInit(): void {
    if (this.slides) {
      this.asesorias = this.slides;
      this.currentIndex = 0;
      this.isPaused = true;
      if (this.asesorias.length > 0) {
        this.iniciarTypewriter();
        this.stopAllVideos();
      }
      this.setupIntersectionObserver();
    } else {
      this.cargarPrendas();
      this.setupIntersectionObserver();
    }
  }

  /**
   * Cuando cambian los @Input (ej: el usuario selecciona otro menú),
   * recargamos el carrusel con los nuevos filtros.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['slides'] && !changes['slides'].firstChange) {
      this.asesorias = this.slides || [];
      this.currentIndex = 0;
      this.isPaused = true;
      this.cancelSpeech();
      if (this.asesorias.length > 0) {
        this.iniciarTypewriter();
        this.stopAllVideos();
      }
      this.cdr.markForCheck();
      return;
    }

    if (this.slides) return;

    const relevantChange = changes['usuarioId'] || changes['asesoriaId'] || changes['tipoAsesoria'];
    const isFirstChange  = Object.values(changes).every(c => c.firstChange);
    if (relevantChange && !isFirstChange) {
      // Detener la lectura TTS y el intervalo antes de recargar
      this.cancelSpeech();
      this.cargarPrendas();
    }
  }

  ngOnDestroy(): void {
    this.cancelSpeech();
    this.stopAutoPlay();
    this.clearPostSpeechTimeout();
    this.stopTypewriter();
    if (this.flashTimeout !== null) {
      clearTimeout(this.flashTimeout);
      this.flashTimeout = null;
    }
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.documentVisibilityHandler);
    }
    this.subscription.unsubscribe();
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  CARGA DE DATOS CON FILTROS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Carga los items del carrusel con los filtros especificados.
   *
   * FILTROS APLICADOS (en orden):
   *   1. Backend: Filtra por id_usuario, asesoria_id, tipo_asesoria
   *   2. Visibilidad: Solo items con visible=true o visible=1
   *   3. Tipo de prenda: Si tipoPrenda está especificado, filtra por tipo_prenda
   *   4. Orden: Ordena por campo 'orden' (ascendente)
   *   5. HTML: Sanitiza el contenido HTML para seguridad
   *
   * Los filtros se aplican en el siguiente orden de precedencia:
   *   - id_usuario (obligatorio): Usuario dueño del item
   *   - tipo_asesoria: Categoría del item (ej: 'Prendas')
   *   - asesoria_id: ID de la asesoría/menú asociado
   *   - tipo_prenda: Subtipo de prenda (opcional, retrocompatibilidad)
   */
  private cargarPrendas(): void {
    if (this.slides) return;
    this.subscription.add(
      this.asesoriaService.getAsesorias(this.usuarioId, this.asesoriaId, this.tipoAsesoria).subscribe({
        next: (data: Asesoria[]) => {
          const processed = data
            // 1. Filtro de visibilidad
            .filter(item => item.visible !== false && item.visible !== 0)
            // 2. Orden ascendente
            .sort((a, b) => (a.orden || 0) - (b.orden || 0))
            // 3. Sanitizar HTML
            .map(item => {
              const rawHtml = (item as any).text_html as string | undefined;
              return {
                ...item,
                texto_html: rawHtml
                  ? this.sanitizer.bypassSecurityTrustHtml(rawHtml)
                  : ''
              };
            });

          const groupMap = new Map<string, Asesoria[]>();
          processed.forEach(item => {
            const gid = item.grupo_id || 'Sin Grupo';
            if (!groupMap.has(gid)) groupMap.set(gid, []);
            groupMap.get(gid)!.push(item);
          });

          this.grupos = Array.from(groupMap.entries()).map(([gid, items]) => ({
            id: gid,
            nombre: items[0]?.nombre || gid,
            activo: true,
            slides: items
          }));

          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('[AsesoriaCarousel] Error al cargar items del carrusel:', err);
          this.grupos = [];
          this.cdr.markForCheck();
        }
      })
    );
  }

  /** Configura IntersectionObserver para reproducir automáticamente al estar visible en pantalla */
  private setupIntersectionObserver(): void {
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.target !== this.elementRef.nativeElement) {
            return;
          }
          if (entry.isIntersecting) {
            this.onComponentVisible();
          } else {
            this.onComponentHidden();
          }
        });
      }, {
        threshold: 0.15
      });
      this.observer.observe(this.elementRef.nativeElement);

      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', this.documentVisibilityHandler);
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Control del avance automático
  // ══════════════════════════════════════════════════════════════════════════

  /** Inicia (o reinicia) el intervalo de avance automático. */
  startAutoPlay(): void {
    // Autoplay feature removed: do not start automatic advancement.
    // Keep method to preserve API but make it a no-op.
    this.stopAutoPlay();
  }

  /** Detiene el intervalo sin cambiar el flag `isPaused`. */
  stopAutoPlay(): void {
    if (this.autoPlayInterval !== null) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }
  }

  /**
   * Pausa manual (botón del usuario).
   * También cancela cualquier lectura TTS en curso.
   */
  pause(): void {
    this.isPaused = true;
    this.stopAutoPlay();
    this.cancelSpeech();
    this.cancelSequence();
    this.clearPostSpeechTimeout();
    this.triggerFlash('pause');
    console.log('[AsesoriaCarousel] pause() invoked — playback stopped');
    this.cdr.markForCheck();
  }

  /** Reanuda el avance automático (botón del usuario). */
  resume(): void {
    // Resume only clears the paused flag. Autoplay has been removed
    // so we do not start any automatic timer here.
    this.isPaused = false;
    this.triggerFlash('play');
    console.log('[AsesoriaCarousel] resume() invoked — starting sequence playback');
    this.cdr.markForCheck();
    // Start sequential playback that shows every slide and reads it aloud.
    this.startSequencePlayback();
  }

  /** Reinicia el temporizador (p. ej. tras navegación manual). */
  private resetTimer(): void {
    // Autoplay disabled: do not restart the timer automatically.
    // Ensure any existing autoPlayInterval is cleared.
    this.stopAutoPlay();
  }

  /**
   * Alterna entre reproducción y pausa al hacer clic en el cuerpo del carrusel.
   * Evita actuar si se hace clic en elementos interactivos (botones, enlaces, footer o control de velocidad).
   */
  togglePlayPause(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    // Evitar pausar/reanudar si se hizo clic en un botón, enlace, barra de controles,
    // flechas, panel de ajustes o cualquier control interactivo.
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('.carousel-footer') ||
      target.closest('.carousel-bottom-bar') ||
      target.closest('.carousel-control') ||
      target.closest('.carousel-speed-control') ||
      target.closest('.carousel-settings-panel')
    ) {
      return;
    }

    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  onVideoTimeUpdate(event: Event): void {
    const video = event.target as HTMLVideoElement;
    if (video && video.duration) {
      this.videoProgressPercent = (video.currentTime / video.duration) * 100;
      this.cdr.markForCheck();
    }
  }

  onVideoLoadedMetadata(event: Event): void {
    const video = event.target as HTMLVideoElement;
    if (video) {
      video.volume = this.videoVolume;
      video.muted = this.videoVolume === 0;
    }
    this.videoProgressPercent = 0;
    this.cdr.markForCheck();
  }

  onVideoPlay(): void {
    this.isVideoPlaying = true;
    this.cancelSpeech();
    this.cancelSequence();
    this.cdr.markForCheck();
  }

  onVideoPause(): void {
    this.isVideoPlaying = false;
    this.cdr.markForCheck();
  }

  toggleVideoPlay(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    const activeVideo = this.elementRef.nativeElement.querySelector('.carousel-slide.active video') as HTMLVideoElement | null;
    if (activeVideo) {
      if (activeVideo.paused) {
        if (activeVideo.currentTime >= activeVideo.duration) {
          activeVideo.currentTime = 0;
        }
        activeVideo.volume = this.videoVolume;
        activeVideo.muted = this.videoVolume === 0;
        const playPromise = activeVideo.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(err => console.log('[AsesoriaCarousel] Error playing video:', err));
        }
      } else {
        activeVideo.pause();
      }
    }
  }

  onVideoEnded(event: Event): void {
    const video = event.target as HTMLVideoElement;
    if (video) {
      this.isVideoPlaying = false;
      this.cdr.markForCheck();
    }
  }

  onProgressClick(event: MouseEvent): void {
    event.stopPropagation();
    const container = event.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const width = rect.width;

    const activeVideo = this.elementRef.nativeElement.querySelector('.carousel-slide.active video') as HTMLVideoElement | null;
    if (activeVideo && activeVideo.duration) {
      const newTime = (clickX / width) * activeVideo.duration;
      activeVideo.currentTime = newTime;
      this.videoProgressPercent = (newTime / activeVideo.duration) * 100;
      this.cdr.markForCheck();
    }
  }

  toggleMute(event: MouseEvent): void {
    event.stopPropagation();
    const activeVideo = this.elementRef.nativeElement.querySelector('.carousel-slide.active video') as HTMLVideoElement | null;
    if (activeVideo) {
      if (this.videoVolume > 0) {
        this.lastVolume = this.videoVolume;
        this.videoVolume = 0;
      } else {
        this.videoVolume = this.lastVolume > 0 ? this.lastVolume : 0.8;
      }
      activeVideo.volume = this.videoVolume;
      activeVideo.muted = this.videoVolume === 0;
      this.cdr.markForCheck();
    }
  }

  onVolumeChange(event: Event): void {
    event.stopPropagation();
    const target = event.target as HTMLInputElement;
    this.videoVolume = parseFloat(target.value);
    const activeVideo = this.elementRef.nativeElement.querySelector('.carousel-slide.active video') as HTMLVideoElement | null;
    if (activeVideo) {
      activeVideo.volume = this.videoVolume;
      activeVideo.muted = this.videoVolume === 0;
      if (this.videoVolume > 0) {
        this.lastVolume = this.videoVolume;
      }
      this.cdr.markForCheck();
    }
  }

  private stopAllVideos(): void {
    if (typeof window === 'undefined') return;

    this.videoProgressPercent = 0;
    this.isVideoPlaying = false;

    // Pausar todos los videos primero
    const allVideos = this.elementRef.nativeElement.querySelectorAll('video');
    allVideos.forEach((video: HTMLVideoElement) => {
      video.pause();
    });
    this.cdr.markForCheck();
  }

  private getActiveVideo(): HTMLVideoElement | null {
    return this.elementRef.nativeElement.querySelector('.carousel-slide.active video') as HTMLVideoElement | null;
  }

  private onComponentHidden(): void {
    const activeVideo = this.getActiveVideo();
    if (!activeVideo) {
      this.activeVideoWasPlayingBeforeHidden = false;
      return;
    }

    if (!activeVideo.paused) {
      this.activeVideoWasPlayingBeforeHidden = true;
      activeVideo.pause();
    } else {
      this.activeVideoWasPlayingBeforeHidden = false;
    }
  }

  private onComponentVisible(): void {
    if (!this.activeVideoWasPlayingBeforeHidden) {
      return;
    }
    this.activeVideoWasPlayingBeforeHidden = false;
  }

  private pauseActiveVideoOnly(): void {
    const activeVideo = this.getActiveVideo();
    if (activeVideo) {
      activeVideo.pause();
    }
  }

  toggleSettingsPanel(event: MouseEvent): void {
    event.stopPropagation();
    this.showSettingsPanel = !this.showSettingsPanel;
    this.cdr.markForCheck();
  }

  /**
   * Maneja el cambio de velocidad desde el slider.
   */
  onSpeedChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const seconds = parseFloat(target.value);
    this.autoPlayDelay = seconds * 1000;

    // Si no está pausado ni leyendo, reiniciar autoplay con la nueva velocidad inmediatamente
    if (!this.isPaused && !this.isSpeaking) {
      this.startAutoPlay();
    }
  }

  /**
   * Maneja la activación/desactivación de la lectura automática.
   */
  onAutoReadChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.autoReadEnabled = target.checked;

    // Si se activa, empezar a leer la diapositiva actual inmediatamente
    if (this.autoReadEnabled && !this.isSpeaking && this.asesorias.length > 0) {
      this.readSlide();
    } else if (!this.autoReadEnabled && this.isSpeaking) {
      // Si se desactiva y está leyendo, detener la lectura
      this.cancelSpeech();
    }
  }

  onHideTextChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (this.hideTextEnabled !== target.checked) {
      this.toggleHideText();
    }
  }

  /** Alterna la visibilidad del texto desde el botón rápido */
  toggleHideText(): void {
    this.hideTextEnabled = !this.hideTextEnabled;
    const hostEl = this.elementRef.nativeElement as HTMLElement;
    const container = hostEl.querySelector('.carousel-container') as HTMLElement | null;

    if (this.hideTextEnabled) {
      // Medir la altura actual del control para fijarla y que la imagen la llene
      if (container) {
        const h = container.offsetHeight;
        this.carouselFixedHeightPx = h;
        hostEl.style.setProperty('--carousel-fixed-height', `${h}px`);
        container.style.height = `${h}px`;
        container.style.maxHeight = `${h}px`;
      }
      if (this.asesorias.length > 0) {
        this.readSlide();
      }
    } else {
      // Quitar la altura fija
      this.carouselFixedHeightPx = null;
      hostEl.style.removeProperty('--carousel-fixed-height');
      if (container) {
        container.style.removeProperty('height');
        container.style.removeProperty('max-height');
      }
    }

    this.cdr.markForCheck();
  }

  toggleAutoRead(): void {
    this.autoReadEnabled = !this.autoReadEnabled;
    if (this.autoReadEnabled && !this.isSpeaking && this.asesorias.length > 0) {
      this.readSlide();
    } else if (!this.autoReadEnabled && this.isSpeaking) {
      this.cancelSpeech();
    }
    this.cdr.markForCheck();
  }

  /**
   * Activa el efecto de parpadeo (flash) central estilo YouTube.
   */
  private triggerFlash(state: 'play' | 'pause'): void {
    if (this.flashTimeout !== null) {
      clearTimeout(this.flashTimeout);
    }
    this.flashState = state;
    this.cdr.markForCheck();

    this.flashTimeout = setTimeout(() => {
      this.flashState = null;
      this.cdr.markForCheck();
    }, 800); // Coincide con la duración de la animación en el CSS
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Navegación de slides
  // ══════════════════════════════════════════════════════════════════════════

  nextSlide(): void {
    if (this.asesorias.length === 0) return;
    this.currentIndex = (this.currentIndex + 1) % this.asesorias.length;
    this.iniciarTypewriter();
    if (this.autoReadEnabled) {
      this.readSlide();
    }
    this.stopAllVideos();
  }

  prevSlide(): void {
    if (this.asesorias.length === 0) return;
    this.currentIndex = (this.currentIndex - 1 + this.asesorias.length) % this.asesorias.length;
    this.iniciarTypewriter();
    if (this.autoReadEnabled) {
      this.readSlide();
    }
    this.stopAllVideos();
  }

  goToSlide(index: number): void {
    this.currentIndex = index;
    this.iniciarTypewriter();
    this.resetTimer();
    if (this.autoReadEnabled) {
      this.readSlide();
    }
    this.stopAllVideos();
  }

  onManualNext(): void {
    this.nextSlide();
    this.resetTimer();
  }

  onManualPrev(): void {
    this.prevSlide();
    this.resetTimer();
  }

  /**
   * Verifica si estamos en la primera diapositiva (índice 0).
   * Usado para ocultar el botón de retroceso en la primera diapositiva.
   */
  isFirstSlide(): boolean {
    return this.currentIndex === 0;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Efecto Typewriter (chat IA)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Inicia el efecto typewriter para el slide activo.
   * Solo se ejecuta la PRIMERA VEZ que el componente carga (slide inicial).
   * En cambios de slide posteriores o recargas, muestra el HTML directamente.
   */
  iniciarTypewriter(): void {
    this.stopTypewriter();

    // Si el typewriter ya se ejecutó al menos una vez, mostrar HTML directo
    if (this.typewriterHasRunOnce) {
      this.typewriterText = '';
      this.isTyping = false;
      this.cdr.markForCheck();
      return;
    }

    this.typewriterText = '';
    this.isTyping = true;
    this.cdr.markForCheck();

    const item = this.asesorias[this.currentIndex];
    if (!item) { this.isTyping = false; return; }

    const rawHtml  = (item as any).text_html as string || '';
    const fullText = this.extractPlainText(rawHtml);
    if (!fullText.trim()) { this.isTyping = false; return; }

    let charIndex = 0;

    // Pequeña pausa antes de empezar para que la transición de slide se vea
    this.typewriterStartTimeout = setTimeout(() => {
      this.typewriterInterval = setInterval(() => {
        charIndex++;
        this.typewriterText = fullText.slice(0, charIndex);
        this.cdr.markForCheck();

        if (charIndex >= fullText.length) {
          this.stopTypewriter();
          // Al terminar, mostrar el HTML completo y marcar como ejecutado
          this.isTyping = false;
          this.typewriterHasRunOnce = true;
          this.cdr.markForCheck();
        }
      }, TYPEWRITER_SPEED_MS);
    }, TYPEWRITER_START_DELAY_MS);
  }

  private stopTypewriter(): void {
    if (this.typewriterInterval !== null) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = null;
    }
    if (this.typewriterStartTimeout !== null) {
      clearTimeout(this.typewriterStartTimeout);
      this.typewriterStartTimeout = null;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Lectura en voz alta (Web Speech API)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Extrae el texto plano del HTML del slide activo y lo lee en voz alta.
   * Mientras se lee: el carrusel se pausa (sin cambiar isPaused).
   * Al finalizar: se espera POST_SPEECH_DELAY_MS antes de reanudar
   * el avance, salvo que el usuario haya pulsado el botón de pausa.
   */
  readSlide(): void {
    // Verificar soporte del navegador
    if (!('speechSynthesis' in window)) {
      console.warn('Este navegador no soporta Web Speech API.');
      return;
    }

    // Si ya está hablando, detener la lectura
    if (this.isSpeaking) {
      this.cancelSpeech();
      return;
    }

    const item = this.asesorias[this.currentIndex];
    if (!item) return;

    // Obtener el texto plano del HTML sanitizado
    const plainText = this.extractPlainText((item as any).text_html as string || '');
    if (!plainText.trim()) return;

    console.log('[AsesoriaCarousel] readSlide() invoked for index', this.currentIndex);
    // Pausar el avance automático durante la lectura
    this.stopAutoPlay();
    this.clearPostSpeechTimeout();
    this.pauseActiveVideoOnly();

    if (typeof SpeechSynthesisUtterance === 'undefined') {
      console.warn('Este entorno no soporta SpeechSynthesisUtterance.');
      return;
    }
    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.lang  = 'es-ES';
    utterance.rate  = 0.95;
    utterance.pitch = 1;

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.cdr.markForCheck();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.cdr.markForCheck();
      // Reanudar solo si el usuario no ha pausado manualmente
      if (!this.isPaused) {
        this.postSpeechTimeout = setTimeout(() => {
          this.startAutoPlay();
          this.cdr.markForCheck();
        }, POST_SPEECH_DELAY_MS);
      }
    };

    utterance.onerror = (event) => {
      // Ignorar errores de cancelación voluntaria ('interrupted', 'canceled')
      if (event.error === 'interrupted' || event.error === 'canceled') return;
      console.error('Error en SpeechSynthesis:', event.error);
      this.isSpeaking = false;
      this.cdr.markForCheck();
    };

    window.speechSynthesis.speak(utterance);
  }

  /** Cancela la lectura en curso (sin activar el estado de pausa manual). */
  private cancelSpeech(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking = false;
  }

  /** Limpia el timeout post-lectura si existe. */
  private clearPostSpeechTimeout(): void {
    if (this.postSpeechTimeout !== null) {
      clearTimeout(this.postSpeechTimeout);
      this.postSpeechTimeout = null;
    }
  }

  /**
   * Convierte un string HTML a texto plano usando un elemento temporal.
   * Se evita inyectar el HTML en el DOM real.
   */
  private extractPlainText(html: string): string {
    const temp    = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  }

  /** Inicia la reproducción secuencial de todas las diapositivas, leyendo cada una. */
  private startSequencePlayback(): void {
    // Si ya está en reproducción, no volver a iniciar
    if (this.isPlayingSequence || this.asesorias.length === 0) return;

    console.log('[AsesoriaCarousel] startSequencePlayback() — starting sequence from index', this.currentIndex);
    this.isPlayingSequence = true;
    this.isPaused = false;
    this.triggerFlash('play');
    this.cdr.markForCheck();

    const total = this.asesorias.length;
    let steps = 0;

    const playCurrent = () => {
      if (this.isPaused || !this.isPlayingSequence) {
        console.log('[AsesoriaCarousel] playCurrent aborted (paused or stopped) at index', this.currentIndex);
        this.isPlayingSequence = false;
        return;
      }

      const item = this.asesorias[this.currentIndex];
      if (!item) {
        this.isPlayingSequence = false;
        return;
      }

      // Mostrar el slide actual (y typewriter si aplica)
      console.log('[AsesoriaCarousel] showing slide', this.currentIndex);
      this.iniciarTypewriter();
      this.stopAllVideos();
      this.cdr.markForCheck();

      const plainText = this.extractPlainText((item as any).text_html as string || '');
      // Asegurarnos de cancelar cualquier lectura previa
      this.cancelSpeech();

      if (!plainText.trim()) {
        // Avanzar tras un delay si no hay texto
        steps++;
        if (steps >= total) {
          this.isPlayingSequence = false;
          this.pause();
          return;
        }
        this.currentIndex = (this.currentIndex + 1) % total;
        this.sequenceTimeout = setTimeout(() => playCurrent(), this.autoPlayDelay);
        return;
      }

      // Leer y al terminar avanzar al siguiente slide
      if (typeof SpeechSynthesisUtterance === 'undefined') {
        console.warn('[AsesoriaCarousel] SpeechSynthesisUtterance is not defined in this environment.');
        steps++;
        if (steps >= total) {
          this.isPlayingSequence = false;
          this.pause();
          return;
        }
        this.currentIndex = (this.currentIndex + 1) % total;
        this.sequenceTimeout = setTimeout(() => playCurrent(), POST_SPEECH_DELAY_MS);
        return;
      }
      const utt = new SpeechSynthesisUtterance(plainText);
      utt.lang = 'es-ES';
      utt.rate = 0.95;
      utt.pitch = 1;

      utt.onstart = () => {
        console.log('[AsesoriaCarousel] TTS onstart for index', this.currentIndex);
        this.isSpeaking = true;
        this.cdr.markForCheck();
      };

      utt.onend = () => {
        console.log('[AsesoriaCarousel] TTS onend for index', this.currentIndex);
        this.isSpeaking = false;
        this.cdr.markForCheck();
        steps++;
        if (steps >= total) {
          this.isPlayingSequence = false;
          this.pause();
          return;
        }
        this.currentIndex = (this.currentIndex + 1) % total;
        this.sequenceTimeout = setTimeout(() => playCurrent(), POST_SPEECH_DELAY_MS);
      };

      utt.onerror = (ev) => {
        console.error('[AsesoriaCarousel] TTS error for index', this.currentIndex, ev);
        this.isSpeaking = false;
        this.cdr.markForCheck();
        steps++;
        if (steps >= total) {
          this.isPlayingSequence = false;
          this.pause();
          return;
        }
        this.currentIndex = (this.currentIndex + 1) % total;
        this.sequenceTimeout = setTimeout(() => playCurrent(), POST_SPEECH_DELAY_MS);
      };

      window.speechSynthesis.speak(utt);
    };

    // Iniciar desde el índice actual
    playCurrent();
  }

  private cancelSequence(): void {
    if (this.sequenceTimeout !== null) {
      clearTimeout(this.sequenceTimeout);
      this.sequenceTimeout = null;
    }
    this.isPlayingSequence = false;
    console.log('[AsesoriaCarousel] cancelSequence() — sequence cancelled');
  }
}
