import sqlite3

conn = sqlite3.connect('asesoria.db')
c = conn.cursor()

# Corregir id=3: tipo_prenda estaba NULL, debe ser 'Blusa Wrap' para enlazar con prendas_genericas
c.execute("UPDATE tbl_menu_asesoria SET tipo_prenda = 'Blusa Wrap' WHERE id = 3")
conn.commit()

print('=== tbl_menu_asesoria carruseles (con CAROUSEL_MARKER) ===')
conn.row_factory = sqlite3.Row
c = conn.cursor()
c.execute("""
    SELECT id, menu_servicio_id, tipo_asesoria, tipo_prenda, id_usuario, orden, visible
    FROM tbl_menu_asesoria
    WHERE texto_html LIKE '%CAROUSEL_MARKER%'
    ORDER BY orden
""")
for r in c.fetchall():
    print(dict(r))

conn.close()
print('Listo.')
