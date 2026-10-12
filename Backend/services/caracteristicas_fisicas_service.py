import math
from typing import Any

from repositories.caracteristicas_fisicas_repository import (
    CaracteristicasFisicasRepository,
    ContenidoCaracteristicasRepository,
)


class ErrorValidacionCaracteristicas(Exception):
    def __init__(self, mensaje: str) -> None:
        super().__init__(mensaje)
        self.mensaje = mensaje


class CaracteristicasFisicasService:
    def __init__(
        self,
        contenido: ContenidoCaracteristicasRepository,
        caracteristicas: CaracteristicasFisicasRepository,
    ) -> None:
        self.contenido = contenido
        self.caracteristicas = caracteristicas

    def obtener_configuracion(self, seudonimo: str) -> dict[str, Any]:
        return self.contenido.get_configuracion(seudonimo)

    def obtener(self, usuario_id: str) -> dict[str, Any] | None:
        return self.caracteristicas.obtener(usuario_id)

    def guardar(self, usuario_id: str, valores: dict[str, Any]) -> str:
        campos = self.contenido.get_campos()
        valores_validos: dict[str, Any] = {}

        for campo in campos:
            clave = campo["clave"]
            valor = valores.get(clave)
            if valor is None or valor == "":
                if campo["requerido"]:
                    raise ErrorValidacionCaracteristicas(
                        self.contenido.get_texto("error_requerido")
                    )
                valores_validos[clave] = None
                continue

            if campo["tipo"] == "dropdown":
                if not isinstance(valor, str) or valor not in self.contenido.get_opciones(clave):
                    raise ErrorValidacionCaracteristicas(
                        self.contenido.get_texto("error_opcion")
                    )
                valores_validos[clave] = valor
                continue

            if campo["tipo"] != "number" or isinstance(valor, bool):
                raise ErrorValidacionCaracteristicas(
                    self.contenido.get_texto("error_rango")
                )
            try:
                valor_numerico = float(valor)
            except (TypeError, ValueError) as error:
                raise ErrorValidacionCaracteristicas(
                    self.contenido.get_texto("error_rango")
                ) from error
            minimo = campo["minimo"]
            maximo = campo["maximo"]
            if (
                not math.isfinite(valor_numerico)
                or (minimo is not None and valor_numerico < minimo)
                or (maximo is not None and valor_numerico > maximo)
            ):
                raise ErrorValidacionCaracteristicas(
                    self.contenido.get_texto("error_rango")
                )
            valores_validos[clave] = valor_numerico

        self.caracteristicas.guardar(usuario_id, valores_validos)
        return self.contenido.get_texto("guardado")

    def mensaje(self, clave: str) -> str:
        return self.contenido.get_texto(clave)
