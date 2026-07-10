"""
Migracion A+B:
  B -> Agrega columna "componente" a tbl_menu_asesoria y la puebla desde marcadores en texto_html
  A -> Agrega columna "tipo_contenido" a tbl_articulo y migra tbl_carrusel_items a tbl_articulo
"""
import sqlite3

DB = r"c:\Empresas\TheoriaM\src\Backend\asesoria.db"
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
c = conn.cursor()

print("=== FASE B: columna componente en tbl_menu_asesoria ===")
try:
    c.execute("ALTER TABLE tbl_menu_asesoria ADD COLUMN componente TEXT DEFAULT NULL")
    print("  OK Columna componente creada")
except Exception as e:
    print(f"  SKIP {e}")

MARKER_MAP = [
    ("RAPIDA_MARKER", "rapida"),
    ("ARTICULO_MARKER", "articulo"),
    ("TEXTO_GPT_MARKER", "texto_gpt"),
    ("SUGERENCIA_DIARIA_MARKER", "sugerencia_diaria"),
    ("[mi_guarda_ropas]", "mi_guarda_ropas"),
    ("[guia_compras]", "guia_compras"),
    ("CAROUSEL_MARKER", "carousel"),
]
for marker, comp in MARKER_MAP:
    c.execute("""UPDATE tbl_menu_asesoria SET componente = ? WHERE componente IS NULL AND texto_html LIKE ?""", (comp, f"%{marker}%"))
    print(f"  {comp}: {c.rowcount} filas")

c.execute("SELECT COUNT(*) FROM tbl_menu_asesoria WHERE componente IS NULL")
print(f"  Sin componente (encabezados): {c.fetchone()[0]}")

print("\n=== FASE A: columna tipo_contenido en tbl_articulo ===")
try:
    c.execute("ALTER TABLE tbl_articulo ADD COLUMN tipo_contenido TEXT DEFAULT 'articulo'")
    print("  OK Columna tipo_contenido creada")
except Exception as e:
    print(f"  SKIP {e}")

c.execute("UPDATE tbl_articulo SET tipo_contenido = 'articulo' WHERE tipo_contenido IS NULL")
print(f"  Registros existentes marcados articulo: {c.rowcount}")

print("\n=== MIGRAR tbl_carrusel_items -> tbl_articulo ===")
c.execute("SELECT * FROM tbl_carrusel_items")
items = c.fetchall()
print(f"  Leyendo {len(items)} filas...")
migrated = 0
skipped = 0
for item in items:
    row = dict(item)
    c.execute("""SELECT COUNT(*) FROM tbl_articulo WHERE tipo_contenido='diapositiva' AND tipo_asesoria=? AND orden=? AND media_url=?""", (row.get("tipo_asesoria"), row.get("orden", 0), row.get("imagen_url")))
    if c.fetchone()[0] > 0:
        skipped += 1
        continue
    c.execute("""INSERT INTO tbl_articulo (texto_html, media_url, media_tipo, orden, tipo_asesoria, titulo, visible, tipo_contenido, grupo_id) VALUES (?,?,"imagen",?,?,?,?,"diapositiva",?)""", (
        row.get("text_html") or "",
        row.get("imagen_url") or "",
        row.get("orden", 0),
        row.get("tipo_asesoria"),
        row.get("nombre") or row.get("descripcion_registro") or "",
        1 if row.get("visible", 1) else 0,
        row.get("tipo_asesoria"),
    ))
    migrated += 1

print(f"  Migradas: {migrated}, Omitidas: {skipped}")

print("\n=== Verificacion ===")
c.execute("SELECT tipo_contenido, COUNT(*) as total FROM tbl_articulo GROUP BY tipo_contenido")
for r in c.fetchall():
    print(f"  tbl_articulo [{dict(r)['tipo_contenido']}]: {dict(r)['total']}")

c.execute("SELECT componente, COUNT(*) as total FROM tbl_menu_asesoria WHERE componente IS NOT NULL GROUP BY componente")
for r in c.fetchall():
    print(f"  tbl_menu_asesoria [componente={dict(r)['componente']}]: {dict(r)['total']}")

conn.commit()
conn.close()
print("\nMigracion completada exitosamente.")
