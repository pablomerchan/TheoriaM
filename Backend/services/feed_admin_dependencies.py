import os
from pathlib import Path
from uuid import UUID

from dotenv import load_dotenv
from fastapi import Depends, HTTPException

from services.auth_dependencies import UsuarioActual, get_usuario_actual

load_dotenv(Path(__file__).resolve().parents[2] / ".env")


def get_editor_feed(
    usuario: UsuarioActual = Depends(get_usuario_actual),
) -> UsuarioActual:
    ids_configurados = os.environ.get("THEORIAM_FEED_PUBLISHER_IDS", "")
    ids_permitidos = {
        UUID(valor.strip())
        for valor in ids_configurados.split(",")
        if valor.strip()
    }
    if usuario["id"] not in ids_permitidos:
        raise HTTPException(
            status_code=403,
            detail={
                "codigo": "sin_permiso_publicacion_feed",
                "mensaje": "Tu cuenta no tiene permiso para administrar el Feed.",
                "detalle": None,
            },
        )
    return usuario
