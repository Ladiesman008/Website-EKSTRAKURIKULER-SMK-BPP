#!/usr/bin/env python3
"""Pemeriksaan statis paket Absensi Coach SMK BPP V3.2."""
from pathlib import Path
import json, re, subprocess, sys

ROOT = Path(__file__).resolve().parent
errors = []

def check(condition, message):
    (print('PASS:', message) if condition else (errors.append(message), print('FAIL:', message)))

for name in ['index.html', 'style.css', 'data.js', 'config.js', 'script.js', 'code.gs', 'appsscript.json']:
    check((ROOT / name).is_file(), f'file {name} tersedia')

for name in ['script.js', 'data.js', 'config.js']:
    result = subprocess.run(['node', '--check', str(ROOT / name)], capture_output=True, text=True)
    check(result.returncode == 0, f'sintaks JavaScript {name}')

gs_copy = ROOT / '.verify_code_gs.js'
gs_copy.write_text((ROOT / 'code.gs').read_text())
result = subprocess.run(['node', '--check', str(gs_copy)], capture_output=True, text=True)
gs_copy.unlink(missing_ok=True)
check(result.returncode == 0, 'sintaks Google Apps Script code.gs')

try:
    manifest = json.loads((ROOT / 'appsscript.json').read_text())
    check(manifest.get('timeZone') == 'Asia/Jakarta', 'zona waktu Apps Script Asia/Jakarta')
except Exception as exc:
    check(False, f'manifest valid ({exc})')

html = (ROOT / 'index.html').read_text()
js = (ROOT / 'script.js').read_text()
gs = (ROOT / 'code.gs').read_text()
data = (ROOT / 'data.js').read_text()
ids = re.findall(r'\bid=["\']([^"\']+)', html)
check(len(ids) == len(set(ids)), 'tidak ada ID HTML duplikat')
refs = sorted(set(re.findall(r"\$\(['\"]#([\w-]+)['\"]", js)))
missing = [ref for ref in refs if ref not in set(ids)]
check(not missing, 'seluruh selector ID JavaScript tersedia' + (f': {missing}' if missing else ''))
views = set(re.findall(r'data-view="([^"]+)', html) + re.findall(r'data-go="([^"]+)', html))
sections = set(re.findall(r'id="view-([^"]+)', html))
check(views <= sections, 'seluruh target navigasi tersedia')

frontend_actions = set(re.findall(r"request\('([a-z_]+)'", js))
backend_actions = set(re.findall(r"case '([a-z_]+)'", gs)) | set(re.findall(r"p\.action === '([a-z_]+)'", gs))
check(frontend_actions <= backend_actions, 'seluruh action frontend tersedia di backend' + (f': {sorted(frontend_actions-backend_actions)}' if frontend_actions-backend_actions else ''))
check("p.action === 'health'" in gs and "version: '3.2'" in gs, 'endpoint health V3.2 tersedia')
check("new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'Asia/Jakarta' })" in js, 'tanggal UI menggunakan zona waktu Jakarta')
check("row.score !== '' && row.score != null" in js, 'nilai kosong tidak dihitung sebagai nol')
check("function loadSchoolLogo()" in js and 'id="school-logo"' in html, 'logo dimuat otomatis dari file lokal')
check('logo.png' in js and 'logo.svg' in js and 'logo.webp' in js, 'fallback ekstensi logo umum tersedia')
check('startCheckin' in js and 'capturePhoto()' in js and 'await submitCheckin()' in js, 'tombol satu sentuhan mengambil foto dan menyimpan otomatis')
check('camera-countdown' in html and 'cancel-checkin' in html, 'hitung mundur dan tombol batalkan tersedia')
check('capture-photo' not in html and 'retake-photo' not in html, 'tidak ada lagi langkah manual ambil foto/ulang foto')
check('LockService.getScriptLock()' in gs, 'backend mengunci transaksi untuk mencegah check-in ganda')
check('--accent: #65b77e' in (ROOT / 'style.css').read_text(), 'palet aksen hijau tua aktif')

try:
    import tinycss2
    rules = tinycss2.parse_stylesheet((ROOT / 'style.css').read_text(), skip_whitespace=True, skip_comments=True)
    css_errors = [rule for rule in rules if rule.type == 'error']
    check(not css_errors, 'stylesheet lolos parsing CSS' + (f': {css_errors}' if css_errors else ''))
except ImportError:
    css = (ROOT / 'style.css').read_text()
    check(css.count('{') == css.count('}'), 'kurung CSS seimbang (fallback parser)')

names = ['Seni Musik', 'English Club', 'Boxing', 'Futsal', 'Seni Tari', 'Basket']
check(all(name in data and name in gs for name in names), 'enam program konsisten di frontend dan backend')

if errors:
    print(f'\nHASIL: {len(errors)} pemeriksaan gagal.')
    sys.exit(1)
print('\nHASIL: seluruh pemeriksaan statis lulus.')
