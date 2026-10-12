PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS textos (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS campos (
    clave TEXT PRIMARY KEY,
    orden INTEGER NOT NULL UNIQUE,
    tipo TEXT NOT NULL CHECK (tipo IN ('dropdown', 'number')),
    etiqueta TEXT NOT NULL,
    placeholder TEXT NOT NULL,
    ayuda_html TEXT NOT NULL,
    requerido INTEGER NOT NULL DEFAULT 1 CHECK (requerido IN (0, 1)),
    minimo REAL,
    maximo REAL,
    paso REAL
);

CREATE TABLE IF NOT EXISTS opciones (
    campo_clave TEXT NOT NULL,
    valor TEXT NOT NULL,
    etiqueta TEXT NOT NULL,
    orden INTEGER NOT NULL,
    PRIMARY KEY (campo_clave, valor),
    FOREIGN KEY (campo_clave) REFERENCES campos(clave) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS menu (
    orden INTEGER PRIMARY KEY,
    etiqueta TEXT NOT NULL,
    ruta TEXT NOT NULL
);

INSERT OR IGNORE INTO textos (clave, valor) VALUES
    ('titulo', 'Características físicas'),
    ('logo', 'TheorIA M'),
    ('slogan', 'ESTILO CON INTENCIÓN'),
    ('saludo', 'Hola {seudonimo}. Ahora vamos a tomar tus características físicas para construir tu gemelo digital.'),
    ('aviso_privacidad', 'Usaremos estos datos para personalizar tu gemelo digital. Para más información, consulta nuestra Política de privacidad.'),
    ('menu_aria', 'Navegación principal'),
    ('ayuda_aria', 'Mostrar ayuda para'),
    ('icono_ayuda', '?'),
    ('estado_cargando', 'Cargando formulario...'),
    ('error_requerido', 'Completa este campo.'),
    ('error_rango', 'El valor debe estar dentro del rango permitido.'),
    ('error_opcion', 'Selecciona una opción válida.'),
    ('error_sesion', 'Tu sesión ha caducado. Inicia sesión para continuar.'),
    ('error_carga', 'No fue posible cargar el formulario. Inténtalo de nuevo más tarde.'),
    ('error_envio', 'No fue posible guardar tu perfil. Inténtalo de nuevo.'),
    ('guardado', 'Tu perfil se guardó correctamente.'),
    ('guardando', 'Guardando...'),
    ('anterior', 'Anterior'),
    ('guardar', 'Guardar perfil ✓'),
    ('siguiente', 'Siguiente'),
    ('ruta_anterior', '/nuevo-usuario');

DELETE FROM textos WHERE clave = 'ruta_siguiente';

INSERT OR IGNORE INTO campos
    (clave, orden, tipo, etiqueta, placeholder, ayuda_html, requerido, minimo, maximo, paso)
VALUES
    ('sexo', 1, 'dropdown', 'Sexo', 'Selecciona tu sexo…',
     '<p>Selecciona la opción que mejor te represente.</p>', 1, NULL, NULL, NULL),
    ('color_piel', 2, 'dropdown', 'Color de piel', 'Selecciona tu tono de piel…',
     '<p>Observa tu piel con luz natural y elige el tono que mejor la describa.</p><img src="https://images.unsplash.com/photo-1617577255197-a4dc2e3a1bd2?auto=format&amp;fit=crop&amp;q=80&amp;w=600" alt="Ejemplo de tonos de piel">', 1, NULL, NULL, NULL),
    ('peso_kg', 3, 'number', 'Peso en kilogramos', '0',
     '<p>Registra tu peso actual en kilogramos. Puedes usar decimales.</p>', 1, 20, 500, 0.1),
    ('estatura_cm', 4, 'number', 'Estatura en centímetros', '0',
     '<p>Ingresa tu estatura en centímetros, sin calzado.</p>', 1, 80, 250, 0.1),
    ('color_cabello', 5, 'dropdown', 'Color de cabello', 'Selecciona tu color de cabello…',
     '<p>Indica el color natural de tu cabello. Si lo tiñes, considera el color de raíz.</p><img src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&amp;fit=crop&amp;q=80&amp;w=600" alt="Ejemplo de color de cabello">', 1, NULL, NULL, NULL);

INSERT OR IGNORE INTO opciones (campo_clave, valor, etiqueta, orden) VALUES
    ('sexo', 'femenino', 'Femenino', 1),
    ('sexo', 'masculino', 'Masculino', 2),
    ('sexo', 'intersexual', 'Intersexual', 3),
    ('sexo', 'prefiero_no_decir', 'Prefiero no decirlo', 4),
    ('color_piel', 'muy_clara', 'Muy clara', 1),
    ('color_piel', 'clara', 'Clara', 2),
    ('color_piel', 'media', 'Media', 3),
    ('color_piel', 'morena', 'Morena', 4),
    ('color_piel', 'oscura', 'Oscura', 5),
    ('color_cabello', 'negro', 'Negro', 1),
    ('color_cabello', 'castano_oscuro', 'Castaño oscuro', 2),
    ('color_cabello', 'castano', 'Castaño', 3),
    ('color_cabello', 'rubio', 'Rubio', 4),
    ('color_cabello', 'pelirrojo', 'Pelirrojo', 5),
    ('color_cabello', 'gris', 'Gris', 6),
    ('color_cabello', 'blanco', 'Blanco', 7),
    ('color_cabello', 'otro', 'Otro', 8);

INSERT OR IGNORE INTO menu (orden, etiqueta, ruta) VALUES
    (1, 'Registrarte', '/nuevo-usuario'),
    (2, 'Iniciar sesión', '/iniciar-sesion'),
    (3, 'Información', '/ci');
