import sqlite3

conn = sqlite3.connect('asesoria.db')
conn.row_factory = sqlite3.Row
c = conn.cursor()

# Alinear tipo_asesoria en tbl_menu_asesoria con tipo_prenda en prendas_genericas
# Artículo id=3: 'bluzas_warp' -> 'Blusa Wrap' (coincide con prendas_genericas)
c.execute("UPDATE tbl_menu_asesoria SET tipo_asesoria = 'Blusa Wrap' WHERE id = 3")
conn.commit()

print('=== tbl_menu_asesoria actualizado ===')
c.execute('SELECT id, tipo_asesoria, id_usuario, menu_servicio_id FROM tbl_menu_asesoria')
for r in c.fetchall():
    print(dict(r))

print()
print('=== tipos distintos en prendas_genericas ===')
c.execute('SELECT DISTINCT tipo_prenda, id_usuario FROM prendas_genericas')
for r in c.fetchall():
    print(dict(r))

conn.close()
