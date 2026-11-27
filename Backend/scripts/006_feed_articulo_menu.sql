/* Asignación de artículos por menú y prioridad global.
   Ejecutar después de 003_feed_menu.sql, 004_feed_segmentacion.sql
   y 005_feed_interacciones.sql en la base TheoriaM. */
USE [TheoriaM];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

IF OBJECT_ID(N'tm_feed.articulo_menu', N'U') IS NULL
BEGIN
    CREATE TABLE [tm_feed].[articulo_menu]
    (
        articulo_id BIGINT NOT NULL,
        menu_id     BIGINT NOT NULL,
        orden       INT NOT NULL,
        CONSTRAINT PK_articulo_menu PRIMARY KEY CLUSTERED (articulo_id, menu_id),
        CONSTRAINT FK_articulo_menu_articulo
            FOREIGN KEY (articulo_id) REFERENCES [tm_feed].[articulo] (articulo_id)
            ON DELETE CASCADE,
        CONSTRAINT FK_articulo_menu_menu
            FOREIGN KEY (menu_id) REFERENCES [tm_feed].[menu_principal] (menu_id)
            ON DELETE CASCADE
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_articulo_menu_menu_orden'
      AND object_id = OBJECT_ID(N'tm_feed.articulo_menu')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_articulo_menu_menu_orden
        ON [tm_feed].[articulo_menu] (menu_id, orden, articulo_id);
END
GO

/* Conserva en Inicio la publicación que ya existía antes de esta migración. */
IF EXISTS (
    SELECT 1 FROM [tm_feed].[menu_principal]
    WHERE codigo = 'inicio' AND destino = 'feed'
)
AND NOT EXISTS (SELECT 1 FROM [tm_feed].[articulo_menu])
BEGIN
    INSERT INTO [tm_feed].[articulo_menu] (articulo_id, menu_id, orden)
    SELECT a.articulo_id, m.menu_id, a.prioridad
    FROM [tm_feed].[articulo] AS a
    CROSS JOIN [tm_feed].[menu_principal] AS m
    WHERE m.codigo = 'inicio'
      AND m.destino = 'feed'
      AND NOT EXISTS (
          SELECT 1
          FROM [tm_feed].[articulo_menu] AS am
          WHERE am.articulo_id = a.articulo_id
            AND am.menu_id = m.menu_id
      );
END
GO

CREATE OR ALTER PROCEDURE [tm_feed].[usp_feed_candidatos_listar]
    @cursor_prioridad INT = NULL,
    @cursor_fecha DATETIME2(0) = NULL,
    @cursor_id BIGINT = NULL,
    @limite INT = 50,
    @menu_codigo VARCHAR(50) = 'inicio'
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @limite IS NULL OR @limite < 1 SET @limite = 50;
    IF @limite > 50 SET @limite = 50;

    CREATE TABLE #pagina
    (
        articulo_id BIGINT NOT NULL PRIMARY KEY,
        titulo NVARCHAR(200) NOT NULL,
        publicado_en DATETIME2(0) NOT NULL,
        prioridad INT NOT NULL
    );

    INSERT INTO #pagina (articulo_id, titulo, publicado_en, prioridad)
    SELECT TOP (@limite + 1)
           a.articulo_id, a.titulo, a.publicado_en, a.prioridad
    FROM [tm_feed].[articulo] AS a
    INNER JOIN [tm_feed].[menu_principal] AS m
        ON m.codigo = @menu_codigo
       AND m.destino = 'feed'
       AND m.activo = 1
    INNER JOIN [tm_feed].[articulo_menu] AS am
        ON am.articulo_id = a.articulo_id
       AND am.menu_id = m.menu_id
    WHERE a.estado = 1
      AND (
            @cursor_prioridad IS NULL
         OR a.prioridad > @cursor_prioridad
         OR (
                a.prioridad = @cursor_prioridad
            AND (
                    a.publicado_en < @cursor_fecha
                 OR (
                        a.publicado_en = @cursor_fecha
                    AND a.articulo_id < @cursor_id
                 )
            )
         )
      )
    ORDER BY a.prioridad ASC, a.publicado_en DESC, a.articulo_id DESC;

    SELECT articulo_id, titulo, publicado_en, prioridad
    FROM #pagina
    ORDER BY prioridad ASC, publicado_en DESC, articulo_id DESC;

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

    SELECT articulo_id, titulo, publicado_en, estado, prioridad
    FROM [tm_feed].[articulo]
    ORDER BY prioridad ASC, publicado_en DESC, articulo_id DESC;

    SELECT b.articulo_id, b.bloque_id, b.orden, b.tipo, b.payload_json
    FROM [tm_feed].[articulo_bloque] AS b
    INNER JOIN [tm_feed].[articulo] AS a ON a.articulo_id = b.articulo_id
    ORDER BY b.articulo_id, b.orden;

    SELECT s.articulo_id, s.reglas_json
    FROM [tm_feed].[articulo_segmentacion] AS s
    INNER JOIN [tm_feed].[articulo] AS a ON a.articulo_id = s.articulo_id;

    SELECT am.articulo_id, m.codigo AS menu_codigo, am.orden
    FROM [tm_feed].[articulo_menu] AS am
    INNER JOIN [tm_feed].[menu_principal] AS m ON m.menu_id = am.menu_id
    ORDER BY am.articulo_id, am.orden, m.menu_id;
END
GO

CREATE OR ALTER PROCEDURE [tm_feed].[usp_feed_admin_articulo_guardar]
    @articulo_id BIGINT = NULL,
    @titulo NVARCHAR(200),
    @contenido NVARCHAR(MAX) = NULL,
    @estado TINYINT,
    @prioridad INT = 0,
    @reglas_json NVARCHAR(MAX) = NULL,
    @asignaciones_json NVARCHAR(MAX) = N'[]'
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
    IF @asignaciones_json IS NULL OR ISJSON(@asignaciones_json) <> 1
        THROW 50025, 'Las asignaciones de menú no contienen JSON válido.', 1;
    IF EXISTS (SELECT 1 FROM OPENJSON(@asignaciones_json) WHERE [type] <> 5)
        THROW 50026, 'Cada asignación de menú debe ser un objeto JSON.', 1;
    IF @articulo_id IS NOT NULL
       AND NOT EXISTS (
            SELECT 1 FROM [tm_feed].[articulo] WHERE articulo_id = @articulo_id
       )
        RETURN;

    CREATE TABLE #asignaciones
    (
        menu_codigo VARCHAR(50) NOT NULL,
        orden INT NOT NULL
    );

    INSERT INTO #asignaciones (menu_codigo, orden)
    SELECT menu_codigo, orden
    FROM OPENJSON(@asignaciones_json)
    WITH (
        menu_codigo VARCHAR(50) '$.menu_id',
        orden INT '$.orden'
    );

    IF (SELECT COUNT_BIG(*) FROM #asignaciones)
       <> (SELECT COUNT_BIG(*) FROM OPENJSON(@asignaciones_json))
        THROW 50027, 'Cada asignación requiere menu_id y orden.', 1;
    IF EXISTS (
        SELECT menu_codigo FROM #asignaciones
        GROUP BY menu_codigo HAVING COUNT(*) > 1
    )
        THROW 50028, 'Un artículo no puede repetirse en el mismo menú.', 1;
    IF EXISTS (
        SELECT 1
        FROM #asignaciones AS a
        LEFT JOIN [tm_feed].[menu_principal] AS m
            ON m.codigo = a.menu_codigo
        WHERE m.menu_id IS NULL OR m.destino <> 'feed' OR m.activo = 0
    )
        THROW 50029, 'Una asignación referencia un menú de Feed inactivo o inexistente.', 1;

    BEGIN TRANSACTION;

    IF @articulo_id IS NULL
    BEGIN
        INSERT INTO [tm_feed].[articulo] (titulo, estado, prioridad)
        VALUES (@titulo, @estado, @prioridad);
        SET @articulo_id = CONVERT(BIGINT, SCOPE_IDENTITY());
    END
    ELSE
    BEGIN
        UPDATE [tm_feed].[articulo]
        SET titulo = @titulo,
            estado = @estado,
            prioridad = @prioridad,
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
            SELECT 1 FROM [tm_feed].[articulo_bloque]
            WHERE articulo_id = @articulo_id AND tipo <> 'texto'
        ) OR (
            SELECT COUNT_BIG(*) FROM [tm_feed].[articulo_bloque]
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
            (SELECT @contenido AS contenido FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
        );
    END

    IF @reglas_json IS NULL
        DELETE FROM [tm_feed].[articulo_segmentacion]
        WHERE articulo_id = @articulo_id;
    ELSE
    BEGIN
        UPDATE [tm_feed].[articulo_segmentacion]
        SET reglas_json = @reglas_json, actualizado_en = SYSUTCDATETIME()
        WHERE articulo_id = @articulo_id;

        IF @@ROWCOUNT = 0
            INSERT INTO [tm_feed].[articulo_segmentacion] (articulo_id, reglas_json)
            VALUES (@articulo_id, @reglas_json);
    END

    DELETE FROM [tm_feed].[articulo_menu] WHERE articulo_id = @articulo_id;
    INSERT INTO [tm_feed].[articulo_menu] (articulo_id, menu_id, orden)
    SELECT @articulo_id, m.menu_id, a.orden
    FROM #asignaciones AS a
    INNER JOIN [tm_feed].[menu_principal] AS m ON m.codigo = a.menu_codigo;

    UPDATE [tm_feed].[articulo]
    SET actualizado_en = SYSUTCDATETIME()
    WHERE articulo_id = @articulo_id;

    COMMIT TRANSACTION;

    SELECT articulo_id, titulo, publicado_en, estado
    FROM [tm_feed].[articulo]
    WHERE articulo_id = @articulo_id;
END
GO

PRINT N'006_feed_articulo_menu.sql ejecutado correctamente.';
GO
