/* Segmentación por condiciones declarativas para los artículos del feed.
   Ejecutar después de 001_feed_formularios.sql en la base TheoriaM. */
USE [TheoriaM];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

IF SCHEMA_ID(N'tm_feed') IS NULL
    EXEC (N'CREATE SCHEMA [tm_feed] AUTHORIZATION [dbo];');
GO

IF OBJECT_ID(N'tm_feed.articulo_segmentacion', N'U') IS NULL
BEGIN
    CREATE TABLE [tm_feed].[articulo_segmentacion]
    (
        articulo_id BIGINT NOT NULL,
        reglas_json NVARCHAR(MAX) NOT NULL,
        actualizado_en DATETIME2(0) NOT NULL
            CONSTRAINT DF_articulo_segmentacion_actualizado_en
            DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_articulo_segmentacion
            PRIMARY KEY CLUSTERED (articulo_id),
        CONSTRAINT FK_articulo_segmentacion_articulo
            FOREIGN KEY (articulo_id)
            REFERENCES [tm_feed].[articulo] (articulo_id)
            ON DELETE CASCADE,
        CONSTRAINT CK_articulo_segmentacion_json
            CHECK (ISJSON(reglas_json) = 1)
    );
END
GO

CREATE OR ALTER PROCEDURE [tm_feed].[usp_feed_candidatos_listar]
    @cursor_fecha DATETIME2(0) = NULL,
    @cursor_id    BIGINT       = NULL,
    @limite       INT          = 50
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @limite IS NULL OR @limite < 1 SET @limite = 50;
    IF @limite > 50 SET @limite = 50;

    CREATE TABLE #pagina
    (
        articulo_id  BIGINT        NOT NULL PRIMARY KEY,
        titulo       NVARCHAR(200) NOT NULL,
        publicado_en DATETIME2(0)  NOT NULL
    );

    INSERT INTO #pagina (articulo_id, titulo, publicado_en)
    SELECT TOP (@limite + 1)
           a.articulo_id, a.titulo, a.publicado_en
    FROM [tm_feed].[articulo] AS a
    WHERE a.estado = 1
      AND (
            @cursor_fecha IS NULL
         OR a.publicado_en < @cursor_fecha
         OR (a.publicado_en = @cursor_fecha AND a.articulo_id < @cursor_id)
      )
    ORDER BY a.publicado_en DESC, a.articulo_id DESC;

    SELECT articulo_id, titulo, publicado_en
    FROM #pagina
    ORDER BY publicado_en DESC, articulo_id DESC;

    SELECT b.articulo_id, b.bloque_id, b.orden, b.tipo, b.payload_json
    FROM [tm_feed].[articulo_bloque] AS b
    INNER JOIN #pagina AS p ON p.articulo_id = b.articulo_id
    ORDER BY b.articulo_id, b.orden;

    SELECT s.articulo_id, s.reglas_json
    FROM [tm_feed].[articulo_segmentacion] AS s
    INNER JOIN #pagina AS p ON p.articulo_id = s.articulo_id;
END
GO

CREATE OR ALTER PROCEDURE [tm_feed].[usp_feed_admin_articulos_listar]
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SELECT articulo_id, titulo, publicado_en, estado
    FROM [tm_feed].[articulo]
    ORDER BY actualizado_en DESC, articulo_id DESC;

    SELECT b.articulo_id, b.bloque_id, b.orden, b.tipo, b.payload_json
    FROM [tm_feed].[articulo_bloque] AS b
    INNER JOIN [tm_feed].[articulo] AS a ON a.articulo_id = b.articulo_id
    ORDER BY b.articulo_id, b.orden;

    SELECT s.articulo_id, s.reglas_json
    FROM [tm_feed].[articulo_segmentacion] AS s
    INNER JOIN [tm_feed].[articulo] AS a ON a.articulo_id = s.articulo_id;
END
GO

CREATE OR ALTER PROCEDURE [tm_feed].[usp_feed_admin_articulo_guardar]
    @articulo_id BIGINT = NULL,
    @titulo NVARCHAR(200),
    @contenido NVARCHAR(MAX) = NULL,
    @estado TINYINT,
    @reglas_json NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NULLIF(LTRIM(RTRIM(@titulo)), N'') IS NULL
        THROW 50020, 'El título del artículo es obligatorio.', 1;
    IF @estado NOT IN (0, 1, 2)
        THROW 50021, 'El estado del artículo no es válido.', 1;
    IF @reglas_json IS NOT NULL AND ISJSON(@reglas_json) <> 1
        THROW 50022, 'Las reglas de segmentación no contienen JSON válido.', 1;
    IF @articulo_id IS NOT NULL
       AND NOT EXISTS (
            SELECT 1
            FROM [tm_feed].[articulo]
            WHERE articulo_id = @articulo_id
       )
        RETURN;

    BEGIN TRANSACTION;

    IF @articulo_id IS NULL
    BEGIN
        INSERT INTO [tm_feed].[articulo] (titulo, estado)
        VALUES (@titulo, @estado);
        SET @articulo_id = CONVERT(BIGINT, SCOPE_IDENTITY());
    END
    ELSE
    BEGIN
        UPDATE [tm_feed].[articulo]
        SET titulo = @titulo,
            estado = @estado,
            actualizado_en = SYSUTCDATETIME()
        WHERE articulo_id = @articulo_id;

        IF @@ROWCOUNT = 0
        BEGIN
            ROLLBACK TRANSACTION;
            THROW 50023, 'No se encontró el artículo del feed.', 1;
        END
    END

    IF @contenido IS NOT NULL
    BEGIN
        IF EXISTS (
            SELECT 1
            FROM [tm_feed].[articulo_bloque]
            WHERE articulo_id = @articulo_id
              AND tipo <> 'texto'
        ) OR (
            SELECT COUNT_BIG(*)
            FROM [tm_feed].[articulo_bloque]
            WHERE articulo_id = @articulo_id
        ) > 1
        BEGIN
            ROLLBACK TRANSACTION;
            THROW 50024, 'Este artículo tiene bloques que este editor no puede modificar.', 1;
        END

        DELETE FROM [tm_feed].[articulo_bloque]
        WHERE articulo_id = @articulo_id;

        INSERT INTO [tm_feed].[articulo_bloque]
            (articulo_id, orden, tipo, payload_json)
        VALUES (
            @articulo_id,
            1,
            'texto',
            (
                SELECT @contenido AS contenido
                FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
            )
        );
    END

    IF @reglas_json IS NULL
    BEGIN
        DELETE FROM [tm_feed].[articulo_segmentacion]
        WHERE articulo_id = @articulo_id;
    END
    ELSE
    BEGIN
        UPDATE [tm_feed].[articulo_segmentacion]
        SET reglas_json = @reglas_json,
            actualizado_en = SYSUTCDATETIME()
        WHERE articulo_id = @articulo_id;

        IF @@ROWCOUNT = 0
            INSERT INTO [tm_feed].[articulo_segmentacion]
                (articulo_id, reglas_json)
            VALUES (@articulo_id, @reglas_json);
    END

    UPDATE [tm_feed].[articulo]
    SET actualizado_en = SYSUTCDATETIME()
    WHERE articulo_id = @articulo_id;

    COMMIT TRANSACTION;

    SELECT articulo_id, titulo, publicado_en, estado
    FROM [tm_feed].[articulo]
    WHERE articulo_id = @articulo_id;
END
GO

PRINT N'004_feed_segmentacion.sql ejecutado correctamente.';
GO
