import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

interface LandingPageItem {
  id: number;
  titulo: string | null;
  subtitulo: string | null;
  descripcion: string | null;
  imagen_url: string | null;
  boton_texto: string | null;
  boton_url: string | null;
  visible: boolean | number;
  orden: number;
}

@Component({
  selector: 'app-service-landing-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './service_landing_page.component.html',
  styleUrls: ['./service_landing_page.component.scss']
})
export class ServiceLandingPageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api/landing-page';

  items: LandingPageItem[] = [];
  loading = true;
  error = false;

  get hero(): LandingPageItem | undefined {
    return this.items[0];
  }

  get imageCards(): LandingPageItem[] {
    return this.items.slice(1).filter(item => Boolean(item.imagen_url));
  }

  get descriptionBlocks(): LandingPageItem[] {
    return this.items.slice(1).filter(item => !item.imagen_url);
  }

  ngOnInit(): void {
    this.http.get<LandingPageItem[]>(this.apiUrl).subscribe({
      next: (items) => {
        this.items = (items || [])
          .filter(item => item.visible === true || item.visible === 1)
          .sort((left, right) => Number(left.orden || 0) - Number(right.orden || 0));
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar la landing page:', error);
        this.error = true;
        this.loading = false;
      }
    });
  }
}
