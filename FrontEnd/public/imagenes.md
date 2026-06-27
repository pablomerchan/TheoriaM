El control usa `aspect-ratio: 1/1` con `max-width: 492px`, así que el área de imagen es un cuadrado de hasta **492×492px**.

**Recomendación:**

- **Tamaño ideal**: `800×800px` — suficientemente grande para pantallas de alta densidad (Retina, 4K) sin ser excesivo.
- **Formato**: `.webp` (mejor compresión, calidad superior) o `.jpg` si compatibilidad es prioridad.
- **Proporción**: cuadrada `1:1` para que `object-fit: cover` no recorte partes importantes de la imagen.
- **Peso máximo**: menos de 200KB por imagen para carga rápida.

**Ejemplo práctico:**

| Uso | Tamaño | Formato |
|---|---|---|
| Óptimo | 800×800 | .webp |
| Alternativa | 600×600 | .jpg |
| Mínimo aceptable | 492×492 | .jpg |

Si las imágenes son de personas o prendas de cuerpo completo (como las que tienes), asegúrate de que el sujeto esté **centrado** en el encuadre, porque `object-position: center center` recortará los bordes si la imagen no llena exactamente el cuadrado.