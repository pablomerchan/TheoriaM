import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Input,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormRecord,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { SessionService } from '../../../core/session.service';
import {
  CampoFormulario,
  DefinicionFormulario,
  ValorFormulario,
} from '../data/forms-mock-contract';
import { FeedContractService } from '../feed-contract.service';
import { FeedFormDefinitionService } from '../feed-form-definition.service';
import { FormResponsesApiService, RespuestaFormulario } from '../form-responses-api.service';

type EstadoFormulario = 'pendiente' | 'guardando' | 'guardado' | 'error';

interface BorradorFormulario {
  datos: Record<string, ValorFormulario>;
  clientRequestId: string | null;
}

interface DatosNormalizados {
  datos: Record<string, ValorFormulario>;
  invalido: boolean;
}

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

@Component({
  selector: 'app-block-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './block-form.component.html',
  styleUrl: './block-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlockFormComponent {
  private readonly api = inject(FormResponsesApiService);
  private readonly definiciones = inject(FeedFormDefinitionService);
  private readonly contrato = inject(FeedContractService);
  private readonly sesion = inject(SessionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  @Input({ required: true }) articuloId!: number;
  @Input({ required: true }) formId: string | null = null;

  readonly form = new FormRecord<FormControl<ValorFormulario>>({});
  readonly definicion = signal<DefinicionFormulario | null>(null);
  readonly cargando = signal(true);
  readonly estado = signal<EstadoFormulario>('pendiente');
  readonly mensajeError = signal<string | null>(null);
  readonly respuestaExistente = signal(false);
  readonly editando = signal(false);

  private claveBorrador: string | null = null;
  private clientRequestId: string | null = null;
  private datosDeSolicitud: string | null = null;
  private solicitudActual: Subscription | null = null;

  ngOnInit(): void {
    if (!this.formId) {
      this.fallarCarga('feed.form.error.definition');
      return;
    }

    const definicion = this.definiciones.obtener(this.formId);
    if (!definicion) {
      this.fallarCarga('feed.form.error.definition');
      return;
    }
    this.definicion.set(definicion);
    this.crearControles(definicion);
    this.form.disable({ emitEvent: false });
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.registrarCambio());

    const usuario = this.sesion.usuario();
    if (!usuario) {
      this.sesion.cerrarSesion();
      this.redirigirALogin();
      this.fallarCarga('feed.form.error.identity');
      return;
    }

    this.claveBorrador = `theoriam_feed_form:${usuario.id}:${this.articuloId}:${this.formId}`;
    const borrador = this.leerBorrador(definicion);
    this.solicitudActual = this.api
      .obtener(this.formId, this.articuloId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => this.cargarRespuesta(respuesta, borrador),
        error: (error: unknown) => this.errorAlCargar(error, borrador),
      });
  }

  texto(clave: string): string {
    return this.contrato.texto(clave);
  }

  controlId(clave: string): string {
    const formId = this.formId ?? 'sin-formulario';
    const id = `feed-form-${this.articuloId}-${formId}-${clave}`;
    return id.replace(/[^a-zA-Z0-9_-]/g, '-');
  }

  controlInvalido(campo: CampoFormulario): boolean {
    const control = this.form.controls[campo.clave];
    return Boolean(control?.invalid && control.touched);
  }

  textoEstado(): string {
    const claves: Record<EstadoFormulario, string> = {
      pendiente: 'feed.form.status.pending',
      guardando: 'feed.form.status.saving',
      guardado: 'feed.form.status.saved',
      error: 'feed.form.status.error',
    };
    return this.texto(claves[this.estado()]);
  }

  editar(): void {
    this.editando.set(true);
    this.form.enable({ emitEvent: false });
  }

  guardar(): void {
    if (this.cargando() || this.estado() === 'guardando' || !this.editando()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.formId || !this.definicion()) {
      this.fallarCarga('feed.form.error.definition');
      return;
    }

    const datos = this.form.getRawValue();
    const datosSerializados = JSON.stringify(datos);
    if (this.datosDeSolicitud !== datosSerializados || !this.clientRequestId) {
      const clientRequestId = this.crearClientRequestId();
      if (!clientRequestId) {
        this.estado.set('error');
        this.mensajeError.set(this.texto('feed.form.error.requestId'));
        return;
      }
      this.clientRequestId = clientRequestId;
      this.datosDeSolicitud = datosSerializados;
    }

    this.estado.set('guardando');
    this.mensajeError.set(null);
    this.form.disable({ emitEvent: false });
    this.persistirBorrador(datos, this.clientRequestId);
    this.solicitudActual = this.api
      .guardar(this.formId, {
        articulo_id: this.articuloId,
        client_request_id: this.clientRequestId,
        datos,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => this.confirmarGuardado(respuesta),
        error: (error: unknown) => this.errorAlGuardar(error),
      });
  }

  private crearControles(definicion: DefinicionFormulario): void {
    for (const campo of definicion.campos) {
      this.form.addControl(
        campo.clave,
        new FormControl<ValorFormulario>(null, this.validadores(campo)),
      );
    }
  }

  private validadores(campo: CampoFormulario): ValidatorFn[] {
    const validadores: ValidatorFn[] = [];
    if (campo.requerido) {
      validadores.push(campo.tipo === 'casilla' ? Validators.requiredTrue : Validators.required);
    }

    if (campo.tipo === 'texto' || campo.tipo === 'areaTexto') {
      if (campo.maxLength !== undefined) {
        validadores.push(Validators.maxLength(campo.maxLength));
      }
    } else if (campo.tipo === 'numero') {
      if (campo.minimo !== undefined) {
        validadores.push(Validators.min(campo.minimo));
      }
      if (campo.maximo !== undefined) {
        validadores.push(Validators.max(campo.maximo));
      }
    }
    return validadores;
  }

  private cargarRespuesta(
    respuesta: RespuestaFormulario | null,
    borrador: BorradorFormulario | null,
  ): void {
    if (respuesta) {
      this.respuestaExistente.set(true);
    }

    if (borrador) {
      this.aplicarDatos(borrador.datos);
      this.clientRequestId = borrador.clientRequestId;
      this.datosDeSolicitud = borrador.clientRequestId ? JSON.stringify(borrador.datos) : null;
      this.editando.set(true);
      this.form.enable({ emitEvent: false });
      this.estado.set('pendiente');
    } else if (respuesta) {
      const normalizados = this.normalizarDatos(respuesta.datos);
      this.aplicarDatos(normalizados.datos);
      this.form.enable({ emitEvent: false });
      if (normalizados.invalido || this.form.invalid) {
        this.mensajeError.set(this.texto('feed.form.error.response'));
        this.editando.set(true);
        this.estado.set('error');
      } else {
        this.editando.set(false);
        this.form.disable({ emitEvent: false });
        this.estado.set('guardado');
      }
    } else {
      this.editando.set(true);
      this.form.enable({ emitEvent: false });
      this.estado.set('pendiente');
    }

    this.cargando.set(false);
    this.solicitudActual = null;
  }

  private errorAlCargar(error: unknown, borrador: BorradorFormulario | null): void {
    console.error('No fue posible cargar la respuesta del formulario:', error);
    if (this.esNoAutorizado(error)) {
      this.sesion.cerrarSesion();
      this.redirigirALogin();
      this.cargando.set(false);
      this.solicitudActual = null;
      return;
    }

    this.mensajeError.set(this.mensajeApi(error, 'feed.form.error.load'));
    if (borrador) {
      this.cargarRespuesta(null, borrador);
      this.estado.set('error');
    } else {
      this.editando.set(true);
      this.form.enable({ emitEvent: false });
      this.cargando.set(false);
      this.estado.set('error');
      this.solicitudActual = null;
    }
  }

  private aplicarDatos(datos: Record<string, ValorFormulario>): void {
    this.form.patchValue(datos, { emitEvent: false });
  }

  private normalizarDatos(datos: unknown): DatosNormalizados {
    const definicion = this.definicion();
    if (!definicion || !esRegistro(datos)) {
      return { datos: {}, invalido: true };
    }

    const resultado: Record<string, ValorFormulario> = {};
    let invalido = false;
    for (const campo of definicion.campos) {
      const valor = datos[campo.clave];
      if (valor === undefined || valor === null) {
        resultado[campo.clave] = null;
        continue;
      }

      if ((campo.tipo === 'texto' || campo.tipo === 'areaTexto') && typeof valor === 'string') {
        resultado[campo.clave] = valor;
      } else if (campo.tipo === 'numero' && typeof valor === 'number' && Number.isFinite(valor)) {
        resultado[campo.clave] = valor;
      } else if (
        campo.tipo === 'seleccion' &&
        typeof valor === 'string' &&
        campo.opciones.some((opcion) => opcion.valor === valor)
      ) {
        resultado[campo.clave] = valor;
      } else if (campo.tipo === 'casilla' && typeof valor === 'boolean') {
        resultado[campo.clave] = valor;
      } else {
        resultado[campo.clave] = null;
        invalido = true;
      }
    }
    return { datos: resultado, invalido };
  }

  private leerBorrador(definicion: DefinicionFormulario): BorradorFormulario | null {
    if (!this.claveBorrador || typeof sessionStorage === 'undefined') {
      return null;
    }

    let contenido: string | null;
    try {
      contenido = sessionStorage.getItem(this.claveBorrador);
    } catch (error: unknown) {
      this.errorAlmacenamiento(error);
      return null;
    }
    if (contenido === null) {
      return null;
    }

    let borrador: unknown;
    try {
      borrador = JSON.parse(contenido);
    } catch (error: unknown) {
      if (!(error instanceof SyntaxError)) {
        throw error;
      }
      if (this.descartarBorrador()) {
        this.mensajeError.set(this.texto('feed.form.error.draft'));
      }
      return null;
    }

    if (!esRegistro(borrador)) {
      if (this.descartarBorrador()) {
        this.mensajeError.set(this.texto('feed.form.error.draft'));
      }
      return null;
    }

    const normalizados = this.normalizarDatos(borrador['datos']);
    if (normalizados.invalido) {
      if (this.descartarBorrador()) {
        this.mensajeError.set(this.texto('feed.form.error.draft'));
      }
      return null;
    }

    const clientRequestId = borrador['client_request_id'];
    const idValido =
      typeof clientRequestId === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        clientRequestId,
      );
    if (idValido) {
      this.clientRequestId = clientRequestId;
      this.datosDeSolicitud = JSON.stringify(normalizados.datos);
    }

    return {
      datos: normalizados.datos,
      clientRequestId: idValido ? clientRequestId : null,
    };
  }

  private registrarCambio(): void {
    if (this.cargando() || this.estado() === 'guardando' || !this.editando()) {
      return;
    }

    const datos = this.form.getRawValue();
    const serializados = JSON.stringify(datos);
    if (this.datosDeSolicitud !== serializados) {
      this.clientRequestId = null;
      this.datosDeSolicitud = null;
    }

    this.estado.set('pendiente');
    this.mensajeError.set(null);
    this.persistirBorrador(datos, this.clientRequestId);
  }

  private persistirBorrador(
    datos: Record<string, ValorFormulario>,
    clientRequestId: string | null,
  ): void {
    if (!this.claveBorrador || typeof sessionStorage === 'undefined') {
      return;
    }
    try {
      sessionStorage.setItem(
        this.claveBorrador,
        JSON.stringify({ datos, client_request_id: clientRequestId }),
      );
    } catch (error: unknown) {
      this.errorAlmacenamiento(error);
    }
  }

  private confirmarGuardado(respuesta: RespuestaFormulario): void {
    this.respuestaExistente.set(true);
    const normalizados = this.normalizarDatos(respuesta.datos);
    this.aplicarDatos(normalizados.invalido ? this.form.getRawValue() : normalizados.datos);
    this.form.disable({ emitEvent: false });
    this.editando.set(false);
    this.estado.set('guardado');
    this.mensajeError.set(null);
    this.clientRequestId = null;
    this.datosDeSolicitud = null;
    this.descartarBorrador();
    this.solicitudActual = null;
  }

  private errorAlGuardar(error: unknown): void {
    console.error('No fue posible guardar las respuestas del formulario:', error);
    if (this.esNoAutorizado(error)) {
      this.sesion.cerrarSesion();
      this.redirigirALogin();
      this.cargando.set(false);
      this.solicitudActual = null;
      return;
    }

    if (error instanceof HttpErrorResponse && error.status === 409) {
      this.clientRequestId = null;
      this.datosDeSolicitud = null;
    }
    this.mensajeError.set(this.mensajeApi(error, 'feed.form.error.save'));
    this.estado.set('error');
    this.editando.set(true);
    this.form.enable({ emitEvent: false });
    this.solicitudActual = null;
  }

  private mensajeApi(error: unknown, claveAlternativa: string): string {
    if (error instanceof HttpErrorResponse && esRegistro(error.error)) {
      const mensaje = error.error['mensaje'];
      if (typeof mensaje === 'string') {
        return mensaje;
      }
    }
    return this.texto(claveAlternativa);
  }

  private esNoAutorizado(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status === 401;
  }

  private crearClientRequestId(): string | null {
    if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') {
      return null;
    }
    return crypto.randomUUID();
  }

  private descartarBorrador(): boolean {
    if (!this.claveBorrador || typeof sessionStorage === 'undefined') {
      return true;
    }
    try {
      sessionStorage.removeItem(this.claveBorrador);
      return true;
    } catch (error: unknown) {
      this.errorAlmacenamiento(error);
      return false;
    }
  }

  private errorAlmacenamiento(error: unknown): void {
    if (!(error instanceof DOMException)) {
      throw error;
    }
    console.error('No fue posible acceder al borrador del formulario:', error);
    this.mensajeError.set(this.texto('feed.form.error.storage'));
  }

  private fallarCarga(claveMensaje: string): void {
    this.mensajeError.set(this.texto(claveMensaje));
    this.estado.set('error');
    this.cargando.set(false);
  }

  private redirigirALogin(): void {
    void this.router.navigate(['/is'], {
      queryParams: { returnUrl: this.router.url },
    });
  }
}
