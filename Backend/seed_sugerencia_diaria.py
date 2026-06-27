import sqlite3
import json

ASESORIA_DB = "asesoria.db"

def seed():
    conn = sqlite3.connect(ASESORIA_DB)
    cursor = conn.cursor()

    # 1. Clean existing records for sugerencia_diaria to allow clean re-runs
    cursor.execute("DELETE FROM tbl_menu_asesoria WHERE tipo_asesoria = 'sugerencia_diaria' AND id_usuario = 102030")
    cursor.execute("DELETE FROM tbl_articulo WHERE tipo_asesoria = 'sugerencia_diaria' AND id_usuario = 102030")

    # 2. Insert into tbl_menu_asesoria
    menu_data = (
        27,                                     # menu_servicio_id (Guardarropa)
        "Servicios/Guardarropa",                # menu_principal
        "<!-- SUGERENCIA_DIARIA_MARKER -->",     # texto_html
        "",                                     # imagen_url
        "",                                     # imagen_alt
        1,                                      # orden
        102030,                                 # id_usuario
        "sugerencia_diaria",                    # tipo_asesoria
        "",                                     # observacion
        None,                                   # asesoria_id
        1,                                      # visible
        "Sugerencia del dia"                    # titulo
    )
    
    cursor.execute("""
        INSERT INTO tbl_menu_asesoria (
            menu_servicio_id, menu_principal, texto_html, imagen_url, imagen_alt,
            orden, id_usuario, tipo_asesoria, observacion, asesoria_id, visible, titulo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, menu_data)

    # 3. Create JSON payload for tbl_articulo
    config_data = {
        "guardarropas": "No disponible",
        "gustos": "No disponibles",
        "medidas": "Si",
        "dia": "Lunes",
        "hora": "07 AM",
        "contexto": "laboral",
        "clima": {
            "ciudad": "Medellín",
            "temperatura": "22 C",
            "estado": "Lluvia"
        },
        "lucir": "Formal",
        "razonamiento": "Lucir formal, cómoda pero protegida para la lluvia",
        "prendas": [
            {"nombre": "Blazer Lavanda", "imagen": "/images/prendas/BlazerLavanda.png"},
            {"nombre": "Camisa Blanca", "imagen": "/images/prendas/CamisaBlanca.png"},
            {"nombre": "Pantalón Negro", "imagen": "/images/prendas/PantalonNegro.png"},
            {"nombre": "Botines Lluvia", "imagen": "/images/prendas/BotinesLluvia.png"}
        ]
    }

    # 4. Insert into tbl_articulo
    articulo_data = (
        102030,                                 # id_usuario
        json.dumps(config_data, ensure_ascii=False), # texto_html (stored JSON)
        None,                                   # media_url
        "imagen",                               # media_tipo
        1,                                      # orden
        "sugerencia_diaria",                    # tipo_asesoria
        1,                                      # visible
        "Sugerencia del dia"                    # titulo
    )

    cursor.execute("""
        INSERT INTO tbl_articulo (
            id_usuario, texto_html, media_url, media_tipo, orden, tipo_asesoria, visible, titulo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, articulo_data)

    conn.commit()
    conn.close()
    print("Database seeded successfully with sugerencia_diaria records!")

if __name__ == "__main__":
    seed()
