from typing import Any

from services.usuarios_sql_service import abrir_conexion


class SqlServerCaracteristicasRepository:
    def obtener(self, usuario_id: str) -> dict[str, Any] | None:
        connection = abrir_conexion("users_database")
        try:
            cursor = connection.cursor()
            try:
                cursor.execute(
                    """
                    SELECT sexo, color_piel, peso_kg, estatura_cm, color_cabello
                    FROM tm_userdata.caracteristicas_fisicas
                    WHERE IdUsr = ?
                    """,
                    usuario_id,
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

    def guardar(self, usuario_id: str, valores: dict[str, Any]) -> None:
        connection = abrir_conexion("users_database")
        try:
            cursor = connection.cursor()
            try:
                cursor.execute(
                    """
                    UPDATE tm_userdata.caracteristicas_fisicas WITH (UPDLOCK, HOLDLOCK)
                    SET sexo = ?, color_piel = ?, peso_kg = ?, estatura_cm = ?,
                        color_cabello = ?
                    WHERE IdUsr = ?;
                    IF @@ROWCOUNT = 0
                    BEGIN
                        INSERT INTO tm_userdata.caracteristicas_fisicas (
                            IdUsr, sexo, color_piel, peso_kg, estatura_cm, color_cabello
                        ) VALUES (?, ?, ?, ?, ?, ?);
                    END;
                    """,
                    valores["sexo"],
                    valores["color_piel"],
                    valores["peso_kg"],
                    valores["estatura_cm"],
                    valores["color_cabello"],
                    usuario_id,
                    usuario_id,
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
