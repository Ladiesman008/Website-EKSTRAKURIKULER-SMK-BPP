#!/usr/bin/env python3
"""Static verification for Absensi Coach SMK BPP UI V3.7."""
from pathlib import Path
from bs4 import BeautifulSoup
import json, re, subprocess, sys, xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
errors = []
def check(ok, message):
    print(('PASS: ' if ok else 'FAIL: ') + message)
    if not ok: errors.append(message)

# Required distribution files
required = ['index.html','style.css','data.js','config.js','script.js','code.gs','appsscript.json','README.md','VERSION.txt','assets/hero-school.jpg','assets/leaf-ornament.svg']
for f in required: check((ROOT/f).is_file(), f'file tersedia: {f}')

# Syntax checks
for f in ['script.js','data.js','config.js']:
    r=subprocess.run(['node','--check',str(ROOT/f)],capture_output=True,text=True)
    check(r.returncode==0, f'sintaks JavaScript {f}')
gs_temp=ROOT/'.verify_code_gs.js'
gs_temp.write_text((ROOT/'code.gs').read_text())
r=subprocess.run(['node','--check',str(gs_temp)],capture_output=True,text=True)
gs_temp.unlink(missing_ok=True)
check(r.returncode==0,'sintaks Google Apps Script')

# HTML and reference layout
soup=BeautifulSoup((ROOT/'index.html').read_text(),'html.parser')
ids=[e['id'] for e in soup.select('[id]')]
check(len(ids)==len(set(ids)),'ID HTML unik')
check(soup.select_one('.site-header') is not None,'header utama tersedia')
check(soup.select_one('.workspace > .main-nav') is not None,'sidebar berada di kiri workspace')
check(soup.select_one('.workspace > main') is not None,'main berada di kanan sidebar')
check(len(soup.select('.stats-grid .stat-card'))==4,'empat kartu statistik tersedia')
check(soup.select_one('.program-grid') is not None,'grid daftar ekskul tersedia')
check(soup.select_one('#about-strip') is not None,'panel kutipan tersedia')
check(len(soup.select('.nav-btn'))==5,'lima item navigasi tersedia')
views=set(e.get('data-view') for e in soup.select('.nav-btn'))
sections=set(re.findall(r'id="view-([^\"]+)',(ROOT/'index.html').read_text()))
check(views <= sections,'target navigasi cocok dengan view')
for b in soup.select('.nav-btn[data-scroll]'):
    check(b['data-scroll'] in ids, f'target scroll tersedia: {b["data-scroll"]}')

# CSS syntax and layout values
try:
    import tinycss2
    css_rules=tinycss2.parse_stylesheet((ROOT/'style.css').read_text(),skip_whitespace=True,skip_comments=True)
    css_errors=[r for r in css_rules if r.type=='error']
    check(not css_errors,'CSS lolos parsing')
except ImportError:
    check((ROOT/'style.css').read_text().count('{')==(ROOT/'style.css').read_text().count('}'),'kurung CSS seimbang')
css=(ROOT/'style.css').read_text()
for token,desc in [('.workspace { display:grid; grid-template-columns:232px','desktop sidebar layout'),('grid-template-columns:repeat(3,minmax(0,1fr))','3-column extracurricular grid'),('grid-template-columns:repeat(2,minmax(0,1fr))','responsive mobile grid'),('assets/hero-school.jpg','school facade banner'),('text-shadow:','engraved typography'),('box-shadow: var(--raised)','3D raised neumorphism')]:
    check(token in css, desc)

# SVG emblems
logos=['seni-musik','english-club','boxing','futsal','seni-tari','basket']
for name in logos:
    path=ROOT/'assets'/'logos'/f'{name}.svg'
    try: ET.parse(path); valid=path.is_file()
    except Exception: valid=False
    check(valid,f'emblem SVG valid: {name}')
for name in logos:
    check(re.search(r"'"+re.escape(name)+r"': 'data:image/svg\+xml;base64,[A-Za-z0-9+/=]+'", (ROOT/'data.js').read_text()) is not None, f'emblem disematkan: {name}')

# JS references and API compatibility
js=(ROOT/'script.js').read_text(); gs=(ROOT/'code.gs').read_text(); data=(ROOT/'data.js').read_text()
for action in sorted(set(re.findall(r"request\('([a-z_]+)'",js))):
    check((f"case '{action}'" in gs) or (f"p.action === '{action}'" in gs),f'backend action tersedia: {action}')
check("function loadSchoolLogo()" in js and "logo.png" in js and 'id="school-logo"' in (ROOT/'index.html').read_text(),'logo otomatis dimuat dari folder website')
check('EXTRACURRICULAR_LOGOS[item.id]' in js and 'data:image/svg+xml;base64,' in data,'kartu memakai emblem SVG tersemat tanpa ketergantungan path eksternal')
check("dataset.scroll" in js and "scrollIntoView" in js,'item navigasi anchor berfungsi')
check("startCheckin" in js and "capturePhoto()" in js and "await submitCheckin()" in js,'flow absensi satu sentuhan masih tersedia')
check("version: '3.2'" in gs,'backend API 3.2 tetap ada dan tidak berubah')
check('V3.7' in (ROOT/'VERSION.txt').read_text(),'versi paket UI V3.7')
check('leaf-ornament.svg' in (ROOT/'index.html').read_text(),'ornamen daun SVG digunakan pada sidebar dan kutipan')
check('width:82%; height:82%' in css,'emblem diperkecil dan memiliki jarak dari lingkaran')
check((ROOT/'assets'/'leaf-ornament.svg').is_file(),'ornamen daun tersedia sebagai aset lokal')
try: ET.parse(ROOT/'assets'/'leaf-ornament.svg'); leaf_svg_valid=True
except Exception: leaf_svg_valid=False
check(leaf_svg_valid,'SVG ornamen daun valid')
check('translateY(-3px)' in css and ':hover' in css,'efek hover mengangkat elemen tersedia')
check(':active' in css and 'translateY(1px)' in css,'efek tekan/amblas tersedia')
check('var(--neon-edge)' in css and 'var(--neon-halo)' in css,'border glow hijau tersedia')
check('@media (hover: hover) and (pointer: fine)' in css,'hover hanya untuk perangkat pointer')
check('prefers-reduced-motion: reduce' in css,'dukungan reduced motion tersedia')
check(all(name in data for name in ['Seni Musik','English Club','Boxing','Futsal','Seni Tari','Basket']),'enam data ekstrakurikuler tersedia')

if errors:
    print(f'\nHASIL: {len(errors)} pemeriksaan gagal dari keseluruhan.')
    sys.exit(1)
print('\nHASIL: seluruh pemeriksaan statis lulus.')
