import sqlite3

conn = sqlite3.connect('asesoria.db')
conn.row_factory = sqlite3.Row
c = conn.cursor()

print('=== tbl_carrusel_items columnas ===')
c.execute("PRAGMA table_info(tbl_carrusel_items)")
for r in c.fetchall(): print(dict(r))

print()
print('=== tbl_menu_asesoria columnas ===')
c.execute("PRAGMA table_info(tbl_menu_asesoria)")
for r in c.fetchall(): print(dict(r))

print()
print('=== tbl_menu_asesoria valores tipo_prenda ===')
c.execute("SELECT DISTINCT tipo_prenda FROM tbl_menu_asesoria")
for r in c.fetchall(): print(dict(r))

conn.close()
