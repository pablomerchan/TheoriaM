Los artículos nuevos se crean y publican desde **Webmaster → Publicar en Feed**
(`/webmaster/feed`). El administrador y las rutas CRUD del sistema anterior ya no
se usan para publicar artículos. Los datos heredados se conservan porque otras
funciones existentes todavía los consultan.

Para asignar un artículo a una persona y verificar sus características físicas:

1. En Webmaster, abre **Publicar en Feed**, crea o selecciona un artículo y activa
   **Mostrar solo a usuarios que cumplan condiciones**.
2. Selecciona **Deben cumplirse todas**.
3. Agrega la condición **ID de usuario (UUID)** y escribe el `IdUsr` de la persona,
   consultado en `[TheoriaM].[tm_userdata].[tbl_usuarios]`.
4. Agrega las condiciones físicas requeridas, por ejemplo `Estatura (cm) mayor o
   igual que 170` o `Peso (kg) menor que 80`.
5. Guarda como borrador para revisar o selecciona **Publicado** para que aparezca
   únicamente en el Feed de esa persona si cumple todas las condiciones.

El servidor compara el ID con la sesión autenticada y las características con el
perfil físico guardado; no acepta esos valores del navegador como identidad ni
como perfil. El sistema anterior y sus datos no se eliminan en esta etapa para
evitar afectar otras funciones que los utilizan.

