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

const TYPEWRITER_SPEED_MS = 20;

const TYPEWRITER_SESSION_KEY = 'textoGpt_typewriterPlayed';

export interface ArticuloItem {
  id: number;
  id_usuario: number;
  texto_html: string;
  media_url: string | null;
  media_url_webm: string | null;
  media_tipo: 'imagen' | 'video';
  orden: number;
  tipo_asesoria?: string;
}

@Component({
  selector: 'app-texto-gpt',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './texto-gpt.component.html',
  styleUrls: ['./texto-gpt.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TextoGPTComponent implements OnInit, OnChanges, OnDestroy {

  // ── Inputs ────────────────────────────────────────────────────────────────
  @Input() idUsuario: any = '1';
  @Input() tipoAsesoria?: string;

  // ── Servicios ─────────────────────────────────────────────────────────────
  private http      = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);
  private cdr       = inject(ChangeDetectorRef);

  private readonly apiUrl = 'http://localhost:3000/api/asesoria/articulo';

  // ── Estado ────────────────────────────────────────────────────────────────
  articulo: ArticuloItem | null = null;
  textoHtml: SafeHtml = '';

  typewriterHtml: SafeHtml = '';
  isTyping: boolean = false;

  // ── TTS ───────────────────────────────────────────────────────────────────
  isSpeaking: boolean = false;

  // ── Interacciones Sociales ─────────────────────────────────────────────────
  isLiked: boolean = false;
  isCommented: boolean = false;
  isReposted: boolean = false;
  isShared: boolean = false;
  isFavorited: boolean = false;

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
        },
        error: (err) => {
          console.error('[TextoGPT] Error al cargar artículo:', err);
          this.articulo = null;
          this.cdr.markForCheck();
        }
      })
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Efecto Typewriter
  // ══════════════════════════════════════════════════════════════════════════

  private iniciarTypewriter(rawHtml: string): void {
    this.detenerTypewriter();
    this.typewriterHtml = '';

    // Solo anima si nunca se ejecutó en esta sesión (persiste incluso tras F5).
    if (sessionStorage.getItem(TYPEWRITER_SESSION_KEY) === '1') {
      this.isTyping = false;
      this.cdr.markForCheck();
      return;
    }

    this.isTyping = true;
    this.cdr.markForCheck();

    if (!rawHtml || !rawHtml.trim()) {
      this.isTyping = false;
      return;
    }

    // Avanza carácter a carácter sobre el HTML raw.
    // Cuando detecta el inicio de un tag (<), lo emite completo de golpe
    // para no romper el HTML y que el navegador lo renderice correctamente.
    let charIndex = 0;
    const html = rawHtml;

    this.typewriterInterval = setInterval(() => {
      if (charIndex >= html.length) {
        this.detenerTypewriter();
        this.isTyping = false;
        sessionStorage.setItem(TYPEWRITER_SESSION_KEY, '1');  // persiste tras F5
        this.typewriterHtml = this.sanitizer.bypassSecurityTrustHtml(html);
        this.cdr.markForCheck();
        return;
      }

      // Si el carácter actual es inicio de tag, avanzar hasta cerrarlo
      if (html[charIndex] === '<') {
        const closeIdx = html.indexOf('>', charIndex);
        if (closeIdx !== -1) {
          charIndex = closeIdx + 1;
        } else {
          charIndex++;
        }
      } else {
        charIndex++;
      }

      // Emitir el fragmento HTML hasta el índice actual
      this.typewriterHtml = this.sanitizer.bypassSecurityTrustHtml(
        html.slice(0, charIndex)
      );
      this.cdr.markForCheck();
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

  // ══════════════════════════════════════════════════════════════════════════
  //  Barra de opciones (Me gusta, comentar, repostear, compartir, favoritos)
  // ══════════════════════════════════════════════════════════════════════════

  toggleLike(): void {
    this.isLiked = !this.isLiked;
    console.log('[TextoGPT] Me gusta toggled:', this.isLiked);
    this.cdr.markForCheck();
  }

  toggleComment(): void {
    this.isCommented = !this.isCommented;
    console.log('[TextoGPT] Comentar toggled:', this.isCommented);
    this.cdr.markForCheck();
  }

  toggleRepost(): void {
    this.isReposted = !this.isReposted;
    console.log('[TextoGPT] Repostear toggled:', this.isReposted);
    this.cdr.markForCheck();
  }

  toggleShare(): void {
    this.isShared = !this.isShared;
    console.log('[TextoGPT] Compartir toggled:', this.isShared);
    if (this.isShared && navigator.share && this.articulo) {
      const temp = document.createElement('div');
      temp.innerHTML = this.articulo.texto_html;
      const plainText = temp.textContent || temp.innerText || '';
      navigator.share({
        title: 'Asesoría - TheorIA M',
        text: plainText,
        url: window.location.href
      }).catch(err => console.log('[TextoGPT] Share canceled or failed:', err));
    }
    this.cdr.markForCheck();
  }

  toggleFavorite(): void {
    this.isFavorited = !this.isFavorited;
    console.log('[TextoGPT] Favorito toggled:', this.isFavorited);
    this.cdr.markForCheck();
  }
}
