import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { AsesoriaComponent } from '../../../../pages/asesoria/asesoria';
import { DatosMorfologicosComponent } from './datos-morfologicos.component';
import { MorfologiaService } from './services/morfologia.service';
import { AsesoriaService } from '../../../../services/asesoria';
import { UsuarioService } from '../../../../services/usuario.service';
import { WebmasterArticuloService } from '../../../../services/webmaster-articulo.service';
import { AsesoriaCarouselService } from '../../../../services/asesoria-carousel.service';
import { By } from '@angular/platform-browser';

describe('DatosMorfologicos Integration Tests', () => {
  let fixture: ComponentFixture<AsesoriaComponent>;
  let component: AsesoriaComponent;
  let morfologiaService: MorfologiaService;

  // Mock services
  const mockUsuarioService = {
    getMiPerfil: () => of({ id: '1', nombre: 'Test User' })
  };

  const mockAsesoriaService = {
    getMenus: () => of([
      { id: 25, tema: 'Servicios', subtema: '¿Qué me pongo?' },
      { id: 32, tema: 'Servicios', subtema: 'Mis gustos y preferencias.' }
    ]),
    getCarruseles: () => of([])
  };

  const mockWebmasterArticuloService = {
    list: () => of([])
  };

  const mockAsesoriaCarouselService = {
    getCarruseles: () => of([])
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        HttpClientTestingModule,
        AsesoriaComponent,
        DatosMorfologicosComponent
      ],
      providers: [
        { provide: UsuarioService, useValue: mockUsuarioService },
        { provide: AsesoriaService, useValue: mockAsesoriaService },
        { provide: WebmasterArticuloService, useValue: mockWebmasterArticuloService },
        { provide: AsesoriaCarouselService, useValue: mockAsesoriaCarouselService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AsesoriaComponent);
    component = fixture.componentInstance;
    morfologiaService = TestBed.inject(MorfologiaService);
    fixture.detectChanges();
  });

  it('debería inicializar AsesoriaComponent y cargar menús', () => {
    fixture.detectChanges();
    expect(component.menus.length).toBe(2);
  });

  it('debería mostrar el componente datos-morfologicos únicamente al seleccionar el menú ID 32', () => {
    fixture.detectChanges();

    // Por defecto, no debe mostrar el componente datos-morfologicos
    let morphComponent = fixture.debugElement.query(By.css('app-datos-morfologicos'));
    expect(morphComponent).toBeNull();

    // Seleccionar el menú con ID 32 ("Mis gustos y preferencias.")
    const menuGustos = component.menus.find((m: any) => m.id === 32);
    expect(menuGustos).toBeTruthy();

    component.selectMenu(menuGustos!);
    fixture.detectChanges();

    // Ahora debería estar visible
    morphComponent = fixture.debugElement.query(By.css('app-datos-morfologicos'));
    expect(morphComponent).not.toBeNull();
  });

  it('debería propagar la selección del menú a través de activeMenuId$ en el servicio compartido', () => {
    let lastActiveMenuId: number | null = null;
    morfologiaService.activeMenuId$.subscribe(id => lastActiveMenuId = id);

    const menuGustos = component.menus.find((m: any) => m.id === 32);
    component.selectMenu(menuGustos!);

    expect(lastActiveMenuId).toBe(32);
  });
});
