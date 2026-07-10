import json
import os
import sqlite3
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Any, Dict, List, Optional, Union

BASE_DIR = os.path.dirname(__file__)
ASESORIA_DB = os.path.normpath(os.path.join(BASE_DIR, "..", "Backend", "asesoria.db"))

ARTICULO_MARKER = "<!-- ARTICULO_MARKER -->"


@dataclass
class Articulo:
    id: Optional[int] = None
    id_usuario: int = 1
    texto_html: str = ""
    media_url: Optional[str] = None
    media_url_webm: Optional[str] = None
    media_tipo: str = "imagen"
    orden: int = 0
    tipo_asesoria: Optional[str] = None
    titulo: Optional[str] = None
    contenido: Optional[str] = None
    grupo_id: Optional[str] = None
    tags: Optional[List[str]] = None
    publicado_en: Optional[str] = None
    visible: int = 1
    tipo_contenido: str = "articulo"  # 'articulo' | 'diapositiva'

    def to_row(self) -> Dict[str, Any]:
        row = asdict(self)
        row["tags"] = json.dumps(self.tags or [])
        return row


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(ASESORIA_DB)
    conn.row_factory = sqlite3.Row
    return conn


def _normalize_tags(tags: Optional[Union[str, List[str]]]) -> str:
    if tags is None:
        return "[]"
    if isinstance(tags, list):
        return json.dumps(tags)
    try:
        json.loads(tags)
        return tags
    except (TypeError, ValueError):
        return json.dumps([t.strip() for t in tags.split(",") if t.strip()])


def _build_menu_row(
    menu_servicio_id: int,
    tipo_asesoria: str,
    titulo: Optional[str],
    orden: int,
    visible: int,
    id_usuario: int,
    menu_principal: Optional[str] = None,
    imagen_alt: Optional[str] = None,
    observacion: Optional[str] = None,
) -> Dict[str, Any]:
    return {
        "menu_servicio_id": menu_servicio_id,
        "menu_principal": menu_principal or "Servicios / Artículo",
        "texto_html": f"{ARTICULO_MARKER}\r\n",
        "imagen_url": "",
        "imagen_alt": imagen_alt or "Artículo estático",
        "orden": orden,
        "id_usuario": id_usuario,
        "tipo_asesoria": tipo_asesoria,
        "observacion": observacion or "Artículo gestionado desde webmaster",
        "tipo_prenda": tipo_asesoria,
        "visible": visible,
        "titulo": titulo or tipo_asesoria,
        "componente": "articulo",  # campo explícito — ya no depende de marcadores
    }


def _fetch_menu_articulo_id(
    cursor: sqlite3.Cursor,
    tipo_asesoria: Optional[str] = None,
    menu_servicio_id: Optional[int] = None,
) -> Optional[int]:
    query = "SELECT id FROM tbl_menu_asesoria WHERE (componente = 'articulo' OR texto_html LIKE ?)"
    params: List[Any] = [f"%{ARTICULO_MARKER}%"]
    if menu_servicio_id is not None:
        query += " AND menu_servicio_id = ?"
        params.append(menu_servicio_id)
    if tipo_asesoria is not None:
        query += " AND tipo_asesoria = ?"
        params.append(tipo_asesoria)
    query += " LIMIT 1"
    cursor.execute(query, params)
    row = cursor.fetchone()
    return row["id"] if row else None


def create_articulo(
    articulo: Articulo,
    menu_servicio_id: int,
    menu_titulo: Optional[str] = None,
    menu_principal: Optional[str] = None,
    menu_observacion: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Crea un artículo en tbl_articulo y sincroniza el registro asociado en tbl_menu_asesoria.
    """
    if not articulo.tipo_asesoria:
        raise ValueError("El campo tipo_asesoria es obligatorio para publicar un artículo.")

    if articulo.visible not in (0, 1):
        articulo.visible = 1

    articulo.tags = articulo.tags or []
    articulo.publicado_en = articulo.publicado_en or datetime.utcnow().isoformat()

    conn = connect()
    cursor = conn.cursor()

    cursor.execute(
        "INSERT INTO tbl_articulo (texto_html, media_url, media_url_webm, media_tipo, orden, "
        "tipo_asesoria, titulo, contenido, grupo_id, tags, publicado_en, visible, tipo_contenido) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            articulo.texto_html,
            articulo.media_url,
            articulo.media_url_webm,
            articulo.media_tipo,
            articulo.orden,
            articulo.tipo_asesoria,
            articulo.titulo,
            articulo.contenido,
            articulo.grupo_id,
            _normalize_tags(articulo.tags),
            articulo.publicado_en,
            articulo.visible,
            getattr(articulo, 'tipo_contenido', 'articulo'),
        ),
    )
    articulo_id = cursor.lastrowid

    menu_data = _build_menu_row(
        menu_servicio_id=menu_servicio_id,
        tipo_asesoria=articulo.tipo_asesoria,
        titulo=menu_titulo or articulo.titulo,
        orden=articulo.orden,
        visible=articulo.visible,
        id_usuario=articulo.id_usuario,
        menu_principal=menu_principal,
        observacion=menu_observacion,
    )

    menu_id = _fetch_menu_articulo_id(cursor, articulo.tipo_asesoria, menu_servicio_id)
    if menu_id is None:
        cursor.execute(
            "INSERT INTO tbl_menu_asesoria (menu_servicio_id, menu_principal, texto_html, imagen_url, imagen_alt, orden, "
            "id_usuario, tipo_asesoria, observacion, tipo_prenda, visible, titulo, componente) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                menu_data["menu_servicio_id"],
                menu_data["menu_principal"],
                menu_data["texto_html"],
                menu_data["imagen_url"],
                menu_data["imagen_alt"],
                menu_data["orden"],
                menu_data["id_usuario"],
                menu_data["tipo_asesoria"],
                menu_data["observacion"],
                menu_data["tipo_prenda"],
                menu_data["visible"],
                menu_data["titulo"],
                menu_data["componente"],
            ),
        )
        menu_id = cursor.lastrowid
    else:
        cursor.execute(
            "UPDATE tbl_menu_asesoria SET menu_principal = ?, titulo = ?, orden = ?, visible = ?, "
            "tipo_asesoria = ?, id_usuario = ?, observacion = ?, tipo_prenda = ? "
            "WHERE id = ?",
            (
                menu_data["menu_principal"],
                menu_data["titulo"],
                menu_data["orden"],
                menu_data["visible"],
                menu_data["tipo_asesoria"],
                menu_data["id_usuario"],
                menu_data["observacion"],
                menu_data["tipo_prenda"],
                menu_id,
            ),
        )

    conn.commit()
    conn.close()

    return {"articulo_id": articulo_id, "menu_id": menu_id}


def get_articulos(
    tipo_asesoria: Optional[str] = None,
    visible_only: bool = True,
) -> List[Dict[str, Any]]:
    """Devuelve artículos desde tbl_articulo, filtrando por tipo de asesoría y visibilidad."""
    conn = connect()
    cursor = conn.cursor()

    query = "SELECT * FROM tbl_articulo WHERE 1=1"
    params: List[Any] = []

    if visible_only:
        query += " AND visible = 1"
    if tipo_asesoria is not None:
        query += " AND tipo_asesoria = ?"
        params.append(tipo_asesoria)

    query += " ORDER BY orden ASC, id ASC"
    cursor.execute(query, params)

    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


def get_articulo_by_id(articulo_id: int) -> Optional[Dict[str, Any]]:
    conn = connect()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tbl_articulo WHERE id = ?", (articulo_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def update_articulo(
    articulo_id: int,
    updates: Dict[str, Any],
    menu_updates: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Actualiza un artículo y sincroniza los campos relacionados de tbl_menu_asesoria."""
    allowed_fields = {
        "texto_html",
        "media_url",
        "media_url_webm",
        "media_tipo",
        "orden",
        "tipo_asesoria",
        "titulo",
        "contenido",
        "grupo_id",
        "tags",
        "publicado_en",
        "visible",
        "tipo_contenido",
    }

    if not updates:
        raise ValueError("No se han provisto campos para actualizar.")

    existing = get_articulo_by_id(articulo_id)
    if existing is None:
        raise ValueError(f"No existe artículo con id={articulo_id}.")

    article_values = {}
    for field, value in updates.items():
        if field not in allowed_fields:
            continue
        if field == "tags":
            article_values[field] = _normalize_tags(value)
        else:
            article_values[field] = value

    if not article_values:
        raise ValueError("No se han provisto campos válidos para actualizar.")

    set_clause = ", ".join(f"{k} = ?" for k in article_values.keys())
    params: List[Any] = list(article_values.values()) + [articulo_id]

    conn = connect()
    cursor = conn.cursor()
    cursor.execute(f"UPDATE tbl_articulo SET {set_clause} WHERE id = ?", params)

    updated = get_articulo_by_id(articulo_id)
    if updated is None:
        conn.rollback()
        conn.close()
        raise RuntimeError("Error al recuperar el artículo actualizado.")

    if updated.get("tipo_asesoria"):
        menu_id = _fetch_menu_articulo_id(
            tipo_asesoria=updated["tipo_asesoria"],
            menu_servicio_id=menu_updates.get("menu_servicio_id") if menu_updates else None,
        )
        if menu_id is None and menu_updates and menu_updates.get("menu_servicio_id"):
            menu_id = _fetch_menu_articulo_id(
                tipo_asesoria=existing.get("tipo_asesoria"),
                menu_servicio_id=menu_updates.get("menu_servicio_id"),
            )

        if menu_id is not None:
            menu_fields = {
                "titulo": menu_updates.get("titulo", updated.get("titulo")),
                "orden": menu_updates.get("orden", updated.get("orden")),
                "visible": menu_updates.get("visible", updated.get("visible")),
                "tipo_asesoria": updated.get("tipo_asesoria"),
                "observacion": menu_updates.get("observacion", "Artículo gestionado desde webmaster"),
                "tipo_prenda": updated.get("tipo_asesoria"),
                "menu_principal": menu_updates.get("menu_principal"),
            }
            set_clause = ", ".join(f"{k} = ?" for k in menu_fields.keys() if menu_fields[k] is not None)
            if set_clause:
                params = [menu_fields[k] for k in menu_fields.keys() if menu_fields[k] is not None] + [menu_id]
                cursor.execute(f"UPDATE tbl_menu_asesoria SET {set_clause} WHERE id = ?", params)

    conn.commit()
    conn.close()
    return updated


def delete_articulo(articulo_id: int, soft: bool = True) -> None:
    """Elimina un artículo. Si soft=True, solo marca el artículo y su menú como invisible."""
    existing = get_articulo_by_id(articulo_id)
    if existing is None:
        raise ValueError(f"No existe artículo con id={articulo_id}.")

    conn = connect()
    cursor = conn.cursor()

    if soft:
        cursor.execute("UPDATE tbl_articulo SET visible = 0 WHERE id = ?", (articulo_id,))
        cursor.execute(
            "UPDATE tbl_menu_asesoria SET visible = 0 WHERE tipo_asesoria = ? AND texto_html LIKE ?",
            (existing["tipo_asesoria"], f"%{ARTICULO_MARKER}%"),
        )
    else:
        cursor.execute("DELETE FROM tbl_articulo WHERE id = ?", (articulo_id,))
        cursor.execute(
            "DELETE FROM tbl_menu_asesoria WHERE tipo_asesoria = ? AND texto_html LIKE ?",
            (existing["tipo_asesoria"], f"%{ARTICULO_MARKER}%"),
        )

    conn.commit()
    conn.close()


def get_menu_articulo(
    menu_servicio_id: Optional[int] = None,
    tipo_asesoria: Optional[str] = None,
    id_usuario: Optional[int] = None,
    visible_only: bool = True,
) -> List[Dict[str, Any]]:
    """Devuelve los registros de tbl_menu_asesoria que representan artículos."""
    conn = connect()
    cursor = conn.cursor()

    query = "SELECT * FROM tbl_menu_asesoria WHERE texto_html LIKE ?"
    params: List[Any] = [f"%{ARTICULO_MARKER}%"]

    if visible_only:
        query += " AND visible = 1"
    if menu_servicio_id is not None:
        query += " AND menu_servicio_id = ?"
        params.append(menu_servicio_id)
    if tipo_asesoria is not None:
        query += " AND tipo_asesoria = ?"
        params.append(tipo_asesoria)
    if id_usuario is not None:
        query += " AND (id_usuario IS NULL OR id_usuario = ?)"
        params.append(id_usuario)

    query += " ORDER BY orden ASC"
    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows
