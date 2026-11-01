#!/usr/bin/env python3
"""Static verification for SMK BPP Absensi Coach V3.15."""
from pathlib import Path
from collections import Counter
import subprocess, re, sys
import tinycss2
from bs4 import BeautifulSoup

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

ids = [node['id'] for node in soup.select('[id]')]
duplicates = [key for key, count in Counter(ids).items() if count > 1]
check(not duplicates, f'Duplicate HTML IDs: {duplicates}')
for required_id in ['about-popover', 'emoji-layer', 'signature-envelope', 'close-signature', 'signature-year']:
    check(soup.find(id=required_id) is not None, f'Missing HTML id: {required_id}')

for file_ref in ['style.css?v=3.15', 'data.js?v=3.15', 'config.js?v=3.15', 'script.js?v=3.15']:
    check(file_ref in html, f'Cache version missing: {file_ref}')
check('developed by Sahrul Mubarok, S. Pd.' in html, 'Creator signature missing')
check('2026' in html, 'Creator year missing')

# Exactly one large glasses emoji is created by the script.
check("button.textContent = '🤓'" in js, 'Single glasses emoji missing')
check('FLOATING_EMOJI' not in js, 'Old multiple-emoji constant remains')
check("const count = compact ? 3 : 5" not in js, 'Old responsive multi-emoji count remains')
check("function moveFloatingEmoji(button)" in js, 'Random movement function missing')
check('button.animate([' in js, 'Web Animations API motion missing')
check('430 + Math.random() * 390' in js, 'Fast randomized travel duration missing')
check('Math.random()' in js and 'toX' in js and 'toY' in js, 'Random target positions missing')
check('sourceButton.getAnimations().forEach((animation) => animation.cancel())' in js, 'Tap-to-freeze behavior missing')
check("layer.classList.add('is-paused')" in js, 'Pause state missing')
check('spawnFloatingEmojis();' in js, 'Emoji spawn/reset flow missing')
check("window.matchMedia('(prefers-reduced-motion: reduce)')" in js, 'Reduced-motion JS guard missing')
check("event.key === 'Escape'" in js, 'Escape key support missing')
check('initAboutAndEmoji();' in js, 'About/emoji initialization missing')

rules = tinycss2.parse_stylesheet(css, skip_comments=True, skip_whitespace=True)
css_errors = [rule for rule in rules if rule.type == 'error']
check(not css_errors, f'CSS parse errors: {css_errors[:3]}')
check('.float-emoji {' in css and 'width:78px; height:78px;' in css, 'Desktop emoji size is not 78px')
check('.float-emoji { width:70px; height:70px; font-size:39px; }' in css, 'Mobile emoji size is not 70px')
check('font-size:43px' in css, 'Desktop emoji font is not enlarged')
check('transform:translate(-50%,-50%)' in css, 'Emoji centered transform missing')
check('@media (prefers-reduced-motion:reduce)' in css, 'Reduced-motion CSS missing')
check('.signature-envelope.is-opening' in css and '.signature-glass-banner' in css, 'Envelope/glass banner styles missing')

program_ids = set(re.findall(r"id:\s*'([^']+)'\s*,\s*name:", data))
check(program_ids == {'seni-musik', 'english-club', 'boxing', 'futsal', 'seni-tari', 'basket'}, 'Six program data entries mismatch')
logos = re.findall(r"'([^']+)':\s*'data:image/svg\+xml;base64,([^']+)'", data.split('const EXTRACURRICULAR_LOGOS', 1)[-1])
check(len(logos) == 6, 'Six embedded extracurricular emblems missing')

for file_name in ['script.js', 'data.js', 'config.js']:
    result = subprocess.run(['node', '--check', str(ROOT / file_name)], capture_output=True, text=True)
    check(result.returncode == 0, f'{file_name} syntax error: {result.stderr.strip()}')
backend_tmp = Path('/tmp/smk_bpp_v315_code_check.js')
backend_tmp.write_text((ROOT / 'code.gs').read_text(encoding='utf-8'), encoding='utf-8')
result = subprocess.run(['node', '--check', str(backend_tmp)], capture_output=True, text=True)
check(result.returncode == 0, f'code.gs syntax error: {result.stderr.strip()}')

for marker in ["request('coach_info'", "request('save_coach_checkin'", "request('report_data'", "request('export_docx'", 'startCheckin', 'submitCheckin', 'renderMembers', 'saveMembers']:
    check(marker in js, f'Existing application flow missing: {marker}')

# V3.15 is a frontend-only change: backend, config and data must remain untouched.
for file_name in ['code.gs', 'config.js', 'appsscript.json', 'data.js']:
    baseline = Path('/mnt/data/rekonstruksi_absensi_coach_v3_14') / file_name
    check(baseline.exists() and baseline.read_bytes() == (ROOT / file_name).read_bytes(), f'{file_name} unexpectedly changed')

print(f'V3.15 static verification: {checks} checks, {len(errors)} failures')
for error in errors:
    print('FAIL:', error)
if errors:
    sys.exit(1)
print('PASS: one large glasses emoji, fast random movement, freeze-on-tap, envelope signature, responsive sizing, reduced-motion, six extracurriculars, and preserved backend flows.')
