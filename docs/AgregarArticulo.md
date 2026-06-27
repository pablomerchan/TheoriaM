Para agregar un nuevo artículo en el scroll:
 
1. Insertar una fila en ***tbl_asesoria***
1.1 Coloca el siguiente texto en el campo **texto_html**:

<!-- ARTICULO_MARKER -->

1.2 El campo **tipo_asesoria** es el campo que se relaciona con la tabla ***tbl_articulo*** debe tener un texto que los vincule como por ejemplo:
'vestuario_ocasion'

2. Y en la tabla ***tbl_articulo***
2.1 Debe corresponder con el usuario para el cual se estan realizando las publicaciones.

2.2 El campo 'tipo_asesoria' debe contener el tipo de asesoria declarado en
***tbl_asesoria*** por ejemplo: 'vestuario_ocasion'


