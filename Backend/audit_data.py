import sqlite3

conn = sqlite3.connect('asesoria.db')
conn.row_factory = sqlite3.Row
c = conn.cursor()

print('=== prendas_genericas ===')
c.execute('SELECT id, imagen_url, tipo_prenda, id_usuario, visible, orden, text_html FROM prendas_genericas ORDER BY orden')
for r in c.fetchall():
    d = dict(r)
    issues = []
    if not d.get('imagen_url'):
        issues.append('imagen_url VACIA')
    if not d.get('text_html'):
        issues.append('text_html VACIO')
    if not d.get('tipo_prenda'):
        issues.append('tipo_prenda NULO')
    if d.get('visible') == 0:
        issues.append('visible=0')
    preview = {'id': d['id'], 'tipo_prenda': d['tipo_prenda'], 'id_usuario': d['id_usuario'],
               'imagen_url': d['imagen_url'], 'html_len': len(d['text_html'] or '')}
    print(preview, ' ISSUES:', issues if issues else 'OK')

print()
print('=== tbl_menu_asesoria (con CAROUSEL_MARKER) ===')
c.execute("SELECT id, tipo_asesoria, id_usuario, imagen_url, orden, texto_html FROM tbl_menu_asesoria WHERE texto_html LIKE '%CAROUSEL_MARKER%'")
for r in c.fetchall():
    d = dict(r)
    issues = []
    if not d.get('tipo_asesoria'):
        issues.append('tipo_asesoria NULO')
    if not d.get('id_usuario'):
        issues.append('id_usuario NULO')
    preview = {'id': d['id'], 'tipo_asesoria': d['tipo_asesoria'], 'id_usuario': d['id_usuario'],
               'html_len': len(d['texto_html'] or '')}
    print(preview, ' ISSUES:', issues if issues else 'OK')

print()
print('=== Simulacion endpoint /api/asesorias?id_usuario=1&tipo_asesoria=Blusa Wrap ===')
c.execute("""
    SELECT id, imagen_url, tipo_prenda, id_usuario, text_html
    FROM prendas_genericas
    WHERE (id_usuario IS NULL OR id_usuario = 1)
      AND (tipo_prenda IS NULL OR tipo_prenda = 'Blusa Wrap')
    ORDER BY orden ASC
""")
rows = c.fetchall()
print(f'Filas devueltas: {len(rows)}')
for r in rows:
    d = dict(r)
    issues = []
    if not d.get('imagen_url'): issues.append('imagen_url VACIA')
    if not d.get('text_html'): issues.append('text_html VACIO')
    print({'id': d['id'], 'imagen_url': d['imagen_url'][:40] if d['imagen_url'] else '', 'html_len': len(d['text_html'] or '')}, 'ISSUES:', issues if issues else 'OK')

print()
print('=== Simulacion endpoint /api/asesorias?id_usuario=1&tipo_asesoria=BlusasTopCruzadas ===')
c.execute("""
    SELECT id, imagen_url, tipo_prenda, id_usuario, text_html
    FROM prendas_genericas
    WHERE (id_usuario IS NULL OR id_usuario = 1)
      AND (tipo_prenda IS NULL OR tipo_prenda = 'BlusasTopCruzadas')
    ORDER BY orden ASC
""")
rows = c.fetchall()
print(f'Filas devueltas: {len(rows)}')
for r in rows:
    d = dict(r)
    issues = []
    if not d.get('imagen_url'): issues.append('imagen_url VACIA')
    if not d.get('text_html'): issues.append('text_html VACIO')
    print({'id': d['id'], 'imagen_url': d['imagen_url'][:40] if d['imagen_url'] else '', 'html_len': len(d['text_html'] or '')}, 'ISSUES:', issues if issues else 'OK')

conn.close()
