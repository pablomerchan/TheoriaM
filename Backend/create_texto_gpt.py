import sqlite3

conn = sqlite3.connect('asesoria.db')
conn.row_factory = sqlite3.Row
c = conn.cursor()

# ──────────────────────────────────────────────────────────────────────────────
# 1. Insertar contenido de texto en tbl_articulo
#    Se reutiliza la misma tabla que ArticuloComponent.
#    El campo 'tipo_asesoria' diferencia este contenido del resto.
# ──────────────────────────────────────────────────────────────────────────────
TIPO_ASESORIA = 'presentacion'
MENU_SERVICIO_ID = 28          # Mismo menú que los otros componentes de prueba
ORDEN_EN_MENU   = 1            # Aparece primero dentro del menú

c.execute("SELECT COUNT(*) FROM tbl_articulo WHERE tipo_asesoria = ?", (TIPO_ASESORIA,))
if c.fetchone()[0] == 0:
    c.execute("""
        INSERT INTO tbl_articulo
            (id_usuario, texto_html, media_url, media_tipo, orden, tipo_asesoria, titulo)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        1,
        """<h3>Bienvenida a tu Asesoría de Imagen</h3>
<p>En <strong>TheorIA M</strong> creemos que la moda es un lenguaje, y nosotras te enseñamos a hablarlo con fluidez y confianza.</p>
<p>Aquí encontrarás guías personalizadas sobre:</p>
<ul>
  <li>🎨 Análisis de color y paleta personal</li>
  <li>👗 Estilo y morfología corporal</li>
  <li>✨ Cómo construir un guardarropa cápsula funcional</li>
  <li>💡 Consejos de imagen para cada ocasión</li>
</ul>
<p>Explora el menú lateral para descubrir cada sección. <strong>Tu transformación comienza aquí.</strong></p>""",
        None,          # media_url  (solo texto, sin imagen)
        'imagen',      # media_tipo (valor por defecto requerido)
        1,             # orden
        TIPO_ASESORIA,
        'Bienvenida a tu Asesoría de Imagen'
    ))
    conn.commit()
    print(f'Registro en tbl_articulo insertado con id={c.lastrowid}')
else:
    print(f'Ya existe un registro en tbl_articulo con tipo_asesoria="{TIPO_ASESORIA}"')

# ──────────────────────────────────────────────────────────────────────────────
# 2. Insertar marcador TEXTO_GPT_MARKER en tbl_menu_asesoria
#    Este marcador indica al backend que debe montar TextoGPTComponent.
#    El campo 'tipo_asesoria' debe coincidir con el del registro en tbl_articulo.
# ──────────────────────────────────────────────────────────────────────────────
c.execute(
    "SELECT id FROM tbl_menu_asesoria WHERE texto_html LIKE '%TEXTO_GPT_MARKER%' AND menu_servicio_id = ?",
    (MENU_SERVICIO_ID,)
)
if not c.fetchone():
    c.execute("""
        INSERT INTO tbl_menu_asesoria
            (menu_servicio_id, menu_principal, texto_html, imagen_url, imagen_alt,
             orden, id_usuario, tipo_asesoria, observacion, visible, titulo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        MENU_SERVICIO_ID,
        'Servicios/ *texto_gpt*',
        '<!-- TEXTO_GPT_MARKER -->\r\n',
        '',
        'Texto estilo GPT',
        ORDEN_EN_MENU,
        1,
        TIPO_ASESORIA,
        'TextoGPTComponent, toma datos de tbl_articulo (solo texto_html)',
        1,
        'Bienvenida a tu Asesoría de Imagen'
    ))
    conn.commit()
    print(f'Marcador TEXTO_GPT_MARKER insertado con id={c.lastrowid}')
else:
    print(f'Ya existe una fila con TEXTO_GPT_MARKER en menu_servicio_id={MENU_SERVICIO_ID}')

# ──────────────────────────────────────────────────────────────────────────────
# 3. Verificación
# ──────────────────────────────────────────────────────────────────────────────
print()
print('=== tbl_articulo (tipo_asesoria = presentacion) ===')
c.execute(
    'SELECT id, id_usuario, tipo_asesoria, titulo, length(texto_html) as html_len FROM tbl_articulo WHERE tipo_asesoria = ?',
    (TIPO_ASESORIA,)
)
for r in c.fetchall():
    print(dict(r))

print()
print('=== Marcadores en tbl_menu_asesoria ===')
c.execute("""
    SELECT id, orden, tipo_asesoria, titulo,
           substr(texto_html, 1, 50) as marcador, observacion
    FROM tbl_menu_asesoria
    WHERE texto_html LIKE '%MARKER%'
    ORDER BY orden
""")
for r in c.fetchall():
    print(dict(r))

conn.close()
