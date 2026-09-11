#!/usr/bin/env python3
"""Stamp content hashes onto asset references.

styles.css / main.js / scene.js have stable filenames, so a browser that
cached them will keep serving its copy until the old max-age expires — no
matter what headers we send later. Appending ?v=<hash> changes the URL, which
forces a fetch the moment the HTML (which always revalidates) changes.

Run after editing CSS or JS, before deploying.
"""
import hashlib, pathlib, re, sys

root = pathlib.Path(__file__).resolve().parent.parent

def digest(name):
    return hashlib.sha256((root / name).read_bytes()).hexdigest()[:10]

def stamp(path, asset, ver):
    """Point every reference to `asset` at ?v=<ver>, replacing any old stamp."""
    p = root / path
    src = p.read_text()
    pattern = re.compile(re.escape(asset) + r'(\?v=[0-9a-f]+)?')
    out, n = pattern.subn(f'{asset}?v={ver}', src)
    if out != src:
        p.write_text(out)
    return n

# scene.js is imported by main.js, so it has to be hashed and stamped first —
# stamping changes main.js, which changes main.js's own hash.
scene_v = digest('scene.js')
stamp('main.js', './scene.js', scene_v)

main_v, css_v = digest('main.js'), digest('styles.css')
refs = 0
for page in ('index.html', 'thank-you.html'):
    refs += stamp(page, 'main.js', main_v)
    refs += stamp(page, 'styles.css', css_v)

print(f"  scene.js   v={scene_v}")
print(f"  main.js    v={main_v}")
print(f"  styles.css v={css_v}")
print(f"  {refs} references stamped across index.html + thank-you.html")
