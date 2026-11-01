#!/usr/bin/env python3
from pathlib import Path
from collections import Counter
import subprocess, re, sys
import tinycss2
from bs4 import BeautifulSoup
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
ids=[n['id'] for n in soup.select('[id]')]
dups=[k for k,v in Counter(ids).items() if v>1]
check(not dups,f'Duplicate HTML IDs: {dups}')
for rid in ['about-popover','emoji-layer','signature-envelope','close-signature','signature-year']:
    check(soup.find(id=rid) is not None,f'Missing HTML id: {rid}')
for ref in ['style.css?v=3.16','data.js?v=3.16','config.js?v=3.16','script.js?v=3.16']:
    check(ref in html,f'Cache version missing: {ref}')
check('developed by Sahrul Mubarok, S. Pd.' in html,'Creator signature missing')
check('2026' in html,'Creator year missing')
check("button.textContent = '🤓'" in js,'Single glasses emoji missing')
check('FLOATING_EMOJI' not in js,'Old multi-emoji constant remains')
check("function moveFloatingEmoji(button)" in js,'Random movement function missing')
check('button.animate([' in js,'Web Animations API motion missing')
check('300 + Math.random() * 220' in js,'Fast movement duration not updated')
check('18 + Math.random() * 42' in js,'Short movement pause not updated')
check('const emojiSize = window.matchMedia' in js and 'Math.ceil(emojiSize / 2) + 18' in js,'Responsive movement bounds missing')
check('sourceButton.getAnimations().forEach((animation) => animation.cancel())' in js,'Tap-to-freeze missing')
check("layer.classList.add('is-paused')" in js,'Pause state missing')
check('spawnFloatingEmojis();' in js,'Emoji spawn/reset flow missing')
check("window.matchMedia('(prefers-reduced-motion: reduce)')" in js,'Reduced-motion JS guard missing')
check("event.key === 'Escape'" in js,'Escape support missing')
check('initAboutAndEmoji();' in js,'About/emoji init missing')
rules=tinycss2.parse_stylesheet(css,skip_comments=True,skip_whitespace=True)
css_errors=[r for r in rules if r.type=='error']
check(not css_errors,f'CSS parse errors: {css_errors[:3]}')
check('width: 112px !important' in css,'Desktop emoji size not 112px')
check('width: 96px !important' in css,'Mobile emoji size not 96px')
check('width: 88px !important' in css,'Small-screen emoji size not 88px')
check('--text-engraved:' in css and '--text-engraved-heading:' in css,'Global engraving tokens missing')
check('body :is(' in css and 'text-shadow: var(--text-engraved) !important' in css,'Global text engraving selector missing')
check('text-shadow: var(--text-engraved-heading) !important' in css,'Heading engraving selector missing')
check('@media (prefers-reduced-motion:reduce)' in css,'Reduced-motion CSS missing')
check('.signature-envelope.is-opening' in css and '.signature-glass-banner' in css,'Envelope styles missing')
program_ids=set(re.findall(r"id:\s*'([^']+)'\s*,\s*name:",data))
check(program_ids=={'seni-musik','english-club','boxing','futsal','seni-tari','basket'},'Six program data entries mismatch')
logos=re.findall(r"'([^']+)':\s*'data:image/svg\+xml;base64,([^']+)'",data.split('const EXTRACURRICULAR_LOGOS',1)[-1])
check(len(logos)==6,'Six embedded extracurricular emblems missing')
for fn in ['script.js','data.js','config.js']:
    r=subprocess.run(['node','--check',str(ROOT/fn)],capture_output=True,text=True)
    check(r.returncode==0,f'{fn} syntax error: {r.stderr.strip()}')
backend_tmp=Path('/tmp/smk_bpp_v316_code_check.js')
backend_tmp.write_text((ROOT/'code.gs').read_text(encoding='utf-8'))
r=subprocess.run(['node','--check',str(backend_tmp)],capture_output=True,text=True)
check(r.returncode==0,f'code.gs syntax error: {r.stderr.strip()}')
for marker in ["request('coach_info'","request('save_coach_checkin'","request('report_data'","request('export_docx'",'startCheckin','submitCheckin','renderMembers','saveMembers']:
    check(marker in js,f'Existing application flow missing: {marker}')
# The revision intentionally changes only frontend animation and text styling.
for fn in ['code.gs','config.js','appsscript.json','data.js']:
    baseline=Path('/mnt/data/rekonstruksi_absensi_coach_v3_15')/fn
    check(baseline.exists() and baseline.read_bytes()==(ROOT/fn).read_bytes(),f'{fn} unexpectedly changed')
print(f'V3.16 static verification: {checks} checks, {len(errors)} failures')
for e in errors: print('FAIL:',e)
if errors: sys.exit(1)
print('PASS: single larger fast glasses emoji, randomized motion, pause-on-tap, envelope, stronger site-wide engraved typography, responsive layout, six extracurriculars, and preserved backend flows.')
