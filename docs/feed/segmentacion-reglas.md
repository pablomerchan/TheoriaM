# Segmentación de artículos del feed

Cada artículo puede tener un documento de reglas opcional en
`tm_feed.articulo_segmentacion.reglas_json`. Si no existe, el artículo se
considera elegible para todos los usuarios. Las reglas son datos; no contienen
código ejecutable ni expresiones SQL.

## Formato

```json
{
  "modo": "todos",
  "condiciones": [
    { "atributo": "perfil.edad", "operador": "gte", "valor": 18 },
    { "atributo": "contexto.idioma", "operador": "in", "valor": ["es", "en"] }
  ]
}
```

`modo` es `todos` (AND) o `alguno` (OR). Una regla configurada sin condiciones
no permite mostrar el artículo. Las reglas mal formadas generan un error de
datos del feed; no se ignoran ni se interpretan como elegibles.

Los operadores admitidos son `eq`, `ne`, `in`, `not_in`, `gt`, `gte`, `lt`,
`lte` y `exists`. Las comparaciones de rango requieren números; `in` y
`not_in` requieren una lista. Una condición `exists` recibe `true` para exigir
que el atributo esté informado y `false` para exigir que esté ausente.

## Atributos disponibles

- Perfil: `perfil.edad`, `perfil.sexo`, `perfil.color_piel`,
  `perfil.peso_kg`, `perfil.estatura_cm`, `perfil.color_cabello`,
  `perfil.clima_principal` y `perfil.clima_secundario`.
- Contexto del servidor: `contexto.fecha_utc`, `contexto.hora_utc`,
  `contexto.dia_semana` (lunes = 0) y `contexto.idioma` (primer idioma de
  `Accept-Language`, sin región).

Un atributo inexistente o sin valor no satisface una condición ordinaria.
Agregar atributos requiere exponer su valor desde el proveedor de perfil o
contexto del servidor; las reglas no pueden leer datos arbitrarios del cliente.

## Publicar y segmentar desde Webmaster

El panel nuevo se abre desde **Webmaster → Publicar en Feed** (`/webmaster/feed`).
No modifica los artículos existentes de `tbl_articulo`; administra los artículos
que consume el Feed (`tm_feed.articulo`).

En el panel se puede crear un artículo, escribir el contenido, elegir Borrador,
Publicado o Archivado y marcar si se mostrará a todos o solo a usuarios que
cumplan condiciones. Los atributos y los operadores se seleccionan en controles
del formulario; no hace falta escribir JSON. Para una condición `in`/`not_in`,
separar los valores con comas. `todos` exige que se cumplan todas las condiciones;
`alguno` acepta que se cumpla una.

Para habilitar el panel:

1. Ejecutar `Backend/scripts/004_feed_segmentacion.sql` después de
   `001_feed_formularios.sql` en SQL Server.
2. Desplegar y reiniciar el backend y el frontend actualizados.
3. Para el backend local, guardar los `IdUsr` (UUID) autorizados, separados por
   comas, en `THEORIAM_FEED_PUBLISHER_IDS` dentro del archivo `.env` de la raíz
   del repositorio. Ese archivo permanece en el equipo y está excluido de Git.
   Los UUID se consultan en `[TheoriaM].[tm_userdata].[tbl_usuarios]`. Para el
   servicio desplegado, configurar la variable en su entorno y reiniciarlo. Sin
   esta configuración o con una cuenta no incluida, la API responde `403`.
4. Iniciar sesión con una de esas cuentas, abrir Webmaster y seleccionar
   **Publicar en Feed**.

Al seleccionar **Publicado**, el artículo aparece en el Feed de usuarios que
cumplan las condiciones. Los borradores y archivados no se muestran. Sin filtros,
el artículo es elegible para todos. El backend evalúa las reglas y pagina solo
artículos elegibles; no confía en atributos enviados por el cliente.

Los artículos que tengan más de un bloque o bloques distintos de texto pueden
tener sus reglas y estado actualizados en este panel, pero el contenido se
conserva y no se edita desde aquí.
