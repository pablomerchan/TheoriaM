import sqlite3
import json

conn = sqlite3.connect('asesoria.db')
c = conn.cursor()

# 1. Definir los parámetros
TIPO_ASESORIA = 'guardarropa_digital'
MENU_SERVICIO_ID = 27  # ID del menú 'Guardarropa'
ORDEN_EN_MENU = 1

config_data = {
  "prenda": {
    "descripcion": "Camisa blanca",
    "categoria": "Superior > Camisa",
    "tipo": "Manga corta",
    "material": "Lino",
    "estado": "Excelente",
    "clima": "Verano",
    "ocasiones": ["Casual", "Fin de semana", "Playa"]
  },
  "opciones": {
    "categorias": [
      "Superior > Camisa",
      "Superior > Camiseta",
      "Superior > Top",
      "Superior > Blusa",
      "Inferior > Pantalón",
      "Inferior > Falda",
      "Inferior > Short",
      "Abrigo > Chaqueta",
      "Abrigo > Blazer",
      "Calzado > Tenis",
      "Calzado > Zapatos",
      "Calzado > Sandalias"
    ],
    "tipos": [
      "Manga corta",
      "Manga larga",
      "Sin mangas",
      "Tres cuartos",
      "Corte regular",
      "Oversize",
      "Ajustado",
      "Corto"
    ],
    "materiales": [
      "Lino",
      "Algodón",
      "Lana",
      "Seda",
      "Mezclilla (Denim)",
      "Poliéster",
      "Cuero",
      "Punto"
    ],
    "estados": [
      "Excelente",
      "Bueno",
      "Regular",
      "Desgastado"
    ],
    "climas": [
      "Verano",
      "Primavera",
      "Otoño",
      "Invierno",
      "Templado",
      "Lluvia",
      "Fresco"
    ],
    "ocasiones": [
      "Casual",
      "Fin de semana",
      "Playa",
      "Trabajo / Oficina",
      "Semisolemn / Cóctel",
      "Deportivo",
      "Gala / Formal"
    ]
  }
}

# Limpiar registros existentes de este tipo de asesoría para evitar duplicados
c.execute("DELETE FROM tbl_articulo WHERE tipo_asesoria = ?", (TIPO_ASESORIA,))
c.execute("DELETE FROM tbl_menu_asesoria WHERE tipo_asesoria = ?", (TIPO_ASESORIA,))

# Insertar para usuario 1 y usuario 102030 (Natalia)
usuarios = [1, 102030]

for uid in usuarios:
    # 2. Insertar en tbl_articulo
    c.execute("""
        INSERT INTO tbl_articulo
            (id_usuario, texto_html, media_url, media_tipo, orden, tipo_asesoria, titulo)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        uid,
        json.dumps(config_data, ensure_ascii=False),
        None,
        'imagen',
        1,
        TIPO_ASESORIA,
        'Mi guardarropas digitalizado'
    ))
    print(f'Registro en tbl_articulo insertado para usuario={uid}')

    # 3. Insertar en tbl_menu_asesoria
    c.execute("""
        INSERT INTO tbl_menu_asesoria
            (menu_servicio_id, menu_principal, texto_html, imagen_url, imagen_alt,
             orden, id_usuario, tipo_asesoria, observacion, visible, titulo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        MENU_SERVICIO_ID,
        'Servicios/Guardarropa',
        '<!-- [mi_guarda_ropas] -->\n',
        '',
        'Mi guardarropas digitalizado',
        ORDEN_EN_MENU,
        uid,
        TIPO_ASESORIA,
        'Componente MiGuardaRopasComponent, carga configuraciones en JSON de tbl_articulo',
        1,
        'Mi guardarropas digitalizado'
    ))
    print(f'Marcador [mi_guarda_ropas] insertado en tbl_menu_asesoria para usuario={uid}')

conn.commit()
conn.close()
print('Listo.')
