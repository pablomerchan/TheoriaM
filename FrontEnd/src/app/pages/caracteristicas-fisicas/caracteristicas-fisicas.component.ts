import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CaracteristicasFisicas, TextoCaracteristicasFisicas } from './caracteristicas-fisicas.model';
import { CaracteristicasFisicasService } from '../../services/caracteristicas-fisicas.service';
import { MaestrasService } from '../../services/maestras.service';

@Component({
  selector: 'app-caracteristicas-fisicas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './caracteristicas-fisicas.component.html',
  styleUrl: './caracteristicas-fisicas.component.scss'
})
export class CaracteristicasFisicasComponent implements OnInit, OnDestroy {
  private readonly caracteristicasService = inject(CaracteristicasFisicasService);
  private readonly maestrasService = inject(MaestrasService);
  private readonly router = inject(Router);
  private readonly subscriptions = new Subscription();

  readonly previousRoute: string | null = null;
  readonly nextRoute: string | null = null;

  form: CaracteristicasFisicas = {
    color_piel: '',
    color_ojos: '',
    color_cabello: '',
    ubicacion_principal: '',
    ubicacion_secundaria: '',
    peso_kg: 0,
    estatura_cm: 0
  };

  opcionesColorPiel: string[] = [];
  opcionesColorOjos: string[] = [];
  opcionesColorCabello: string[] = [];
  opcionesUbicaciones: string[] = [];
  textosDescriptivos: TextoCaracteristicasFisicas[] = [];
  textosAyuda = new Map<string, TextoCaracteristicasFisicas>();
  ayudasVisibles = new Set<string>();
  errorMsg = '';
  enviando = false;
  guardadoExitoso = false;

  ngOnInit(): void {
    this.cargarTextos();
    this.cargarOpciones();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get textoIntroduccion(): TextoCaracteristicasFisicas | undefined {
    return this.textosDescriptivos.find(texto => texto.clave === 'introduccion');
  }

  toggleAyuda(campo: string): void {
    if (this.ayudasVisibles.has(campo)) {
      this.ayudasVisibles.delete(campo);
    } else {
      this.ayudasVisibles.add(campo);
    }
  }

  navegarA(route: string | null): void {
    if (route) {
      void this.router.navigateByUrl(route);
    }
  }

  guardarPerfil(): void {
    this.errorMsg = '';
    this.guardadoExitoso = false;
    this.enviando = true;

    this.subscriptions.add(
      this.caracteristicasService.saveProfile(this.form).subscribe({
        next: () => {
          this.enviando = false;
          this.guardadoExitoso = true;
        },
        error: (error: Error) => {
          this.enviando = false;
          this.errorMsg = error.message || 'No fue posible guardar las características físicas.';
        }
      })
    );
  }

  private cargarTextos(): void {
    this.subscriptions.add(
      this.caracteristicasService.getTextosDescriptivos().subscribe({
        next: textos => this.textosDescriptivos = textos,
        error: () => this.errorMsg = 'No fue posible cargar los textos descriptivos.'
      })
    );
    this.subscriptions.add(
      this.caracteristicasService.getTextosAyuda().subscribe({
        next: textos => textos.forEach(texto => {
          if (texto.campo) {
            this.textosAyuda.set(texto.campo, texto);
          }
        }),
        error: () => this.errorMsg = 'No fue posible cargar los textos de ayuda.'
      })
    );
  }

  private cargarOpciones(): void {
    this.subscriptions.add(
      this.maestrasService.getMenuOptions('Color de piel').subscribe({
        next: opciones => this.opcionesColorPiel = opciones,
        error: () => this.errorMsg = 'No fue posible cargar las opciones de color de piel.'
      })
    );
    this.subscriptions.add(
      this.maestrasService.getMenuOptions('Color de ojos').subscribe({
        next: opciones => this.opcionesColorOjos = opciones,
        error: () => this.errorMsg = 'No fue posible cargar las opciones de color de ojos.'
      })
    );
    this.subscriptions.add(
      this.maestrasService.getMenuOptions('Color de cabello').subscribe({
        next: opciones => this.opcionesColorCabello = opciones,
        error: () => this.errorMsg = 'No fue posible cargar las opciones de color de cabello.'
      })
    );
    this.subscriptions.add(
      this.maestrasService.getUbicaciones().subscribe({
        next: opciones => this.opcionesUbicaciones = opciones,
        error: () => this.errorMsg = 'No fue posible cargar las opciones de ubicación.'
      })
    );
  }
}
