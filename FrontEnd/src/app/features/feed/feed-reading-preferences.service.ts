import { Injectable, signal } from '@angular/core';

const CONTRAST_STORAGE_KEY = 'theoriam.feed.article-contrast';

@Injectable({
  providedIn: 'root'
})
export class FeedReadingPreferencesService {
  readonly contrasteOscuro = signal(this.leerContrasteOscuro());

  alternarContraste(): void {
    const oscuro = !this.contrasteOscuro();
    this.contrasteOscuro.set(oscuro);

    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(CONTRAST_STORAGE_KEY, oscuro ? 'dark' : 'light');
    } catch (error) {
      console.warn('No fue posible guardar el contraste de lectura:', error);
    }
  }

  private leerContrasteOscuro(): boolean {
    if (typeof localStorage === 'undefined') {
      return false;
    }

    try {
      return localStorage.getItem(CONTRAST_STORAGE_KEY) === 'dark';
    } catch (error) {
      console.warn('No fue posible recuperar el contraste de lectura:', error);
      return false;
    }
  }
}
