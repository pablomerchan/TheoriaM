from dataclasses import dataclass
from datetime import datetime
from typing import Any, Protocol
from uuid import UUID


@dataclass(frozen=True)
class BloqueFeed:
    id: int
    orden: int
    tipo: str
    payload: dict[str, Any]


@dataclass(frozen=True)
class ArticuloFeed:
    id: int
    titulo: str
    publicado_en: datetime
    bloques: list[BloqueFeed]
    reglas_segmentacion: dict[str, Any] | None = None


@dataclass(frozen=True)
class OpcionMenuFeed:
    id: str
    etiqueta: str
    icono: str
    destino: str
    valor: str
    criterio_filtro: str | None


@dataclass(frozen=True)
class ComentarioFeed:
    id: int
    autor: str
    contenido: str
    creado_en: datetime


@dataclass(frozen=True)
class InteraccionesFeed:
    me_gusta: bool
    total_me_gusta: int
    comentarios: list[ComentarioFeed]


class FeedRepository(Protocol):
    def obtener_atributos_usuario(self, usuario_id: UUID) -> dict[str, Any]: ...

    def listar_publicacion(self) -> list[dict[str, Any]]: ...

    def guardar_publicacion(
        self,
        articulo_id: int | None,
        titulo: str,
        contenido: str | None,
        estado: int,
        reglas: dict[str, Any] | None,
    ) -> dict[str, Any]: ...

    def listar(
        self,
        cursor_fecha: datetime | None,
        cursor_id: int | None,
        limite: int,
    ) -> list[ArticuloFeed]: ...

    def listar_menu(self) -> list[OpcionMenuFeed]: ...

    def listar_interacciones(
        self,
        articulos_ids: list[int],
        usuario_id: UUID,
    ) -> dict[int, InteraccionesFeed]: ...

    def alternar_me_gusta(
        self,
        articulo_id: int,
        usuario_id: UUID,
    ) -> tuple[bool, int]: ...

    def crear_comentario(
        self,
        articulo_id: int,
        usuario_id: UUID,
        contenido: str,
    ) -> ComentarioFeed: ...
