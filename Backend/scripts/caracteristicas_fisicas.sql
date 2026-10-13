IF OBJECT_ID(N'[TheoriaM].[tm_userdata].[caracteristicas_fisicas]', N'U') IS NULL
BEGIN
    CREATE TABLE [TheoriaM].[tm_userdata].[caracteristicas_fisicas] (
        IdReg UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT DF_caracteristicas_fisicas_IdReg DEFAULT NEWID(),
        seudonimo NVARCHAR(200) NOT NULL,
        sexo NVARCHAR(40) NOT NULL,
        peso_kg DECIMAL(6, 2) NOT NULL,
        estatura_cm DECIMAL(5, 2) NOT NULL,
        color_piel NVARCHAR(200) NOT NULL,
        color_cabello NVARCHAR(200) NOT NULL,
        clima_principal NVARCHAR(200) NOT NULL,
        clima_secundario NVARCHAR(200) NOT NULL,
        CONSTRAINT PK_caracteristicas_fisicas PRIMARY KEY (IdReg),
        CONSTRAINT UQ_caracteristicas_fisicas_seudonimo UNIQUE (seudonimo),
        CONSTRAINT CK_caracteristicas_fisicas_peso_kg
            CHECK (peso_kg BETWEEN 20 AND 500),
        CONSTRAINT CK_caracteristicas_fisicas_estatura_cm
            CHECK (estatura_cm BETWEEN 80 AND 250)
    );
END;
GO

IF OBJECT_ID(N'[TheoriaM].[tm_userdata].[caracteristicas_fisicas]', N'U') IS NOT NULL
BEGIN
    ALTER TABLE [TheoriaM].[tm_userdata].[caracteristicas_fisicas]
        ALTER COLUMN sexo NVARCHAR(40) NOT NULL;
    ALTER TABLE [TheoriaM].[tm_userdata].[caracteristicas_fisicas]
        ALTER COLUMN peso_kg DECIMAL(6, 2) NOT NULL;
    ALTER TABLE [TheoriaM].[tm_userdata].[caracteristicas_fisicas]
        ALTER COLUMN estatura_cm DECIMAL(5, 2) NOT NULL;

    IF NOT EXISTS (
        SELECT 1
        FROM [TheoriaM].sys.default_constraints AS dc
        INNER JOIN [TheoriaM].sys.columns AS c
            ON c.object_id = dc.parent_object_id
            AND c.column_id = dc.parent_column_id
        INNER JOIN [TheoriaM].sys.tables AS t ON t.object_id = c.object_id
        INNER JOIN [TheoriaM].sys.schemas AS s ON s.schema_id = t.schema_id
        WHERE s.name = N'tm_userdata'
          AND t.name = N'caracteristicas_fisicas'
          AND c.name = N'IdReg'
    )
    BEGIN
        ALTER TABLE [TheoriaM].[tm_userdata].[caracteristicas_fisicas]
            ADD CONSTRAINT DF_caracteristicas_fisicas_IdReg
            DEFAULT NEWID() FOR IdReg;
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM [TheoriaM].sys.key_constraints
        WHERE parent_object_id =
            OBJECT_ID(N'[TheoriaM].[tm_userdata].[caracteristicas_fisicas]')
          AND type = N'PK'
    )
    BEGIN
        ALTER TABLE [TheoriaM].[tm_userdata].[caracteristicas_fisicas]
            ADD CONSTRAINT PK_caracteristicas_fisicas PRIMARY KEY (IdReg);
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM [TheoriaM].sys.key_constraints
        WHERE parent_object_id =
            OBJECT_ID(N'[TheoriaM].[tm_userdata].[caracteristicas_fisicas]')
          AND name = N'UQ_caracteristicas_fisicas_seudonimo'
    )
    BEGIN
        ALTER TABLE [TheoriaM].[tm_userdata].[caracteristicas_fisicas]
            ADD CONSTRAINT UQ_caracteristicas_fisicas_seudonimo
            UNIQUE (seudonimo);
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM [TheoriaM].sys.check_constraints
        WHERE parent_object_id =
            OBJECT_ID(N'[TheoriaM].[tm_userdata].[caracteristicas_fisicas]')
          AND name = N'CK_caracteristicas_fisicas_peso_kg'
    )
    BEGIN
        ALTER TABLE [TheoriaM].[tm_userdata].[caracteristicas_fisicas]
            ADD CONSTRAINT CK_caracteristicas_fisicas_peso_kg
            CHECK (peso_kg BETWEEN 20 AND 500);
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM [TheoriaM].sys.check_constraints
        WHERE parent_object_id =
            OBJECT_ID(N'[TheoriaM].[tm_userdata].[caracteristicas_fisicas]')
          AND name = N'CK_caracteristicas_fisicas_estatura_cm'
    )
    BEGIN
        ALTER TABLE [TheoriaM].[tm_userdata].[caracteristicas_fisicas]
            ADD CONSTRAINT CK_caracteristicas_fisicas_estatura_cm
            CHECK (estatura_cm BETWEEN 80 AND 250);
    END;

    IF DATABASE_PRINCIPAL_ID(N'usuario_web') IS NULL
    BEGIN
        THROW 50001, 'Database principal usuario_web does not exist in TheoriaM.', 1;
    END;

    GRANT SELECT, INSERT, UPDATE
        ON OBJECT::[tm_userdata].[caracteristicas_fisicas]
        TO [usuario_web];

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
