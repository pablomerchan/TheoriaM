import sqlite3, json, os
DB = os.path.join(os.path.dirname(__file__), 'carousel.db')
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
c = conn.cursor()
c.execute('SELECT * FROM tbl_carrusel')
rows = c.fetchall()
raw = [dict(r) for r in rows]
print('RAW_ROWS_JSON_START')
print(json.dumps(raw, indent=2, ensure_ascii=False))
print('RAW_ROWS_JSON_END')
# Simulate backend shaping
slides = []
for row in rows:
    slide = {
        'id': row['id'],
        'title': row['title'],
        'text': row['text'],
        'imageUrl': row['imageUrl'],
        'imageAltText': row['imageAltText']
    }
    if row['tag']:
        slide['tag'] = row['tag']
    if row['buttonLabel'] and row['buttonUrl']:
        slide['button'] = {'label': row['buttonLabel'], 'url': row['buttonUrl'], 'isExternal': bool(row['isExternal'])}
    try:
        slide['orden'] = row['orden']
    except Exception:
        pass
    try:
        slide['visible'] = bool(row['visible']) if row['visible'] is not None else None
    except Exception:
        pass
    slides.append(slide)
print('\nSHAPED_SLIDES_JSON_START')
print(json.dumps(slides, indent=2, ensure_ascii=False))
print('SHAPED_SLIDES_JSON_END')
# Simulate frontend filtering/sorting
filtered = [s for s in slides if s.get('visible') in (None, True, 1)]
filtered_sorted = sorted(filtered, key=lambda s: int(s.get('orden') or 0))
print('\nFRONTEND_RESULT_START')
print(json.dumps(filtered_sorted, indent=2, ensure_ascii=False))
print('FRONTEND_RESULT_END')
conn.close()
