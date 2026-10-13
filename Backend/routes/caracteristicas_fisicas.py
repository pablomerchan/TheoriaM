import logging
import os
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from repositories.sqlite_contenido_repository import SqliteContenidoRepository
from repositories.sql_server_caracteristicas_repository import (
    SqlServerCaracteristicasRepository,
)
from services.auth_service import AuthService
from services.caracteristicas_fisicas_service import (
    CaracteristicasFisicasService,
    ErrorValidacionCaracteristicas,
)


logger = logging.getLogger(__name__)
contenido_repository = SqliteContenidoRepository(
    os.environ.get("THEORIAM_CARACTERISTICAS_FISICAS_DB")
    or Path(__file__).resolve().parents[1] / "BDs" / "caracteristicas_fisicas"
)
caracteristicas_service = CaracteristicasFisicasService(
    contenido_repository,
    SqlServerCaracteristicasRepository(),
)
router = APIRouter(prefix="/api/caracteristicas-fisicas", tags=["caracteristicas-fisicas"])


class CaracteristicasFisicasInput(BaseModel):
    sexo: str | None = None
    color_piel: str | None = None
    peso_kg: float | None = None
    estatura_cm: float | None = None
    color_cabello: str | None = None


def inicializar_contenido_caracteristicas() -> None:
    contenido_repository.inicializar()


def _usuario_autenticado(request: Request) -> dict[str, str]:
    session = AuthService.get_authenticated_session(request)
    if session is None:
        raise HTTPException(
            status_code=401,
            detail=caracteristicas_service.mensaje("error_sesion"),
        )
    return session


def _error_persistencia() -> HTTPException:
    try:
        mensaje = caracteristicas_service.mensaje("error_envio")
    except Exception:
        logger.exception("No fue posible recuperar el mensaje de error editable.")
        mensaje = ""
    return HTTPException(status_code=503, detail=mensaje)


@router.get("/configuracion")
def obtener_configuracion(request: Request) -> dict[str, Any]:
    session = _usuario_autenticado(request)
    try:
        return caracteristicas_service.obtener_configuracion(session["seudonimo"])
    except Exception as error:
        logger.exception("No fue posible cargar la configuración de características físicas.")
        raise _error_persistencia() from error


@router.get("")
def obtener_caracteristicas(request: Request) -> dict[str, Any] | None:
    session = _usuario_autenticado(request)
    try:
        return caracteristicas_service.obtener(session["seudonimo"])
    except Exception as error:
        logger.exception("No fue posible cargar las características físicas guardadas.")
        raise _error_persistencia() from error


@router.post("")
def guardar_caracteristicas(
    datos: CaracteristicasFisicasInput,
    request: Request,
) -> dict[str, str]:
    session = _usuario_autenticado(request)
    try:
        mensaje = caracteristicas_service.guardar(
            session["seudonimo"],
            datos.model_dump(),
        )
        return {"mensaje": mensaje}
    except ErrorValidacionCaracteristicas as error:
        raise HTTPException(status_code=422, detail=error.mensaje) from error
    except Exception as error:
        logger.exception("No fue posible guardar las características físicas.")
        raise _error_persistencia() from error
