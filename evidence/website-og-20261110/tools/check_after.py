"""TASK-20 acceptance checks on the served pages (run after og_coverage.py --live ... --json after/head-meta-local-http.json).

Usage: python3 check_after.py after/head-meta-local-http.json http://127.0.0.1:4320
"""
import json
import re
import sys
import urllib.request

MAIN = 'https://executia.io/assets/brand/executia-og-1200x630-v2.png'
ENGINE = 'https://executia.io/assets/brand/executia-og-engine-1200x630.png'
TABLE = {
    '/': ('EXECUTIA® — making sure decisions are actually carried out',
          'Connects commitments, checks prerequisites before work proceeds, shows who is responsible and records '
          'evidence of the result.'),
    '/engine': ('Live demo: a decision validated before execution',
                'See how EXECUTIA checks prerequisites and stops an action before it becomes irreversible.'),
    '/request': ('Request a pilot: one decision, validated before execution',
                 'Start narrow: one execution point with a measurable result. Submit a case and get a structured '
                 'pilot response within 24–48 hours.'),
}
FORMAT_PAGES = ['/pilot', '/one', '/standard', '/contact']


def main():
    data = json.load(open(sys.argv[1]))
    base = sys.argv[2].rstrip('/')
    failures = []

    def check(ok, msg):
        print(('ok   ' if ok else 'FAIL ') + msg)
        if not ok:
            failures.append(msg)

    for path, m in data.items():
        check(m['og_complete'] == 10, f'{path}: all 10 social tags present')
        check(m['og:type'] == 'website', f'{path}: og:type=website')
        check(m['twitter:card'] == 'summary_large_image', f'{path}: twitter:card=summary_large_image')
        check((m['og:image:width'], m['og:image:height']) == ('1200', '630'), f'{path}: og:image 1200x630 declared')
        want = ENGINE if path == '/engine' else MAIN
        check(m['og:image'] == want and m['twitter:image'] == want, f'{path}: image {want.rsplit("/", 1)[1]}')
        check('™' not in (m['title'] or '') + (m['og:title'] or ''), f'{path}: no TM in title/og:title')
        html = urllib.request.urlopen(base + (path if m['routed'] else '/' + m['file'])).read().decode()
        canon = re.search(r'<link rel="canonical" href="([^"]+)"', html)
        if canon:
            check(m['og:url'] == canon.group(1), f'{path}: og:url == canonical ({canon.group(1)})')
    for path, (title, desc) in TABLE.items():
        check(data[path]['og:title'] == title, f'{path}: og:title exact')
        check(data[path]['og:description'] == desc, f'{path}: og:description exact')
    for path in FORMAT_PAGES:
        check(data[path]['og:title'].endswith(' — EXECUTIA®'), f'{path}: og:title "<Page> — EXECUTIA®"')
    print(f'\n{len(failures)} failure(s)')
    sys.exit(1 if failures else 0)


if __name__ == '__main__':
    main()
