import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { environment } from '../../../environments/environment';

interface NuevoUsuarioFormulario {
  titulo: string;
  textos: Record<string, string>;
  ayudas: Record<string, string>;
}

interface NuevoUsuarioRespuesta {
  id: string;
  estado: string;
}

function validarCoincidenciaContrasenas(control: AbstractControl): ValidationErrors | null {
  const contrasena = control.get('contrasena')?.value;
  const confirmarContrasena = control.get('confirmar_contrasena')?.value;
  return confirmarContrasena && contrasena !== confirmarContrasena
    ? { contrasenasNoCoinciden: true }
    : null;
}

function validarFechaNacimiento(control: AbstractControl): ValidationErrors | null {
  const dia = Number(control.get('dia_nacimiento')?.value ?? NaN);
  const mes = Number(control.get('mes_nacimiento')?.value ?? NaN);
  const anio = Number(control.get('anio_nacimiento')?.value ?? NaN);

  const camposObligatorios = [dia, mes, anio].some((valor) => Number.isNaN(valor));
  if (camposObligatorios) {
    return { fechaNacimientoInvalida: true };
  }

  const fecha = new Date(anio, mes - 1, dia);
  const esFechaValida =
    fecha.getFullYear() === anio &&
    fecha.getMonth() === mes - 1 &&
    fecha.getDate() === dia &&
    fecha <= new Date();

  return esFechaValida ? null : { fechaNacimientoInvalida: true };
}

@Component({
  selector: 'app-nuevo-usuario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './nuevo-usuario.component.html',
  styleUrl: './nuevo-usuario.component.scss'
})
export class NuevoUsuarioComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly formBuilder = inject(FormBuilder);
  private readonly apiUrl = `${environment.apiBaseUrl}/nuevo-usuario`;

  readonly form = this.formBuilder.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    apellidos: ['', [Validators.required, Validators.maxLength(120)]],
    seudonimo: ['', [Validators.required, Validators.maxLength(50)]],
    dia_nacimiento: ['', Validators.required],
    mes_nacimiento: ['', Validators.required],
    anio_nacimiento: ['', Validators.required],
    contacto: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    contrasena: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
    confirmar_contrasena: ['', [Validators.required, Validators.maxLength(128)]]
  }, {
    validators: [validarCoincidenciaContrasenas, validarFechaNacimiento]
  });

  readonly dias = Array.from({ length: 31 }, (_, index) => index + 1);
  readonly meses = Array.from({ length: 12 }, (_, index) => index + 1);
  readonly anios = Array.from(
    { length: new Date().getFullYear() - 1900 + 1 },
    (_, index) => new Date().getFullYear() - index
  );

  formulario: NuevoUsuarioFormulario | null = null;
  ayudaVisible: string | null = null;
  cargando = true;
  enviando = false;
  enviado = false;
  error = '';

  ngOnInit(): void {
    this.http.get<NuevoUsuarioFormulario>(`${this.apiUrl}/formulario`).subscribe({
      next: (formulario) => {
        this.formulario = formulario;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar el formulario de nuevo usuario:', error);
        this.error = 'No fue posible cargar el formulario. Inténtalo de nuevo más tarde.';
        this.cargando = false;
      }
    });
  }

  alternarAyuda(campo: string): void {
    this.ayudaVisible = this.ayudaVisible === campo ? null : campo;
  }

  enviarRegistro(): void {
    if (this.form.invalid || this.enviando || !this.formulario) {
      this.form.markAllAsTouched();
      return;
    }

    const valores = this.form.getRawValue();
    this.enviando = true;
    this.enviado = false;
    this.error = '';
    this.http.post<NuevoUsuarioRespuesta>(this.apiUrl, {
      nombre: valores.nombre,
      apellidos: valores.apellidos,
      seudonimo: valores.seudonimo,
      dia_nacimiento: Number(valores.dia_nacimiento),
      mes_nacimiento: Number(valores.mes_nacimiento),
      anio_nacimiento: Number(valores.anio_nacimiento),
      contacto: valores.contacto,
      contrasena: valores.contrasena,
      confirmar_contrasena: valores.confirmar_contrasena
    }).subscribe({
      next: () => {
        this.enviado = true;
        this.form.reset();
        this.enviando = false;
      },
      error: (error) => {
        console.error('Error al guardar el registro de nuevo usuario:', error);
        const detalle = error?.error?.detail;
        const detalleValidacion = Array.isArray(detalle)
          ? detalle.map((item: unknown) => {
              if (typeof item !== 'object' || item === null || !('msg' in item)) {
                return '';
              }
              return typeof item.msg === 'string' ? item.msg : '';
            }).filter(Boolean).join(' ')
          : '';

        if (error.status === 409) {
          this.error = (typeof detalle === 'string' ? detalle : '') || this.formulario?.textos['error_usuario_duplicado'] || 'Ese correo o seudónimo ya están registrados.';
        } else if (error.status === 422) {
          this.error = (typeof detalle === 'string' ? detalle : detalleValidacion)
            || this.formulario?.textos['error_envio']
            || 'No fue posible guardar tus datos. Inténtalo de nuevo.';
        } else {
          this.error = this.formulario?.textos['error_envio'] ?? 'No fue posible guardar tus datos. Inténtalo de nuevo.';
        }
        this.enviando = false;
      }
    });
  }
}
