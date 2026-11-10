import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Input,
  OnChanges,
  SimpleChanges,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { FeedContractService } from './feed-contract.service';
import { FeedApiService } from './feed-api.service';
import { BloqueFeed, ArticuloFeed, ComentarioFeed } from './feed.models';
import { BlockImageComponent } from './blocks/block-image.component';
import { BlockTextComponent } from './blocks/block-text.component';
import { BlockVideoComponent } from './blocks/block-video.component';
import { BlockFormComponent } from './blocks/block-form.component';

@Component({
  selector: 'app-article-host',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BlockImageComponent,
    BlockTextComponent,
    BlockVideoComponent,
    BlockFormComponent,
  ],
  templateUrl: './article-host.component.html',
  styleUrl: './article-host.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleHostComponent implements OnChanges {
  private readonly contrato = inject(FeedContractService);
  private readonly api = inject(FeedApiService);
  private readonly destroyRef = inject(DestroyRef);

  @Input({ required: true }) articulo!: ArticuloFeed;
  @Input({ required: true }) posicion!: number;
  @Input({ required: true }) totalArticulos!: number;

  readonly interacciones = signal<{
    me_gusta: boolean;
    total_me_gusta: number;
    comentarios: ComentarioFeed[];
  } | null>(null);
  readonly comentariosAbiertos = signal(false);
  readonly comentarioBorrador = signal('');
  readonly actualizandoMeGusta = signal(false);
  readonly enviandoComentario = signal(false);
  readonly errorInteraccion = signal<string | null>(null);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['articulo']) {
      this.interacciones.set({
        me_gusta: this.articulo.me_gusta,
        total_me_gusta: this.articulo.total_me_gusta,
        comentarios: [...this.articulo.comentarios]
      });
    }
  }

  texto(clave: string): string {
    return this.contrato.texto(clave);
  }

  alternarMeGusta(): void {
    if (this.actualizandoMeGusta()) {
      return;
    }
    this.actualizandoMeGusta.set(true);
    this.errorInteraccion.set(null);
    this.api
      .alternarMeGusta(this.articulo.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          const actual = this.obtenerInteracciones();
          this.interacciones.set({
            ...actual,
            me_gusta: respuesta.me_gusta,
            total_me_gusta: respuesta.total_me_gusta
          });
          this.actualizandoMeGusta.set(false);
        },
        error: (error: unknown) => {
          console.error('No fue posible registrar el Me gusta:', error);
          this.errorInteraccion.set(this.mensajeErrorInteraccion(error));
          this.actualizandoMeGusta.set(false);
        }
      });
  }

  alternarComentarios(): void {
    this.comentariosAbiertos.update((abiertos) => !abiertos);
  }

  publicarComentario(): void {
    const contenido = this.comentarioBorrador().trim();
    if (!contenido || this.enviandoComentario()) {
      return;
    }
    this.enviandoComentario.set(true);
    this.errorInteraccion.set(null);
    this.api
      .crearComentario(this.articulo.id, contenido)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (comentario) => {
          const actual = this.obtenerInteracciones();
          this.interacciones.set({
            ...actual,
            comentarios: [...actual.comentarios, comentario]
          });
          this.comentarioBorrador.set('');
          this.enviandoComentario.set(false);
        },
        error: (error: unknown) => {
          console.error('No fue posible guardar el comentario:', error);
          this.errorInteraccion.set(this.mensajeErrorInteraccion(error));
          this.enviandoComentario.set(false);
        }
      });
  }

  meGusta(): boolean {
    return this.obtenerInteracciones().me_gusta;
  }

  totalMeGusta(): number {
    return this.obtenerInteracciones().total_me_gusta;
  }

  comentarios(): ComentarioFeed[] {
    return this.obtenerInteracciones().comentarios;
  }

  aspectoBloque(bloque: BloqueFeed): string | null {
    const ancho = bloque.payload['ancho'];
    const alto = bloque.payload['alto'];
    if (
      typeof ancho === 'number' &&
      Number.isFinite(ancho) &&
      ancho > 0 &&
      typeof alto === 'number' &&
      Number.isFinite(alto) &&
      alto > 0
    ) {
      return `${ancho} / ${alto}`;
    }
    return null;
  }

  formId(bloque: BloqueFeed): string | null {
    const formId = bloque.payload['formId'];
    return typeof formId === 'string' && formId.length > 0 ? formId : null;
  }

  private obtenerInteracciones(): {
    me_gusta: boolean;
    total_me_gusta: number;
    comentarios: ComentarioFeed[];
  } {
    return (
      this.interacciones() ?? {
        me_gusta: this.articulo.me_gusta,
        total_me_gusta: this.articulo.total_me_gusta,
        comentarios: this.articulo.comentarios
      }
    );
  }

  private mensajeErrorInteraccion(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const respuesta: unknown = error.error;
      if (
        typeof respuesta === 'object' &&
        respuesta !== null &&
        'mensaje' in respuesta &&
        typeof respuesta.mensaje === 'string'
      ) {
        return respuesta.mensaje;
      }
    }
    return this.texto('feed.interaction.error');
  }
}
