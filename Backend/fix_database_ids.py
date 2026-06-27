import sqlite3
import os

ASESORIA_DB = "asesoria.db"

def fix_database():
    if not os.path.exists(ASESORIA_DB):
        print(f"Error: {ASESORIA_DB} no encontrado en el directorio actual.")
        return
        
    conn = sqlite3.connect(ASESORIA_DB)
    cursor = conn.cursor()
    
    try:
        print("Iniciando actualización de IDs en la base de datos...")
        
        # 1. Actualizar tbl_menu_asesoria
        cursor.execute("""
            UPDATE tbl_menu_asesoria 
            SET id_usuario = '102030' 
            WHERE id_usuario = 1 OR id_usuario = 1020302
        """)
        print(f"  tbl_menu_asesoria: {cursor.rowcount} filas actualizadas a id_usuario='102030'.")
        
        # Corrección del tipo de asesoría y prenda para el carrusel (id=16)
        cursor.execute("""
            UPDATE tbl_menu_asesoria
            SET tipo_asesoria = 'Blusas_tipo_cruzadas',
                tipo_prenda = 'Blusas_tipo_cruzadas'
            WHERE id = 16
        """)
        print(f"  tbl_menu_asesoria (id=16): {cursor.rowcount} carrusel configurado con tipo='Blusas_tipo_cruzadas'.")
        
        # 2. Actualizar prendas_genericas
        cursor.execute("""
            UPDATE prendas_genericas
            SET id_usuario = '102030'
            WHERE id_usuario = 1
        """)
        print(f"  prendas_genericas: {cursor.rowcount} filas actualizadas a id_usuario='102030'.")
        
        # 3. Actualizar tbl_asesoria_rapida
        cursor.execute("""
            UPDATE tbl_asesoria_rapida
            SET id_usuario = '102030'
            WHERE id_usuario = 1
        """)
        print(f"  tbl_asesoria_rapida: {cursor.rowcount} filas actualizadas a id_usuario='102030'.")
        
        conn.commit()
        print("Transacción confirmada exitosamente.")
        
    except Exception as e:
        conn.rollback()
        print(f"Error al actualizar la base de datos: {e}")
        print("Se ha revertido la transacción.")
    finally:
        conn.close()

if __name__ == '__main__':
    fix_database()
