import sqlite3
import json

conn = sqlite3.connect('asesoria.db')
c = conn.cursor()

# 1. Definir los parámetros
TIPO_ASESORIA = 'guia_compras_general'
MENU_SERVICIO_ID = 26  # ID del menú 'Guia de compras' en tbl_menu_servicios
ORDEN_EN_MENU = 1

config_data = {
  "introduccion": "La inteligencia artificial de TheorIA M usará los datos de tus características físicas, gustos y preferencias en busca de sugerirte las mejores prendas que te ayuden a lograr el objetivo de lograr la mejor versión de tu figura.",
  "media_url": "/images/avatar_sketch.svg",
  "media_tipo": "imagen",
  "tarjetas": [
    {
      "icono_url": "/images/iconos/camera.svg",
      "titulo": "Tu armario basico",
      "descripcion": "Segun tus caracteristicas fisicas te presentamos un armario basico.",
      "navegacion_subtema": "Guardarropa"
    },
    {
      "icono_url": "/images/iconos/camera.svg",
      "titulo": "Busqueda por evento/ ocasion",
      "descripcion": "Bodas, entrevistas trabajo, con clientes, cena con amigos, fin de semana",
      "navegacion_subtema": "Bríndame asesoría"
    },
    {
      "icono_url": "/images/iconos/camera.svg",
      "titulo": "Por roles de vida",
      "descripcion": "Trabajo, estudio, deporte",
      "navegacion_subtema": "Bríndame asesoría"
    },
    {
      "icono_url": "/images/iconos/camera.svg",
      "titulo": "Regalos",
      "descripcion": "Segun tus caracteristicas fisicas te presentamos un armario basico.",
      "navegacion_subtema": "Guardarropa"
    },
    {
      "icono_url": "/images/iconos/camera.svg",
      "titulo": "Alertas de precios",
      "descripcion": "Tus guardados que esperaban promociones o descuentos",
      "navegacion_subtema": "Guia de compras"
    },
    {
      "icono_url": "/images/iconos/camera.svg",
      "titulo": "Actualizar mi perfil",
      "descripcion": "Tener actualizados tus datos te permitira aprovechar mejor las asesorias de la IA",
      "navegacion_route": "/datos-morfologicos"
    },
    {
      "icono_url": "/images/iconos/camera.svg",
      "titulo": "Accesorios",
      "descripcion": "Los accesorios que mejor combinan y favorecen tu figura",
      "navegacion_subtema": "Guardarropa"
    },
    {
      "icono_url": "/images/iconos/camera.svg",
      "titulo": "Optimizar tu armario",
      "descripcion": "En base a lo que ya tienes la IA puede sugerirte prendas claves que te multiples combinaciones y ampliar tus posibilidades",
      "navegacion_subtema": "Guardarropa"
    }
  ]
}

# Limpiar registros existentes de este tipo de asesoría para evitar duplicados
c.execute("DELETE FROM tbl_articulo WHERE tipo_asesoria = ?", (TIPO_ASESORIA,))
c.execute("DELETE FROM tbl_menu_asesoria WHERE tipo_asesoria = ?", (TIPO_ASESORIA,))

# Insertar para usuario 1 (desarrollo/guest) y usuario 102030 (Natalia)
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
        'Guía de Compras Personalizada'
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
        'Servicios/Guia de compras',
        '<!-- [guia_compras] -->\n',
        '',
        'Guía de compras',
        ORDEN_EN_MENU,
        uid,
        TIPO_ASESORIA,
        'Componente GuiaComprasComponent, carga configuraciones en JSON de tbl_articulo',
        1,
        'Guía de compras'
    ))
    print(f'Marcador [guia_compras] insertado en tbl_menu_asesoria para usuario={uid}')

conn.commit()
conn.close()
print('Listo.')
