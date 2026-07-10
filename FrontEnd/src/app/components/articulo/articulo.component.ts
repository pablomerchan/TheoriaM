import {
  Component,
  OnInit,
  OnChanges,
  OnDestroy,
  AfterViewInit,
  SimpleChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ElementRef,
  ViewChild,
  inject,
  Input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';

/** Velocidad del efecto typewriter: ms por carácter. */
const TYPEWRITER_SPEED_MS = 20;

export interface ArticuloItem {
  id: number;
  id_usuario: number;
  texto_html: string;
  media_url: string | null;
  media_url_webm: string | null;
  media_tipo: 'imagen' | 'video' | 'webm';
  orden: number;
  tipo_asesoria?: string;
}

/**
 * Marco estático con dos paneles:
 *   - Izquierda: texto HTML con efecto typewriter (chat IA) + botón TTS.
 *   - Derecha: imagen o video.
 * No funciona como carrusel — muestra un único artículo a la vez.
 * Se activa desde tbl_asesoria con el marcador <!-- ARTICULO_MARKER -->.
 */
@Component({
  selector: 'app-articulo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './articulo.component.html',
  styleUrls: ['./articulo.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArticuloComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {

  // ── Inputs ────────────────────────────────────────────────────────────────
  @Input() idUsuario: any = '1';
  @Input() tipoAsesoria?: string;

  // ── Servicios ─────────────────────────────────────────────────────────────
  private http      = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);
  private cdr       = inject(ChangeDetectorRef);

  private readonly apiUrl = 'http://localhost:3000/api/asesoria/articulo';

  // ── Estado ────────────────────────────────────────────────────────────────
  @ViewChild('videoPlayer') private videoPlayer?: ElementRef<HTMLVideoElement>;

  articulo: ArticuloItem | null = null;
  textoHtml: SafeHtml = '';

  get videoSources(): Array<{ src: string; type: string }> {
    if (!this.articulo || !this.isVideoMedia(this.articulo.media_tipo)) {
      return [];
    }

    const sources: Array<{ src: string; type: string }> = [];
    if (this.isValidVideoUrl(this.articulo.media_url_webm)) {
      sources.push({ src: this.articulo.media_url_webm, type: 'video/webm' });
    }
    if (this.isValidVideoUrl(this.articulo.media_url)) {
      const type = /\.webm(\?.*)?$/i.test(this.articulo.media_url) ? 'video/webm' : 'video/mp4';
      sources.push({ src: this.articulo.media_url, type });
    }

    return sources;
  }

  get showVideo(): boolean {
    return this.videoSources.length > 0;
  }

  private isVideoMedia(tipo: string | null | undefined): boolean {
    return tipo === 'video' || tipo === 'webm';
  }

  private isValidVideoUrl(url: string | null | undefined): url is string {
    return !!url && /\.(mp4|webm)(\?.*)?$/i.test(url);
  }

  // ── Typewriter ────────────────────────────────────────────────────────────
  typewriterText: string = '';
  isTyping: boolean = false;
  private typewriterHasRunOnce: boolean = false;

  // ── TTS ───────────────────────────────────────────────────────────────────
  isSpeaking: boolean = false;

  // ── Internos ──────────────────────────────────────────────────────────────
  private typewriterInterval: ReturnType<typeof setInterval> | null = null;
  private subscription = new Subscription();

  // ══════════════════════════════════════════════════════════════════════════
  //  Ciclo de vida
  // ══════════════════════════════════════════════════════════════════════════

  ngOnInit(): void {
    this.cargarArticulo();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const changed = changes['idUsuario'] || changes['tipoAsesoria'];
    if (changed && !changed.firstChange) {
      this.detenerTypewriter();
      this.cancelarTTS();
      this.cargarArticulo();
    }
  }
  ngAfterViewInit(): void {
    this.playVideoIfPossible();
  }
  ngOnDestroy(): void {
    this.detenerTypewriter();
    this.cancelarTTS();
    this.subscription.unsubscribe();
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Carga de datos
  // ══════════════════════════════════════════════════════════════════════════

  private cargarArticulo(): void {
    let params = new HttpParams().set('id_usuario', this.idUsuario.toString());
    if (this.tipoAsesoria) {
      params = params.set('tipo_asesoria', this.tipoAsesoria);
    }

    this.subscription.add(
      this.http.get<ArticuloItem>(this.apiUrl, { params }).subscribe({
        next: (data) => {
          this.articulo  = data;
          this.textoHtml = data.texto_html
            ? this.sanitizer.bypassSecurityTrustHtml(data.texto_html)
            : '';
          this.iniciarTypewriter(data.texto_html || '');
          this.cdr.markForCheck();
          setTimeout(() => this.playVideoIfPossible());
        },
        error: (err) => {
          console.error('[Articulo] Error al cargar artículo:', err);
          this.articulo = null;
          this.cdr.markForCheck();
        }
      })
    );
  }

  private playVideoIfPossible(): void {
    if (!this.videoPlayer?.nativeElement) {
      return;
    }

    const video = this.videoPlayer.nativeElement;
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // Ignorar errores de autoplay y dejar el control al navegador.
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Efecto Typewriter
  // ══════════════════════════════════════════════════════════════════════════

  private iniciarTypewriter(rawHtml: string): void {
    this.detenerTypewriter();
    this.typewriterText = '';

    // Solo anima la primera vez — después muestra el texto directamente
    if (this.typewriterHasRunOnce) {
      this.isTyping = false;
      this.cdr.markForCheck();
      return;
    }

    this.isTyping = true;
    this.cdr.markForCheck();

    const temp = document.createElement('div');
    temp.innerHTML = rawHtml;
    const fullText = temp.textContent || temp.innerText || '';

    if (!fullText.trim()) {
      this.isTyping = false;
      return;
    }

    let charIndex = 0;
    this.typewriterInterval = setInterval(() => {
      charIndex++;
      this.typewriterText = fullText.slice(0, charIndex);
      this.cdr.markForCheck();

      if (charIndex >= fullText.length) {
        this.detenerTypewriter();
        this.isTyping = false;
        this.typewriterHasRunOnce = true;
        this.cdr.markForCheck();
      }
    }, TYPEWRITER_SPEED_MS);
  }

  private detenerTypewriter(): void {
    if (this.typewriterInterval !== null) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = null;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Lectura en voz alta (TTS)
  // ══════════════════════════════════════════════════════════════════════════

  toggleTTS(): void {
    if (!('speechSynthesis' in window)) return;

    if (this.isSpeaking) {
      this.cancelarTTS();
      return;
    }

    const texto = this.articulo?.texto_html || '';
    const temp  = document.createElement('div');
    temp.innerHTML = texto;
    const plainText = temp.textContent || temp.innerText || '';
    if (!plainText.trim()) return;

    const utterance  = new SpeechSynthesisUtterance(plainText);
    utterance.lang   = 'es-ES';
    utterance.rate   = 0.95;
    utterance.pitch  = 1;

    utterance.onstart = () => { this.isSpeaking = true;  this.cdr.markForCheck(); };
    utterance.onend   = () => { this.isSpeaking = false; this.cdr.markForCheck(); };
    utterance.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      this.isSpeaking = false;
      this.cdr.markForCheck();
    };

    window.speechSynthesis.speak(utterance);
  }

  private cancelarTTS(): void {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    this.isSpeaking = false;
  }
}
