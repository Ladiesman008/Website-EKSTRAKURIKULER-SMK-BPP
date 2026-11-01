#!/usr/bin/env python3
"""Static verification for SMK BPP Absensi Coach V3.14."""
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
for required_id in [
    'about-popover', 'about-popover-title', 'close-about-popover',
    'emoji-layer', 'signature-envelope', 'close-signature', 'signature-year',
    'program-popover', 'extracurricular-grid'
]:
    check(soup.find(id=required_id) is not None, f'Missing HTML id: {required_id}')

check('data-about-open' in html, 'About navigation trigger missing')
check('data-view="beranda" data-scroll="about-strip"' not in html, 'Old About scroll behavior remains')
check('aria-modal="false"' in str(soup.find(id='about-popover')), 'About panel must remain non-modal')
check('developed by Sahrul Mubarok, S. Pd.' in html, 'Developer signature text missing')
check('Tahun dibuat' in html, 'Created-year label missing')
check('2026' in html, 'Creation year missing')
for file_ref in ['style.css?v=3.14', 'data.js?v=3.14', 'config.js?v=3.14', 'script.js?v=3.14']:
    check(file_ref in html, f'Cache version missing: {file_ref}')

for behavior in [
    'openAboutPopover', 'closeAboutPopover', 'initAboutAndEmoji',
    'spawnFloatingEmojis', 'revealSignature', 'closeSignatureExperience',
    'FLOATING_EMOJI', 'is-paused', 'letter-emerged', 'SIGNATURE_YEAR'
]:
    check(behavior in js, f'Missing interaction behavior: {behavior}')
check("window.matchMedia('(max-width: 760px)')" in js, 'Emoji count is not responsive')
check("event.key === 'Escape'" in js and 'closeAboutPopover(true)' in js, 'Escape key handling missing')
check("closeSignatureExperience" in js and "spawnFloatingEmojis()" in js, 'Envelope close/reset flow missing')
check("initAboutAndEmoji();" in js, 'About/emoji initialization is not called')

rules = tinycss2.parse_stylesheet(css, skip_comments=True, skip_whitespace=True)
css_errors = [rule for rule in rules if rule.type == 'error']
check(not css_errors, f'CSS parse errors: {css_errors[:3]}')
for selector in [
    '.about-popover', '.about-popover.is-visible', '.emoji-layer', '.float-emoji',
    '.signature-envelope', '.envelope-flap', '.signature-glass-banner'
]:
    check(selector in css, f'Missing CSS selector: {selector}')
check('@media (prefers-reduced-motion:reduce)' in css, 'Reduced-motion styles missing')
check('backdrop-filter:blur(18px)' in css, 'Glassmorphism blur missing')

# Six programs and the six embedded SVG emblems must remain untouched.
program_ids = set(re.findall(r"id:\s*'([^']+)'\s*,\s*name:", data))
check(program_ids == {'seni-musik', 'english-club', 'boxing', 'futsal', 'seni-tari', 'basket'}, 'Six program data entries mismatch')
logo_block = data.split('const EXTRACURRICULAR_LOGOS', 1)[-1]
logo_entries = re.findall(r"'([^']+)':\s*'data:image/svg\+xml;base64,([^']+)'", logo_block)
check(len(logo_entries) == 6, 'Six embedded extracurricular emblems missing')

for file_name in ['script.js', 'data.js', 'config.js']:
    result = subprocess.run(['node', '--check', str(ROOT / file_name)], capture_output=True, text=True)
    check(result.returncode == 0, f'{file_name} syntax error: {result.stderr.strip()}')
backend_tmp = Path('/tmp/smk_bpp_v314_code_check.js')
backend_tmp.write_text((ROOT / 'code.gs').read_text(encoding='utf-8'), encoding='utf-8')
result = subprocess.run(['node', '--check', str(backend_tmp)], capture_output=True, text=True)
check(result.returncode == 0, f'code.gs syntax error: {result.stderr.strip()}')

# Ensure business logic and API wiring remain in place.
for marker in ["request('coach_info'", "request('save_coach_checkin'", "request('report_data'", "request('export_docx'"]:
    check(marker in js, f'Existing application flow missing: {marker}')
check('startCheckin' in js and 'submitCheckin' in js, 'Coach attendance actions missing')
check('renderMembers' in js and 'saveMembers' in js, 'Member attendance/evaluation actions missing')

# Backend and deployment config must not be changed for this frontend-only release.
for file_name in ['code.gs', 'config.js', 'appsscript.json', 'data.js']:
    baseline = Path('/mnt/data/rekonstruksi_absensi_coach_v3_13') / file_name
    check(baseline.exists() and baseline.read_bytes() == (ROOT / file_name).read_bytes(), f'{file_name} unexpectedly changed')

print(f'V3.14 static verification: {checks} checks, {len(errors)} failures')
for error in errors:
    print('FAIL:', error)
if errors:
    sys.exit(1)
print('PASS: About panel, emoji interactions, envelope reveal, glass banner, responsive/reduced motion, six emblems, JS, CSS, Apps Script, and existing app flows.')
