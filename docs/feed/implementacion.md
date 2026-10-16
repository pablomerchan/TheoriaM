# Implementación del feed: Fase 1

El backend nuevo se expone bajo `/api/v1` sin mover ni versionar las rutas
existentes. `GET /api/v1/feed?cursor=&limite=10` requiere la sesión que ya
emite el inicio de sesión, devuelve artículos publicados con bloques y pagina
por `publicado_en DESC, articulo_id DESC`. El límite aceptado es de 1 a 50.

El cursor es un JSON codificado en Base64 URL-safe que contiene la fecha y el
id del último artículo entregado. Es un dato de paginación, no una credencial.
Si quedan artículos, la respuesta entrega `siguienteCursor`; en caso contrario
vale `null`. Los payloads JSON de los bloques se entregan como objetos en
`payload`.

El repositorio es una interfaz (`FeedRepository`) con implementación SQL
Server. La implementación llama solamente a `tm_feed.usp_feed_listar` mediante
parámetros y procesa sus dos resultados con `cursor.nextset()`. Los scripts
idempotentes de tablas, procedimientos y permisos están en
`Backend/scripts/001_feed_formularios.sql` y
`Backend/scripts/002_permisos_feed.sql`. Ejecútalos en ese orden con una cuenta
administradora de la base `TheoriaM`; el segundo reutiliza `usuario_web`.

Se verificó en SQL Server que `tm_userdata.tbl_usuarios.IdUsr` es
`uniqueidentifier` (16 bytes). Por eso `respuesta_formulario.usuario_id` y los
parámetros de los procedimientos de respuesta usan ese tipo, sin una clave
foránea entre dominios.

La identidad del feed se resuelve con `get_usuario_actual`, que adapta la
sesión autenticada existente al contrato `{ id, seudonimo }`. Nunca se toma
`usuario_id` de una petición. El token actual es opaco y sus sesiones viven en
memoria: no es compatible con varios workers ni con despliegues distribuidos o
microservicios. Migrar a validación compartida o a un mecanismo de identidad
distribuido queda como deuda técnica; JWT no forma parte de esta fase.

La aplicación expone OpenAPI en `/openapi.json` y Swagger UI en `/docs`.
La instantánea correspondiente a esta fase está en
`docs/api/openapi.json`. La configuración CORS lee la lista de orígenes desde
`THEORIAM_CORS_ORIGINS`, separada por comas.

## Deudas técnicas fuera de esta fase

- Reemplazar el almacenamiento en memoria de sesiones antes de escalar a varios
  workers o separar el backend en microservicios.
- Migrar los secretos de SQL Server a variables de entorno/gestor de secretos.
  El conector compartido y `Backend/database.ini` se conservaron sin cambios
  en esta fase.
- El frontend existente usa Angular 21.2; el número 19 de la solicitud inicial
  era un error. El módulo debe seguir usando esa versión instalada.

## Formularios: Fase 2

El dominio formularios expone:

- `GET /api/v1/formularios/{formId}/respuesta?articulo_id=...` devuelve la
  respuesta guardada o `null`. `articulo_id` es obligatorio porque la clave
  lógica incluye usuario, artículo y formulario.
- `PUT /api/v1/formularios/{formId}/respuestas` es el método principal para el
  FrontEnd. `POST` es un alias con el mismo comportamiento. Ambos guardan un
  objeto `{ articulo_id, client_request_id, datos }`. Los campos son
  obligatorios y los campos extra (incluido `usuario_id`) se rechazan con 422
  uniforme.

El usuario se toma exclusivamente de `get_usuario_actual`, que valida el
token opaco existente. El dominio solo transmite `usuario_id` al repositorio y
trata `articulo_id` como referencia opaca; no consulta `tm_feed`. El repositorio
ejecuta `usp_respuesta_obtener` y `usp_respuesta_guardar`, que mantienen la
unicidad `(usuario_id, articulo_id, form_id)` y hacen idempotente el guardado
por `client_request_id`. Un identificador ya usado por otro usuario, artículo
o formulario da 409 uniforme y no expone el error SQL. El JSON serializado en
UTF-8 se limita a 64 KiB; JSON inválido o exceder el límite da 422 antes de
invocar el repositorio. `formId` está limitado a 100 caracteres.

OpenAPI describe los tres endpoints del feed y formularios en
`docs/api/openapi.json`.

## Pruebas unitarias

Desde `Backend/`, ejecutar:

```powershell
..\.venv\Scripts\python.exe -m pytest tests
```

## FrontEnd: Fase 3

La ruta `/feed` carga `FeedShellComponent` y requiere un token de sesión. La
sesión reactiva expone `{ id, seudonimo }` mediante `SessionService`; el login
actualiza el servicio y conserva las claves de almacenamiento existentes. El
registro sigue sin iniciar sesión porque su contrato actual no devuelve token
ni seudónimo.

`authInterceptor` adjunta el token como `Bearer` únicamente a URLs que parten
de `environment.apiBaseUrl` y respeta encabezados `Authorization` ya presentes.
`ApiClientService` recibe rutas relativas a esa URL base. Aunque el interceptor
usa el esquema Bearer, el backend actual emite tokens opacos, no JWT.

El menú del shell obtiene las opciones de SQL Server por
`GET /api/v1/feed/menu`; los textos generales de interfaz permanecen en
`features/feed/data/feed-mock-contract.ts`, a través de `FeedContractService`.
La estructura móvil, tablet y escritorio se selecciona con `BreakpointObserver`;
el shell contempla destinos feed, ruta, panel y acción.

Desde `FrontEnd/`, validar compilación y las pruebas nuevas del core:

```powershell
npm run build
npm test -- --watch=false --include=src/app/core/session.service.spec.ts --include=src/app/core/api-client.service.spec.ts
```

## FrontEnd: Fase 4

La ruta protegida `/feed` carga el shell y el contenedor de forma diferida.
`FeedApiService` solicita tandas de 10 artículos a `/api/v1/feed`, usando
`cursor` y `siguienteCursor`; el contenedor conserva artículos, estado de carga,
cursor, fin de lista y error en signals. El centinela usa
`IntersectionObserver`, con un botón accesible como alternativa y reintento.

`ArticleHostComponent` renderiza artículos con posición y tamaño ARIA y carga
cada bloque con `@defer`. Los bloques de texto se muestran con `innerHTML` de
Angular, que aplica sanitización; imágenes usan `NgOptimizedImage`, `alt`,
dimensiones y carga diferida. El filtro se conserva en `?filtro` y provoca una
recarga del contenedor; el endpoint actual solo define `cursor` y `limite`,
por lo que aún no aplica filtros en el servidor.

Desde `FrontEnd/`, ejecutar la compilación y las pruebas focalizadas de esta
fase:

```powershell
npm run build
npm test -- --watch=false --include=src/app/shared/infinite-scroll.directive.spec.ts --include=src/app/features/feed/feed-api.service.spec.ts --include=src/app/features/feed/blocks/block-text.component.spec.ts --include=src/app/features/feed/blocks/block-image.component.spec.ts --include=src/app/core/session.service.spec.ts --include=src/app/core/api-client.service.spec.ts
```

## Menú principal configurable

`FeedShellComponent` carga las opciones del menú desde
`GET /api/v1/feed/menu`. La tabla `[TheoriaM].[tm_feed].[menu_principal]`
almacena código estable, etiqueta, icono, destino, valor, orden, estado activo
y `criterio_filtro`. El criterio se expone al frontend como metadato, pero aún
no se aplica a los artículos. El script idempotente
`Backend/scripts/003_feed_menu.sql` crea la tabla, agrega las opciones que
faltan para inicializar el menú actual y crea `usp_feed_menu_listar`; ejecutar
después de los scripts 001 y 002. El procedimiento queda disponible bajo los
permisos de ejecución ya otorgados al rol `rol_tm_feed_api`.

## FrontEnd: Fase 5

`BlockVideoComponent` reserva su relación de aspecto, usa poster y
`preload="none"`, expone controles nativos y pausa al salir del viewport. El
payload admite `subtitulos_url` y/o `transcripcion`; si no llega ninguno, el
componente muestra una advertencia accesible. Los artículos deben incluir uno
de esos recursos para que el video sea accesible.

`BlockFormComponent` resuelve definiciones y textos desde contratos mock
aislados, crea controles tipados con validación y consulta la respuesta actual
por formulario y artículo. Las respuestas existentes se muestran inicialmente
deshabilitadas y pueden editarse. Los cambios se guardan por REST con un
`client_request_id` estable al reintentar el mismo contenido; el borrador queda
en `sessionStorage`, separado por usuario, artículo y formulario. El `usuario_id`
no se envía en el cuerpo: el Backend lo obtiene de la sesión autenticada. Un
401 elimina la sesión y redirige al inicio de sesión. Los bloques ya cargados
permanecen montados al desplazarse para no perder cambios locales.

Desde `FrontEnd/`, ejecutar:

```powershell
npm run build
npm test -- --watch=false --include="src/app/features/feed/**/*.spec.ts"
```
