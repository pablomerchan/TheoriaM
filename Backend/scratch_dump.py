import sqlite3
import sys

sys.stdout.reconfigure(encoding='utf-8')

def dump_articulos():
    conn = sqlite3.connect('asesoria.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    print("\n=== TABLE: tbl_articulo ===")
    c.execute("SELECT * FROM tbl_articulo")
    for r in c.fetchall():
        d = dict(r)
        print(d)
        
    conn.close()

if __name__ == '__main__':
    dump_articulos()
