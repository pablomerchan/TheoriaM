import json
from datetime import datetime
from typing import Any

from repositories.feed_repo import (
    ArticuloFeed,
    BloqueFeed,
    FeedRepository,
    OpcionMenuFeed,
)
from services.usuarios_sql_service import abrir_conexion


class ErrorDatosFeed(Exception):
    pass


class SqlServerFeedRepository(FeedRepository):
    def listar_menu(self) -> list[OpcionMenuFeed]:
        connection = abrir_conexion("users_database")
        try:
            cursor = connection.cursor()
            try:
                cursor.execute("EXEC [tm_feed].[usp_feed_menu_listar]")
                rows = cursor.fetchall()
            finally:
                cursor.close()
        finally:
            connection.close()

        return [
            OpcionMenuFeed(
                id=str(row[0]),
                etiqueta=str(row[1]),
                icono=str(row[2]),
                destino=str(row[3]),
                valor=str(row[4]),
                criterio_filtro=str(row[5]) if row[5] is not None else None,
            )
            for row in rows
        ]

    def listar(
        self,
        cursor_fecha: datetime | None,
        cursor_id: int | None,
        limite: int,
    ) -> list[ArticuloFeed]:
        connection = abrir_conexion("users_database")
        try:
            cursor = connection.cursor()
            try:
                cursor.execute(
                    """
                    EXEC [tm_feed].[usp_feed_listar]
                        @cursor_fecha = ?, @cursor_id = ?, @limite = ?
                    """,
                    cursor_fecha,
                    cursor_id,
                    limite,
                )
                articulo_rows = cursor.fetchall()
                if not cursor.nextset():
                    raise ErrorDatosFeed(
                        "usp_feed_listar no devolvió el resultado de bloques."
                    )
                bloque_rows = cursor.fetchall()
            finally:
                cursor.close()
        finally:
            connection.close()

        bloques_por_articulo: dict[int, list[BloqueFeed]] = {}
        for row in bloque_rows:
            try:
                payload: Any = json.loads(row[4])
            except (TypeError, json.JSONDecodeError) as error:
                raise ErrorDatosFeed(
                    "Un bloque del feed contiene un payload JSON inválido."
                ) from error
            if not isinstance(payload, dict):
                raise ErrorDatosFeed(
                    "El payload JSON de un bloque debe ser un objeto."
                )

            bloques_por_articulo.setdefault(int(row[0]), []).append(
                BloqueFeed(
                    id=int(row[1]),
                    orden=int(row[2]),
                    tipo=str(row[3]),
                    payload=payload,
                )
            )

        return [
            ArticuloFeed(
                id=int(row[0]),
                titulo=str(row[1]),
                publicado_en=row[2],
                bloques=bloques_por_articulo.get(int(row[0]), []),
            )
            for row in articulo_rows
        ]
