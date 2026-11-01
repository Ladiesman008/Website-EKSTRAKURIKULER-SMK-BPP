from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.enum.section import WD_SECTION
from docx.enum.style import WD_STYLE_TYPE
from pathlib import Path

OUT = Path('/mnt/data/rekonstruksi_absensi_coach_v2/Template_Laporan_Absensi_Ekstrakurikuler.docx')
NAVY = '10182F'
BLUE = '203B82'
PALE = 'F1F4F9'
TEXT = '253047'
MUTED = '64748B'


def shade(cell, fill):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = tcPr.find(qn('w:shd'))
    if shd is None:
        shd = OxmlElement('w:shd')
        tcPr.append(shd)
    shd.set(qn('w:fill'), fill)


def set_cell_margins(cell, top=80, start=85, bottom=80, end=85):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcMar = tcPr.first_child_found_in('w:tcMar')
    if tcMar is None:
        tcMar = OxmlElement('w:tcMar')
        tcPr.append(tcMar)
    for m, v in [('top', top), ('start', start), ('bottom', bottom), ('end', end)]:
        node = tcMar.find(qn('w:' + m))
        if node is None:
            node = OxmlElement('w:' + m)
            tcMar.append(node)
        node.set(qn('w:w'), str(v))
        node.set(qn('w:type'), 'dxa')


def set_repeat_table_header(row):
    trPr = row._tr.get_or_add_trPr()
    tblHeader = OxmlElement('w:tblHeader')
    tblHeader.set(qn('w:val'), 'true')
    trPr.append(tblHeader)


def set_cell_text(cell, text, *, size=8, bold=False, color=TEXT, align=WD_ALIGN_PARAGRAPH.LEFT):
    cell.text = ''
    p = cell.paragraphs[0]
    p.alignment = align
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.line_spacing = 1.05
    r = p.add_run(str(text))
    r.font.name = 'Arial'
    r.font.size = Pt(size)
    r.bold = bold
    r.font.color.rgb = RGBColor.from_string(color)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    set_cell_margins(cell)
    return p


def style_table(table, headers=True, font_size=7):
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = True
    table.style = 'Table Grid'
    if headers:
        set_repeat_table_header(table.rows[0])
    for r_idx, row in enumerate(table.rows):
        for cell in row.cells:
            if r_idx == 0 and headers:
                shade(cell, BLUE)
                txt = cell.text
                set_cell_text(cell, txt, size=font_size, bold=True, color='FFFFFF')
            else:
                if r_idx % 2 == 0:
                    shade(cell, PALE)
                else:
                    shade(cell, 'FFFFFF')
                txt = cell.text
                set_cell_text(cell, txt, size=max(6, font_size-0.5), color=TEXT)


def add_heading(doc, title, level=1):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12 if level == 1 else 7)
    p.paragraph_format.space_after = Pt(5)
    p.paragraph_format.keep_with_next = True
    r = p.add_run(title)
    r.font.name = 'Arial'
    r.font.size = Pt(13 if level == 1 else 10.5)
    r.bold = True
    r.font.color.rgb = RGBColor.from_string('0F172A' if level == 1 else '1E3A8A')
    if level == 1:
        pPr = p._p.get_or_add_pPr()
        pBdr = OxmlElement('w:pBdr')
        bottom = OxmlElement('w:bottom')
        bottom.set(qn('w:val'), 'single')
        bottom.set(qn('w:sz'), '14')
        bottom.set(qn('w:space'), '5')
        bottom.set(qn('w:color'), BLUE)
        pBdr.append(bottom)
        pPr.append(pBdr)
    return p


doc = Document()
sec = doc.sections[0]
sec.top_margin = Inches(.62)
sec.bottom_margin = Inches(.62)
sec.left_margin = Inches(.62)
sec.right_margin = Inches(.62)

normal = doc.styles['Normal']
normal.font.name = 'Arial'
normal.font.size = Pt(9)
normal.font.color.rgb = RGBColor.from_string(TEXT)
normal.paragraph_format.space_after = Pt(4)
normal.paragraph_format.line_spacing = 1.12

# Dark navy title panel, inspired by the supplied school report.
header = doc.add_table(rows=1, cols=1)
header.alignment = WD_TABLE_ALIGNMENT.CENTER
header.autofit = True
cell = header.cell(0, 0)
shade(cell, NAVY)
set_cell_margins(cell, top=280, bottom=280, start=220, end=220)
cell.text = ''
for i, (text, size, bold, color) in enumerate([
    ('SMK BALAI PERGURUAN PUTRI BANDUNG', 11, True, 'B7C7E5'),
    ('LAPORAN ABSENSI & EVALUASI EKSTRAKURIKULER', 17, True, 'FFFFFF'),
    ('Laporan Bidang Kesiswaan — Periode [TANGGAL AWAL] s.d. [TANGGAL AKHIR]', 9, False, 'C8D9F2')
]):
    p = cell.paragraphs[0] if i == 0 else cell.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(4 if i < 2 else 0)
    p.paragraph_format.space_before = Pt(4 if i > 0 else 0)
    r = p.add_run(text)
    r.font.name = 'Arial'
    r.font.size = Pt(size)
    r.bold = bold
    r.font.color.rgb = RGBColor.from_string(color)

p = doc.add_paragraph()
p.paragraph_format.space_after = Pt(4)

# Four metrics, matching the report's blue strip.
metrics = doc.add_table(rows=2, cols=4)
metrics.alignment = WD_TABLE_ALIGNMENT.CENTER
metrics.autofit = True
labels = ['TOTAL EKSTRAKURIKULER', 'PARTISIPASI AKTIF (RUJUKAN)', 'ABSENSI COACH', 'CATATAN ANGGOTA']
values = ['6 Bidang', '162 Entri', '[AUTO]', '[AUTO]']
for j in range(4):
    shade(metrics.cell(0,j), BLUE)
    set_cell_text(metrics.cell(0,j), labels[j], size=7, bold=True, color='FFFFFF', align=WD_ALIGN_PARAGRAPH.CENTER)
    shade(metrics.cell(1,j), PALE)
    set_cell_text(metrics.cell(1,j), values[j], size=12, bold=True, color='0F172A', align=WD_ALIGN_PARAGRAPH.CENTER)

# Executive summary callout.
summary = doc.add_table(rows=1, cols=1)
summary.alignment = WD_TABLE_ALIGNMENT.CENTER
cell = summary.cell(0,0)
shade(cell, 'F7F9FC')
set_cell_margins(cell, top=130, bottom=130, start=150, end=150)
# left blue border
p = cell.paragraphs[0]
p.paragraph_format.space_after = Pt(2)
r = p.add_run('RINGKASAN EKSEKUTIF\n')
r.bold = True; r.font.name = 'Arial'; r.font.size = Pt(10); r.font.color.rgb = RGBColor.from_string('0F172A')
r = p.add_run('Rekap absensi coach, bukti foto, data lokasi, serta kehadiran dan evaluasi anggota yang tercatat pada periode laporan. Angka partisipasi aktif 162 entri merupakan referensi laporan TA 2025/2026.')
r.font.name = 'Arial'; r.font.size = Pt(8.5); r.font.color.rgb = RGBColor.from_string(TEXT)

add_heading(doc, 'BAB I: REKAPITULASI ABSENSI COACH', 1)
p = doc.add_paragraph('Waktu pada tabel di bawah dicatat oleh server dengan zona waktu Asia/Jakarta. Koordinat, akurasi GPS, dan bukti foto menjadi lampiran verifikasi kehadiran coach.')
p.paragraph_format.space_after = Pt(5)
coach_headers = ['No.', 'Tanggal', 'Jam Server', 'Ekstrakurikuler', 'Pembina / Coach', 'Koordinat & Akurasi GPS', 'Bukti Foto']
t = doc.add_table(rows=2, cols=len(coach_headers))
for j, h in enumerate(coach_headers):
    set_cell_text(t.cell(0,j), h, size=6.5, bold=True, color='FFFFFF', align=WD_ALIGN_PARAGRAPH.CENTER)
    shade(t.cell(0,j), BLUE)
    set_cell_text(t.cell(1,j), '[AUTO]', size=6.5, color=TEXT)
    shade(t.cell(1,j), PALE)
style_table(t, headers=True, font_size=6.5)

add_heading(doc, 'BAB II: REKAPITULASI KEHADIRAN & EVALUASI ANGGOTA', 1)
p = doc.add_paragraph('Kehadiran anggota dan penilaian diisi oleh coach setelah check-in. Nilai menggunakan rentang 0–100; catatan coach bersifat opsional.')
p.paragraph_format.space_after = Pt(5)
member_headers = ['No.', 'Tanggal', 'Coach', 'Ekstrakurikuler', 'Nama Anggota', 'Kelas', 'Kehadiran', 'Nilai', 'Catatan']
t2 = doc.add_table(rows=2, cols=len(member_headers))
for j, h in enumerate(member_headers):
    set_cell_text(t2.cell(0,j), h, size=6, bold=True, color='FFFFFF', align=WD_ALIGN_PARAGRAPH.CENTER)
    shade(t2.cell(0,j), BLUE)
    set_cell_text(t2.cell(1,j), '[AUTO]', size=6, color=TEXT)
    shade(t2.cell(1,j), PALE)
style_table(t2, headers=True, font_size=6)

add_heading(doc, 'BAB III: IDENTITAS PROGRAM EKSTRAKURIKULER', 1)
program_headers = ['No.', 'Ekstrakurikuler', 'Pembina / Coach', 'Ketua / Koordinator', 'Partisipasi Aktif', 'Hari Latihan']
program_rows = [
    ['1', 'Seni Musik', 'Sahrul Mubarok, S. Pd.', 'Faris Al Fathir', '44 siswa', 'Senin & Selasa'],
    ['2', 'English Club', 'Ms. Salsabila Maulida Aisyah Fristi Juniar, S. Pd.', 'Ade', '41 siswa', 'Rabu'],
    ['3', 'Boxing', 'H. Gilang Muhammad Farji Faresi, M. Pd.', 'Muhammad Akram', '27 siswa', 'Senin'],
    ['4', 'Futsal', 'M. Rasyid, S. Pd.', 'Variel', '20 siswa', 'Rabu'],
    ['5', 'Seni Tari', 'Ghina Zalfa Dewi, S. Pd.', 'Jasmine', '16 siswa', 'Kamis'],
    ['6', 'Basket', 'Lizaldi Ramandhika, S. Pd. / Cselia Midtsaluna, S. Pd.', 'Alif', '14 siswa', 'Kamis']
]
t3 = doc.add_table(rows=1, cols=len(program_headers))
for j, h in enumerate(program_headers):
    set_cell_text(t3.cell(0,j), h, size=6.5, bold=True, color='FFFFFF', align=WD_ALIGN_PARAGRAPH.CENTER)
    shade(t3.cell(0,j), BLUE)
for row in program_rows:
    cells = t3.add_row().cells
    for j, value in enumerate(row):
        set_cell_text(cells[j], value, size=6.5, color=TEXT)
        if len(t3.rows) % 2 == 0:
            shade(cells[j], PALE)
style_table(t3, headers=True, font_size=6.5)

add_heading(doc, 'PENGESAHAN', 1)
sig = doc.add_table(rows=2, cols=2)
sig.alignment = WD_TABLE_ALIGNMENT.CENTER
sig.autofit = True
set_cell_text(sig.cell(0,0), 'Mengetahui,\nWAKASEK KESISWAAN', size=8.5, color=TEXT)
set_cell_text(sig.cell(0,1), 'Bandung, [TANGGAL LAPORAN]\nKOORDINATOR EKSTRAKURIKULER', size=8.5, color=TEXT)
set_cell_text(sig.cell(1,0), '\n\n\nNABILA PUTRI SONJAYA, S. PD.', size=8.5, bold=True, color=TEXT)
set_cell_text(sig.cell(1,1), '\n\n\nSAHRUL MUBAROK, S. PD.', size=8.5, bold=True, color=TEXT)

footer = sec.footer.paragraphs[0]
footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = footer.add_run('SMK BALAI PERGURUAN PUTRI BANDUNG  ·  REKAP ABSENSI EKSTRAKURIKULER')
r.font.name = 'Arial'; r.font.size = Pt(7); r.font.color.rgb = RGBColor.from_string(MUTED)

doc.core_properties.title = 'Template Laporan Absensi Ekstrakurikuler SMK BPP Bandung'
doc.core_properties.subject = 'Template rekap absensi coach, anggota, dan evaluasi ekstrakurikuler'
doc.core_properties.author = 'SMK Balai Perguruan Putri Bandung'
doc.save(OUT)
print(OUT)
