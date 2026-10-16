from dataclasses import dataclass
from datetime import datetime
from typing import Any, Protocol


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


@dataclass(frozen=True)
class OpcionMenuFeed:
    id: str
    etiqueta: str
    icono: str
    destino: str
    valor: str
    criterio_filtro: str | None


class FeedRepository(Protocol):
    def listar(
        self,
        cursor_fecha: datetime | None,
        cursor_id: int | None,
        limite: int,
    ) -> list[ArticuloFeed]: ...

    def listar_menu(self) -> list[OpcionMenuFeed]: ...
