import sqlite3

conn = sqlite3.connect('asesoria.db')
conn.row_factory = sqlite3.Row
c = conn.cursor()

for tipo in ['Blusa Wrap', 'Blusas_tipo_cruzadas']:
    print(f'=== /api/asesorias?id_usuario=1&tipo_asesoria={tipo} ===')
    c.execute("""
        SELECT id, imagen_url, tipo_prenda, visible, orden,
               length(text_html) as html_len
        FROM prendas_genericas
        WHERE (visible IS NULL OR visible = 1)
          AND (id_usuario IS NULL OR id_usuario = 1)
          AND (tipo_prenda IS NULL OR tipo_prenda = ?)
        ORDER BY orden ASC
    """, (tipo,))
    rows = c.fetchall()
    print(f'  Filas: {len(rows)}')
    for r in rows:
        d = dict(r)
        print(f"  id={d['id']} imagen={d['imagen_url'][-30:]} html_len={d['html_len']}")
    print()

conn.close()
