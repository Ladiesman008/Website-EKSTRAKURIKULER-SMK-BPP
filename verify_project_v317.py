#!/usr/bin/env python3
from pathlib import Path
from collections import Counter
import subprocess, re, sys
import tinycss2
from bs4 import BeautifulSoup
ROOT = Path(__file__).resolve().parent
BASE = Path('/mnt/data/rekonstruksi_absensi_coach_v3_16')
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
check(not dups, f'Duplicate HTML IDs: {dups}')
for rid in ['about-popover','emoji-layer','signature-envelope','close-signature','signature-year']:
    check(soup.find(id=rid) is not None, f'Missing HTML id: {rid}')
for ref in ['style.css?v=3.17','data.js?v=3.17','config.js?v=3.17','script.js?v=3.17']:
    check(ref in html, f'Cache version missing: {ref}')
check('developed by Sahrul Mubarok, S. Pd.' in html, 'Creator signature missing')
check('2026' in html, 'Creator year missing')
check("button.textContent = '🤓'" in js, 'Single glasses emoji missing')
check("function spawnFloatingEmojis()" in js, 'Emoji spawn function missing')
check("layer.innerHTML = ''" in js, 'Spawn must replace any prior emoji, avoiding duplicates')
check("function floatingEmojiSize()" in js, 'Responsive emoji sizing helper missing')
check("return 66" in js and "return 58" in js and "return 54" in js, 'Desktop/mobile/compact emoji sizes missing')
check("const duration = isTouchLayout ? 1750 + Math.random() * 750 : 1450 + Math.random() * 700" in js, 'Slower catchable motion timings missing')
check("140 + Math.random() * 180" in js, 'Readable pause between paths missing')
check('function emojiTransform(x, y)' in js, 'Transform-only animation helper missing')
check("{ transform: emojiTransform(fromX, fromY) }" in js and "{ transform: emojiTransform(toX, toY) }" in js, 'WAAPI transform keyframes missing')
check("button.animate([" in js, 'Web Animations API movement missing')
check("function freezeFloatingEmoji(button)" in js, 'Freeze-on-tap helper missing')
check('const frozen = freezeFloatingEmoji(sourceButton)' in js, 'Tap should freeze emoji at the exact position')
check("layer.classList.add('is-paused')" in js, 'Pause state missing')
check("document.addEventListener('visibilitychange'" in js, 'Background tab pause/resume missing')
check("window.addEventListener('resize'" in js and 'setEmojiCenter(button, x, y)' in js, 'Responsive viewport repositioning missing')
check("window.matchMedia('(prefers-reduced-motion: reduce)')" in js, 'Reduced-motion JS guard missing')
check("event.key === 'Escape'" in js, 'Escape close support missing')
check('initAboutAndEmoji();' in js, 'About/emoji init missing')

rules=tinycss2.parse_stylesheet(css,skip_comments=True,skip_whitespace=True)
css_errors=[r for r in rules if r.type=='error']
check(not css_errors, f'CSS parse errors: {css_errors[:3]}')
check('--motion-ease:' in css and '--motion-medium:' in css, 'Unified motion tokens missing')
check('width:66px !important' in css, 'Desktop emoji size 66px missing')
check('width:58px !important' in css, 'Mobile emoji size 58px missing')
check('width:54px !important' in css, 'Compact emoji size 54px missing')
check('opacity:.79 !important' in css and 'opacity:.81 !important' in css, 'Translucent emoji state missing')
check('translate3d(var(--emoji-x,50vw),var(--emoji-y,50vh),0)' in css, 'GPU-friendly position transform missing')
check('will-change:transform,opacity' in css, 'Emoji compositor hint missing')
check('prefers-reduced-motion:reduce' in css, 'Reduced-motion CSS missing')
check('.signature-envelope.is-opening' in css and '.signature-glass-banner' in css, 'Envelope styles missing')
check('@keyframes envelope-arrive' in css and '@keyframes letter-rise' in css, 'Envelope/letter keyframes missing')

program_ids=set(re.findall(r"id:\s*'([^']+)'\s*,\s*name:",data))
check(program_ids=={'seni-musik','english-club','boxing','futsal','seni-tari','basket'}, 'Six program data entries mismatch')
logos=re.findall(r"'([^']+)':\s*'data:image/svg\+xml;base64,([^']+)'",data.split('const EXTRACURRICULAR_LOGOS',1)[-1])
check(len(logos)==6, 'Six embedded extracurricular emblems missing')
for fn in ['script.js','data.js','config.js']:
    r=subprocess.run(['node','--check',str(ROOT/fn)],capture_output=True,text=True)
    check(r.returncode==0, f'{fn} syntax error: {r.stderr.strip()}')
backend_tmp=Path('/tmp/smk_bpp_v317_code_check.js')
backend_tmp.write_text((ROOT/'code.gs').read_text(encoding='utf-8'))
r=subprocess.run(['node','--check',str(backend_tmp)],capture_output=True,text=True)
check(r.returncode==0, f'code.gs syntax error: {r.stderr.strip()}')
for marker in ["request('coach_info'", "request('save_coach_checkin'", "request('report_data'", "request('export_docx'", 'startCheckin','submitCheckin','renderMembers','saveMembers']:
    check(marker in js, f'Existing application flow missing: {marker}')
for fn in ['code.gs','config.js','appsscript.json','data.js']:
    check((BASE/fn).exists() and (BASE/fn).read_bytes()==(ROOT/fn).read_bytes(), f'{fn} unexpectedly changed')

print(f'V3.17 static verification: {checks} checks, {len(errors)} failures')
for error in errors: print('FAIL:', error)
if errors: sys.exit(1)
print('PASS: smaller translucent single emoji, slower transform-only motion, resize/visibility handling, smooth responsive transitions, reduced-motion support, six extracurriculars, and preserved backend/data files.')
