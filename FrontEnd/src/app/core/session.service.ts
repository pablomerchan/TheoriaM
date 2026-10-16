import { Injectable, signal } from '@angular/core';

export interface UsuarioSesion {
  id: string;
  seudonimo: string;
}

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private readonly tokenSesion = signal<string | null>(this.leerValor('theoriam_token'));
  readonly usuario = signal<UsuarioSesion | null>(this.leerUsuario());

  establecerSesion(token: string, usuario: UsuarioSesion): void {
    if (!token.trim() || !usuario.id.trim() || !usuario.seudonimo.trim()) {
      throw new Error('El token y la identidad de la sesión son obligatorios.');
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('theoriam_token', token);
      localStorage.setItem('theoriam_usuario_id', usuario.id);
      localStorage.setItem('theoriam_seudonimo', usuario.seudonimo);
    }

    this.tokenSesion.set(token);
    this.usuario.set(usuario);
  }

  obtenerToken(): string | null {
    return this.tokenSesion();
  }

  estaAutenticado(): boolean {
    return Boolean(this.tokenSesion());
  }

  cerrarSesion(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('theoriam_token');
      localStorage.removeItem('theoriam_usuario_id');
      localStorage.removeItem('theoriam_seudonimo');
    }

    this.tokenSesion.set(null);
    this.usuario.set(null);
  }

  private leerValor(clave: string): string | null {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(clave);
  }

  private leerUsuario(): UsuarioSesion | null {
    const id = this.leerValor('theoriam_usuario_id');
    const seudonimo = this.leerValor('theoriam_seudonimo');
    return id && seudonimo ? { id, seudonimo } : null;
  }
}
