import json
from typing import Any
from uuid import UUID

from repositories.formularios_repo import (
    FormulariosRepository,
    RespuestaFormulario,
)


MAX_ARTICULO_ID = 9_223_372_036_854_775_807
MAX_DATOS_BYTES = 65_536


class ErrorValidacionFormulario(ValueError):
    pass


class FormulariosService:
    def __init__(self, repository: FormulariosRepository) -> None:
        self.repository = repository

    def obtener(
        self,
        usuario_id: UUID,
        articulo_id: int,
        form_id: str,
    ) -> RespuestaFormulario | None:
        self._validar_referencia(articulo_id, form_id)
        return self.repository.obtener(usuario_id, articulo_id, form_id)

    def guardar(
        self,
        usuario_id: UUID,
        articulo_id: int,
        form_id: str,
        datos: dict[str, Any],
        client_request_id: UUID,
    ) -> RespuestaFormulario:
        self._validar_referencia(articulo_id, form_id)
        if not isinstance(datos, dict):
            raise ErrorValidacionFormulario(
                "Los datos del formulario deben ser un objeto JSON."
            )
        try:
            datos_json = json.dumps(
                datos,
                ensure_ascii=False,
                separators=(",", ":"),
                allow_nan=False,
            )
        except (TypeError, ValueError) as error:
            raise ErrorValidacionFormulario(
                "Los datos del formulario no contienen valores JSON válidos."
            ) from error
        if len(datos_json.encode("utf-8")) > MAX_DATOS_BYTES:
            raise ErrorValidacionFormulario(
                "Los datos del formulario exceden el máximo de 64 KiB."
            )

        return self.repository.guardar(
            usuario_id,
            articulo_id,
            form_id,
            datos_json,
            client_request_id,
        )

    @staticmethod
    def _validar_referencia(articulo_id: int, form_id: str) -> None:
        if (
            isinstance(articulo_id, bool)
            or not isinstance(articulo_id, int)
            or not 1 <= articulo_id <= MAX_ARTICULO_ID
        ):
            raise ErrorValidacionFormulario("El artículo no es válido.")
        if (
            not isinstance(form_id, str)
            or not form_id
            or len(form_id) > 100
            or form_id != form_id.strip()
        ):
            raise ErrorValidacionFormulario("El identificador de formulario no es válido.")
