import sqlite3

conn = sqlite3.connect('asesoria.db')
conn.row_factory = sqlite3.Row
c = conn.cursor()

c.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
print('Tablas:', [r['name'] for r in c.fetchall()])

c.execute("SELECT COUNT(*) as cnt FROM tbl_carrusel_items")
print('tbl_carrusel_items registros:', c.fetchone()['cnt'])

# Verificar que prendas_genericas ya no existe
c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='prendas_genericas'")
old = c.fetchone()
print('prendas_genericas aun existe:', old is not None)

conn.close()
print('OK')
