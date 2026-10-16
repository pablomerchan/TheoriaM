from datetime import datetime
from uuid import UUID

import pyodbc
import pytest

import repositories.sql_server_formularios_repo as formularios_repo
from repositories.formularios_repo import ConflictoClientRequestId


class CursorFalso:
    def execute(self, query: str, *parameters: object) -> None:
        assert "[tm_formularios].[usp_respuesta_guardar]" in query
        assert len(parameters) == 5
        raise pyodbc.Error(
            "42000",
            "[SQL Server]client_request_id ya utilizado para otra respuesta. (50003)",
        )

    def close(self) -> None:
        pass


class ConexionFalsa:
    def cursor(self) -> CursorFalso:
        return CursorFalso()

    def close(self) -> None:
        pass


class CursorRespuesta:
    def execute(self, query: str, *parameters: object) -> None:
        assert "[tm_formularios].[usp_respuesta_guardar]" in query
        assert len(parameters) == 5

    def fetchone(self) -> tuple[object, ...]:
        return (
            8,
            UUID("4e0a0c63-a419-4f51-b29c-a6c448d83a14"),
            45,
            "estado-animo",
            '{"estado":"bien"}',
            UUID("6382c99a-d31b-4e6f-af89-6338bbad91f6"),
            datetime(2026, 10, 15, 12, 0),
            datetime(2026, 10, 15, 12, 0),
        )

    def close(self) -> None:
        pass


class ConexionPersistente:
    def __init__(self) -> None:
        self.commits = 0

    def cursor(self) -> CursorRespuesta:
        return CursorRespuesta()

    def commit(self) -> None:
        self.commits += 1

    def close(self) -> None:
        pass


def test_procedimiento_de_conflicto_se_traduce_sin_exponer_sql(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def abrir_conexion(database: str) -> ConexionFalsa:
        assert database == "users_database"
        return ConexionFalsa()

    monkeypatch.setattr(
        formularios_repo,
        "abrir_conexion",
        abrir_conexion,
    )
    repository = formularios_repo.SqlServerFormulariosRepository()

    with pytest.raises(ConflictoClientRequestId):
        repository.guardar(
            UUID("4e0a0c63-a419-4f51-b29c-a6c448d83a14"),
            45,
            "estado-animo",
            '{"estado":"bien"}',
            UUID("6382c99a-d31b-4e6f-af89-6338bbad91f6"),
        )


def test_guardado_confirma_la_transaccion_exterior_del_driver(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    connection = ConexionPersistente()

    def abrir_conexion(database: str) -> ConexionPersistente:
        assert database == "users_database"
        return connection

    monkeypatch.setattr(
        formularios_repo,
        "abrir_conexion",
        abrir_conexion,
    )

    result = formularios_repo.SqlServerFormulariosRepository().guardar(
        UUID("4e0a0c63-a419-4f51-b29c-a6c448d83a14"),
        45,
        "estado-animo",
        '{"estado":"bien"}',
        UUID("6382c99a-d31b-4e6f-af89-6338bbad91f6"),
    )

    assert result.id == 8
    assert connection.commits == 1
