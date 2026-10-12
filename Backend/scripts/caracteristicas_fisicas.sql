IF OBJECT_ID(N'[TheoriaM].[tm_userdata].[caracteristicas_fisicas]', N'U') IS NULL
BEGIN
    CREATE TABLE [TheoriaM].[tm_userdata].[caracteristicas_fisicas] (
        IdUsr UNIQUEIDENTIFIER NOT NULL,
        sexo NVARCHAR(40) NOT NULL,
        color_piel NVARCHAR(40) NOT NULL,
        peso_kg DECIMAL(6, 2) NOT NULL,
        estatura_cm DECIMAL(5, 2) NOT NULL,
        color_cabello NVARCHAR(40) NOT NULL,
        fecha_creacion DATETIME2(0) NOT NULL
            CONSTRAINT DF_caracteristicas_fisicas_fecha_creacion DEFAULT SYSUTCDATETIME(),
        fecha_actualizacion DATETIME2(0) NOT NULL
            CONSTRAINT DF_caracteristicas_fisicas_fecha_actualizacion DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_caracteristicas_fisicas PRIMARY KEY (IdUsr),
        CONSTRAINT FK_caracteristicas_fisicas_tbl_usuarios
            FOREIGN KEY (IdUsr) REFERENCES [TheoriaM].[tm_userdata].[tbl_usuarios](IdUsr),
        CONSTRAINT CK_caracteristicas_fisicas_peso_kg
            CHECK (peso_kg BETWEEN 20 AND 500),
        CONSTRAINT CK_caracteristicas_fisicas_estatura_cm
            CHECK (estatura_cm BETWEEN 80 AND 250)
    );
END;
GO

IF OBJECT_ID(N'[TheoriaM].[tm_userdata].[caracteristicas_fisicas]', N'U') IS NOT NULL
BEGIN
    SELECT
        c.name AS columna,
        TYPE_NAME(c.user_type_id) AS tipo,
        c.is_nullable AS permite_nulos
    FROM [TheoriaM].sys.columns AS c
    INNER JOIN [TheoriaM].sys.tables AS t ON t.object_id = c.object_id
    INNER JOIN [TheoriaM].sys.schemas AS s ON s.schema_id = t.schema_id
    WHERE s.name = N'tm_userdata'
      AND t.name = N'caracteristicas_fisicas'
    ORDER BY c.column_id;
END;
GO
