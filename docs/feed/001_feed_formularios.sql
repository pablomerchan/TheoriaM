/* =====================================================================
   TheorIA M  |  001_feed_formularios.sql
   Dominios: feed (tm_feed) y formularios (tm_formularios)
   Motor:    SQL Server 2022   |   Base de datos: TheoriaM
   Idempotente: se puede ejecutar varias veces sin romper nada.

   NOTAS DE DISEÑO
   - usuario_id es una referencia "blanda" al dominio de usuarios
     (tm_userdata.tbl_usuarios). NO hay FOREIGN KEY entre dominios, para
     poder separarlos luego en microservicios. Ajusta el tipo (INT/BIGINT)
     para que coincida con la clave de tbl_usuarios.
   - El Backend NO toca las tablas: solo ejecuta los procedimientos
     almacenados (ver 002_permisos_feed.sql).
   - Imágenes y videos: solo se guarda su ruta/URL dentro de payload_json.
   ===================================================================== */

USE [TheoriaM];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

/* ---------------------------------------------------------------------
   1. ESQUEMAS (uno por dominio)
   --------------------------------------------------------------------- */
IF SCHEMA_ID(N'tm_feed') IS NULL
    EXEC (N'CREATE SCHEMA [tm_feed] AUTHORIZATION [dbo];');
GO
IF SCHEMA_ID(N'tm_formularios') IS NULL
    EXEC (N'CREATE SCHEMA [tm_formularios] AUTHORIZATION [dbo];');
GO

/* ---------------------------------------------------------------------
   2. TABLAS DEL DOMINIO FEED
   --------------------------------------------------------------------- */
IF OBJECT_ID(N'tm_feed.articulo', N'U') IS NULL
BEGIN
    CREATE TABLE [tm_feed].[articulo]
    (
        articulo_id     BIGINT        IDENTITY(1,1) NOT NULL,
        titulo          NVARCHAR(200) NOT NULL,
        publicado_en    DATETIME2(0)  NOT NULL
                        CONSTRAINT DF_articulo_publicado_en DEFAULT (SYSUTCDATETIME()),
        estado          TINYINT       NOT NULL
                        CONSTRAINT DF_articulo_estado DEFAULT (0),   -- 0 borrador, 1 publicado, 2 archivado
        creado_en       DATETIME2(0)  NOT NULL
                        CONSTRAINT DF_articulo_creado_en DEFAULT (SYSUTCDATETIME()),
        actualizado_en  DATETIME2(0)  NOT NULL
                        CONSTRAINT DF_articulo_actualizado_en DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_articulo PRIMARY KEY CLUSTERED (articulo_id),
        CONSTRAINT CK_articulo_estado CHECK (estado IN (0, 1, 2))
    );
END
GO

IF OBJECT_ID(N'tm_feed.articulo_bloque', N'U') IS NULL
BEGIN
    CREATE TABLE [tm_feed].[articulo_bloque]
    (
        bloque_id     BIGINT        IDENTITY(1,1) NOT NULL,
        articulo_id   BIGINT        NOT NULL,
        orden         SMALLINT      NOT NULL,
        tipo          VARCHAR(10)   NOT NULL,           -- texto | imagen | video | form
        payload_json  NVARCHAR(MAX) NOT NULL,
        CONSTRAINT PK_articulo_bloque PRIMARY KEY CLUSTERED (bloque_id),
        CONSTRAINT FK_articulo_bloque_articulo
            FOREIGN KEY (articulo_id) REFERENCES [tm_feed].[articulo] (articulo_id)
            ON DELETE CASCADE,
        CONSTRAINT CK_articulo_bloque_tipo CHECK (tipo IN ('texto', 'imagen', 'video', 'form')),
        CONSTRAINT CK_articulo_bloque_json CHECK (ISJSON(payload_json) = 1),
        CONSTRAINT UQ_articulo_bloque_orden UNIQUE (articulo_id, orden)
    );
END
GO

/* Índice para la paginación por CURSOR (solo artículos publicados). */
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = N'IX_articulo_cursor'
                 AND object_id = OBJECT_ID(N'tm_feed.articulo'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_articulo_cursor
        ON [tm_feed].[articulo] (publicado_en DESC, articulo_id DESC)
        INCLUDE (titulo)
        WHERE estado = 1;
END
GO

/* ---------------------------------------------------------------------
   3. TABLA DEL DOMINIO FORMULARIOS
   --------------------------------------------------------------------- */
IF OBJECT_ID(N'tm_formularios.respuesta_formulario', N'U') IS NULL
BEGIN
    CREATE TABLE [tm_formularios].[respuesta_formulario]
    (
        respuesta_id       BIGINT           IDENTITY(1,1) NOT NULL,
        usuario_id         INT              NOT NULL,     -- referencia blanda a tbl_usuarios
        articulo_id        BIGINT           NOT NULL,     -- referencia blanda a tm_feed.articulo
        form_id            VARCHAR(100)     NOT NULL,
        datos_json         NVARCHAR(MAX)    NOT NULL,
        client_request_id  UNIQUEIDENTIFIER NOT NULL,     -- idempotencia (lo genera el FrontEnd)
        creado_en          DATETIME2(0)     NOT NULL
                           CONSTRAINT DF_respuesta_creado_en DEFAULT (SYSUTCDATETIME()),
        actualizado_en     DATETIME2(0)     NOT NULL
                           CONSTRAINT DF_respuesta_actualizado_en DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_respuesta_formulario PRIMARY KEY CLUSTERED (respuesta_id),
        CONSTRAINT CK_respuesta_json CHECK (ISJSON(datos_json) = 1),
        CONSTRAINT UQ_respuesta_request UNIQUE (client_request_id),
        CONSTRAINT UQ_respuesta_usuario_form UNIQUE (usuario_id, articulo_id, form_id)
    );
END
GO

/* ---------------------------------------------------------------------
   4. PROCEDIMIENTOS ALMACENADOS
   --------------------------------------------------------------------- */

/* 4.1 Listar el feed con paginación por cursor.
   - Primera página: @cursor_fecha = NULL y @cursor_id = NULL.
   - Devuelve hasta @limite + 1 artículos: si llegan @limite + 1, hay más
     páginas y el Backend arma siguienteCursor con el ÚLTIMO artículo que
     entrega (el número @limite) y descarta el sobrante.
   - Resultado 1: artículos.  Resultado 2: bloques de esos artículos. */
CREATE OR ALTER PROCEDURE [tm_feed].[usp_feed_listar]
    @cursor_fecha DATETIME2(0) = NULL,
    @cursor_id    BIGINT       = NULL,
    @limite       INT          = 10
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @limite IS NULL OR @limite < 1  SET @limite = 10;
    IF @limite > 50                    SET @limite = 50;

    CREATE TABLE #pagina
    (
        articulo_id  BIGINT        NOT NULL PRIMARY KEY,
        titulo       NVARCHAR(200) NOT NULL,
        publicado_en DATETIME2(0)  NOT NULL
    );

    INSERT INTO #pagina (articulo_id, titulo, publicado_en)
    SELECT TOP (@limite + 1)
           a.articulo_id, a.titulo, a.publicado_en
    FROM   [tm_feed].[articulo] AS a
    WHERE  a.estado = 1
      AND  (
              @cursor_fecha IS NULL
           OR a.publicado_en < @cursor_fecha
           OR (a.publicado_en = @cursor_fecha AND a.articulo_id < @cursor_id)
           )
    ORDER BY a.publicado_en DESC, a.articulo_id DESC;

    -- Resultado 1: artículos (mismo orden del cursor)
    SELECT articulo_id, titulo, publicado_en
    FROM   #pagina
    ORDER BY publicado_en DESC, articulo_id DESC;

    -- Resultado 2: bloques de esos artículos
    SELECT b.articulo_id, b.bloque_id, b.orden, b.tipo, b.payload_json
    FROM   [tm_feed].[articulo_bloque] AS b
    JOIN   #pagina AS p ON p.articulo_id = b.articulo_id
    ORDER BY b.articulo_id, b.orden;
END
GO

/* 4.2 Obtener la respuesta actual de un usuario a un formulario. */
CREATE OR ALTER PROCEDURE [tm_formularios].[usp_respuesta_obtener]
    @usuario_id  INT,
    @articulo_id BIGINT,
    @form_id     VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT respuesta_id, usuario_id, articulo_id, form_id,
           datos_json, client_request_id, creado_en, actualizado_en
    FROM   [tm_formularios].[respuesta_formulario]
    WHERE  usuario_id  = @usuario_id
      AND  articulo_id = @articulo_id
      AND  form_id     = @form_id;
END
GO

/* 4.3 Guardar (crear o actualizar) una respuesta. IDEMPOTENTE:
   si llega de nuevo el mismo @client_request_id (doble clic, reintento),
   devuelve lo ya guardado sin duplicar ni volver a escribir. */
CREATE OR ALTER PROCEDURE [tm_formularios].[usp_respuesta_guardar]
    @usuario_id        INT,
    @articulo_id       BIGINT,
    @form_id           VARCHAR(100),
    @datos_json        NVARCHAR(MAX),
    @client_request_id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @usuario_id IS NULL OR @usuario_id <= 0
        THROW 50001, 'usuario_id invalido.', 1;
    IF ISJSON(@datos_json) <> 1
        THROW 50002, 'datos_json no es un JSON valido.', 1;

    BEGIN TRAN;

    -- 1) ¿Ya se procesó esta petición?
    IF EXISTS (SELECT 1
               FROM   [tm_formularios].[respuesta_formulario] WITH (UPDLOCK, HOLDLOCK)
               WHERE  client_request_id = @client_request_id
                 AND  usuario_id        = @usuario_id)
    BEGIN
        SELECT respuesta_id, usuario_id, articulo_id, form_id,
               datos_json, client_request_id, creado_en, actualizado_en
        FROM   [tm_formularios].[respuesta_formulario]
        WHERE  client_request_id = @client_request_id;
        COMMIT;
        RETURN;
    END

    -- 2) Actualizar la respuesta existente (si la hay)...
    UPDATE [tm_formularios].[respuesta_formulario] WITH (UPDLOCK, HOLDLOCK)
    SET    datos_json        = @datos_json,
           client_request_id = @client_request_id,
           actualizado_en    = SYSUTCDATETIME()
    WHERE  usuario_id  = @usuario_id
      AND  articulo_id = @articulo_id
      AND  form_id     = @form_id;

    -- 3) ...o crearla.
    IF @@ROWCOUNT = 0
        INSERT INTO [tm_formularios].[respuesta_formulario]
               (usuario_id, articulo_id, form_id, datos_json, client_request_id)
        VALUES (@usuario_id, @articulo_id, @form_id, @datos_json, @client_request_id);

    SELECT respuesta_id, usuario_id, articulo_id, form_id,
           datos_json, client_request_id, creado_en, actualizado_en
    FROM   [tm_formularios].[respuesta_formulario]
    WHERE  usuario_id  = @usuario_id
      AND  articulo_id = @articulo_id
      AND  form_id     = @form_id;

    COMMIT;
END
GO

/* ---------------------------------------------------------------------
   5. DATOS DE EJEMPLO (solo si el feed está vacío)
   --------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM [tm_feed].[articulo])
BEGIN
    DECLARE @a1 BIGINT, @a2 BIGINT, @a3 BIGINT;

    INSERT INTO [tm_feed].[articulo] (titulo, publicado_en, estado)
    VALUES (N'Bienvenido a TheorIA M', DATEADD(DAY, -2, SYSUTCDATETIME()), 1);
    SET @a1 = SCOPE_IDENTITY();

    INSERT INTO [tm_feed].[articulo] (titulo, publicado_en, estado)
    VALUES (N'Tu primer video', DATEADD(DAY, -1, SYSUTCDATETIME()), 1);
    SET @a2 = SCOPE_IDENTITY();

    INSERT INTO [tm_feed].[articulo] (titulo, publicado_en, estado)
    VALUES (N'¿Cómo te sientes hoy?', SYSUTCDATETIME(), 1);
    SET @a3 = SCOPE_IDENTITY();

    INSERT INTO [tm_feed].[articulo_bloque] (articulo_id, orden, tipo, payload_json) VALUES
    (@a1, 1, 'texto',  N'{"contenido":"<p>Este es tu espacio. Aquí encontrarás artículos y formularios.</p>"}'),
    (@a1, 2, 'imagen', N'{"url":"/media/bienvenida.jpg","alt":"Imagen de bienvenida","ancho":1200,"alto":800}'),
    (@a2, 1, 'texto',  N'{"contenido":"<p>Mira este breve video introductorio.</p>"}'),
    (@a2, 2, 'video',  N'{"url":"/media/intro.mp4","poster":"/media/intro.jpg","ancho":1280,"alto":720}'),
    (@a3, 1, 'texto',  N'{"contenido":"<p>Cuéntanos cómo va tu día.</p>"}'),
    (@a3, 2, 'form',   N'{"formId":"estado-animo"}');
END
GO

PRINT N'001_feed_formularios.sql ejecutado correctamente.';
GO
