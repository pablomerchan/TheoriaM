import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

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
  private readonly apiUrl = 'http://localhost:3000/api/nuevo-usuario';

  readonly form = this.formBuilder.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    apellidos: ['', [Validators.required, Validators.maxLength(120)]],
    seudonimo: ['', [Validators.required, Validators.maxLength(50)]],
    dia_nacimiento: ['', Validators.required],
    mes_nacimiento: ['', Validators.required],
    anio_nacimiento: ['', Validators.required],
    genero: [''],
    contacto: ['', [Validators.required, Validators.maxLength(254)]],
    contrasena: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
    confirmar_contrasena: ['', [Validators.required, Validators.maxLength(128)]]
  }, { validators: validarCoincidenciaContrasenas });

  readonly dias = Array.from({ length: 31 }, (_, index) => index + 1);
  readonly meses = Array.from({ length: 12 }, (_, index) => index + 1);
  readonly anios = Array.from(
    { length: new Date().getFullYear() - 1900 + 1 },
    (_, index) => new Date().getFullYear() - index
  );
  readonly opcionesGenero = ['mujer', 'hombre', 'no_binario', 'prefiero_no_decirlo'];

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
      ...valores,
      dia_nacimiento: Number(valores.dia_nacimiento),
      mes_nacimiento: Number(valores.mes_nacimiento),
      anio_nacimiento: Number(valores.anio_nacimiento),
      genero: valores.genero || null
    }).subscribe({
      next: () => {
        this.enviado = true;
        this.form.reset();
        this.enviando = false;
      },
      error: (error) => {
        console.error('Error al guardar el registro de nuevo usuario:', error);
        this.error = this.formulario?.textos['error_envio'] ?? 'No fue posible guardar tus datos. Inténtalo de nuevo.';
        this.enviando = false;
      }
    });
  }
}
