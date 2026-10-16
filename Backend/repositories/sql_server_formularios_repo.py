import json
from typing import Any
from uuid import UUID

import pyodbc

from repositories.formularios_repo import (
    ConflictoClientRequestId,
    FormulariosRepository,
    RespuestaFormulario,
)
from services.usuarios_sql_service import abrir_conexion


class ErrorDatosFormulario(Exception):
    pass


def _mapear_respuesta(row: Any) -> RespuestaFormulario:
    try:
        datos: Any = json.loads(row[4])
    except (TypeError, json.JSONDecodeError) as error:
        raise ErrorDatosFormulario(
            "Una respuesta guardada contiene un JSON inválido."
        ) from error
    if not isinstance(datos, dict):
        raise ErrorDatosFormulario(
            "Los datos de la respuesta guardada deben ser un objeto JSON."
        )

    return RespuestaFormulario(
        id=int(row[0]),
        articulo_id=int(row[2]),
        form_id=str(row[3]),
        datos=datos,
        client_request_id=UUID(str(row[5])),
        creado_en=row[6],
        actualizado_en=row[7],
    )


class SqlServerFormulariosRepository(FormulariosRepository):
    def obtener(
        self,
        usuario_id: UUID,
        articulo_id: int,
        form_id: str,
    ) -> RespuestaFormulario | None:
        connection = abrir_conexion("users_database")
        try:
            cursor = connection.cursor()
            try:
                cursor.execute(
                    """
                    EXEC [tm_formularios].[usp_respuesta_obtener]
                        @usuario_id = ?, @articulo_id = ?, @form_id = ?
                    """,
                    str(usuario_id),
                    articulo_id,
                    form_id,
                )
                row = cursor.fetchone()
            finally:
                cursor.close()
        finally:
            connection.close()

        return _mapear_respuesta(row) if row is not None else None

    def guardar(
        self,
        usuario_id: UUID,
        articulo_id: int,
        form_id: str,
        datos_json: str,
        client_request_id: UUID,
    ) -> RespuestaFormulario:
        connection = abrir_conexion("users_database")
        try:
            cursor = connection.cursor()
            try:
                try:
                    cursor.execute(
                        """
                        EXEC [tm_formularios].[usp_respuesta_guardar]
                            @usuario_id = ?, @articulo_id = ?, @form_id = ?,
                            @datos_json = ?, @client_request_id = ?
                        """,
                        str(usuario_id),
                        articulo_id,
                        form_id,
                        datos_json,
                        str(client_request_id),
                    )
                except pyodbc.Error as error:
                    if any("(50003)" in str(argument) for argument in error.args):
                        raise ConflictoClientRequestId from error
                    raise
                row = cursor.fetchone()
                if row is not None:
                    connection.commit()
            finally:
                cursor.close()
        finally:
            connection.close()

        if row is None:
            raise ErrorDatosFormulario(
                "usp_respuesta_guardar no devolvió la respuesta guardada."
            )
        return _mapear_respuesta(row)
