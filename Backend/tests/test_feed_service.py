from datetime import date, datetime, timedelta
from uuid import UUID

import pytest

from repositories.feed_repo import (
    ArticuloFeed,
    BloqueFeed,
    ComentarioFeed,
    InteraccionesFeed,
    OpcionMenuFeed,
)
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
        self.atributos: dict[str, object] = {}
        self.interacciones: dict[int, InteraccionesFeed] = {}
        self.interacciones_solicitadas: tuple[list[int], UUID] | None = None

    def obtener_atributos_usuario(self, usuario_id: UUID) -> dict[str, object]:
        return self.atributos

    def listar_menu(self) -> list[OpcionMenuFeed]:
        return self.menu

    def listar_interacciones(
        self,
        articulos_ids: list[int],
        usuario_id: UUID,
    ) -> dict[int, InteraccionesFeed]:
        self.interacciones_solicitadas = (articulos_ids, usuario_id)
        return {
            articulo_id: self.interacciones.get(
                articulo_id,
                InteraccionesFeed(False, 0, []),
            )
            for articulo_id in articulos_ids
        }

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

    resultado = FeedService(repository).listar(
        cursor=None,
        limite=2,
        usuario_id=UUID("00000000-0000-0000-0000-000000000001"),
    )

    assert [item["id"] for item in resultado["items"]] == [9, 8]
    assert resultado["items"][0]["bloques"][0]["payload"] == {
        "contenido": "Texto de prueba"
    }
    assert resultado["items"][0]["me_gusta"] is False
    assert resultado["items"][0]["total_me_gusta"] == 0
    assert resultado["items"][0]["comentarios"] == []
    assert decodificar_cursor(resultado["siguienteCursor"]) == (
        articulos[1].publicado_en,
        articulos[1].id,
    )
    assert repository.argumentos == (None, None, 50)


def test_listar_incluye_me_gusta_y_comentarios_de_cada_articulo() -> None:
    fecha = datetime(2026, 10, 15, 12, 30, 45)
    comentario = ComentarioFeed(
        id=5,
        autor="ana",
        contenido="Muy útil",
        creado_en=fecha,
    )
    repository = RepositorioFeedFalso([crear_articulo(1, fecha)])
    repository.interacciones[1] = InteraccionesFeed(True, 3, [comentario])

    resultado = FeedService(repository).listar(
        cursor=None,
        limite=10,
        usuario_id=UUID("00000000-0000-0000-0000-000000000001"),
    )

    assert resultado["items"][0]["me_gusta"] is True
    assert resultado["items"][0]["total_me_gusta"] == 3
    assert repository.interacciones_solicitadas == (
        [1],
        UUID("00000000-0000-0000-0000-000000000001"),
    )
    assert resultado["items"][0]["comentarios"] == [
        {
            "id": 5,
            "autor": "ana",
            "contenido": "Muy útil",
            "creado_en": fecha,
        }
    ]


def test_listar_no_devuelve_cursor_si_no_hay_mas_articulos() -> None:
    fecha = datetime(2026, 10, 15, 12, 30, 45)
    repository = RepositorioFeedFalso([crear_articulo(1, fecha)])

    resultado = FeedService(repository).listar(
        cursor="",
        limite=10,
        usuario_id=UUID("00000000-0000-0000-0000-000000000001"),
    )

    assert len(resultado["items"]) == 1
    assert resultado["siguienteCursor"] is None
    assert repository.argumentos == (None, None, 50)


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


def test_listar_filtra_articulos_por_atributos_del_perfil() -> None:
    fecha = datetime(2026, 10, 15, 12, 30, 45)
    restringido = ArticuloFeed(
        id=3,
        titulo="Contenido adulto",
        publicado_en=fecha,
        bloques=[],
        reglas_segmentacion={
            "modo": "todos",
            "condiciones": [
                {"atributo": "perfil.edad", "operador": "gte", "valor": 18}
            ],
        },
    )
    repository = RepositorioFeedFalso(
        [restringido, crear_articulo(2, fecha - timedelta(days=1))]
    )
    repository.atributos["perfil.fecha_nacimiento"] = date(2015, 5, 1)

    resultado = FeedService(repository).listar(
        cursor=None,
        limite=10,
        usuario_id=UUID("00000000-0000-0000-0000-000000000001"),
    )

    assert [item["id"] for item in resultado["items"]] == [2]
    assert resultado["siguienteCursor"] is None


def test_listar_compara_sexo_con_la_clave_completa_del_perfil() -> None:
    fecha = datetime(2026, 10, 15, 12, 30, 45)
    articulo = ArticuloFeed(
        id=1,
        titulo="Artículo por sexo",
        publicado_en=fecha,
        bloques=[],
        reglas_segmentacion={
            "modo": "todos",
            "condiciones": [
                {"atributo": "perfil.sexo", "operador": "eq", "valor": "femenino"}
            ],
        },
    )
    repository = RepositorioFeedFalso([articulo])
    repository.atributos["perfil.sexo"] = "femenino"
    service = FeedService(repository)
    usuario_id = UUID("00000000-0000-0000-0000-000000000001")

    resultado_coincidente = service.listar(
        cursor=None,
        limite=10,
        usuario_id=usuario_id,
    )
    repository.atributos["perfil.sexo"] = "masculino"
    resultado_no_coincidente = service.listar(
        cursor=None,
        limite=10,
        usuario_id=usuario_id,
    )

    assert [item["id"] for item in resultado_coincidente["items"]] == [1]
    assert resultado_no_coincidente["items"] == []


def test_listar_asigna_articulo_a_usuario_y_caracteristicas_especificas() -> None:
    fecha = datetime(2026, 10, 15, 12, 30, 45)
    usuario_id = UUID("00000000-0000-0000-0000-000000000001")
    articulo_asignado = ArticuloFeed(
        id=1,
        titulo="Artículo asignado",
        publicado_en=fecha,
        bloques=[],
        reglas_segmentacion={
            "modo": "todos",
            "condiciones": [
                {
                    "atributo": "perfil.id_usuario",
                    "operador": "eq",
                    "valor": str(usuario_id),
                },
                {
                    "atributo": "perfil.estatura_cm",
                    "operador": "gte",
                    "valor": 170,
                },
            ],
        },
    )
    articulo_otro_usuario = ArticuloFeed(
        id=2,
        titulo="Artículo de otro usuario",
        publicado_en=fecha - timedelta(minutes=1),
        bloques=[],
        reglas_segmentacion={
            "modo": "todos",
            "condiciones": [
                {
                    "atributo": "perfil.id_usuario",
                    "operador": "eq",
                    "valor": "00000000-0000-0000-0000-000000000002",
                }
            ],
        },
    )
    articulo_incompatible = ArticuloFeed(
        id=3,
        titulo="Artículo incompatible",
        publicado_en=fecha - timedelta(minutes=2),
        bloques=[],
        reglas_segmentacion={
            "modo": "todos",
            "condiciones": [
                {
                    "atributo": "perfil.id_usuario",
                    "operador": "eq",
                    "valor": str(usuario_id),
                },
                {
                    "atributo": "perfil.estatura_cm",
                    "operador": "lt",
                    "valor": 170,
                },
            ],
        },
    )
    repository = RepositorioFeedFalso(
        [articulo_asignado, articulo_otro_usuario, articulo_incompatible]
    )
    repository.atributos["perfil.estatura_cm"] = 180

    resultado = FeedService(repository).listar(
        cursor=None,
        limite=10,
        usuario_id=usuario_id,
    )

    assert [item["id"] for item in resultado["items"]] == [1]


def test_regla_puede_combinar_atributos_de_perfil_y_contexto() -> None:
    fecha = datetime(2026, 10, 15, 12, 30, 45)
    articulo = ArticuloFeed(
        id=1,
        titulo="Artículo segmentado",
        publicado_en=fecha,
        bloques=[],
        reglas_segmentacion={
            "modo": "alguno",
            "condiciones": [
                {"atributo": "perfil.sexo", "operador": "eq", "valor": "mujer"},
                {"atributo": "contexto.idioma", "operador": "in", "valor": ["es"]},
            ],
        },
    )
    repository = RepositorioFeedFalso([articulo])

    resultado = FeedService(repository).listar(
        cursor=None,
        limite=10,
        usuario_id=UUID("00000000-0000-0000-0000-000000000001"),
        idioma="es-CO,es;q=0.9",
    )

    assert [item["id"] for item in resultado["items"]] == [1]


def test_paginacion_busca_contenido_elegible_y_no_omite_la_pagina_siguiente() -> None:
    fecha = datetime(2026, 10, 15, 12, 30, 45)
    articulos = []
    for articulo_id in range(100, 0, -1):
        reglas = (
            {
                "modo": "todos",
                "condiciones": [
                    {"atributo": "perfil.edad", "operador": "gte", "valor": 18}
                ],
            }
            if articulo_id not in {49, 50}
            else None
        )
        articulo = crear_articulo(articulo_id, fecha)
        articulos.append(
            ArticuloFeed(
                articulo.id,
                articulo.titulo,
                articulo.publicado_en,
                articulo.bloques,
                reglas,
            )
        )

    class RepositorioConCursor(RepositorioFeedFalso):
        def listar(
            self,
            cursor_fecha: datetime | None,
            cursor_id: int | None,
            limite: int,
        ) -> list[ArticuloFeed]:
            self.argumentos = (cursor_fecha, cursor_id, limite)
            restantes = [
                articulo
                for articulo in self.articulos
                if cursor_fecha is None
                or articulo.publicado_en < cursor_fecha
                or (
                    articulo.publicado_en == cursor_fecha
                    and cursor_id is not None
                    and articulo.id < cursor_id
                )
            ]
            return restantes[: limite + 1]

    repository = RepositorioConCursor(articulos)
    repository.atributos["perfil.edad"] = 17
    service = FeedService(repository)
    usuario_id = UUID("00000000-0000-0000-0000-000000000001")

    primera_pagina = service.listar(cursor=None, limite=1, usuario_id=usuario_id)
    segunda_pagina = service.listar(
        cursor=primera_pagina["siguienteCursor"],
        limite=1,
        usuario_id=usuario_id,
    )

    assert [item["id"] for item in primera_pagina["items"]] == [50]
    assert [item["id"] for item in segunda_pagina["items"]] == [49]
    assert segunda_pagina["siguienteCursor"] is None
