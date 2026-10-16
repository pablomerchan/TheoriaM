import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from routes.api_routes import ApiRoute, ErrorRespuesta
from repositories.sql_server_feed_repo import (
    ErrorDatosFeed,
    SqlServerFeedRepository,
)
from services.auth_dependencies import get_usuario_actual
from services.feed_service import ErrorCursorFeed, ErrorLimiteFeed, FeedService


logger = logging.getLogger(__name__)
feed_service = FeedService(SqlServerFeedRepository())


class BloqueRespuesta(BaseModel):
    id: int
    orden: int
    tipo: str
    payload: dict[str, object]


class ArticuloRespuesta(BaseModel):
    id: int
    titulo: str
    publicado_en: datetime
    bloques: list[BloqueRespuesta]


class FeedRespuesta(BaseModel):
    items: list[ArticuloRespuesta]
    siguienteCursor: str | None


class OpcionMenuRespuesta(BaseModel):
    id: str
    etiqueta: str
    icono: str
    destino: str
    valor: str
    criterio_filtro: str | None


router = APIRouter(
    prefix="/api/v1",
    tags=["feed"],
    route_class=ApiRoute,
    dependencies=[Depends(get_usuario_actual)],
)


@router.get(
    "/feed/menu",
    response_model=list[OpcionMenuRespuesta],
    responses={
        401: {"model": ErrorRespuesta},
        503: {"model": ErrorRespuesta},
    },
)
def obtener_menu() -> list[dict[str, str | None]]:
    try:
        return feed_service.listar_menu()
    except ErrorDatosFeed as error:
        logger.exception("No fue posible cargar el menú del feed.")
        raise HTTPException(
            status_code=503,
            detail={
                "codigo": "error_menu_feed",
                "mensaje": "No fue posible cargar el menú del feed.",
                "detalle": None,
            },
        ) from error


@router.get(
    "/feed",
    response_model=FeedRespuesta,
    responses={
        400: {"model": ErrorRespuesta},
        401: {"model": ErrorRespuesta},
        422: {"model": ErrorRespuesta},
        503: {"model": ErrorRespuesta},
    },
)
def obtener_feed(
    cursor: str | None = Query(default=None, max_length=512),
    limite: int = Query(default=10, ge=1, le=50),
) -> dict[str, object]:
    try:
        return feed_service.listar(cursor, limite)
    except ErrorCursorFeed as error:
        raise HTTPException(
            status_code=400,
            detail={
                "codigo": "cursor_invalido",
                "mensaje": "El cursor no es válido.",
                "detalle": str(error),
            },
        ) from error
    except ErrorLimiteFeed as error:
        raise HTTPException(
            status_code=422,
            detail={
                "codigo": "limite_invalido",
                "mensaje": "El límite no es válido.",
                "detalle": str(error),
            },
        ) from error
    except ErrorDatosFeed as error:
        logger.exception("Los datos almacenados del feed son inválidos.")
        raise HTTPException(
            status_code=503,
            detail={
                "codigo": "error_datos_feed",
                "mensaje": "No fue posible cargar el feed.",
                "detalle": None,
            },
        ) from error
