import sqlite3
import os
DB_PATH = os.path.join(os.path.dirname(__file__), 'carousel.db')
print('DB:', DB_PATH)
conn = sqlite3.connect(DB_PATH)
c = conn.cursor()
# obtener columnas actuales
c.execute("PRAGMA table_info(tbl_carrusel)")
cols = [r[1] for r in c.fetchall()]
print('Existing columns:', cols)
if 'orden' not in cols:
    print('Adding column orden')
    c.execute("ALTER TABLE tbl_carrusel ADD COLUMN orden INTEGER DEFAULT 0")
else:
    print('Column orden already exists')
if 'visible' not in cols:
    print('Adding column visible')
    c.execute("ALTER TABLE tbl_carrusel ADD COLUMN visible INTEGER DEFAULT 1")
else:
    print('Column visible already exists')
conn.commit()
conn.close()
print('Done')
