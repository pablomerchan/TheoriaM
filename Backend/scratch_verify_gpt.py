import sqlite3
conn = sqlite3.connect('asesoria.db')
conn.row_factory = sqlite3.Row
c = conn.cursor()

print('=== tbl_menu_asesoria con MARKERS (menu_servicio_id=28) ===')
c.execute("""SELECT id, menu_servicio_id, orden, tipo_asesoria, titulo,
                    substr(texto_html, 1, 50) as marcador
             FROM tbl_menu_asesoria
             WHERE texto_html LIKE '%MARKER%' AND menu_servicio_id = 28
             ORDER BY orden""")
for r in c.fetchall():
    print(dict(r))

print()
print('=== tbl_articulo con tipo_asesoria=presentacion ===')
c.execute("""SELECT id, id_usuario, tipo_asesoria, titulo, length(texto_html) html_len
             FROM tbl_articulo WHERE tipo_asesoria = 'presentacion'""")
for r in c.fetchall():
    print(dict(r))

conn.close()
