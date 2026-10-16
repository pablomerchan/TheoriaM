/* Menú configurable del feed. Ejecutar en TheoriaM después de los scripts
   001_feed_formularios.sql y 002_permisos_feed.sql. */
USE [TheoriaM];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

IF SCHEMA_ID(N'tm_feed') IS NULL
    EXEC (N'CREATE SCHEMA [tm_feed] AUTHORIZATION [dbo];');
GO

IF OBJECT_ID(N'tm_feed.menu_principal', N'U') IS NULL
BEGIN
    CREATE TABLE [tm_feed].[menu_principal]
    (
        menu_id          BIGINT        IDENTITY(1,1) NOT NULL,
        codigo           VARCHAR(50)   NOT NULL,
        etiqueta         NVARCHAR(100) NOT NULL,
        icono            NVARCHAR(16)  NOT NULL,
        destino          VARCHAR(10)   NOT NULL,
        valor            NVARCHAR(200) NOT NULL
                         CONSTRAINT DF_menu_principal_valor DEFAULT (N''),
        criterio_filtro  NVARCHAR(100) NULL,
        orden            SMALLINT      NOT NULL,
        activo           BIT           NOT NULL
                         CONSTRAINT DF_menu_principal_activo DEFAULT (1),
        CONSTRAINT PK_menu_principal PRIMARY KEY CLUSTERED (menu_id),
        CONSTRAINT UQ_menu_principal_codigo UNIQUE (codigo),
        CONSTRAINT CK_menu_principal_destino
            CHECK (destino IN ('feed', 'ruta', 'panel', 'accion'))
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_menu_principal_activo_orden'
      AND object_id = OBJECT_ID(N'tm_feed.menu_principal')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_menu_principal_activo_orden
        ON [tm_feed].[menu_principal] (orden, menu_id)
        WHERE activo = 1;
END
GO

INSERT INTO [tm_feed].[menu_principal]
    (codigo, etiqueta, icono, destino, valor, criterio_filtro, orden, activo)
SELECT seed.codigo, seed.etiqueta, seed.icono, seed.destino, seed.valor,
       seed.criterio_filtro, seed.orden, 1
FROM (VALUES
    ('inicio',          N'Inicio',                    N'⌂', 'feed',   N'',                NULL, 1),
    ('caracteristicas', N'Características físicas',  N'◉', 'ruta',   N'/cf',             NULL, 2),
    ('ayuda',           N'Ayuda',                     N'?', 'panel',  N'ayuda',           NULL, 3),
    ('actualizar',      N'Actualizar',                N'↻', 'accion', N'refrescar',       NULL, 4),
    ('cerrar-sesion',   N'Cerrar sesión',             N'×', 'accion', N'cerrar_sesion',   NULL, 5)
) AS seed(codigo, etiqueta, icono, destino, valor, criterio_filtro, orden)
WHERE NOT EXISTS (
    SELECT 1
    FROM [tm_feed].[menu_principal] AS menu
    WHERE menu.codigo = seed.codigo
);
GO

CREATE OR ALTER PROCEDURE [tm_feed].[usp_feed_menu_listar]
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SELECT codigo AS id,
           etiqueta,
           icono,
           destino,
           valor,
           criterio_filtro
    FROM [tm_feed].[menu_principal]
    WHERE activo = 1
    ORDER BY orden, menu_id;
END;
GO
