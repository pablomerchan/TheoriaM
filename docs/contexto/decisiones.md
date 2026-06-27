# Decisiones Arquitectónicas - TheorIA M

Este documento registra las decisiones arquitectónicas principales del proyecto **TheorIA M** con su justificación y estado. Sirve para evitar reabrir debates ya cerrados y mantener consistencia en decisiones futuras.

---

## Leyenda

| Símbolo | Significado |
|---------|-------------|
| ✅ | Decisión implementada y vigente |
| ⏸️ | Decisión en evaluación o pendiente |
| ❌ | Decisión rechazada/descartada |
| 🔄 | Decisión pendiente de revisión o actualización |

---

## 1. Frontend Framework

### Decisión: Angular 21.2 con Componentes Standalone
**Estado**: ✅ Implementado y vigente

**Opción Elegida**: Angular 21.2 LTS con componentes standalone (sin NgModules)

**Alternativas Consideradas**:
1. React + TypeScript - Más flexible, comunidad más grande
2. Vue 3 - Curva de aprendizaje menor, menos empresarial
3. Svelte - Menor tamaño de bundle, menos maduro
4. Angular 14+ con Modules - Anterior estándar de Angular

**Justificación**:
- **LTS (Long Term Support)**: Angular 21.2 es versión de soporte extendido, garantiza mantenimiento hasta 2026
- **Componentes Standalone**: Reduce boilerplate, elimina necesidad de NgModules, más moderno
- **Type Safety**: TypeScript nativo, refactorización segura
- **Enterprise Ready**: Ideal para aplicaciones B2B como TheorIA M
- **Enrutamiento Avanzado**: Router de Angular es robusto para SPA compleja
- **Inyección de Dependencias**: Más limpia y poderosa que React Context

**Implicaciones**:
- Todos los componentes DEBEN usar `standalone: true`
- NO crear AppModule o feature modules
- Usar `inject()` en lugar de constructor injection en servicios
- `imports` explícitos en cada componente

**Revisión Próxima**: Junio 2026 (cuando Angular 22 sea estable)

---

## 2. Backend Framework

### Decisión: FastAPI (Python) sobre Django/Express
**Estado**: ✅ Implementado y vigente

**Opción Elegida**: FastAPI con Uvicorn

**Alternativas Consideradas**:
1. Django REST Framework - Más pesado, más características
2. Express.js (Node.js) - Más ligero, pero requiere equipo JS
3. Flask - Demasiado minimal para APIs complejas
4. Go (Gin) - Mejor performance, pero requiere curva de aprendizaje

**Justificación**:
- **Type Hints Nativos**: Python 3.10+ permite type safety similar a TypeScript
- **Pydantic**: Validación automática de entrada, serialización JSON limpia
- **Documentación Auto-generada**: Swagger/OpenAPI out-of-the-box
- **Performance**: Comparable a Express/Go para este volumen de tráfico
- **Desarrollo Rápido**: Menos boilerplate que Django
- **Legibilidad**: Código Python legible para equipo multidisciplinar

**Implicaciones**:
- Python 3.10+ requerido
- ASGI server necesario (Uvicorn, Hypercorn)
- Dependencia en ecosystem Python (pip, poetry)
- Menos hosting compartido disponible (serverless más limitado)

**Nota Importante**: Django fue considerado pero descartado por sobrecarga innecesaria.

---

## 3. Lenguaje Backend

### Decisión: Python (No JavaScript/TypeScript)
**Estado**: ✅ Implementado y vigente

**Justificación**:
- **Separación de Concerns**: Frontend (TS) y Backend (Python) independientes
- **Evitar Full Stack JS Fatigue**: Diferentes paradigmas facilitan mantenibilidad
- **Talento Disponible**: Data science + ML en Python más adelante (análisis de moda, IA)
- **Ecosystem Robusto**: NumPy, Pandas, Scikit-learn para análisis futuro

**Implicaciones**:
- Equipo debe dominar al menos 2 lenguajes
- Deploy requiere runtime Python
- No compartir código cliente-servidor

---

## 4. Persistencia de Datos

### Decisión: SQLite Multi-BD (No Single Database)
**Estado**: ✅ Implementado | ⏸️ Revisión pendiente

**Opción Elegida**: 5 bases de datos SQLite separadas:
- `asesoria.db` - Perfiles usuarios, asesorías
- `carousel.db` - Carruseles, promociones
- `datos_morfologicos.db` - Medidas físicas
- `interactive_help.db` - Ayuda contextual
- `maestras_menus.db` - Datos de referencia

**Alternativas Consideradas**:
1. Base de datos única normalizada (PostgreSQL)
2. MongoDB/CosmosDB (NoSQL)
3. Base de datos de grafos
4. En memoria (Redis)

**Justificación Original**:
- **Aislamiento Lógico**: Cada dominio independiente
- **Migración Facilitada**: Escalar cada dominio por separado
- **Desarrollo Paralelo**: Múltiples equipos sin conflictos
- **Backup Granular**: BD pequeñas = backups más rápidos

**Problemas Identificados**:
- ❌ Joins complejos entre dominios imposibles
- ❌ Integridad referencial débil
- ❌ Queries análiticas difíciles
- ❌ Débil soporte ACID entre BD

**Recomendación Futura**:
Migrar a PostgreSQL única cuando:
- Proyecto escale a 100k+ usuarios
- Necesarias queries complejas
- Análisis de datos transversales

**Estado Actual**: Funcional para desarrollo, pero requiere revisión pre-producción.

---

## 5. ORM vs SQL Directo

### Decisión: SQL Directo con sqlite3 (No ORM)
**Estado**: ✅ Implementado

**Opción Elegida**: SQL raw con sqlite3, Pydantic para modelos

**Alternativas Consideradas**:
1. SQLAlchemy ORM - Abstracción poderosa
2. Tortoise ORM - Async-first
3. PeeWee - Ligero pero básico

**Justificación**:
- **Control Total**: SQL exacto, optimización directa
- **Debugging Facilitado**: Ver queries exactas en logs
- **Performance**: Menos overhead que ORM
- **Complejidad**: Equipo pequeño, no necesita abstracción

**Implicaciones**:
- Inyección SQL es responsabilidad del desarrollador (usar parameterización siempre)
- Migraciones manuales (Python scripts)
- Portabilidad limitada (SQL específico de SQLite)

**Revisión**: Si escalamos a PostgreSQL, evaluar SQLAlchemy

---

## 6. Validación de Entrada

### Decisión: Pydantic (Backend) + Reactive Forms (Frontend)
**Estado**: ✅ Implementado

**Validación Backend**:
```python
from pydantic import BaseModel, Field, validator

class DatosMorfologicosInput(BaseModel):
    usuario_id: str
    edad: int = Field(..., ge=13, le=120)  # Age entre 13 y 120
    peso_kg: float = Field(..., gt=0)
```

**Validación Frontend**:
```typescript
form = this.fb.group({
  edad: ['', [Validators.required, Validators.min(13), Validators.max(120)]]
});
```

**Justificación**:
- **Defense in Depth**: Validación en ambas capas
- **UX**: Frontend feedback inmediato
- **Seguridad**: Backend nunca confía en cliente

---

## 7. Autenticación y Autorización

### Decisión: Mock para Desarrollo, JWT para Futuro
**Estado**: ✅ Actualmente mock | ⏸️ Migración pendiente a JWT

**Solución Actual**:
```python
# Estrategia de desarrollo: Header X-Mock-User-Id
mock_user = request.headers.get("X-Mock-User-Id")
if mock_user:
    return mock_user
```

**Limitaciones Actuales**:
- ❌ NO seguro para producción
- ❌ Cualquiera puede suplantar usuario
- ❌ Sin tokens, sin sesiones
- ❌ Sin logout

**Plan de Migración a JWT**:
```
1. Agregar endpoint POST /auth/login
2. Generar JWT en backend
3. Frontend almacena en localStorage
4. Header Authorization: Bearer {token}
5. Backend valida JWT en AuthService
```

**Alternativas Descartadas**:
- ❌ OAuth2/Google Sign-in (Over-engineering para MVP)
- ❌ Session Cookies (Incompatible con SPA pura)
- ❌ API Keys (No apropiado para usuarios finales)

**Timeline**: Pre-producción (T-2 meses antes de deploy)

---

## 8. CORS Policy

### Decisión: CORS Abierto (`allow_origins=["*"]`) en Desarrollo
**Estado**: ✅ Desarrollo | ❌ NO permitido en producción

**Configuración Actual**:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ⚠️ Solo desarrollo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Justificación Desarrollo**:
- **Frontend Independiente**: Angular en puerto 4200, API en puerto 8000
- **Testing Cruzado**: Facilita pruebas locales
- **Prototipado Rápido**: No hay fricción en CORS

**Plan Producción**:
```python
# ANTES DE PRODUCCIÓN:
allow_origins=[
    "https://theoriamfashion.com",
    "https://www.theoriamfashion.com"
]
```

---

## 9. Estructura de Componentes

### Decisión: Componentes Reutilizables en `components/`, Páginas en `pages/`
**Estado**: ✅ Implementado y vigente

**Organización**:
```
app/
├── pages/              # Rutas completas (linked to app.routes.ts)
│   ├── landing-page/
│   ├── datos-morfologicos/
│   └── asesoria/
├── components/         # Componentes reutilizables
│   ├── carousel/
│   ├── articulo/
│   └── guia-compras/
└── services/          # API communication
```

**Justificación**:
- **Separación Clara**: Pages = rutas, Components = UI reutilizable
- **Escalabilidad**: Fácil agregar nuevas páginas sin duplicar
- **Testing**: Componentes sin estado son fáciles de testear

**Alternativa Descartada**: ❌ Feature modules (no aplica con standalone)

---

## 10. Gestión de Estado

### Decisión: Servicios + RxJS Observables (No NgRx/Redux)
**Estado**: ✅ Implementado

**Patrón Actual**:
```typescript
// En servicio
private carruseles$ = this.http.get(url).pipe(
  shareReplay(1)
);

// En componente
carruseles$ = this.service.getCarruseles(usuarioId);

// En template
<div *ngIf="carruseles$ | async as items">
  <app-carousel [slides]="items"></app-carousel>
</div>
```

**Justificación**:
- **Simplicidad**: No necesitamos Redux para MVP
- **RxJS Nativo**: Angular incluye reactive programming
- **Memoria**: shareReplay evita múltiples subscripciones

**Alternativas Consideradas**:
1. NgRx - Over-engineering para aplicación actual
2. Akita - Más ligero que NgRx pero aún boilerplate
3. Vue Pinia - No aplica (Angular)

**Revisión**: Si complejidad > 50+ acciones de estado, migrar a NgRx

---

## 11. Estilización

### Decisión: SCSS (No CSS-in-JS, No Tailwind)
**Estado**: ✅ Implementado

**Configuración Angular**:
```json
{
  "@schematics/angular:component": {
    "style": "scss"
  }
}
```

**Justificación**:
- **Nesting**: SCSS permite jerarquía visual
- **Variables**: Colores, tipografía centralizadas
- **Mixins**: Reutilización de estilos complejos
- **Compilación**: Angular CLI ya incluye soporte

**Alternativas Descartadas**:
- ❌ CSS-in-JS (styled-components): Overkill, performance hit en runtime
- ❌ Tailwind: Demasiadas clases en HTML, difícil de mantener diseño consistente
- ❌ CSS Vanilla: Falta nesting y variables

**Archivo Global**: `src/styles.scss`
**Estilos Componente**: `{name}.component.scss`

---

## 12. Pruebas Unitarias

### Decisión: Vitest (Reemplazo de Jasmine/Karma)
**Estado**: ✅ Configurado | ⏸️ Tests pendientes de implementar

**Opción Elegida**: Vitest con jsdom

**Justificación**:
- **Más Rápido**: Vitest es 10-100x más rápido que Karma
- **Compatible**: Misma sintaxis que Jest (describe, it, expect)
- **Vite Integrado**: Angular 21 usa Vite, integración nativa
- **Configuración Mínima**: Funciona con valores por defecto

**Alternativas Descartadas**:
- ❌ Jest: Funciona pero Vitest es más ligero
- ❌ Cypress: Es e2e, no unitarias

**Plan Implementación**:
1. Tests para servicios críticos (Auth, API)
2. Tests para componentes puros (Carousel, Articulo)
3. Meta: 60%+ coverage en pre-producción

---

## 13. Enrutamiento

### Decisión: Angular Router Declarativo
**Estado**: ✅ Implementado

**Patrón Actual**:
```typescript
export const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'datos-morfologicos', component: DatosMorfologicosComponent },
  { path: 'asesoria', component: AsesoriaComponent },
  { path: '**', redirectTo: '' }  // Fallback
];

bootstrapApplication(App, {
  providers: [provideRouter(routes)]
});
```

**Justificación**:
- **Declarativo**: Rutas definidas en array, no en módulo
- **Lazy Loading Listo**: Fácil agregar loadChildren para componentes grandes
- **Guards Reutilizables**: CanActivate, CanDeactivate para proteger rutas

**No Implementado Aún** ⏸️:
- Guards de autenticación (pendiente JWT)
- Preload strategy (no crítico en MVP)
- Lazy loading (aún no necesario)

---

## 14. Tipos de Datos

### Decisión: User ID como String (No Number)
**Estado**: ✅ Implementado

**Patrón**:
```typescript
interface Persona {
  id: string;  // "1", "abc-123-def", UUID
  nombre: string;
}

function getUser(id: string) { }
```

**Justificación**:
- **Flexibilidad**: Soporta IDs numéricos, UUID, email
- **Compatibilidad**: Soporta cualquier esquema futuro
- **API**: En el código actual, el endpoint público de perfil es `/api/persona/mi-perfil`; no existe `/api/usuarios/{id}`.

**Alternativa Rechazada**: ❌ Number (limita a solo IDs numéricos)

---

## 15. Logging

### Decisión: console.log (Temporal), Logger Service Futuro
**Estado**: ⏸️ Temporal en desarrollo

**Situación Actual**:
```typescript
console.error('Error al obtener artículos:', error);
```

**Plan Futuro Pre-Producción**:
```typescript
// Logger service inyectable
@Injectable({ providedIn: 'root' })
export class LoggerService {
  log(message: string, data?: any) { }
  error(message: string, error?: any) { }
  warn(message: string, data?: any) { }
}
```

**Requisitos Futuro**:
- Enviar logs a backend
- Agregación centralizada (ELK, Datadog)
- Niveles: DEBUG, INFO, WARN, ERROR

---

## 16. Versionado de API

### Decisión: Sin Versioning en v0.1, Agregar en v1.0
**Estado**: ⏸️ Pendiente de implementación

**URLs Actuales**:
```
GET /api/carousel
POST /api/datos-morfologicos
```

**Plan v1.0**:
```
GET /api/v1/carousel
POST /api/v1/datos-morfologicos
```

**Justificación**:
- En MVP, cambios sin breaking changes aceptables
- Versioning agrega complejidad en desarrollo temprano
- Pre-producción: Evaluar breaking changes posibles

---

## 17. Migraciones de BD

### Decisión: Scripts Python Manuales (No Migrations Framework)
**Estado**: ✅ Implementado

**Archivos Migraciones**:
```
Backend/
├── migrate_asesoria_schema.py
├── migrate_add_columns_tbl_carrusel.py
└── seed_guia_compras.py
```

**Justificación**:
- **Simplicidad**: Con SQLite, migraciones simples
- **Control Total**: SQL exacto visible en script
- **Bajo Overhead**: No necesitamos Alembic (Django migrations)

**Problema Identificado**: ⚠️
- Difícil rastrear qué migraciones se aplicaron
- Sin rollback automático

**Mejora Futura**: Tabla de control de migraciones
```sql
CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 18. Documentación de API

### Decisión: Swagger Auto-generado (Preparado)
**Estado**: ⏸️ Configuración pendiente

**Plan**:
```python
# En backend.py
from fastapi.openapi.utils import get_openapi

app = FastAPI(
    title="TheorIA M API",
    description="API de asesoría personalizada de moda",
    version="0.1.0"
)

# Swagger en /docs
# ReDoc en /redoc
```

**Beneficios**:
- Documentación auto-actualizada
- Testing interactivo desde navegador
- SDK generado automáticamente

---

## 19. Packaging y Distribución

### Decisión: Docker para Backend, Static Build para Frontend
**Estado**: ⏸️ Pendiente configuración

**Plan Backend**:
```dockerfile
FROM python:3.11-slim
COPY requirements.txt .
RUN pip install -r requirements.txt
CMD ["uvicorn", "backend:app", "--host", "0.0.0.0"]
```

**Plan Frontend**:
```bash
npm run build  # Genera dist/ con archivos estáticos
# Servir desde Nginx o similar
```

---

## 20. Errores Conocidos (Decision-Related)

### Multi-BD Complexity
**Decisión**: SQLite multi-BD
**Problema**: Joins entre BD imposibles
**Workaround**: Querying manual en Python, consolidar en memoria
**Prioridad**: Alta (revisar pre-producción)

### CORS Abierto Seguridad
**Decisión**: allow_origins=["*"]
**Problema**: Vulnerable en producción
**Workaround**: Cambiar antes de deploy
**Prioridad**: CRÍTICA

### Mock Auth Inseguro
**Decisión**: X-Mock-User-Id header
**Problema**: Suplantación trivial
**Workaround**: Migrar a JWT antes de producción
**Prioridad**: CRÍTICA

---

## 21. Matriz de Riesgo por Decisión

| Decisión | Riesgo | Severidad | Acción |
|----------|--------|-----------|--------|
| Angular 21 | Upgrade a 22+ posible | Media | Revisar roadmap anual |
| SQLite Multi-BD | Queries complejas imposibles | Alta | Migrar a PostgreSQL si escala |
| Mock Auth | Seguridad | CRÍTICA | JWT pre-producción |
| CORS Abierto | Seguridad | CRÍTICA | Restringir pre-producción |
| Sin ORM | SQL injection | Media | Code review + tests |
| No NgRx | Escalabilidad estado | Baja | Migrar si complejidad >> |

---

## 22. Próxima Revisión de Decisiones

**Fecha Sugerida**: Julio 2026 (1 mes)

**Items a Revisar**:
- [ ] Estado de migración a JWT
- [ ] Evaluación SQLite vs PostgreSQL
- [ ] Cobertura de tests
- [ ] Reporte de deuda técnica
- [ ] Feedback equipo sobre Angular standalone

**Responsable**: Arquitecto de Software

---

## 23. Cómo Usar Este Documento

1. **Antes de hacer cambio arquitectónico**: Buscar en este documento
2. **Si decisión ya existe**: Justificación y contexto están aquí → no reabrir debate
3. **Si quieres cambiar decisión**:
   - Documentar nuevo contexto
   - Listar problemas de decisión actual
   - Proponer alternativas y trade-offs
   - Solicitar revisión con equipo
   - Actualizar este documento

4. **Para onboarding de nuevos miembros**: Este documento explica el "por qué"

---

**Documento Vigente**: Versión 1.0  
**Última Actualización**: 22 de Junio de 2026  
**Próxima Revisión**: Julio 2026  
**Responsable**: Arquitecto de Software
