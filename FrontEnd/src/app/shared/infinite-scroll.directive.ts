import { AfterViewInit, Directive, ElementRef, EventEmitter, Input, OnDestroy, Output, inject } from '@angular/core';

@Directive({
  selector: '[appInfiniteScroll]',
  standalone: true
})
export class InfiniteScrollDirective implements AfterViewInit, OnDestroy {
  @Input() appInfiniteScrollDisabled = false;
  @Output() readonly appInfiniteScroll = new EventEmitter<void>();

  private readonly element = inject(ElementRef<HTMLElement>);
  private observer: IntersectionObserver | null = null;

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    this.observer = new IntersectionObserver((entries) => {
      if (!this.appInfiniteScrollDisabled && entries.some((entry) => entry.isIntersecting)) {
        this.appInfiniteScroll.emit();
      }
    });
    this.observer.observe(this.element.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
