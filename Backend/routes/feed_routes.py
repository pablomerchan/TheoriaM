import logging
from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field, model_validator

from repositories.sql_server_feed_repo import (
    ErrorArticuloFeedNoEncontrado,
    ErrorDatosFeed,
    SqlServerFeedRepository,
)
from routes.api_routes import ApiRoute, ErrorRespuesta
from services.auth_dependencies import UsuarioActual, get_usuario_actual
from services.feed_admin_dependencies import get_editor_feed
from services.feed_service import (
    ErrorCursorFeed,
    ErrorLimiteFeed,
    ErrorReglaSegmentacion,
    FeedService,
)


logger = logging.getLogger(__name__)
feed_repository = SqlServerFeedRepository()
feed_service = FeedService(feed_repository)


class BloqueRespuesta(BaseModel):
    id: int
    orden: int
    tipo: str
    payload: dict[str, object]


class ArticuloRespuesta(BaseModel):
    id: int
    titulo: str
    publicado_en: datetime
    me_gusta: bool
    total_me_gusta: int
    comentarios: list["ComentarioRespuesta"]
    bloques: list[BloqueRespuesta]


class ComentarioRespuesta(BaseModel):
    id: int
    autor: str
    contenido: str
    creado_en: datetime


class MeGustaRespuesta(BaseModel):
    me_gusta: bool
    total_me_gusta: int


class CrearComentarioEntrada(BaseModel):
    contenido: str = Field(min_length=1, max_length=1000)

    @model_validator(mode="after")
    def validar_contenido(self) -> "CrearComentarioEntrada":
        if not self.contenido.strip():
            raise ValueError("El comentario no puede estar vacío.")
        return self


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


class CondicionSegmentacionEntrada(BaseModel):
    atributo: Literal[
        "perfil.edad",
        "perfil.id_usuario",
        "perfil.sexo",
        "perfil.color_piel",
        "perfil.peso_kg",
        "perfil.estatura_cm",
        "perfil.color_cabello",
        "perfil.clima_principal",
        "perfil.clima_secundario",
        "contexto.fecha_utc",
        "contexto.hora_utc",
        "contexto.dia_semana",
        "contexto.idioma",
    ]
    operador: Literal[
        "eq", "ne", "in", "not_in", "gt", "gte", "lt", "lte", "exists"
    ]
    valor: Any

    @model_validator(mode="after")
    def validar_valor(self) -> "CondicionSegmentacionEntrada":
        if self.atributo == "perfil.id_usuario":
            if self.operador != "eq" or not isinstance(self.valor, str):
                raise ValueError("El ID de usuario solo admite una comparación exacta.")
            try:
                self.valor = str(UUID(self.valor))
            except ValueError as error:
                raise ValueError("El ID de usuario debe ser un UUID válido.") from error
            return self
        atributos_numericos = {
            "perfil.edad",
            "perfil.peso_kg",
            "perfil.estatura_cm",
            "contexto.hora_utc",
            "contexto.dia_semana",
        }
        if self.operador == "exists":
            if not isinstance(self.valor, bool):
                raise ValueError("El operador exists requiere un valor booleano.")
            return self
        if self.operador in {"gt", "gte", "lt", "lte"}:
            if (
                self.atributo not in atributos_numericos
                or isinstance(self.valor, bool)
                or not isinstance(self.valor, (int, float))
            ):
                raise ValueError(
                    "Las comparaciones de rango requieren un atributo numérico."
                )
            return self
        if self.operador in {"in", "not_in"}:
            if not isinstance(self.valor, list) or not self.valor:
                raise ValueError("Los operadores in y not_in requieren una lista.")
            if self.atributo in atributos_numericos and any(
                isinstance(item, bool) or not isinstance(item, (int, float))
                for item in self.valor
            ):
                raise ValueError("La lista debe contener valores numéricos.")
            if self.atributo not in atributos_numericos and any(
                not isinstance(item, str) for item in self.valor
            ):
                raise ValueError("La lista debe contener valores de texto.")
            return self
        if self.atributo in atributos_numericos:
            if isinstance(self.valor, bool) or not isinstance(
                self.valor, (int, float)
            ):
                raise ValueError("El atributo seleccionado requiere un valor numérico.")
        elif not isinstance(self.valor, str):
            raise ValueError("El atributo seleccionado requiere un valor de texto.")
        return self


class ReglasSegmentacionEntrada(BaseModel):
    modo: Literal["todos", "alguno"]
    condiciones: list[CondicionSegmentacionEntrada] = Field(
        min_length=1,
        max_length=20,
    )

    @model_validator(mode="after")
    def validar_asignacion_usuario(self) -> "ReglasSegmentacionEntrada":
        if self.modo != "todos" and any(
            condicion.atributo == "perfil.id_usuario"
            for condicion in self.condiciones
        ):
            raise ValueError(
                "La asignación a un usuario requiere que se cumplan todas las condiciones."
            )
        return self


class GuardarArticuloFeedEntrada(BaseModel):
    titulo: str = Field(min_length=1, max_length=200)
    contenido: str | None = Field(default=None, max_length=100000)
    estado: Literal[0, 1, 2]
    reglas: ReglasSegmentacionEntrada | None = None

    @model_validator(mode="after")
    def validar_titulo(self) -> "GuardarArticuloFeedEntrada":
        if not self.titulo.strip():
            raise ValueError("El título del artículo es obligatorio.")
        return self


router = APIRouter(
    prefix="/api/v1",
    tags=["feed"],
    route_class=ApiRoute,
    dependencies=[Depends(get_usuario_actual)],
)


@router.get(
    "/feed/admin/articulos",
    responses={
        401: {"model": ErrorRespuesta},
        403: {"model": ErrorRespuesta},
        503: {"model": ErrorRespuesta},
    },
)
def listar_articulos_admin(
    _: UsuarioActual = Depends(get_editor_feed),
) -> list[dict[str, Any]]:
    try:
        return feed_repository.listar_publicacion()
    except ErrorDatosFeed as error:
        logger.exception("No fue posible listar los artículos administrables del feed.")
        raise HTTPException(
            status_code=503,
            detail={
                "codigo": "error_publicacion_feed",
                "mensaje": "No fue posible cargar los artículos del feed.",
                "detalle": None,
            },
        ) from error


@router.post(
    "/feed/admin/articulos",
    status_code=status.HTTP_201_CREATED,
    responses={
        401: {"model": ErrorRespuesta},
        403: {"model": ErrorRespuesta},
        422: {"model": ErrorRespuesta},
    },
)
def crear_articulo_feed(
    entrada: GuardarArticuloFeedEntrada,
    _: UsuarioActual = Depends(get_editor_feed),
) -> dict[str, Any]:
    if entrada.contenido is None:
        raise HTTPException(
            status_code=422,
            detail={
                "codigo": "contenido_requerido",
                "mensaje": "El contenido del artículo es obligatorio.",
                "detalle": None,
            },
        )
    reglas = entrada.reglas.model_dump() if entrada.reglas else None
    try:
        return feed_repository.guardar_publicacion(
            None,
            entrada.titulo.strip(),
            entrada.contenido,
            entrada.estado,
            reglas,
        )
    except ErrorDatosFeed as error:
        logger.exception("No fue posible crear el artículo del feed.")
        raise HTTPException(
            status_code=503,
            detail={
                "codigo": "error_publicacion_feed",
                "mensaje": "No fue posible guardar el artículo.",
                "detalle": None,
            },
        ) from error


@router.put(
    "/feed/admin/articulos/{articulo_id}",
    responses={
        401: {"model": ErrorRespuesta},
        403: {"model": ErrorRespuesta},
        404: {"model": ErrorRespuesta},
        422: {"model": ErrorRespuesta},
        503: {"model": ErrorRespuesta},
    },
)
def actualizar_articulo_feed(
    articulo_id: int,
    entrada: GuardarArticuloFeedEntrada,
    _: UsuarioActual = Depends(get_editor_feed),
) -> dict[str, Any]:
    try:
        return feed_repository.guardar_publicacion(
            articulo_id,
            entrada.titulo.strip(),
            entrada.contenido,
            entrada.estado,
            entrada.reglas.model_dump() if entrada.reglas else None,
        )
    except ErrorArticuloFeedNoEncontrado as error:
        raise HTTPException(
            status_code=404,
            detail={
                "codigo": "articulo_feed_no_encontrado",
                "mensaje": "No se encontró el artículo del Feed.",
                "detalle": None,
            },
        ) from error
    except ErrorDatosFeed as error:
        logger.exception("No fue posible actualizar el artículo del feed.")
        raise HTTPException(
            status_code=503,
            detail={
                "codigo": "error_publicacion_feed",
                "mensaje": "No fue posible actualizar el artículo.",
                "detalle": None,
            },
        ) from error


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
    request: Request,
    cursor: str | None = Query(default=None, max_length=512),
    limite: int = Query(default=10, ge=1, le=50),
    usuario: UsuarioActual = Depends(get_usuario_actual),
) -> dict[str, object]:
    try:
        return feed_service.listar(
            cursor,
            limite,
            usuario["id"],
            request.headers.get("Accept-Language"),
        )
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
    except ErrorReglaSegmentacion as error:
        logger.exception(
            "Las reglas almacenadas de segmentación del feed son inválidas."
        )
        raise HTTPException(
            status_code=503,
            detail={
                "codigo": "error_reglas_feed",
                "mensaje": "No fue posible evaluar las reglas del feed.",
                "detalle": None,
            },
        ) from error


@router.post(
    "/feed/articulos/{articulo_id}/me-gusta",
    response_model=MeGustaRespuesta,
    responses={
        401: {"model": ErrorRespuesta},
        404: {"model": ErrorRespuesta},
        503: {"model": ErrorRespuesta},
    },
)
def alternar_me_gusta(
    articulo_id: int,
    usuario: UsuarioActual = Depends(get_usuario_actual),
) -> dict[str, bool | int]:
    try:
        me_gusta, total_me_gusta = feed_repository.alternar_me_gusta(
            articulo_id,
            usuario["id"],
        )
        return {"me_gusta": me_gusta, "total_me_gusta": total_me_gusta}
    except ErrorArticuloFeedNoEncontrado as error:
        raise HTTPException(
            status_code=404,
            detail={
                "codigo": "articulo_feed_no_encontrado",
                "mensaje": "No se encontró el artículo publicado.",
                "detalle": None,
            },
        ) from error
    except ErrorDatosFeed as error:
        logger.exception("No fue posible registrar el Me gusta del artículo.")
        raise HTTPException(
            status_code=503,
            detail={
                "codigo": "error_interaccion_feed",
                "mensaje": "No fue posible registrar el Me gusta.",
                "detalle": None,
            },
        ) from error


@router.post(
    "/feed/articulos/{articulo_id}/comentarios",
    response_model=ComentarioRespuesta,
    status_code=status.HTTP_201_CREATED,
    responses={
        401: {"model": ErrorRespuesta},
        404: {"model": ErrorRespuesta},
        422: {"model": ErrorRespuesta},
        503: {"model": ErrorRespuesta},
    },
)
def crear_comentario_feed(
    articulo_id: int,
    entrada: CrearComentarioEntrada,
    usuario: UsuarioActual = Depends(get_usuario_actual),
) -> dict[str, Any]:
    try:
        comentario = feed_repository.crear_comentario(
            articulo_id,
            usuario["id"],
            entrada.contenido.strip(),
        )
        return {
            "id": comentario.id,
            "autor": comentario.autor,
            "contenido": comentario.contenido,
            "creado_en": comentario.creado_en,
        }
    except ErrorArticuloFeedNoEncontrado as error:
        raise HTTPException(
            status_code=404,
            detail={
                "codigo": "articulo_feed_no_encontrado",
                "mensaje": "No se encontró el artículo publicado.",
                "detalle": None,
            },
        ) from error
    except ErrorDatosFeed as error:
        logger.exception("No fue posible guardar el comentario del artículo.")
        raise HTTPException(
            status_code=503,
            detail={
                "codigo": "error_interaccion_feed",
                "mensaje": "No fue posible guardar el comentario.",
                "detalle": None,
            },
        ) from error
