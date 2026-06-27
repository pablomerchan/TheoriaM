import sqlite3

conn = sqlite3.connect('asesoria.db')
conn.row_factory = sqlite3.Row
c = conn.cursor()

print('=== Simulacion /api/asesorias?id_usuario=1&tipo_asesoria=Blusa Wrap ===')
c.execute("""
    SELECT id, imagen_url, tipo_prenda, id_usuario, visible, orden,
           length(text_html) as html_len, substr(text_html, 1, 60) as html_preview
    FROM prendas_genericas
    WHERE (id_usuario IS NULL OR id_usuario = 1)
      AND (tipo_prenda IS NULL OR tipo_prenda = 'Blusa Wrap')
    ORDER BY orden ASC
""")
for r in c.fetchall():
    print(dict(r))

print()
print('=== Simulacion /api/asesorias?id_usuario=1&tipo_asesoria=Blusas_tipo_cruzadas ===')
c.execute("""
    SELECT id, imagen_url, tipo_prenda, id_usuario, visible, orden,
           length(text_html) as html_len, substr(text_html, 1, 60) as html_preview
    FROM prendas_genericas
    WHERE (id_usuario IS NULL OR id_usuario = 1)
      AND (tipo_prenda IS NULL OR tipo_prenda = 'Blusas_tipo_cruzadas')
    ORDER BY orden ASC
""")
for r in c.fetchall():
    print(dict(r))

print()
print('=== Verificar campo text_html en prendas_genericas (todos) ===')
c.execute("PRAGMA table_info(prendas_genericas)")
for r in c.fetchall():
    print(dict(r))

conn.close()
