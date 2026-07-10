import os
import sqlite3
from typing import Optional, List, Dict, Any

BASE_DIR = os.path.dirname(__file__)
ASESORIA_DB = os.path.normpath(os.path.join(BASE_DIR, "..", "asesoria.db"))

def parse_id_usuario(val):
    if val is None:
        return None
    try:
        return int(val)
    except ValueError:
        return str(val)

class ContenidosPersonalizadosService:
    @staticmethod
    def get_articulo(tipo_asesoria: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Consulta la tabla 'tbl_articulo' y devuelve el primer registro visible
        para el tipo de asesoría indicado, ordenado por 'orden' ASC.
        """
        conn = sqlite3.connect(ASESORIA_DB)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        query = """
            SELECT id, texto_html, media_url, media_url_webm, media_tipo, orden, tipo_asesoria
            FROM tbl_articulo
            WHERE visible = 1
        """
        params: List[Any] = []
        
        if tipo_asesoria is not None:
            query += " AND (tipo_asesoria IS NULL OR tipo_asesoria = ?)"
            params.append(tipo_asesoria)
            
        query += " ORDER BY orden ASC, id ASC LIMIT 1"
        cursor.execute(query, params)
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    @staticmethod
    def get_asesoria_rapida(id_usuario: str, tipo_asesoria: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Consulta la tabla 'tbl_asesoria_rapida' y devuelve las fotos visibles
        para el usuario y tipo de asesoría indicados, ordenadas por 'orden' ASC.
        """
        conn = sqlite3.connect(ASESORIA_DB)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        parsed_id = parse_id_usuario(id_usuario)
        
        query = """
            SELECT id, id_usuario, imagen_url, velocidad_reproduccion, orden, tipo_asesoria, texto_html
            FROM tbl_asesoria_rapida
            WHERE visible = 1
              AND (id_usuario IS NULL OR id_usuario = ?)
        """
        params = [parsed_id]
        
        if tipo_asesoria is not None:
            query += " AND (tipo_asesoria IS NULL OR tipo_asesoria = ?)"
            params.append(tipo_asesoria)
            
        query += " ORDER BY orden ASC"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    @staticmethod
    def get_carrusel_prendas(
        id_usuario: Optional[str] = None, 
        asesoria_id: Optional[int] = None, 
        tipo_asesoria: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Consulta la tabla 'tbl_carrusel_items' y devuelve los ítems visibles,
        aplicando filtros opcionales de usuario, asesoría/menú y tipo de prenda.
        """
        conn = sqlite3.connect(ASESORIA_DB)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        query = "SELECT * FROM tbl_carrusel_items WHERE (visible IS NULL OR visible = 1)"
        params = []
            
        if asesoria_id is not None:
            query += " AND (asesoria_id IS NULL OR asesoria_id = ?)"
            params.append(asesoria_id)
            
        if tipo_asesoria is not None:
            query += " AND (tipo_asesoria IS NULL OR tipo_asesoria = ?)"
            params.append(tipo_asesoria)
            
        query += " ORDER BY orden ASC"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]
