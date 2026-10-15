from typing import Any

from services.usuarios_sql_service import abrir_conexion


class SqlServerCaracteristicasRepository:
    def obtener(self, id_reg: str) -> dict[str, Any] | None:
        connection = abrir_conexion("users_database")
        try:
            cursor = connection.cursor()
            try:
                cursor.execute(
                    """
                    SELECT sexo, color_piel, peso_kg, estatura_cm, color_cabello
                    FROM [TheoriaM].[tm_userdata].[caracteristicas_fisicas]
                    WHERE IdReg = ?
                    """,
                    id_reg,
                )
                row = cursor.fetchone()
                if row is None:
                    return None
                return {
                    "sexo": row[0],
                    "color_piel": row[1],
                    "peso_kg": float(row[2]),
                    "estatura_cm": float(row[3]),
                    "color_cabello": row[4],
                }
            finally:
                cursor.close()
        finally:
            connection.close()

    def guardar(self, id_reg: str, seudonimo: str, valores: dict[str, Any]) -> None:
        connection = abrir_conexion("users_database")
        try:
            cursor = connection.cursor()
            try:
                cursor.execute(
                    """
                    UPDATE [TheoriaM].[tm_userdata].[caracteristicas_fisicas]
                        WITH (UPDLOCK, HOLDLOCK)
                    SET sexo = ?, color_piel = ?, peso_kg = ?, estatura_cm = ?,
                        color_cabello = ?
                    WHERE IdReg = ?;
                    IF @@ROWCOUNT = 0
                    BEGIN
                        INSERT INTO [TheoriaM].[tm_userdata].[caracteristicas_fisicas] (
                            IdReg, seudonimo, sexo, color_piel, peso_kg, estatura_cm,
                            color_cabello, clima_principal, clima_secundario
                        ) VALUES (
                            ?, ?, ?, ?, ?, ?, ?, N'No especificado', N'No especificado'
                        );
                    END;
                    """,
                    valores["sexo"],
                    valores["color_piel"],
                    valores["peso_kg"],
                    valores["estatura_cm"],
                    valores["color_cabello"],
                    id_reg,
                    id_reg,
                    seudonimo,
                    valores["sexo"],
                    valores["color_piel"],
                    valores["peso_kg"],
                    valores["estatura_cm"],
                    valores["color_cabello"],
                )
                connection.commit()
            finally:
                cursor.close()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()
