import sqlite3

conn = sqlite3.connect('asesoria.db')
conn.row_factory = sqlite3.Row
c = conn.cursor()

# Verificar si ya existe una fila con RAPIDA_MARKER para el menu 28
c.execute("SELECT id FROM tbl_menu_asesoria WHERE texto_html LIKE '%RAPIDA_MARKER%' AND menu_servicio_id = 28")
existing = c.fetchone()

if not existing:
    c.execute("""
        INSERT INTO tbl_menu_asesoria
            (menu_servicio_id, menu_principal, texto_html, imagen_url, imagen_alt,
             orden, id_usuario, tipo_asesoria, observacion, tipo_prenda, visible)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        28,                          # menu_servicio_id
        'Servicios/ *rapida*',       # menu_principal
        '<!-- RAPIDA_MARKER -->\r\n',# texto_html — marcador del componente
        '',                          # imagen_url
        'Asesoría rápida',           # imagen_alt
        2,                           # orden (entre los carruseles)
        1,                           # id_usuario
        'Blusa Wrap',                # tipo_asesoria — filtra tbl_asesoria_rapida
        'AsesoriaRapidaComponent, toma datos de tbl_asesoria_rapida',
        'Blusa Wrap',                # tipo_prenda
        1                            # visible
    ))
    conn.commit()
    print(f'Fila insertada con id={c.lastrowid}')
else:
    print(f'Ya existe fila con RAPIDA_MARKER: id={existing["id"]}')

print()
print('=== tbl_menu_asesoria con marcadores ===')
c.execute("""
    SELECT id, orden, tipo_asesoria, tipo_prenda,
           substr(texto_html,1,40) as marcador, observacion
    FROM tbl_menu_asesoria
    WHERE texto_html LIKE '%MARKER%'
    ORDER BY orden
""")
for r in c.fetchall(): print(dict(r))
conn.close()
