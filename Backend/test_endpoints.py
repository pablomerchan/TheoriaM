import urllib.request
import json
import sys

# Asegurar utf-8 para la salida de consola en Windows
sys.stdout.reconfigure(encoding='utf-8')

def test_url(url, headers=None):
    print(f"\nTesting: {url}")
    req = urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(req) as response:
            status = response.getcode()
            body = response.read().decode('utf-8')
            print(f"Status: {status}")
            try:
                data = json.loads(body)
                print(f"JSON Response (truncated): {str(data)[:200]}...")
            except:
                print(f"Text Response: {body[:200]}...")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    # 1. mi-perfil
    test_url("http://localhost:3000/api/persona/mi-perfil")
    
    # 2. menus para Natalia
    test_url("http://localhost:3000/api/asesoria/menus?id_usuario=102030")
    
    # 3. carruseles para Natalia en menú 28
    test_url("http://localhost:3000/api/asesoria/carruseles?id_usuario=102030&menu_servicio_id=28")
    
    # 4. articulo para Natalia
    test_url("http://localhost:3000/api/asesoria/articulo?id_usuario=102030&tipo_asesoria=cual_es_mi_estilo")
    
    # 5. prendas para Natalia
    test_url("http://localhost:3000/api/asesorias?id_usuario=102030&tipo_asesoria=Blusas_tipo_cruzadas")
    
    # 6. asesoria rapida para Natalia
    test_url("http://localhost:3000/api/asesoria/rapida?id_usuario=102030&tipo_asesoria=Blusa+Wrap")
