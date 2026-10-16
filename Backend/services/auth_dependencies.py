from typing import TypedDict
from uuid import UUID

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from services.auth_service import AuthService


esquema_bearer = HTTPBearer(auto_error=False)


class UsuarioActual(TypedDict):
    id: UUID
    seudonimo: str


def get_usuario_actual(
    request: Request,
    credenciales: HTTPAuthorizationCredentials | None = Depends(esquema_bearer),
) -> UsuarioActual:
    session = AuthService.get_authenticated_session(request)
    if session is None or credenciales is None:
        raise HTTPException(
            status_code=401,
            detail={
                "codigo": "no_autenticado",
                "mensaje": "Se requiere una sesión autenticada.",
                "detalle": None,
            },
        )

    try:
        usuario_id = UUID(session["user_id"])
    except (KeyError, ValueError) as error:
        raise HTTPException(
            status_code=401,
            detail={
                "codigo": "sesion_invalida",
                "mensaje": "La sesión no contiene un identificador de usuario válido.",
                "detalle": None,
            },
        ) from error

    return {"id": usuario_id, "seudonimo": session["seudonimo"]}
