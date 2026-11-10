/* Interacciones de usuarios en artículos publicados del feed.
   Ejecutar después de 004_feed_segmentacion.sql en TheoriaM. */
USE [TheoriaM];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

IF OBJECT_ID(N'tm_feed.me_gusta', N'U') IS NULL
BEGIN
    CREATE TABLE [tm_feed].[me_gusta]
    (
        me_gusta_id BIGINT IDENTITY(1,1) NOT NULL,
        articulo_id BIGINT NOT NULL,
        usuario_id UNIQUEIDENTIFIER NOT NULL,
        creado_en DATETIME2(0) NOT NULL
            CONSTRAINT DF_feed_me_gusta_creado_en DEFAULT (SYSUTCDATETIME()),
        retirado_en DATETIME2(0) NULL,
        activo BIT NOT NULL
            CONSTRAINT DF_feed_me_gusta_activo DEFAULT (1),
        CONSTRAINT PK_feed_me_gusta PRIMARY KEY CLUSTERED (me_gusta_id),
        CONSTRAINT FK_feed_me_gusta_articulo
            FOREIGN KEY (articulo_id)
            REFERENCES [tm_feed].[articulo] (articulo_id)
            ON DELETE CASCADE,
        CONSTRAINT CK_feed_me_gusta_estado
            CHECK (
                (activo = 1 AND retirado_en IS NULL)
                OR (activo = 0 AND retirado_en IS NOT NULL)
            )
    );
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_feed_me_gusta_activo'
      AND object_id = OBJECT_ID(N'tm_feed.me_gusta')
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UX_feed_me_gusta_activo
        ON [tm_feed].[me_gusta] (usuario_id, articulo_id)
        WHERE activo = 1;
END
GO

IF OBJECT_ID(N'tm_feed.comentario', N'U') IS NULL
BEGIN
    CREATE TABLE [tm_feed].[comentario]
    (
        comentario_id BIGINT IDENTITY(1,1) NOT NULL,
        articulo_id BIGINT NOT NULL,
        usuario_id UNIQUEIDENTIFIER NOT NULL,
        contenido NVARCHAR(1000) NOT NULL,
        creado_en DATETIME2(0) NOT NULL
            CONSTRAINT DF_feed_comentario_creado_en DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_feed_comentario PRIMARY KEY CLUSTERED (comentario_id),
        CONSTRAINT FK_feed_comentario_articulo
            FOREIGN KEY (articulo_id)
            REFERENCES [tm_feed].[articulo] (articulo_id)
            ON DELETE CASCADE,
        CONSTRAINT CK_feed_comentario_contenido
            CHECK (LEN(LTRIM(RTRIM(contenido))) > 0)
    );
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_feed_comentario_articulo_fecha'
      AND object_id = OBJECT_ID(N'tm_feed.comentario')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_feed_comentario_articulo_fecha
        ON [tm_feed].[comentario] (articulo_id, creado_en, comentario_id);
END
GO

CREATE OR ALTER PROCEDURE [tm_feed].[usp_feed_interacciones_listar]
    @articulos_json NVARCHAR(MAX),
    @usuario_id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF ISJSON(@articulos_json) <> 1
        THROW 50030, 'La lista de artículos debe ser JSON válido.', 1;
    IF @usuario_id IS NULL
        THROW 50031, 'Se requiere el usuario autenticado.', 1;

    DECLARE @articulos TABLE (articulo_id BIGINT NOT NULL PRIMARY KEY);

    INSERT INTO @articulos (articulo_id)
    SELECT DISTINCT TRY_CONVERT(BIGINT, [value])
    FROM OPENJSON(@articulos_json)
    WHERE TRY_CONVERT(BIGINT, [value]) > 0;

    SELECT a.articulo_id,
           COUNT_BIG(m.me_gusta_id) AS total_me_gusta,
           CONVERT(BIT, CASE WHEN EXISTS (
               SELECT 1
               FROM [tm_feed].[me_gusta] AS propio
               WHERE propio.articulo_id = a.articulo_id
                 AND propio.usuario_id = @usuario_id
                 AND propio.activo = 1
           ) THEN 1 ELSE 0 END) AS me_gusta
    FROM @articulos AS ids
    INNER JOIN [tm_feed].[articulo] AS a
        ON a.articulo_id = ids.articulo_id AND a.estado = 1
    LEFT JOIN [tm_feed].[me_gusta] AS m
        ON m.articulo_id = a.articulo_id AND m.activo = 1
    GROUP BY a.articulo_id;

    SELECT c.articulo_id, c.comentario_id,
           COALESCE(u.seudonimo, N'Usuario') AS autor,
           c.contenido, c.creado_en
    FROM [tm_feed].[comentario] AS c
    INNER JOIN @articulos AS ids ON ids.articulo_id = c.articulo_id
    INNER JOIN [tm_feed].[articulo] AS a
        ON a.articulo_id = c.articulo_id AND a.estado = 1
    LEFT JOIN [tm_userdata].[tbl_usuarios] AS u ON u.IdUsr = c.usuario_id
    ORDER BY c.articulo_id, c.creado_en, c.comentario_id;
END
GO

CREATE OR ALTER PROCEDURE [tm_feed].[usp_feed_me_gusta_alternar]
    @articulo_id BIGINT,
    @usuario_id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @usuario_id IS NULL
        THROW 50032, 'Se requiere el usuario autenticado.', 1;
    IF NOT EXISTS (
        SELECT 1
        FROM [tm_feed].[articulo]
        WHERE articulo_id = @articulo_id AND estado = 1
    )
        RETURN;

    BEGIN TRANSACTION;

    IF EXISTS (
        SELECT 1
        FROM [tm_feed].[me_gusta] WITH (UPDLOCK, HOLDLOCK)
        WHERE articulo_id = @articulo_id
          AND usuario_id = @usuario_id
          AND activo = 1
    )
        UPDATE [tm_feed].[me_gusta]
        SET activo = 0,
            retirado_en = SYSUTCDATETIME()
        WHERE articulo_id = @articulo_id
          AND usuario_id = @usuario_id
          AND activo = 1;
    ELSE
        INSERT INTO [tm_feed].[me_gusta] (articulo_id, usuario_id)
        VALUES (@articulo_id, @usuario_id);

    DECLARE @me_gusta BIT;
    SELECT @me_gusta = CASE WHEN EXISTS (
        SELECT 1 FROM [tm_feed].[me_gusta]
        WHERE articulo_id = @articulo_id
          AND usuario_id = @usuario_id
          AND activo = 1
    ) THEN 1 ELSE 0 END;

    SELECT @me_gusta AS me_gusta,
           COUNT_BIG(m.me_gusta_id) AS total_me_gusta
    FROM [tm_feed].[articulo] AS a
    LEFT JOIN [tm_feed].[me_gusta] AS m
        ON m.articulo_id = a.articulo_id AND m.activo = 1
    WHERE a.articulo_id = @articulo_id
    GROUP BY a.articulo_id;

    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE [tm_feed].[usp_feed_comentario_crear]
    @articulo_id BIGINT,
    @usuario_id UNIQUEIDENTIFIER,
    @contenido NVARCHAR(1000)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @contenido = LTRIM(RTRIM(@contenido));
    IF @usuario_id IS NULL
        THROW 50033, 'Se requiere el usuario autenticado.', 1;
    IF @contenido IS NULL OR NULLIF(@contenido, N'') IS NULL
        THROW 50034, 'El comentario no puede estar vacío.', 1;
    IF LEN(@contenido) > 1000
        THROW 50035, 'El comentario excede el máximo de 1000 caracteres.', 1;
    IF NOT EXISTS (
        SELECT 1
        FROM [tm_feed].[articulo]
        WHERE articulo_id = @articulo_id AND estado = 1
    )
        RETURN;

    INSERT INTO [tm_feed].[comentario] (articulo_id, usuario_id, contenido)
    VALUES (@articulo_id, @usuario_id, @contenido);

    SELECT c.comentario_id,
           COALESCE(u.seudonimo, N'Usuario') AS autor,
           c.contenido, c.creado_en
    FROM [tm_feed].[comentario] AS c
    LEFT JOIN [tm_userdata].[tbl_usuarios] AS u ON u.IdUsr = c.usuario_id
    WHERE c.comentario_id = CONVERT(BIGINT, SCOPE_IDENTITY());
END
GO

PRINT N'005_feed_interacciones.sql ejecutado correctamente.';
GO
