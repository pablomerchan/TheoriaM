import logging
from datetime import datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Request
from pydantic import BaseModel, ConfigDict, Field

from repositories.formularios_repo import ConflictoClientRequestId
from repositories.sql_server_formularios_repo import (
    ErrorDatosFormulario,
    SqlServerFormulariosRepository,
)
from routes.api_routes import ApiRoute, ErrorRespuesta, respuesta_error
from services.auth_dependencies import UsuarioActual, get_usuario_actual
from services.formularios_service import (
    MAX_ARTICULO_ID,
    ErrorValidacionFormulario,
    FormulariosService,
)


logger = logging.getLogger(__name__)
formularios_service = FormulariosService(SqlServerFormulariosRepository())


class GuardarRespuestaRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    articulo_id: int = Field(gt=0, le=MAX_ARTICULO_ID, strict=True)
    client_request_id: UUID
    datos: dict[str, Any] = Field(
        description="Objeto JSON con un máximo de 64 KiB serializado en UTF-8."
    )


class RespuestaFormularioResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    articulo_id: int
    form_id: str
    datos: dict[str, Any]
    client_request_id: UUID
    creado_en: datetime
    actualizado_en: datetime


class FormulariosRoute(ApiRoute):
    def get_route_handler(self):
        handler = super().get_route_handler()

        async def handle(request: Request):
            try:
                return await handler(request)
            except ConflictoClientRequestId:
                return respuesta_error(
                    409,
                    "client_request_id_conflict",
                    "El client_request_id ya se utilizó para otra respuesta.",
                )
            except ErrorDatosFormulario:
                logger.exception("Los datos almacenados de un formulario son inválidos.")
                return respuesta_error(
                    503,
                    "error_datos_formulario",
                    "No fue posible completar la operación del formulario.",
                )

        return handle


router = APIRouter(
    prefix="/api/v1/formularios",
    tags=["formularios"],
    route_class=FormulariosRoute,
)


def _http_error_validacion(error: ErrorValidacionFormulario) -> HTTPException:
    return HTTPException(
        status_code=422,
        detail={
            "codigo": "formulario_invalido",
            "mensaje": "La referencia o los datos del formulario no son válidos.",
            "detalle": str(error),
        },
    )


@router.get(
    "/{formId}/respuesta",
    response_model=RespuestaFormularioResponse | None,
    responses={
        401: {"model": ErrorRespuesta},
        422: {"model": ErrorRespuesta},
        503: {"model": ErrorRespuesta},
    },
)
def obtener_respuesta(
    formId: str = Path(min_length=1, max_length=100),
    articulo_id: int = Query(
        gt=0,
        le=MAX_ARTICULO_ID,
    ),
    usuario: UsuarioActual = Depends(get_usuario_actual),
) -> RespuestaFormularioResponse | None:
    try:
        return formularios_service.obtener(
            usuario["id"],
            articulo_id,
            formId,
        )
    except ErrorValidacionFormulario as error:
        raise _http_error_validacion(error) from error


@router.post(
    "/{formId}/respuestas",
    response_model=RespuestaFormularioResponse,
    responses={
        401: {"model": ErrorRespuesta},
        422: {"model": ErrorRespuesta},
        409: {"model": ErrorRespuesta},
        503: {"model": ErrorRespuesta},
    },
)
@router.put(
    "/{formId}/respuestas",
    response_model=RespuestaFormularioResponse,
    responses={
        401: {"model": ErrorRespuesta},
        422: {"model": ErrorRespuesta},
        409: {"model": ErrorRespuesta},
        503: {"model": ErrorRespuesta},
    },
)
def guardar_respuesta(
    solicitud: GuardarRespuestaRequest,
    formId: str = Path(min_length=1, max_length=100),
    usuario: UsuarioActual = Depends(get_usuario_actual),
) -> RespuestaFormularioResponse:
    try:
        return formularios_service.guardar(
            usuario["id"],
            solicitud.articulo_id,
            formId,
            solicitud.datos,
            solicitud.client_request_id,
        )
    except ErrorValidacionFormulario as error:
        raise _http_error_validacion(error) from error
