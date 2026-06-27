import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { AsesoriaCarouselComponent } from './asesoria-carousel.component';
import { AsesoriaCarouselService } from '../../services/asesoria-carousel.service';
import { of } from 'rxjs';
import { By } from '@angular/platform-browser';

describe('AsesoriaCarouselComponent', () => {
  let component: AsesoriaCarouselComponent;
  let fixture: ComponentFixture<AsesoriaCarouselComponent>;
  let mockService: any;
  let cdr: ChangeDetectorRef;
  let mockObserve: any;
  let mockDisconnect: any;

  const mockAsesorias = [
    { id: 1, imagen_url: 'image1.jpg', text_html: '<p>Test 1</p>', orden: 1, visible: true },
    { id: 2, imagen_url: 'image2.jpg', text_html: '<p>Test 2</p>', orden: 2, visible: true }
  ];

  beforeEach(async () => {
    // Mock IntersectionObserver using standard class constructor syntax
    mockObserve = vi.fn();
    mockDisconnect = vi.fn();
    (window as any).IntersectionObserver = class {
      observe = mockObserve;
      unobserve = vi.fn();
      disconnect = mockDisconnect;
    };

    mockService = {
      getAsesorias: () => of(mockAsesorias)
    };

    await TestBed.configureTestingModule({
      imports: [AsesoriaCarouselComponent],
      providers: [
        { provide: AsesoriaCarouselService, useValue: mockService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AsesoriaCarouselComponent);
    component = fixture.componentInstance;
    cdr = fixture.debugElement.injector.get(ChangeDetectorRef);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('debería crearse el componente', () => {
    expect(component).toBeTruthy();
  });

  it('debería registrar el IntersectionObserver con el elemento host', () => {
    expect(mockObserve).toHaveBeenCalledWith(fixture.nativeElement);
  });

  it('debería no tener el mensaje de estado pausado en el pie de página', () => {
    component.isPaused = true;
    cdr.markForCheck();
    fixture.detectChanges();
    const statusMsg = fixture.debugElement.query(By.css('.carousel-status-msg'));
    expect(statusMsg).toBeNull();
  });

  it('debería tener el checkbox de lectura automática desactivado por defecto', () => {
    expect(component.autoReadEnabled).toBe(false);
    const checkbox = fixture.debugElement.query(By.css('#autoReadToggle'));
    expect(checkbox).toBeTruthy();
    expect(checkbox.nativeElement.checked).toBe(false);
  });

  it('debería actualizar autoReadEnabled cuando cambia el checkbox', () => {
    const checkbox = fixture.debugElement.query(By.css('#autoReadToggle'));
    checkbox.nativeElement.checked = true;
    checkbox.nativeElement.dispatchEvent(new Event('change'));
    
    expect(component.autoReadEnabled).toBe(true);
  });

  it('debería llamar a readSlide en el cambio de diapositiva si autoReadEnabled es verdadero', () => {
    const readSpy = vi.spyOn(component, 'readSlide').mockImplementation(() => {});
    component.autoReadEnabled = true;
    
    component.nextSlide();
    
    expect(readSpy).toHaveBeenCalled();
  });
});
