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
    requerido INTEGER NOT NULL DEFAULT 1 CHECK (requerido IN (0, 1)),
    minimo REAL,
    maximo REAL,
    paso REAL
);

CREATE TABLE IF NOT EXISTS textos_ayuda (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campo TEXT NOT NULL UNIQUE,
    titulo TEXT NOT NULL,
    contenido_html TEXT NOT NULL,
    orden INTEGER DEFAULT 0
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
