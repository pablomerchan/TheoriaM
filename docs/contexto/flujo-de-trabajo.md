# Flujo de Trabajo - TheorIA M

Procedimientos y pasos detallados para desarrollar, revisar y desplegar cambios en TheorIA M. **No salte pasos**.

---

## Índice

1. [Flujo de Desarrollo Local](#flujo-de-desarrollo-local)
2. [Flujo de Características Nuevas](#flujo-de-características-nuevas)
3. [Flujo de Bugs/Fixes](#flujo-de-bugsfixes)
4. [Flujo de Base de Datos](#flujo-de-base-de-datos)
5. [Flujo Frontend](#flujo-frontend)
6. [Flujo Backend](#flujo-backend)
7. [Flujo de Testing](#flujo-de-testing)
8. [Flujo de Code Review](#flujo-de-code-review)
9. [Flujo de Despliegue](#flujo-de-despliegue)
10. [Checklist Pre-Commit](#checklist-pre-commit)
11. [Procedimientos de Emergencia](#procedimientos-de-emergencia)

---

## Flujo de Desarrollo Local

### 1.1 Setup Inicial (Primera Vez)

**Tiempo Estimado**: 30 minutos

#### Paso 1: Clonar Repositorio
```bash
git clone https://github.com/tuempresa/theoriamm.git
cd theoriamm/src
```

#### Paso 2: Instalar Backend
```bash
cd Backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install fastapi uvicorn pydantic
```

**Verificar**: `pip freeze` debe mostrar fastapi y uvicorn

#### Paso 3: Instalar Frontend
```bash
cd ../FrontEnd
npm install
```

**Verificar**: `ls node_modules | head` debe mostrar módulos instalados

#### Paso 4: Verificar BDs
```bash
cd ../Backend
python backend.py
# Debería crear *.db files automáticamente
```

**Verificar**: Buscar archivos `.db`:
```bash
ls -la *.db
# Debe haber: asesoria.db, carousel.db, etc.
```

---

### 1.2 Inicio Diario

**Tiempo Estimado**: 5 minutos por componente

#### Frontend

```bash
cd FrontEnd
npm start
# Abre http://localhost:4200 automáticamente
```

**Verificar**: 
- [ ] Navegador abre en localhost:4200
- [ ] No hay errores rojo en consola (warnings está ok)

#### Backend

```bash
cd Backend
# Asegurarse de estar en venv activado
python backend.py
# Debería decir: Uvicorn running on http://127.0.0.1:8000
```

**Verificar**:
- [ ] Terminal muestra "Uvicorn running"
- [ ] Puedes acceder http://localhost:8000/docs (Swagger)

---

### 1.3 Verificar Conectividad

En navegador, abre: http://localhost:4200/asesoria

**Esperar Ver**:
- [ ] Página de asesoría carga
- [ ] Sin errores CORS en consola
- [ ] Datos aparecen (o skeleton loading)

---

## Flujo de Características Nuevas

### 2.1 Planificación

#### Paso 1: Crear Issue en GitHub
- Título claro: "feat: [descripción corta]"
- Descripción detallada del requerimiento
- Aceptación criteria (qué se considera "hecho")
- Componentes afectados
- Estimación (small/medium/large)

**Ejemplo**:
```markdown
# feat: Agregar paleta cromática a asesoría

## Descripción
Mostrar paleta de colores recomendados después de análisis cromático.

## Aceptación Criteria
- [ ] Colores aparecen en componente aseoria-carousel
- [ ] Formato: 3 colores primarios + 2 secundarios + 2 neutrales
- [ ] Almacenar en BD asesoria.db tabla nueva o existente
- [ ] Tests para AsesoriaService.getPaleta()

## Componentes
- Frontend: aseoria-carousel.component
- Backend: AsesoriaService
- DB: asesoria.db

## Estimación
Medium (3-5 horas)
```

#### Paso 2: Crear Rama
```bash
git checkout main
git pull origin main
git checkout -b feature/paleta-cromatica
```

**Nomenclatura Ramas**:
- `feature/{nombre}` - Features nuevas
- `bugfix/{nombre}` - Bugs a corregir
- `hotfix/{nombre}` - Correcciones urgentes
- `docs/{nombre}` - Cambios documentación

---

### 2.2 Desarrollo Frontend

#### Paso 1: Crear Modelo/Interface
**Archivo**: `FrontEnd/src/app/models/paleta-cromatica.model.ts`

```typescript
export interface PaletaCromatica {
  id: string;
  asesoriaId: string;
  colorPrimarios: string[];      // Array de 3 colores hex
  colorSecundarios: string[];    // Array de 2 colores hex
  colorNeutros: string[];        // Array de 2 colores hex
  createdAt: Date;
}
```

✅ Commit: `git add FrontEnd/src/app/models/ && git commit -m "model: agregar interfaz PaletaCromatica"`

#### Paso 2: Crear Servicio
**Archivo**: `FrontEnd/src/app/services/paleta-cromatica.service.ts`

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PaletaCromatica } from '../models/paleta-cromatica.model';

@Injectable({ providedIn: 'root' })
export class PaletaCromaticaService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/paleta';

  getPaleta(usuarioId: string): Observable<PaletaCromatica> {
    return this.http.get<PaletaCromatica>(`${this.apiUrl}/${usuarioId}`);
  }
}
```

✅ Commit: `git commit -m "service: crear PaletaCromaticaService con getPaleta()"`

#### Paso 3: Crear Componente
**Archivo**: `FrontEnd/src/app/components/paleta-cromatica/paleta-cromatica.component.ts`

```typescript
import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaletaCromatica } from '../../models/paleta-cromatica.model';

@Component({
  selector: 'app-paleta-cromatica',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './paleta-cromatica.component.html',
  styleUrls: ['./paleta-cromatica.component.scss']
})
export class PaletaCromaticaComponent {
  @Input() paleta: PaletaCromatica | null = null;
}
```

✅ Commit: `git commit -m "component: crear PaletaCromaticaComponent"`

#### Paso 4: Crear Template y Estilos
**Archivos**: 
- `paleta-cromatica.component.html`
- `paleta-cromatica.component.scss`

✅ Commit: `git commit -m "styles: agregar template y estilos de paleta cromática"`

#### Paso 5: Integrar en Componente Principal
En `asesoria.component.ts`, agregar:

```typescript
export class AsesoriaComponent {
  paleta$ = this.paletaService.getPaleta(this.usuarioId);
}
```

En `asesoria.component.html`, agregar:
```html
<app-paleta-cromatica [paleta]="paleta$ | async"></app-paleta-cromatica>
```

✅ Commit: `git commit -m "feat: integrar paleta cromática en asesoria-carousel"`

---

### 2.3 Desarrollo Backend

#### Paso 1: Crear Tabla en BD (si es necesario)
**Archivo**: `Backend/migrate_paleta_cromatica.py`

```python
import sqlite3

def migrate():
    conn = sqlite3.connect('asesoria.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tbl_paleta_cromatica (
            id TEXT PRIMARY KEY,
            usuario_id TEXT NOT NULL,
            color_primarios TEXT NOT NULL,  -- JSON array
            color_secundarios TEXT NOT NULL,
            color_neutros TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (usuario_id) REFERENCES tbl_persona(id)
        )
    ''')
    
    conn.commit()
    conn.close()
    print("✅ Migración paleta_cromatica completada")

if __name__ == '__main__':
    migrate()
```

**Ejecutar**:
```bash
python migrate_paleta_cromatica.py
```

✅ Commit: `git commit -m "db: crear tabla tbl_paleta_cromatica"`

#### Paso 2: Crear Modelo Pydantic
En `backend.py`, agregar:

```python
from pydantic import BaseModel
from typing import List

class PaletaCromaticaInput(BaseModel):
    usuario_id: str
    color_primarios: List[str]    # 3 colores hex
    color_secundarios: List[str]  # 2 colores hex
    color_neutros: List[str]      # 2 colores hex

class PaletaCromaticaResponse(BaseModel):
    id: str
    usuario_id: str
    color_primarios: List[str]
    color_secundarios: List[str]
    color_neutros: List[str]
    created_at: str
```

✅ Commit: `git commit -m "model: agregar modelos Pydantic de PaletaCromatica"`

#### Paso 3: Crear Endpoints API
En `backend.py`, agregar:

```python
@app.get("/api/paleta/{usuario_id}")
def get_paleta(usuario_id: str):
    """Obtiene la paleta cromática de un usuario."""
    conn = sqlite3.connect(ASESORIA_DB)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT * FROM tbl_paleta_cromatica WHERE usuario_id = ?",
        (usuario_id,)
    )
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Paleta no encontrada")
    
    return dict(row)

@app.post("/api/paleta", status_code=201)
def create_paleta(datos: PaletaCromaticaInput):
    """Crea nueva paleta cromática."""
    # Generar ID único
    paleta_id = str(uuid.uuid4())
    
    conn = sqlite3.connect(ASESORIA_DB)
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO tbl_paleta_cromatica 
        (id, usuario_id, color_primarios, color_secundarios, color_neutros)
        VALUES (?, ?, ?, ?, ?)
    ''', (
        paleta_id,
        datos.usuario_id,
        json.dumps(datos.color_primarios),
        json.dumps(datos.color_secundarios),
        json.dumps(datos.color_neutros)
    ))
    
    conn.commit()
    conn.close()
    
    return {"id": paleta_id, "status": "creada"}
```

✅ Commit: `git commit -m "api: agregar endpoints GET/POST /api/paleta"`

---

### 2.4 Testing Local

#### Paso 1: Verificar Backend
```bash
cd Backend
python backend.py
```

En otra terminal:
```bash
curl http://localhost:8000/docs
# Debería abrir Swagger
```

Testear endpoint en Swagger: `GET /api/paleta/{usuario_id}`

✅ Verificar: Retorna datos correctamente

#### Paso 2: Verificar Frontend
```bash
cd FrontEnd
npm start
```

Navegar a http://localhost:4200/asesoria

**Checklist**:
- [ ] Componente carga
- [ ] Muestra paleta de colores
- [ ] Sin errores en consola
- [ ] Responde bien (no timeout)

#### Paso 3: Verificar BD
```bash
cd Backend
python -c "
import sqlite3
conn = sqlite3.connect('asesoria.db')
cursor = conn.cursor()
cursor.execute('SELECT COUNT(*) FROM tbl_paleta_cromatica')
print('Registros:', cursor.fetchone()[0])
conn.close()
"
```

---

### 2.5 Actualizar Documentación

#### Paso 1: Actualizar Glosario
En `docs/contexto/glosario.md`, agregar definición de Paleta Cromática

#### Paso 2: Actualizar Arquitectura (si cambió)
En `docs/contexto/arquitectura.md`, actualizar diagrama si aplica

#### Paso 3: Actualizar Decisiones
Si hay decisión arquitectónica nueva, documentar en `docs/contexto/decisiones.md`

✅ Commit: `git commit -m "docs: actualizar glosario con paleta cromática"`

---

## Flujo de Bugs/Fixes

### 3.1 Reportar Bug

**Crear Issue**:
```markdown
# bug: [descripción corta del problema]

## Pasos para Reproducir
1. Navegar a /asesoria
2. Esperar carga
3. Observar error

## Comportamiento Actual
Página en blanco, error en consola

## Comportamiento Esperado
Mostrar asesorías

## Logs/Error
```
Error: Cannot read property 'slides' of undefined
```

## Severidad
- [ ] Crítico (app no funciona)
- [ ] Alto (feature no funciona)
- [ ] Medio (UX afectada)
- [ ] Bajo (cosmético)

## Componentes Afectados
- asesoria.component.ts
- asesoria.service.ts
```

---

### 3.2 Fijar Bug

#### Paso 1: Crear rama
```bash
git checkout main
git pull origin main
git checkout -b bugfix/carrusel-undefined
```

#### Paso 2: Investigar
```bash
# Leer el error en consola
# Buscar en código donde se accede a this.slides
grep -r "this.slides" FrontEnd/src/app/
```

#### Paso 3: Aplicar Fix
En el componente afectado, añadir validación:

```typescript
// Antes
<div *ngFor="let slide of this.slides">

// Después
<div *ngIf="slides && slides.length > 0" *ngFor="let slide of slides">
  <!-- contenido -->
</div>
```

#### Paso 4: Testear
```bash
npm start
# Verificar que error desaparece
# Verificar que funcionalidad sigue trabajando
```

#### Paso 5: Hacer Commit
```bash
git add FrontEnd/src/app/components/carousel/
git commit -m "fix: validar slides antes de renderizar en carousel"
```

---

## Flujo de Base de Datos

### 4.1 Cambios en Schema

#### Cuando Necesitas Agregar Columna

**Paso 1: Crear Script de Migración**
```bash
# Nombre: migrate_YYYY_MM_DD_descripcion.py
touch Backend/migrate_2026_06_22_agregar_created_at_paleta.py
```

**Paso 2: Escribir Migración**
```python
import sqlite3
from datetime import datetime

def migrate():
    conn = sqlite3.connect('asesoria.db')
    cursor = conn.cursor()
    
    try:
        # Agregar columna si no existe
        cursor.execute('''
            ALTER TABLE tbl_paleta_cromatica 
            ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ''')
        conn.commit()
        print("✅ Columna 'created_at' agregada")
    except sqlite3.OperationalError as e:
        print(f"⚠️ Columna posiblemente ya existe: {e}")
    finally:
        conn.close()

if __name__ == '__main__':
    migrate()
```

**Paso 3: Ejecutar en Local**
```bash
cd Backend
python migrate_2026_06_22_agregar_created_at_paleta.py
```

**Verificar**:
```bash
python -c "
import sqlite3
conn = sqlite3.connect('asesoria.db')
cursor = conn.cursor()
cursor.execute('PRAGMA table_info(tbl_paleta_cromatica)')
for col in cursor.fetchall():
    print(col)
conn.close()
"
```

✅ Commit: `git commit -m "db: agregar columna created_at a tbl_paleta_cromatica"`

---

#### Cuando Necesitas Nueva Tabla

**Paso 1-2**: (Igual a columna nueva)

**Paso 3**: En Backend/backend.py, agregar inicialización en función correspondiente (init_asesoria_db, etc)

**Paso 4**: Testear creación automática:
```bash
# Borrar BD vieja
rm Backend/asesoria.db

# Reiniciar backend
python backend.py

# Verificar que tabla se crea
python -c "
import sqlite3
conn = sqlite3.connect('asesoria.db')
cursor = conn.cursor()
cursor.execute(\"SELECT name FROM sqlite_master WHERE type='table' AND name='tbl_nueva'\")
print('Tabla existe:', cursor.fetchone() is not None)
conn.close()
"
```

---

### 4.2 Backup de BD (Pre-Producción)

Antes de cualquier cambio serio:

```bash
cd Backend
cp asesoria.db asesoria.db.backup.$(date +%Y%m%d_%H%M%S)
cp datos_morfologicos.db datos_morfologicos.db.backup.$(date +%Y%m%d_%H%M%S)
```

**Restaurar si va mal**:
```bash
cp asesoria.db.backup.20260622_120000 asesoria.db
```

---

## Flujo Frontend

### 5.1 Crear Componente Nuevo

**Paso 1**: Usar Angular CLI
```bash
cd FrontEnd
ng generate component components/nuevo-componente --standalone
```

**Paso 2**: Editar archivos:
- `nuevo-componente.component.ts` - Lógica
- `nuevo-componente.component.html` - Template
- `nuevo-componente.component.scss` - Estilos

**Paso 3**: Importar en componente padre
```typescript
import { NuevoComponenteComponent } from './components/nuevo-componente/nuevo-componente.component';

@Component({
  standalone: true,
  imports: [NuevoComponenteComponent]
})
export class PadreComponent { }
```

**Paso 4**: Usar en template
```html
<app-nuevo-componente [data]="datos" (evento)="manejador($event)"></app-nuevo-componente>
```

---

### 5.2 Crear Servicio Nuevo

**Paso 1**: Crear archivo
```bash
touch FrontEnd/src/app/services/nuevo.service.ts
```

**Paso 2**: Escribir servicio
```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NuevoService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/nuevo';

  obtenerDatos(): Observable<any> {
    return this.http.get(this.apiUrl);
  }
}
```

**Paso 3**: Inyectar en componentes
```typescript
export class MiComponente {
  private service = inject(NuevoService);
  datos$ = this.service.obtenerDatos();
}
```

---

### 5.3 Agregar Ruta Nueva

En `FrontEnd/src/app/app.routes.ts`:

```typescript
export const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'nueva-pagina', component: NuevaPaginaComponent },  // ← Nueva
  { path: '**', redirectTo: '' }
];
```

**Navegar desde template**:
```html
<a routerLink="/nueva-pagina">Ir a Nueva Página</a>
```

---

### 5.4 Agregar Estilos Globales

En `FrontEnd/src/styles.scss`:

```scss
// Variables globales
$color-primario: #E5B87C;
$color-secundario: #8B6914;

// Mixins reutilizables
@mixin flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

// Clases globales
.container {
  @include flex-center;
  max-width: 1200px;
  margin: 0 auto;
}
```

---

## Flujo Backend

### 6.1 Crear Endpoint Nuevo

**Paso 1**: Definir modelo Pydantic
```python
from pydantic import BaseModel

class MiDatoInput(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
```

**Paso 2**: Crear endpoint
```python
@app.get("/api/mi-dato/{id}")
def get_mi_dato(id: str):
    """Obtiene un dato específico."""
    conn = sqlite3.connect(ASESORIA_DB)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM tbl_mi_dato WHERE id = ?", (id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="No encontrado")
    
    return dict(row)

@app.post("/api/mi-dato", status_code=201)
def create_mi_dato(dato: MiDatoInput):
    """Crea un nuevo dato."""
    # Lógica de creación
    return {"id": new_id, "status": "creado"}
```

**Paso 3**: Testear en Swagger
```bash
http://localhost:8000/docs
# Probar endpoint
```

---

### 6.2 Agregar Servicio Backend

**Paso 1**: Crear archivo en `Backend/services/`
```bash
touch Backend/services/mi_service.py
```

**Paso 2**: Escribir servicio
```python
import sqlite3
from typing import Optional, List

class MiService:
    @staticmethod
    def obtener_todos() -> List[dict]:
        """Obtiene todos los registros."""
        conn = sqlite3.connect('asesoria.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM tbl_mi_tabla")
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in rows]
    
    @staticmethod
    def obtener_por_id(id: str) -> Optional[dict]:
        """Obtiene registro por ID."""
        # Implementar...
        pass
```

**Paso 3**: Usar en backend.py
```python
from services.mi_service import MiService

@app.get("/api/mi-tabla")
def listar_tabla():
    return MiService.obtener_todos()
```

---

## Flujo de Testing

### 7.1 Tests Frontend (Vitest)

**Crear archivo test**:
```bash
touch FrontEnd/src/app/components/carousel/carousel.component.spec.ts
```

**Escribir test**:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { CarouselComponent } from './carousel.component';

describe('CarouselComponent', () => {
  let component: CarouselComponent;

  beforeEach(() => {
    component = new CarouselComponent(null as any);
  });

  it('debería crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('debería ir al siguiente slide', () => {
    component.slides = [
      { id: 1, title: 'Slide 1' },
      { id: 2, title: 'Slide 2' }
    ];
    
    component.nextSlide();
    expect(component.currentIndex).toBe(1);
  });
});
```

**Ejecutar tests**:
```bash
cd FrontEnd
npm test
```

---

### 7.2 Tests Backend (Python)

**Crear archivo test**:
```bash
touch Backend/test_paleta_service.py
```

**Escribir test**:
```python
import unittest
from services.paleta_service import PaletaService

class TestPaletaService(unittest.TestCase):
    def test_obtener_paleta(self):
        """Test obtención de paleta."""
        paleta = PaletaService.obtener_paleta('usuario_1')
        self.assertIsNotNone(paleta)
        self.assertIn('color_primarios', paleta)

if __name__ == '__main__':
    unittest.main()
```

**Ejecutar tests**:
```bash
cd Backend
python -m pytest test_paleta_service.py -v
```

---

## Flujo de Code Review

### 8.1 Antes de hacer Push

**Checklist Local**:
- [ ] Código compila sin errores
- [ ] Tests pasan (si hay)
- [ ] Código formateado (Prettier/Black)
- [ ] No hay console.log() en producción
- [ ] Commits son atómicos (un cambio por commit)
- [ ] Mensajes de commit son claros

---

### 8.2 Hacer Push y PR

**Paso 1**: Push a rama
```bash
git push origin feature/paleta-cromatica
```

**Paso 2**: Crear Pull Request en GitHub
- Título: `feat: agregar paleta cromática a asesoría`
- Descripción detallada de cambios
- Link a issue relacionada: `Closes #123`
- Checklist:
  ```markdown
  - [x] Tests agregados
  - [x] Documentación actualizada
  - [x] Sin breaking changes
  - [x] BD migraciones incluidas
  ```

---

### 8.3 Revisión de Código

**Reviewer checklist**:
- [ ] ¿Código sigue convenciones?
- [ ] ¿Hay duplicación?
- [ ] ¿Funciona como se esperaba?
- [ ] ¿Tests adecuados?
- [ ] ¿Documentación completa?
- [ ] ¿Performance aceptable?

**Si hay cambios solicitados**:
```bash
# Hacer cambios
git add .
git commit -m "review: incorporar feedback de revisión"
git push origin feature/paleta-cromatica
# PR se actualiza automáticamente
```

---

### 8.4 Merge a Main

Una vez aprobado:
```bash
# En GitHub, clickear "Merge pull request"
# O en terminal:
git checkout main
git pull origin main
git merge feature/paleta-cromatica
git push origin main
```

**Limpiar rama local**:
```bash
git branch -d feature/paleta-cromatica
git push origin --delete feature/paleta-cromatica
```

---

## Flujo de Despliegue

### 9.1 Despliegue a Staging

**Paso 1**: Crear rama de release
```bash
git checkout main
git pull origin main
git checkout -b release/v0.2.0
```

**Paso 2**: Actualizar versión
- `FrontEnd/package.json`: `"version": "0.2.0"`
- Crear archivo `RELEASE_NOTES.md`

**Paso 3**: Build Frontend
```bash
cd FrontEnd
npm run build
# Genera FrontEnd/dist/
```

**Verificar**:
```bash
ls -la FrontEnd/dist/
# Debería tener: index.html, main.*.js, etc.
```

**Paso 4**: Build Backend
```bash
cd Backend
pip freeze > requirements.txt
```

**Paso 5**: Push a staging
```bash
git commit -m "release: v0.2.0"
git push origin release/v0.2.0
```

**Paso 6**: Desplegar (comando específico por hosting)
```bash
# Ejemplo Heroku
heroku deploy --app theoriamm-staging
```

**Verificar en Staging**:
- [ ] Frontend carga en staging URL
- [ ] Backend API responde
- [ ] BDs existen y tienen datos
- [ ] Tests de smoke pasan

---

### 9.2 Despliegue a Producción

⚠️ **CRÍTICO: Solo hacer tras aprobación**

**Paso 1**: Crear tag
```bash
git tag -a v0.2.0 -m "Release v0.2.0: Paleta cromática"
git push origin v0.2.0
```

**Paso 2**: Desplegar
```bash
heroku deploy --app theoriamm-prod
```

**Paso 3**: Verificaciones Post-Deploy
- [ ] URL producción abre
- [ ] No hay errores en logs
- [ ] BDs migraron correctamente
- [ ] Endpoints API responden
- [ ] Página de inicio carga
- [ ] Asesoría funciona

**Paso 4**: Monitoreo
```bash
# Ver logs en tiempo real
heroku logs --tail --app theoriamm-prod
```

**Si hay problema**: 
```bash
# Revertir a versión anterior
git revert HEAD
git push origin main
# Redeploy
```

---

## Checklist Pre-Commit

Antes de hacer `git commit`:

### TypeScript/Angular
- [ ] `npm run build` sin errores
- [ ] `npm test` pasa (o comentar por qué se salta)
- [ ] `npx prettier --check FrontEnd/src/` (formateado)
- [ ] Sin `console.log()` en código
- [ ] Sin `any` types (excepto si justificado)
- [ ] Imports ordenados y usados
- [ ] Componentes tienen `standalone: true`
- [ ] Servicios inyectan con `inject()`

### Python/FastAPI
- [ ] `python backend.py` sin errores
- [ ] Swagger `/docs` accesible
- [ ] `python -m pytest` pasa (si hay tests)
- [ ] `black Backend/` formateado
- [ ] `isort Backend/` imports ordenados
- [ ] Type hints en todas funciones
- [ ] Docstrings en funciones públicas
- [ ] Sin SQL injection (usar parameterización)

### Base de Datos
- [ ] Migración ejecutada exitosamente
- [ ] Backup de BD hecho
- [ ] Nuevas tablas tienen PK
- [ ] FKs están definidas
- [ ] Índices en columnas frecuentes

### Documentación
- [ ] Glosario actualizado si nuevo término
- [ ] Arquitectura actualizada si cambio mayor
- [ ] Decisiones registradas si ADR nuevo
- [ ] Convenciones respetadas
- [ ] README actualizado si aplica

### Commit Message
- [ ] Comienza con prefijo: `feat:`, `fix:`, `docs:`, etc.
- [ ] Primera línea < 50 caracteres
- [ ] Explicativo pero conciso
- [ ] Referencia Issue si aplica: `Closes #123`

### Ejemplo Commit Correcto
```bash
git add .
git commit -m "feat: agregar paleta cromática

- Crear modelo PaletaCromatica
- Agregar endpoints GET/POST /api/paleta
- Crear componente UI
- Tests unitarios completados
- BD migración de nueva tabla

Closes #42"
```

---

## Procedimientos de Emergencia

### 10.1 Bug Crítico en Producción

**PASOS INMEDIATOS** (primeros 5 minutos):

1. **Crear Issue de EMERGENCIA**
```markdown
# 🚨 CRÍTICO: [descripción del problema]

Severidad: CRÍTICA
Afectación: [% usuarios afectados]
Impacto: [dinero, data, usabilidad]
```

2. **Notificar al equipo**
   - Mensaje en Slack #critical
   - Call de emergencia (si es grave)

3. **Investigar Rápidamente**
```bash
# En producción
heroku logs --tail --app theoriamm-prod

# Errores comunes
# - 500: Error backend (ver logs)
# - CORS: Header incorrecto
# - BD: Conexión fallida
```

4. **Evaluar Opciones**
   - **Rollback**: Si cambio reciente causó
   - **Hotfix**: Si es bug conocido rápido de arreglar
   - **Workaround**: Si aplica (deshabilitar feature)

---

### 10.2 Rollback Rápido

**Si hace falta revertir**:

```bash
# Opción 1: Revert commit
git revert <commit-sha>
git push origin main
heroku deploy --app theoriamm-prod

# Opción 2: Rollback a versión anterior
heroku releases --app theoriamm-prod
heroku rollback --app theoriamm-prod
```

**Verificar tras rollback**:
- [ ] App funciona
- [ ] Logs limpios
- [ ] Endpoints responden

---

### 10.3 Restaurar BD Corrupta

```bash
# Si BD está corrupta
cd Backend

# 1. Backup actual corrupta
cp asesoria.db asesoria.db.corrupted

# 2. Restaurar último backup bueno
cp asesoria.db.backup.20260620_000000 asesoria.db

# 3. Reiniciar backend
python backend.py

# 4. Verificar integridad
python -c "
import sqlite3
conn = sqlite3.connect('asesoria.db')
cursor = conn.cursor()
cursor.execute('PRAGMA integrity_check')
print(cursor.fetchone())
conn.close()
"
```

---

### 10.4 Post-Incident Review

Tras resolver emergencia:

1. **Timeline**: ¿Cuándo empezó? ¿Cuándo se detectó? ¿Cuándo se resolvió?
2. **Root Cause**: ¿Qué causó el problema?
3. **Impact**: ¿Cuántos usuarios afectados? ¿Cuánto tiempo?
4. **Resolution**: ¿Cómo se resolvió?
5. **Prevention**: ¿Cómo evitar en futuro?

**Documentar en**: `docs/incidentes/incident-YYYY-MM-DD.md`

---

## Tabla de Referencias Rápidas

| Tarea | Comando | Archivo |
|-------|---------|---------|
| **Iniciar Local** | `npm start` (FE) + `python backend.py` (BE) | - |
| **Crear Feature** | `git checkout -b feature/nombre` | - |
| **Build Frontend** | `npm run build` | `FrontEnd/` |
| **Tests Frontend** | `npm test` | `FrontEnd/src/**/*.spec.ts` |
| **Tests Backend** | `python -m pytest` | `Backend/test_*.py` |
| **Ver Swagger** | `http://localhost:8000/docs` | - |
| **Ver App** | `http://localhost:4200` | - |
| **Formatear TS** | `npx prettier --write .` | `FrontEnd/src/` |
| **Formatear Python** | `black .` | `Backend/` |
| **Migrar BD** | `python migrate_*.py` | `Backend/migrate_*.py` |
| **Push Feature** | `git push origin feature/nombre` | - |
| **Build Prod** | `npm run build` | `FrontEnd/` |
| **Deploy Prod** | `heroku deploy --app theoriamm-prod` | - |

---

**Versión**: 1.0  
**Última Actualización**: 22 de Junio de 2026  
**Responsable**: Arquitecto de Software  
**Próxima Revisión**: Agosto 2026

---

## Apéndice: Troubleshooting Común

### "CORS error"
**Solución**: Backend debe tener `allow_origins=["*"]` en desarrollo
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### "Cannot find module"
**Solución**: `npm install` en FrontEnd
```bash
cd FrontEnd
rm -rf node_modules package-lock.json
npm install
```

### "Port already in use"
**Solución**: Cambiar puerto o matar proceso
```bash
# Frontend en puerto 4201
ng serve --port 4201

# Backend en puerto 8001
uvicorn backend:app --port 8001
```

### "BD locked"
**Solución**: Cerrar todas conexiones y reintentar
```bash
# Terminar backend
# Verificar que no hay otro proceso
ps aux | grep python
# Matar si es necesario
kill -9 <PID>
```
