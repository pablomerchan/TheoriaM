import sqlite3

conn = sqlite3.connect('asesoria.db')
c = conn.cursor()

c.execute("ALTER TABLE prendas_genericas RENAME TO tbl_carrusel_items")
conn.commit()

# Verificar
c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='tbl_carrusel_items'")
print('Tabla renombrada:', c.fetchone())

c.execute("SELECT COUNT(*) FROM tbl_carrusel_items")
print('Registros:', c.fetchone()[0])

conn.close()
