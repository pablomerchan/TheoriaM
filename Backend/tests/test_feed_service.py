from datetime import datetime, timedelta

import pytest

from repositories.feed_repo import ArticuloFeed, BloqueFeed, OpcionMenuFeed
from services.feed_service import (
    ErrorCursorFeed,
    FeedService,
    codificar_cursor,
    decodificar_cursor,
)


class RepositorioFeedFalso:
    def __init__(
        self,
        articulos: list[ArticuloFeed],
        menu: list[OpcionMenuFeed] | None = None,
    ) -> None:
        self.articulos = articulos
        self.menu = menu or []
        self.argumentos: tuple[datetime | None, int | None, int] | None = None

    def listar_menu(self) -> list[OpcionMenuFeed]:
        return self.menu

    def listar(
        self,
        cursor_fecha: datetime | None,
        cursor_id: int | None,
        limite: int,
    ) -> list[ArticuloFeed]:
        self.argumentos = (cursor_fecha, cursor_id, limite)
        return self.articulos


def crear_articulo(articulo_id: int, publicado_en: datetime) -> ArticuloFeed:
    return ArticuloFeed(
        id=articulo_id,
        titulo=f"Artículo {articulo_id}",
        publicado_en=publicado_en,
        bloques=[
            BloqueFeed(
                id=articulo_id * 10,
                orden=1,
                tipo="texto",
                payload={"contenido": "Texto de prueba"},
            )
        ],
    )


def test_cursor_se_codifica_y_decodifica() -> None:
    fecha = datetime(2026, 10, 15, 12, 30, 45)

    assert decodificar_cursor(codificar_cursor(fecha, 25)) == (fecha, 25)


@pytest.mark.parametrize("cursor", ["", "no-es-base64", "e30"])
def test_cursor_invalido_se_rechaza(cursor: str) -> None:
    with pytest.raises(ErrorCursorFeed):
        decodificar_cursor(cursor)


def test_listar_devuelve_solo_limite_y_cursor_de_ultima_entrega() -> None:
    fecha = datetime(2026, 10, 15, 12, 30, 45)
    articulos = [
        crear_articulo(9, fecha),
        crear_articulo(8, fecha - timedelta(days=1)),
        crear_articulo(7, fecha - timedelta(days=2)),
    ]
    repository = RepositorioFeedFalso(articulos)

    resultado = FeedService(repository).listar(cursor=None, limite=2)

    assert [item["id"] for item in resultado["items"]] == [9, 8]
    assert resultado["items"][0]["bloques"][0]["payload"] == {
        "contenido": "Texto de prueba"
    }
    assert decodificar_cursor(resultado["siguienteCursor"]) == (
        articulos[1].publicado_en,
        articulos[1].id,
    )
    assert repository.argumentos == (None, None, 2)


def test_listar_no_devuelve_cursor_si_no_hay_mas_articulos() -> None:
    fecha = datetime(2026, 10, 15, 12, 30, 45)
    repository = RepositorioFeedFalso([crear_articulo(1, fecha)])

    resultado = FeedService(repository).listar(cursor="", limite=10)

    assert len(resultado["items"]) == 1
    assert resultado["siguienteCursor"] is None
    assert repository.argumentos == (None, None, 10)


def test_listar_menu_incluye_el_criterio_de_filtro() -> None:
    opcion = OpcionMenuFeed(
        id="inicio",
        etiqueta="Inicio",
        icono="⌂",
        destino="feed",
        valor="",
        criterio_filtro=None,
    )
    service = FeedService(RepositorioFeedFalso([], [opcion]))

    assert service.listar_menu() == [
        {
            "id": "inicio",
            "etiqueta": "Inicio",
            "icono": "⌂",
            "destino": "feed",
            "valor": "",
            "criterio_filtro": None,
        }
    ]
