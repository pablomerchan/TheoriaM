import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebmasterArticuloService } from '../../services/webmaster-articulo.service';
import { AsesoriaService } from '../../services/asesoria';

@Component({
  selector: 'app-webmaster-articulo-add',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './webmaster-articulo-add.component.html',
  styleUrls: ['./webmaster-articulo-add.component.scss']
})
export class WebmasterArticuloAddComponent implements OnInit {
  private service = inject(WebmasterArticuloService);
  private asesoria = inject(AsesoriaService);

  form: any = {
    id_usuario: 1,
    texto_html: '<h2>Título</h2>\n<p>Contenido...</p>',
    media_url: '',
    media_tipo: 'imagen',
    orden: 0,
    tipo_asesoria: '',
    titulo: '',
    menu_servicio_id: 28,
    observacion: 'Artículo gestionado desde webmaster',
    visible: 1
  };

  menus: any[] = [];
  saving = false;
  error: string | null = null;
  successMessage: string | null = null;

  ngOnInit(): void {
    this.loadMenus();
  }

  loadMenus(): void {
    this.asesoria.getMenus().subscribe({
      next: (d) => {
        this.menus = d;
        if (!this.form.menu_servicio_id && this.menus.length) {
          this.form.menu_servicio_id = this.menus[0].id;
        }
      },
      error: (e) => console.error(e)
    });
  }

  validate(): string | null {
    if (!this.form.titulo || !this.form.titulo.trim()) return 'El título es obligatorio.';
    if (!this.form.tipo_asesoria || !this.form.tipo_asesoria.trim()) return 'El tipo de asesoría es obligatorio.';
    return null;
  }

  submit(): void {
    this.error = null;
    this.successMessage = null;
    const validation = this.validate();
    if (validation) {
      this.error = validation;
      return;
    }

    this.saving = true;
    const payload = { ...this.form };
    this.service.create(
      payload,
      this.form.menu_servicio_id,
      this.form.titulo,
      undefined,
      this.form.observacion,
    ).subscribe({
      next: (r) => {
        this.saving = false;
        this.successMessage = 'Artículo creado correctamente.';
        this.error = null;
        this.form = {
          id_usuario: 1,
          texto_html: '<h2>Título</h2>\n<p>Contenido...</p>',
          media_url: '',
          media_tipo: 'imagen',
          orden: 0,
          tipo_asesoria: '',
          titulo: '',
          menu_servicio_id: this.menus[0]?.id ?? 28,
          observacion: 'Artículo gestionado desde webmaster',
          visible: 1
        };
      },
      error: (err) => {
        this.saving = false;
        this.error = err?.message || err?.error || 'Error al crear el artículo.';
        console.error(err);
      }
    });
  }

  previewHtml(): string {
    return this.form.texto_html || '';
  }
}
