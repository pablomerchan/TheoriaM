import sqlite3
import shutil
import os
import csv
from datetime import datetime

BASE_DIR = os.path.dirname(__file__)
DB_NAME = 'carousel.db'
DB_PATH = os.path.join(BASE_DIR, DB_NAME)

def backup_db(path):
    ts = datetime.now().strftime('%Y%m%d_%H%M%S')
    dest = path + f'.bak.{ts}'
    shutil.copy2(path, dest)
    return dest


def check_wal_journal(path):
    wal = path + '-wal'
    journal = path + '-journal'
    return os.path.exists(wal), os.path.exists(journal), wal, journal


def integrity_check(conn):
    cur = conn.execute('PRAGMA integrity_check;')
    res = cur.fetchone()
    return res[0] if res else None


def dump_table_to_csv(conn, table_name, out_path):
    cur = conn.execute(f'SELECT * FROM "{table_name}";')
    cols = [d[0] for d in cur.description]
    with open(out_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(cols)
        for row in cur:
            writer.writerow(row)


def dump_table_to_sql(conn, table_name, out_path):
    # Get CREATE statement
    cur = conn.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name=?;", (table_name,))
    row = cur.fetchone()
    with open(out_path, 'w', encoding='utf-8') as f:
        if row and row[0]:
            f.write(row[0] + ';\n')
        cur2 = conn.execute(f'SELECT * FROM "{table_name}";')
        cols = [d[0] for d in cur2.description]
        for r in cur2:
            vals = []
            for v in r:
                if v is None:
                    vals.append('NULL')
                elif isinstance(v, (int, float)):
                    vals.append(str(v))
                else:
                    s = str(v).replace("'", "''")
                    vals.append(f"'{s}'")
            f.write(f"INSERT INTO \"{table_name}\" ({', '.join(cols)}) VALUES ({', '.join(vals)});\n")


def main():
    print('DB path:', DB_PATH)
    if not os.path.exists(DB_PATH):
        print('ERROR: database not found')
        return

    bak = backup_db(DB_PATH)
    print('Backup created:', bak)

    wal_exists, journal_exists, wal_path, journal_path = check_wal_journal(DB_PATH)
    print('WAL present:', wal_exists, wal_path if wal_exists else '')
    print('Journal present:', journal_exists, journal_path if journal_exists else '')

    conn = sqlite3.connect(DB_PATH)
    try:
        ic = integrity_check(conn)
        print('PRAGMA integrity_check ->', ic)

        # Check table existence
        cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='tbl_carrusel';")
        if cur.fetchone():
            cur2 = conn.execute('SELECT COUNT(*) FROM tbl_carrusel;')
            count = cur2.fetchone()[0]
            print('tbl_carrusel exists. Row count:', count)

            csv_out = os.path.join(BASE_DIR, 'tbl_carrusel_dump.csv')
            sql_out = os.path.join(BASE_DIR, 'tbl_carrusel_dump.sql')
            dump_table_to_csv(conn, 'tbl_carrusel', csv_out)
            dump_table_to_sql(conn, 'tbl_carrusel', sql_out)
            print('Dumps written:', csv_out, sql_out)
        else:
            print('tbl_carrusel does NOT exist in database.')

    finally:
        conn.close()

if __name__ == '__main__':
    main()
