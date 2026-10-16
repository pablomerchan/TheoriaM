import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

import { SessionService } from '../../core/session.service';
import { FeedApiService } from './feed-api.service';
import { FeedContractService } from './feed-contract.service';
import { OpcionMenuFeed } from './feed.models';

type EstructuraMenu = 'mobile' | 'tablet' | 'desktop';

@Component({
  selector: 'app-feed-shell',
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  templateUrl: './feed-shell.component.html',
  styleUrl: './feed-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeedShellComponent {
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly api = inject(FeedApiService);
  readonly contrato = inject(FeedContractService);
  readonly opciones = signal<OpcionMenuFeed[]>([]);
  readonly opcionesPrincipales = computed(() => this.opciones().slice(0, 4));
  readonly opcionesAdicionales = computed(() => this.opciones().slice(4));
  readonly errorMenu = signal<string | null>(null);
  readonly estructura = signal<EstructuraMenu>('desktop');
  readonly masAbierto = signal(false);
  readonly panelAbierto = signal(false);
  readonly tituloPanel = signal('');

  constructor() {
    this.api
      .listarMenu()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (opciones) => this.opciones.set(opciones),
        error: (error: unknown) => {
          console.error('No fue posible cargar el menú del feed:', error);
          this.errorMenu.set(this.texto('feed.menu.loadError'));
        }
      });

    const breakpointMobile = '(max-width: 599.98px)';
    const breakpointTablet = '(min-width: 600px) and (max-width: 1024px)';
    this.breakpointObserver
      .observe([breakpointMobile, breakpointTablet])
      .pipe(takeUntilDestroyed())
      .subscribe(({ breakpoints }) => {
        this.estructura.set(
          breakpoints[breakpointMobile]
            ? 'mobile'
            : breakpoints[breakpointTablet]
              ? 'tablet'
              : 'desktop'
        );
      });
  }

  texto(clave: string): string {
    return this.contrato.texto(clave);
  }

  saludo(): string | null {
    const usuario = this.session.usuario();
    return usuario ? this.contrato.saludo(usuario.seudonimo) : null;
  }

  alternarMas(): void {
    this.masAbierto.update((abierto) => !abierto);
  }

  seleccionar(opcion: OpcionMenuFeed): void {
    this.masAbierto.set(false);
    switch (opcion.destino) {
      case 'feed':
        void this.router.navigate(['/feed'], {
          queryParams: opcion.valor ? { filtro: opcion.valor } : {}
        });
        return;
      case 'ruta':
        void this.router.navigateByUrl(opcion.valor);
        return;
      case 'panel':
        this.tituloPanel.set(opcion.etiqueta);
        this.panelAbierto.set(true);
        return;
      case 'accion':
        this.ejecutarAccion(opcion.valor);
        return;
      default:
        throw new Error(`Destino de menú no compatible: ${opcion.destino}`);
    }
  }

  cerrarPanel(): void {
    this.panelAbierto.set(false);
  }

  private ejecutarAccion(accion: string): void {
    switch (accion) {
      case 'cerrar_sesion':
        this.session.cerrarSesion();
        void this.router.navigate(['/is']);
        return;
      case 'refrescar':
        if (typeof window === 'undefined') {
          throw new Error('La acción de actualizar requiere un navegador.');
        }
        window.location.reload();
        return;
      default:
        throw new Error(`Acción de menú no compatible: ${accion}`);
    }
  }
}
