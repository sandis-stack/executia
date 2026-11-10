"""TASK-20 mechanical edits: new OG image URL + alt, EXECUTIA(TM) -> EXECUTIA(R).

Every replacement asserts its exact count so an unexpected match stops the run.
Intentional exceptions (left with TM):
  - "Execution Integrity Model\\u2122" in assets/platform-brand.js (a different, separate mark)
  - scripts/generate-eim-spec-pdf.py (source of the spec PDF, whose contents must not change)
Run from the repo root: python3 evidence/website-og-20261110/tools/apply_mechanical.py
"""
import glob
import re

TM = '\u2122'
R = '\u00ae'
OLD_IMG = 'https://executia.io/assets/brand/executia-og-1200x630.png'
NEW_IMG = 'https://executia.io/assets/brand/executia-og-1200x630-v2.png'
OLD_ALT = '<meta property="og:image:alt" content="EXECUTIA">'
NEW_ALT = ('<meta property="og:image:alt" content="EXECUTIA' + R +
           ' — Human defines the outcome. EXECUTIA governs the execution.">')

IMAGE_PAGES = [
    'analysis.html', 'contact.html', 'cookies.html', 'definition.html', 'docs.html', 'execution.html',
    'gdpr.html', 'global.html', 'index.html', 'index.legacy.html', 'institutional.html', 'pilot-mode.html',
    'privacy.html', 'proposal.html', 'request.html', 'standard.html', 'support.html', 'terms.html',
]

# (file, old, new, expected count)
MARK = [
    ('assets/platform-brand.js', 'EXECUTIA<span class="brand-tm">\\u2122</span>',
     'EXECUTIA<span class="brand-tm">\\u00ae</span>', 2),
    ('assets/platform-nav.js', 'EXECUTIA<span class="brand-tm">\\u2122</span>',
     'EXECUTIA<span class="brand-tm">\\u00ae</span>', 1),
    ('assets/homepage-story-film.js', "'EXECUTIA" + TM + "'", "'EXECUTIA" + R + "'", 1),
    ('assets/entry-v1.css', 'EXECUTIA' + TM + ' ENTRY', 'EXECUTIA' + R + ' ENTRY', 1),
    ('EXECUTIA_UI_STANDARD.md', 'EXECUTIA' + TM, 'EXECUTIA' + R, 4),
    ('governance/EXECUTIA_DESIGN_SYSTEM.md', 'EXECUTIA' + TM, 'EXECUTIA' + R, 2),
]


def replace(path, old, new, expected):
    text = open(path, encoding='utf-8').read()
    found = text.count(old)
    if found != expected:
        raise SystemExit(f'{path}: expected {expected} x {old!r}, found {found}')
    open(path, 'w', encoding='utf-8').write(text.replace(old, new))
    return found


def main():
    total = {'image_url': 0, 'image_alt': 0, 'mark_html': 0, 'mark_other': 0}
    for page in IMAGE_PAGES:
        total['image_url'] += replace(page, OLD_IMG, NEW_IMG, 2)
        total['image_alt'] += replace(page, OLD_ALT, NEW_ALT, 1)
    for page in sorted(glob.glob('**/*.html', recursive=True)):
        if page.startswith(('node_modules/', 'evidence/')):
            continue
        text = open(page, encoding='utf-8').read()
        n = len(re.findall('EXECUTIA(?:<span class="brand-tm">)?' + TM, text))
        if n:
            text = text.replace('EXECUTIA<span class="brand-tm">' + TM, 'EXECUTIA<span class="brand-tm">' + R)
            text = text.replace('EXECUTIA' + TM, 'EXECUTIA' + R)
            if TM in text:
                raise SystemExit(f'{page}: TM left outside the EXECUTIA mark')
            open(page, 'w', encoding='utf-8').write(text)
            total['mark_html'] += n
            print(f'  {page}: {n}')
    for path, old, new, expected in MARK:
        total['mark_other'] += replace(path, old, new, expected)
    print(total)


if __name__ == '__main__':
    main()
