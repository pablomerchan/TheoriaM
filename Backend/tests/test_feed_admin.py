from uuid import UUID

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from routes.feed_routes import (
    CondicionSegmentacionEntrada,
    GuardarArticuloFeedEntrada,
)
from repositories.sql_server_feed_repo import _fetch_result_set
from services.auth_dependencies import UsuarioActual
from services.feed_admin_dependencies import get_editor_feed


class CursorConResultados:
    def __init__(self, resultados: list[list[tuple[int]] | None]) -> None:
        self.resultados = resultados
        self.indice = 0

    @property
    def description(self) -> tuple[str] | None:
        return ("columna",) if self.resultados[self.indice] is not None else None

    def fetchall(self) -> list[tuple[int]]:
        return self.resultados[self.indice] or []

    def nextset(self) -> bool:
        self.indice += 1
        return self.indice < len(self.resultados)


def test_fetch_result_set_omite_resultados_sin_filas() -> None:
    cursor = CursorConResultados([None, [(1,)], None, [(2,)]])

    assert _fetch_result_set(cursor) == [(1,)]
    assert _fetch_result_set(cursor, advance=True) == [(2,)]


def test_condicion_numerica_admite_operador_de_rango() -> None:
    condicion = CondicionSegmentacionEntrada(
        atributo="perfil.edad",
        operador="gte",
        valor=18,
    )

    assert condicion.valor == 18


def test_condicion_textual_rechaza_operador_de_rango() -> None:
    with pytest.raises(ValidationError):
        CondicionSegmentacionEntrada(
            atributo="perfil.sexo",
            operador="gte",
            valor=18,
        )


def test_condicion_exists_requiere_booleano() -> None:
    with pytest.raises(ValidationError):
        CondicionSegmentacionEntrada(
            atributo="perfil.sexo",
            operador="exists",
            valor="true",
        )


def test_articulo_rechaza_titulo_vacio() -> None:
    with pytest.raises(ValidationError):
        GuardarArticuloFeedEntrada(
            titulo="   ",
            estado=0,
            reglas=None,
        )


def test_editor_feed_requiere_id_autorizado(monkeypatch: pytest.MonkeyPatch) -> None:
    usuario: UsuarioActual = {
        "id": UUID("00000000-0000-0000-0000-000000000001"),
        "seudonimo": "editor",
    }
    monkeypatch.setenv(
        "THEORIAM_FEED_PUBLISHER_IDS",
        "00000000-0000-0000-0000-000000000002",
    )

    with pytest.raises(HTTPException) as error:
        get_editor_feed(usuario)

    assert error.value.status_code == 403


def test_editor_feed_acepta_id_autorizado(monkeypatch: pytest.MonkeyPatch) -> None:
    usuario: UsuarioActual = {
        "id": UUID("00000000-0000-0000-0000-000000000001"),
        "seudonimo": "editor",
    }
    monkeypatch.setenv(
        "THEORIAM_FEED_PUBLISHER_IDS",
        "00000000-0000-0000-0000-000000000001",
    )

    assert get_editor_feed(usuario) == usuario
