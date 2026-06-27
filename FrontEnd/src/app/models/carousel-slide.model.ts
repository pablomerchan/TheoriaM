export interface ActionButton {
  label: string;
  url: string;
  isExternal?: boolean;
}

export interface CarouselSlide {
  id: number | string;
  title: string;
  text: string;
  imageUrl: string;
  imageAltText?: string;
  button?: ActionButton;
  orden?: number;
  visible?: boolean | number;
}
