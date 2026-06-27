import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MaestrasService {
  private baseUrl = 'http://localhost:3000/api/maestras';

  constructor(private http: HttpClient) {}

  getMenuOptions(menuName: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/menus/${encodeURIComponent(menuName)}`);
  }

  getUbicaciones(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/ubicaciones`);
  }
}
