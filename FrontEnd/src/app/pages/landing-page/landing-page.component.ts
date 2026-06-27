import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CarouselComponent } from '../../components/carousel/carousel.component';
import { CarouselSlide } from '../../models/carousel-slide.model';
import { CarouselService } from '../../services/carousel.service';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, CarouselComponent, RouterModule],
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.scss']
})
export class LandingPageComponent implements OnInit {
  public slidesData: CarouselSlide[] = [];
  private carouselService = inject(CarouselService);

  ngOnInit(): void {
    this.carouselService.getSlides().subscribe({
      next: (data) => {
        // Filtrar solo slides visibles y ordenarlas por el campo `orden`.
        this.slidesData = (data || [])
          .filter(s => s.visible === 1 || s.visible === true || s.visible === undefined)
          .sort((a, b) => (Number(a.orden || 0) - Number(b.orden || 0)));
      },
      error: (err) => {
        console.error('Error al cargar datos del carrusel:', err);
      }
    });
  }
}
