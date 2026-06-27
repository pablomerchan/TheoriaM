import sqlite3

HELP_DB = "interactive_help.db"

conn = sqlite3.connect(HELP_DB)
cursor = conn.cursor()

ayudas = [
    ("ubicacion_principal", "¿Tu ubicación principal?", "Tu lugar de residencia principal es vital para entender el contexto social y ambiental predominante en el que te desenvuelves.", None, None, 9),
    ("ubicacion_secundaria", "¿Tu ubicación secundaria?", "Tu lugar de trabajo frecuente o segunda residencia. Nos ayuda a adaptar el guardarropa a variaciones de entorno.", None, None, 10),
    ("hombros", "¿Cómo medir los hombros?", "Mide de un extremo al otro de los hombros (por la espalda). Esta medida ayuda a entender la estructura superior y definir la silueta.", None, None, 11),
    ("cintura", "¿Cómo medir la cintura?", "Mide alrededor de la parte más estrecha del torso (generalmente justo por encima del ombligo).", None, None, 12),
    ("cadera", "¿Cómo medir la cadera?", "Mide alrededor de la parte más prominente de los glúteos y cadera. Clave para el balance visual inferior.", None, None, 13),
    ("busto", "¿Cómo medir el busto?", "Mide alrededor de la parte más prominente del pecho. Ayuda a definir proporciones de la parte superior.", None, None, 14),
]

for ayuda in ayudas:
    cursor.execute("SELECT COUNT(*) FROM datos_personales WHERE campo = ?", (ayuda[0],))
    if cursor.fetchone()[0] == 0:
        cursor.execute('''
            INSERT INTO datos_personales (campo, titulo, texto, imageUrl, videoUrl, orden)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', ayuda)

conn.commit()
conn.close()
print("Interactive help updated.")
