import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Morfologia, RasgoColorimetrico } from '../models/morfologia.model';

@Injectable({
  providedIn: 'root'
})
export class MorfologiaService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/api/datos-morfologicos';

  // State
  private activeMenuIdSource = new BehaviorSubject<number | null>(null);
  activeMenuId$ = this.activeMenuIdSource.asObservable();

  private morfologiaSource = new BehaviorSubject<Morfologia | null>(null);
  morfologia$ = this.morfologiaSource.asObservable();

  setActiveMenuId(id: number | null): void {
    this.activeMenuIdSource.next(id);
  }

  // Load datos for a user
  getDatos(usuarioId: string): Observable<Morfologia> {
    return this.http.get<any>(`${this.baseUrl}/${usuarioId}`).pipe(
      tap(backendData => {
        // Read local storage traits if any, or initialize defaults
        const localTraits = this.loadLocalTraits(usuarioId);
        
        const mergedTraits: RasgoColorimetrico[] = [
          {
            elemento: 'Piel',
            muestra_visual: localTraits.find(t => t.elemento === 'Piel')?.muestra_visual || '',
            descripcion: backendData.color_piel || '',
            es_imagen: !!(localTraits.find(t => t.elemento === 'Piel')?.es_imagen || localTraits.find(t => t.elemento === 'Piel')?.muestra_visual)
          },
          {
            elemento: 'Ojos',
            muestra_visual: localTraits.find(t => t.elemento === 'Ojos')?.muestra_visual || '',
            descripcion: backendData.color_ojos || '',
            es_imagen: !!(localTraits.find(t => t.elemento === 'Ojos')?.es_imagen || localTraits.find(t => t.elemento === 'Ojos')?.muestra_visual)
          },
          {
            elemento: 'Cabello',
            muestra_visual: localTraits.find(t => t.elemento === 'Cabello')?.muestra_visual || '',
            descripcion: backendData.color_cabello || '',
            es_imagen: !!(localTraits.find(t => t.elemento === 'Cabello')?.es_imagen || localTraits.find(t => t.elemento === 'Cabello')?.muestra_visual)
          }
        ];

        // Append custom traits that were stored in local storage
        localTraits.forEach(trait => {
          if (!['Piel', 'Ojos', 'Cabello'].includes(trait.elemento)) {
            mergedTraits.push(trait);
          }
        });

        const morfologia: Morfologia = {
          usuario_id: backendData.usuario_id || usuarioId,
          sexo: backendData.sexo || '',
          edad: backendData.edad || 0,
          ubicacion_principal: backendData.ubicacion_principal || '',
          ubicacion_secundaria: backendData.ubicacion_secundaria || '',
          estatura_cm: backendData.estatura_cm || 0,
          peso_kg: backendData.peso_kg || 0,
          medida_hombros_cm: backendData.medida_hombros_cm || undefined,
          medida_cintura_cm: backendData.medida_cintura_cm || undefined,
          medida_cadera_cm: backendData.medida_cadera_cm || undefined,
          medida_busto_cm: backendData.medida_busto_cm || undefined,
          climas: backendData.climas || [],
          rasgos: mergedTraits
        };

        this.morfologiaSource.next(morfologia);
      }),
      catchError(err => {
        // Fallback to empty / new morfologia
        const localTraits = this.loadLocalTraits(usuarioId);
        const defaultTraits = [
          { elemento: 'Piel', muestra_visual: localTraits.find(t => t.elemento === 'Piel')?.muestra_visual || '', descripcion: '', es_imagen: !!localTraits.find(t => t.elemento === 'Piel')?.muestra_visual },
          { elemento: 'Ojos', muestra_visual: localTraits.find(t => t.elemento === 'Ojos')?.muestra_visual || '', descripcion: '', es_imagen: !!localTraits.find(t => t.elemento === 'Ojos')?.muestra_visual },
          { elemento: 'Cabello', muestra_visual: localTraits.find(t => t.elemento === 'Cabello')?.muestra_visual || '', descripcion: '', es_imagen: !!localTraits.find(t => t.elemento === 'Cabello')?.muestra_visual }
        ];
        localTraits.forEach(trait => {
          if (!['Piel', 'Ojos', 'Cabello'].includes(trait.elemento)) {
            defaultTraits.push(trait);
          }
        });
        const emptyMorf: Morfologia = {
          usuario_id: usuarioId,
          sexo: '',
          edad: 0,
          ubicacion_principal: '',
          ubicacion_secundaria: '',
          estatura_cm: 0,
          peso_kg: 0,
          climas: [],
          rasgos: defaultTraits
        };
        this.morfologiaSource.next(emptyMorf);
        return of(emptyMorf);
      })
    );
  }

  // Save datos
  saveDatos(datos: Morfologia): Observable<{ id: number; mensaje: string }> {
    const color_piel = datos.rasgos.find(r => r.elemento === 'Piel')?.descripcion || '';
    const color_ojos = datos.rasgos.find(r => r.elemento === 'Ojos')?.descripcion || '';
    const color_cabello = datos.rasgos.find(r => r.elemento === 'Cabello')?.descripcion || '';

    const backendPayload = {
      usuario_id: datos.usuario_id || '1',
      sexo: datos.sexo,
      edad: datos.edad,
      color_piel,
      color_ojos,
      color_cabello,
      peso_kg: datos.peso_kg,
      estatura_cm: datos.estatura_cm,
      climas: datos.climas,
      ubicacion_principal: datos.ubicacion_principal,
      ubicacion_secundaria: datos.ubicacion_secundaria,
      medida_hombros_cm: datos.medida_hombros_cm,
      medida_cintura_cm: datos.medida_cintura_cm,
      medida_cadera_cm: datos.medida_cadera_cm,
      medida_busto_cm: datos.medida_busto_cm
    };

    return this.http.post<{ id: number; mensaje: string }>(this.baseUrl, backendPayload).pipe(
      tap(res => {
        if (datos.usuario_id) {
          this.saveLocalTraits(datos.usuario_id, datos.rasgos);
        }
        this.morfologiaSource.next(datos);
      })
    );
  }

  private loadLocalTraits(usuarioId: string): RasgoColorimetrico[] {
    try {
      const data = localStorage.getItem(`morfologia_traits_${usuarioId}`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveLocalTraits(usuarioId: string, traits: RasgoColorimetrico[]): void {
    try {
      localStorage.setItem(`morfologia_traits_${usuarioId}`, JSON.stringify(traits));
    } catch (e) {
      console.error('Error saving traits to localStorage:', e);
    }
  }
}
