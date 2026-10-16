/* =====================================================================
   TheorIA M  |  002_permisos_feed.sql   (versión 2)
   Permisos para los dominios feed y formularios.
   Ejecutar DESPUÉS de 001_feed_formularios.sql, conectado a [TheoriaM]
   con una cuenta con permisos de administración (p. ej. dbo/sysadmin).
   Idempotente: se puede ejecutar varias veces.

   CAMBIO RESPECTO A LA VERSIÓN 1
   - El Backend YA se conecta con el login/usuario [usuario_web]. Este
     script reutiliza ese usuario: NO crea ningún login nuevo, NO cambia
     contraseñas y NO toca los permisos que usuario_web ya tiene sobre
     tm_userdata (registro de usuarios, sesiones) ni sobre la base logs.
   - Se eliminó el DENY sobre tm_userdata: habría bloqueado el registro e
     inicio de sesión, porque un DENY anula cualquier GRANT.

   MODELO
   - rol_tm_feed_api       → lo recibe usuario_web. Solo puede EJECUTAR
                             los procedimientos de tm_feed y tm_formularios;
                             no puede leer/escribir sus tablas directamente.
   - rol_tm_feed_contenido → opcional: quien publica artículos y bloques.

   POR QUÉ FUNCIONA SIN DAR ACCESO A LAS TABLAS
   Los esquemas pertenecen a dbo, así que existe "encadenamiento de
   propiedad": al ejecutar un procedimiento, SQL Server no vuelve a
   comprobar permisos sobre las tablas del mismo propietario.

   NOTA DE ARQUITECTURA
   Hoy todo el Backend usa un único usuario (usuario_web). Funciona, pero
   el feed hereda también sus permisos de escritura sobre usuarios. Cuando
   los dominios se separen en microservicios, conviene un login propio por
   servicio (por ejemplo, uno solo para el feed) con solo este rol.
   ===================================================================== */

USE [TheoriaM];
GO

/* ---------------------------------------------------------------------
   0. VERIFICACIÓN: usuario_web debe existir (como login o como usuario)
   --------------------------------------------------------------------- */
IF SUSER_SID(N'usuario_web') IS NULL
   AND DATABASE_PRINCIPAL_ID(N'usuario_web') IS NULL
    THROW 50010, 'No existe usuario_web (ni como login ni como usuario de la base). Revisa el nombre antes de continuar.', 1;
GO

/* ---------------------------------------------------------------------
   1. ROLES
   --------------------------------------------------------------------- */
IF DATABASE_PRINCIPAL_ID(N'rol_tm_feed_api') IS NULL
    CREATE ROLE [rol_tm_feed_api];
GO
IF DATABASE_PRINCIPAL_ID(N'rol_tm_feed_contenido') IS NULL
    CREATE ROLE [rol_tm_feed_contenido];
GO

/* ---------------------------------------------------------------------
   2. ROL DEL BACKEND: solo EXECUTE sobre los procedimientos del feed
   --------------------------------------------------------------------- */
GRANT EXECUTE ON SCHEMA::[tm_feed]        TO [rol_tm_feed_api];
GRANT EXECUTE ON SCHEMA::[tm_formularios] TO [rol_tm_feed_api];

/* Defensa en profundidad: sin acceso directo a las tablas NUEVAS.
   (No afecta a tm_userdata ni a logs.) */
DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[tm_feed]        TO [rol_tm_feed_api];
DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[tm_formularios] TO [rol_tm_feed_api];
GO

/* ---------------------------------------------------------------------
   3. ROL DE CONTENIDO (opcional): gestionar artículos y bloques
   --------------------------------------------------------------------- */
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[tm_feed] TO [rol_tm_feed_contenido];

/* Puede consultar respuestas (reportes), pero no modificarlas. */
GRANT SELECT ON SCHEMA::[tm_formularios] TO [rol_tm_feed_contenido];
DENY  INSERT, UPDATE, DELETE ON SCHEMA::[tm_formularios] TO [rol_tm_feed_contenido];
GO

/* ---------------------------------------------------------------------
   4. ASIGNAR usuario_web AL ROL DEL BACKEND
   Si usuario_web ya está mapeado en esta base (con ese u otro nombre) se
   reutiliza; solo se crea el usuario si falta el mapeo.
   --------------------------------------------------------------------- */
DECLARE @miembro sysname;

SELECT @miembro = name
FROM   sys.database_principals
WHERE  type IN ('S', 'U')
  AND  (name = N'usuario_web' OR sid = SUSER_SID(N'usuario_web'));

IF @miembro IS NULL
BEGIN
    CREATE USER [usuario_web] FOR LOGIN [usuario_web] WITH DEFAULT_SCHEMA = [dbo];
    SET @miembro = N'usuario_web';
END

IF NOT EXISTS (
    SELECT 1
    FROM   sys.database_role_members AS rm
    JOIN   sys.database_principals   AS r ON r.principal_id = rm.role_principal_id
    JOIN   sys.database_principals   AS m ON m.principal_id = rm.member_principal_id
    WHERE  r.name = N'rol_tm_feed_api' AND m.name = @miembro)
BEGIN
    DECLARE @sql nvarchar(400) =
        N'ALTER ROLE [rol_tm_feed_api] ADD MEMBER ' + QUOTENAME(@miembro) + N';';
    EXEC (@sql);
END
GO

/* ---------------------------------------------------------------------
   5. VERIFICACIÓN (opcional)
   --------------------------------------------------------------------- */

/* 5.1 Roles que ya tiene usuario_web. REVISA este resultado: si aparece
   db_owner, db_datawriter o db_ddladmin, el usuario tiene más poder del
   necesario (y el DENY de la sección 2 puede no comportarse como esperas). */
SELECT m.name AS usuario, r.name AS rol
FROM   sys.database_role_members AS rm
JOIN   sys.database_principals   AS r ON r.principal_id = rm.role_principal_id
JOIN   sys.database_principals   AS m ON m.principal_id = rm.member_principal_id
WHERE  m.name = N'usuario_web' OR m.sid = SUSER_SID(N'usuario_web')
ORDER BY r.name;
GO

/* 5.2 Prueba rápida suplantando a usuario_web:
       EXECUTE AS USER = 'usuario_web';
           EXEC tm_feed.usp_feed_listar @limite = 5;      -- debe funcionar
           SELECT TOP 1 * FROM tm_feed.articulo;          -- debe FALLAR (denegado)
       REVERT;
   Y confirma que lo existente sigue funcionando (registro de usuarios,
   inicio de sesión y escritura en la base logs). */

PRINT N'002_permisos_feed.sql (v2) ejecutado correctamente.';
GO
