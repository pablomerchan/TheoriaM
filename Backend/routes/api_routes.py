import logging

import pyodbc
from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from pydantic import BaseModel


logger = logging.getLogger(__name__)


class ErrorRespuesta(BaseModel):
    codigo: str
    mensaje: str
    detalle: object | None = None


def respuesta_error(
    status_code: int,
    codigo: str,
    mensaje: str,
    detalle: object | None = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "codigo": codigo,
            "mensaje": mensaje,
            "detalle": detalle,
        },
    )


class ApiRoute(APIRoute):
    def get_route_handler(self):
        handler = super().get_route_handler()

        async def handle(request: Request):
            try:
                return await handler(request)
            except RequestValidationError as error:
                return respuesta_error(
                    422,
                    "solicitud_invalida",
                    "La solicitud no es válida.",
                    error.errors(),
                )
            except pyodbc.Error:
                logger.exception("No fue posible completar una operación en SQL Server.")
                return respuesta_error(
                    503,
                    "error_persistencia",
                    "No fue posible completar la solicitud.",
                )
            except HTTPException as error:
                detail = error.detail
                if isinstance(detail, dict) and {
                    "codigo",
                    "mensaje",
                    "detalle",
                }.issubset(detail):
                    return JSONResponse(status_code=error.status_code, content=detail)
                return respuesta_error(
                    error.status_code,
                    "error_solicitud",
                    str(detail),
                )

        return handle
