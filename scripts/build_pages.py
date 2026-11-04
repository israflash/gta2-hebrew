#!/usr/bin/env python3
"""Builds the static site for GitHub Pages (M1sterMo/gta2) in build/pages.

The site is the release build of the browser port with no game files: in
static mode (config.json {"static": true}) the landing page's Play button
downloads the 2004 freeware installer from the Internet Archive into the
player's browser, unpacks it there and keeps it. Co-op uses the peer-to-peer
transport (WebRTC through public trackers); saved crews need the game server.

Usage: scripts/build_pages.py   (run scripts/build_port.py --preset release first)
"""
import hashlib
import json
import re
import pathlib
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
RELEASE = ROOT / 'build/port/release'
SITE = ROOT / 'build/pages'
ARCHIVE = RELEASE / 'old'  # every published build, for saves made with it (web/saves.js)

# What goes out: the page, its scripts and the WebAssembly, licences, images and the vendored
# peer-to-peer library. Never game files, developer tools or build products.
FILES = (
    'index.html', 'gta2.js', 'gta2.wasm', 'unshield.js', 'unshield.wasm', 'unshield-LICENSE.txt',
    'mission-translations.he.json', 'mission-extras.he.json', 'mission-titles.he.json',
    'gxt-gameplay.he.json',
)
SUFFIXES = ('.js',)
DIRS = ('vendor', 'fonts')  # not img/: game screenshots stay off public pages (AGENTS.md); the hero closes up
# Anonymous play counts (web/stats.js): the GoatCounter endpoint, https://<code>.goatcounter.com/count.
# Empty: nothing is counted.
STATS = ''
GAME_FILE = ('.gmp', '.sty', '.sdt', '.raw', '.wav', '.gxt', '.scr', '.mmp', '.exe', '.dll', '.bik', '.tgx')

README = """# GTA 2 בעברית — בדפדפן

פרויקט מעריצים לא רשמי שמוסיף תרגום עברי להודעות ולכותרות המשימה של GTA 2. עברית היא שפת
ברירת המחדל, ואפשר לבחור English. האודיו והמשחק נשארים המקוריים.

למשחק: https://israflash.github.io/gta2-hebrew/

בכניסה הראשונה לחצו Play כדי להוריד לדפדפן את מהדורת התוכנה החופשית מ־2004 דרך
[Internet Archive](https://archive.org/details/gta2_rockstar-classics). הקבצים נשמרים בדפדפן
האישי. המאגר והאתר אינם כוללים קובצי משחק מסחריים או שמירות.

האתר משתמש ב־[GitHub Pages](https://pages.github.com/) ובתהליך הפרסום של הפרויקט המקורי
[M1sterMo/gta2-browser](https://github.com/M1sterMo/gta2-browser). מנוע המשחק הוא הפורט של
[gta2_re](https://github.com/CriminalRETeam/gta2_re). האודיו, השמירות, שלושת האזורים,
המפה ומשחק הרשת מבוססים על גרסת המקור.

GTA2 היא זכויות היוצרים של Rockstar Games / Take-Two Interactive. זהו פרויקט מעריצים לא
רשמי, לא מסחרי, ואינו קשור ל־Rockstar או ל־Take-Two. קוד הפרויקט ורכיבי צד שלישי כפופים
לרישיונות המצורפים; הגופן העברי כולל את קובץ הרישיון שלו.
"""


def version_urls():
    """Gives this build's scripts and WebAssembly their own addresses (?v=<content hash>).

    GitHub Pages lets browsers reuse a file for 10 minutes, so a returning player could get the
    new gta2.wasm with an old gta2.js and fail to start (LinkError). With every reference
    versioned, a page only ever loads files of one build. index.html stays unversioned (an old
    copy loads shell.js, whose references then all point at the new build).
    """
    names = sorted(
        p.relative_to(SITE).as_posix()
        for p in SITE.rglob('*')
        if p.is_file() and p.suffix in ('.js', '.wasm', '.html', '.json', '.ttf')
    )
    digest = hashlib.sha256()
    for name in names:
        digest.update(name.encode() + b'\0' + (SITE / name).read_bytes())
    v = digest.hexdigest()[:10]
    imports = re.compile(r"""((?:from|import)\s*\(?\s*)(['"])(\./[^'"?]+\.(?:js|mjs))\2""")
    worker = re.compile(r"""(new URL\(\s*)(['"])(\./[^'"?]+\.js)\2(\s*,\s*import\.meta\.url)""")
    wasm = re.compile(r"""(['"])((?:gta2|unshield)\.wasm)\1""")
    asset = re.compile(r"""(['"])(\./[^'"?]+\.(?:json|ttf))\1""")
    for p in SITE.glob('*.js'):
        text = p.read_text(encoding='utf-8')
        text = imports.sub(lambda m: f'{m[1]}{m[2]}{m[3]}?v={v}{m[2]}', text)
        text = worker.sub(lambda m: f'{m[1]}{m[2]}{m[3]}?v={v}{m[2]}{m[4]}', text)
        text = wasm.sub(lambda m: f'{m[1]}{m[2]}?v={v}{m[1]}', text)
        text = asset.sub(lambda m: f'{m[1]}{m[2]}?v={v}{m[1]}', text)
        p.write_text(text, encoding='utf-8')
    index = SITE / 'index.html'
    html = index.read_text(encoding='utf-8')
    assert html.count('src="shell.js"') == 1
    html = asset.sub(lambda m: f'{m[1]}{m[2]}?v={v}{m[1]}', html)
    index.write_text(html.replace('src="shell.js"', f'src="shell.js?v={v}"'), encoding='utf-8')
    return v


def build_id(wasm):
    """A build's identity, as web/savestate.js records it in every save (SHA-256 of gta2.wasm, 24 hex)."""
    return hashlib.sha256(wasm.read_bytes()).hexdigest()[:24]


def keep_live_build():
    """Before the site is rebuilt: the build it serves now goes into the release's old/ (once).

    Saves-screen saves only load in the build that made them, and the Saves screen opens
    old/<build>/ for them ("Open in its version"), so a published build is never dropped.
    """
    for build in sorted((SITE / 'old').iterdir()) if (SITE / 'old').is_dir() else ():
        # what the site already publishes stays, even if this computer's archive lost it
        if not (ARCHIVE / build.name / 'gta2.wasm').exists():
            shutil.copytree(build, ARCHIVE / build.name, ignore=shutil.ignore_patterns('config.json'), dirs_exist_ok=True)
    live = SITE / 'gta2.wasm'
    if not live.exists() or build_id(live) == build_id(RELEASE / 'gta2.wasm'):
        return
    dest = ARCHIVE / build_id(live)
    if (dest / 'gta2.wasm').exists():
        return
    dest.mkdir(parents=True)
    for f in SITE.iterdir():
        if f.is_file() and (f.name in FILES or f.suffix in SUFFIXES):
            shutil.copy2(f, dest / f.name)
    for d in DIRS:
        if (SITE / d).is_dir():
            shutil.copytree(SITE / d, dest / d)
    print(f'build_pages: kept the live build {dest.name} in {ARCHIVE}')


def copy_archive():
    """Every archived build goes out too, under old/<build>/, in static mode and without img/."""
    if not ARCHIVE.is_dir():
        return
    for build in sorted(ARCHIVE.iterdir()):
        if not (build / 'gta2.wasm').exists():
            continue
        dest = SITE / 'old' / build.name
        dest.mkdir(parents=True)
        for f in build.iterdir():
            if f.is_file() and (f.name in FILES or f.suffix in SUFFIXES):
                shutil.copy2(f, dest / f.name)
        for d in DIRS:
            if (build / d).is_dir():
                shutil.copytree(build / d, dest / d)
        (dest / 'config.json').write_text(json.dumps({'static': True}) + '\n')


def main():
    if not (RELEASE / 'gta2.wasm').exists():
        print('build_pages: build the release first (scripts/build_port.py --preset release)', file=sys.stderr)
        return 1
    keep_live_build()
    if SITE.exists():
        keep_git = SITE / '.git'
        for item in SITE.iterdir():
            if item != keep_git:
                shutil.rmtree(item) if item.is_dir() else item.unlink()
    SITE.mkdir(parents=True, exist_ok=True)
    for f in RELEASE.iterdir():
        if f.is_file() and (f.name in FILES or f.suffix in SUFFIXES):
            shutil.copy2(f, SITE / f.name)
    for d in DIRS:
        shutil.copytree(RELEASE / d, SITE / d)
    version_urls()
    copy_archive()
    config = {'static': True}
    if STATS:
        config['stats'] = STATS
    (SITE / 'config.json').write_text(json.dumps(config) + '\n')
    (SITE / '.nojekyll').write_text('')
    (SITE / 'README.md').write_text(README, encoding='utf-8')
    shipped = [p for p in SITE.rglob('*') if p.is_file() and '.git' not in p.parts]
    bad = [p for p in shipped if p.suffix.lower() in GAME_FILE]
    if bad:
        print('build_pages: game files would be published:', *bad, sep='\n  ', file=sys.stderr)
        return 1
    size = sum(p.stat().st_size for p in shipped)
    print(f'build_pages: {SITE} ({len(shipped)} files, {size / 1e6:.1f} MB)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
