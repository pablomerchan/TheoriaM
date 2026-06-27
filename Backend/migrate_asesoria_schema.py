"""
migrate_asesoria_schema.py
──────────────────────────
Migra asesoria.db al nuevo esquema definido en docs/esquema_asesoria.drawio
preservando todos los datos existentes y la funcionalidad actual.

Nuevas tablas (drawio):
  tbl_persona, tbl_tipo_asesoria, tbl_asesoria (relación),
  tbl_resumen_asesoria, tbl_prenda_recomendada,
  tbl_grupo_personas, tbl_persona_grupo

Tablas extendidas:
  prendas_genericas → + nombre, categoria, tallas, estilos
  tbl_articulo      → + titulo, contenido, grupo_id, tags, publicado_en

Renombramiento:
  tbl_asesoria (vieja - contenido HTML) → tbl_menu_asesoria

Ejecutar desde: c:\\Empresas\\TheoriaM\\src\\Backend
  python migrate_asesoria_schema.py
"""

import sqlite3
import shutil
import uuid
import os
import sys

# Fix Windows terminal encoding
sys.stdout.reconfigure(encoding='utf-8')

# ── Configuración ──────────────────────────────────────────
ASESORIA_DB = "asesoria.db"
BACKUP_DB   = "asesoria_backup_pre_migration.db"

def log(msg, level="INFO"):
    icons = {"INFO": "ℹ", "OK": "✓", "SKIP": "·", "ERR": "✗", "WARN": "⚠"}
    print(f"  {icons.get(level,'?')} {msg}")


# ── Migración principal ────────────────────────────────────
def migrate():
    print("\n════════════════════════════════════════════════")
    print("  Migración esquema asesoria.db  (drawio → DB)  ")
    print("════════════════════════════════════════════════\n")

    if not os.path.exists(ASESORIA_DB):
        log(f"No se encontró {ASESORIA_DB}. Ejecuta desde el directorio Backend.", "ERR")
        sys.exit(1)

    # 1. Backup
    shutil.copy2(ASESORIA_DB, BACKUP_DB)
    log(f"Backup creado: {BACKUP_DB}", "OK")

    conn = sqlite3.connect(ASESORIA_DB)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("PRAGMA foreign_keys = OFF")

    try:
        _step1_rename_tbl_asesoria(conn, cursor)
        _step2_create_tbl_asesoria_new(cursor)
        _step3_create_tbl_persona(cursor)
        _step4_create_tbl_tipo_asesoria(cursor)
        _step5_create_tbl_resumen_asesoria(cursor)
        _step6_create_tbl_grupo_personas(cursor)
        _step7_create_tbl_persona_grupo(cursor)
        _step8_create_tbl_prenda_recomendada(cursor)
        _step9_extend_prendas_genericas(cursor)
        _step10_extend_tbl_articulo(cursor)
        _step11_ensure_tbl_menu_asesoria_extras(cursor)

        cursor.execute("PRAGMA foreign_keys = ON")
        conn.commit()
        log("Cambios confirmados en la base de datos.", "OK")

    except Exception as e:
        conn.rollback()
        log(f"Error durante migración: {e}", "ERR")
        log("Se ha revertido la transacción. El backup está en: " + BACKUP_DB, "WARN")
        conn.close()
        sys.exit(1)

    conn.close()
    print()
    verify_migration()


# ── Paso 1: tbl_asesoria (vieja) → tbl_menu_asesoria ──────
def _step1_rename_tbl_asesoria(conn, cursor):
    print("PASO 1 · Renombrar tbl_asesoria → tbl_menu_asesoria")

    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='tbl_asesoria'")
    old_exists = cursor.fetchone()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='tbl_menu_asesoria'")
    new_exists = cursor.fetchone()

    if new_exists:
        log("tbl_menu_asesoria ya existe, omitiendo.", "SKIP")
        return

    if not old_exists:
        log("tbl_asesoria no existe aún, se creará tbl_menu_asesoria vacía.", "SKIP")
        return

    # Verificar que es la tabla vieja (contenido HTML)
    cursor.execute("PRAGMA table_info(tbl_asesoria)")
    cols = {row["name"] for row in cursor.fetchall()}

    if "menu_servicio_id" not in cols:
        log("tbl_asesoria parece ser ya el nuevo esquema drawio, omitiendo rename.", "SKIP")
        return

    log("Creando tbl_menu_asesoria con mismo esquema...")
    # Crear con esquema completo (cubre columnas añadidas vía ALTER TABLE)
    cursor.execute("""
        CREATE TABLE tbl_menu_asesoria (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            menu_servicio_id INTEGER,
            menu_principal   TEXT,
            texto_html       TEXT,
            imagen_url       TEXT,
            imagen_alt       TEXT,
            orden            INTEGER DEFAULT 0,
            id_usuario       INTEGER,
            tipo_asesoria    TEXT,
            observacion      TEXT,
            asesoria_id      INTEGER,
            tipo_prenda      TEXT,
            visible          INTEGER DEFAULT 1,
            titulo           TEXT    DEFAULT NULL,
            FOREIGN KEY (menu_servicio_id) REFERENCES tbl_menu_servicios(id)
        )
    """)

    # Detectar columnas comunes entre la tabla vieja y la nueva
    cols_nueva = {
        "id","menu_servicio_id","menu_principal","texto_html","imagen_url",
        "imagen_alt","orden","id_usuario","tipo_asesoria","observacion",
        "asesoria_id","tipo_prenda","visible","titulo"
    }
    cols_comunes = sorted(cols & cols_nueva)
    col_list = ", ".join(cols_comunes)

    cursor.execute(f"INSERT INTO tbl_menu_asesoria ({col_list}) SELECT {col_list} FROM tbl_asesoria")
    count = cursor.execute("SELECT COUNT(*) FROM tbl_menu_asesoria").fetchone()[0]
    cursor.execute("DROP TABLE tbl_asesoria")
    log(f"Migradas {count} filas → tbl_menu_asesoria. Tabla original eliminada.", "OK")


# ── Paso 2: Nueva tbl_asesoria (esquema drawio) ────────────
def _step2_create_tbl_asesoria_new(cursor):
    print("PASO 2 · Nueva tbl_asesoria (esquema drawio - tabla relacional)")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tbl_asesoria (
            id         TEXT PRIMARY KEY,
            persona_id TEXT,
            tipo_id    TEXT,
            asesor_id  TEXT,
            fecha      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            estado     TEXT      DEFAULT 'activa',
            FOREIGN KEY (persona_id) REFERENCES tbl_persona(id),
            FOREIGN KEY (tipo_id)    REFERENCES tbl_tipo_asesoria(id)
        )
    """)
    log("tbl_asesoria (drawio) lista.", "OK")


# ── Paso 3: tbl_persona ────────────────────────────────────
def _step3_create_tbl_persona(cursor):
    print("PASO 3 · tbl_persona")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tbl_persona (
            id          TEXT PRIMARY KEY,
            nombre      TEXT,
            email       TEXT,
            genero      TEXT,
            edad        INTEGER,
            tipo_cuerpo TEXT,
            gustos_json TEXT
        )
    """)
    log("tbl_persona lista.", "OK")


# ── Paso 4: tbl_tipo_asesoria ──────────────────────────────
def _step4_create_tbl_tipo_asesoria(cursor):
    print("PASO 4 · tbl_tipo_asesoria (poblada desde tbl_menu_servicios)")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tbl_tipo_asesoria (
            id               TEXT PRIMARY KEY,
            nombre           TEXT NOT NULL,
            descripcion      TEXT,
            menu_servicio_ref INTEGER
        )
    """)

    cursor.execute("SELECT COUNT(*) FROM tbl_tipo_asesoria")
    if cursor.fetchone()[0] > 0:
        log("tbl_tipo_asesoria ya tiene datos.", "SKIP")
        return

    # Verificar si tbl_menu_servicios existe
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='tbl_menu_servicios'")
    if not cursor.fetchone():
        log("tbl_menu_servicios no existe aún, se dejará tbl_tipo_asesoria vacía.", "WARN")
        return

    cursor.execute("SELECT id, subtema, tema FROM tbl_menu_servicios")
    menus = cursor.fetchall()
    inserted = 0
    for m in menus:
        cursor.execute(
            "INSERT INTO tbl_tipo_asesoria (id, nombre, descripcion, menu_servicio_ref) VALUES (?, ?, ?, ?)",
            (str(uuid.uuid4()), m["subtema"], m["tema"], m["id"])
        )
        inserted += 1
    log(f"tbl_tipo_asesoria lista con {inserted} tipos de asesoría migrados.", "OK")


# ── Paso 5: tbl_resumen_asesoria ──────────────────────────
def _step5_create_tbl_resumen_asesoria(cursor):
    print("PASO 5 · tbl_resumen_asesoria")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tbl_resumen_asesoria (
            id          TEXT PRIMARY KEY,
            asesoria_id TEXT,
            contenido   TEXT,
            formato     TEXT DEFAULT 'html',
            FOREIGN KEY (asesoria_id) REFERENCES tbl_asesoria(id)
        )
    """)
    log("tbl_resumen_asesoria lista.", "OK")


# ── Paso 6: tbl_grupo_personas ─────────────────────────────
def _step6_create_tbl_grupo_personas(cursor):
    print("PASO 6 · tbl_grupo_personas")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tbl_grupo_personas (
            id          TEXT PRIMARY KEY,
            nombre      TEXT NOT NULL,
            descripcion TEXT
        )
    """)
    log("tbl_grupo_personas lista.", "OK")


# ── Paso 7: tbl_persona_grupo ──────────────────────────────
def _step7_create_tbl_persona_grupo(cursor):
    print("PASO 7 · tbl_persona_grupo")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tbl_persona_grupo (
            persona_id TEXT,
            grupo_id   TEXT,
            PRIMARY KEY (persona_id, grupo_id),
            FOREIGN KEY (persona_id) REFERENCES tbl_persona(id),
            FOREIGN KEY (grupo_id)   REFERENCES tbl_grupo_personas(id)
        )
    """)
    log("tbl_persona_grupo lista.", "OK")


# ── Paso 8: tbl_prenda_recomendada ────────────────────────
def _step8_create_tbl_prenda_recomendada(cursor):
    print("PASO 8 · tbl_prenda_recomendada")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tbl_prenda_recomendada (
            id          TEXT PRIMARY KEY,
            persona_id  TEXT,
            prenda_id   TEXT,
            asesoria_id TEXT,
            score       REAL,
            razon       TEXT,
            FOREIGN KEY (persona_id)  REFERENCES tbl_persona(id),
            FOREIGN KEY (prenda_id)   REFERENCES prendas_genericas(id),
            FOREIGN KEY (asesoria_id) REFERENCES tbl_asesoria(id)
        )
    """)
    log("tbl_prenda_recomendada lista.", "OK")


# ── Paso 9: Extender prendas_genericas ───────────────────
def _step9_extend_prendas_genericas(cursor):
    print("PASO 9 · prendas_genericas → nuevas columnas drawio")

    new_cols = [
        ("nombre",    "TEXT"),
        ("categoria", "TEXT"),
        ("tallas",    "TEXT DEFAULT '[]'"),
        ("estilos",   "TEXT DEFAULT '[]'"),
    ]
    added = []
    for col, defn in new_cols:
        try:
            cursor.execute(f"ALTER TABLE prendas_genericas ADD COLUMN {col} {defn}")
            added.append(col)
        except Exception:
            pass  # Ya existe

    if added:
        cursor.execute("""
            UPDATE prendas_genericas
            SET nombre    = COALESCE(descripcion_registro, tipo_prenda, 'Prenda'),
                categoria = COALESCE(tipo_prenda, 'General'),
                tallas    = COALESCE(tallas, '[]'),
                estilos   = COALESCE(estilos, '[]')
            WHERE nombre IS NULL
        """)
        log(f"Columnas añadidas: {', '.join(added)} y datos migrados.", "OK")
    else:
        log("Columnas ya existen.", "SKIP")


# ── Paso 10: Extender tbl_articulo ───────────────────────
def _step10_extend_tbl_articulo(cursor):
    print("PASO 10 · tbl_articulo → nuevas columnas drawio")

    new_cols = [
        ("titulo",       "TEXT"),
        ("contenido",    "TEXT"),
        ("grupo_id",     "TEXT"),
        ("tags",         "TEXT DEFAULT '[]'"),
        ("publicado_en", "TIMESTAMP"),
    ]
    added = []
    for col, defn in new_cols:
        try:
            cursor.execute(f"ALTER TABLE tbl_articulo ADD COLUMN {col} {defn}")
            added.append(col)
        except Exception:
            pass

    if added:
        cursor.execute("""
            UPDATE tbl_articulo
            SET titulo       = COALESCE(tipo_asesoria, 'Artículo'),
                contenido    = texto_html,
                tags         = COALESCE(tags, '[]'),
                publicado_en = CURRENT_TIMESTAMP
            WHERE titulo IS NULL
        """)
        log(f"Columnas añadidas: {', '.join(added)} y datos migrados.", "OK")
    else:
        log("Columnas ya existen.", "SKIP")


# ── Paso 11: Asegurar columnas extras en tbl_menu_asesoria ─
def _step11_ensure_tbl_menu_asesoria_extras(cursor):
    print("PASO 11 · tbl_menu_asesoria → columnas extras (idempotente)")
    extra_cols = [
        ("menu_principal", "TEXT"),
        ("observacion",    "TEXT"),
    ]
    for col, defn in extra_cols:
        try:
            cursor.execute(f"ALTER TABLE tbl_menu_asesoria ADD COLUMN {col} {defn}")
        except Exception:
            pass
    log("tbl_menu_asesoria verificada.", "OK")


# ── Verificación ──────────────────────────────────────────
def verify_migration():
    print("════════════════════════════════════════════════")
    print("  Verificación del esquema migrado               ")
    print("════════════════════════════════════════════════\n")

    conn = sqlite3.connect(ASESORIA_DB)
    cursor = conn.cursor()

    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = {r[0] for r in cursor.fetchall()}

    expected = {
        "tbl_persona", "tbl_tipo_asesoria", "tbl_asesoria",
        "tbl_resumen_asesoria", "tbl_prenda_recomendada",
        "tbl_grupo_personas", "tbl_persona_grupo",
        "prendas_genericas", "tbl_menu_asesoria",
        "tbl_menu_servicios", "tbl_asesoria_rapida", "tbl_articulo",
    }

    all_ok = True
    for t in sorted(expected):
        ok = t in tables
        log(t, "OK" if ok else "ERR")
        if not ok:
            all_ok = False

    print()
    # Verificar columnas clave de prendas_genericas
    cursor.execute("PRAGMA table_info(prendas_genericas)")
    pg_cols = {r[1] for r in cursor.fetchall()}
    for col in ["nombre", "categoria", "tallas", "estilos"]:
        ok = col in pg_cols
        log(f"prendas_genericas.{col}", "OK" if ok else "ERR")
        if not ok:
            all_ok = False

    # Verificar columnas clave de tbl_articulo
    cursor.execute("PRAGMA table_info(tbl_articulo)")
    art_cols = {r[1] for r in cursor.fetchall()}
    for col in ["titulo", "contenido", "grupo_id", "tags", "publicado_en"]:
        ok = col in art_cols
        log(f"tbl_articulo.{col}", "OK" if ok else "ERR")
        if not ok:
            all_ok = False

    print()
    # Conteo de filas
    for t in sorted(tables - {"sqlite_sequence"}):
        cursor.execute(f"SELECT COUNT(*) FROM {t}")
        count = cursor.fetchone()[0]
        log(f"{t}: {count} filas", "INFO")

    conn.close()
    print()
    if all_ok:
        print("  ✅  Migración verificada correctamente.\n")
    else:
        print("  ❌  Se encontraron errores. Revisar el log.\n")
    return all_ok


# ── Entry point ───────────────────────────────────────────
if __name__ == "__main__":
    migrate()
