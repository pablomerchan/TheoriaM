# Arquitectura del Proyecto TheorIA M

## 1. Descripción General

**TheorIA M** es una aplicación web de asesoría de estilo y moda personalizada que integra análisis de datos morfológicos con recomendaciones de vestuario, paletas cromáticas y guías de compra.

La arquitectura sigue un patrón **cliente-servidor** con separación clara entre capas, permitiendo escalabilidad y mantenibilidad.

---

## 2. Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENTE (Browser)                        │
│                    Angular 21.2 Standalone                   │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API (HTTP/CORS)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND (FastAPI)                          │
│              Python + SQLite Multi-DB                        │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ API REST                                            │   │
│   │ • Asesoría (perfiles, carruseles)                  │   │
│   │ • Contenidos Personalizados                        │   │
│   │ • Ayuda Interactiva                                │   │
│   │ • Articulos (Webmaster)                            │   │
│   └─────────────────────────────────────────────────────┘   │
│                         │                                    │
│   ┌─────────────────────┴──────────────────────────────┐   │
│   │            Capa de Servicios                       │   │
│   │ • AuthService                                      │   │
│   │ • ContenidosPersonalizadosService                  │   │
│   └─────────────────────────────────────────────────────┘   │
│                         │                                    │
│   ┌─────────────────────┴──────────────────────────────┐   │
│   │        Capa de Datos (SQLite)                      │   │
│   │ • asesoria.db (perfiles, asesorías)               │   │
│   │ • carousel.db (carruseles)                         │   │
│   │ • datos_morfologicos.db (medidas físicas)         │   │
│   │ • interactive_help.db (ayuda contextual)          │   │
│   │ • maestras_menus.db (datos maestros)              │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│               WEBMASTER (Sistema adicional)                  │
│          articulo_crud.py - Gestión de Contenidos           │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Capas de la Arquitectura

### 3.1 Capa de Presentación (Frontend)

**Tecnología**: Angular 21.2.0 con Standalone Components

**Ubicación**: `FrontEnd/src/app/`

#### Estructuras principales:

- **Pages** (`pages/`):
  - `landing-page/` - Página de inicio
  - `datos-morfologicos/` - Registro y edición de datos físicos del usuario
  - `asesoria/` - Panel de asesoría personalizada
  - `spec/` - Páginas de especificación

- **Components** (`components/`):
  - `articulo/` - Visualización de artículos individuales
  - `asesoria-carousel/` - Carrusel de asesorías
  - `asesoria-rapida/` - Asesoría rápida
  - `carousel/` - Carrusel genérico
  - `guia-compras/` - Guía de compra personalizada
  - `interactive-help/` - Sistema de ayuda interactiva
  - `mi-guarda-ropas/` - Gestión del guardarropa personal
  - `registro-asesoria-theor-iam/` - Registro en el sistema de asesoría
  - `sugerencia-diaria/` - Sugerencias diarias de outfit
  - `texto-gpt/` - Componentes de texto generados con IA
  - `webmaster-articulo/` - Gestión de artículos del webmaster
  - `webmaster-dashboard/` - Panel de control del webmaster

#### Models (`models/`):
```typescript
- asesoria-carousel.model.ts
- asesoria.model.ts
- ayuda-item.model.ts
- carousel-slide.model.ts
- datos-morfologicos.model.ts
```

#### Services (`services/`):
```typescript
- asesoria-carousel.service.ts - Gestión de carruseles de asesoría
- asesoria.ts - Lógica de asesoría personalizada
- carousel.service.ts - Gestión de carruseles genéricos
- datos-morfologicos.service.ts - Gestión de datos físicos
- interactive-help.service.ts - Sistema de ayuda
- maestras.service.ts - Datos maestros
- usuario.service.ts - Gestión de usuarios
- webmaster-articulo.service.ts - Gestión de artículos
```

#### Routing:
```typescript
'' → LandingPageComponent
'datos-morfologicos' → DatosMorfologicosComponent
'asesoria' → AsesoriaComponent
'webmaster' → WebmasterDashboardComponent
'webmaster/articulos' → WebmasterArticuloComponent
'webmaster/articulos/nuevo' → WebmasterArticuloAddComponent
```

---

### 3.2 Capa API (Backend)

**Tecnología**: FastAPI (Python 3.x)

**Ubicación**: `Backend/backend.py`

**Configuración de CORS**: Acepta solicitudes desde cualquier origen (`allow_origins=["*"]`)

#### Servicios Backend:

1. **AuthService** (`services/auth_service.py`)
   - Resolución de identidad de usuario
   - Soporta múltiples estrategias:
     - Token Bearer (preparado para JWT futuro)
     - Header `X-Mock-User-Id` (desarrollo/pruebas)
     - Fallback a primer usuario en BD (modo invitado)
   - Obtención de perfil de usuario

2. **ContenidosPersonalizadosService** (`services/contenidos_personalizados_service.py`)
   - Generación de contenidos adaptados al usuario
   - Personalización basada en datos morfológicos

3. **Articulo CRUD** (`webmaster/articulo_crud.py`)
   - Gestión completa de artículos (Create, Read, Update, Delete)
   - Operaciones: `create_articulo()`, `get_articulos()`, `get_articulo_by_id()`, `update_articulo()`, `delete_articulo()`, `get_menu_articulo()`

---

### 3.3 Capa de Datos (Persistencia)

**Tecnología**: SQLite (Multi-base de datos)

**Ubicación**: `Backend/`

#### Bases de Datos:

1. **asesoria.db**
   - Tabla `tbl_persona`: Perfiles de usuarios
   - Datos personales, de asesoría y preferencias
   - Relación: usuario ↔ asesorías

2. **carousel.db**
   - Tabla `tbl_carrusel`: Carruseles de promoción/contenido
   - Campos: id, tag, title, text, imageUrl, imageAltText, buttonLabel, buttonUrl, isExternal
   - Uso: Landing page, carruseles temáticos (TECNOLOGÍA, UX/UI, INFRAESTRUCTURA)

3. **datos_morfologicos.db**
   - Tabla `datos_morfologicos`: Medidas físicas del usuario
   - Campos: usuario_id, sexo, edad, color_piel, color_ojos, color_cabello, peso_kg, estatura_cm, hombros, cintura, cadera, busto, clima, ubicación
   - Propósito: Base para análisis de estilo y recomendaciones

4. **interactive_help.db**
   - Tabla `datos_personales`: Ayuda contextual interactiva
   - Guías sobre medición, interpretación de datos
   - Campos: id, campo, titulo, texto, imageUrl, videoUrl, orden

5. **maestras_menus.db**
   - Tablas maestras: Categorías, tipos de prenda, colores, tallas, estilos
   - Función: Datos de referencia para la aplicación

---

## 4. Patrones de Comunicación

### 4.1 Flujo Cliente-Servidor

1. **Request HTTP**:
   - Angular envía solicitud REST a FastAPI
   - Headers incluyen: `Content-Type: application/json`, opcionalmente `X-Mock-User-Id` o `Authorization`
   - CORS habilitado para desarrollo (permite `*`)

2. **Response**:
   - Backend retorna JSON
   - Formato estándar con datos o lista de recursos
   - Códigos HTTP: 200 (OK), 404 (Not Found), 500 (Error)

### 4.2 Autenticación (Actual)

- **Modo Desarrollo**: Header `X-Mock-User-Id` para simular usuarios
- **Fallback**: Primer usuario en BD o ID "1" por defecto
- **Futuro**: JWT con Bearer token

---

## 5. Flujos de Datos Principales

### 5.1 Registro de Usuario

```
Usuario (Landing Page)
    ↓
    ├→ [Datos Morfológicos Page]
    │   ├→ usuario.service.ts
    │   └→ GET /api/persona/mi-perfil
    │       ↓ Backend: AuthService.get_current_profile()
    │       └→ BD: asesoria.db (tbl_persona)
    │
    ├→ [Guardar Medidas]
    │   ├→ datos-morfologicos.service.ts
    │   └→ POST /api/datos-morfologicos
    │       └→ BD: datos_morfologicos.db
```

### 5.2 Generación de Asesoría Personalizada

```
Usuario solicita asesoría
    ↓
    [Asesoria Component]
    ├→ asesoria.service.ts
    └→ GET /api/asesoria/menus?id_usuario={usuarioId}
        ↓
        Backend: ContenidosPersonalizadosService
        ├→ Leer datos_morfologicos.db
        ├→ Aplicar lógica de personalización
        └→ Retornar contenido adaptado
            ↓
        [Componentes mostrar asesoría, carruseles, sugerencias]
```

### 5.3 Gestión de Artículos (Webmaster)

```
Webmaster accede panel
    ↓
    [WebmasterDashboardComponent]
    ├→ webmaster-articulo.service.ts
    └→ GET /api/webmaster/articulos
        ↓
        Backend: articulo_crud.get_articulos()
        └→ BD: articulos table
        
Nuevo artículo:
    [WebmasterArticuloAddComponent]
    ├→ POST /api/webmaster/articulo
    └→ Backend: articulo_crud.create_articulo()
        └→ BD: Insertar nuevo artículo
```

---

## 6. Tecnologías y Stack

### Frontend
- **Framework**: Angular 21.2.0
- **Componentes**: Standalone (sin módulos)
- **Enrutamiento**: Angular Router
- **Reactividad**: RxJS 7.8.0
- **Lenguaje**: TypeScript 5.9.2
- **Estilos**: SCSS
- **Testing**: Vitest 4.0.8
- **Herramientas**: Angular CLI 21.2.10, Prettier

### Backend
- **Framework**: FastAPI (Python)
- **Servidor**: Uvicorn
- **Validación**: Pydantic
- **BD**: SQLite 3
- **Autenticación**: AuthService (preparado para JWT)
- **CORS**: Habilitado para desarrollo

### Herramientas de Desarrollo
- **Scripts de migración**: Python scripts para evolucionar esquema
- **Seeding**: Scripts para popular BD con datos iniciales
- **Auditoría**: Scripts para verificar integridad de datos

---

## 7. Estructura de Carpetas

```
src/
├── Backend/
│   ├── backend.py                      (Aplicación principal FastAPI)
│   ├── services/                       (Lógica de negocio)
│   │   ├── auth_service.py
│   │   └── contenidos_personalizados_service.py
│   ├── [*.db]                          (Bases de datos SQLite)
│   ├── [migration_*.py]                (Scripts de migración)
│   └── [seed_*.py]                     (Scripts de seeding)
│
├── FrontEnd/
│   ├── package.json
│   ├── tsconfig.json
│   ├── angular.json
│   └── src/
│       ├── main.ts
│       ├── index.html
│       └── app/
│           ├── app.ts                  (Componente raíz)
│           ├── app.routes.ts           (Definición de rutas)
│           ├── pages/                  (Páginas principales)
│           ├── components/             (Componentes reutilizables)
│           ├── services/               (Servicios HTTP)
│           ├── models/                 (Interfaces TypeScript)
│           └── styles.scss             (Estilos globales)
│
├── webmaster/
│   ├── __init__.py
│   └── articulo_crud.py                (Gestión de artículos)
│
└── docs/
    └── contexto/
        ├── arquitectura.md             (Este documento)
        ├── convenciones.md
        ├── decisiones.md
        ├── errores-conocidos.md
        ├── flujo-de-trabajo.md
        └── glosario.md
```

---

## 8. Consideraciones de Diseño

### 8.1 Ventajas Actuales

- **Separación de Concerns**: Frontend y Backend claramente separados
- **Modularidad**: Componentes y servicios independientes
- **Escalabilidad de BD**: Múltiples bases de datos permiten aislamiento lógico
- **CORS Flexible**: Facilita desarrollo y pruebas cross-domain
- **TypeScript**: Type safety en el frontend

### 8.2 Oportunidades de Mejora

- **Autenticación**: Implementar JWT/OAuth2 para seguridad en producción
- **Consolidación de BD**: Considerar una sola BD con esquema normalizado
- **Versionado de API**: Agregar versiones a endpoints (`/api/v1/`)
- **Documentación API**: Integrar Swagger/OpenAPI
- **Testing Automatizado**: Aumentar cobertura (backend y frontend)
- **Logs Centralizados**: Sistema de logging unificado
- **CI/CD**: Pipeline de despliegue automatizado
- **Cache**: Implementar estrategia de caché (Redis)

---

## 9. Flujos de Despliegue

### Ambiente de Desarrollo

1. **Backend**: `python backend.py` (Uvicorn por defecto)
2. **Frontend**: `npm start` → ng serve (localhost:4200)
3. **BD**: SQLite local (archivos en `Backend/`)

### Ambiente de Producción

- Backend en servidor ASGI (gunicorn + uvicorn)
- Frontend compilado: `npm build` → compilación de Angular
- BD migrada a PostgreSQL recomendado
- CORS restrictivo (solo dominios autorizados)
- HTTPS/TLS obligatorio
- JWT para autenticación

---

## 10. Matriz de Dependencias

| Componente | Depende De | Razón |
|---|---|---|
| Frontend | Backend API | Obtención de datos, asesorías |
| Backend | SQLite | Persistencia de datos |
| WebmasterArticuloComponent | webmaster-articulo.service | Gestión de artículos |
| AsesoriaComponent | asesoria.service | Datos de asesoría personalizada |
| DatosMorfologicosComponent | usuario.service | Perfil del usuario |
| AuthService | asesoria.db | Resolver identidad del usuario |

---

## 11. Extensiones Futuras

1. **Integración con IA**: GPT/LLM para asesorías más inteligentes
2. **Sistema de Recomendación**: ML para sugerencias personalizadas
3. **Carrito de Compras**: Integración con e-commerce
4. **Notificaciones**: Sistema de alertas y sugerencias
5. **Analytics**: Seguimiento de comportamiento de usuarios
6. **Multi-idioma**: Internacionalización (i18n)
7. **API Móvil**: App nativa iOS/Android
8. **Social Features**: Compartir outfits, comunidad

---

## 12. Glosario de Términos

| Término | Definición |
|---|---|
| **Datos Morfológicos** | Medidas y características físicas del usuario (peso, estatura, color piel, etc.) |
| **Asesoría** | Recomendaciones personalizadas de estilo, vestuario y paleta cromática |
| **Carrusel** | Componente visual que muestra contenido en rotación |
| **Guardarropa** | Colección virtual de prendas del usuario |
| **Webmaster** | Panel de administración para gestionar contenidos y artículos |

---

**Documento generado**: 22 de Junio de 2026  
**Versión**: 1.0  
**Responsable**: Arquitecto de Software
