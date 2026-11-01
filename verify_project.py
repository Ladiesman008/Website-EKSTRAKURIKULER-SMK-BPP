#!/usr/bin/env python3
"""Static checks for Absensi Coach SMK BPP V3.13."""
from pathlib import Path
from collections import Counter
from bs4 import BeautifulSoup
import base64, hashlib, re, subprocess, sys
import tinycss2
from PIL import Image

ROOT = Path(__file__).resolve().parent
errors=[]; checks=0

def check(condition, message):
    global checks
    checks += 1
    if not condition: errors.append(message)

html=(ROOT/'index.html').read_text(encoding='utf-8')
css=(ROOT/'style.css').read_text(encoding='utf-8')
js=(ROOT/'script.js').read_text(encoding='utf-8')
data=(ROOT/'data.js').read_text(encoding='utf-8')
soup=BeautifulSoup(html,'html.parser')

ids=[x.get('id') for x in soup.find_all(attrs={'id':True})]
dup=[k for k,n in Counter(ids).items() if n>1]
check(not dup,f'Duplicate HTML IDs: {dup}')
for rid in ['extracurricular-grid','program-popover','program-popover-title','program-popover-content','close-program-popover']:
    check(soup.find(id=rid) is not None,f'Missing HTML id: {rid}')
check('style.css?v=3.13' in html,'CSS cache version not updated')
check('data.js?v=3.13' in html and 'script.js?v=3.13' in html,'JS cache version not updated')
check('class="nav-ornament-img"' in html,'Sidebar floral image span missing')
check('class="quote-leaf-ornament"' in html,'Quote floral image span missing')
check('<svg' not in html[html.find('nav-ornament'):html.find('</nav>')], 'Old approximated inline SVG remains in sidebar')
check('quote-leaf-ornament carved-leaf-svg' not in html,'Old approximated quote SVG remains')

# Floating extracurricular popup still works via its existing event hooks.
for marker in ['data-program-open','openProgramPopover','closeProgramPopover','Escape','positionProgramPopover']:
    check(marker in js,f'Missing popup behavior marker: {marker}')
check('aria-modal="false"' in html,'Floating panel should not be modal')

# Six embedded extracurricular emblems remain present.
ids_data=re.findall(r"id:\s*'([^']+)'\s*,\s*name:",data)
check(len(ids_data)==6 and set(ids_data)=={'seni-musik','english-club','boxing','futsal','seni-tari','basket'},'Six extracurricular data entries mismatch')
logo_block=data.split('const EXTRACURRICULAR_LOGOS',1)[-1]
logo_keys=re.findall(r"'([^']+)':\s*'data:image/svg\+xml;base64,([^']+)'",logo_block)
check(len(logo_keys)==6,'Six embedded program logos missing')

# Embedded botanical image: data URI is used by both placements (path-independent).
m=re.search(r'--leaf-engraving:\s*url\("data:image/webp;base64,([^" ]+)"\)',css)
check(bool(m),'Inline botanical engraving data URI missing')
if m:
    try:
        payload=base64.b64decode(m.group(1),validate=True)
        check(payload[:4]==b'RIFF' and payload[8:12]==b'WEBP','Inline leaf payload is not a valid WebP')
    except Exception as exc: check(False,f'Inline WebP cannot be decoded: {exc}')
check('background-image:var(--leaf-engraving)' in css,'CSS does not apply image variable')
check('.nav-ornament-img' in css and '.quote-leaf-ornament' in css,'Responsive leaf styling missing')
standalone=ROOT/'assets/leaf-botanical-carved.webp'
source=ROOT/'assets/leaf-botanical-source.png'
check(standalone.exists(),'Standalone processed leaf backup missing')
check(source.exists(),'Original user-provided flower art backup missing')
if standalone.exists():
    im=Image.open(standalone).convert('RGBA')
    check(im.height>=900 and im.getchannel('A').getextrema()[0]==0,'Processed leaf size/transparency invalid')
if source.exists():
    im=Image.open(source).convert('RGBA')
    check(im.getchannel('A').getextrema()[0]==0,'Source image transparency not preserved')

# CSS parsing and mobile/reduced-motion rules.
rules=tinycss2.parse_stylesheet(css,skip_comments=True,skip_whitespace=True)
css_errors=[x for x in rules if x.type=='error']
check(not css_errors,f'CSS parse errors: {css_errors[:3]}')
check('@media (prefers-reduced-motion: reduce)' in css,'Reduced motion support missing')
check('@media (max-width: 560px)' in css,'Mobile ornamental sizing missing')

# JavaScript and Apps Script syntax.
for name in ['script.js','data.js','config.js']:
    r=subprocess.run(['node','--check',str(ROOT/name)],capture_output=True,text=True)
    check(r.returncode==0,f'{name} syntax error: {r.stderr.strip()}')
tmp=Path('/tmp/smk_bpp_v313_code_check.js')
tmp.write_text((ROOT/'code.gs').read_text(encoding='utf-8'),encoding='utf-8')
r=subprocess.run(['node','--check',str(tmp)],capture_output=True,text=True)
check(r.returncode==0,f'code.gs syntax error: {r.stderr.strip()}')

# Frontend reporting hooks and API backend preserved.
check("request('export_docx'" in js and "request('report_data'" in js,'Reporting API calls missing')
check('position:fixed' in css and '.program-popover' in css,'Floating popup positioning missing')
old=Path('/mnt/data/rekonstruksi_absensi_coach_v3_12/code.gs')
if old.exists():
    check(hashlib.sha256(old.read_bytes()).digest()==hashlib.sha256((ROOT/'code.gs').read_bytes()).digest(),'Backend changed unexpectedly')

print(f'V3.13 static verification: {checks} checks, {len(errors)} failures')
for e in errors: print('FAIL:',e)
if errors: sys.exit(1)
print('PASS: HTML, program popups, six emblems, inline botanical engraving, alpha/transparency, CSS, JavaScript, Apps Script and report hooks.')
