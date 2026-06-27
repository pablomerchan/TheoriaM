import sqlite3

conn = sqlite3.connect('asesoria.db')
c = conn.cursor()

# Agregar columna texto_html (idempotente)
try:
    c.execute("ALTER TABLE tbl_asesoria_rapida ADD COLUMN texto_html TEXT DEFAULT NULL")
    conn.commit()
    print("Columna texto_html agregada.")
except Exception as e:
    print(f"Columna ya existe o error: {e}")

# Actualizar los registros existentes con texto de ejemplo
texto_ejemplo = """<h3>Blusas Wrap</h3>
<p>Las blusas tipo wrap son ideales para tu silueta. Se adaptan a la cintura realzando la zona más estrecha del torso y crean un escote en V que alarga visualmente el cuello.</p>
<p><strong>¿Por qué te favorecen?</strong></p>
<ul>
  <li>Marcan la cintura naturalmente</li>
  <li>Equilibran hombros y caderas</li>
  <li>Versátiles para cualquier ocasión</li>
</ul>"""

c.execute("UPDATE tbl_asesoria_rapida SET texto_html = ? WHERE id_usuario = 1", (texto_ejemplo,))
conn.commit()
print(f"Registros actualizados: {c.rowcount}")

conn.row_factory = sqlite3.Row
c2 = conn.cursor()
c2.execute("SELECT id, imagen_url, orden, length(texto_html) as html_len FROM tbl_asesoria_rapida")
for r in c2.fetchall(): print(dict(r))
conn.close()
