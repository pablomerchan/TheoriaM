import base64
import binascii
import ctypes
import getpass
import os
import sys
from ctypes import wintypes


_PREFIX = "DPAPI:"
_CRYPTPROTECT_UI_FORBIDDEN = 0x1


class _DataBlob(ctypes.Structure):
    _fields_ = [
        ("cbData", wintypes.DWORD),
        ("pbData", ctypes.POINTER(ctypes.c_byte)),
    ]


def _dpapi_call(data: bytes, *, encrypt: bool) -> bytes:
    if os.name != "nt":
        raise OSError("El cifrado de la contraseña requiere Windows DPAPI.")

    crypt32 = ctypes.WinDLL("crypt32", use_last_error=True)
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    input_buffer = ctypes.create_string_buffer(data)
    input_blob = _DataBlob(
        len(data),
        ctypes.cast(input_buffer, ctypes.POINTER(ctypes.c_byte)),
    )
    output_blob = _DataBlob()

    if encrypt:
        function = crypt32.CryptProtectData
        function.argtypes = [
            ctypes.POINTER(_DataBlob),
            wintypes.LPCWSTR,
            ctypes.POINTER(_DataBlob),
            ctypes.c_void_p,
            ctypes.c_void_p,
            wintypes.DWORD,
            ctypes.POINTER(_DataBlob),
        ]
        arguments = (
            ctypes.byref(input_blob),
            "TheoriaM SQL Server password",
            None,
            None,
            None,
            _CRYPTPROTECT_UI_FORBIDDEN,
            ctypes.byref(output_blob),
        )
    else:
        function = crypt32.CryptUnprotectData
        function.argtypes = [
            ctypes.POINTER(_DataBlob),
            ctypes.c_void_p,
            ctypes.POINTER(_DataBlob),
            ctypes.c_void_p,
            ctypes.c_void_p,
            wintypes.DWORD,
            ctypes.POINTER(_DataBlob),
        ]
        arguments = (
            ctypes.byref(input_blob),
            None,
            None,
            None,
            None,
            _CRYPTPROTECT_UI_FORBIDDEN,
            ctypes.byref(output_blob),
        )

    function.restype = wintypes.BOOL
    try:
        if not function(*arguments):
            raise ctypes.WinError(ctypes.get_last_error())
        return ctypes.string_at(output_blob.pbData, output_blob.cbData)
    finally:
        if output_blob.pbData:
            kernel32.LocalFree.argtypes = [ctypes.c_void_p]
            kernel32.LocalFree.restype = ctypes.c_void_p
            kernel32.LocalFree(ctypes.cast(output_blob.pbData, ctypes.c_void_p))


def cifrar_contrasena(contrasena: str) -> str:
    if not contrasena:
        raise ValueError("La contraseña no puede estar vacía.")
    datos_cifrados = _dpapi_call(contrasena.encode("utf-8"), encrypt=True)
    return _PREFIX + base64.b64encode(datos_cifrados).decode("ascii")


def descifrar_contrasena(valor_cifrado: str) -> str:
    if not valor_cifrado.startswith(_PREFIX):
        raise ValueError("La contraseña cifrada debe tener el prefijo DPAPI:.")
    try:
        datos_cifrados = base64.b64decode(valor_cifrado[len(_PREFIX) :], validate=True)
    except binascii.Error as error:
        raise ValueError("La contraseña cifrada en database.ini no es válida.") from error
    datos = _dpapi_call(datos_cifrados, encrypt=False)
    return datos.decode("utf-8")


def main() -> None:
    contrasena = getpass.getpass("Contraseña de SQL Server: ")
    confirmacion = getpass.getpass("Confirme la contraseña: ")
    if contrasena != confirmacion:
        raise ValueError("Las contraseñas no coinciden.")
    print(cifrar_contrasena(contrasena))


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError) as error:
        print(f"Error: {error}", file=sys.stderr)
        raise SystemExit(1) from error
