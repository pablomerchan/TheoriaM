import sqlite3

conn = sqlite3.connect('asesoria.db')
conn.row_factory = sqlite3.Row
c = conn.cursor()
c.execute("PRAGMA foreign_keys = OFF")

# ── 1. tbl_carrusel_items: recrear sin tipo_prenda ───────────────────────────
c.execute("""
    CREATE TABLE tbl_carrusel_items_new (
        id                   INTEGER PRIMARY KEY AUTOINCREMENT,
        text_html            TEXT    NOT NULL,
        imagen_url           TEXT    NOT NULL,
        visible              BOOLEAN DEFAULT 1,
        orden                INTEGER DEFAULT 0,
        id_usuario           INTEGER DEFAULT 1,
        tipo_asesoria        TEXT,
        descripcion_registro TEXT,
        asesoria_id          INTEGER,
        nombre               TEXT,
        categoria            TEXT,
        tallas               TEXT    DEFAULT '[]',
        estilos              TEXT    DEFAULT '[]'
    )
""")
c.execute("""
    INSERT INTO tbl_carrusel_items_new
        (id, text_html, imagen_url, visible, orden, id_usuario,
         tipo_asesoria, descripcion_registro, asesoria_id, nombre, categoria, tallas, estilos)
    SELECT
        id, text_html, imagen_url, visible, orden, id_usuario,
        tipo_asesoria, descripcion_registro, asesoria_id, nombre, categoria, tallas, estilos
    FROM tbl_carrusel_items
""")
c.execute("DROP TABLE tbl_carrusel_items")
c.execute("ALTER TABLE tbl_carrusel_items_new RENAME TO tbl_carrusel_items")
print("tbl_carrusel_items: tipo_prenda eliminado OK")

# ── 2. tbl_menu_asesoria: recrear sin tipo_prenda ────────────────────────────
c.execute("""
    CREATE TABLE tbl_menu_asesoria_new (
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
        visible          INTEGER DEFAULT 1,
        titulo           TEXT    DEFAULT NULL
    )
""")
c.execute("""
    INSERT INTO tbl_menu_asesoria_new
        (id, menu_servicio_id, menu_principal, texto_html, imagen_url, imagen_alt,
         orden, id_usuario, tipo_asesoria, observacion, asesoria_id, visible, titulo)
    SELECT
        id, menu_servicio_id, menu_principal, texto_html, imagen_url, imagen_alt,
        orden, id_usuario, tipo_asesoria, observacion, asesoria_id, visible, titulo
    FROM tbl_menu_asesoria
""")
c.execute("DROP TABLE tbl_menu_asesoria")
c.execute("ALTER TABLE tbl_menu_asesoria_new RENAME TO tbl_menu_asesoria")
print("tbl_menu_asesoria: tipo_prenda eliminado OK")

c.execute("PRAGMA foreign_keys = ON")
conn.commit()

# Verificacion final
print()
print("=== tbl_carrusel_items columnas ===")
c.execute("PRAGMA table_info(tbl_carrusel_items)")
for r in c.fetchall(): print(f"  {r['cid']}: {r['name']} ({r['type']})")

print()
print("=== tbl_menu_asesoria columnas ===")
c.execute("PRAGMA table_info(tbl_menu_asesoria)")
for r in c.fetchall(): print(f"  {r['cid']}: {r['name']} ({r['type']})")

print()
c.execute("SELECT COUNT(*) FROM tbl_carrusel_items")
print("tbl_carrusel_items registros:", c.fetchone()[0])
c.execute("SELECT COUNT(*) FROM tbl_menu_asesoria")
print("tbl_menu_asesoria registros:", c.fetchone()[0])

conn.close()
