# Prompt: construir el módulo "feed" de TheorIA M

> Instrucciones para una IA de desarrollo (Kiro, Copilot, Claude Code, etc.).
> Adjunta también el documento de arquitectura del feed para dar todo el contexto.

---

## ROL

Eres un arquitecto y desarrollador senior full-stack (Angular 19 y Python 3.12).
Vas a construir el módulo **feed** de la aplicación TheorIA M dentro de un repositorio existente.
Prioriza código claro, sencillo, bien estructurado y fácil de migrar a microservicios. No sobreingenierices.

## CONTEXTO DEL PROYECTO

TheorIA M tiene dos proyectos que colaboran **solo por API REST**:

- `FrontEnd/` → Angular 19 (componentes standalone, signals).
- `Backend/` → Python 3.12, APIs y acceso a SQL Server 2022.

Estructura actual del repositorio (`src/`):

- `Backend/`: `routes/`, `services/`, `repositories/`, `scripts/`, `backend.py`, `database.ini`, `requirements.txt`
- `FrontEnd/`: `BDs/` (SQLite de contenido), `src/`, `public/`, `docs/`
- `design/`, `docs/`, `webmaster/`, `.env.example`

Ya existen los componentes Angular `nuevo-usuario` (registro), `iniciar-sesion` y `caracteristicas-fisicas`.
Respeta sus convenciones (standalone, HttpClient, URL base del API desde `environment`; hoy `http://localhost:3000/api/...`).

**Antes de escribir código, LEE el código existente del Backend y del FrontEnd** y sigue su estilo, nombres y patrones. No reescribas lo que ya funciona.

## OBJETIVO

Crear un componente **feed**: un contenedor de scroll infinito que carga por tandas artículos desde SQL Server.
Cada artículo contiene bloques de texto, imágenes, videos y formularios (el usuario ingresa información con frecuencia).
El usuario viene de otro componente y se identifica por **id** y **seudónimo**.
El diseño debe funcionar en celular, tablet y escritorio.
Además hay menús con opciones que cargan contenido dentro y fuera del feed.

## REGLAS DE ARQUITECTURA (obligatorias)

1. El FrontEnd **nunca** accede a bases de datos. Solo habla con el Backend por REST.
2. SQL Server guarda **todos** los datos. SQLite (`FrontEnd/BDs`) guarda **solo** textos, ayudas HTML, menús y definición de controles/formularios; nunca datos del usuario.
   Hoy nadie lee esos SQLite: **NO implementes su lectura**. Diseña el feed para que los textos, menús y definiciones de formulario lleguen en un contrato JSON abstracto (hoy con datos de ejemplo en un archivo o servicio *mock* aislado), de modo que luego un módulo REST los provea sin cambiar los componentes.
3. Backend por capas y por dominio: `routes → services → repositories`.
   Un archivo por dominio en cada capa (`feed_routes.py`, `feed_service.py`, `feed_repo.py`; `formularios_*`; etc.).
   Un route solo llama a su service; un service solo a su repository u a otro service; ningún dominio lee tablas de otro. Entre dominios solo viaja el `usuario_id`.
4. Los repositories se definen como **interfaz** (clase abstracta o `Protocol`) con una implementación para SQL Server, de modo que se pueda cambiar de proveedor sin reescribir la lógica.
5. Identidad: el `usuario_id` se toma **siempre del token** (JWT con `sub` y seudónimo), nunca del cuerpo de la petición.
   Si el login aún no emite token, crea una dependencia/middleware de autenticación aislada y documenta qué falta.
6. Seguridad: consultas parametrizadas siempre, validación en el Backend, sanitizar el HTML que se muestre, secretos solo por variables de entorno (no en `database.ini`). Actualiza `.env.example`.
7. Esquemas separados en SQL Server por dominio (`tm_feed`, `tm_formularios`).
   No guardes imágenes ni videos en la base: solo su ruta/URL.
8. Sin texto fijo en plantillas Angular: usa claves resueltas por un servicio de textos (alimentado por el contrato del punto 2).

## MODELO DE DATOS (SQL Server)

Propón el DDL en `Backend/scripts/`, numerado (`001_...sql`, `002_...sql`):

- `tm_feed.articulo` (`id`, `titulo`, `publicado_en`, `estado`)
- `tm_feed.articulo_bloque` (`id`, `articulo_id`, `orden`, `tipo`, `payload_json`) con `tipo` ∈ {`texto`, `imagen`, `video`, `form`}
- `tm_formularios.respuesta_formulario` (`id`, `usuario_id`, `articulo_id`, `form_id`, `datos_json`, `client_request_id` UNIQUE, `creado_en`, `actualizado_en`)

Incluye índices para la paginación por cursor (`publicado_en DESC, id DESC`).
Scripts idempotentes (`IF NOT EXISTS`) y con datos de ejemplo.

## API (versionada, `/api/v1`)

- `GET /feed?cursor=&limite=10` → `{ items: [Articulo con bloques], siguienteCursor }`
  Paginación por **cursor** (`publicado_en` + `id`), **no** por OFFSET.
- `GET /formularios/{formId}/respuesta` → respuesta actual del usuario (si existe).
- `PUT|POST /formularios/{formId}/respuestas` → guarda; idempotente por `client_request_id`; el usuario sale del token.
- Errores en formato uniforme `{ codigo, mensaje, detalle }`.
- Genera/expone OpenAPI y guárdalo en `docs/api/openapi.json`.
- CORS por variable de entorno.

## FRONTEND (Angular 19)

Estructura dentro de `FrontEnd/src/app/`:

- `core/`: `SessionService` (signal con `{ id, seudonimo }`), interceptor JWT, guard de ruta, cliente de API.
- `shared/`: directiva `appInfiniteScroll` (IntersectionObserver sobre un centinela), pipes y piezas de UI comunes.
- `features/feed/`: `feed-shell`, `feed-menu`, `feed-container`, `article-host`, `blocks/` (`block-text`, `block-image`, `block-video`, `block-form`).

Requisitos:

- Standalone, signals, `ChangeDetectionStrategy.OnPush`, `@for` con `track`, `@defer` para cargar bloques, `NgOptimizedImage`.
- `SessionService` lo escriben `nuevo-usuario`/`iniciar-sesion` y lo lee el feed. Guard: sin sesión no se entra al feed. Muestra un saludo con el seudónimo.
- `feed-container`: estado con signals (`articulos`, `cargando`, `cursor`, `finDeLista`). Scroll infinito + botón "Cargar más" como alternativa accesible. Reservar espacio de imágenes y videos (`aspect-ratio`) para evitar saltos.
- Imágenes con `loading="lazy"`; video con `preload="none"`, `poster` y pausa al salir de pantalla.
- `article-host`: `@switch` por tipo de bloque. Agregar un tipo nuevo = crear un bloque y un caso, sin tocar lo demás.
- `block-form`: formulario dinámico (Reactive Forms tipado) a partir de una definición JSON; guardado **por formulario** con estados (pendiente, guardando, guardado, error); borrador temporal en `sessionStorage`; envío con `client_request_id`; si ya hay respuesta, mostrarla y permitir editar. No destruir el formulario al salir del viewport si tiene cambios sin guardar.
- Menú dinámico con campo `destino` ∈ {`feed`, `ruta`, `panel`, `accion`}:
  - `feed` = filtra/recarga (el filtro va en la URL: `?filtro=...`)
  - `ruta` = navega
  - `panel` = abre un panel lateral sin salir del feed
  - `accion` = ejecuta (cerrar sesión, refrescar)
- Responsivo **mobile-first** con CSS Grid:
  - Celular (< 600 px): barra inferior con 3-5 opciones + "Más", 1 columna.
  - Tablet (600-1024 px): riel lateral con iconos, 1 columna centrada (~720 px).
  - Escritorio (> 1024 px): menú lateral con texto + panel lateral opcional.
  - Objetivos táctiles ≥ 44 px, tipografía con `clamp()`, `env(safe-area-inset-*)`, `prefers-reduced-motion` y modo oscuro. `BreakpointObserver` solo para cambiar la estructura del menú; el resto con CSS.
- Accesibilidad: `role="feed"` y `role="article"` (`aria-posinset`/`aria-setsize`), `alt` en imágenes, subtítulos o transcripción en video, gestión de foco en paneles, navegación completa por teclado.

## PROCESO DE TRABAJO (síguelo en orden)

**Fase 0 — Análisis:** lee el repositorio, resume en pocas líneas las convenciones detectadas y lista cualquier duda o conflicto con estas instrucciones. **Detente y espera mi confirmación.**

**Fase 1 — Backend:** scripts DDL + dominio `feed` (route/service/repository con interfaz) + OpenAPI. Pruebas unitarias del service y del cursor.

**Fase 2 — Backend:** dominio `formularios` (guardado idempotente) + autenticación por token.

**Fase 3 — FrontEnd:** `core` (SessionService, interceptor, guard, cliente) y `feed-shell` con menú responsivo.

**Fase 4 — FrontEnd:** `feed-container` con scroll infinito y bloques de texto e imagen.

**Fase 5 — FrontEnd:** bloque de video y `block-form`.

**Fase 6 — Cierre:** accesibilidad, pruebas y documentación (actualizar `docs/`).

Al terminar cada fase: resume lo hecho, indica cómo probarlo y **espera mi aprobación** antes de continuar.

## CALIDAD Y ENTREGA

- Cambios mínimos y localizados; no modifiques archivos ajenos al alcance.
- Tipado estricto (TypeScript `strict`, type hints en Python), nombres claros en español coherentes con el proyecto, comentarios solo donde aporten.
- Pruebas: unitarias del Backend (`pytest`) y de los servicios y la directiva principal del FrontEnd.
- `requirements.txt` con versiones fijas; no añadas dependencias sin justificarlas.
- `.gitignore` debe excluir `.venv/`, `node_modules/`, `dist/`, `.angular/`, `__pycache__/` y `.env`.
- Si algo es ambiguo, **pregunta antes de asumir**. Si debes asumir, dilo explícitamente al inicio de tu respuesta.
