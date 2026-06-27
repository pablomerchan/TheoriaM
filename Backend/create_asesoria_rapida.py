import sqlite3

conn = sqlite3.connect('asesoria.db')
c = conn.cursor()

c.execute('''
    CREATE TABLE IF NOT EXISTS tbl_asesoria_rapida (
        id                    INTEGER PRIMARY KEY AUTOINCREMENT,
        id_usuario            INTEGER NOT NULL DEFAULT 1,
        imagen_url            TEXT    NOT NULL,
        velocidad_reproduccion INTEGER NOT NULL DEFAULT 1500,
        orden                 INTEGER NOT NULL DEFAULT 0,
        tipo_asesoria         TEXT    DEFAULT NULL,
        visible               INTEGER NOT NULL DEFAULT 1
    )
''')

# Datos de ejemplo para el usuario 1
c.execute("SELECT COUNT(*) FROM tbl_asesoria_rapida WHERE id_usuario = 1")
if c.fetchone()[0] == 0:
    fotos = [
        (1, '/images/prendas/BlusasTpoCruzadasNegra.png',    1500, 1, 'Blusa Wrap'),
        (1, '/images/prendas/BlusaWrapClasica.png',           1500, 2, 'Blusa Wrap'),
        (1, '/images/prendas/BluzaWarpCorta.png',             1500, 3, 'Blusa Wrap'),
        (1, '/images/prendas/BluzaWrapPeplum.png',            1500, 4, 'Blusa Wrap'),
        (1, '/images/prendas/BlusaWrapFalso_EfectoCruzado.png', 1500, 5, 'Blusa Wrap'),
        (1, '/images/prendas/BlusaWrapMangasVoluminosas.png', 1500, 6, 'Blusa Wrap'),
        (1, '/images/prendas/BlusaWrapKimono.png',            1500, 7, 'Blusa Wrap'),
        (1, '/images/prendas/BlusaWrapBodySuit.png',          1500, 8, 'Blusa Wrap'),
        (1, '/images/prendas/BlusaWrapClasicaHolgada.png',   1500, 9, 'Blusa Wrap'),
    ]
    c.executemany(
        'INSERT INTO tbl_asesoria_rapida (id_usuario, imagen_url, velocidad_reproduccion, orden, tipo_asesoria) VALUES (?,?,?,?,?)',
        fotos
    )

conn.commit()
print('Tabla tbl_asesoria_rapida creada y poblada.')
conn.row_factory = sqlite3.Row
c2 = conn.cursor()
c2.execute('SELECT * FROM tbl_asesoria_rapida')
for r in c2.fetchall(): print(dict(r))
conn.close()
