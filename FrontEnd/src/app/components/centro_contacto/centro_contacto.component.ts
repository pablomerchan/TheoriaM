import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

interface CentroContactoRespuesta {
  id: number;
  notificacion_enviada: boolean;
}

@Component({
  selector: 'app-centro-contacto',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './centro_contacto.component.html',
  styleUrls: ['./centro_contacto.component.scss']
})
export class CentroContactoComponent {
  private readonly http = inject(HttpClient);
  private readonly formBuilder = inject(FormBuilder);
  private readonly apiUrl = 'http://localhost:3000/api/centro-contacto';

  readonly form = this.formBuilder.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    correo: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    asunto: ['', [Validators.required, Validators.maxLength(160)]],
    mensaje: ['', [Validators.required, Validators.maxLength(5000)]]
  });

  enviando = false;
  enviado = false;
  error = '';
  avisoCorreo = '';

  enviarSolicitud(): void {
    if (this.form.invalid || this.enviando) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando = true;
    this.enviado = false;
    this.error = '';
    this.avisoCorreo = '';

    this.http.post<CentroContactoRespuesta>(this.apiUrl, this.form.getRawValue()).subscribe({
      next: (respuesta) => {
        this.enviado = true;
        this.avisoCorreo = respuesta.notificacion_enviada
          ? 'También enviamos una copia al equipo de contacto.'
          : 'Tu solicitud quedó guardada; el envío de copias está pendiente de configurar.';
        this.form.reset();
        this.enviando = false;
      },
      error: (error) => {
        console.error('Error al guardar la solicitud de contacto:', error);
        this.error = 'No fue posible enviar tu solicitud. Inténtalo de nuevo.';
        this.enviando = false;
      }
    });
  }
}