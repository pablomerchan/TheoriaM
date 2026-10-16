import json
from datetime import datetime
from uuid import UUID

import pytest

from repositories.formularios_repo import RespuestaFormulario
from services.formularios_service import (
    MAX_DATOS_BYTES,
    ErrorValidacionFormulario,
    FormulariosService,
)


USUARIO_ID = UUID("4e0a0c63-a419-4f51-b29c-a6c448d83a14")
CLIENT_REQUEST_ID = UUID("6382c99a-d31b-4e6f-af89-6338bbad91f6")


class RepositorioFormulariosFalso:
    def __init__(self) -> None:
        self.argumentos_guardado: tuple[object, ...] | None = None
        self.argumentos_obtener: tuple[object, ...] | None = None
        self.respuesta: RespuestaFormulario | None = None

    def obtener(
        self,
        usuario_id: UUID,
        articulo_id: int,
        form_id: str,
    ) -> RespuestaFormulario | None:
        self.argumentos_obtener = (usuario_id, articulo_id, form_id)
        return self.respuesta

    def guardar(
        self,
        usuario_id: UUID,
        articulo_id: int,
        form_id: str,
        datos_json: str,
        client_request_id: UUID,
    ) -> RespuestaFormulario:
        self.argumentos_guardado = (
            usuario_id,
            articulo_id,
            form_id,
            datos_json,
            client_request_id,
        )
        self.respuesta = RespuestaFormulario(
            id=12,
            articulo_id=articulo_id,
            form_id=form_id,
            datos=json.loads(datos_json),
            client_request_id=client_request_id,
            creado_en=datetime(2026, 10, 15, 12, 0),
            actualizado_en=datetime(2026, 10, 15, 12, 0),
        )
        return self.respuesta


def test_obtener_usa_usuario_articulo_y_formulario_como_clave() -> None:
    repository = RepositorioFormulariosFalso()
    service = FormulariosService(repository)

    result = service.obtener(USUARIO_ID, 45, "estado-animo")

    assert result is None
    assert repository.argumentos_obtener == (
        USUARIO_ID,
        45,
        "estado-animo",
    )


def test_guardar_serializa_json_y_pasa_identidad_y_request_id() -> None:
    repository = RepositorioFormulariosFalso()
    service = FormulariosService(repository)
    datos = {"estado": "bien", "nota": 7}

    result = service.guardar(
        USUARIO_ID,
        45,
        "estado-animo",
        datos,
        CLIENT_REQUEST_ID,
    )

    assert result.datos == datos
    assert repository.argumentos_guardado == (
        USUARIO_ID,
        45,
        "estado-animo",
        '{"estado":"bien","nota":7}',
        CLIENT_REQUEST_ID,
    )


@pytest.mark.parametrize(
    ("articulo_id", "form_id"),
    [
        (0, "estado-animo"),
        (1, ""),
        (1, " estado-animo"),
        (1, "f" * 101),
    ],
)
def test_rechaza_referencias_invalidas(
    articulo_id: int,
    form_id: str,
) -> None:
    service = FormulariosService(RepositorioFormulariosFalso())

    with pytest.raises(ErrorValidacionFormulario):
        service.obtener(USUARIO_ID, articulo_id, form_id)


def test_guardar_rechaza_valores_no_json() -> None:
    service = FormulariosService(RepositorioFormulariosFalso())

    with pytest.raises(ErrorValidacionFormulario):
        service.guardar(
            USUARIO_ID,
            45,
            "estado-animo",
            {"valor": float("nan")},
            CLIENT_REQUEST_ID,
        )


def test_guardar_acepta_hasta_64_kib_en_utf8() -> None:
    repository = RepositorioFormulariosFalso()
    service = FormulariosService(repository)
    datos = {"x": "a" * (MAX_DATOS_BYTES - 8)}

    service.guardar(
        USUARIO_ID,
        45,
        "estado-animo",
        datos,
        CLIENT_REQUEST_ID,
    )

    assert repository.argumentos_guardado is not None
    datos_json = repository.argumentos_guardado[3]
    assert isinstance(datos_json, str)
    assert len(datos_json.encode("utf-8")) == MAX_DATOS_BYTES


def test_guardar_rechaza_datos_mayores_a_64_kib_antes_del_repositorio() -> None:
    repository = RepositorioFormulariosFalso()
    service = FormulariosService(repository)
    datos = {"x": "a" * (MAX_DATOS_BYTES - 7)}

    with pytest.raises(ErrorValidacionFormulario):
        service.guardar(
            USUARIO_ID,
            45,
            "estado-animo",
            datos,
            CLIENT_REQUEST_ID,
        )

    assert repository.argumentos_guardado is None
