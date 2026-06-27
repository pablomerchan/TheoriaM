import { Component, Input, OnInit, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { CarouselSlide } from '../../models/carousel-slide.model';

@Component({
  selector: 'app-carousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.scss']
})
export class CarouselComponent implements OnInit, OnDestroy {
  @Input() slides: CarouselSlide[] = [];
  @Input() autoPlayInterval: number = 5000;
  
  currentIndex = 0;
  private intervalId: any;
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.startAutoPlay();
    }
  }

  ngOnDestroy() {
    if (this.isBrowser) {
      this.stopAutoPlay();
    }
  }

  nextSlide() {
    if (!this.slides || this.slides.length === 0) return;
    this.currentIndex = (this.currentIndex + 1) % this.slides.length;
  }

  prevSlide() {
    if (!this.slides || this.slides.length === 0) return;
    this.currentIndex = (this.currentIndex - 1 + this.slides.length) % this.slides.length;
  }

  goToSlide(index: number) {
    this.currentIndex = index;
  }

  startAutoPlay() {
    if (this.autoPlayInterval > 0) {
      this.intervalId = setInterval(() => this.nextSlide(), this.autoPlayInterval);
    }
  }

  stopAutoPlay() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  onHover(isHovering: boolean) {
    if (!this.isBrowser) return;
    if (isHovering) {
      this.stopAutoPlay();
    } else {
      this.startAutoPlay();
    }
  }

  navigate(url: string, isExternal?: boolean) {
    if (!this.isBrowser) return;
    if (isExternal) {
      window.open(url, '_blank');
    } else {
      window.location.href = url;
    }
  }
}
