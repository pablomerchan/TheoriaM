import base64
import binascii
import json
from datetime import datetime
from typing import Any

from repositories.feed_repo import FeedRepository


class ErrorCursorFeed(ValueError):
    pass


class ErrorLimiteFeed(ValueError):
    pass


def codificar_cursor(publicado_en: datetime, articulo_id: int) -> str:
    if publicado_en.tzinfo is not None or articulo_id < 1:
        raise ValueError("El cursor requiere fecha UTC sin zona horaria e id positivo.")

    contenido = json.dumps(
        {
            "publicado_en": publicado_en.isoformat(timespec="seconds"),
            "id": articulo_id,
        },
        separators=(",", ":"),
    ).encode("utf-8")
    return base64.urlsafe_b64encode(contenido).decode("ascii").rstrip("=")


def decodificar_cursor(cursor: str) -> tuple[datetime, int]:
    if not cursor or len(cursor) > 512:
        raise ErrorCursorFeed("El cursor está vacío o excede el tamaño permitido.")

    try:
        contenido = base64.b64decode(
            cursor + "=" * (-len(cursor) % 4),
            altchars=b"-_",
            validate=True,
        )
        datos: Any = json.loads(contenido.decode("utf-8"))
        if (
            not isinstance(datos, dict)
            or set(datos) != {"publicado_en", "id"}
            or not isinstance(datos["publicado_en"], str)
            or isinstance(datos["id"], bool)
            or not isinstance(datos["id"], int)
            or datos["id"] < 1
        ):
            raise ErrorCursorFeed("El formato del cursor no es válido.")
        publicado_en = datetime.fromisoformat(datos["publicado_en"])
        if publicado_en.tzinfo is not None or publicado_en.microsecond != 0:
            raise ErrorCursorFeed("La fecha del cursor no es válida.")
    except (
        binascii.Error,
        UnicodeDecodeError,
        json.JSONDecodeError,
        TypeError,
        ValueError,
    ) as error:
        if isinstance(error, ErrorCursorFeed):
            raise
        raise ErrorCursorFeed("El formato del cursor no es válido.") from error

    return publicado_en, datos["id"]


class FeedService:
    def __init__(self, repository: FeedRepository) -> None:
        self.repository = repository

    def listar_menu(self) -> list[dict[str, str | None]]:
        return [
            {
                "id": opcion.id,
                "etiqueta": opcion.etiqueta,
                "icono": opcion.icono,
                "destino": opcion.destino,
                "valor": opcion.valor,
                "criterio_filtro": opcion.criterio_filtro,
            }
            for opcion in self.repository.listar_menu()
        ]

    def listar(self, cursor: str | None, limite: int = 10) -> dict[str, Any]:
        if not 1 <= limite <= 50:
            raise ErrorLimiteFeed("El límite debe estar entre 1 y 50.")

        if cursor == "":
            cursor = None
        cursor_fecha, cursor_id = (
            decodificar_cursor(cursor) if cursor is not None else (None, None)
        )
        articulos = self.repository.listar(cursor_fecha, cursor_id, limite)
        hay_mas = len(articulos) > limite
        articulos_visibles = articulos[:limite]
        siguiente_cursor = (
            codificar_cursor(
                articulos_visibles[-1].publicado_en,
                articulos_visibles[-1].id,
            )
            if hay_mas
            else None
        )

        return {
            "items": [
                {
                    "id": articulo.id,
                    "titulo": articulo.titulo,
                    "publicado_en": articulo.publicado_en,
                    "bloques": [
                        {
                            "id": bloque.id,
                            "orden": bloque.orden,
                            "tipo": bloque.tipo,
                            "payload": bloque.payload,
                        }
                        for bloque in articulo.bloques
                    ],
                }
                for articulo in articulos_visibles
            ],
            "siguienteCursor": siguiente_cursor,
        }
