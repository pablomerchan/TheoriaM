import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import {
  FormControl,
  FormRecord,
  ReactiveFormsModule,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';

interface OpcionCaracteristica {
  valor: string;
  etiqueta: string;
}

interface CampoCaracteristica {
  clave: string;
  tipo: 'dropdown' | 'number';
  etiqueta: string;
  placeholder: string;
  ayuda_html: string;
  requerido: boolean;
  minimo: number | null;
  maximo: number | null;
  paso: number | null;
  opciones: OpcionCaracteristica[];
}

interface ConfiguracionCaracteristicas {
  textos: Record<string, string>;
  saludo: string;
  campos: CampoCaracteristica[];
  menu: Array<{ etiqueta: string; ruta: string }>;
}

type ValoresCaracteristicas = Record<string, string | number | null>;

@Component({
  selector: 'app-caracteristicas-fisicas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './caracteristicas_fisicas.component.html',
  styleUrl: './caracteristicas_fisicas.component.scss'
})
export class CaracteristicasFisicasComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = `${environment.apiBaseUrl}/caracteristicas-fisicas`;

  readonly form = new FormRecord<FormControl<string | number | null>>({});
  configuracion: ConfiguracionCaracteristicas | null = null;
  rutaAnterior: string | null = null;
  cargando = true;
  cargandoValores = false;
  guardando = false;
  error = '';
  mensaje = '';
  private readonly ayudasVisibles = new Set<string>();
  private readonly ayudasExpandidas = new Set<string>();

  ngOnInit(): void {
    const token = this.obtenerToken();
    if (!token) {
      this.cargando = false;
      this.redirigirALogin();
      return;
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.get<ConfiguracionCaracteristicas>(`${this.apiUrl}/configuracion`, { headers }).subscribe({
      next: (configuracion) => {
        this.configuracion = configuracion;
        this.rutaAnterior = configuracion.textos['ruta_anterior'];
        this.crearControles(configuracion.campos);
        this.cargando = false;
        this.cargandoValores = true;
        this.form.disable();
        this.http.get<ValoresCaracteristicas | null>(this.apiUrl, { headers }).subscribe({
          next: (valores) => {
            if (valores) {
              for (const campo of configuracion.campos) {
                const valor = valores[campo.clave] ?? null;
                const valorNormalizado =
                  campo.tipo === 'dropdown' && typeof valor === 'string'
                    ? campo.opciones.find(
                        (opcion) =>
                          opcion.valor.trim().toLocaleLowerCase() ===
                            valor.trim().toLocaleLowerCase() ||
                          opcion.etiqueta.trim().toLocaleLowerCase() ===
                            valor.trim().toLocaleLowerCase()
                      )?.valor ?? valor
                    : valor;
                this.form.controls[campo.clave]?.setValue(valorNormalizado);
              }
            }
            this.cargandoValores = false;
            this.form.enable();
          },
          error: (error: HttpErrorResponse) => {
            console.error('No fue posible cargar las características físicas guardadas:', error);
            if (error.status === 401) {
              this.redirigirALogin();
              return;
            }
            this.error = this.obtenerDetalleError(error) || configuracion.textos['error_carga'];
            this.cargandoValores = false;
            this.form.enable();
          }
        });
      },
      error: (error: HttpErrorResponse) => {
        console.error('No fue posible cargar la configuración de características físicas:', error);
        if (error.status === 401) {
          this.redirigirALogin();
          return;
        }
        this.error = this.obtenerDetalleError(error);
        this.cargando = false;
      }
    });
  }

  mostrarAyuda(clave: string): void {
    if (this.ayudasVisibles.has(clave)) {
      this.ayudasVisibles.delete(clave);
    } else {
      this.ayudasVisibles.add(clave);
    }
  }

  ayudaVisible(clave: string): boolean {
    return this.ayudasVisibles.has(clave);
  }

  alternarAyudaExpandida(clave: string): void {
    if (this.ayudasExpandidas.has(clave)) {
      this.ayudasExpandidas.delete(clave);
    } else {
      this.ayudasExpandidas.add(clave);
    }
  }

  ayudaExpandida(clave: string): boolean {
    return this.ayudasExpandidas.has(clave);
  }

  tieneMasContenido(elemento: HTMLElement): boolean {
    return elemento.scrollHeight > 140;
  }

  guardar(): void {
    if (this.form.invalid || this.guardando || this.cargandoValores || !this.configuracion) {
      this.form.markAllAsTouched();
      return;
    }

    const token = this.obtenerToken();
    if (!token) {
      this.redirigirALogin();
      return;
    }

    this.guardando = true;
    this.error = '';
    this.mensaje = '';
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.post<{ mensaje: string }>(this.apiUrl, this.form.getRawValue(), { headers }).subscribe({
      next: (respuesta) => {
        this.mensaje = respuesta.mensaje;
        this.guardando = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('No fue posible guardar las características físicas:', error);
        if (error.status === 401) {
          this.redirigirALogin();
          return;
        }
        this.error = this.obtenerDetalleError(error) || this.configuracion?.textos['error_envio'] || '';
        this.guardando = false;
      }
    });
  }

  private crearControles(campos: CampoCaracteristica[]): void {
    for (const campo of campos) {
      const validadores: ValidatorFn[] = [];
      if (campo.requerido) {
        validadores.push(Validators.required);
      }
      if (campo.tipo === 'number' && campo.minimo !== null) {
        validadores.push(Validators.min(campo.minimo));
      }
      if (campo.tipo === 'number' && campo.maximo !== null) {
        validadores.push(Validators.max(campo.maximo));
      }
      this.form.addControl(campo.clave, new FormControl<string | number | null>(null, validadores));
    }
  }

  private obtenerToken(): string | null {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem('theoriam_token');
  }

  private redirigirALogin(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('theoriam_token');
    }
    this.router.navigate(['/iniciar-sesion'], {
      queryParams: { returnUrl: this.router.url }
    });
  }

  private obtenerDetalleError(error: HttpErrorResponse): string {
    const detalle: unknown = error.error?.detail;
    return typeof detalle === 'string' ? detalle : '';
  }
}
