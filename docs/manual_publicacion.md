# Manual Pragmático: Publicación de Artículos y Carruseles

Todo el contenido principal se gestiona a través de la misma tabla de base de datos (`tbl_articulo`) o desde tu panel de Webmaster. La diferencia clave entre un artículo normal y un carrusel radica en el campo **`tipo_contenido`**.

Aquí tienes los pasos exactos y claros para cada caso:

---

## 📄 1. Publicar un Artículo (Estándar)
Un artículo es una vista simple de texto a la izquierda e imagen a la derecha. Se crea con un solo registro.

Asegúrate de llenar los campos con estos criterios:

- **Tipo Contenido (`tipo_contenido`)**: `articulo`
- **Título (`titulo`)**: El nombre público de tu artículo (Ej. *"Estilos de Verano"*).
- **Tipo Asesoría (`tipo_asesoria`)**: La categoría (Ej. *"Outfits"*). *(Importante: Debe coincidir con el tipo del menú para que se enlace en "Relacionados")*.
- **Media URL (`media_url`)**: La ruta de la foto o video (Ej. `/images/foto.jpg`).
- **Texto HTML (`texto_html`)**: El contenido formateado de tu artículo.
- **Menú ID (`menu_servicio_id`)**: El número del menú principal al que pertenece.
- **Visible (`visible`)**: `1` (Sí).

---

## 🖼️ 2. Publicar un Carrusel (Diapositivas múltiples)
Un carrusel **no** es un solo registro. Es una **agrupación de varias diapositivas**. 
Para publicar un carrusel que tiene 3 imágenes, debes crear **3 registros independientes** en `tbl_articulo`.

Sigue estas **Reglas de Oro** para crear cada registro (diapositiva) del carrusel:

1. **Tipo Contenido**: En todos los registros, debes poner **`diapositiva`** (en minúsculas).
2. **Título y Tipo Asesoría**: 
   > [!IMPORTANT] 
   > **Deben ser exactamente iguales** en todos los registros que formen este carrusel. 
   > *(Ej: Si el título es "Zapatos de Gala", las 3 diapositivas deben llamarse "Zapatos de Gala").* De esta forma, el sistema los agrupa automáticamente en el mismo reproductor y solo muestra el nombre una vez en la lista.
3. **Orden (`orden`)**: Usa este campo numerando cada registro (1, 2, 3...) para establecer qué imagen sale primero en el reproductor.
4. **Media URL y Texto HTML**: Estos sí deben ser **diferentes** en cada registro, correspondiendo a la foto y el texto de esa diapositiva en específico.
5. **Visible (`visible`)**: `1` (Sí).

### Ejemplo rápido de Carrusel:
- **Diapositiva 1**: Título: "Botas", Tipo Contenido: "diapositiva", Orden: 1, Media URL: "/img/botas1.jpg"
- **Diapositiva 2**: Título: "Botas", Tipo Contenido: "diapositiva", Orden: 2, Media URL: "/img/botas2.jpg"
- **Diapositiva 3**: Título: "Botas", Tipo Contenido: "diapositiva", Orden: 3, Media URL: "/img/botas3.jpg"

*(El sistema detectará que todas tienen el mismo nombre y tipo, y armará un solo carrusel de 3 imágenes).*
