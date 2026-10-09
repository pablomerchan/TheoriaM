import os
import sys
import sqlite3
import uuid
import re
import hashlib
import secrets
import smtplib
import pyodbc
from datetime import date
from email.message import EmailMessage
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Permitir importar el paquete `services` y `webmaster` que están en el nivel superior del archivo
ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from services.auth_service import AuthService
from services.contenidos_personalizados_service import ContenidosPersonalizadosService
from services.usuarios_sql_service import (
    UsuarioDuplicadoError,
    crear_usuario,
    obtener_usuario_activo,
    registrar_intento_login,
)

from webmaster.articulo_crud import (
    Articulo as WC_Articulo,
    create_articulo as wc_create_articulo,
    get_articulos as wc_get_articulos,
    get_articulo_by_id as wc_get_articulo_by_id,
    update_articulo as wc_update_articulo,
    delete_articulo as wc_delete_articulo,
    get_menu_articulo as wc_get_menu_articulo,
)
from pydantic import BaseModel

def parse_id_usuario(val):
    if val is None:
        return None
    try:
        return int(val)
    except ValueError:
        return str(val)


app = FastAPI()

# Configurar CORS para permitir que Angular (localhost:4200) consulte la API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
#  Bases de datos
# ─────────────────────────────────────────────
BASE_DIR = os.path.dirname(__file__)
DB_DIR = os.path.join(BASE_DIR, "BDs")
CAROUSEL_DB = os.path.normpath(os.path.join(DB_DIR, "carousel.db"))
HELP_DB = os.path.normpath(os.path.join(DB_DIR, "interactive_help.db"))
MORFOLOGICOS_DB = os.path.normpath(os.path.join(DB_DIR, "datos_morfologicos.db"))
MAESTRAS_DB = os.path.normpath(os.path.join(DB_DIR, "maestras_menus.db"))
ASESORIA_DB = os.path.normpath(os.path.join(DB_DIR, "asesoria.db"))
LANDING_PAGE_DB = os.path.normpath(os.path.join(BASE_DIR, "..", "FrontEnd", "BDs", "BD_landing_page"))
CENTRO_INFORMACION_DB = os.path.normpath(os.path.join(BASE_DIR, "..", "FrontEnd", "BDs", "BDcentro_informacion"))
CENTRO_CONTACTO_DB = os.path.normpath(os.path.join(BASE_DIR, "..", "FrontEnd", "BDs", "BD_centro_contacto"))
FORMULARIO_NUEVO_USUARIO_DB = os.path.normpath(
    os.path.join(BASE_DIR, "..", "FrontEnd", "BDs", "BD_formulario_nuevo_usuario")
)
CARACTERISTICAS_FISICAS_DESCRIPTIVE_DB = os.path.normpath(
    os.path.join(BASE_DIR, "..", "FrontEnd", "BDs", "BD_caracteristicas_fisicas")
)
CARACTERISTICAS_FISICAS_HELP_DB = os.path.normpath(os.path.join(DB_DIR, "caracteristicas_fisicas"))

# ─────────────────────────────────────────────
#  Init: carousel.db
# ─────────────────────────────────────────────
def init_carousel_db():
    conn = sqlite3.connect(CAROUSEL_DB)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tbl_carrusel (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tag TEXT,
            title TEXT NOT NULL,
            text TEXT NOT NULL,
            imageUrl TEXT NOT NULL,
            imageAltText TEXT,
            buttonLabel TEXT,
            buttonUrl TEXT,
            isExternal INTEGER DEFAULT 0
        )
    ''')
    cursor.execute("SELECT COUNT(*) FROM tbl_carrusel")
    if cursor.fetchone()[0] == 0:
        slides = [
            (
                "TECNOLOGÍA", "Innovación que Transforma",
                "Descubre nuestros servicios de consultoría tecnológica diseñados para llevar tu empresa al siguiente nivel con soluciones a medida.",
                "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=1200",
                "Equipo de trabajo innovando", "Ver Servicios", "#servicios", 0
            ),
            (
                "UX/UI", "Diseño Centrado en el Usuario",
                "Creamos interfaces atractivas, modernas y altamente funcionales que garantizan la mejor experiencia para tus usuarios.",
                "https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&q=80&w=1200",
                "Diseño UX UI", "Conoce Nuestro Trabajo", "#portafolio", 0
            ),
            (
                "INFRAESTRUCTURA", "Soluciones Escalables",
                "Arquitecturas robustas pensadas para el futuro. Prepara tu infraestructura para un crecimiento sostenible y seguro.",
                "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200",
                "Red global de tecnología", "Contactar un Asesor", "#contacto", 0
            )
        ]
        cursor.executemany('''
            INSERT INTO tbl_carrusel (tag, title, text, imageUrl, imageAltText, buttonLabel, buttonUrl, isExternal)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', slides)
        conn.commit()
    conn.close()

# ─────────────────────────────────────────────
#  Init: interactive_help.db  →  tabla datos_personales
# ─────────────────────────────────────────────
def init_help_db():
    conn = sqlite3.connect(HELP_DB)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS datos_personales (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            campo       TEXT NOT NULL,
            titulo      TEXT NOT NULL,
            texto       TEXT NOT NULL,
            imageUrl    TEXT,
            videoUrl    TEXT,
            orden       INTEGER DEFAULT 0
        )
    ''')
    cursor.execute("SELECT COUNT(*) FROM datos_personales")
    if cursor.fetchone()[0] == 0:
        ayudas = [
            ("sexo", "¿Por qué registrar el sexo?",
             "El sexo biológico influye directamente en el metabolismo basal, la distribución de grasa corporal y las necesidades nutricionales. Esta información es fundamental para personalizar tu plan de asesoría.",
             "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?auto=format&fit=crop&q=80&w=600",
             None, 1),
            ("edad", "¿Para qué sirve la edad?",
             "La edad determina las necesidades calóricas y metabólicas. Con el paso de los años el metabolismo cambia; conocer tu edad nos permite ajustar las recomendaciones de manera precisa.",
             "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&q=80&w=600",
             None, 2),
            ("color_piel", "Color de piel y asesoría de imagen",
             "Tu tono de piel es la base del análisis cromático. Identificarlo correctamente nos permite seleccionar paletas de color, maquillaje y prendas que armonicen con tu coloración natural.",
             "https://images.unsplash.com/photo-1617577255197-a4dc2e3a1bd2?auto=format&fit=crop&q=80&w=600",
             None, 3),
            ("color_ojos", "Color de ojos y armonía visual",
             "El color de los ojos complementa la paleta cromática personal. Junto al color de piel y cabello, forma la triada de tu coloración natural, base del análisis de estilo TheorIA M.",
             "https://images.unsplash.com/photo-1508341591423-4347099e1f19?auto=format&fit=crop&q=80&w=600",
             None, 4),
            ("color_cabello", "Color de cabello natural",
             "El color natural del cabello (sin tintes) es clave para tu análisis de coloración. Si usas tinte, intenta describir tu color original para obtener una asesoría más precisa.",
             "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=600",
             None, 5),
            ("peso", "¿Cómo registrar tu peso?",
             "Registra tu peso en kilogramos con ropa ligera y preferiblemente en ayunas. Esta medida, combinada con la estatura, nos permite calcular el IMC y diseñar recomendaciones personalizadas.",
             "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&q=80&w=600",
             None, 6),
            ("estatura", "¿Cómo medir tu estatura?",
             "Mide tu estatura en centímetros descalzo/a, de pie y con la espalda recta contra la pared. Una medición correcta garantiza cálculos de proporción corporal más precisos.",
             "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&q=80&w=600",
             None, 7),
            ("climas", "¿Por qué indicar tu clima habitual?",
             "El clima de tu entorno influye en las fibras textiles más adecuadas, la paleta estacional recomendada y los cuidados de piel más efectivos. Selecciona todos los climas en los que vives habitualmente.",
             "https://images.unsplash.com/photo-1504608524841-42584120d693?auto=format&fit=crop&q=80&w=600",
             None, 8),
            ("ubicacion_principal", "¿Tu ubicación principal?",
             "Tu lugar de residencia principal es vital para entender el contexto social y ambiental predominante en el que te desenvuelves.",
             None, None, 9),
            ("ubicacion_secundaria", "¿Tu ubicación secundaria?",
             "Tu lugar de trabajo frecuente o segunda residencia. Nos ayuda a adaptar el guardarropa a variaciones de entorno.",
             None, None, 10),
            ("hombros", "¿Cómo medir los hombros?",
             "Mide de un extremo al otro de los hombros (por la espalda). Esta medida ayuda a entender la estructura superior y definir la silueta.",
             None, None, 11),
            ("cintura", "¿Cómo medir la cintura?",
             "Mide alrededor de la parte más estrecha del torso (generalmente justo por encima del ombligo).",
             None, None, 12),
            ("cadera", "¿Cómo medir la cadera?",
             "Mide alrededor de la parte más prominente de los glúteos y cadera. Clave para el balance visual inferior.",
             None, None, 13),
            ("busto", "¿Cómo medir el busto?",
             "Mide alrededor de la parte más prominente del pecho. Ayuda a definir proporciones de la parte superior.",
             None, None, 14),
        ]
        cursor.executemany('''
            INSERT INTO datos_personales (campo, titulo, texto, imageUrl, videoUrl, orden)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', ayudas)
        conn.commit()
    conn.close()

# ─────────────────────────────────────────────
#  Init: características físicas - textos descriptivos y ayudas
# ─────────────────────────────────────────────
def init_caracteristicas_fisicas_dbs():
    conn = sqlite3.connect(CARACTERISTICAS_FISICAS_DESCRIPTIVE_DB)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS textos_descriptivos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clave TEXT NOT NULL UNIQUE,
            titulo TEXT NOT NULL,
            contenido_html TEXT NOT NULL,
            orden INTEGER DEFAULT 0
        )
    ''')
    cursor.execute("SELECT COUNT(*) FROM textos_descriptivos")
    if cursor.fetchone()[0] == 0:
        cursor.execute('''
            INSERT INTO textos_descriptivos (clave, titulo, contenido_html, orden)
            VALUES (?, ?, ?, ?)
        ''', (
            "introduccion",
            "Características físicas",
            '<p>Al completar tus características físicas podremos personalizar mejor las recomendaciones de tu perfil. '
            'Para obtener más información sobre el uso de tus datos, consulta nuestra '
            '<a href="/politica-de-privacidad">Política de privacidad</a>.</p>',
            1
        ))
        conn.commit()
    conn.close()

    conn = sqlite3.connect(CARACTERISTICAS_FISICAS_HELP_DB)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS textos_ayuda (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campo TEXT NOT NULL UNIQUE,
            titulo TEXT NOT NULL,
            contenido_html TEXT NOT NULL,
            orden INTEGER DEFAULT 0
        )
    ''')
    cursor.execute("SELECT COUNT(*) FROM textos_ayuda")
    if cursor.fetchone()[0] == 0:
        ayudas = [
            ("color_piel", "Color de piel",
             '<p>Selecciona el tono que mejor represente tu piel en luz natural.</p>'
             '<img src="https://images.unsplash.com/photo-1617577255197-a4dc2e3a1bd2?auto=format&fit=crop&q=80&w=600" '
             'alt="Ejemplo de tonos de piel">', 1),
            ("color_ojos", "Color de ojos",
             '<p>Elige el color predominante de tu iris, sin lentes de contacto de color.</p>'
             '<img src="https://images.unsplash.com/photo-1508341591423-4347099e1f19?auto=format&fit=crop&q=80&w=600" '
             'alt="Ejemplo de color de ojos">', 2),
            ("color_cabello", "Color de cabello",
             '<p>Indica tu color natural de cabello. Si lo tiñes, considera el color de raíz.</p>'
             '<img src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=600" '
             'alt="Ejemplo de color de cabello">', 3),
            ("ubicacion_principal", "Ubicación principal",
             "<p>Selecciona la ciudad donde resides la mayor parte del tiempo.</p>", 4),
            ("ubicacion_secundaria", "Ubicación secundaria",
             "<p>Si corresponde, indica una segunda ciudad de residencia o estancia frecuente.</p>", 5),
            ("peso_kg", "Peso en kilogramos",
             "<p>Registra tu peso actual en kilogramos. Puedes usar decimales.</p>", 6),
            ("estatura_cm", "Estatura en centímetros",
             "<p>Ingresa tu estatura en centímetros, sin calzado.</p>", 7)
        ]
        cursor.executemany('''
            INSERT INTO textos_ayuda (campo, titulo, contenido_html, orden)
            VALUES (?, ?, ?, ?)
        ''', ayudas)
        conn.commit()
    conn.close()

# ─────────────────────────────────────────────
#  Init: datos_morfologicos.db
# ─────────────────────────────────────────────
def init_morfologicos_db():
    conn = sqlite3.connect(MORFOLOGICOS_DB)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS datos_morfologicos (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id      TEXT,
            sexo            TEXT,
            edad            INTEGER,
            color_piel      TEXT,
            color_ojos      TEXT,
            color_cabello   TEXT,
            peso_kg         REAL,
            estatura_cm     REAL,
            climas          TEXT,
            ubicacion_principal TEXT,
            ubicacion_secundaria TEXT,
            medida_hombros_cm REAL,
            medida_cintura_cm REAL,
            medida_cadera_cm REAL,
            medida_busto_cm REAL,
            fecha_registro  DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Intento de añadir columnas por si la BD ya existía (ignorando errores si ya están)
    try: cursor.execute("ALTER TABLE datos_morfologicos ADD COLUMN ubicacion_principal TEXT")
    except: pass
    try: cursor.execute("ALTER TABLE datos_morfologicos ADD COLUMN ubicacion_secundaria TEXT")
    except: pass
    try: cursor.execute("ALTER TABLE datos_morfologicos ADD COLUMN medida_hombros_cm REAL")
    except: pass
    try: cursor.execute("ALTER TABLE datos_morfologicos ADD COLUMN medida_cintura_cm REAL")
    except: pass
    try: cursor.execute("ALTER TABLE datos_morfologicos ADD COLUMN medida_cadera_cm REAL")
    except: pass
    try: cursor.execute("ALTER TABLE datos_morfologicos ADD COLUMN medida_busto_cm REAL")
    except: pass

    conn.commit()
    conn.close()

# ─────────────────────────────────────────────
#  Init: maestras_menus.db
# ─────────────────────────────────────────────
def init_maestras_db():
    conn = sqlite3.connect(MAESTRAS_DB)
    cursor = conn.cursor()
    
    # Crear tabla de opciones de menú
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tbl_opciones_menu (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            menu TEXT NOT NULL,
            opcion TEXT NOT NULL
        )
    ''')
    
    # Crear tabla de ubicaciones
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tbl_ubicaciones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ubicacion TEXT NOT NULL
        )
    ''')
    
    # Poblar opciones si está vacía
    cursor.execute("SELECT COUNT(*) FROM tbl_opciones_menu")
    if cursor.fetchone()[0] == 0:
        opciones = [
            # Color de piel
            ('Color de piel', 'Muy clara (porcelana)'), ('Color de piel', 'Clara (marfil)'), ('Color de piel', 'Media clara (beige)'),
            ('Color de piel', 'Media (trigo)'), ('Color de piel', 'Media oscura (miel)'), ('Color de piel', 'Morena clara'),
            ('Color de piel', 'Morena media'), ('Color de piel', 'Morena oscura'), ('Color de piel', 'Muy oscura (ébano)'),
            
            # Color de ojos
            ('Color de ojos', 'Negro'), ('Color de ojos', 'Marrón oscuro'), ('Color de ojos', 'Marrón claro (miel)'),
            ('Color de ojos', 'Avellana'), ('Color de ojos', 'Verde oliva'), ('Color de ojos', 'Verde esmeralda'),
            ('Color de ojos', 'Azul oscuro'), ('Color de ojos', 'Azul claro'), ('Color de ojos', 'Gris'), ('Color de ojos', 'Ámbar'),
            
            # Color de cabello
            ('Color de cabello', 'Negro'), ('Color de cabello', 'Marrón oscuro'), ('Color de cabello', 'Castaño'),
            ('Color de cabello', 'Castaño claro'), ('Color de cabello', 'Rubio oscuro'), ('Color de cabello', 'Rubio dorado'),
            ('Color de cabello', 'Rubio ceniza'), ('Color de cabello', 'Rojizo (cobrizo)'), ('Color de cabello', 'Pelirrojo'), ('Color de cabello', 'Canoso / Blanco'),
            
            # Clima habitual de residencia
            ('Clima habitual de residencia', '🌴 Tropical (caluroso y húmedo)'), ('Clima habitual de residencia', '☀️ Subtropical'),
            ('Clima habitual de residencia', '🍂 Templado (estaciones marcadas)'), ('Clima habitual de residencia', '❄️ Frío / Montaña'),
            ('Clima habitual de residencia', '🏜️ Árido / Seco'), ('Clima habitual de residencia', '🌊 Costero / Marino'),
            ('Clima habitual de residencia', '🌦️ Variable (varios climas)')
        ]
        cursor.executemany("INSERT INTO tbl_opciones_menu (menu, opcion) VALUES (?, ?)", opciones)
        
    # Poblar ubicaciones si está vacía
    cursor.execute("SELECT COUNT(*) FROM tbl_ubicaciones")
    if cursor.fetchone()[0] == 0:
        ubicaciones = [
            ('Bogotá, Colombia',), ('Medellín, Colombia',), ('Cali, Colombia',), ('Barranquilla, Colombia',),
            ('Ciudad de México, México',), ('Buenos Aires, Argentina',), ('Santiago, Chile',), ('Lima, Perú',)
        ]
        cursor.executemany("INSERT INTO tbl_ubicaciones (ubicacion) VALUES (?)", ubicaciones)

    conn.commit()
    conn.close()

# ─────────────────────────────────────────────
#  Init: asesoria.db  (esquema drawio v2)
# ─────────────────────────────────────────────
def init_asesoria_db():
    conn = sqlite3.connect(ASESORIA_DB)
    cursor = conn.cursor()
    cursor.execute("PRAGMA foreign_keys = OFF")

    # ── MIGRACIÓN IDEMPOTENTE: tbl_asesoria (vieja) → tbl_menu_asesoria ──
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='tbl_asesoria'")
    old_asesoria = cursor.fetchone()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='tbl_menu_asesoria'")
    has_menu_asesoria = cursor.fetchone()

    if old_asesoria and not has_menu_asesoria:
        cursor.execute("PRAGMA table_info(tbl_asesoria)")
        cols = {row[1] for row in cursor.fetchall()}
        if 'menu_servicio_id' in cols:          # es la tabla vieja de contenido HTML
            cursor.execute('''
                CREATE TABLE tbl_menu_asesoria (
                    id               INTEGER PRIMARY KEY AUTOINCREMENT,
                    menu_servicio_id INTEGER,
                    menu_principal   TEXT,
                    texto_html       TEXT,
                    imagen_url       TEXT,
                    imagen_alt       TEXT,
                    orden            INTEGER DEFAULT 0,
                    id_usuario       INTEGER,
                    tipo_asesoria    TEXT,
                    observacion      TEXT,
                    asesoria_id      INTEGER,
                    visible          INTEGER DEFAULT 1,
                    titulo           TEXT DEFAULT NULL,
                    FOREIGN KEY (menu_servicio_id) REFERENCES tbl_menu_servicios(id)
                )
            ''')
            cols_comunes = sorted(cols & {
                "id","menu_servicio_id","menu_principal","texto_html",
                "imagen_url","imagen_alt","orden","id_usuario",
                "tipo_asesoria","observacion","asesoria_id",
                "visible","titulo"
            })
            col_list = ", ".join(cols_comunes)
            cursor.execute(f"INSERT INTO tbl_menu_asesoria ({col_list}) SELECT {col_list} FROM tbl_asesoria")
            cursor.execute("DROP TABLE tbl_asesoria")
            conn.commit()

    # ══ TABLAS DE MENÚ / CONTENIDO (operacionales) ══════════════════════

    # ── tbl_menu_servicios
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tbl_menu_servicios (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            tema       TEXT    DEFAULT 'General',
            subtema    TEXT    NOT NULL,
            orden      INTEGER DEFAULT 0,
            visible    BOOLEAN DEFAULT 1,
            id_usuario INTEGER DEFAULT 1
        )
    ''')
    try: cursor.execute("ALTER TABLE tbl_menu_servicios ADD COLUMN tema TEXT DEFAULT 'General'")
    except: pass
    try: cursor.execute("ALTER TABLE tbl_menu_servicios ADD COLUMN id_usuario INTEGER DEFAULT 1")
    except: pass
    try: cursor.execute("ALTER TABLE tbl_menu_servicios ADD COLUMN visible BOOLEAN DEFAULT 1")
    except: pass
    try: cursor.execute("ALTER TABLE tbl_menu_servicios ADD COLUMN orden INTEGER DEFAULT 0")
    except: pass

    # ── tbl_menu_asesoria (era tbl_asesoria - control de componentes UI)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tbl_menu_asesoria (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            menu_servicio_id INTEGER,
            menu_principal   TEXT,
            texto_html       TEXT,
            imagen_url       TEXT,
            imagen_alt       TEXT,
            orden            INTEGER DEFAULT 0,
            id_usuario       INTEGER,
            tipo_asesoria    TEXT,
            observacion      TEXT,
            asesoria_id      INTEGER,
            visible          INTEGER DEFAULT 1,
            titulo           TEXT    DEFAULT NULL,
            FOREIGN KEY (menu_servicio_id) REFERENCES tbl_menu_servicios(id)
        )
    ''')
    try: cursor.execute("ALTER TABLE tbl_menu_asesoria ADD COLUMN orden INTEGER DEFAULT 0")
    except: pass
    try: cursor.execute("ALTER TABLE tbl_menu_asesoria ADD COLUMN id_usuario INTEGER")
    except: pass
    try: cursor.execute("ALTER TABLE tbl_menu_asesoria ADD COLUMN tipo_asesoria TEXT")
    except: pass
    try: cursor.execute("ALTER TABLE tbl_menu_asesoria ADD COLUMN asesoria_id INTEGER")
    except: pass
    try: cursor.execute("ALTER TABLE tbl_menu_asesoria ADD COLUMN visible INTEGER DEFAULT 1")
    except: pass
    try: cursor.execute("ALTER TABLE tbl_menu_asesoria ADD COLUMN titulo TEXT DEFAULT NULL")
    except: pass
    try: cursor.execute("ALTER TABLE tbl_menu_asesoria ADD COLUMN menu_principal TEXT")
    except: pass
    try: cursor.execute("ALTER TABLE tbl_menu_asesoria ADD COLUMN observacion TEXT")
    except: pass
    try: cursor.execute("ALTER TABLE tbl_menu_asesoria ADD COLUMN componente TEXT DEFAULT NULL")
    except: pass

    # ── tbl_articulo: marco estático texto + imagen/video
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tbl_articulo (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            texto_html    TEXT    NOT NULL DEFAULT '',
            media_url     TEXT    DEFAULT NULL,
            media_tipo    TEXT    NOT NULL DEFAULT 'imagen',
            orden         INTEGER NOT NULL DEFAULT 0,
            tipo_asesoria TEXT    DEFAULT NULL,
            visible       INTEGER NOT NULL DEFAULT 1,
            titulo        TEXT,
            contenido     TEXT,
            grupo_id      TEXT,
            tags          TEXT    DEFAULT '[]',
            publicado_en  TIMESTAMP
        )
    ''')
    try: cursor.execute("ALTER TABLE tbl_articulo ADD COLUMN tipo_asesoria TEXT DEFAULT NULL")
    except: pass
    try: cursor.execute("ALTER TABLE tbl_articulo ADD COLUMN titulo TEXT")
    except: pass
    try: cursor.execute("ALTER TABLE tbl_articulo ADD COLUMN contenido TEXT")
    except: pass
    try: cursor.execute("ALTER TABLE tbl_articulo ADD COLUMN grupo_id TEXT")
    except: pass
    try: cursor.execute("ALTER TABLE tbl_articulo ADD COLUMN tags TEXT DEFAULT '[]'")
    except: pass
    try: cursor.execute("ALTER TABLE tbl_articulo ADD COLUMN publicado_en TIMESTAMP")
    except: pass
    try: cursor.execute("ALTER TABLE tbl_articulo ADD COLUMN media_url_webm TEXT DEFAULT NULL")
    except: pass
    try: cursor.execute("ALTER TABLE tbl_articulo ADD COLUMN tipo_contenido TEXT DEFAULT 'articulo'")
    except: pass

    # ── Migración de tbl_articulo para eliminar id_usuario si aún existe
    cursor.execute("PRAGMA table_info(tbl_articulo)")
    old_columns = [row for row in cursor.fetchall()]
    old_column_names = [row[1] for row in old_columns]
    if "id_usuario" in old_column_names:
        cursor.execute("DROP TABLE IF EXISTS tbl_articulo_new")

        desired_columns = {
            "id": "INTEGER PRIMARY KEY AUTOINCREMENT",
            "texto_html": "TEXT NOT NULL DEFAULT ''",
            "media_url": "TEXT DEFAULT NULL",
            "media_tipo": "TEXT NOT NULL DEFAULT 'imagen'",
            "orden": "INTEGER NOT NULL DEFAULT 0",
            "tipo_asesoria": "TEXT DEFAULT NULL",
            "visible": "INTEGER NOT NULL DEFAULT 1",
            "titulo": "TEXT",
            "contenido": "TEXT",
            "grupo_id": "TEXT",
            "tags": "TEXT DEFAULT '[]'",
            "publicado_en": "TIMESTAMP",
            "media_url_webm": "TEXT DEFAULT NULL",
        }

        new_columns = []
        for cid, name, ctype, notnull, dflt_value, pk in old_columns:
            if name == "id_usuario":
                continue
            if name == "id":
                new_columns.append("id INTEGER PRIMARY KEY AUTOINCREMENT")
                continue
            if name in desired_columns:
                new_columns.append(f"{name} {desired_columns[name]}")
                continue
            column_def = ctype or "TEXT"
            if pk:
                column_def = f"{column_def} PRIMARY KEY"
            if notnull:
                column_def += " NOT NULL"
            if dflt_value is not None:
                column_def += f" DEFAULT {dflt_value}"
            new_columns.append(f"{name} {column_def}")

        for name, definition in desired_columns.items():
            if name not in old_column_names:
                new_columns.append(f"{name} {definition}")

        cursor.execute(f"CREATE TABLE tbl_articulo_new ({', '.join(new_columns)})")

        insert_columns = [name for name in old_column_names if name != "id_usuario"]
        cursor.execute(
            f"INSERT INTO tbl_articulo_new ({', '.join(insert_columns)}) SELECT {', '.join(insert_columns)} FROM tbl_articulo"
        )
        cursor.execute("DROP TABLE tbl_articulo")
        cursor.execute("ALTER TABLE tbl_articulo_new RENAME TO tbl_articulo")

    # ── tbl_asesoria_rapida: reproductor continuo de fotos
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tbl_asesoria_rapida (
            id                     INTEGER PRIMARY KEY AUTOINCREMENT,
            id_usuario             INTEGER NOT NULL DEFAULT 1,
            imagen_url             TEXT    NOT NULL,
            velocidad_reproduccion INTEGER NOT NULL DEFAULT 1500,
            orden                  INTEGER NOT NULL DEFAULT 0,
            tipo_asesoria          TEXT    DEFAULT NULL,
            texto_html             TEXT    DEFAULT NULL,
            visible                INTEGER NOT NULL DEFAULT 1
        )
    ''')
    try: cursor.execute("ALTER TABLE tbl_asesoria_rapida ADD COLUMN texto_html TEXT DEFAULT NULL")
    except: pass

    # ── tbl_carrusel_items: catálogo de prendas con carrusel HTML
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tbl_carrusel_items (
            id                   INTEGER PRIMARY KEY AUTOINCREMENT,
            text_html            TEXT    NOT NULL,
            imagen_url           TEXT    NOT NULL,
            visible              BOOLEAN DEFAULT 1,
            orden                INTEGER DEFAULT 0,
            tipo_asesoria        TEXT,
            descripcion_registro TEXT,
            asesoria_id          INTEGER,
            nombre               TEXT,
            categoria            TEXT,
            tallas               TEXT    DEFAULT '[]',
            estilos              TEXT    DEFAULT '[]'
        )
    ''')
    for _col, _def in [
        ("tipo_asesoria",        "TEXT"),
        ("descripcion_registro", "TEXT"),
        ("asesoria_id",          "INTEGER"),
        ("nombre",               "TEXT"),
        ("categoria",            "TEXT"),
        ("tallas",               "TEXT DEFAULT '[]'"),
        ("estilos",              "TEXT DEFAULT '[]'"),
    ]:
        try: cursor.execute(f"ALTER TABLE tbl_carrusel_items ADD COLUMN {_col} {_def}")
        except: pass

    # ══ NUEVAS TABLAS DRAWIO ═════════════════════════════════════════════

    # ── tbl_persona
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tbl_persona (
            id          TEXT PRIMARY KEY,
            nombre      TEXT,
            email       TEXT,
            genero      TEXT,
            edad        INTEGER,
            tipo_cuerpo TEXT,
            gustos_json TEXT
        )
    ''')
    try: cursor.execute("ALTER TABLE tbl_persona ADD COLUMN tipo_cuerpo TEXT")
    except: pass
    try: cursor.execute("ALTER TABLE tbl_persona ADD COLUMN gustos_json TEXT")
    except: pass

    # ── tbl_tipo_asesoria
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tbl_tipo_asesoria (
            id                TEXT PRIMARY KEY,
            nombre            TEXT NOT NULL,
            descripcion       TEXT,
            menu_servicio_ref INTEGER
        )
    ''')

    # ── tbl_asesoria (nueva - tabla relacional drawio)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tbl_asesoria (
            id         TEXT PRIMARY KEY,
            persona_id TEXT,
            tipo_id    TEXT,
            asesor_id  TEXT,
            fecha      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            estado     TEXT      DEFAULT 'activa',
            FOREIGN KEY (persona_id) REFERENCES tbl_persona(id),
            FOREIGN KEY (tipo_id)    REFERENCES tbl_tipo_asesoria(id)
        )
    ''')

    # ── tbl_resumen_asesoria
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tbl_resumen_asesoria (
            id          TEXT PRIMARY KEY,
            asesoria_id TEXT,
            contenido   TEXT,
            formato     TEXT DEFAULT 'html',
            FOREIGN KEY (asesoria_id) REFERENCES tbl_asesoria(id)
        )
    ''')

    # ── tbl_grupo_personas
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tbl_grupo_personas (
            id          TEXT PRIMARY KEY,
            nombre      TEXT NOT NULL,
            descripcion TEXT
        )
    ''')

    # ── tbl_persona_grupo
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tbl_persona_grupo (
            persona_id TEXT,
            grupo_id   TEXT,
            PRIMARY KEY (persona_id, grupo_id),
            FOREIGN KEY (persona_id) REFERENCES tbl_persona(id),
            FOREIGN KEY (grupo_id)   REFERENCES tbl_grupo_personas(id)
        )
    ''')

    # ── tbl_prenda_recomendada
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tbl_prenda_recomendada (
            id          TEXT PRIMARY KEY,
            persona_id  TEXT,
            prenda_id   TEXT,
            asesoria_id TEXT,
            score       REAL,
            razon       TEXT,
            FOREIGN KEY (persona_id)  REFERENCES tbl_persona(id),
            FOREIGN KEY (prenda_id)   REFERENCES tbl_carrusel_items(id),
            FOREIGN KEY (asesoria_id) REFERENCES tbl_asesoria(id)
        )
    ''')

    # ══ DATOS INICIALES (seed) ══════════════════════════════════════════

    cursor.execute("SELECT COUNT(*) FROM tbl_menu_servicios")
    if cursor.fetchone()[0] == 0:
        opciones = [
            ("Introducción", "Análisis de Color",      2, 1, 1),
            ("Introducción", "Asesoría de Estilo",      3, 1, 1),
            ("Diagnóstico",  "Estudio Morfológico",     4, 1, 1),
            ("Diagnóstico",  "Armario Cápsula",         5, 1, 1),
            ("Aprender",     "Guía de Proporciones",    6, 1, 1),
        ]
        cursor.executemany(
            "INSERT INTO tbl_menu_servicios (tema, subtema, orden, visible, id_usuario) VALUES (?, ?, ?, ?, ?)",
            opciones
        )
        conn.commit()

    cursor.execute("SELECT COUNT(*) FROM tbl_tipo_asesoria")
    if cursor.fetchone()[0] == 0:
        cursor.execute("SELECT id, subtema, tema FROM tbl_menu_servicios")
        menus = cursor.fetchall()
        for m in menus:
            cursor.execute(
                "INSERT INTO tbl_tipo_asesoria (id, nombre, descripcion, menu_servicio_ref) VALUES (?, ?, ?, ?)",
                (str(uuid.uuid4()), m[1], m[2], m[0])
            )
        conn.commit()

    cursor.execute("SELECT COUNT(*) FROM tbl_carrusel_items")
    if cursor.fetchone()[0] == 0:
        prendas = [
            ("<p><strong>Blusas tipo 'Wrap' (Cruzadas):</strong> Se adaptan a la cintura realzando la zona más estrecha del torso y crean un escote en V que alarga visualmente el cuello.</p>",
             "/images/prendas/BlusasTpoCruzadasNegra.png", True, 1, "Blusas Wrap", "blusa"),
            ("<p><strong>Tops de cuello Halter:</strong> Enmarcan los hombros alineándolos de forma natural con las caderas sin añadir volumen.</p>",
             "/images/prendas/TopsDeCuelloHalterNegra.png", True, 2, "Tops Halter", "top"),
            ("<p><strong>Bodys ajustados:</strong> Evitan el exceso de tela y los pliegues en la cintura.</p>",
             "/images/prendas/BodyAjustadoNegra.png", True, 3, "Bodys Ajustados", "body"),
            ("<p><strong>Chaquetas y Blazers cortos (Cropped):</strong> Estructuran los hombros y cortan exactamente arriba de la cadera para acentuar la cintura.</p>",
             "/images/prendas/ChaquetasBlazersCortosNegra.png", True, 4, "Blazers Cropped", "chaqueta"),
        ]
        cursor.executemany(
            "INSERT INTO tbl_carrusel_items (text_html, imagen_url, visible, orden, nombre, categoria) VALUES (?, ?, ?, ?, ?, ?)",
            prendas
        )
        conn.commit()

    cursor.execute("PRAGMA foreign_keys = ON")
    conn.commit()
    conn.close()


# ─────────────────────────────────────────────
#  Init: BD_landing_page
# ─────────────────────────────────────────────
def init_landing_page_db():
    conn = sqlite3.connect(LANDING_PAGE_DB)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tbl_landing_page (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT,
            subtitulo TEXT,
            descripcion TEXT,
            imagen_url TEXT,
            boton_texto TEXT,
            boton_url TEXT,
            visible BOOLEAN DEFAULT 1,
            orden INTEGER DEFAULT 0
        )
    ''')
    cursor.execute("SELECT COUNT(*) FROM tbl_landing_page")
    if cursor.fetchone()[0] == 0:
        contenido = [
            (
                "Asesoría Personalizada en Moda y Estilismo",
                "Encuentra el estilo que mejor te representa",
                "Con ayuda de nuestros expertos, descubre prendas, colores y combinaciones que hablan de ti.",
                "/images/landpage/TuMejorVersion_carrusel.png",
                "Obtener Asesoría",
                "/datos-morfologicos",
                1,
                1
            ),
            (
                "Consejos de estilo personalizados",
                None,
                "Recomendaciones pensadas para tu silueta, tus gustos y tu forma de vivir.",
                "/images/landpage/1.QueMePongo.png",
                None,
                None,
                1,
                2
            ),
            (
                "Recomendaciones para cada ocasión",
                None,
                "Ideas prácticas para crear looks seguros y versátiles en cada momento.",
                "/images/landpage/2.MeInscribo.png",
                None,
                None,
                1,
                3
            ),
            (
                "Análisis de color y morfología",
                None,
                "Conoce los tonos y las proporciones que realzan tu presencia natural.",
                "/images/landpage/3.ReciboAsesoria.png",
                None,
                None,
                1,
                4
            ),
            (
                "Tu imagen, con intención",
                "Una guía hecha para ti",
                "Convierte tus decisiones de estilo en una herramienta de expresión personal.",
                None,
                None,
                None,
                1,
                5
            )
        ]
        cursor.executemany('''
            INSERT INTO tbl_landing_page
                (titulo, subtitulo, descripcion, imagen_url, boton_texto, boton_url, visible, orden)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', contenido)
    conn.commit()
    conn.close()


def init_centro_informacion_db():
    conn = sqlite3.connect(CENTRO_INFORMACION_DB)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tbl_ci_configuracion (
            id INTEGER PRIMARY KEY,
            titulo TEXT NOT NULL,
            descripcion TEXT NOT NULL
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tbl_ci_secciones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            etiqueta TEXT NOT NULL,
            titulo TEXT NOT NULL,
            descripcion TEXT,
            icono TEXT,
            orden INTEGER DEFAULT 0,
            visible BOOLEAN DEFAULT 1
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tbl_ci_contenidos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            seccion_id INTEGER NOT NULL,
            titulo TEXT NOT NULL,
            descripcion TEXT,
            imagen_url TEXT,
            icono TEXT,
            orden INTEGER DEFAULT 0,
            visible BOOLEAN DEFAULT 1,
            FOREIGN KEY (seccion_id) REFERENCES tbl_ci_secciones(id)
        )
    ''')
    cursor.execute("SELECT COUNT(*) FROM tbl_ci_configuracion")
    if cursor.fetchone()[0] == 0:
        cursor.execute(
            "INSERT INTO tbl_ci_configuracion (id, titulo, descripcion) VALUES (1, ?, ?)",
            (
                "Centro de información",
                "Encuentra respuestas y recursos para conocer nuestros servicios y administrar tu experiencia en TheorIA M.",
            ),
        )
    cursor.execute("SELECT COUNT(*) FROM tbl_ci_secciones")
    if cursor.fetchone()[0] == 0:
        secciones = [
            ("Inicio del Centro de información", "Diseñamos nuestros servicios pensando en ti", "Conoce cómo cuidamos tu información y te acompañamos en cada decisión de estilo.", "⌂", 1, 1),
            ("Temas de información", "Temas de información", "Respuestas sobre nuestros servicios, recomendaciones y el uso de tus datos.", "◉", 2, 1),
            ("Más recursos", "Más recursos", "Guías y herramientas para aprovechar mejor tu experiencia.", "▣", 3, 1),
            ("Artículos y políticas", "Artículos y políticas", "Consulta información importante sobre el uso de la plataforma.", "ⓘ", 4, 1),
            ("Configuración", "Configuración", "Administra tus preferencias y la información de tu cuenta.", "⚙", 5, 1),
        ]
        cursor.executemany(
            "INSERT INTO tbl_ci_secciones (etiqueta, titulo, descripcion, icono, orden, visible) VALUES (?, ?, ?, ?, ?, ?)",
            secciones,
        )
        contenidos = [
            (1, "Privacidad y tus datos", "Conoce qué información utilizamos para personalizar tu experiencia y cómo mantenerla bajo tu control.", "/images/landpage/TuEstiloSegunMorfologia.png", "◉", 1, 1),
            (1, "Seguridad y protección", "Recomendaciones para proteger tu cuenta y disfrutar de nuestros servicios con tranquilidad.", "/images/landpage/TuMejorVersion_carrusel.png", "▣", 2, 1),
            (2, "Recomendaciones personalizadas", "Descubre cómo tus preferencias ayudan a crear sugerencias de estilo más relevantes para ti.", "/images/landpage/LaImagenDeTusMetas1.png", "✦", 1, 1),
            (2, "Asesoría de estilo", "Información sobre el análisis de color, morfología y las sugerencias de nuestros servicios.", "/images/landpage/3.ReciboAsesoria.png", "✧", 2, 1),
            (3, "Guía de compras", "Encuentra ideas para elegir prendas y crear combinaciones que se adapten a tus necesidades.", "/images/landpage/1.QueMePongo.png", "▤", 1, 1),
            (3, "Tu guardarropa digital", "Organiza tus prendas y consulta tus looks desde un mismo lugar.", "/images/landpage/2.MeInscribo.png", "▧", 2, 1),
            (4, "Aviso de privacidad", "Consulta cómo se recopila, utiliza y protege la información que compartes con TheorIA M.", None, "◉", 1, 1),
            (4, "Términos de uso", "Revisa las condiciones que aplican al utilizar los servicios y contenidos de la plataforma.", None, "ⓘ", 2, 1),
            (5, "Preferencias de comunicación", "Elige cómo deseas recibir novedades, recomendaciones y comunicaciones del servicio.", None, "⚙", 1, 1),
            (5, "Administración de cuenta", "Consulta las opciones disponibles para revisar y actualizar los datos de tu perfil.", None, "⌂", 2, 1),
        ]
        cursor.executemany(
            "INSERT INTO tbl_ci_contenidos (seccion_id, titulo, descripcion, imagen_url, icono, orden, visible) VALUES (?, ?, ?, ?, ?, ?, ?)",
            contenidos,
        )
    conn.commit()
    conn.close()


def init_centro_contacto_db():
    conn = sqlite3.connect(CENTRO_CONTACTO_DB)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tbl_contacto_configuracion (
            id INTEGER PRIMARY KEY,
            titulo TEXT NOT NULL,
            descripcion TEXT NOT NULL
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tbl_contacto_destinatarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            activo BOOLEAN DEFAULT 1
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tbl_contacto_solicitudes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            correo TEXT NOT NULL,
            asunto TEXT NOT NULL,
            mensaje TEXT NOT NULL,
            creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            notificacion_enviada BOOLEAN DEFAULT 0,
            error_notificacion TEXT
        )
    ''')
    cursor.execute(
        "INSERT OR IGNORE INTO tbl_contacto_configuracion (id, titulo, descripcion) VALUES (1, ?, ?)",
        (
            "Hablemos de tu estilo",
            "¿Tienes una pregunta o necesitas ayuda? Envíanos un mensaje y nuestro equipo se pondrá en contacto contigo.",
        ),
    )
    cursor.execute(
        "INSERT OR IGNORE INTO tbl_contacto_destinatarios (email, activo) VALUES (?, 1)",
        ("pablomerchan@gmail.com",),
    )
    conn.commit()
    conn.close()


def init_nuevo_usuario_dbs():
    os.makedirs(os.path.dirname(FORMULARIO_NUEVO_USUARIO_DB), exist_ok=True)

    textos = [
        ("titulo", "Empieza a usar TheorIA M, crea tu cuenta."),
        ("nombre", "Nombre"),
        ("placeholder_nombre", "Nombre"),
        ("apellidos", "Apellidos"),
        ("placeholder_apellidos", "Apellidos"),
        ("seudonimo", "Seudónimo"),
        ("placeholder_seudonimo", "Seudónimo"),
        ("fecha_nacimiento", "Fecha de nacimiento"),
        ("dia", "Día"),
        ("mes", "Mes"),
        ("anio", "Año"),
        ("mes_1", "Enero"),
        ("mes_2", "Febrero"),
        ("mes_3", "Marzo"),
        ("mes_4", "Abril"),
        ("mes_5", "Mayo"),
        ("mes_6", "Junio"),
        ("mes_7", "Julio"),
        ("mes_8", "Agosto"),
        ("mes_9", "Septiembre"),
        ("mes_10", "Octubre"),
        ("mes_11", "Noviembre"),
        ("mes_12", "Diciembre"),
        ("contacto", "Correo electrónico"),
        ("placeholder_contacto", "Correo electrónico"),
        ("contrasena", "Contraseña"),
        ("placeholder_contrasena", "Contraseña"),
        ("confirmar_contrasena", "Confirmar Contraseña"),
        ("placeholder_confirmar_contrasena", "Contraseña"),
        ("enviar", "Enviar"),
        ("enviando", "Enviando..."),
        ("iniciar_sesion", "Ya tengo una cuenta"),
        ("registro_exitoso", "Tu solicitud de registro quedó guardada."),
        ("registro_pendiente", "Tu cuenta ya está activa. Puedes iniciar sesión."),
        ("error_carga", "No fue posible cargar el formulario. Inténtalo de nuevo más tarde."),
        ("error_envio", "No fue posible guardar tus datos. Inténtalo de nuevo."),
        ("error_nombre", "Escribe tu nombre."),
        ("error_apellidos", "Escribe tus apellidos."),
        ("error_seudonimo", "Escribe un seudónimo."),
        ("error_fecha", "Selecciona una fecha de nacimiento válida."),
        ("error_contacto", "Escribe un correo electrónico válido."),
        ("error_contrasena", "La contraseña debe tener entre 8 y 128 caracteres."),
        ("error_confirmar_contrasena", "Confirma tu contraseña."),
        ("error_contrasenas_no_coinciden", "Las contraseñas no coinciden."),
        ("error_usuario_duplicado", "Ese correo o seudónimo ya están registrados."),
        ("login_titulo", "Inicio de sesión"),
        ("login_pendiente", "El inicio de sesión estará disponible cuando se integre el backend de usuarios."),
        ("identificador", "Email o seudónimo"),
        ("placeholder_identificador", "Email o seudónimo"),
        ("error_identificador", "Escribe tu email o seudónimo."),
        ("entrar", "Entrar"),
        ("entrando", "Entrando..."),
        ("crear_cuenta", "Crear una cuenta"),
    ]
    ayudas = [
        ("nombre", "Usa el nombre y los apellidos con los que quieres identificar tu cuenta."),
        ("seudonimo", "Elige un nombre corto para mostrar en tu perfil."),
        ("fecha_nacimiento", "Usamos esta fecha para personalizar tu experiencia."),
        ("contacto", "Usa un correo electrónico o un móvil válido para identificar tu cuenta."),
        ("contrasena", "Elige una contraseña de entre 8 y 128 caracteres."),
        ("confirmar_contrasena", "Vuelve a escribir la misma contraseña para confirmar que es correcta."),
    ]

    conn = sqlite3.connect(FORMULARIO_NUEVO_USUARIO_DB)
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS textos_formulario (
                clave TEXT PRIMARY KEY,
                texto TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS ayudas_formulario (
                campo TEXT PRIMARY KEY,
                texto TEXT NOT NULL
            )
        """)
        conn.executemany(
            "INSERT OR IGNORE INTO textos_formulario (clave, texto) VALUES (?, ?)",
            textos,
        )
        conn.executemany(
            "INSERT OR IGNORE INTO ayudas_formulario (campo, texto) VALUES (?, ?)",
            ayudas,
        )
        conn.commit()
    finally:
        conn.close()

# Inicializar todas las bases de datos al arrancar
init_carousel_db()
init_help_db()
init_caracteristicas_fisicas_dbs()
init_morfologicos_db()
init_maestras_db()
init_asesoria_db()
init_landing_page_db()
init_centro_informacion_db()
init_centro_contacto_db()
init_nuevo_usuario_dbs()


# ─────────────────────────────────────────────
#  Modelos Pydantic
# ─────────────────────────────────────────────
class DatosMorfologicosInput(BaseModel):
    usuario_id: Optional[str] = None
    sexo: str
    edad: int
    color_piel: str
    color_ojos: str
    color_cabello: str
    peso_kg: float
    estatura_cm: float
    climas: list[str]
    ubicacion_principal: str
    ubicacion_secundaria: str
    medida_hombros_cm: Optional[float] = None
    medida_cintura_cm: Optional[float] = None
    medida_cadera_cm: Optional[float] = None
    medida_busto_cm: Optional[float] = None


class CentroContactoInput(BaseModel):
    nombre: str
    correo: str
    asunto: str
    mensaje: str


class NuevoUsuarioInput(BaseModel):
    nombre: str
    apellidos: str
    seudonimo: str
    dia_nacimiento: int
    mes_nacimiento: int
    anio_nacimiento: int
    contacto: str
    contrasena: str
    confirmar_contrasena: str


class IniciarSesionInput(BaseModel):
    identificador: str
    contrasena: str


def validar_politica_contrasena(contrasena: str) -> bool:
    return 8 <= len(contrasena) <= 128


@app.get("/api/nuevo-usuario/formulario")
def get_formulario_nuevo_usuario():
    conn = sqlite3.connect(FORMULARIO_NUEVO_USUARIO_DB)
    conn.row_factory = sqlite3.Row
    try:
        textos = {
            row["clave"]: row["texto"]
            for row in conn.execute("SELECT clave, texto FROM textos_formulario")
        }
        ayudas = {
            row["campo"]: row["texto"]
            for row in conn.execute("SELECT campo, texto FROM ayudas_formulario")
        }
        textos["contacto"] = "Correo electrónico"
        textos["placeholder_contacto"] = "Correo electrónico"
        textos["error_contacto"] = "Escribe un correo electrónico válido."
        textos["registro_pendiente"] = "Tu cuenta ya está activa. Puedes iniciar sesión."
        ayudas["contacto"] = "Usa el correo electrónico que utilizarás para identificar tu cuenta."
        return {"titulo": textos.get("titulo", "Empieza a usar TheorIA M, crea tu cuenta."), "textos": textos, "ayudas": ayudas}
    finally:
        conn.close()


@app.post("/api/nuevo-usuario", status_code=201)
def crear_nuevo_usuario(registro: NuevoUsuarioInput):
    nombre = registro.nombre.strip()
    apellidos = registro.apellidos.strip()
    seudonimo = registro.seudonimo.strip()
    contacto = registro.contacto.strip()
    if not nombre or len(nombre) > 120:
        raise HTTPException(status_code=422, detail="El nombre es obligatorio y debe tener máximo 120 caracteres.")
    if not apellidos or len(apellidos) > 120:
        raise HTTPException(status_code=422, detail="Los apellidos son obligatorios y deben tener máximo 120 caracteres.")
    if not seudonimo or len(seudonimo) > 50:
        raise HTTPException(status_code=422, detail="El seudónimo es obligatorio y debe tener máximo 50 caracteres.")

    try:
        nacimiento = date(registro.anio_nacimiento, registro.mes_nacimiento, registro.dia_nacimiento)
    except ValueError as error:
        raise HTTPException(status_code=422, detail="La fecha de nacimiento no es válida.") from error
    if nacimiento > date.today():
        raise HTTPException(status_code=422, detail="La fecha de nacimiento no puede ser futura.")

    correo_valido = re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", contacto) is not None
    if len(contacto) > 254 or not correo_valido:
        raise HTTPException(status_code=422, detail="Ingresa un correo electrónico válido.")
    if not validar_politica_contrasena(registro.contrasena):
        raise HTTPException(status_code=422, detail="La contraseña debe tener entre 8 y 128 caracteres.")
    if registro.contrasena != registro.confirmar_contrasena:
        raise HTTPException(status_code=422, detail="Las contraseñas no coinciden.")

    password_salt = secrets.token_bytes(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        registro.contrasena.encode("utf-8"),
        password_salt,
        600_000,
    )
    usuario_id = uuid.uuid4()
    try:
        crear_usuario(
            usuario_id,
            nombre,
            apellidos,
            seudonimo,
            nacimiento,
            contacto,
            password_hash,
            password_salt,
        )
    except UsuarioDuplicadoError as error:
        raise HTTPException(status_code=409, detail="Ese correo o seudónimo ya están registrados.") from error
    except pyodbc.Error as error:
        raise HTTPException(status_code=503, detail="No fue posible guardar el registro en SQL Server.") from error
    return {"id": str(usuario_id), "estado": "activo"}


@app.get("/api/iniciar-sesion/formulario")
def get_formulario_iniciar_sesion():
    conn = sqlite3.connect(FORMULARIO_NUEVO_USUARIO_DB)
    conn.row_factory = sqlite3.Row
    try:
        textos = {
            row["clave"]: row["texto"]
            for row in conn.execute("SELECT clave, texto FROM textos_formulario")
        }
        ayudas = {
            row["campo"]: row["texto"]
            for row in conn.execute("SELECT campo, texto FROM ayudas_formulario")
        }
        textos.setdefault("titulo", "Inicio de sesión")
        textos.setdefault("identificador", "Email o seudónimo")
        textos.setdefault("placeholder_identificador", "Email o seudónimo")
        textos.setdefault("error_identificador", "Escribe tu email o seudónimo.")
        textos.setdefault("entrar", "Entrar")
        textos.setdefault("entrando", "Entrando...")
        textos.setdefault("crear_cuenta", "Crear una cuenta")
        textos.setdefault("error_envio", "No fue posible iniciar sesión.")
        return {"titulo": textos.get("login_titulo", textos.get("titulo", "Inicio de sesión")), "textos": textos, "ayudas": ayudas}
    finally:
        conn.close()


@app.post("/api/iniciar-sesion")
def iniciar_sesion(registro: IniciarSesionInput, request: Request):
    identificador = registro.identificador.strip()
    contrasena = registro.contrasena
    direccion_ip = request.client.host if request.client else None
    if not identificador or len(identificador) > 254:
        registrar_intento_login(identificador, False, direccion_ip, "Identificador inválido.")
        raise HTTPException(status_code=422, detail="El email o seudónimo es obligatorio.")
    if not validar_politica_contrasena(contrasena):
        registrar_intento_login(identificador, False, direccion_ip, "Contraseña con formato inválido.")
        raise HTTPException(status_code=422, detail="La contraseña debe tener entre 8 y 128 caracteres.")

    try:
        usuario = obtener_usuario_activo(identificador)
    except pyodbc.Error as error:
        registrar_intento_login(identificador, False, direccion_ip, "Error al validar las credenciales.")
        raise HTTPException(status_code=503, detail="No fue posible validar las credenciales.") from error

    if usuario is None:
        registrar_intento_login(identificador, False, direccion_ip, "Credenciales inválidas.")
        raise HTTPException(status_code=401, detail="Credenciales inválidas.")

    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        contrasena.encode("utf-8"),
        usuario["salt"],
        600_000,
    )
    if not secrets.compare_digest(password_hash, usuario["password_hash"]):
        registrar_intento_login(identificador, False, direccion_ip, "Credenciales inválidas.")
        raise HTTPException(status_code=401, detail="Credenciales inválidas.")

    registrar_intento_login(identificador, True, direccion_ip, "Inicio de sesión exitoso.")
    token = secrets.token_urlsafe(32)
    return {"token": token, "expires_in": 3600, "redirectTo": "/"}


# ═══════════════════════════════════════════════
#  ENDPOINTS: Carrusel
# ═══════════════════════════════════════════════
@app.get("/api/carousel")
def get_carousel():
    conn = sqlite3.connect(CAROUSEL_DB)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tbl_carrusel")
    rows = cursor.fetchall()
    slides = []
    for row in rows:
        slide = {
            "id": row["id"],
            "title": row["title"],
            "text": row["text"],
            "imageUrl": row["imageUrl"],
            "imageAltText": row["imageAltText"]
        }
        # incluir metadatos de orden y visibilidad si están presentes en la tabla
        try:
            slide["orden"] = row["orden"]
        except Exception:
            pass
        try:
            slide["visible"] = bool(row["visible"]) if row["visible"] is not None else None
        except Exception:
            pass
        if row["tag"]:
            slide["tag"] = row["tag"]
        if row["buttonLabel"] and row["buttonUrl"]:
            slide["button"] = {
                "label": row["buttonLabel"],
                "url": row["buttonUrl"],
                "isExternal": bool(row["isExternal"])
            }
        slides.append(slide)
    conn.close()
    return slides


# ═══════════════════════════════════════════════
#  ENDPOINTS: Landing page
# ═══════════════════════════════════════════════
@app.get("/api/landing-page")
def get_landing_page():
    conn = sqlite3.connect(LANDING_PAGE_DB)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            "SELECT * FROM tbl_landing_page WHERE visible = 1 ORDER BY orden ASC"
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


@app.get("/api/centro-informacion")
def get_centro_informacion():
    conn = sqlite3.connect(CENTRO_INFORMACION_DB)
    conn.row_factory = sqlite3.Row
    try:
        configuracion = conn.execute(
            "SELECT titulo, descripcion FROM tbl_ci_configuracion WHERE id = 1"
        ).fetchone()
        secciones = conn.execute(
            "SELECT * FROM tbl_ci_secciones WHERE visible = 1 ORDER BY orden ASC"
        ).fetchall()
        resultado = []
        for seccion in secciones:
            contenidos = conn.execute(
                "SELECT * FROM tbl_ci_contenidos WHERE seccion_id = ? AND visible = 1 ORDER BY orden ASC",
                (seccion["id"],),
            ).fetchall()
            resultado.append({**dict(seccion), "contenidos": [dict(contenido) for contenido in contenidos]})
        return {
            "titulo": configuracion["titulo"] if configuracion else "Centro de información",
            "descripcion": configuracion["descripcion"] if configuracion else "",
            "secciones": resultado,
        }
    finally:
        conn.close()


@app.post("/api/centro-contacto")
def crear_solicitud_contacto(solicitud: CentroContactoInput):
    nombre = solicitud.nombre.strip()
    correo = solicitud.correo.strip()
    asunto = solicitud.asunto.strip()
    mensaje = solicitud.mensaje.strip()
    if not nombre or len(nombre) > 120:
        raise HTTPException(status_code=422, detail="El nombre es obligatorio y debe tener máximo 120 caracteres.")
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", correo) or len(correo) > 254:
        raise HTTPException(status_code=422, detail="Ingresa un correo electrónico válido.")
    if not asunto or len(asunto) > 160:
        raise HTTPException(status_code=422, detail="El asunto es obligatorio y debe tener máximo 160 caracteres.")
    if not mensaje or len(mensaje) > 5000:
        raise HTTPException(status_code=422, detail="El mensaje es obligatorio y debe tener máximo 5000 caracteres.")

    conn = sqlite3.connect(CENTRO_CONTACTO_DB)
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO tbl_contacto_solicitudes (nombre, correo, asunto, mensaje) VALUES (?, ?, ?, ?)",
            (nombre, correo, asunto, mensaje),
        )
        solicitud_id = cursor.lastrowid
        destinatarios = [
            row[0] for row in cursor.execute(
                "SELECT email FROM tbl_contacto_destinatarios WHERE activo = 1 ORDER BY id"
            ).fetchall()
        ]
        conn.commit()

        envio_exitoso = False
        error_notificacion = "No hay destinatarios activos configurados."
        host = os.getenv("CONTACT_SMTP_HOST")
        usuario_smtp = os.getenv("CONTACT_SMTP_USER")
        clave_smtp = os.getenv("CONTACT_SMTP_PASSWORD")
        remitente = os.getenv("CONTACT_SMTP_FROM", usuario_smtp or "")

        if host and remitente and destinatarios:
            try:
                correo_salida = EmailMessage()
                correo_salida["Subject"] = f"Solicitud de contacto: {asunto}"
                correo_salida["From"] = remitente
                correo_salida["To"] = remitente
                correo_salida["Bcc"] = ", ".join(destinatarios)
                correo_salida["Reply-To"] = correo
                correo_salida.set_content(
                    f"Solicitud de contacto #{solicitud_id}\n\n"
                    f"Nombre: {nombre}\nCorreo: {correo}\nAsunto: {asunto}\n\n{mensaje}"
                )
                puerto_smtp = int(os.getenv("CONTACT_SMTP_PORT", "587"))
                usar_ssl = os.getenv("CONTACT_SMTP_SSL", "false").lower() in {"1", "true", "yes"}
                cliente_smtp = smtplib.SMTP_SSL if usar_ssl else smtplib.SMTP
                with cliente_smtp(host, puerto_smtp, timeout=15) as servidor:
                    if not usar_ssl and os.getenv("CONTACT_SMTP_STARTTLS", "true").lower() in {"1", "true", "yes"}:
                        servidor.starttls()
                    if usuario_smtp and clave_smtp:
                        servidor.login(usuario_smtp, clave_smtp)
                    servidor.send_message(correo_salida, to_addrs=destinatarios)
                envio_exitoso = True
                error_notificacion = None
            except Exception as error:
                error_notificacion = str(error)[:1000]
        elif not host:
            error_notificacion = "SMTP no está configurado."

        conn.execute(
            "UPDATE tbl_contacto_solicitudes SET notificacion_enviada = ?, error_notificacion = ? WHERE id = ?",
            (int(envio_exitoso), error_notificacion, solicitud_id),
        )
        conn.commit()
        return {"id": solicitud_id, "notificacion_enviada": envio_exitoso}
    finally:
        conn.close()


# ═══════════════════════════════════════════════
#  ENDPOINTS: Ayuda interactiva
# ═══════════════════════════════════════════════
@app.get("/api/ayuda/datos-personales")
def get_all_help():
    """Devuelve todos los ítems de ayuda de la tabla datos_personales."""
    conn = sqlite3.connect(HELP_DB)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM datos_personales ORDER BY orden ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/api/ayuda/datos-personales/{campo}")
def get_help_by_campo(campo: str):
    """Devuelve el ítem de ayuda para un campo específico."""
    conn = sqlite3.connect(HELP_DB)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM datos_personales WHERE campo = ?", (campo,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail=f"No hay ayuda para el campo '{campo}'")
    return dict(row)


# ═══════════════════════════════════════════════
#  ENDPOINTS: Características físicas - textos
# ═══════════════════════════════════════════════
@app.get("/api/caracteristicas-fisicas/textos-descriptivos")
def get_textos_descriptivos_caracteristicas_fisicas():
    conn = sqlite3.connect(CARACTERISTICAS_FISICAS_DESCRIPTIVE_DB)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            "SELECT * FROM textos_descriptivos ORDER BY orden ASC"
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


@app.get("/api/caracteristicas-fisicas/textos-ayuda")
def get_textos_ayuda_caracteristicas_fisicas():
    conn = sqlite3.connect(CARACTERISTICAS_FISICAS_HELP_DB)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            "SELECT * FROM textos_ayuda ORDER BY orden ASC"
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


# ═══════════════════════════════════════════════
#  ENDPOINTS: Datos morfológicos
# ═══════════════════════════════════════════════
@app.post("/api/datos-morfologicos", status_code=201)
def create_datos_morfologicos(datos: DatosMorfologicosInput):
    """Guarda los datos morfológicos del usuario."""
    conn = sqlite3.connect(MORFOLOGICOS_DB)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO datos_morfologicos
            (usuario_id, sexo, edad, color_piel, color_ojos, color_cabello, peso_kg, estatura_cm, climas,
             ubicacion_principal, ubicacion_secundaria, medida_hombros_cm, medida_cintura_cm, medida_cadera_cm, medida_busto_cm)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        datos.usuario_id,
        datos.sexo,
        datos.edad,
        datos.color_piel,
        datos.color_ojos,
        datos.color_cabello,
        datos.peso_kg,
        datos.estatura_cm,
        ",".join(datos.climas),
        datos.ubicacion_principal,
        datos.ubicacion_secundaria,
        datos.medida_hombros_cm,
        datos.medida_cintura_cm,
        datos.medida_cadera_cm,
        datos.medida_busto_cm
    ))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return {"id": new_id, "mensaje": "Datos morfológicos registrados exitosamente."}


@app.get("/api/datos-morfologicos/{usuario_id}")
def get_datos_morfologicos(usuario_id: str):
    """Obtiene el último registro morfológico de un usuario."""
    conn = sqlite3.connect(MORFOLOGICOS_DB)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM datos_morfologicos WHERE usuario_id = ? ORDER BY fecha_registro DESC LIMIT 1",
        (usuario_id,)
    )
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="No se encontraron datos para este usuario.")
    result = dict(row)
    result["climas"] = result["climas"].split(",") if result["climas"] else []
    return result


# ═══════════════════════════════════════════════
#  ENDPOINTS: Maestras Menus
# ═══════════════════════════════════════════════
@app.get("/api/maestras/menus/{menu_name}")
def get_menu_options(menu_name: str):
    """Devuelve las opciones para un menú específico."""
    conn = sqlite3.connect(MAESTRAS_DB)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT opcion FROM tbl_opciones_menu WHERE menu = ?", (menu_name,))
    rows = cursor.fetchall()
    conn.close()
    return [r["opcion"] for r in rows]

@app.get("/api/maestras/ubicaciones")
def get_ubicaciones():
    """Devuelve la lista de ubicaciones."""
    conn = sqlite3.connect(MAESTRAS_DB)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT ubicacion FROM tbl_ubicaciones")
    rows = cursor.fetchall()
    conn.close()
    return [r["ubicacion"] for r in rows]


# ═══════════════════════════════════════════════
#  ENDPOINTS: Asesoria
# ═══════════════════════════════════════════════
@app.get("/api/asesoria/menus")
def get_asesoria_menus(id_usuario: Optional[str] = None):
    """
    Devuelve las opciones de menú de servicios.
    Si se pasa id_usuario, filtra por ese usuario (incluyendo registros sin usuario asignado).
    Respeta los campos 'visible' y 'orden'.
    """
    conn = sqlite3.connect(ASESORIA_DB)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    parsed_id = parse_id_usuario(id_usuario)
    if parsed_id is not None:
        cursor.execute(
            "SELECT * FROM tbl_menu_servicios WHERE (id_usuario IS NULL OR id_usuario = ? OR id_usuario = 1) AND (visible IS NULL OR visible = 1) ORDER BY orden ASC",
            (parsed_id,)
        )
    else:
        cursor.execute("SELECT * FROM tbl_menu_servicios WHERE (visible IS NULL OR visible = 1) ORDER BY orden ASC")

    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/api/asesoria/menus/{menu_id}/articulos")
def get_asesoria_articulos(menu_id: int, id_usuario: Optional[str] = None):
    """
    Devuelve los artículos (tbl_menu_asesoria) asociados a un menú.
    Si se pasa id_usuario, filtra por ese usuario (incluyendo registros sin usuario asignado).
    """
    conn = sqlite3.connect(ASESORIA_DB)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    parsed_id = parse_id_usuario(id_usuario)
    if parsed_id is not None:
        cursor.execute(
            "SELECT * FROM tbl_menu_asesoria WHERE menu_servicio_id = ? AND (id_usuario IS NULL OR id_usuario = ?) ORDER BY orden ASC",
            (menu_id, parsed_id)
        )
    else:
        cursor.execute("SELECT * FROM tbl_menu_asesoria WHERE menu_servicio_id = ? ORDER BY orden ASC", (menu_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/api/asesorias")
def get_todas_asesorias(id_usuario: Optional[str] = None, asesoria_id: Optional[int] = None, tipo_asesoria: Optional[str] = None):
    """
    Devuelve items de tipo 'diapositiva' desde tbl_articulo (migrado de tbl_carrusel_items).
    Filtros opcionales:
      - tipo_asesoria: Filtra por tipo_asesoria
    Solo devuelve items con visible=1, ordenados por 'orden' ascendente.
    """
    conn = sqlite3.connect(ASESORIA_DB)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    query = """
        SELECT id, texto_html AS text_html, media_url AS imagen_url, media_tipo,
               orden, tipo_asesoria, titulo AS nombre, visible, grupo_id, tipo_contenido
        FROM tbl_articulo
        WHERE tipo_contenido = 'diapositiva'
          AND visible = 1
    """
    params: list = []
    if tipo_asesoria:
        query += " AND tipo_asesoria = ?"
        params.append(tipo_asesoria)
    query += " ORDER BY orden ASC"
    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows



# ═══════════════════════════════════════════════════════════════════════════════
#  ENDPOINTS: Artículo (marco estático texto + imagen/video)
# ═══════════════════════════════════════════════════════════════════════════════
@app.get("/api/asesoria/articulo")
def get_articulo(id_usuario: str = "1", tipo_asesoria: Optional[str] = None):
    """
    Devuelve el artículo de tbl_articulo para el tipo de asesoría indicado.
    El parámetro id_usuario se conserva por compatibilidad, pero la tabla
    tbl_articulo ya no depende de id_usuario.
    Devuelve el primer registro visible ordenado por 'orden' ASC.
    """
    row = ContenidosPersonalizadosService.get_articulo(tipo_asesoria=tipo_asesoria)
    if not row:
        raise HTTPException(status_code=404, detail="No se encontró artículo para este tipo de asesoría")
    return row


class ArticuloIn(BaseModel):
    id_usuario: Optional[int] = 1
    texto_html: Optional[str] = ""
    media_url: Optional[str] = None
    media_url_webm: Optional[str] = None
    media_tipo: Optional[str] = "imagen"
    orden: Optional[int] = 0
    tipo_asesoria: Optional[str] = None
    titulo: Optional[str] = None
    contenido: Optional[str] = None
    grupo_id: Optional[str] = None
    tags: Optional[list] = None
    publicado_en: Optional[str] = None
    visible: Optional[int] = 1


@app.get("/api/webmaster/articulos")
def wm_list_articulos(id_usuario: Optional[int] = None, tipo_asesoria: Optional[str] = None, visible_only: bool = True):
    return wc_get_articulos(tipo_asesoria=tipo_asesoria, visible_only=visible_only)


@app.get("/api/webmaster/articulo/{articulo_id}")
def wm_get_articulo(articulo_id: int):
    row = wc_get_articulo_by_id(articulo_id)
    if not row:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    return row


@app.get("/api/webmaster/articulo/{articulo_id}/menu")
def wm_get_articulo_menu(articulo_id: int):
    article = wc_get_articulo_by_id(articulo_id)
    if not article:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")

    menu_rows = wc_get_menu_articulo(
        menu_servicio_id=None,
        tipo_asesoria=article.get("tipo_asesoria"),
        visible_only=False,
    )
    return menu_rows


@app.post("/api/webmaster/articulo", status_code=201)
def wm_create_articulo(
    payload: ArticuloIn,
    menu_servicio_id: int = 28,
    menu_titulo: Optional[str] = None,
    menu_principal: Optional[str] = None,
    menu_observacion: Optional[str] = None,
):
    art = WC_Articulo(
        id_usuario=payload.id_usuario,
        texto_html=payload.texto_html or "",
        media_url=payload.media_url,
        media_url_webm=payload.media_url_webm,
        media_tipo=payload.media_tipo or "imagen",
        orden=payload.orden or 0,
        tipo_asesoria=payload.tipo_asesoria,
        titulo=payload.titulo,
        contenido=payload.contenido,
        grupo_id=payload.grupo_id,
        tags=payload.tags or [],
        publicado_en=payload.publicado_en,
        visible=payload.visible if payload.visible in (0,1) else 1,
    )
    return wc_create_articulo(
        art,
        menu_servicio_id=menu_servicio_id,
        menu_titulo=menu_titulo,
        menu_principal=menu_principal,
        menu_observacion=menu_observacion,
    )


@app.put("/api/webmaster/articulo/{articulo_id}")
def wm_update_articulo(articulo_id: int, payload: dict):
    # payload may contain fields directly or nested under 'updates'
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Cuerpo inválido")
    if 'updates' in payload:
        updates = payload.get('updates')
        menu_updates = payload.get('menu_updates')
    else:
        updates = payload
        menu_updates = payload.get('menu_updates') if isinstance(payload.get('menu_updates'), dict) else None
    if not updates:
        raise HTTPException(status_code=400, detail="Faltan campos 'updates' en el cuerpo")
    try:
        updated = wc_update_articulo(articulo_id, updates, menu_updates)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return updated


@app.delete("/api/webmaster/articulo/{articulo_id}")
def wm_delete_articulo(articulo_id: int, soft: bool = True):
    try:
        wc_delete_articulo(articulo_id, soft=soft)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"deleted": True, "soft": soft}


# ═══════════════════════════════════════════════════════════════════════════════
#  ENDPOINTS: Asesoría Rápida (reproductor continuo de fotos)
# ═══════════════════════════════════════════════════════════════════════════════
@app.get("/api/asesoria/rapida")
def get_asesoria_rapida(id_usuario: str = "1", tipo_asesoria: Optional[str] = None):
    """
    Devuelve las fotos de tbl_asesoria_rapida para el usuario indicado.
    Filtros opcionales: id_usuario, tipo_asesoria.
    Ordenadas por 'orden' ASC. Solo registros con visible=1.
    """
    return ContenidosPersonalizadosService.get_asesoria_rapida(id_usuario=id_usuario, tipo_asesoria=tipo_asesoria)


# ═══════════════════════════════════════════════════════════════════════════════
#  ENDPOINTS: Persona / Mi Perfil (Autenticación Segura)
# ═══════════════════════════════════════════════════════════════════════════════
@app.get("/api/persona/mi-perfil")
def get_mi_perfil(request: Request):
    """
    Devuelve los datos de la persona con sesión activa en tbl_persona.
    No requiere recibir un ID del cliente, deduciéndolo de forma segura del contexto.
    """
    return AuthService.get_current_profile(request)


# ═══════════════════════════════════════════════════════════════════════════════
#  ENDPOINTS: Definiciones de carruseles
# ═══════════════════════════════════════════════════════════════════════════════
@app.get("/api/asesoria/carruseles")
def get_carruseles(id_usuario: str = "1", menu_servicio_id: Optional[int] = None):
    """
    Devuelve las definiciones de componentes dinámicos para un usuario desde tbl_menu_asesoria.
    El tipo de componente se lee del campo 'componente' (columna explícita).
    Si 'componente' es NULL (registros legacy sin migrar) se hace fallback al parsing de marcadores.
    """
    conn = sqlite3.connect(ASESORIA_DB)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    parsed_id = parse_id_usuario(id_usuario)
    query = """
        SELECT id, menu_servicio_id, tipo_asesoria, orden, componente, texto_html, titulo
        FROM tbl_menu_asesoria
        WHERE componente IS NOT NULL
          AND (id_usuario IS NULL OR id_usuario = ?)
          AND (visible IS NULL OR visible = 1)
    """
    params: list = [parsed_id]

    if menu_servicio_id is not None:
        query += " AND menu_servicio_id = ?"
        params.append(menu_servicio_id)

    query += " ORDER BY orden ASC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        row = dict(r)
        # Fallback por si 'componente' estuviera vacío (no debería ocurrir tras la migración)
        if not row.get('componente'):
            texto = row.get('texto_html') or ''
            if 'RAPIDA_MARKER' in texto:            row['componente'] = 'rapida'
            elif 'ARTICULO_MARKER' in texto:        row['componente'] = 'articulo'
            elif 'TEXTO_GPT_MARKER' in texto:       row['componente'] = 'texto_gpt'
            elif 'SUGERENCIA_DIARIA_MARKER' in texto: row['componente'] = 'sugerencia_diaria'
            elif '[mi_guarda_ropas]' in texto:      row['componente'] = 'mi_guarda_ropas'
            elif '[guia_compras]' in texto:         row['componente'] = 'guia_compras'
            else:                                   row['componente'] = 'carousel'
        del row['texto_html']
        result.append(row)

    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)
