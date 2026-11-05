#!/usr/bin/env python3
"""Build a source-linked CSV for the Hebrew localization review.

Uses local, untracked GTA2 data only to verify GXT source strings and collect
candidate SCR references. It never copies game data into the output.
"""
import csv
import json
import pathlib
import struct

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = ROOT / 'game/data'


def read_gxt(path):
    blob = path.read_bytes()
    tkey = tdat = None
    at = 6
    while at + 8 <= len(blob):
        tag = blob[at:at + 4]
        size = struct.unpack_from('<I', blob, at + 4)[0]
        if tag == b'TKEY':
            tkey = (at + 8, size)
        elif tag == b'TDAT':
            tdat = (at + 8, size)
        at += 8 + size
    if not tkey or not tdat or tkey[1] % 12:
        raise ValueError('Malformed game/data/e.gxt')
    entries = {}
    for at in range(tkey[0], tkey[0] + tkey[1], 12):
        offset = struct.unpack_from('<I', blob, at)[0]
        end = tdat[0] + offset
        while end + 1 < tdat[0] + tdat[1] and (blob[end] or blob[end + 1]):
            end += 2
        key = blob[at + 4:at + 11].split(b'\0', 1)[0].decode('ascii')
        entries[key] = blob[tdat[0] + offset:end].decode('utf-16le')
    return entries


def script_refs(gxt):
    numeric = {int(key): key for key in gxt if key.isdigit()}
    result = {}
    for area, stem in [('Downtown', 'wil'), ('Residential', 'ste'), ('Industrial District', 'bil')]:
        root_script = DATA / f'{stem}.scr'
        files = [root_script, *sorted((DATA / stem).rglob('*.scr'))]
        for path in files:
            blob = path.read_bytes()
            is_root = path == root_script
            if is_root:
                table_at, count, data_at, data_size, base = 0, 6000, 12000, 65536, 0
            else:
                table_at, count, data_at = 8, 1536, 3080
                data_size = min(struct.unpack_from('<I', blob, 4)[0], len(blob) - data_at)
                base = struct.unpack_from('<H', blob, table_at)[0]
            for index in range(count):
                offset = struct.unpack_from('<H', blob, table_at + index * 2)[0]
                if offset == 0xffff or offset < base or offset + 10 > base + data_size:
                    continue
                command = data_at + offset - base
                opcode = struct.unpack_from('<H', blob, command + 2)[0]
                numeric_key = struct.unpack_from('<H', blob, command + 8)[0]
                key = numeric.get(numeric_key)
                if key is None:
                    continue
                rel = path.relative_to(DATA).as_posix()
                entry = (area, rel, opcode)
                if entry not in result.setdefault(key, []):
                    result[key].append(entry)
    return result


def main():
    gxt = read_gxt(DATA / 'e.gxt')
    refs = script_refs(gxt)
    inventory_path = ROOT / 'docs/translation-inventory.csv'
    with inventory_path.open(encoding='utf-8-sig', newline='') as f:
        inventory = list(csv.DictReader(f))
    by_key = {}
    for row in inventory:
        if row['מזהה']:
            by_key.setdefault(row['מזהה'], row)

    missions = json.loads((ROOT / 'web/mission-translations.he.json').read_text(encoding='utf-8'))['records']
    titles = json.loads((ROOT / 'web/mission-titles.he.json').read_text(encoding='utf-8'))['titles']
    gxt_rows = json.loads((ROOT / 'web/gxt-gameplay.he.json').read_text(encoding='utf-8'))['records']
    additions = json.loads((ROOT / 'scripts/gxt-extra-translations.he.json').read_text(encoding='utf-8'))
    output = []

    for row in missions:
        output.append({
            'קטגוריה': 'הודעת משימה/דיאלוג', 'אזור': row.get('area', ''),
            'משימה': row.get('mission', ''), 'דובר': row.get('speaker', ''),
            'מזהה GXT': str(row.get('gxtKey', '')), 'מקור באנגלית': row.get('source', ''),
            'תרגום עברי סופי': row.get('text', ''),
            'הקשר/מקור': '; '.join(row.get('scripts', [])) or row.get('mission', ''),
            'מצב ביקורת': 'נכלל במילון הקודם; flags של catalog אינם מעידים כשלעצמם על הגהה מחודשת בסבב זה',
        })

    for key, row in titles.items():
        output.append({
            'קטגוריה': 'כותרת/סטטוס', 'אזור': '', 'משימה': row.get('mission', ''),
            'דובר': '', 'מזהה GXT': str(key), 'מקור באנגלית': row.get('source', ''),
            'תרגום עברי סופי': row.get('text', ''),
            'הקשר/מקור': row.get('context', 'כותרת משימה גרפית או הודעת סטטוס'),
            'מצב ביקורת': 'מפתח/מקור נבדקו אוטומטית מול GXT; לא אומת חזותית לכל הכותרות',
        })

    for row in gxt_rows:
        key = str(row['key'])
        references = refs.get(key, [])
        contexts = sorted({f'{area}: {path} (opcode {opcode})' for area, path, opcode in references})
        inv = by_key.get(key, {})
        if key in additions:
            review = 'נוסף בסבב זה; מקור GXT תואם; נדרשת בדיקה חזותית/הקשרית לכל מופע'
        else:
            review = 'תרגום קודם; התאמת מקור אוטומטית; לא נבדק חזותית לכל המופעים'
        if not contexts:
            contexts = [inv.get('הקשר/הערות', 'לא נמצאה הפניית SCR סטטית; אין להסיק מכך שהטקסט אינו פעיל')]
        output.append({
            'קטגוריה': 'HUD/תפריט/דיאלוג GXT',
            'אזור': ', '.join(sorted({area for area, _, _ in references})),
            'משימה': '', 'דובר': '', 'מזהה GXT': key,
            'מקור באנגלית': row.get('source', ''), 'תרגום עברי סופי': row.get('text', ''),
            'הקשר/מקור': ' | '.join(contexts), 'מצב ביקורת': review,
        })

    columns = ['קטגוריה', 'אזור', 'משימה', 'דובר', 'מזהה GXT', 'מקור באנגלית', 'תרגום עברי סופי', 'הקשר/מקור', 'מצב ביקורת']
    destination = ROOT / 'docs/translation-review.csv'
    with destination.open('w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=columns, lineterminator='\r\n')
        writer.writeheader()
        writer.writerows(output)
    print(f'wrote {len(output)} source-linked entries to {destination.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
