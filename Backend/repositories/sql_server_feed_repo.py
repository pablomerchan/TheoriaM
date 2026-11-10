import json
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from repositories.feed_repo import (
    ArticuloFeed,
    BloqueFeed,
    ComentarioFeed,
    FeedRepository,
    InteraccionesFeed,
    OpcionMenuFeed,
)
from services.usuarios_sql_service import abrir_conexion


class ErrorDatosFeed(Exception):
    pass


class ErrorArticuloFeedNoEncontrado(Exception):
    pass


def _fetch_result_set(cursor: Any, advance: bool = False) -> list[Any] | None:
    if advance and not cursor.nextset():
        return None
    while cursor.description is None:
        if not cursor.nextset():
            return None
    return cursor.fetchall()


def _fecha_utc(value: Any) -> datetime:
    if not isinstance(value, datetime):
        raise ErrorDatosFeed("La fecha almacenada de una interacción no es válida.")
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


class SqlServerFeedRepository(FeedRepository):
    def obtener_atributos_usuario(self, usuario_id: UUID) -> dict[str, Any]:
        connection = abrir_conexion("users_database")
        try:
            cursor = connection.cursor()
            try:
                cursor.execute(
                    """
                    SELECT u.fecha_nacimiento, c.sexo, c.color_piel, c.peso_kg,
                           c.estatura_cm, c.color_cabello, c.clima_principal,
                           c.clima_secundario
                    FROM [TheoriaM].[tm_userdata].[tbl_usuarios] AS u
                    LEFT JOIN [TheoriaM].[tm_userdata].[tbl_caracteristicas_fisicas] AS c
                        ON c.IdUsr = u.IdUsr
                    WHERE u.IdUsr = ?
                    """,
                    str(usuario_id),
                )
                row = cursor.fetchone()
            finally:
                cursor.close()
        finally:
            connection.close()

        if row is None:
            return {}

        return {
            "perfil.fecha_nacimiento": row[0],
            "perfil.sexo": row[1],
            "perfil.color_piel": row[2],
            "perfil.peso_kg": float(row[3]) if row[3] is not None else None,
            "perfil.estatura_cm": float(row[4]) if row[4] is not None else None,
            "perfil.color_cabello": row[5],
            "perfil.clima_principal": row[6],
            "perfil.clima_secundario": row[7],
        }

    def listar_publicacion(self) -> list[dict[str, Any]]:
        connection = abrir_conexion("users_database")
        try:
            cursor = connection.cursor()
            try:
                cursor.execute("EXEC [tm_feed].[usp_feed_admin_articulos_listar]")
                articulo_rows = _fetch_result_set(cursor)
                bloque_rows = _fetch_result_set(cursor, advance=True)
                if articulo_rows is None or bloque_rows is None:
                    raise ErrorDatosFeed(
                        "usp_feed_admin_articulos_listar no devolvió los artículos o bloques."
                    )
                regla_rows = _fetch_result_set(cursor, advance=True)
                if regla_rows is None:
                    raise ErrorDatosFeed(
                        "usp_feed_admin_articulos_listar no devolvió las reglas."
                    )
            finally:
                cursor.close()
        finally:
            connection.close()

        bloques_por_articulo: dict[int, list[tuple[str, Any]]] = {}
        for row in bloque_rows:
            try:
                payload: Any = json.loads(row[4])
            except (TypeError, json.JSONDecodeError) as error:
                raise ErrorDatosFeed(
                    "Un artículo del feed contiene un payload JSON inválido."
                ) from error
            bloques_por_articulo.setdefault(int(row[0]), []).append(
                (str(row[3]), payload)
            )

        reglas_por_articulo: dict[int, dict[str, Any]] = {}
        for row in regla_rows:
            try:
                reglas: Any = json.loads(row[1])
            except (TypeError, json.JSONDecodeError) as error:
                raise ErrorDatosFeed(
                    "Un artículo del feed contiene reglas JSON inválidas."
                ) from error
            if not isinstance(reglas, dict):
                raise ErrorDatosFeed(
                    "Las reglas de segmentación deben ser un objeto JSON."
                )
            reglas_por_articulo[int(row[0])] = reglas

        articulos = []
        for row in articulo_rows:
            articulo_id = int(row[0])
            bloques = bloques_por_articulo.get(articulo_id, [])
            contenido_editable = (
                len(bloques) == 0
                or (
                    len(bloques) == 1
                    and bloques[0][0] == "texto"
                    and isinstance(bloques[0][1], dict)
                    and isinstance(bloques[0][1].get("contenido"), str)
                )
            )
            contenido = (
                bloques[0][1]["contenido"]
                if len(bloques) == 1 and contenido_editable
                else ""
            )
            articulos.append(
                {
                    "id": articulo_id,
                    "titulo": str(row[1]),
                    "publicado_en": row[2],
                    "estado": int(row[3]),
                    "contenido": contenido,
                    "contenido_editable": contenido_editable,
                    "reglas": reglas_por_articulo.get(articulo_id),
                }
            )
        return articulos

    def guardar_publicacion(
        self,
        articulo_id: int | None,
        titulo: str,
        contenido: str | None,
        estado: int,
        reglas: dict[str, Any] | None,
    ) -> dict[str, Any]:
        reglas_json = (
            json.dumps(reglas, ensure_ascii=False, separators=(",", ":"))
            if reglas is not None
            else None
        )
        connection = abrir_conexion("users_database")
        try:
            cursor = connection.cursor()
            try:
                cursor.execute(
                    """
                    EXEC [tm_feed].[usp_feed_admin_articulo_guardar]
                        @articulo_id = ?, @titulo = ?, @contenido = ?,
                        @estado = ?, @reglas_json = ?
                    """,
                    articulo_id,
                    titulo,
                    contenido,
                    estado,
                    reglas_json,
                )
                row = cursor.fetchone()
                if row is None:
                    if articulo_id is not None:
                        raise ErrorArticuloFeedNoEncontrado
                    raise ErrorDatosFeed(
                        "No se recibió el artículo guardado desde SQL Server."
                    )
                connection.commit()
            finally:
                cursor.close()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

        return {
            "id": int(row[0]),
            "titulo": str(row[1]),
            "publicado_en": row[2],
            "estado": int(row[3]),
        }

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

    def listar_interacciones(
        self,
        articulos_ids: list[int],
        usuario_id: UUID,
    ) -> dict[int, InteraccionesFeed]:
        if not articulos_ids:
            return {}

        connection = abrir_conexion("users_database")
        try:
            cursor = connection.cursor()
            try:
                cursor.execute(
                    """
                    EXEC [tm_feed].[usp_feed_interacciones_listar]
                        @articulos_json = ?, @usuario_id = ?
                    """,
                    json.dumps(articulos_ids),
                    str(usuario_id),
                )
                resumen_rows = _fetch_result_set(cursor)
                comentario_rows = _fetch_result_set(cursor, advance=True)
                if resumen_rows is None or comentario_rows is None:
                    raise ErrorDatosFeed(
                        "usp_feed_interacciones_listar no devolvió los resultados esperados."
                    )
            finally:
                cursor.close()
        finally:
            connection.close()

        comentarios_por_articulo: dict[int, list[ComentarioFeed]] = {}
        for row in comentario_rows:
            comentarios_por_articulo.setdefault(int(row[0]), []).append(
                ComentarioFeed(
                    id=int(row[1]),
                    autor=str(row[2]),
                    contenido=str(row[3]),
                    creado_en=_fecha_utc(row[4]),
                )
            )

        interacciones = {
            int(row[0]): InteraccionesFeed(
                me_gusta=bool(row[2]),
                total_me_gusta=int(row[1]),
                comentarios=comentarios_por_articulo.get(int(row[0]), []),
            )
            for row in resumen_rows
        }
        if set(interacciones) != set(articulos_ids):
            raise ErrorDatosFeed(
                "No fue posible obtener las interacciones de todos los artículos."
            )
        return interacciones

    def alternar_me_gusta(
        self,
        articulo_id: int,
        usuario_id: UUID,
    ) -> tuple[bool, int]:
        connection = abrir_conexion("users_database")
        try:
            cursor = connection.cursor()
            try:
                cursor.execute(
                    """
                    EXEC [tm_feed].[usp_feed_me_gusta_alternar]
                        @articulo_id = ?, @usuario_id = ?
                    """,
                    articulo_id,
                    str(usuario_id),
                )
                row = cursor.fetchone()
                if row is None:
                    raise ErrorArticuloFeedNoEncontrado
                connection.commit()
            except Exception:
                connection.rollback()
                raise
            finally:
                cursor.close()
        finally:
            connection.close()
        return bool(row[0]), int(row[1])

    def crear_comentario(
        self,
        articulo_id: int,
        usuario_id: UUID,
        contenido: str,
    ) -> ComentarioFeed:
        connection = abrir_conexion("users_database")
        try:
            cursor = connection.cursor()
            try:
                cursor.execute(
                    """
                    EXEC [tm_feed].[usp_feed_comentario_crear]
                        @articulo_id = ?, @usuario_id = ?, @contenido = ?
                    """,
                    articulo_id,
                    str(usuario_id),
                    contenido,
                )
                row = cursor.fetchone()
                if row is None:
                    raise ErrorArticuloFeedNoEncontrado
                connection.commit()
            except Exception:
                connection.rollback()
                raise
            finally:
                cursor.close()
        finally:
            connection.close()
        return ComentarioFeed(
            id=int(row[0]),
            autor=str(row[1]),
            contenido=str(row[2]),
            creado_en=_fecha_utc(row[3]),
        )

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
                    EXEC [tm_feed].[usp_feed_candidatos_listar]
                        @cursor_fecha = ?, @cursor_id = ?, @limite = ?
                    """,
                    cursor_fecha,
                    cursor_id,
                    limite,
                )
                articulo_rows = _fetch_result_set(cursor)
                bloque_rows = _fetch_result_set(cursor, advance=True)
                if articulo_rows is None or bloque_rows is None:
                    raise ErrorDatosFeed(
                        "usp_feed_candidatos_listar no devolvió los artículos o bloques."
                    )
                regla_rows = _fetch_result_set(cursor, advance=True)
                if regla_rows is None:
                    raise ErrorDatosFeed(
                        "usp_feed_candidatos_listar no devolvió el resultado de reglas."
                    )
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

        reglas_por_articulo: dict[int, dict[str, Any]] = {}
        for row in regla_rows:
            try:
                reglas: Any = json.loads(row[1])
            except (TypeError, json.JSONDecodeError) as error:
                raise ErrorDatosFeed(
                    "Un artículo del feed contiene reglas JSON inválidas."
                ) from error
            if not isinstance(reglas, dict):
                raise ErrorDatosFeed(
                    "Las reglas de segmentación deben ser un objeto JSON."
                )
            reglas_por_articulo[int(row[0])] = reglas

        return [
            ArticuloFeed(
                id=int(row[0]),
                titulo=str(row[1]),
                publicado_en=row[2],
                bloques=bloques_por_articulo.get(int(row[0]), []),
                reglas_segmentacion=reglas_por_articulo.get(int(row[0])),
            )
            for row in articulo_rows
        ]
