import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { environment } from '../../../environments/environment';

interface IniciarSesionFormulario {
  titulo: string;
  textos: Record<string, string>;
  ayudas: Record<string, string>;
}

interface IniciarSesionRespuesta {
  token?: string;
  redirectTo?: string;
  expires_in?: number;
}

@Component({
  selector: 'app-iniciar-sesion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './iniciar-sesion.component.html',
  styleUrl: './iniciar-sesion.component.scss'
})
export class IniciarSesionComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly apiUrl = `${environment.apiBaseUrl}/iniciar-sesion`;

  readonly form = this.formBuilder.group({
    identificador: ['', [Validators.required, Validators.maxLength(254)]],
    contrasena: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]]
  });

  formulario: IniciarSesionFormulario | null = null;
  cargando = true;
  enviando = false;
  error = '';

  ngOnInit(): void {
    this.http.get<IniciarSesionFormulario>(`${this.apiUrl}/formulario`).subscribe({
      next: (formulario) => {
        this.formulario = formulario;
        this.cargando = false;
      },
      error: (error) => {
        console.error('No fue posible cargar el formulario de inicio de sesión:', error);
        this.error = 'No fue posible cargar el formulario. Inténtalo de nuevo más tarde.';
        this.cargando = false;
      }
    });
  }

  enviarLogin(): void {
    if (this.form.invalid || this.enviando || !this.formulario) {
      this.form.markAllAsTouched();
      return;
    }

    const valores = this.form.getRawValue();
    this.enviando = true;
    this.error = '';

    this.http.post<IniciarSesionRespuesta>(this.apiUrl, {
      identificador: valores.identificador,
      contrasena: valores.contrasena
    }).subscribe({
      next: (respuesta) => {
        const token = respuesta.token;
        if (token) {
          localStorage.setItem('theoriam_token', token);
        }

        const destino = respuesta.redirectTo ?? '/';
        // TODO: definir la ruta final tras iniciar sesión.
        this.router.navigateByUrl(destino);
        this.enviando = false;
      },
      error: (error) => {
        console.error('Error al iniciar sesión:', error);
        this.error = this.formulario?.textos['error_envio'] ?? 'No fue posible iniciar sesión.';
        this.enviando = false;
      }
    });
  }
}
