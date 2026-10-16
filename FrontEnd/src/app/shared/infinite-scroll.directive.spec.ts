import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { InfiniteScrollDirective } from './infinite-scroll.directive';

let observerActual: IntersectionObserverFalso;

class IntersectionObserverFalso {
  private readonly callback: IntersectionObserverCallback;
  readonly observe = vi.fn();
  readonly disconnect = vi.fn();

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    observerActual = this;
  }

  notificar(entry: IntersectionObserverEntry): void {
    this.callback([entry], this as unknown as IntersectionObserver);
  }
}

@Component({
  standalone: true,
  imports: [InfiniteScrollDirective],
  template: `
    <div
      appInfiniteScroll
      [appInfiniteScrollDisabled]="deshabilitado"
      (appInfiniteScroll)="cargas = cargas + 1"
    ></div>
  `
})
class ComponentePrueba {
  deshabilitado = false;
  cargas = 0;
}

describe('InfiniteScrollDirective', () => {
  let fixture: ComponentFixture<ComponentePrueba>;
  let observer: IntersectionObserverFalso;

  beforeEach(async () => {
    vi.stubGlobal('IntersectionObserver', IntersectionObserverFalso);
    await TestBed.configureTestingModule({
      imports: [ComponentePrueba]
    }).compileComponents();
    fixture = TestBed.createComponent(ComponentePrueba);
    fixture.detectChanges();
    observer = observerActual;
  });

  afterEach(() => {
    fixture.destroy();
    vi.unstubAllGlobals();
  });

  it('emite al intersectar el centinela y respeta el estado deshabilitado', () => {
    const target = fixture.nativeElement.querySelector('div') as HTMLDivElement;
    const rectangle = new DOMRect(0, 0, 1, 1);
    const entry: IntersectionObserverEntry = {
      time: 0,
      rootBounds: null,
      boundingClientRect: rectangle,
      intersectionRect: rectangle,
      isIntersecting: true,
      intersectionRatio: 1,
      target
    };

    observer.notificar(entry);
    expect(fixture.componentInstance.cargas).toBe(1);

    fixture.componentInstance.deshabilitado = true;
    fixture.detectChanges();
    observer.notificar(entry);
    expect(fixture.componentInstance.cargas).toBe(1);
  });

  it('desconecta el observer al destruirse', () => {
    fixture.destroy();

    expect(observer.disconnect).toHaveBeenCalledOnce();
  });
});
