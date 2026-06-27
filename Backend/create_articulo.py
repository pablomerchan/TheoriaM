import sqlite3

conn = sqlite3.connect('asesoria.db')
conn.row_factory = sqlite3.Row
c = conn.cursor()

# Crear tabla tbl_articulo
c.execute('''
    CREATE TABLE IF NOT EXISTS tbl_articulo (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        id_usuario  INTEGER NOT NULL DEFAULT 1,
        texto_html  TEXT    NOT NULL DEFAULT '',
        media_url   TEXT    DEFAULT NULL,
        media_tipo  TEXT    NOT NULL DEFAULT 'imagen',
        orden       INTEGER NOT NULL DEFAULT 0,
        tipo_asesoria TEXT  DEFAULT NULL,
        visible     INTEGER NOT NULL DEFAULT 1
    )
''')
conn.commit()

# Insertar registro de ejemplo
c.execute("SELECT COUNT(*) FROM tbl_articulo WHERE id_usuario = 1")
if c.fetchone()[0] == 0:
    c.execute("""
        INSERT INTO tbl_articulo
            (id_usuario, texto_html, media_url, media_tipo, orden, tipo_asesoria)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        1,
        """<h3>Blusa Wrap Clásica</h3>
<p>La blusa wrap clásica es una de las prendas más versátiles para tu silueta tipo reloj de arena. Su diseño cruzado <strong>marca la cintura naturalmente</strong> y crea un escote en V que alarga el cuello.</p>
<p><strong>¿Por qué te favorece?</strong></p>
<ul>
  <li>Resalta tu cintura sin esfuerzo</li>
  <li>El escote en V alarga visualmente el cuello</li>
  <li>Equilibra hombros y caderas</li>
  <li>Funciona para ocasiones casuales y formales</li>
</ul>
<p>Combínala con pantalones de tiro alto o faldas midi para un look completo y favorecedor.</p>""",
        '/images/prendas/BlusaWrapClasica.png',
        'imagen',
        1,
        'Blusa Wrap'
    ))
    conn.commit()
    print(f'Registro de ejemplo insertado con id={c.lastrowid}')

# Insertar marcador en tbl_menu_asesoria
c.execute("SELECT id FROM tbl_menu_asesoria WHERE texto_html LIKE '%ARTICULO_MARKER%' AND menu_servicio_id = 28")
if not c.fetchone():
    c.execute("""
        INSERT INTO tbl_menu_asesoria
            (menu_servicio_id, menu_principal, texto_html, imagen_url, imagen_alt,
             orden, id_usuario, tipo_asesoria, observacion, tipo_prenda, visible)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        28,
        'Servicios/ *articulo*',
        '<!-- ARTICULO_MARKER -->\r\n',
        '',
        'Artículo de asesoría',
        4,
        1,
        'Blusa Wrap',
        'ArticuloComponent, toma datos de tbl_articulo',
        'Blusa Wrap',
        1
    ))
    conn.commit()
    print(f'Marcador ARTICULO_MARKER insertado con id={c.lastrowid}')

print()
print('=== tbl_articulo ===')
c.execute('SELECT id, id_usuario, media_url, media_tipo, tipo_asesoria, length(texto_html) as html_len FROM tbl_articulo')
for r in c.fetchall(): print(dict(r))

print()
print('=== Marcadores en tbl_menu_asesoria ===')
c.execute("SELECT id, orden, tipo_asesoria, substr(texto_html,1,40) as marcador FROM tbl_menu_asesoria WHERE texto_html LIKE '%MARKER%' ORDER BY orden")
for r in c.fetchall(): print(dict(r))

conn.close()
