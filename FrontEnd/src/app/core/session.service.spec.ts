import { TestBed } from '@angular/core/testing';

import { SessionService } from './session.service';

describe('SessionService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('guarda token e identidad y los expone como sesión', () => {
    const service = TestBed.inject(SessionService);

    service.establecerSesion('token-prueba', {
      id: 'usuario-1',
      seudonimo: 'persona'
    });

    expect(service.estaAutenticado()).toBe(true);
    expect(service.obtenerToken()).toBe('token-prueba');
    expect(service.usuario()).toEqual({ id: 'usuario-1', seudonimo: 'persona' });
    expect(localStorage.getItem('theoriam_token')).toBe('token-prueba');
  });

  it('limpia token e identidad al cerrar sesión', () => {
    const service = TestBed.inject(SessionService);
    service.establecerSesion('token-prueba', {
      id: 'usuario-1',
      seudonimo: 'persona'
    });

    service.cerrarSesion();

    expect(service.estaAutenticado()).toBe(false);
    expect(service.usuario()).toBeNull();
    expect(localStorage.getItem('theoriam_token')).toBeNull();
    expect(localStorage.getItem('theoriam_usuario_id')).toBeNull();
    expect(localStorage.getItem('theoriam_seudonimo')).toBeNull();
  });
});
