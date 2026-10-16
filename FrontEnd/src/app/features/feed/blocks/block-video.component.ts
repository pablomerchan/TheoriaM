import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';

import { FeedContractService } from '../feed-contract.service';

interface VideoFeed {
  url: string;
  poster: string | null;
  ancho: number;
  alto: number;
  subtitulosUrl: string | null;
  transcripcion: string | null;
}

@Component({
  selector: 'app-block-video',
  standalone: true,
  templateUrl: './block-video.component.html',
  styleUrl: './block-video.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlockVideoComponent implements AfterViewInit, OnDestroy {
  private readonly contrato = inject(FeedContractService);

  @Input({ required: true }) payload!: Record<string, unknown>;
  @ViewChild('videoElement') private videoElement?: ElementRef<HTMLVideoElement>;

  private observer: IntersectionObserver | null = null;

  video(): VideoFeed | null {
    const { url, poster, ancho, alto } = this.payload;
    const subtitulos = this.payload['subtitulos_url'];
    const transcripcion = this.payload['transcripcion'];
    if (
      typeof url !== 'string' ||
      url.length === 0 ||
      typeof ancho !== 'number' ||
      !Number.isInteger(ancho) ||
      ancho <= 0 ||
      typeof alto !== 'number' ||
      !Number.isInteger(alto) ||
      alto <= 0
    ) {
      return null;
    }

    return {
      url,
      poster: typeof poster === 'string' && poster.length > 0 ? poster : null,
      ancho,
      alto,
      subtitulosUrl: typeof subtitulos === 'string' && subtitulos.length > 0 ? subtitulos : null,
      transcripcion:
        typeof transcripcion === 'string' && transcripcion.trim().length > 0 ? transcripcion : null,
    };
  }

  texto(clave: string): string {
    return this.contrato.texto(clave);
  }

  ngAfterViewInit(): void {
    const video = this.videoElement?.nativeElement;
    if (!video || typeof IntersectionObserver === 'undefined') {
      return;
    }

    this.observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => !entry.isIntersecting)) {
        video.pause();
      }
    });
    this.observer.observe(video);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.videoElement?.nativeElement.pause();
  }
}
