import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AsesoriaService } from '../../services/asesoria';
import { WebmasterArticuloService } from '../../services/webmaster-articulo.service';

@Component({
  selector: 'app-webmaster-articulo',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './webmaster-articulo.component.html',
  styleUrls: ['./webmaster-articulo.component.scss']
})
export class WebmasterArticuloComponent implements OnInit {
  private service = inject(WebmasterArticuloService);
  private asesoriaService = inject(AsesoriaService);
  private sanitizer = inject(DomSanitizer);

  articulos: any[] = [];
  menus: any[] = [];
  editing: any = null;
  selectedArticulo: any = null;
  selectedArticuloHtml: SafeHtml | null = null;
  selectedMenuRows: any[] = [];
  saving = false;
  message: string | null = null;
  errorMessage: string | null = null;

  form: any = {
    id_usuario: 1,
    texto_html: '',
    media_url: '',
    media_tipo: 'imagen',
    orden: 0,
    tipo_asesoria: '',
    titulo: '',
    menu_servicio_id: 28,
    observacion: 'Artículo gestionado desde webmaster',
    visible: 1
  };

  ngOnInit(): void {
    this.loadMenus();
    this.load();
  }

  loadMenus(): void {
    this.asesoriaService.getMenus().subscribe({
      next: (data) => {
        this.menus = data;
        if (!this.form.menu_servicio_id && this.menus.length) {
          this.form.menu_servicio_id = this.menus[0].id;
        }
      },
      error: (e) => console.error(e)
    });
  }

  load(): void {
    this.errorMessage = null;
    this.service.list(undefined, undefined, false).subscribe({
      next: (data) => this.articulos = data,
      error: (e) => this.errorMessage = 'No se pudieron cargar los artículos.'
    });
  }

  edit(a: any): void {
    this.editing = a;
    this.form = {
      id_usuario: a.id_usuario ?? 1,
      texto_html: a.texto_html ?? '',
      media_url: a.media_url ?? '',
      media_tipo: a.media_tipo ?? 'imagen',
      orden: a.orden ?? 0,
      tipo_asesoria: a.tipo_asesoria ?? '',
      titulo: a.titulo ?? '',
      menu_servicio_id: a.menu_servicio_id ?? this.menus[0]?.id ?? 28,
      observacion: 'Artículo gestionado desde webmaster',
      visible: a.visible ?? 1
    };
    this.service.getMenuByArticulo(a.id).subscribe({
      next: (menuData) => {
        if (menuData && menuData.length) {
          this.form.observacion = menuData[0].observacion || this.form.observacion;
        }
      },
      error: () => {
        // ignore
      }
    });
    this.message = 'Editando artículo ' + a.id;
    this.errorMessage = null;
  }

  clearForm(): void {
    this.editing = null;
    this.form = {
      id_usuario: 1,
      texto_html: '',
      media_url: '',
      media_tipo: 'imagen',
      orden: 0,
      tipo_asesoria: '',
      titulo: '',
      menu_servicio_id: this.menus[0]?.id ?? 28,
      observacion: 'Artículo gestionado desde webmaster',
      visible: 1
    };
    this.selectedMenuRows = [];
    this.message = null;
    this.errorMessage = null;
  }

  save(): void {
    this.errorMessage = null;
    this.message = null;

    if (!this.form.titulo || !this.form.tipo_asesoria) {
      this.errorMessage = 'El título y el tipo de asesoría son obligatorios.';
      return;
    }

    this.saving = true;
    const payload = { ...this.form };

    if (this.editing) {
      const menu_updates = {
        menu_servicio_id: this.form.menu_servicio_id,
        titulo: this.form.titulo,
        orden: this.form.orden,
        visible: this.form.visible,
        observacion: this.form.observacion
      };

      this.service.update(this.editing.id, { updates: payload, menu_updates }).subscribe({
        next: () => {
          this.saving = false;
          this.message = 'Artículo actualizado correctamente.';
          this.load();
          this.clearForm();
        },
        error: (e) => {
          this.saving = false;
          this.errorMessage = 'No se pudo actualizar el artículo.';
          console.error(e);
        }
      });
    } else {
      this.service.create(
        payload,
        this.form.menu_servicio_id,
        this.form.titulo,
        undefined,
        this.form.observacion,
      ).subscribe({
        next: () => {
          this.saving = false;
          this.message = 'Artículo creado correctamente.';
          this.load();
          this.clearForm();
        },
        error: (e) => {
          this.saving = false;
          this.errorMessage = 'No se pudo crear el artículo.';
          console.error(e);
        }
      });
    }
  }

  remove(a: any): void {
    if (!confirm('¿Eliminar artículo (soft)?')) {
      return;
    }
    this.service.delete(a.id, true).subscribe({
      next: () => this.load(),
      error: (e) => console.error(e)
    });
  }

  viewContent(a: any): void {
    this.errorMessage = null;
    this.selectedMenuRows = [];
    this.service.get(a.id).subscribe({
      next: (data) => {
        this.selectedArticulo = data;
        this.selectedArticuloHtml = data.texto_html ? this.sanitizer.bypassSecurityTrustHtml(data.texto_html) : null;
        this.service.getMenuByArticulo(a.id).subscribe({
          next: (menuData) => {
            this.selectedMenuRows = menuData || [];
          },
          error: (menuError) => {
            console.error(menuError);
            this.selectedMenuRows = [];
          }
        });
      },
      error: (e) => {
        console.error(e);
        this.errorMessage = 'No se pudo cargar el contenido del artículo.';
      }
    });
  }
}
