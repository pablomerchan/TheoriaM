import configparser
import os
from datetime import date
from pathlib import Path
from typing import Any
from uuid import UUID

import pyodbc

from services.database_secret import descifrar_contrasena


CONFIG_PATH = Path(__file__).resolve().parents[1] / "database.ini"


class UsuarioDuplicadoError(Exception):
    pass


def _leer_configuracion() -> configparser.SectionProxy:
    configuracion = configparser.ConfigParser()
    if not configuracion.read(CONFIG_PATH, encoding="utf-8"):
        raise FileNotFoundError(f"No se encontró la configuración SQL Server: {CONFIG_PATH}")
    if "sql_server" not in configuracion:
        raise ValueError(f"Falta la sección [sql_server] en {CONFIG_PATH}")
    return configuracion["sql_server"]


def _odbc_value(value: str) -> str:
    return "{" + value.replace("}", "}}") + "}"


def abrir_conexion(database_key: str) -> pyodbc.Connection:
    configuracion = _leer_configuracion()
    password_encrypted = configuracion.get("password_encrypted", "").strip()
    if password_encrypted:
        password = descifrar_contrasena(password_encrypted)
    else:
        password_variable = configuracion.get("password_environment_variable", "").strip()
        if not password_variable:
            raise ValueError(
                "Configure password_encrypted o password_environment_variable "
                "en Backend/database.ini."
            )
        password = os.environ.get(password_variable)
    if not password:
        if password_encrypted:
            raise ValueError("La contraseña cifrada en Backend/database.ini está vacía.")
        raise RuntimeError(
            f"Defina la variable de entorno {password_variable} para conectar a SQL Server."
        )
    database = configuracion.get(database_key, "").strip()
    if not database:
        raise ValueError(f"Falta {database_key} en Backend/database.ini.")

    pyodbc.pooling = configuracion.getboolean("pooling", fallback=False)
    connection_string = ";".join(
        (
            f"DRIVER={_odbc_value(configuracion.get('driver', '').strip())}",
            f"SERVER={_odbc_value(configuracion.get('server', '').strip())}",
            f"DATABASE={_odbc_value(database)}",
            f"UID={_odbc_value(configuracion.get('username', '').strip())}",
            f"PWD={_odbc_value(password)}",
            f"Encrypt={configuracion.get('encrypt', 'no').strip()}",
            "TrustServerCertificate="
            f"{configuracion.get('trust_server_certificate', 'no').strip()}",
            "MARS_Connection="
            f"{configuracion.get('multiple_active_result_sets', 'no').strip()}",
            f"APP={_odbc_value(configuracion.get('application_name', 'TheoriaM').strip())}",
        )
    )
    connection = pyodbc.connect(
        connection_string,
        timeout=configuracion.getint("connection_timeout_seconds", fallback=15),
    )
    connection.timeout = configuracion.getint("command_timeout_seconds", fallback=0)
    return connection


def crear_usuario(
    usuario_id: UUID,
    nombre: str,
    apellido: str,
    seudonimo: str,
    fecha_nacimiento: date,
    email: str,
    password_hash: bytes,
    salt: bytes,
) -> None:
    connection = abrir_conexion("users_database")
    try:
        cursor = connection.cursor()
        try:
            cursor.execute(
                """
                SELECT TOP (1) 1
                FROM tm_userdata.tbl_usuarios
                WHERE LOWER(email) = LOWER(?) OR LOWER(seudonimo) = LOWER(?)
                """,
                email,
                seudonimo,
            )
            if cursor.fetchone() is not None:
                raise UsuarioDuplicadoError

            cursor.execute(
                """
                INSERT INTO tm_userdata.tbl_usuarios (
                    IdUsr, nombre, apellido, seudonimo, fecha_nacimiento, email,
                    password_hash, salt, estado, creado_en
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE())
                """,
                str(usuario_id),
                nombre,
                apellido,
                seudonimo,
                fecha_nacimiento,
                email,
                password_hash,
                salt,
                _leer_configuracion().get("account_status", "activo").strip(),
            )
            connection.commit()
        finally:
            cursor.close()
    finally:
        connection.close()


def obtener_usuario_activo(identificador: str) -> dict[str, Any] | None:
    configuracion = _leer_configuracion()
    connection = abrir_conexion("users_database")
    try:
        cursor = connection.cursor()
        try:
            cursor.execute(
                """
                SELECT IdUsr, seudonimo, password_hash, salt
                FROM tm_userdata.tbl_usuarios
                WHERE (LOWER(email) = LOWER(?) OR LOWER(seudonimo) = LOWER(?))
                  AND LOWER(estado) = LOWER(?)
                """,
                identificador,
                identificador,
                configuracion.get("account_status", "activo").strip(),
            )
            usuario = cursor.fetchone()
            if usuario is None:
                return None
            return {
                "id": usuario[0],
                "seudonimo": usuario[1],
                "password_hash": bytes(usuario[2]),
                "salt": bytes(usuario[3]),
            }
        finally:
            cursor.close()
    finally:
        connection.close()


def registrar_intento_login(
    usuario: str,
    exitoso: bool,
    direccion_ip: str | None,
    mensaje: str,
) -> None:
    connection = abrir_conexion("session_logs_database")
    try:
        cursor = connection.cursor()
        try:
            cursor.execute(
                """
                INSERT INTO tm_userdata.SesionLog
                    (Usuario, Exitoso, DireccionIP, Mensaje)
                VALUES (?, ?, ?, ?)
                """,
                usuario[:100],
                exitoso,
                direccion_ip[:45] if direccion_ip else None,
                mensaje[:255],
            )
            connection.commit()
        finally:
            cursor.close()
    finally:
        connection.close()
