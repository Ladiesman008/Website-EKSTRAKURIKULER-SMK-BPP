#!/usr/bin/env python3
"""Static checks for Absensi Coach SMK BPP V3.12."""
from pathlib import Path
from collections import Counter
from bs4 import BeautifulSoup
import base64, re, subprocess, sys
import tinycss2
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
errors = []
checks = 0

def check(condition, message):
    global checks
    checks += 1
    if not condition:
        errors.append(message)

html = (ROOT / 'index.html').read_text(encoding='utf-8')
css = (ROOT / 'style.css').read_text(encoding='utf-8')
js = (ROOT / 'script.js').read_text(encoding='utf-8')
data = (ROOT / 'data.js').read_text(encoding='utf-8')
soup = BeautifulSoup(html, 'html.parser')

# HTML structure and IDs
ids = [tag.get('id') for tag in soup.find_all(attrs={'id': True})]
duplicates = [key for key, n in Counter(ids).items() if n > 1]
check(not duplicates, f'Duplicate HTML IDs: {duplicates}')
for required_id in ['extracurricular-grid', 'program-popover', 'program-popover-title', 'program-popover-content', 'close-program-popover']:
    check(soup.find(id=required_id) is not None, f'Missing HTML id: {required_id}')
check('aria-modal="false"' in html, 'Floating panel must remain non-modal')
check('v=3.12' in html, 'HTML asset cache-buster is not V3.12')

# Frontend popup behavior hooks
for marker in ['data-program-open', 'openProgramPopover', 'closeProgramPopover', 'Escape', 'positionProgramPopover']:
    check(marker in js, f'Missing popup behavior: {marker}')
check('panel.contains(event.target)' in js, 'Popup internal click guard missing')
check("event.target.closest('[data-program-open]')" in js, 'Switch-card click guard missing')
check('window.addEventListener(\'scroll\'' in js, 'Popup scroll cleanup missing')
check('aria-expanded="false"' in js, 'Program cards should start collapsed')
check('program-card details' not in css and '.program-card summary' not in css, 'Legacy inline details styles remain')
check('.program-popover[hidden]' in css, 'Popup hidden-state CSS missing')
check('pointer-events:auto' in css, 'Popup controls must accept pointer events')
check('backdrop' not in html.lower(), 'Unexpected full-screen backdrop markup present')

# Six data entries and embedded SVGs
ids_data = re.findall(r"id:\s*'([^']+)'\s*,\s*name:", data)
check(len(ids_data) == 6, f'Expected six extracurricular data entries, found {len(ids_data)}')
check(set(ids_data) == {'seni-musik','english-club','boxing','futsal','seni-tari','basket'}, 'Extracurricular IDs mismatch')
logo_block = data.split('const EXTRACURRICULAR_LOGOS', 1)[-1]
logo_keys = re.findall(r"'([^']+)':\s*'data:image/svg\+xml;base64,([^']+)'", logo_block)
check(len(logo_keys) == 6, f'Expected six embedded logo SVG data URIs, found {len(logo_keys)}')
for key, payload in logo_keys:
    try:
        ET.fromstring(base64.b64decode(payload))
        check(True, f'Logo {key} SVG valid')
    except Exception as exc:
        check(False, f'Logo {key} SVG invalid: {exc}')

# SVG botanical asset
leaf = ROOT / 'assets' / 'leaf-ornament.svg'
check(leaf.exists(), 'Carved leaf SVG is missing')
if leaf.exists():
    try:
        ET.parse(leaf)
        check(True, 'Carved leaf SVG parses')
    except Exception as exc:
        check(False, f'Carved leaf SVG invalid: {exc}')
check(html.count('class=\"nav-ornament-svg carved-leaf-svg\"') == 1, 'Inline sidebar leaf missing')
check(html.count('class=\"quote-leaf-ornament carved-leaf-svg\"') == 1, 'Inline quote leaf missing')
check('assets/leaf-ornament.svg' not in html, 'Leaf still depends on external SVG path')
check('fill=\"url(#navCarve-groove)\"' in html and 'fill=\"url(#quoteCarve-groove)\"' in html, 'Leaf cavity fill missing')
check('stroke=\"#68727d\"' in html, 'Recessed graphite bevel highlight missing')
check('filter:none !important' in css and 'drop-shadow' not in css[css.find('.nav-ornament-svg {'):css.find('main {')], 'Leaf still uses raised outer drop shadow')
check('loading=\"lazy\"' not in html[html.find('nav-ornament'):html.find('</nav>')], 'Sidebar leaf must not lazy-load')
check('.nav-ornament { position:relative' in css and 'overflow:visible' in css[css.find('.nav-ornament {'):css.find('main {')], 'Sidebar leaf container may clip ornament')
quote_rule = css[css.find('.quote-strip {'):css.find('.quote-rule {')]
check('overflow:visible' in quote_rule, 'Quote strip clips decorative leaf')
check('min-height:124px' in quote_rule, 'Quote strip does not reserve vertical room for leaf')
check('.quote-leaf-ornament {' in css and 'opacity:.93' in css[css.find('.quote-leaf-ornament {'):css.find('.site-footer')], 'Quote leaf visibility CSS missing')

# CSS parse
rules = tinycss2.parse_stylesheet(css, skip_comments=True, skip_whitespace=True)
css_errors = [rule for rule in rules if rule.type == 'error']
check(not css_errors, f'CSS parse errors: {css_errors[:3]}')
check('.program-popover' in css and 'position:fixed' in css, 'Floating popup positioning missing')
check('@media (max-width: 760px)' in css, 'Mobile popup layout missing')
check('@media (prefers-reduced-motion: reduce)' in css, 'Reduced-motion support missing')

# JavaScript syntax
for name in ['script.js', 'data.js', 'config.js']:
    result = subprocess.run(['node', '--check', str(ROOT / name)], capture_output=True, text=True)
    check(result.returncode == 0, f'{name} syntax error: {result.stderr.strip()}')
# Apps Script syntax is JavaScript; check with temporary .js extension.
tmp = Path('/tmp/smk_bpp_v310_code_check.js')
tmp.write_text((ROOT / 'code.gs').read_text(encoding='utf-8'), encoding='utf-8')
result = subprocess.run(['node', '--check', str(tmp)], capture_output=True, text=True)
check(result.returncode == 0, f'code.gs syntax error: {result.stderr.strip()}')

# API remains identical (we did not change backend or endpoints)
check('function request(' in js, 'Frontend request helper missing')
check("request('export_docx'" in js and "request('report_data'" in js, 'Reporting API calls missing')

# V3.12 charcoal stone material-system checks
check('BLACK CHARCOAL STONE NEUMORPHISM' in css, 'V3.12 charcoal material override missing')
check('--bg: #191a1c' in css and '--surface: #242629' in css, 'Black charcoal palette tokens missing')
check('inset 7px 7px 14px' in css and 'inset -6px -6px 13px' in css, 'Stone inset shadows missing')
check('text-shadow:' in css[css.rfind('BLACK CHARCOAL STONE NEUMORPHISM'):], 'Carved/inset typography rules missing')
check('0 0 22px rgba(65,190,103' not in css[css.rfind('BLACK CHARCOAL STONE NEUMORPHISM'):], 'Strong green popup glow remains in final override')
check('linear-gradient(145deg,#34373b' in css, 'Primary button is not charcoal in final override')

print(f'V3.12 static verification: {checks} checks, {len(errors)} failures')
for err in errors:
    print('FAIL:', err)
if errors:
    sys.exit(1)
print('PASS: HTML IDs, popup interactions, six embedded emblems, inline carved leaves, unclipped responsive ornaments, CSS parsing, charcoal stone material system, inset typography, JS syntax, Apps Script syntax, and reporting hooks.')
