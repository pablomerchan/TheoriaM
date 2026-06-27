import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CarouselSlide } from '../models/carousel-slide.model';

@Injectable({
  providedIn: 'root'
})
export class CarouselService {
  private apiUrl = 'http://localhost:3000/api/carousel'; // URL de la API del backend

  constructor(private http: HttpClient) {}

  getSlides(): Observable<CarouselSlide[]> {
    return this.http.get<CarouselSlide[]>(this.apiUrl);
  }
}
