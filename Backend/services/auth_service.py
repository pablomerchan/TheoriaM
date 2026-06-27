import sqlite3
from fastapi import Request, HTTPException

ASESORIA_DB = "asesoria.db"

class AuthService:
    @staticmethod
    def get_current_user_id(request: Request) -> str:
        """
        Resuelve el 'id' (UUID o ID numérico como string) del usuario a partir del contexto de la petición.
        Fácilmente actualizable en el futuro para validar JWTs o sesiones reales.
        """
        # 1. INTENTO FUTURO / TRANSICIÓN: Buscar token en la cabecera Authorization
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            # TODO: Cuando integres JWT, decodifica aquí:
            # payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            # return payload.get("sub")
            pass

        # 2. INTENTO PARA MOCK / DESARROLLO ACTUAL:
        # Permite enviar una cabecera para simular usuarios específicos en pruebas
        mock_user = request.headers.get("X-Mock-User-Id")
        if mock_user:
            return mock_user

        # 3. FALLBACK DE DESARROLLO (Modo Invitado / Primer Usuario):
        # Si no hay nada, devolvemos el ID del primer registro en tbl_persona
        # para que la app no falle y funcione sin configuración inicial.
        return AuthService._get_fallback_user_id()

    @staticmethod
    def _get_fallback_user_id() -> str:
        try:
            conn = sqlite3.connect(ASESORIA_DB)
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM tbl_persona ORDER BY id LIMIT 1")
            row = cursor.fetchone()
            conn.close()
            if row:
                return row[0]
        except Exception as e:
            print(f"Error resolviendo fallback de tbl_persona: {e}")
        # Si la tabla está vacía o hay error, retornamos '1' como fallback estándar
        return "1"

    @staticmethod
    def get_current_profile(request: Request) -> dict:
        """Obtiene los datos completos de tbl_persona del usuario autenticado."""
        user_id = AuthService.get_current_user_id(request)
        
        conn = sqlite3.connect(ASESORIA_DB)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM tbl_persona WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            raise HTTPException(
                status_code=404, 
                detail=f"Perfil para el usuario '{user_id}' no encontrado en tbl_persona"
            )
        
        return dict(row)
