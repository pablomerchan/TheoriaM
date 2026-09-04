import { Component, HostBinding, OnInit, inject, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AsesoriaService } from '../../services/asesoria';
import { MenuServicioItem, CarruselDefinicion } from '../../models/asesoria.model';
import { AsesoriaCarouselComponent } from '../../components/asesoria-carousel/asesoria-carousel.component';
import { AsesoriaRapidaComponent } from '../../components/asesoria-rapida/asesoria-rapida.component';
import { ArticuloComponent } from '../../components/articulo/articulo.component';
import { TextoGPTComponent } from '../../components/texto-gpt/texto-gpt.component';
import { SugerenciaDiariaComponent } from '../../components/sugerencia-diaria/sugerencia-diaria.component';
import { MiGuardaRopasComponent } from '../../components/mi-guarda-ropas/mi-guarda-ropas.component';
import { GuiaComprasComponent } from '../../components/guia-compras/guia-compras.component';
import { UsuarioService } from '../../services/usuario.service';
import { WebmasterArticuloService } from '../../services/webmaster-articulo.service';
import { AsesoriaCarouselService } from '../../services/asesoria-carousel.service';
import { DatosMorfologicosComponent } from '../../features/asesoria/components/datos-morfologicos/datos-morfologicos.component';
import { MorfologiaService } from '../../features/asesoria/components/datos-morfologicos/services/morfologia.service';

interface MenuSection {
  tema: string;
  items: MenuServicioItem[];
}

@Component({
  selector: 'app-asesoria',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    AsesoriaCarouselComponent,
    AsesoriaRapidaComponent,
    ArticuloComponent,
    TextoGPTComponent,
    SugerenciaDiariaComponent,
    MiGuardaRopasComponent,
    GuiaComprasComponent,
    DatosMorfologicosComponent
  ],
  templateUrl: './asesoria.html',
  styleUrls: ['./asesoria.scss']
})
export class AsesoriaComponent implements OnInit {
  private asesoriaService = inject(AsesoriaService);
  private usuarioService  = inject(UsuarioService);
  private cdr             = inject(ChangeDetectorRef);
  private webmasterArticuloService = inject(WebmasterArticuloService);
  private asesoriaCarouselService  = inject(AsesoriaCarouselService);
  private morfologiaService        = inject(MorfologiaService);

  menus: MenuServicioItem[] = [];
  menuSections: MenuSection[] = [];
  menusConArticulos: Set<number> = new Set<number>();

  selectedMenu: MenuServicioItem | null = null;
  showRelatedMode = false;
  articulosRelacionados: any[] = [];
  isLoadingRelated = false;
  userClickedMenuId: number | null = null;
  selectedRelatedArticle: any | null = null;

  /**
   * Definiciones de componentes del menú activo, resueltas desde el mapa estático
   * 'menuComponentes'. Cada entrada monta el componente hijo correspondiente
   * (articulo, carousel, rapida) con el tipo_asesoria correcto.
   */
  carruseles: CarruselDefinicion[] = [];

  tiposCarrusel: string[] = [];

  isSidebarOpen = false;
  activeComponentIndex = 0;
  isDarkMode = true;
  isLoadingArticulos = false;

  private readonly themeStorageKey = 'asesoria-theme';

  // ID del usuario activo. Resuelto dinámicamente desde el backend.
  idUsuario: any = null;

  /**
   * Controla que los componentes hijos sólo se monten una vez que el perfil
   * fue recibido del backend (evita race condition con el fallback '1').
   */
  perfilCargado = false;

  /** Nombre del usuario cargado desde tbl_persona. */
  sobrenombre: string | null = null;

  @ViewChild('scrollArea') scrollArea!: ElementRef;

  private isWheelNavigationLocked = false;

  @HostBinding('class.light-mode')
  get lightModeClass(): boolean {
    return !this.isDarkMode;
  }

  ngOnInit(): void {
    const savedTheme = localStorage.getItem(this.themeStorageKey);
    if (savedTheme === 'light') {
      this.isDarkMode = false;
    } else if (savedTheme === 'dark') {
      this.isDarkMode = true;
    }

    // Cargar perfil del usuario de forma segura y luego sus menús asociados
    this.cargarUsuario();
  }

  /** Carga los datos del perfil de la persona activa desde tbl_persona. */
  cargarUsuario(): void {
    this.usuarioService.getMiPerfil().subscribe({
      next: (persona) => {
        this.idUsuario = persona.id;
        this.sobrenombre = persona.nombre;
        this.perfilCargado = true;
        this.cargarMenus();
      },
      error: (err) => {
        console.error('Error al cargar perfil de usuario:', err);
        // Fallback en desarrollo para evitar fallos si la base de datos está vacía
        this.idUsuario = '1';
        this.sobrenombre = 'Invitado';
        this.perfilCargado = true;
        this.cargarMenus();
      }
    });
  }

  // 1. Cargar menús desde la BD (tbl_menu_servicios), filtrados por usuario
  cargarMenus(): void {
    this.asesoriaService.getMenus(this.idUsuario).subscribe({
      next: (items) => {
        const processedItems = items
          .filter(item => item.visible === undefined || !!item.visible)
          .sort((a, b) => (a.orden || 0) - (b.orden || 0));

        this.menus = processedItems;
        this.agruparPorTema(this.menus);
        this.actualizarIndicadores();
        if (this.menus.length > 0) {
          this.selectMenu(this.menus[0]);
        } else {
          this.isLoadingArticulos = false;
        }
      },
      error: (err) => {
        console.error('Error al cargar menús:', err);
        this.isLoadingArticulos = false;
      }
    });
  }

  // Agrupar menús por tema para el sidebar jerárquico
  agruparPorTema(items: MenuServicioItem[]): void {
    const map = new Map<string, MenuServicioItem[]>();

    items.forEach(item => {
      const tema = item.tema || 'General';
      if (!map.has(tema)) {
        map.set(tema, []);
      }
      map.get(tema)?.push(item);
    });

    this.menuSections = Array.from(map.entries()).map(([tema, items]) => ({
      tema,
      items
    }));
  }

  // 2. Seleccionar un menú y cargar sus componentes
  selectMenu(menu: MenuServicioItem): void {
    this.selectedMenu = menu;
    this.morfologiaService.setActiveMenuId(menu.id);
    this.showRelatedMode = false;
    this.isLoadingArticulos = true;
    this.carruseles = [];
    this.tiposCarrusel = [];
    this.activeComponentIndex = 0;

    // Cargar los componentes dinámicamente desde el backend.
    this.asesoriaService.getCarruseles(this.idUsuario, menu.id).subscribe({
      next: (defs) => {
        this.carruseles = defs;
        this.isLoadingArticulos = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error al cargar componentes dinámicos:', err);
        this.carruseles = [];
        this.isLoadingArticulos = false;
        this.cdr.markForCheck();
      }
    });

    if (window.innerWidth <= 768) {
      this.isSidebarOpen = false;
    }
    if (this.scrollArea) {
      this.scrollArea.nativeElement.scrollTop = 0;
    }

    this.actualizarIndicadores();
  }

  actualizarIndicadores(): void {
    if (!this.idUsuario) return;

    // Obtener las definiciones de menú para construir el mapa tipo_asesoria → menu_id
    this.asesoriaService.getCarruseles(this.idUsuario).subscribe({
      next: (defs) => {
        const menuTiposMap = new Map<number, Set<string>>();
        defs.forEach(def => {
          if (def.menu_servicio_id) {
            if (!menuTiposMap.has(def.menu_servicio_id)) {
              menuTiposMap.set(def.menu_servicio_id, new Set<string>());
            }
            menuTiposMap.get(def.menu_servicio_id)?.add(def.tipo_asesoria);
          }
        });

        // Solo consultar tbl_articulo (incluye tipo_contenido='articulo' y 'diapositiva')
        this.webmasterArticuloService.list(this.idUsuario).subscribe({
          next: (articulos) => {
            const articulosTipos = new Set(
              articulos
                .filter(a => a.visible === undefined || !!a.visible)
                .map(a => a.tipo_asesoria)
            );

            this.menusConArticulos.clear();
            menuTiposMap.forEach((tipos, menuId) => {
              let tieneArticulo = false;
              tipos.forEach(tipo => {
                if (articulosTipos.has(tipo)) tieneArticulo = true;
              });
              if (tieneArticulo) this.menusConArticulos.add(menuId);
            });

            this.cdr.markForCheck();
          },
          error: (err) => console.error('Error al cargar artículos para indicadores:', err)
        });
      },
      error: (err) => console.error('Error al cargar carruseles para indicadores:', err)
    });
  }

  selectRelated(menu: MenuServicioItem): void {
    this.selectedMenu = menu;
    this.showRelatedMode = true;
    this.isLoadingRelated = true;
    this.selectedRelatedArticle = null;
    this.articulosRelacionados = [];

    // Obtener los tipos de asesoría asociados a este menú
    this.asesoriaService.getCarruseles(this.idUsuario, menu.id).subscribe({
      next: (defs) => {
        const tipos = defs.map(d => d.tipo_asesoria).filter(Boolean);

        if (tipos.length === 0) {
          this.isLoadingRelated = false;
          this.cdr.markForCheck();
          return;
        }

        // Solo consultar tbl_articulo (incluye artículos y diapositivas)
        this.webmasterArticuloService.list(this.idUsuario).subscribe({
          next: (articulos) => {
            const filtrados = articulos.filter(
              a => (a.visible === undefined || !!a.visible) && a.tipo_asesoria && tipos.includes(a.tipo_asesoria)
            );

            const unificados: any[] = [];
            const nombresDiapositivas = new Set<string>();

            for (const a of filtrados) {
              if (a.tipo_contenido === 'diapositiva') {
                const nombre = a.titulo || a.tipo_asesoria;
                if (!nombresDiapositivas.has(nombre)) {
                  nombresDiapositivas.add(nombre);
                  unificados.push(a);
                }
              } else {
                unificados.push(a);
              }
            }

            this.articulosRelacionados = unificados;
            this.isLoadingRelated = false;
            this.cdr.markForCheck();
          },
          error: (err) => {
            console.error('Error al cargar artículos para relacionados:', err);
            this.isLoadingRelated = false;
            this.cdr.markForCheck();
          }
        });
      },
      error: (err) => {
        console.error('Error al obtener carruseles de este menú:', err);
        this.isLoadingRelated = false;
        this.cdr.markForCheck();
      }
    });

    if (window.innerWidth <= 768) {
      this.isSidebarOpen = false;
    }
    if (this.scrollArea) {
      this.scrollArea.nativeElement.scrollTop = 0;
    }
  }

  onMenuClick(menu: MenuServicioItem): void {
    this.userClickedMenuId = menu.id;
    this.selectMenu(menu);
  }

  /** Muestra el detalle del artículo seleccionado dentro de la vista de Relacionados. */
  goToArticle(art: any): void {
    this.selectedRelatedArticle = art;
    this.cdr.markForCheck();
    if (this.scrollArea) {
      this.scrollArea.nativeElement.scrollTop = 0;
    }
  }

  /** Vuelve al listado de Relacionados desde el detalle de un artículo. */
  backToRelatedList(): void {
    this.selectedRelatedArticle = null;
    this.cdr.markForCheck();
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem(this.themeStorageKey, this.isDarkMode ? 'dark' : 'light');
  }

  /** Navega al componente anterior o siguiente en la lista de carruseles. */
  navigateToComponent(direction: 'prev' | 'next'): void {
    if (direction === 'next' && this.activeComponentIndex < this.carruseles.length - 1) {
      this.activeComponentIndex++;
    } else if (direction === 'prev' && this.activeComponentIndex > 0) {
      this.activeComponentIndex--;
    }
    this.resetScrollPosition();
    this.cdr.markForCheck();
  }

  /** Salta directamente a un componente por su índice. */
  goToComponent(index: number): void {
    if (index >= 0 && index < this.carruseles.length) {
      this.activeComponentIndex = index;
      this.resetScrollPosition();
      this.cdr.markForCheck();
    }
  }

  /** Resetea el scroll del área principal al tope. */
  private resetScrollPosition(): void {
    if (this.scrollArea) {
      this.scrollArea.nativeElement.scrollTop = 0;
    }
  }

  onScrollWheel(event: WheelEvent): void {
    if (!this.scrollArea || this.isWheelNavigationLocked || this.carruseles.length <= 1) {
      return;
    }

    const element = this.scrollArea.nativeElement as HTMLElement;
    const atBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 8;
    const atTop = element.scrollTop <= 8;

    if (event.deltaY > 0 && atBottom && this.activeComponentIndex < this.carruseles.length - 1) {
      event.preventDefault();
      this.isWheelNavigationLocked = true;
      this.activeComponentIndex++;
      this.resetScrollPosition();
      setTimeout(() => this.isWheelNavigationLocked = false, 400);
      this.cdr.markForCheck();
    } else if (event.deltaY < 0 && atTop && this.activeComponentIndex > 0) {
      event.preventDefault();
      this.isWheelNavigationLocked = true;
      this.activeComponentIndex--;
      this.resetScrollPosition();
      setTimeout(() => this.isWheelNavigationLocked = false, 400);
      this.cdr.markForCheck();
    }
  }

  onNavigateToSubtema(subtemaName: string): void {
    const foundMenu = this.menus.find(m => m.subtema.toLowerCase().includes(subtemaName.toLowerCase()));
    if (foundMenu) {
      this.selectMenu(foundMenu);
    }
  }

  isGustosYPreferenciasSelected(): boolean {
    if (!this.selectedMenu) return false;
    const subtema = this.selectedMenu.subtema?.toLowerCase() || '';
    return this.selectedMenu.id === 32 || subtema.includes('gustos y preferencias');
  }
}
