# Especificación Técnica: Landing Page Minimalista con Carrusel

## 1. Visión General
El objetivo es desarrollar una Landing Page de estilo **minimalista y altamente atractiva** para promocionar los servicios del sitio web. El elemento central de esta página será un componente de **carrusel** que presentará la información de forma dinámica y visual.

## 2. Pila Tecnológica
- **Framework:** Angular 21 (Standalone Components recomendados por defecto).
- **Estilos:** SCSS o CSS Vanilla (priorizando variables CSS para temas, animaciones fluidas y diseño "Glassmorphism" o similar si encaja en el diseño premium).
- **Tipografía y Diseño:** Fuentes modernas (ej. Inter, Outfit), paleta de colores limpia con amplio uso de espacios en blanco ("negative space").

## 3. Requerimientos Funcionales

### Componente Principal: Carrusel Promocional
El carrusel es el protagonista de la Landing Page y debe cumplir con los siguientes requisitos:

- **Contenido por Diapositiva (Slide):**
  - **Imagen:** Principalmente orientada a mostrar el servicio o producto (puede ser de fondo o a un costado en escritorio).
  - **Título:** Texto principal y conciso (usar jerarquía `<h1>` en el primer slide o `<h2>`).
  - **Texto:** Descripción breve y persuasiva del servicio.
  - **Botón (Call to Action - Opcional):** Un botón que, en caso de estar presente en la configuración del slide, debe mostrar un texto y navegar/redirigir a una URL (interna o externa).

- **Controles de Navegación:**
  - Flechas laterales (Anterior / Siguiente).
  - Indicadores inferiores (Dots/Píldoras) para navegación directa a un slide específico.
  - Transiciones automáticas (Autoplay) configurables (ej. 5 segundos por slide), que se pausen al hacer "hover".

## 4. Requerimientos No Funcionales y UX
- **Diseño Responsivo (Mobile-First):** El carrusel debe adaptar su diseño. En escritorio, el texto puede ir al lado de la imagen; en móviles, el texto debe superponerse o colocarse debajo de la imagen.
- **Animaciones Premium:** Transiciones de slide muy suaves (fade, slide in) usando Angular Animations o transiciones CSS modernas.
- **Rendimiento:** Optimizar la carga de las imágenes del carrusel usando `NgOptimizedImage` para asegurar un buen LCP (Largest Contentful Paint).
- **Accesibilidad (A11y):** Los botones del carrusel deben ser navegables por teclado, y las imágenes deben contener los atributos `alt` adecuados. Atributos ARIA (ej. `aria-hidden` para slides inactivos).

## 5. Modelo de Datos Sugerido (Interface TypeScript)

Para alimentar el carrusel de forma dinámica, se sugiere la siguiente estructura de datos:

```typescript
export interface ActionButton {
  label: string;
  url: string;
  isExternal?: boolean; // Para decidir si usa routerLink o un simple href
}

export interface CarouselSlide {
  id: number | string;
  title: string;
  text: string;
  imageUrl: string;
  imageAltText?: string;
  button?: ActionButton; // Propiedad opcional
}
```

## 6. Arquitectura de Componentes Sugerida en Angular

Se plantea una arquitectura modular para mantener el código limpio y reutilizable:

```text
src/app/
 ├── pages/
 │    └── landing-page/
 │         ├── landing-page.component.ts      # Componente inteligente (Smart), maneja los datos
 │         ├── landing-page.component.html
 │         └── landing-page.component.scss    # Estilos de la layout general
 ├── shared/
 │    └── components/
 │         └── carousel/
 │              ├── carousel.component.ts     # Componente tonto (Dumb), recibe slides por @Input()
 │              ├── carousel.component.html
 │              └── carousel.component.scss   # Lógica visual de las transiciones y diseño
```

## 7. Criterios de Aceptación
1. La aplicación compila correctamente en Angular 21.
2. La Landing Page carga mostrando el componente del carrusel como foco principal.
3. El carrusel renderiza dinámicamente un arreglo de objetos `CarouselSlide`.
4. El carrusel no rompe la UI si un slide no tiene configurado un botón (el botón simplemente se omite).
5. Las transiciones entre slides son fluidas y visualmente atractivas.
6. La página es completamente responsiva y funciona correctamente en resoluciones móviles.