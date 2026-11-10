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
    easy_phone_opcode = 329
    basic_kf_opcode = 422  # START_BASIC_KF stores the challenge brief at +10
    # PHONE_TEMPLATE and DO_EASY_PHONE use the same struct but different
    # reachable brief offsets. Keep the offsets tied to the engine opcode so
    # a neighboring GXT entry is not mistaken for an active phone response.
    phone_brief_offsets = {
        phone_template_opcode: (-7, -6, -5, -4, -2, -1, 0, 1),
        easy_phone_opcode: (-7, -6, -5, -4, -2, -1, 0, 1),
    }
    roots = {'wil': 'Downtown', 'ste': 'Residential', 'bil': 'Industrial District'}
    multiplayer_prefixes = ('downtown-', 'industrial-', 'res-', 'mp')
    files = sorted((p for p in DATA.rglob('*') if p.is_file() and p.suffix.lower() == '.scr'),
                   key=lambda p: p.as_posix().lower())
    for path in files:
        blob = path.read_bytes()
        is_root = path.parent == DATA and path.stem.lower() in roots
        if is_root:
            table_at, count, data_at, data_size, base = 0, 6000, 12000, 65536, 0
        else:
            if len(blob) < 3080:
                continue
            table_at, count, data_at = 8, 1536, 3080
            data_size = min(struct.unpack_from('<I', blob, 4)[0], len(blob) - data_at)
            base = struct.unpack_from('<H', blob, table_at)[0]

        parts = [part.lower() for part in path.relative_to(DATA).parts]
        if len(parts) == 1 and path.stem.lower() in roots:
            area = roots[path.stem.lower()]
        elif parts[0] in roots:
            area = roots[parts[0]]
        elif path.stem.lower().startswith(multiplayer_prefixes):
            area = 'Multiplayer'
        elif parts[0] == 'attract':
            area = 'Attract'
        elif path.stem.lower().startswith(('mike', 'lorne')):
            area = 'Bonus/Legacy'
        else:
            area = 'Other scripts'

        for index in range(count):
            offset = struct.unpack_from('<H', blob, table_at + index * 2)[0]
            if offset == 0xffff or offset < base or offset + 12 > base + data_size:
                continue
            command = data_at + offset - base
            opcode = struct.unpack_from('<H', blob, command + 2)[0]
            numeric_key = struct.unpack_from('<H', blob, command + 8)[0]
            if opcode in text_opcodes:
                keys = [numeric_key]
            elif opcode in phone_brief_offsets:
                keys = [numeric_key + delta for delta in phone_brief_offsets[opcode]]
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
    gameplay_catalog = json.loads((ROOT / 'web/gxt-gameplay.he.json').read_text(encoding='utf-8'))
    gxt_rows = gameplay_catalog['records']
    direct_rows = gameplay_catalog.get('directRecords', [])
    additions = json.loads((ROOT / 'scripts/gxt-extra-translations.he.json').read_text(encoding='utf-8'))
    evidence_path = ROOT / 'docs/translation-review-evidence.json'
    evidence = json.loads(evidence_path.read_text(encoding='utf-8')) if evidence_path.exists() else {}
    reviewed_missions = evidence.get('missions', {})
    reviewed_sequences = evidence.get('missionSequences', {})
    reviewed_mission_keys = evidence.get('missionKeys', {})
    reviewed_titles = evidence.get('titles', {})
    reviewed_gxt = evidence.get('gxt', {})
    reviewed_direct = evidence.get('directTexts', {})
    named_title_keys = {'9001': 'mfail', '9002': 'kfstart', '9003': 'kfpass', '9004': 'kffail'}
    output = []

    def audit_columns(auto_verified, review):
        review = review or {}
        source_read = bool(review.get('sourceRead'))
        context_checked = bool(review.get('contextChecked'))
        observed = bool(review.get('observedInGame'))
        evidence_text = str(review.get('evidence', ''))
        follow_up = str(review.get('followUp', ''))
        method = str(review.get('observedMethod', '')).strip()
        if observed and not method:
            observation_record = f'{evidence_text} {follow_up}'.lower()
            if any(marker in observation_record for marker in ('injection', 'injected', 'gta2_dev_show', 'הזרקה', 'הוזרק')):
                method = 'הזרקת QA; פירוט נוסף בראיית הביקורת'
            else:
                method = 'השיטה לא תועדה בנפרד; ראו ראיית ביקורת'
        level = ('תצפית חזותית' if observed else 'הגהה הקשרית' if context_checked
                 else 'נקרא מול המקור' if source_read else 'לא עבר ביקורת לשונית ידנית')
        return {
            'מקור ומזהה — אימות אוטומטי': 'אומת' if auto_verified else 'לא אומת',
            'נקרא מול המקור': 'כן' if source_read else 'לא',
            'הקשר נבדק': 'כן' if context_checked else 'לא',
            'נצפה בתצוגת המשחק/QA': 'כן' if observed else 'לא',
            'שיטת תצפית': method,
            'רמת ביקורת': level,
            'ראיית ביקורת/הערה': evidence_text,
            'בדיקה נוספת': follow_up,
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

    for row in direct_rows:
        source_path = ROOT / row['sourceFile']
        source_present = row['sourceLiteral'] in source_path.read_text(encoding='utf-8')
        entry = {
            'קטגוריה': 'HUD literal בקוד', 'אזור': 'כללי', 'משימה': '', 'דובר': '',
            'מזהה GXT': row['key'], 'מקור באנגלית': row['source'],
            'תרגום עברי סופי': row['text'],
            'הקשר/מקור': f"{row['context']} Source: {row['sourceFile']}",
        }
        entry.update(audit_columns(source_present, reviewed_direct.get(row['key'])))
        output.append(entry)

    columns = ['קטגוריה', 'אזור', 'משימה', 'דובר', 'מזהה GXT', 'מקור באנגלית', 'תרגום עברי סופי', 'הקשר/מקור',
               'מקור ומזהה — אימות אוטומטי', 'נקרא מול המקור', 'הקשר נבדק', 'נצפה בתצוגת המשחק/QA',
               'שיטת תצפית', 'רמת ביקורת', 'ראיית ביקורת/הערה', 'בדיקה נוספת']
    destination = ROOT / 'docs/translation-review.csv'
    with destination.open('w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=columns, lineterminator='\r\n')
        writer.writeheader()
        writer.writerows(output)
    verified = sum(r['מקור ומזהה — אימות אוטומטי'] == 'אומת' for r in output)
    read = sum(r['נקרא מול המקור'] == 'כן' for r in output)
    contextual = sum(r['הקשר נבדק'] == 'כן' for r in output)
    observed = sum(r['נצפה בתצוגת המשחק/QA'] == 'כן' for r in output)
    method_recorded = sum(bool(r['שיטת תצפית']) and 'לא תועדה' not in r['שיטת תצפית'] for r in output)
    print(f'wrote {len(output)} entries; auto-verified={verified}; human-read={read}; context-reviewed={contextual}; runtime-displayed={observed}; observation-method-recorded={method_recorded}')


if __name__ == '__main__':
    main()
