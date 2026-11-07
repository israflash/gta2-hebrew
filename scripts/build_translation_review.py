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
    # Only these commands pass a GXT key in the parameter at +8. Other
    # commands store integers/flags there, so treating every parameter as a
    # text reference creates false positives (e.g. a GOTO target that happens
    # to equal a GXT key).
    text_opcodes = {117, 118, 279, 321}  # DISPLAY_MESSAGE/BRIEF/NOW/SOON
    phone_template_opcode = 263
    basic_kf_opcode = 422  # START_BASIC_KF stores the challenge brief at +10
    phone_brief_offsets = (-7, -6, -5, -4, -2, -1, 0, 1)
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
                if opcode in text_opcodes:
                    keys = [numeric_key]
                elif opcode == phone_template_opcode:
                    keys = [numeric_key + delta for delta in phone_brief_offsets]
                elif opcode == basic_kf_opcode:
                    keys = [struct.unpack_from('<H', blob, command + 10)[0]]
                else:
                    continue
                rel = path.relative_to(DATA).as_posix()
                for candidate in keys:
                    key = numeric.get(candidate)
                    if key is None:
                        continue
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
    evidence_path = ROOT / 'docs/translation-review-evidence.json'
    evidence = json.loads(evidence_path.read_text(encoding='utf-8')) if evidence_path.exists() else {}
    reviewed_missions = evidence.get('missions', {})
    reviewed_sequences = evidence.get('missionSequences', {})
    reviewed_mission_keys = evidence.get('missionKeys', {})
    reviewed_titles = evidence.get('titles', {})
    reviewed_gxt = evidence.get('gxt', {})
    named_title_keys = {'9001': 'mfail', '9002': 'kfstart', '9003': 'kfpass', '9004': 'kffail'}
    output = []

    def audit_columns(auto_verified, review):
        review = review or {}
        source_read = bool(review.get('sourceRead'))
        context_checked = bool(review.get('contextChecked'))
        observed = bool(review.get('observedInGame'))
        level = ('נצפה במשחק' if observed else 'הגהה הקשרית' if context_checked
                 else 'נקרא מול המקור' if source_read else 'לא עבר ביקורת לשונית ידנית')
        return {
            'מקור ומזהה — אימות אוטומטי': 'אומת' if auto_verified else 'לא אומת',
            'נקרא מול המקור': 'כן' if source_read else 'לא',
            'הקשר רצף/משימה מלאה': 'כן' if context_checked else 'לא',
            'נצפה במשחק אמיתי': 'כן' if observed else 'לא',
            'רמת ביקורת': level,
            'ראיית ביקורת/הערה': review.get('evidence', ''),
            'בדיקה נוספת': review.get('followUp', ''),
        }

    for row in missions:
        entry = {
            'קטגוריה': 'הודעת משימה/דיאלוג', 'אזור': row.get('area', ''),
            'משימה': row.get('mission', ''), 'דובר': row.get('speaker', ''),
            'מזהה GXT': str(row.get('gxtKey', '')), 'מקור באנגלית': row.get('source', ''),
            'תרגום עברי סופי': row.get('text', ''),
            'הקשר/מקור': '; '.join(row.get('scripts', [])) or row.get('mission', ''),
        }
        manual = {}
        for candidate in (reviewed_sequences.get(f"{row.get('area', '')}|{row.get('mission', '')}"),
                          reviewed_mission_keys.get(f"{row.get('area', '')}|{row.get('gxtKey', '')}"),
                          reviewed_missions.get(row.get('id', ''))):
            if candidate:
                manual.update(candidate)
        entry.update(audit_columns(row.get('matchStatus') == 'verified-gxt', manual))
        output.append(entry)

    for key, row in titles.items():
        entry = {
            'קטגוריה': 'כותרת/סטטוס', 'אזור': '', 'משימה': row.get('mission', ''),
            'דובר': '', 'מזהה GXT': str(key), 'מקור באנגלית': row.get('source', ''),
            'תרגום עברי סופי': row.get('text', ''),
            'הקשר/מקור': row.get('context', 'כותרת משימה גרפית או הודעת סטטוס'),
        }
        source_key = named_title_keys.get(str(key), str(key))
        entry.update(audit_columns(source_key in gxt and gxt[source_key] == row.get('source', ''), reviewed_titles.get(str(key))))
        output.append(entry)

    for row in gxt_rows:
        key = str(row['key'])
        references = refs.get(key, [])
        contexts = sorted({f'{area}: {path} (opcode {opcode})' for area, path, opcode in references})
        inv = by_key.get(key, {})
        if not contexts:
            contexts = [inv.get('הקשר/הערות', 'לא נמצאה הפניית SCR סטטית; אין להסיק מכך שהטקסט אינו פעיל')]
        entry = {
            'קטגוריה': 'HUD/תפריט/דיאלוג GXT',
            'אזור': ', '.join(sorted({area for area, _, _ in references})),
            'משימה': '', 'דובר': '', 'מזהה GXT': key,
            'מקור באנגלית': row.get('source', ''), 'תרגום עברי סופי': row.get('text', ''),
            'הקשר/מקור': ' | '.join(contexts),
        }
        entry.update(audit_columns(gxt.get(key) == row.get('source', ''), reviewed_gxt.get(key)))
        output.append(entry)

    columns = ['קטגוריה', 'אזור', 'משימה', 'דובר', 'מזהה GXT', 'מקור באנגלית', 'תרגום עברי סופי', 'הקשר/מקור',
               'מקור ומזהה — אימות אוטומטי', 'נקרא מול המקור', 'הקשר רצף/משימה מלאה', 'נצפה במשחק אמיתי',
               'רמת ביקורת', 'ראיית ביקורת/הערה', 'בדיקה נוספת']
    destination = ROOT / 'docs/translation-review.csv'
    with destination.open('w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=columns, lineterminator='\r\n')
        writer.writeheader()
        writer.writerows(output)
    verified = sum(r['מקור ומזהה — אימות אוטומטי'] == 'אומת' for r in output)
    read = sum(r['נקרא מול המקור'] == 'כן' for r in output)
    contextual = sum(r['הקשר רצף/משימה מלאה'] == 'כן' for r in output)
    observed = sum(r['נצפה במשחק אמיתי'] == 'כן' for r in output)
    print(f'wrote {len(output)} entries; auto-verified={verified}; human-read={read}; context-reviewed={contextual}; game-observed={observed}')


if __name__ == '__main__':
    main()
