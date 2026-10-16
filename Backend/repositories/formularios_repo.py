from dataclasses import dataclass
from datetime import datetime
from typing import Any, Protocol
from uuid import UUID


@dataclass(frozen=True)
class RespuestaFormulario:
    id: int
    articulo_id: int
    form_id: str
    datos: dict[str, Any]
    client_request_id: UUID
    creado_en: datetime
    actualizado_en: datetime


class ConflictoClientRequestId(Exception):
    pass


class FormulariosRepository(Protocol):
    def obtener(
        self,
        usuario_id: UUID,
        articulo_id: int,
        form_id: str,
    ) -> RespuestaFormulario | None: ...

    def guardar(
        self,
        usuario_id: UUID,
        articulo_id: int,
        form_id: str,
        datos_json: str,
        client_request_id: UUID,
    ) -> RespuestaFormulario: ...
