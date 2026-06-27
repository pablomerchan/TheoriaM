import { Component, HostBinding, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DatosMorfologicosService } from '../../services/datos-morfologicos.service';
import { InteractiveHelpService } from '../../services/interactive-help.service';
import { DatosMorfologicos } from '../../models/datos-morfologicos.model';
import { AyudaItem } from '../../models/ayuda-item.model';
import { MaestrasService } from '../../services/maestras.service';

@Component({
  selector: 'app-datos-morfologicos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './datos-morfologicos.component.html',
  styleUrls: ['./datos-morfologicos.component.scss']
})
export class DatosMorfologicosComponent implements OnInit {

  private morfService = inject(DatosMorfologicosService);
  private helpService = inject(InteractiveHelpService);
  private maestrasService = inject(MaestrasService);

  // ── Estado del formulario ──────────────────────────────────────
  form: DatosMorfologicos = {
    sexo: '',
    edad: 0,
    color_piel: '',
    color_ojos: '',
    color_cabello: '',
    peso_kg: 0,
    estatura_cm: 0,
    climas: [],
    ubicacion_principal: '',
    ubicacion_secundaria: ''
  };

  climaUnico: string = '';

  // ── Opciones de los selectores ─────────────────────────────────
  opcionesColorPiel: string[] = [];
  opcionesColorOjos: string[] = [];
  opcionesColorCabello: string[] = [];
  opcionesClimas: string[] = [];
  opcionesUbicaciones: string[] = [];

  // ── Ayuda interactiva ──────────────────────────────────────────
  ayudaItems: Map<string, AyudaItem> = new Map();
  helpVisible = false;
  helpActivo: AyudaItem | null = null;
  campoAyudaActivo = '';
  displayedHelpText = '';
  isTyping = false;
  private typingTimeout: any;

  displayedEmptyText = '';
  isEmptyTyping = false;
  private emptyTypingTimeout: any;
  private readonly initialEmptyText = 'Haz clic en <strong>❓</strong> junto a cualquier campo para ver explicaciones detalladas.';

  // ── Textos hero con IA ─────────────────────────────────────────
  heroBadgeText = '';
  heroSubtitleText = '';
  isHeroBadgeTyping = false;
  isHeroSubtitleTyping = false;
  private readonly fullHeroBadgeText = 'Preparando la primera asesoría';
  private readonly fullHeroSubtitleText = 'Completa tu perfil, para empezar a recibir consejos útiles.';


  // ── Estado UI ─────────────────────────────────────────────────
  enviando = false;
  enviado = false;
  errorMsg = '';
  successMsg = '';
  currentStep = 1;
  totalSteps = 2;
  isDarkMode = true; // Modo oscuro por defecto
  private readonly themeStorageKey = 'datos-morfologicos-theme';

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
    this.helpService.getAllHelp().subscribe({
      next: (items) => {
        items.forEach(item => this.ayudaItems.set(item.campo, item));
      },
      error: (err) => console.error('Error al cargar ayuda:', err)
    });

    this.maestrasService.getMenuOptions('Color de piel').subscribe(opts => this.opcionesColorPiel = opts);
    this.maestrasService.getMenuOptions('Color de ojos').subscribe(opts => this.opcionesColorOjos = opts);
    this.maestrasService.getMenuOptions('Color de cabello').subscribe(opts => this.opcionesColorCabello = opts);
    this.maestrasService.getMenuOptions('Clima habitual de residencia').subscribe(opts => this.opcionesClimas = opts);
    this.maestrasService.getUbicaciones().subscribe(opts => this.opcionesUbicaciones = opts);

    this.typeEmptyText(this.initialEmptyText);
    this.typeHeroTexts();
  }

  // ── Ayuda interactiva ─────────────────────────────────────────
  mostrarAyuda(campo: string): void {
    const item = this.ayudaItems.get(campo);
    if (item) {
      this.helpActivo = item;
      this.campoAyudaActivo = campo;
      this.helpVisible = true;
      this.typeText(item.texto);
    }
  }

  cerrarAyuda(): void {
    this.helpVisible = false;
    this.helpActivo = null;
    this.campoAyudaActivo = '';
    this.displayedHelpText = '';
    this.isTyping = false;
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    this.typeEmptyText(this.initialEmptyText);
  }

  toggleAyudaGeneral(): void {
    if (this.helpVisible) {
      this.cerrarAyuda();
    } else {
      // Mostrar la primera ayuda disponible
      const firstItem = this.ayudaItems.get('sexo');
      if (firstItem) {
        this.helpActivo = firstItem;
        this.campoAyudaActivo = 'sexo';
        this.helpVisible = true;
        this.typeText(firstItem.texto);
      }
    }
  }

  private typeText(fullText: string): void {
    this.displayedHelpText = '';
    this.isTyping = true;
    if (this.typingTimeout) clearTimeout(this.typingTimeout);

    let i = 0;
    const typeNextChar = () => {
      if (i < fullText.length) {
        if (fullText.charAt(i) === '<') {
          const tagEnd = fullText.indexOf('>', i);
          if (tagEnd !== -1) {
            this.displayedHelpText += fullText.substring(i, tagEnd + 1);
            i = tagEnd + 1;
          } else {
            this.displayedHelpText += fullText.charAt(i);
            i++;
          }
        } else if (fullText.charAt(i) === '&') {
          const entityEnd = fullText.indexOf(';', i);
          if (entityEnd !== -1 && entityEnd - i < 10) {
            this.displayedHelpText += fullText.substring(i, entityEnd + 1);
            i = entityEnd + 1;
          } else {
            this.displayedHelpText += fullText.charAt(i);
            i++;
          }
        } else {
          this.displayedHelpText += fullText.charAt(i);
          i++;
        }
        
        this.typingTimeout = setTimeout(typeNextChar, 15);
      } else {
        this.isTyping = false;
      }
    };
    typeNextChar();
  }

  private typeEmptyText(fullText: string): void {
    this.displayedEmptyText = '';
    this.isEmptyTyping = true;
    if (this.emptyTypingTimeout) clearTimeout(this.emptyTypingTimeout);

    let i = 0;
    const typeNextChar = () => {
      if (i < fullText.length) {
        if (fullText.charAt(i) === '<') {
          const tagEnd = fullText.indexOf('>', i);
          if (tagEnd !== -1) {
            this.displayedEmptyText += fullText.substring(i, tagEnd + 1);
            i = tagEnd + 1;
          } else {
            this.displayedEmptyText += fullText.charAt(i);
            i++;
          }
        } else if (fullText.charAt(i) === '&') {
          const entityEnd = fullText.indexOf(';', i);
          if (entityEnd !== -1 && entityEnd - i < 10) {
            this.displayedEmptyText += fullText.substring(i, entityEnd + 1);
            i = entityEnd + 1;
          } else {
            this.displayedEmptyText += fullText.charAt(i);
            i++;
          }
        } else {
          this.displayedEmptyText += fullText.charAt(i);
          i++;
        }
        
        this.emptyTypingTimeout = setTimeout(typeNextChar, 15);
      } else {
        this.isEmptyTyping = false;
      }
    };
    typeNextChar();
  }

  private typeHeroTexts(): void {
    this.heroBadgeText = '';
    this.isHeroBadgeTyping = true;
    
    let i = 0;
    const typeBadgeChar = () => {
      if (i < this.fullHeroBadgeText.length) {
        this.heroBadgeText += this.fullHeroBadgeText.charAt(i);
        i++;
        setTimeout(typeBadgeChar, 30);
      } else {
        this.isHeroBadgeTyping = false;
        this.typeHeroSubtitle();
      }
    };
    typeBadgeChar();
  }

  private typeHeroSubtitle(): void {
    this.heroSubtitleText = '';
    this.isHeroSubtitleTyping = true;
    
    let j = 0;
    const typeSubtitleChar = () => {
      if (j < this.fullHeroSubtitleText.length) {
        this.heroSubtitleText += this.fullHeroSubtitleText.charAt(j);
        j++;
        setTimeout(typeSubtitleChar, 20);
      } else {
        this.isHeroSubtitleTyping = false;
      }
    };
    typeSubtitleChar();
  }

  // ── Navegación pasos ─────────────────────────────────────────
  nextStep(): void {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // ── Envío del formulario ─────────────────────────────────────
  onSubmit(): void {
    if (this.enviando) return;

    // Validaciones básicas
    if (!this.form.sexo || !this.form.edad || !this.form.color_piel ||
        !this.form.color_ojos || !this.form.color_cabello ||
        !this.form.peso_kg || !this.form.estatura_cm || !this.climaUnico ||
        !this.form.ubicacion_principal || !this.form.ubicacion_secundaria) {
      this.errorMsg = 'Por favor completa todos los campos obligatorios antes de continuar.';
      return;
    }

    if (this.form.sexo === 'femenino') {
      if (!this.form.medida_hombros_cm || !this.form.medida_cintura_cm || 
          !this.form.medida_cadera_cm || !this.form.medida_busto_cm) {
        this.errorMsg = 'Por favor completa todas las medidas corporales solicitadas antes de continuar.';
        return;
      }
    }

    this.enviando = true;
    this.errorMsg = '';
    this.form.climas = [this.climaUnico];

    this.morfService.saveDatos(this.form).subscribe({
      next: (res) => {
        this.enviando = false;
        this.enviado = true;
        this.successMsg = '¡Datos morfológicos registrados exitosamente! Tu perfil personalizado está siendo preparado.';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (err) => {
        this.enviando = false;
        this.errorMsg = 'Ocurrió un error al guardar los datos. Por favor intenta de nuevo.';
        console.error(err);
      }
    });
  }

  reiniciar(): void {
    this.form = {
      sexo: '',
      edad: 0,
      color_piel: '',
      color_ojos: '',
      color_cabello: '',
      peso_kg: 0,
      estatura_cm: 0,
      climas: [],
      ubicacion_principal: '',
      ubicacion_secundaria: ''
    };
    this.climaUnico = '';
    this.enviado = false;
    this.currentStep = 1;
    this.successMsg = '';
    this.errorMsg = '';
  }

  // ── Toggle modo visual ────────────────────────────────────────
  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem(this.themeStorageKey, this.isDarkMode ? 'dark' : 'light');
  }
}
