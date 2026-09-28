import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';

interface CentroContenido {
  id: number;
  titulo: string;
  descripcion: string | null;
  imagen_url: string | null;
  icono: string | null;
  orden: number;
}

interface CentroSeccion {
  id: number;
  etiqueta: string;
  titulo: string;
  descripcion: string | null;
  icono: string | null;
  orden: number;
  contenidos: CentroContenido[];
}

interface CentroInformacion {
  titulo: string;
  descripcion: string;
  secciones: CentroSeccion[];
}

@Component({
  selector: 'app-centro-informacion',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './centro_informacion.component.html',
  styleUrls: ['./centro_informacion.component.scss']
})
export class CentroInformacionComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api/centro-informacion';

  titulo = 'Centro de información';
  descripcion = '';
  secciones: CentroSeccion[] = [];
  selectedSectionId: number | null = null;
  searchTerm = '';
  loading = true;
  error = false;

  get seccionesMostradas(): CentroSeccion[] {
    const termino = this.searchTerm.trim().toLocaleLowerCase();
    const candidatas = termino || this.selectedSectionId === null
      ? this.secciones
      : this.secciones.filter(seccion => seccion.id === this.selectedSectionId);

    if (!termino) {
      return candidatas;
    }

    return candidatas
      .map(seccion => ({
        ...seccion,
        contenidos: seccion.contenidos.filter(contenido =>
          `${contenido.titulo} ${contenido.descripcion || ''}`.toLocaleLowerCase().includes(termino)
        )
      }))
      .filter(seccion =>
        seccion.contenidos.length > 0 ||
        `${seccion.etiqueta} ${seccion.titulo} ${seccion.descripcion || ''}`.toLocaleLowerCase().includes(termino)
      );
  }

  ngOnInit(): void {
    this.http.get<CentroInformacion>(this.apiUrl).subscribe({
      next: (contenido) => {
        this.titulo = contenido.titulo;
        this.descripcion = contenido.descripcion;
        this.secciones = contenido.secciones || [];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar el centro de información:', error);
        this.error = true;
        this.loading = false;
      }
    });
  }

  seleccionarSeccion(id: number | null): void {
    this.selectedSectionId = id;
    this.searchTerm = '';
  }
}