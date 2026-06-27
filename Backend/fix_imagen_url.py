import sqlite3

conn = sqlite3.connect('asesoria.db')
conn.row_factory = sqlite3.Row
c = conn.cursor()

# Ver registros con imagen_url numérico
c.execute("SELECT id, imagen_url, typeof(imagen_url) as tipo FROM tbl_menu_asesoria")
for r in c.fetchall():
    d = dict(r)
    if d['tipo'] != 'text' and d['tipo'] != 'null':
        print(f"Fixing id={d['id']} imagen_url={d['imagen_url']} tipo={d['tipo']}")
        c.execute("UPDATE tbl_menu_asesoria SET imagen_url = '' WHERE id = ?", (d['id'],))

conn.commit()
print('Done.')
conn.close()
