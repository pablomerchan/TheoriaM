import sqlite3

conn = sqlite3.connect('asesoria.db')
conn.row_factory = sqlite3.Row
c = conn.cursor()

print('=== Contenido exacto de registros con html_len corto ===')
c.execute("SELECT id, tipo_prenda, text_html, imagen_url FROM prendas_genericas WHERE length(text_html) < 50")
for r in c.fetchall():
    d = dict(r)
    print(f"id={d['id']} tipo_prenda='{d['tipo_prenda']}' text_html='{d['text_html']}' imagen_url='{d['imagen_url']}'")

print()
print('=== Valores exactos de tipo_asesoria en tbl_menu_asesoria ===')
c.execute("SELECT id, tipo_asesoria, id_usuario FROM tbl_menu_asesoria")
for r in c.fetchall():
    d = dict(r)
    print(f"id={d['id']} tipo_asesoria='{d['tipo_asesoria']}' id_usuario={d['id_usuario']}")

print()
print('=== Valores exactos de tipo_prenda en prendas_genericas ===')
c.execute("SELECT DISTINCT tipo_prenda, COUNT(*) as cnt FROM prendas_genericas GROUP BY tipo_prenda")
for r in c.fetchall():
    print(dict(r))

conn.close()
