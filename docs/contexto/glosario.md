# Glosario y Entidades - TheorIA M

Definición clara de todos los términos, entidades y conceptos usados en el proyecto TheorIA M. Esta guía elimina ambigüedades y facilita la comunicación del equipo.

---

## Índice

1. [Entidades de Negocio](#entidades-de-negocio)
2. [Conceptos del Dominio](#conceptos-del-dominio)
3. [Entidades de Datos](#entidades-de-datos)
4. [Componentes UI](#componentes-ui)
5. [Servicios](#servicios)
6. [Tipos de Asesoría](#tipos-de-asesoría)
7. [Técnicos/Arquitectura](#técnicosarquitectura)
8. [Acrónimos](#acrónimos)

---

## Entidades de Negocio

### Persona
**Definición**: Usuario registrado en el sistema TheorIA M.

**Campos Principales**:
- `id`: Identificador único (string, puede ser UUID o número como string)
- `nombre`: Nombre completo del usuario
- `email`: Correo electrónico
- `género`: Sexo biológico (Masculino, Femenino, Otro)
- `edad`: Años cumplidos
- `tipo_cuerpo`: Clasificación de silueta corporal (Rectángulo, Reloj de Arena, Pera, Manzana, Triángulo, etc.)
- `gustos_json`: Preferencias de estilo en formato JSON

**Relaciones**:
- Una Persona puede tener múltiples Asesorías
- Una Persona pertenece a uno o múltiples Grupos de Personas

**Ejemplo**:
```json
{
  "id": "persona_001",
  "nombre": "María García",
  "email": "maria@example.com",
  "género": "Femenino",
  "edad": 28,
  "tipo_cuerpo": "Reloj de Arena",
  "gustos_json": { "colores": ["azul", "rojo"], "estilos": ["clásico", "moderno"] }
}
```

**BD**: `asesoria.db` → `tbl_persona`

---

### Asesoría
**Definición**: Proceso de análisis y recomendación personalizado para una Persona sobre su estilo, guardarropa y paleta cromática.

**Campos Principales**:
- `id`: Identificador único de la asesoría
- `persona_id`: FK a tbl_persona
- `tipo_id`: FK a tbl_tipo_asesoria (tipo de asesoría)
- `asesor_id`: ID de quien realiza la asesoría (puede ser IA o persona)
- `fecha`: Timestamp de creación
- `estado`: Activa, completada, pausada, archivada

**Estados Posibles**:
- `activa`: En progreso
- `completada`: Finalizada y con resumen
- `pausada`: Suspendida temporalmente
- `archivada`: Cerrada sin completar

**Relaciones**:
- Una Asesoría tiene un Resumen de Asesoría
- Una Asesoría pertenece a una Persona
- Una Asesoría es de un Tipo específico

**BD**: `asesoria.db` → `tbl_asesoria`

---

### Tipo de Asesoría
**Definición**: Categoría o modalidad de asesoría disponible en el sistema.

**Tipos Comunes**:
- `análisis_cromático`: Determinación de paleta de colores personal
- `análisis_silueta`: Recomendación de cortes y prendas por tipo de cuerpo
- `guardarropa_basico`: Creación de guardarropa esencial
- `estilo_personal`: Identificación de preferencias estilísticas
- `mezcla_prendas`: Cómo combinar prendas existentes

**Campos**:
- `id`: Identificador único
- `nombre`: Nombre legible (Ej: "Análisis de Color")
- `descripción`: Texto explicativo
- `menu_servicio_ref`: Referencia a menú relacionado

**BD**: `asesoria.db` → `tbl_tipo_asesoria`

---

## Conceptos del Dominio

### Análisis Cromático
**Definición**: Proceso de identificar la paleta de colores que armonizan con la coloración natural de una Persona.

**Componentes Analizados**:
- **Color de piel**: Tono base (muy clara, clara, media, morena, muy oscura)
- **Color de ojos**: Matiz ocular (negro, marrón, verde, azul, etc.)
- **Color de cabello natural**: Pigmentación del cabello sin teñir

**Resultado**: Paleta personal de colores recomendados

**Relación con BD**: `datos_morfologicos.db` almacena color_piel, color_ojos, color_cabello

---

### Datos Morfológicos
**Definición**: Conjunto de medidas físicas y características corporales de una Persona.

**Medidas Registradas**:
- `peso_kg`: Peso en kilogramos
- `estatura_cm`: Altura en centímetros
- `medida_hombros_cm`: Ancho de hombros
- `medida_cintura_cm`: Circunferencia de cintura
- `medida_cadera_cm`: Circunferencia de cadera
- `medida_busto_cm`: Circunferencia de pecho

**Características**:
- `sexo`: Masculino/Femenino
- `color_piel`, `color_ojos`, `color_cabello`: Tonalidades personales
- `edad`: Años cumplidos
- `climas`: Clima habitual de residencia
- `ubicación_principal`: Lugar de residencia principal
- `ubicación_secundaria`: Lugar de trabajo o segunda residencia

**Propósito**: Base para análisis de silueta, recomendaciones de tallas y cortes

**BD**: `datos_morfologicos.db` → `datos_morfologicos`

---

### Tipo de Cuerpo
**Definición**: Clasificación de la silueta corporal según proporciones entre hombros, cintura y cadera.

**Clasificaciones**:
- **Rectángulo**: Hombros y cadera con igual ancho, cintura poco marcada
- **Reloj de Arena**: Hombros y cadera anchos, cintura muy marcada
- **Pera**: Cadera más ancha que hombros
- **Manzana**: Cintura ancha, hombros y cadera más estrechos
- **Triángulo**: Hombros más anchos que cadera
- **Triángulo Invertido**: Hombros muy anchos, cadera estrecha

**Uso**: Determinar qué cortes y prendas favorecen más

---

### Guardarropa
**Definición**: Colección de prendas de vestir de una Persona, registradas y categorizadas en el sistema.

**Componentes**:
- **Prendas**: Artículos individuales (blusa, pantalón, abrigo, etc.)
- **Categorías**: Tipo de prenda (tops, bottoms, outerwear, accesorios)
- **Tallas**: Medidas en que están disponibles
- **Estilos**: Etiquetas asociadas (clásico, casual, formal, bohemio)

**Propósito**: Crear combinaciones (outfits) y sugerencias diarias

**Módulo UI**: Componente `mi-guarda-ropas`

---

### Paleta Cromática
**Definición**: Conjunto de colores recomendados para una Persona, basados en su análisis cromático.

**Tipos de Paleta**:
- **Colores Primarios**: Tonos principales que más favorecen
- **Colores Secundarios**: Tonos que complementan
- **Colores Neutrales**: Grises, negros, blancos personales
- **Colores Acentuantes**: Tonos para detalles y accesorios

**Formato**: JSON con códigos hexadecimales
```json
{
  "primarios": ["#E5B87C", "#8B6914", "#D2B48C"],
  "secundarios": ["#C41E3A", "#FFA500"],
  "neutrales": ["#2F2F2F", "#F5F5F5"]
}
```

---

## Entidades de Datos

### Carrusel
**Definición**: Componente visual que muestra contenido en rotación automática.

**Tipos**:
1. **Carrusel Promocional**: Slides con información, imágenes y llamadas a acción
2. **Carrusel de Asesorías**: Muestra diferentes asesorías disponibles
3. **Carrusel de Artículos**: Lista de artículos sobre moda/estilo
4. **Carrusel Rápido**: Rotación rápida de imágenes (asesoria-rápida)

**Campos Principales**:
- `id`: Identificador único
- `tag`: Categoría/tema (Ej: "TECNOLOGÍA", "UX/UI")
- `title`: Título del slide
- `text`: Descripción o contenido
- `imageUrl`: URL de la imagen
- `imageAltText`: Texto alternativo para accesibilidad
- `buttonLabel`: Etiqueta del botón (Ej: "Ver más")
- `buttonUrl`: Destino del botón (URL interna o externa)
- `isExternal`: Flag si el link es externo (1) o interno (0)
- `orden`: Orden de aparición en el carrusel

**BD**: `carousel.db` → `tbl_carrusel`

**Componentes UI**:
- `carousel.component.ts`: Carrusel genérico
- `asesoria-carousel.component.ts`: Carrusel especializado para asesorías

---

### Artículo
**Definición**: Contenido estático de texto con imagen/video sobre moda, estilo, tendencias.

**Tipos**:
1. **Artículo Editorial**: Blogs sobre tendencias de moda
2. **Guía Práctica**: Tutoriales sobre cómo combinar prendas
3. **Tips de Estilo**: Consejos rápidos y aplicables
4. **Artículo Webmaster**: Contenido que edita el administrador

**Campos Principales**:
- `id`: Identificador único
- `titulo`: Título del artículo
- `contenido`: Cuerpo del texto (puede ser HTML)
- `texto_html`: HTML formateado del contenido
- `media_url`: URL de imagen o video
- `media_tipo`: 'imagen', 'video', 'webm'
- `tipo_asesoria`: FK a tipo de asesoría (opcional)
- `grupo_id`: Categoría/grupo del artículo
- `tags`: JSON array de etiquetas
- `visible`: Flag si está publicado (0/1)
- `orden`: Orden de aparición
- `publicado_en`: Timestamp de publicación

**BD**: `asesoria.db` → `tbl_articulo`

**Componentes UI**:
- `articulo.component.ts`: Visualización de artículo individual
- `webmaster-articulo.component.ts`: Gestión de artículos (admin)

---

### Asesoría Rápida
**Definición**: Galería de imágenes en rotación continua sobre un tema (Ej: combinaciones de outfit, looks de temporada).

**Características**:
- Reproducción automática de imágenes en secuencia
- Velocidad configurable (ms entre cambios)
- Texto descriptivo opcional

**Campos Principales**:
- `id`: Identificador único
- `imagen_url`: URL de la imagen a mostrar
- `velocidad_reproduccion`: Milisegundos entre cambios (default 1500ms)
- `texto_html`: Descripción o contexto de la imagen
- `tipo_asesoria`: Categoría/tipo
- `visible`: Flag de publicación
- `orden`: Posición en la galería

**BD**: `asesoria.db` → `tbl_asesoria_rapida`

**Componente UI**: `asesoria-rapida.component.ts`

---

### Carrusel de Items
**Definición**: Catálogo de prendas individuales con descripción y carrusel HTML.

**Campos Principales**:
- `id`: Identificador único
- `nombre`: Nombre de la prenda
- `categoria`: Tipo de prenda (tops, bottoms, etc.)
- `text_html`: Descripción HTML
- `imagen_url`: URL de imagen principal
- `tallas`: JSON array de tallas disponibles
- `estilos`: JSON array de etiquetas de estilo
- `tipo_asesoria`: Categoría a la que pertenece
- `visible`: Flag de publicación

**BD**: `asesoria.db` → `tbl_carrusel_items`

---

### Menú de Servicios
**Definición**: Estructura jerárquica de navegación para acceder a diferentes tipos de asesoría.

**Campos Principales**:
- `id`: Identificador único
- `tema`: Tema principal (Ej: "Análisis Personal")
- `subtema`: Subtema específico (Ej: "Color de Piel")
- `orden`: Posición en el menú
- `visible`: Flag si se muestra (0/1)
- `id_usuario`: Creador del menú

**Relación**: tbl_menu_servicios ← FK ← tbl_menu_asesoria

**BD**: `asesoria.db` → `tbl_menu_servicios`

---

### Menú de Asesoría (Content)
**Definición**: Contenido asociado a un Menú de Servicios (componentes UI dinámicos).

**Campos Principales**:
- `id`: Identificador único
- `menu_servicio_id`: FK a tbl_menu_servicios
- `menu_principal`: Nombre del menú en UI
- `texto_html`: Contenido en HTML
- `imagen_url`: URL de imagen
- `imagen_alt`: Texto alternativo
- `tipo_asesoria`: Tipo de contenido
- `titulo`: Título del elemento
- `visible`: Flag de publicación

**Propósito**: Contiene el contenido específico que se muestra en cada menú

**BD**: `asesoria.db` → `tbl_menu_asesoria`

---

## Componentes UI

### Componente
**Definición**: Unidad reutilizable de Angular que encapsula vista, lógica y estilos.

**Convención de Nombres**: `{nombre}.component.ts`

**Componentes Principales**:

| Nombre | Propósito | Archivo |
|--------|-----------|---------|
| **Carousel** | Carrusel genérico de slides | `carousel.component.ts` |
| **Articulo** | Visualización de artículo individual | `articulo.component.ts` |
| **Asesoria Carousel** | Carrusel especializado de asesorías | `asesoria-carousel.component.ts` |
| **Asesoria Rápida** | Galería con rotación automática | `asesoria-rapida.component.ts` |
| **Guía Compras** | Panel de recomendaciones de compra | `guia-compras.component.ts` |
| **Mi Guardarropa** | Gestión del guardarropa personal | `mi-guarda-ropas.component.ts` |
| **Sugerencia Diaria** | Outfit sugerido del día | `sugerencia-diaria.component.ts` |
| **Texto GPT** | Contenido generado con IA | `texto-gpt.component.ts` |
| **Webmaster Articulo** | CRUD de artículos (admin) | `webmaster-articulo.component.ts` |
| **Webmaster Dashboard** | Panel de control del administrador | `webmaster-dashboard.component.ts` |
| **Interactive Help** | Sistema de ayuda contextual | `interactive-help.component.ts` |
| **Registro Asesoría** | Formulario de registro | `registro-asesoria-theor-iam.component.ts` |

---

### Página (Page)
**Definición**: Componente de nivel superior mapeado directamente a una ruta.

**Convención de Nombres**: `{nombre}.component.ts` (carpeta `pages/`)

**Páginas Principales**:

| Nombre | Ruta | Propósito |
|--------|------|-----------|
| **Landing Page** | `/` | Página de inicio |
| **Datos Morfológicos** | `/datos-morfologicos` | Registro de medidas físicas |
| **Asesoría** | `/asesoria` | Panel principal de asesoría |
| **Webmaster** | `/webmaster` | Dashboard del administrador |

---

## Servicios

### Servicio
**Definición**: Clase reutilizable que encapsula lógica de negocio y comunicación con API.

**Convención de Nombres**: `{nombre}.service.ts`

### Servicios Principales

#### AsesoriaService
**Propósito**: Gestionar datos y obtención de asesorías personalizadas.

**Métodos Principales**:
- `getMenus(usuarioId?)`: Obtiene menús de servicios
- `getArticulos(menuId, usuarioId?)`: Obtiene artículos de un menú
- `getCarruseles(usuarioId, menuId?)`: Obtiene carruseles personalizados

**API Base**: `http://localhost:3000/api/asesoria`

---

#### CarouselService
**Propósito**: Gestionar carruseles genéricos de promociones.

**Métodos Principales**:
- `getCarousels()`: Obtiene todos los carruseles activos
- `getCarouselById(id)`: Obtiene carrusel específico

---

#### DatosMorfologicosService
**Propósito**: Gestionar registro y obtención de datos físicos del usuario.

**Métodos Principales**:
- `saveDatos(datos)`: Registra nuevas medidas
- `getDatos(usuarioId)`: Obtiene datos morfológicos guardados

---

#### UsuarioService
**Propósito**: Gestionar información del perfil de usuario.

**Métodos Principales**:
- `getUsuario(id)`: Obtiene datos de usuario
- `updateUsuario(datos)`: Actualiza perfil

---

#### WebmasterArticuloService
**Propósito**: CRUD de artículos (administrador).

**Métodos Principales**:
- `getArticulos()`: Lista todos los artículos
- `createArticulo(data)`: Crea nuevo artículo
- `updateArticulo(id, data)`: Edita artículo
- `deleteArticulo(id)`: Elimina artículo

---

## Tipos de Asesoría

### Análisis Cromático
Determinación de la paleta de colores que favorecen a la Persona.

**Salida**: Recomendación de colores para prendas, maquillaje y accesorios.

---

### Análisis de Silueta
Recomendación de cortes, estilos y prendas según el tipo de cuerpo.

**Salida**: Guía de prendas recomendadas, zonas a destacar/disimular.

---

### Guardarropa Básico
Creación de un guardarropa esencial funcional y versátil.

**Salida**: Listado de prendas clave, colores y combinaciones.

---

### Estilo Personal
Identificación del estilo propio y preferencias estilísticas.

**Salida**: Descripción de estilo, recomendaciones de marcas y looks.

---

### Mezcla de Prendas
Cómo combinar efectivamente prendas existentes en nuevos looks.

**Salida**: Sugerencias de combinaciones y outfits.

---

## Técnicos/Arquitectura

### API REST
**Definición**: Interfaz de comunicación entre Frontend y Backend.

**Endpoints Principales**:
```
GET    /api/carousel                    # Obtener carruseles
GET    /api/ayuda/datos-personales      # Obtener ayuda contextual
GET    /api/ayuda/datos-personales/{campo} # Obtener ayuda de un campo específico
POST   /api/datos-morfologicos          # Guardar medidas
GET    /api/datos-morfologicos/{usuario_id}     # Obtener medidas del usuario
GET    /api/asesoria/menus              # Obtener menús de asesoría
GET    /api/asesoria/menus/{menu_id}/articulos # Obtener artículos de un menú
GET    /api/asesoria/carruseles         # Obtener definiciones de carrusel
GET    /api/asesoria/articulo           # Obtener artículo personalizado
GET    /api/asesoria/rapida            # Obtener asesoría rápida
GET    /api/persona/mi-perfil           # Obtener perfil del usuario actual
GET    /api/webmaster/articulos         # Listar artículos de webmaster
GET    /api/webmaster/articulo/{articulo_id} # Obtener artículo por id
POST   /api/webmaster/articulo          # Crear artículo de webmaster
PUT    /api/webmaster/articulo/{articulo_id} # Actualizar artículo de webmaster
DELETE /api/webmaster/articulo/{articulo_id} # Eliminar artículo de webmaster
```},{

---

### Observable
**Definición**: Patrón reactivo de RxJS que emite valores de forma asíncrona.

**Uso en TheorIA M**: Envolvimiento de todas las llamadas HTTP.

**Ejemplo**:
```typescript
getArticulos(): Observable<AsesoriaArticulo[]> {
  return this.http.get<AsesoriaArticulo[]>(`${this.apiUrl}/articulos`);
}
```

---

### Async Pipe
**Definición**: Pipe de Angular que se suscribe automáticamente a Observables.

**Uso en Templates**:
```html
<div *ngIf="articulos$ | async as items">
  <div *ngFor="let item of items">{{ item.title }}</div>
</div>
```

---

### Model/Interface
**Definición**: Contrato TypeScript que define la estructura de datos.

**Convención**: `{nombre}.model.ts`

**Ejemplo**:
```typescript
export interface CarouselSlide {
  id: number;
  title: string;
  text: string;
  imageUrl: string;
}
```

---

### Standalone Component
**Definición**: Componente Angular 14+ que no requiere NgModule.

**Declaración**:
```typescript
@Component({
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class MiComponente { }
```

---

### Inyección de Dependencias (DI)
**Definición**: Patrón de inversión de control para inyectar dependencias.

**Método Moderno** (Angular 14+):
```typescript
private http = inject(HttpClient);
```

---

### Database (BD)
**Definición**: Archivo SQLite que almacena datos persistentes.

**BDs en Proyecto**:
1. `asesoria.db` - Asesorías, personas, artículos
2. `carousel.db` - Carruseles promocionales
3. `datos_morfologicos.db` - Medidas físicas
4. `interactive_help.db` - Ayuda contextual
5. `maestras_menus.db` - Datos de referencia

---

### CORS
**Definición**: Cross-Origin Resource Sharing - Política de seguridad del navegador.

**Estado Actual**: Abierto en desarrollo (`allow_origins=["*"]`)

**Nota**: ⚠️ Debe ser restrictivo en producción

---

### Mock User
**Definición**: Usuario simulado para desarrollo, sin autenticación real.

**Uso**: Header `X-Mock-User-Id: {id}`

**Nota**: ⚠️ Solo para desarrollo, no producción

---

### JWT
**Definición**: JSON Web Token - Estándar de autenticación.

**Estado**: Planeado para producción, no implementado aún.

---

## Acrónimos

| Acrónimo | Significado | Contexto |
|----------|-------------|---------|
| **API** | Application Programming Interface | Interfaz de comunicación |
| **BD** | Base de Datos | Almacenamiento persistente |
| **CORS** | Cross-Origin Resource Sharing | Seguridad navegador |
| **CRUD** | Create, Read, Update, Delete | Operaciones básicas |
| **CSS** | Cascading Style Sheets | Estilos |
| **DI** | Dependency Injection | Inyección de dependencias |
| **FK** | Foreign Key | Clave foránea en BD |
| **HTML** | HyperText Markup Language | Estructura de documentos |
| **HTTP** | HyperText Transfer Protocol | Protocolo web |
| **IA** | Inteligencia Artificial | Análisis automático |
| **IMC** | Índice de Masa Corporal | Medida antropométrica |
| **JSON** | JavaScript Object Notation | Formato de datos |
| **JWT** | JSON Web Token | Autenticación |
| **LTS** | Long Term Support | Soporte extendido (Angular) |
| **MVP** | Minimum Viable Product | Producto mínimo viable |
| **ORM** | Object-Relational Mapping | Mapeo de objetos a BD |
| **RxJS** | Reactive Extensions for JavaScript | Librería reactiva |
| **SCSS** | Sassy CSS | Preprocesador CSS |
| **SPA** | Single Page Application | Aplicación de página única |
| **SQL** | Structured Query Language | Lenguaje de BD |
| **Tbl** | Table | Tabla en BD (prefijo convención) |
| **TS** | TypeScript | Lenguaje con tipos |
| **UI** | User Interface | Interfaz de usuario |
| **UUID** | Universally Unique Identifier | Identificador único universal |
| **UX** | User Experience | Experiencia del usuario |

---

## Relaciones Entre Entidades

```
Persona
├─ 1:N → Asesoría
├─ N:M → Grupo de Personas
├─ 1:1 → Datos Morfológicos
└─ 1:1 → Guardarropa

Asesoría
├─ N:1 ← Persona
├─ N:1 → Tipo de Asesoría
├─ 1:1 → Resumen de Asesoría
└─ 1:N → Artículos relacionados

Tipo de Asesoría
├─ 1:N → Asesoría
└─ 1:N → Menú de Servicios

Menú de Servicios
└─ 1:N → Menú de Asesoría (Content)

Guardarropa
├─ 1:N → Prendas
└─ 1:N → Sugerencias Diarias
```

---

## Estados y Valores Comúnes

### Estados de Asesoría
```
activa      → En progreso
completada  → Finalizada
pausada     → Suspendida
archivada   → Cerrada
```

### Tipos de Prenda
```
tops        → Blusas, camisetas, sudaderas
bottoms     → Pantalones, faldas, shorts
outerwear   → Abrigos, chaquetas
accesorios  → Bolsos, zapatos, joyas
dresses     → Vestidos
```

### Estilos
```
clásico     → Formal, elegante
casual      → Relajado, informal
bohemio     → Artístico, relajado
deportivo   → Funcional, cómodo
preppy      → Académico, estructurado
minimalista → Simple, esencial
```

### Climas
```
tropical     → Caluroso y húmedo
subtropical  → Cálido moderado
templado     → Estaciones marcadas
frío         → Montaña, invierno
árido        → Seco
costero      → Marino, húmedo
variable     → Varios climas
```

---

## Nomenclatura de Bases de Datos

### Convenciones

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Tabla | Prefijo `tbl_` + snake_case | `tbl_persona`, `tbl_articulo` |
| Columna | snake_case | `usuario_id`, `fecha_registro` |
| Clave Primaria | `id` (siempre) | `id INTEGER PRIMARY KEY` |
| Clave Foránea | Nombrada explícita | `usuario_id`, `menu_servicio_id` |
| Booleano | INTEGER (0/1) | `visible INTEGER DEFAULT 1` |
| Timestamp | DATETIME o TIMESTAMP | `fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP` |
| JSON | TEXT con formato JSON | `gustos_json TEXT DEFAULT '{}'` |

---

## Glosario Específico de Moda

### Análisis de Color (Color Analysis)
Sistema de clasificación de tonos personales para determinar qué colores favorecen.

**Sistemas Populares**:
- Estaciones (Primavera, Verano, Otoño, Invierno)
- Tono (Cálido, Frío, Neutro)
- Undertone (Subtono de piel)

---

### Corte de Prenda (Cut/Style)
Forma específica en que se confecciona una prenda.

**Ejemplos**:
- Slim (ajustado)
- Boyfriend (holgado)
- A-line (acampanado)
- Wrap (envolvente)

---

### Silueta
Forma general del cuerpo o de cómo cae una prenda.

---

### Palette (Paleta)
Conjunto de colores coordinados y harmonizados para una Persona.

---

### Outfit
Combinación completa de prendas (top, bottom, accesorios, calzado).

---

### Look
Estilo visual general que resulta del outfit y accesorios.

---

### Proporción
Relación entre dimensiones de diferentes partes del cuerpo o prenda.

---

## Cómo Usar Este Glosario

1. **Consulta Rápida**: Usa el índice para buscar términos
2. **Antes de Nominar**: Verifica si el término ya existe
3. **Comunicación Clara**: Usa nombres oficiales en documentos y código
4. **Nuevos Términos**: Si hay término nuevo, agrégalo aquí
5. **Actualización**: Mantener este documento sincronizado con el código

---

**Versión**: 1.0  
**Última Actualización**: 22 de Junio de 2026  
**Responsable**: Arquitecto de Software  
**Próxima Revisión**: Agosto 2026
