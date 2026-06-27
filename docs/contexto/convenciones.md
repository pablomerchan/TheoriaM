# Convenciones del Proyecto TheorIA M

Este documento establece las convenciones, estándares y reglas de nomenclatura que deben seguirse en todo el proyecto para mantener consistencia, legibilidad y mantenibilidad del código.

---

## 1. Estructura de Carpetas

### 1.1 Organización General

```
src/
├── Backend/                    # API FastAPI + Servicios Python
│   ├── backend.py             # Punto de entrada principal
│   ├── services/              # Lógica de negocio
│   │   ├── auth_service.py
│   │   └── contenidos_personalizados_service.py
│   ├── [*.db]                 # Bases de datos SQLite
│   └── [scripts_*.py]         # Scripts de migración y seeding
│
├── FrontEnd/                   # Aplicación Angular
│   ├── package.json
│   ├── angular.json
│   ├── tsconfig.json
│   └── src/
│       └── app/
│           ├── pages/         # Páginas principales (rutas)
│           ├── components/    # Componentes reutilizables
│           ├── services/      # Servicios HTTP y lógica
│           ├── models/        # Interfaces y tipos
│           └── app.ts         # Componente raíz
│
├── webmaster/                  # Sistema de administración
│   └── articulo_crud.py       # CRUD de artículos
│
└── docs/
    └── contexto/              # Documentación del proyecto
        ├── arquitectura.md
        ├── convenciones.md    # Este archivo
        ├── decisiones.md
        ├── errores-conocidos.md
        ├── flujo-de-trabajo.md
        └── glosario.md
```

### 1.2 Reglas de Nomenclatura de Carpetas

- **Usar kebab-case** para nombres de carpetas en Angular: `mi-guardarropa`, `asesoria-carousel`
- **Usar snake_case** para carpetas en Python
- **Usar PascalCase** solo para componentes/clases: `services/`, `models/`, `pages/`

---

## 2. Convenciones de TypeScript/Angular

### 2.1 Estructura de Archivos

| Tipo | Patrón | Ejemplo |
|---|---|---|
| Componente | `{name}.component.ts` | `carousel.component.ts` |
| Plantilla | `{name}.component.html` | `carousel.component.html` |
| Estilos | `{name}.component.scss` | `carousel.component.scss` |
| Spec (test) | `{name}.component.spec.ts` | `carousel.component.spec.ts` |
| Servicio | `{name}.service.ts` | `carousel.service.ts` |
| Modelo/Interfaz | `{name}.model.ts` | `carousel-slide.model.ts` |

### 2.2 Nombres de Componentes

```typescript
// ✅ CORRECTO
@Component({
  selector: 'app-carousel',           // Siempre prefijo 'app-', kebab-case
  standalone: true,                   // Componentes standalone (Angular 14+)
  imports: [CommonModule],            // Importar módulos necesarios
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.scss']
})
export class CarouselComponent implements OnInit, OnDestroy {
  // ...
}

// ❌ INCORRECTO
@Component({
  selector: 'carousel',               // Falta prefijo 'app-'
  template: '...',                    // No usar template inline
  styleUrl: 'carousel.scss'           // Usar styleUrls (plural)
})
export class Carousel {
  // ...
}
```

### 2.3 Nombres de Clases y Exports

```typescript
// Componentes: {Name}Component (PascalCase)
export class CarouselComponent { }
export class AsesoriaComponent { }
export class DatosMorfologicosComponent { }

// Servicios: {Name}Service (PascalCase)
export class CarouselService { }
export class AsesoriaService { }

// Interfaces/Tipos: {Name} o I{Name} (PascalCase)
export interface CarouselSlide { }
export interface AsesoriaArticulo { }

// Enums: {Name} (PascalCase)
export enum ColorTipo {
  CALIDO = 'calido',
  FRIO = 'frio'
}

// Pipes: {name}.pipe.ts con clase {Name}Pipe
export class TruncatePipe { }
```

### 2.4 Propiedades y Métodos

```typescript
export class CarouselComponent {
  // ✅ Propiedades: camelCase
  @Input() slides: CarouselSlide[] = [];
  @Input() autoPlayInterval: number = 5000;
  @Output() slideChanged = new EventEmitter<number>();
  
  currentIndex = 0;
  private intervalId: any;
  
  // ✅ Métodos: camelCase, verbos como prefijo
  ngOnInit() { }
  nextSlide() { }
  prevSlide() { }
  goToSlide(index: number) { }
  private startAutoPlay() { }
  private stopAutoPlay() { }
  
  // ❌ INCORRECTO
  CurrentIndex = 0;
  Next_Slide() { }
  @Input() AutoPlayInterval: number;
}
```

### 2.5 Inyección de Dependencias

```typescript
// ✅ CORRECTO: Usar inject() (Angular 14+)
@Injectable({
  providedIn: 'root'
})
export class CarouselService {
  private http = inject(HttpClient);
  private router = inject(Router);
  
  constructor() {
    // Cuerpo vacío o mínimo
  }
}

// ⚠️ TAMBIÉN VÁLIDO: Constructor inyección (antiguo)
@Injectable({
  providedIn: 'root'
})
export class CarouselService {
  constructor(private http: HttpClient) { }
}
```

### 2.6 Modelos y Tipos

```typescript
// ✅ Usar export interface para contratos de datos
export interface CarouselSlide {
  id: number | string;
  title: string;
  text: string;
  imageUrl: string;
  imageAltText?: string;      // Propiedades opcionales con ?
  button?: ActionButton;
  visible?: boolean | number;
}

// ✅ Utilizar tipos exportados en servicios
getCarruseles(usuarioId: number): Observable<CarouselSlide[]> {
  return this.http.get<CarouselSlide[]>(`${this.apiUrl}/carruseles`);
}

// ❌ EVITAR: Tipado genérico sin interfaz
getCarruseles(usuarioId: number): Observable<any> { }
```

### 2.7 Observables y RxJS

```typescript
// ✅ Usar Observable con tipos genéricos
getMenus(usuarioId?: number): Observable<MenuServicioItem[]> {
  let params = new HttpParams();
  if (usuarioId !== undefined) {
    params = params.set('id_usuario', usuarioId.toString());
  }
  return this.http.get<MenuServicioItem[]>(`${this.apiUrl}/menus`, { params });
}

// ✅ Usar async pipe o subscripción explícita
// En template
<div *ngIf="carruseles$ | async as carruseles">
  <div *ngFor="let slide of carruseles">...</div>
</div>

// En componente
carruseles$ = this.asesoriaService.getCarruseles(this.usuarioId);
```

### 2.8 URLs de API

```typescript
// ✅ Definir constante base
private apiUrl = 'http://localhost:3000/api';

// ✅ Usar rutas consistentes
GET    /api/carousel
GET    /api/ayuda/datos-personales
GET    /api/ayuda/datos-personales/{campo}
POST   /api/datos-morfologicos
GET    /api/datos-morfologicos/{usuario_id}
GET    /api/asesoria/menus
GET    /api/asesoria/menus/{menu_id}/articulos
GET    /api/asesoria/carruseles
GET    /api/asesoria/articulo
GET    /api/asesoria/rapida
GET    /api/persona/mi-perfil
GET    /api/webmaster/articulos
GET    /api/webmaster/articulo/{articulo_id}
POST   /api/webmaster/articulo
PUT    /api/webmaster/articulo/{articulo_id}
DELETE /api/webmaster/articulo/{articulo_id}
```

### 2.9 Variables Privadas

```typescript
export class CarouselComponent {
  // ✅ Usar private para encapsulación
  private intervalId: any;
  private isBrowser: boolean;
  
  // ✅ O prefijo _ para evitar acceso externo
  private _slideIndex = 0;
}
```

---

## 3. Convenciones de Python

### 3.1 Estructura de Archivos

| Tipo | Patrón | Ejemplo |
|---|---|---|
| Módulo principal | `{name}.py` | `backend.py`, `auth_service.py` |
| Paquete | `{name}/__init__.py` | `services/__init__.py` |
| Script de migración | `migrate_{feature}.py` | `migrate_asesoria_schema.py` |
| Script de seeding | `seed_{entity}.py` | `seed_guia_compras.py` |

### 3.2 Nombres de Clases

```python
# ✅ PascalCase (PEP 8)
class AuthService:
    pass

class Articulo:
    pass

class DatosMorfologicos:
    pass

# ❌ INCORRECTO
class auth_service:
    pass

class articulo:
    pass
```

### 3.3 Nombres de Funciones y Variables

```python
# ✅ snake_case (PEP 8)
def get_current_user_id(request: Request) -> str:
    mock_user = request.headers.get("X-Mock-User-Id")
    auth_service = AuthService()
    return auth_service.get_user_id()

# ✅ Funciones privadas con prefijo _
def _normalize_tags(tags: Optional[str]) -> str:
    pass

def _get_fallback_user_id() -> str:
    pass

# ❌ INCORRECTO
def GetCurrentUserId(request):
    pass

def get-current-user-id():
    pass
```

### 3.4 Métodos Estáticos

```python
# ✅ Usar @staticmethod para métodos sin estado
class AuthService:
    @staticmethod
    def get_current_user_id(request: Request) -> str:
        """Resuelve la identidad del usuario desde el request."""
        pass
    
    @staticmethod
    def _get_fallback_user_id() -> str:
        """Fallback privado para desarrollo."""
        pass

# ✅ O usar class methods para métodos que necesitan contexto
class AuthService:
    @classmethod
    def from_header(cls, header: str) -> 'AuthService':
        pass
```

### 3.5 Type Hints

```python
# ✅ Usar type hints para claridad
from typing import Optional, List, Dict, Any

def create_articulo(
    titulo: str,
    contenido: str,
    tags: Optional[List[str]] = None,
    visible: bool = True
) -> Dict[str, Any]:
    pass

def get_articulos(
    usuario_id: str,
    limit: int = 10
) -> List[Dict[str, Any]]:
    pass

# ❌ EVITAR: Sin type hints
def create_articulo(titulo, contenido):
    pass
```

### 3.6 Docstrings

```python
# ✅ Docstrings en triple comilla para funciones públicas
def get_current_user_id(request: Request) -> str:
    """
    Resuelve el 'id' del usuario a partir del contexto de la petición.
    
    Intenta en este orden:
    1. Token en Authorization header (preparado para JWT)
    2. Header X-Mock-User-Id para desarrollo
    3. Fallback: primer usuario en tbl_persona
    
    Args:
        request: Objeto FastAPI Request
    
    Returns:
        str: ID del usuario
    
    Raises:
        HTTPException: Si el usuario no existe
    """
    pass

# ✅ Comentarios inline para lógica compleja
# Fallback de desarrollo: retornar primer usuario
return AuthService._get_fallback_user_id()
```

### 3.7 Rutas FastAPI

```python
# ✅ Usar decoradores con verbos HTTP
@app.get("/api/carousel")
def get_carousel():
    """Obtiene todos los carruseles activos."""
    pass

@app.post("/api/datos-morfologicos", status_code=201)
def create_datos_morfologicos(datos: DatosMorfologicosInput):
    """Crea un nuevo registro de datos morfológicos."""
    pass

@app.put("/api/articulos/{articulo_id}")
def update_articulo(articulo_id: int, datos: ArticuloUpdate):
    """Actualiza un artículo existente."""
    pass

@app.delete("/api/articulos/{articulo_id}")
def delete_articulo(articulo_id: int):
    """Elimina un artículo."""
    pass

# ✅ Nombres descriptivos en path parameters
# ❌ EVITAR: @app.get("/api/get-carousel")
```

### 3.8 Modelos Pydantic

```python
# ✅ Usar BaseModel con tipo hints completos
from pydantic import BaseModel, Field
from typing import Optional

class DatosMorfologicosInput(BaseModel):
    usuario_id: str
    sexo: Optional[str] = None
    edad: Optional[int] = None
    peso_kg: Optional[float] = None
    estatura_cm: Optional[float] = None
    
    class Config:
        """Configuración del modelo."""
        json_schema_extra = {
            "example": {
                "usuario_id": "123",
                "edad": 25,
                "peso_kg": 65.5
            }
        }

# ✅ Con validaciones si es necesario
class Articulo(BaseModel):
    titulo: str = Field(..., min_length=1, max_length=200)
    contenido: str = Field(..., min_length=10)
```

---

## 4. Convenciones de Base de Datos

### 4.1 Nombres de Tablas

```sql
-- ✅ Prefijo 'tbl_' + snake_case
tbl_carrusel
tbl_persona
tbl_articulo
datos_personales
datos_morfologicos

-- ❌ EVITAR
Carousel
tb_carousel
carousel_tbl
```

### 4.2 Nombres de Columnas

```sql
-- ✅ snake_case
id              (INTEGER PRIMARY KEY)
usuario_id      (FK referenciando usuario)
titulo          (TEXT NOT NULL)
contenido       (TEXT)
fecha_creacion  (DATETIME DEFAULT CURRENT_TIMESTAMP)
activo          (INTEGER DEFAULT 1)
created_at      (DATETIME)
updated_at      (DATETIME)

-- ❌ EVITAR
UserId
TituloArticulo
fechaCreacion
```

### 4.3 Convenciones de Datos

```python
# ✅ Usar IDs como string (UUID o ID como string)
usuario_id: str  # Puede ser UUID o número convertido a string

# ✅ Usar booleanos como INTEGER (0 = False, 1 = True) en SQLite
visible: int = 1
isExternal: int = 0

# ✅ Usar TEXT para URLs completas
imageUrl: str = "https://..."

# ✅ Timestamps en YYYY-MM-DD HH:MM:SS o ISO 8601
created_at: str = "2026-06-22 14:30:00"
```

### 4.4 Nombres de Archivos BD

```
asesoria.db           # Perfiles de usuarios
carousel.db           # Carruseles de contenido
datos_morfologicos.db # Medidas físicas
interactive_help.db   # Ayuda contextual
maestras_menus.db     # Datos de referencia
```

---

## 5. Convenciones de Nomenclatura General

### 5.1 Convención de IDs

```typescript
// ✅ Usar 'id' como nombre de propiedad estándar
interface CarouselSlide {
  id: number | string;
  title: string;
}

// ✅ Usar 'usuarioId' en interfaces, 'usuario_id' en BD
interface DatosMorfologicos {
  usuarioId: string;  // TypeScript
}

// En SQL:
-- usuario_id  (SQLite)
```

### 5.2 Nomenclatura de Funciones por Responsabilidad

```typescript
// ✅ Getters: get{NombreRecurso}
getCarrusel()
getCarruseles()
getArticulo()
getArticulos()
getMenus()

// ✅ Setters: set{NombreRecurso}
setCarrusel()
setArticulo()

// ✅ Creadores: create{NombreRecurso} o add{NombreRecurso}
createArticulo()
addCarrusel()

// ✅ Actualizadores: update{NombreRecurso}
updateArticulo()

// ✅ Eliminadores: delete{NombreRecurso} o remove{NombreRecurso}
deleteArticulo()
removeCarrusel()

// ✅ Validadores: is{Propiedad} o validate{NombreRecurso}
isVisible()
validateEmail()
validateCarousel()

// ✅ Búsquedas: find{NombreRecurso} o search{NombreRecurso}
findArticuloById()
searchCarruseles()
```

### 5.3 Nomenclatura de Variables Booleanas

```typescript
// ✅ Usar prefijos: is, has, can, should, did, was
isVisible: boolean;
hasError: boolean;
canDelete: boolean;
shouldRefresh: boolean;
didLoad: boolean;
wasModified: boolean;

// ❌ EVITAR
visible: boolean;  // Ambiguo
error: boolean;    // No es claro que es booleano
deleted: boolean;  // Pastense
```

---

## 6. Comentarios y Documentación

### 6.1 Comentarios de Código

```typescript
// ✅ Comentarios claros y significativos
// Obtener el siguiente slide en el carrusel
nextSlide() {
  this.currentIndex = (this.currentIndex + 1) % this.slides.length;
}

// ✅ Comentarios TODO para trabajo futuro
// TODO: Implementar paginación cuando haya más de 100 artículos
getArticulos() { }

// ✅ Explicar el "por qué", no el "qué"
// Necesitamos cast a string porque la BD retorna como INTEGER
const usuarioId = String(row.id);

// ❌ EVITAR: Comentarios obvios
// Incrementar el índice
currentIndex++;
```

### 6.2 Commits y PRs

```
✅ CORRECTO
git commit -m "feat: agregar carrusel de asesorías"
git commit -m "fix: corregir error de carga en datos-morfologicos"
git commit -m "docs: actualizar convenciones del proyecto"

❌ INCORRECTO
git commit -m "update"
git commit -m "bug fix"
git commit -m "WIP: cambios varios"
```

---

## 7. Estructura de Componentes

### 7.1 Orden de Miembros en Componentes Angular

```typescript
@Component({...})
export class CarouselComponent implements OnInit, OnDestroy {
  // 1. Decoradores de Entrada (@Input)
  @Input() slides: CarouselSlide[] = [];
  @Input() autoPlayInterval: number = 5000;
  
  // 2. Decoradores de Salida (@Output)
  @Output() slideChanged = new EventEmitter<number>();
  
  // 3. Propiedades públicas
  currentIndex = 0;
  
  // 4. Propiedades privadas
  private intervalId: any;
  private isBrowser: boolean;
  
  // 5. Constructor
  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }
  
  // 6. Lifecycle hooks (en orden: OnInit, OnDestroy, etc.)
  ngOnInit() { }
  ngOnDestroy() { }
  
  // 7. Métodos públicos (ordenados alfabéticamente o por lógica)
  goToSlide(index: number) { }
  nextSlide() { }
  prevSlide() { }
  
  // 8. Métodos privados
  private startAutoPlay() { }
  private stopAutoPlay() { }
}
```

### 7.2 Orden de Miembros en Servicios

```typescript
@Injectable({ providedIn: 'root' })
export class AsesoriaService {
  // 1. Inyecciones
  private http = inject(HttpClient);
  
  // 2. Propiedades privadas
  private apiUrl = 'http://localhost:3000/api';
  
  // 3. Constructor (si lo hay)
  constructor() { }
  
  // 4. Métodos públicos
  getMenus(usuarioId?: number): Observable<MenuServicioItem[]> { }
  getArticulos(menuId: number, usuarioId?: number): Observable<AsesoriaArticulo[]> { }
  
  // 5. Métodos privados
  private mapToModel(data: any): AsesoriaArticulo { }
}
```

---

## 8. Casos de Uso Específicos

### 8.1 Manejo de Errores

```typescript
// ✅ Angular: Usar pipe catchError
getArticulos() {
  return this.http.get<ArticuloList>(`${this.apiUrl}/articulos`).pipe(
    catchError(error => {
      console.error('Error al obtener artículos:', error);
      return throwError(() => new Error('No se pudieron cargar los artículos'));
    })
  );
}

// ✅ Python: Usar HTTPException
from fastapi import HTTPException

@app.get("/api/articulos/{id}")
def get_articulo(id: int):
    articulo = db.get_articulo(id)
    if not articulo:
        raise HTTPException(
            status_code=404,
            detail=f"Artículo con ID {id} no encontrado"
        )
    return articulo
```

### 8.2 Validación de Entrada

```typescript
// ✅ Usar Reactive Forms con validadores
import { FormBuilder, Validators } from '@angular/forms';

export class RegistroComponent {
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    edad: ['', [Validators.required, Validators.min(18)]],
    peso: ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]]
  });
  
  constructor(private fb: FormBuilder) { }
}
```

### 8.3 Manejo de Fecha y Hora

```python
# ✅ Usar datetime para operaciones
from datetime import datetime

def create_articulo(...):
    articulo = {
        'id': ...,
        'titulo': ...,
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat()
    }
    return articulo
```

---

## 9. Checklist de Código Limpio

Antes de hacer push, verificar:

- [ ] **Nombres significativos**: Variables, funciones y clases tienen nombres claros
- [ ] **Funciones cortas**: Máximo 20 líneas (considerar refactorización si es mayor)
- [ ] **Sin comentarios obvios**: Solo comentarios que expliquen el "por qué"
- [ ] **Type safety**: TypeScript sin `any`, type hints en Python
- [ ] **Manejo de errores**: Try-catch, error boundaries, HTTPException
- [ ] **DRY (Don't Repeat Yourself)**: No hay código duplicado
- [ ] **SOLID principles**: Single Responsibility, Open/Closed, Liskov, Interface Segregation, Dependency Inversion
- [ ] **Testing**: Tests unitarios en componentes/servicios críticos
- [ ] **Formateo**: Código formateado con Prettier (TS) o Black (Python)

---

## 10. Herramientas de Formateo

### 10.1 TypeScript - Prettier

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2
}
```

Comando: `npm run format`

### 10.2 Python - Black y isort

```bash
# Formatear código
black src/Backend/

# Ordenar imports
isort src/Backend/
```

---

## 11. Excepciones y Justificaciones

Si necesitas violar una convención, documéntalo:

```typescript
// EXCEPCIÓN: Este método usa camelCase ya que coincide con la API externa
// que no podemos modificar. Cuando se refactorice la API, cambiar a snake_case
function getUserData() {
  return this.http.get('/external-api/userData');
}
```

---

**Versión**: 1.0  
**Última actualización**: 22 de Junio de 2026  
**Responsable**: Equipo de Arquitectura

---

## Apéndice: Referencias

- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- [PEP 8 - Python Style Guide](https://www.python.org/dev/peps/pep-0008/)
- [Angular Style Guide](https://angular.io/guide/styleguide)
- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
