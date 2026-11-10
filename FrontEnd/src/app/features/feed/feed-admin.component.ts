import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import {
  ArticuloAdministrableFeed,
  CondicionFeed,
  FeedAdminApiService,
  GuardarArticuloFeed,
  ReglasFeed
} from './feed-admin-api.service';

type TipoAtributo = 'texto' | 'numero';

interface AtributoFeed {
  clave: string;
  etiqueta: string;
  tipo: TipoAtributo;
}

interface CondicionFormulario {
  atributo: string;
  operador: string;
  valor: string;
}

@Component({
  selector: 'app-feed-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './feed-admin.component.html',
  styleUrl: './feed-admin.component.scss'
})
export class FeedAdminComponent implements OnInit {
  private readonly api = inject(FeedAdminApiService);

  readonly atributos: AtributoFeed[] = [
    { clave: 'perfil.edad', etiqueta: 'Edad', tipo: 'numero' },
    { clave: 'perfil.id_usuario', etiqueta: 'ID de usuario (UUID)', tipo: 'texto' },
    { clave: 'perfil.sexo', etiqueta: 'Sexo', tipo: 'texto' },
    { clave: 'perfil.color_piel', etiqueta: 'Color de piel', tipo: 'texto' },
    { clave: 'perfil.peso_kg', etiqueta: 'Peso (kg)', tipo: 'numero' },
    { clave: 'perfil.estatura_cm', etiqueta: 'Estatura (cm)', tipo: 'numero' },
    { clave: 'perfil.color_cabello', etiqueta: 'Color de cabello', tipo: 'texto' },
    { clave: 'perfil.clima_principal', etiqueta: 'Clima principal', tipo: 'texto' },
    { clave: 'perfil.clima_secundario', etiqueta: 'Clima secundario', tipo: 'texto' },
    { clave: 'contexto.fecha_utc', etiqueta: 'Fecha UTC', tipo: 'texto' },
    { clave: 'contexto.hora_utc', etiqueta: 'Hora UTC', tipo: 'numero' },
    { clave: 'contexto.dia_semana', etiqueta: 'Día de semana (0=lunes)', tipo: 'numero' },
    { clave: 'contexto.idioma', etiqueta: 'Idioma del navegador', tipo: 'texto' }
  ];

  readonly estados: Array<{ valor: 0 | 1 | 2; etiqueta: string }> = [
    { valor: 0, etiqueta: 'Borrador' },
    { valor: 1, etiqueta: 'Publicado' },
    { valor: 2, etiqueta: 'Archivado' }
  ];

  articulos: ArticuloAdministrableFeed[] = [];
  seleccionado: ArticuloAdministrableFeed | null = null;
  titulo = '';
  contenido = '';
  estado: 0 | 1 | 2 = 0;
  segmentado = false;
  modo: 'todos' | 'alguno' = 'todos';
  condiciones: CondicionFormulario[] = [];
  cargando = false;
  guardando = false;
  error: string | null = null;
  mensaje: string | null = null;

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = null;
    this.api.listar().subscribe({
      next: (articulos) => {
        this.articulos = articulos;
        this.cargando = false;
      },
      error: (error) => {
        this.cargando = false;
        this.error = error?.error?.mensaje || 'No se pudieron cargar los artículos del Feed.';
      }
    });
  }

  nuevo(): void {
    this.seleccionado = null;
    this.titulo = '';
    this.contenido = '';
    this.estado = 0;
    this.segmentado = false;
    this.modo = 'todos';
    this.condiciones = [];
    this.error = null;
    this.mensaje = null;
  }

  editar(articulo: ArticuloAdministrableFeed): void {
    this.seleccionado = articulo;
    this.titulo = articulo.titulo;
    this.contenido = articulo.contenido;
    this.estado = articulo.estado;
    this.segmentado = articulo.reglas !== null;
    this.modo = articulo.reglas?.modo ?? 'todos';
    this.condiciones = (articulo.reglas?.condiciones ?? []).map((condicion) => ({
      atributo: condicion.atributo,
      operador: condicion.operador,
      valor: this.mostrarValor(condicion.valor)
    }));
    this.error = null;
    this.mensaje = null;
  }

  agregarCondicion(): void {
    this.condiciones.push({
      atributo: 'perfil.sexo',
      operador: 'eq',
      valor: ''
    });
    this.segmentado = true;
  }

  segmentacionCambiada(): void {
    if (this.segmentado && this.condiciones.length === 0) {
      this.agregarCondicion();
    }
  }

  quitarCondicion(indice: number): void {
    this.condiciones.splice(indice, 1);
  }

  cambiarAtributo(condicion: CondicionFormulario): void {
    condicion.operador = 'eq';
    condicion.valor = '';
  }

  esNumerico(condicion: CondicionFormulario): boolean {
    return this.atributos.find((item) => item.clave === condicion.atributo)?.tipo === 'numero';
  }

  esIdUsuario(condicion: CondicionFormulario): boolean {
    return condicion.atributo === 'perfil.id_usuario';
  }

  guardar(): void {
    this.error = null;
    this.mensaje = null;
    if (!this.titulo.trim()) {
      this.error = 'Escribe el título del artículo.';
      return;
    }
    if (!this.seleccionado && !this.contenido.trim()) {
      this.error = 'Escribe el contenido del artículo.';
      return;
    }
    const reglas = this.obtenerReglas();
    if (typeof reglas === 'string') {
      this.error = reglas;
      return;
    }

    const articulo: GuardarArticuloFeed = {
      titulo: this.titulo.trim(),
      estado: this.estado,
      reglas
    };
    if (!this.seleccionado || this.seleccionado.contenido_editable) {
      articulo.contenido = this.contenido;
    }

    this.guardando = true;
    const peticion = this.seleccionado
      ? this.api.actualizar(this.seleccionado.id, articulo)
      : this.api.crear(articulo);
    peticion.subscribe({
      next: () => {
        this.guardando = false;
        const mensaje = this.estado === 1
          ? 'Artículo publicado en el Feed.'
          : 'Artículo guardado.';
        this.nuevo();
        this.mensaje = mensaje;
        this.cargar();
      },
      error: (error) => {
        this.guardando = false;
        this.error = error?.error?.mensaje || 'No se pudo guardar el artículo.';
      }
    });
  }

  etiquetaEstado(estado: number): string {
    return this.estados.find((item) => item.valor === estado)?.etiqueta ?? 'Desconocido';
  }

  resumenReglas(articulo: ArticuloAdministrableFeed): string {
    if (!articulo.reglas) {
      return 'Todos los usuarios';
    }
    return `${articulo.reglas.condiciones.length} condición(es) · ${
      articulo.reglas.modo === 'todos' ? 'deben cumplirse todas' : 'se cumple alguna'
    }`;
  }

  private obtenerReglas(): ReglasFeed | null | string {
    if (!this.segmentado) {
      return null;
    }
    if (!this.condiciones.length) {
      return 'Agrega al menos una condición o desactiva la segmentación.';
    }

    const condiciones: CondicionFeed[] = [];
    for (const condicion of this.condiciones) {
      if (this.esIdUsuario(condicion)) {
        if (
          condicion.operador !== 'eq' ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            condicion.valor.trim()
          )
        ) {
          return 'Ingresa un ID de usuario válido (UUID) para asignar el artículo.';
        }
      }
      if (condicion.operador === 'exists') {
        if (!['true', 'false'].includes(condicion.valor)) {
          return 'Selecciona si el atributo debe estar informado.';
        }
        condiciones.push({
          atributo: condicion.atributo,
          operador: condicion.operador,
          valor: condicion.valor === 'true'
        });
        continue;
      }
      if (!condicion.valor.trim()) {
        return 'Completa el valor de cada condición.';
      }

      const esLista = condicion.operador === 'in' || condicion.operador === 'not_in';
      const valor = this.esNumerico(condicion)
        ? this.convertirNumero(condicion.valor, esLista)
        : this.convertirTexto(condicion.valor, condicion.operador);
      if (valor === null) {
        return `El valor para "${this.nombreAtributo(condicion.atributo)}" debe ser numérico.`;
      }
      if (Array.isArray(valor) && valor.length === 0) {
        return 'Escribe al menos un valor para la condición de lista.';
      }
      condiciones.push({
        atributo: condicion.atributo,
        operador: condicion.operador,
        valor
      });
    }
    if (
      this.modo !== 'todos' &&
      condiciones.some((condicion) => condicion.atributo === 'perfil.id_usuario')
    ) {
      return 'Para asignar un artículo a una persona, todas las condiciones deben cumplirse.';
    }
    return { modo: this.modo, condiciones };
  }

  private convertirNumero(valor: string, esLista: boolean): number | number[] | null {
    const valores = valor.split(',').map((item) => Number(item.trim()));
    if (!valores.length || valores.some((item) => !Number.isFinite(item))) {
      return null;
    }
    return esLista ? valores : valores[0];
  }

  private convertirTexto(valor: string, operador: string): string | string[] {
    if (operador === 'in' || operador === 'not_in') {
      return valor.split(',').map((item) => item.trim()).filter(Boolean);
    }
    return valor.trim();
  }

  private nombreAtributo(clave: string): string {
    return this.atributos.find((item) => item.clave === clave)?.etiqueta ?? clave;
  }

  private mostrarValor(valor: unknown): string {
    return Array.isArray(valor) ? valor.join(', ') : String(valor ?? '');
  }
}
