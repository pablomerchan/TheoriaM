import base64
import binascii
import json
from datetime import date, datetime, timezone
from typing import Any
from uuid import UUID

from repositories.feed_repo import ArticuloFeed, FeedRepository


class ErrorCursorFeed(ValueError):
    pass


class ErrorLimiteFeed(ValueError):
    pass


class ErrorReglaSegmentacion(ValueError):
    pass


def _valor_condicion(
    atributo: str,
    operador: str,
    esperado: Any,
    atributos: dict[str, Any],
    contexto: dict[str, Any],
) -> bool:
    if not isinstance(atributo, str) or not atributo:
        raise ErrorReglaSegmentacion("Cada condición requiere un atributo.")
    if operador not in {
        "eq",
        "ne",
        "in",
        "not_in",
        "gt",
        "gte",
        "lt",
        "lte",
        "exists",
    }:
        raise ErrorReglaSegmentacion(
            f"Operador de segmentación no admitido: {operador}."
        )

    origen, separador, clave = atributo.partition(".")
    if not separador or not clave or origen not in {"perfil", "contexto"}:
        raise ErrorReglaSegmentacion(
            f"Atributo de segmentación no admitido: {atributo}."
        )
    valores = atributos if origen == "perfil" else contexto
    existe = clave in valores and valores[clave] is not None
    actual = valores.get(clave)

    if operador == "exists":
        if not isinstance(esperado, bool):
            raise ErrorReglaSegmentacion(
                "El operador exists requiere un valor booleano."
            )
        return existe is esperado
    if not existe:
        return False
    if operador in {"eq", "ne"}:
        resultado = actual == esperado
        return resultado if operador == "eq" else not resultado
    if operador in {"in", "not_in"}:
        if not isinstance(esperado, list):
            raise ErrorReglaSegmentacion(f"El operador {operador} requiere una lista.")
        resultado = actual in esperado
        return resultado if operador == "in" else not resultado
    if (
        isinstance(actual, bool)
        or isinstance(esperado, bool)
        or not isinstance(actual, (int, float))
        or not isinstance(esperado, (int, float))
    ):
        raise ErrorReglaSegmentacion(
            f"El operador {operador} requiere valores numéricos."
        )
    if operador == "gt":
        return actual > esperado
    if operador == "gte":
        return actual >= esperado
    if operador == "lt":
        return actual < esperado
    return actual <= esperado


def _articulo_elegible(
    articulo: ArticuloFeed,
    atributos: dict[str, Any],
    contexto: dict[str, Any],
) -> bool:
    reglas = articulo.reglas_segmentacion
    if reglas is None:
        return True
    if set(reglas) != {"modo", "condiciones"}:
        raise ErrorReglaSegmentacion(
            f"Las reglas de segmentación del artículo {articulo.id} tienen una estructura inválida."
        )

    modo = reglas["modo"]
    condiciones = reglas["condiciones"]
    if (
        not isinstance(modo, str)
        or modo not in {"todos", "alguno"}
        or not isinstance(condiciones, list)
    ):
        raise ErrorReglaSegmentacion(
            f"Las reglas de segmentación del artículo {articulo.id} son inválidas."
        )
    if not condiciones:
        return False

    resultados = []
    for condicion in condiciones:
        if (
            not isinstance(condicion, dict)
            or set(condicion) != {"atributo", "operador", "valor"}
            or not isinstance(condicion["operador"], str)
        ):
            raise ErrorReglaSegmentacion(
                f"Una condición del artículo {articulo.id} tiene una estructura inválida."
            )
        resultados.append(
            _valor_condicion(
                condicion["atributo"],
                condicion["operador"],
                condicion["valor"],
                atributos,
                contexto,
            )
        )
    return all(resultados) if modo == "todos" else any(resultados)


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

    def listar(
        self,
        cursor: str | None,
        limite: int = 10,
        usuario_id: UUID | None = None,
        idioma: str | None = None,
    ) -> dict[str, Any]:
        if not 1 <= limite <= 50:
            raise ErrorLimiteFeed("El límite debe estar entre 1 y 50.")
        if usuario_id is None:
            raise ValueError("Se requiere el usuario autenticado para listar el feed.")

        if cursor == "":
            cursor = None
        cursor_fecha, cursor_id = (
            decodificar_cursor(cursor) if cursor is not None else (None, None)
        )
        ahora = datetime.now(timezone.utc)
        atributos = self.repository.obtener_atributos_usuario(usuario_id)
        nacimiento = atributos.pop("perfil.fecha_nacimiento", None)
        if isinstance(nacimiento, datetime):
            nacimiento = nacimiento.date()
        if isinstance(nacimiento, date):
            edad = ahora.date().year - nacimiento.year
            edad -= (ahora.date().month, ahora.date().day) < (
                nacimiento.month,
                nacimiento.day,
            )
            atributos["perfil.edad"] = edad
        contexto = {
            "fecha_utc": ahora.date().isoformat(),
            "hora_utc": ahora.hour,
            "dia_semana": ahora.weekday(),
            "idioma": (idioma or "").split(",", 1)[0].split("-", 1)[0].lower(),
        }

        articulos_visibles: list[ArticuloFeed] = []
        cursor_siguiente: tuple[datetime, int] | None = None
        while len(articulos_visibles) <= limite:
            candidatos = self.repository.listar(cursor_fecha, cursor_id, 50)
            if not candidatos:
                break

            pagina = candidatos[:50]
            for articulo in pagina:
                if _articulo_elegible(articulo, atributos, contexto):
                    articulos_visibles.append(articulo)
                    if len(articulos_visibles) > limite:
                        break

            if len(articulos_visibles) > limite:
                cursor_siguiente = (
                    articulos_visibles[limite - 1].publicado_en,
                    articulos_visibles[limite - 1].id,
                )
                break

            if len(candidatos) <= 50:
                break
            ultimo_candidato = pagina[-1]
            cursor_fecha, cursor_id = (
                ultimo_candidato.publicado_en,
                ultimo_candidato.id,
            )

        hay_mas = len(articulos_visibles) > limite
        articulos_visibles = articulos_visibles[:limite]
        siguiente_cursor = (
            codificar_cursor(*cursor_siguiente)
            if hay_mas and cursor_siguiente
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
