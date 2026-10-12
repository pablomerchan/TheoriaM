import html
import os
import sqlite3
from contextlib import closing
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit


BASE_DIR = Path(__file__).resolve().parents[1]
SCHEMA_PATH = BASE_DIR / "scripts" / "caracteristicas_fisicas.sqlite.sql"


class _SanitizadorAyuda(HTMLParser):
    ETIQUETAS = {"p", "ul", "ol", "li", "strong", "em", "b", "i", "br", "img", "a"}
    ATRIBUTOS = {"a": {"href", "title"}, "img": {"src", "alt", "title"}}
    SIN_CIERRE = {"br", "img"}
    BLOQUEADAS = {"script", "style", "iframe", "object", "svg", "math"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.salida: list[str] = []
        self.profundidad_bloqueada = 0
        self.etiquetas_bloqueadas: list[str] = []
        self.etiquetas_abiertas: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in self.BLOQUEADAS:
            self.profundidad_bloqueada += 1
            self.etiquetas_bloqueadas.append(tag)
            return
        if self.profundidad_bloqueada or tag not in self.ETIQUETAS:
            return

        atributos_permitidos = self.ATRIBUTOS.get(tag, set())
        atributos = []
        for nombre, valor in attrs:
            if nombre not in atributos_permitidos or valor is None:
                continue
            if nombre in {"src", "href"} and not self._url_permitida(nombre, valor):
                continue
            atributos.append(f' {nombre}="{html.escape(valor, quote=True)}"')

        self.salida.append(f"<{tag}{''.join(atributos)}>")
        if tag not in self.SIN_CIERRE:
            self.etiquetas_abiertas.append(tag)

    def handle_endtag(self, tag: str) -> None:
        if self.profundidad_bloqueada:
            if self.etiquetas_bloqueadas and self.etiquetas_bloqueadas[-1] == tag:
                self.etiquetas_bloqueadas.pop()
                self.profundidad_bloqueada -= 1
            return
        if tag in self.etiquetas_abiertas:
            while self.etiquetas_abiertas:
                abierta = self.etiquetas_abiertas.pop()
                self.salida.append(f"</{abierta}>")
                if abierta == tag:
                    break

    def handle_data(self, data: str) -> None:
        if not self.profundidad_bloqueada:
            self.salida.append(html.escape(data))

    @staticmethod
    def _url_permitida(nombre: str, valor: str) -> bool:
        partes = urlsplit(valor.strip())
        if partes.scheme:
            return partes.scheme.lower() in {"http", "https"} and bool(partes.netloc)
        return nombre == "href" and not valor.strip().startswith("//")


def sanitizar_ayuda(contenido: str) -> str:
    parser = _SanitizadorAyuda()
    parser.feed(contenido)
    parser.close()
    while parser.etiquetas_abiertas:
        parser.salida.append(f"</{parser.etiquetas_abiertas.pop()}>")
    return "".join(parser.salida)


class SqliteContenidoRepository:
    def __init__(self, database_path: str | Path | None = None) -> None:
        configured_path = database_path or os.environ.get(
            "THEORIAM_CARACTERISTICAS_FISICAS_DB"
        )
        self.database_path = Path(configured_path) if configured_path else (
            BASE_DIR / "BDs" / "caracteristicas_fisicas"
        )

    def inicializar(self) -> None:
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        with closing(sqlite3.connect(self.database_path)) as connection:
            connection.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))

    def get_configuracion(self, seudonimo: str) -> dict[str, Any]:
        with closing(self._connect()) as connection:
            textos = {
                row["clave"]: row["valor"]
                for row in connection.execute("SELECT clave, valor FROM textos")
            }
            saludo = textos["saludo"].replace("{seudonimo}", seudonimo)
            campos = connection.execute(
                """
                SELECT clave, orden, tipo, etiqueta, placeholder, ayuda_html,
                       requerido, minimo, maximo, paso
                FROM campos
                ORDER BY orden
                """
            ).fetchall()
            opciones = connection.execute(
                """
                SELECT campo_clave, valor, etiqueta
                FROM opciones
                ORDER BY campo_clave, orden
                """
            ).fetchall()
            menu = connection.execute(
                "SELECT etiqueta, ruta FROM menu ORDER BY orden"
            ).fetchall()

        opciones_por_campo: dict[str, list[dict[str, str]]] = {}
        for opcion in opciones:
            opciones_por_campo.setdefault(opcion["campo_clave"], []).append(
                {"valor": opcion["valor"], "etiqueta": opcion["etiqueta"]}
            )
        return {
            "textos": textos,
            "saludo": saludo,
            "campos": [
                {
                    "clave": campo["clave"],
                    "orden": campo["orden"],
                    "tipo": campo["tipo"],
                    "etiqueta": campo["etiqueta"],
                    "placeholder": campo["placeholder"],
                    "ayuda_html": sanitizar_ayuda(campo["ayuda_html"]),
                    "requerido": bool(campo["requerido"]),
                    "minimo": campo["minimo"],
                    "maximo": campo["maximo"],
                    "paso": campo["paso"],
                    "opciones": opciones_por_campo.get(campo["clave"], []),
                }
                for campo in campos
            ],
            "menu": [dict(item) for item in menu],
        }

    def get_texto(self, clave: str) -> str:
        with closing(self._connect()) as connection:
            row = connection.execute(
                "SELECT valor FROM textos WHERE clave = ?", (clave,)
            ).fetchone()
        if row is None:
            raise KeyError(f"No se encontró el texto editable '{clave}'.")
        return str(row["valor"])

    def get_campos(self) -> list[dict[str, Any]]:
        with closing(self._connect()) as connection:
            campos = connection.execute(
                """
                SELECT clave, tipo, requerido, minimo, maximo
                FROM campos
                ORDER BY orden
                """
            ).fetchall()
        return [dict(campo) for campo in campos]

    def get_opciones(self, campo_clave: str) -> list[str]:
        with closing(self._connect()) as connection:
            rows = connection.execute(
                "SELECT valor FROM opciones WHERE campo_clave = ?",
                (campo_clave,),
            ).fetchall()
        return [str(row["valor"]) for row in rows]

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        return connection
