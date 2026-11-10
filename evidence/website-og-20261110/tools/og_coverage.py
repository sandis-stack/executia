"""Print the social-preview meta block of every HTML page in the site.

Usage: python3 og_coverage.py [--html-dir DIR] [--live https://executia.io]
Without --live it reads the files on disk; with --live it fetches each routed path.
"""
import argparse
import glob
import json
import os
import re
import urllib.request

KEYS = [
    'og:title', 'og:description', 'og:url', 'og:type', 'og:image', 'og:image:width',
    'og:image:height', 'og:image:alt', 'twitter:card', 'twitter:image',
]


def routed_pages(root):
    routes = json.load(open(os.path.join(root, 'vercel.json')))['routes']
    pages = {}
    for r in routes:
        dest = r.get('dest', '')
        if dest.endswith('.html'):
            path = r['src'].strip('^$').replace('/?', '').replace('\\', '')
            pages.setdefault(dest.lstrip('/'), path or '/')
    return pages


def head_of(html):
    return html.split('</head>')[0]


def meta(head):
    out = {}
    t = re.search(r'<title>(.*?)</title>', head, re.S)
    out['title'] = t.group(1).strip() if t else None
    for k in KEYS + ['description', 'robots']:
        m = re.search(r'<meta (?:property|name)="%s" content="([^"]*)"' % re.escape(k), head)
        out[k] = m.group(1) if m else None
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--html-dir', default='.')
    ap.add_argument('--live')
    ap.add_argument('--json')
    args = ap.parse_args()
    root = args.html_dir
    pages = routed_pages(root)
    unrouted = sorted(
        f for f in glob.glob('**/*.html', root_dir=root, recursive=True)
        if f not in pages and not f.startswith(('node_modules/', 'evidence/'))
    )
    result = {}
    for f, path in list(pages.items()) + [(f, '/' + f) for f in unrouted]:
        if args.live:
            req = urllib.request.Request(args.live.rstrip('/') + path, headers={'User-Agent': 'og-coverage/1'})
            try:
                html = urllib.request.urlopen(req, timeout=20).read().decode('utf-8', 'replace')
            except Exception as e:  # noqa: BLE001
                result[path] = {'file': f, 'error': str(e)}
                continue
        else:
            html = open(os.path.join(root, f), encoding='utf-8').read()
        m = meta(head_of(html))
        m['file'] = f
        m['routed'] = f in pages
        m['og_complete'] = sum(1 for k in KEYS if m[k])
        result[path] = m
    for path, m in result.items():
        if 'error' in m:
            print(f"{path:18} ERROR {m['error']}")
            continue
        print(f"{path:18} {m['file']:30} og={m['og_complete']}/10 robots={m['robots'] or '-'}")
        for k in ['title'] + KEYS:
            print(f"    {k:16} {m[k]}")
    if args.json:
        json.dump(result, open(args.json, 'w'), indent=2, ensure_ascii=False)


if __name__ == '__main__':
    main()
