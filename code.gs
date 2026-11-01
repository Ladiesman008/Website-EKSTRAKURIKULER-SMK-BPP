/**
 * SISTEM ABSENSI & EVALUASI COACH — EKSTRAKURIKULER MUSIK SMK BPP BANDUNG
 * Backend Google Apps Script (V8), bound ke Google Spreadsheet.
 * Sheet lama "Anggota" dipertahankan; sheet Postingan/Likes lama tidak dihapus.
 */

const TZ = 'Asia/Jakarta';
const SESI_ADMIN_DETIK = 21600;
const DIVISI = [
  'Musik Modern',
  'Musik Tradisional (Angklung & Gamelan)',
  'Olah Vokal & Paduan Suara'
];
const STATUS_ABSENSI = ['Hadir', 'Izin', 'Sakit', 'Alpa'];
const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const HEADERS = {
  // Urutan kolom lama tetap dipertahankan supaya data proyek sebelumnya aman.
  Anggota: [
    'Waktu Daftar', 'Nama Lengkap', 'Kelas', 'Jurusan', 'Divisi', 'Jabatan',
    'Status Verifikasi', 'Username', 'Password Hash', 'Salt', 'Foto Profil', 'Bio', 'Folder ID', 'ID Anggota'
  ],
  Coach: ['ID Coach', 'Nama Coach', 'Divisi', 'Token Akses', 'Status', 'Dibuat Pada'],
  Absensi: ['ID Absensi', 'Tanggal', 'Sesi', 'ID Coach', 'Nama Coach', 'Divisi', 'ID Anggota', 'Nama Anggota', 'Kelas', 'Status Kehadiran', 'Waktu Simpan'],
  Penilaian: ['ID Penilaian', 'Tanggal', 'Sesi', 'ID Coach', 'Nama Coach', 'Divisi', 'ID Anggota', 'Nama Anggota', 'Kelas', 'Nilai', 'Catatan Coach', 'Waktu Simpan']
};

// ---------- Response helpers ----------
function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
function ok_(value) { return json_(Object.assign({ result: 'success' }, value || {})); }
function fail_(message, extra) { return json_(Object.assign({ result: 'error', message: String(message || 'Terjadi kesalahan.') }, extra || {})); }
function text_(value, max) {
  const result = String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max || 180);
  return /^[=+\-@]/.test(result) ? "'" + result : result;
}
function uuid_() { return Utilities.getUuid().replace(/-/g, ''); }
function prop_(key) { return PropertiesService.getScriptProperties().getProperty(key) || ''; }
function adminUsername_() { return prop_('ADMIN_USER').trim().toLowerCase(); }

// ---------- Sheets ----------
function ss_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Script harus terikat (bound) pada Google Spreadsheet database.');
  return ss;
}
function sheet_(name) {
  if (!HEADERS[name]) throw new Error('Nama sheet tidak dikenal: ' + name);
  const ss = ss_();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);

  const needed = HEADERS[name];
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, needed.length).setValues([needed]);
    sh.setFrozenRows(1);
  } else {
    const lastCol = Math.max(sh.getLastColumn(), 1);
    const existing = sh.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(v => String(v).trim());
    needed.forEach(header => {
      if (existing.indexOf(header) < 0) {
        const newCol = sh.getLastColumn() + 1;
        sh.getRange(1, newCol).setValue(header);
        existing.push(header);
      }
    });
    sh.setFrozenRows(1);
  }
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold');
  return sh;
}
function headerMap_(sh) {
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
  const map = {};
  headers.forEach((name, index) => { map[String(name).trim()] = index; });
  return map;
}
function rows_(sh) {
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
}
function get_(row, map, key) {
  const index = map[key];
  return index == null ? '' : row[index];
}
function ensureMemberIds_() {
  const sh = sheet_('Anggota');
  const map = headerMap_(sh);
  const col = map['ID Anggota'] + 1;
  const last = sh.getLastRow();
  if (last < 2) return;
  const values = sh.getRange(2, col, last - 1, 1).getValues();
  let changed = false;
  values.forEach((row, i) => {
    if (!String(row[0] || '').trim()) {
      row[0] = uuid_();
      changed = true;
    }
  });
  if (changed) sh.getRange(2, col, values.length, 1).setValues(values);
}

// Anggota dianggap aktif jika sudah disetujui dan tidak diberi penanda nonaktif/alumni/keluar.
function activeMembers_(division) {
  ensureMemberIds_();
  const sh = sheet_('Anggota');
  const map = headerMap_(sh);
  return rows_(sh).map((row, index) => ({
    id: String(get_(row, map, 'ID Anggota') || ''),
    nama: String(get_(row, map, 'Nama Lengkap') || ''),
    kelas: String(get_(row, map, 'Kelas') || ''),
    divisi: String(get_(row, map, 'Divisi') || ''),
    jabatan: String(get_(row, map, 'Jabatan') || ''),
    status: String(get_(row, map, 'Status Verifikasi') || '').trim(),
    rowNumber: index + 2
  })).filter(member => {
    const role = member.jabatan.toLowerCase();
    const isApproved = member.status === 'Disetujui';
    const notInactive = !/(non.?aktif|tidak aktif|alumni|keluar)/i.test(role);
    const sameDivision = !division || division === 'Semua Divisi' || member.divisi === division;
    return isApproved && notInactive && member.nama && sameDivision;
  }).map(member => ({ id: member.id, nama: member.nama, kelas: member.kelas, divisi: member.divisi }));
}

// ---------- Coach access links ----------
function coachByToken_(token) {
  const value = String(token || '').trim();
  if (!value || value.length < 32) return null;
  const sh = sheet_('Coach');
  const map = headerMap_(sh);
  const found = rows_(sh).find(row => String(get_(row, map, 'Token Akses')) === value && String(get_(row, map, 'Status')).toLowerCase() === 'aktif');
  if (!found) return null;
  return {
    id: String(get_(found, map, 'ID Coach')),
    nama: String(get_(found, map, 'Nama Coach')),
    divisi: String(get_(found, map, 'Divisi'))
  };
}
function createCoach_(name, division) {
  const nama = text_(name, 100);
  const divisi = String(division || '').trim();
  if (!nama) throw new Error('Nama coach wajib diisi.');
  if (DIVISI.indexOf(divisi) < 0 && divisi !== 'Semua Divisi') throw new Error('Divisi tidak sesuai daftar ekstrakurikuler.');
  const sh = sheet_('Coach');
  const id = uuid_();
  const token = uuid_() + uuid_();
  sh.appendRow([id, nama, divisi, token, 'Aktif', new Date()]);
  return { id, nama, divisi, token, url: coachUrl_(token) };
}
function coachUrl_(token) {
  const base = prop_('WEBSITE_URL').trim();
  const query = 'coach=' + encodeURIComponent(token);
  if (!base) return 'Tambahkan ?' + query + ' pada URL website.';
  return base + (base.indexOf('?') >= 0 ? '&' : '?') + query;
}
function tambahCoach(nama, divisi) {
  const result = createCoach_(nama, divisi);
  Logger.log('Coach: ' + result.nama + ' (' + result.divisi + ')');
  Logger.log('Link akses: ' + result.url);
  Logger.log('Token akses (jaga kerahasiaannya): ' + result.token);
  return result;
}
function nonaktifkanCoach(idCoach) {
  const sh = sheet_('Coach');
  const map = headerMap_(sh);
  const data = rows_(sh);
  const index = data.findIndex(row => String(get_(row, map, 'ID Coach')) === String(idCoach));
  if (index < 0) throw new Error('Coach tidak ditemukan.');
  sh.getRange(index + 2, map['Status'] + 1).setValue('Nonaktif');
  return 'Akses coach berhasil dinonaktifkan.';
}
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Absensi Coach')
    .addItem('Buat link coach baru', 'menuTambahCoach_')
    .addItem('Nonaktifkan link coach', 'menuNonaktifkanCoach_')
    .addToUi();
}
function menuTambahCoach_() {
  const ui = SpreadsheetApp.getUi();
  const namePrompt = ui.prompt('Buat link coach', 'Masukkan nama coach:', ui.ButtonSet.OK_CANCEL);
  if (namePrompt.getSelectedButton() !== ui.Button.OK) return;
  const divisionPrompt = ui.prompt('Pilih divisi', 'Masukkan salah satu nama berikut secara lengkap:\n\n' + DIVISI.join('\n'), ui.ButtonSet.OK_CANCEL);
  if (divisionPrompt.getSelectedButton() !== ui.Button.OK) return;
  try {
    const result = createCoach_(namePrompt.getResponseText(), divisionPrompt.getResponseText());
    ui.alert('Link coach berhasil dibuat', 'Nama: ' + result.nama + '\nDivisi: ' + result.divisi + '\n\n' + result.url + '\n\nSimpan link ini dan bagikan hanya kepada coach terkait.', ui.ButtonSet.OK);
  } catch (error) {
    ui.alert('Tidak dapat membuat link', error.message, ui.ButtonSet.OK);
  }
}
function menuNonaktifkanCoach_() {
  const ui = SpreadsheetApp.getUi();
  const prompt = ui.prompt('Nonaktifkan link coach', 'Masukkan ID Coach dari sheet Coach:', ui.ButtonSet.OK_CANCEL);
  if (prompt.getSelectedButton() !== ui.Button.OK) return;
  try { ui.alert(nonaktifkanCoach(prompt.getResponseText().trim())); }
  catch (error) { ui.alert('Gagal', error.message, ui.ButtonSet.OK); }
}

// ---------- Dates and upsert helpers ----------
function dateFromInput_(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error('Format tanggal tidak valid.');
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 5, 0, 0));
}
function dateKey_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return Utilities.formatDate(value, TZ, 'yyyy-MM-dd');
  const str = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? '' : Utilities.formatDate(parsed, TZ, 'yyyy-MM-dd');
}
function dateLabel_(value) {
  const key = dateKey_(value);
  if (!key) return String(value || '');
  const parts = key.split('-').map(Number);
  return Utilities.formatDate(new Date(parts[0], parts[1] - 1, parts[2], 12), TZ, 'dd MMM yyyy');
}
function upsertByKey_(sh, keyHeader, keyValue, rowValues, keyFactory) {
  const map = headerMap_(sh);
  const rows = rows_(sh);
  const index = rows.findIndex(row => keyFactory(row, map) === keyValue);
  if (index >= 0) sh.getRange(index + 2, 1, 1, rowValues.length).setValues([rowValues]);
  else sh.appendRow(rowValues);
}
function attendanceKey_(row, map) {
  return [dateKey_(get_(row, map, 'Tanggal')), get_(row, map, 'Sesi'), get_(row, map, 'ID Coach'), get_(row, map, 'ID Anggota')].join('|');
}
function evaluationKey_(row, map) {
  return attendanceKey_(row, map);
}

// ---------- API: GET ----------
function doGet(e) {
  const p = e && e.parameter ? e.parameter : {};
  try {
    if (p.action === 'coach_info') {
      const coach = coachByToken_(p.coach);
      if (!coach) return fail_('Link coach tidak valid atau sudah dinonaktifkan.');
      const members = activeMembers_(coach.divisi);
      return ok_({ coach: { nama: coach.nama, divisi: coach.divisi }, members, recent: coachRecent_(coach, 25) });
    }
    return fail_('Aksi GET tidak dikenal.');
  } catch (error) {
    Logger.log(error);
    return fail_(error.message || 'Terjadi kesalahan server.');
  }
}

function coachRecent_(coach, limit) {
  const absensiSh = sheet_('Absensi');
  const nilaiSh = sheet_('Penilaian');
  const am = headerMap_(absensiSh), nm = headerMap_(nilaiSh);
  const scores = {};
  rows_(nilaiSh).forEach(row => {
    const key = evaluationKey_(row, nm);
    scores[key] = { score: get_(row, nm, 'Nilai'), note: get_(row, nm, 'Catatan Coach') };
  });
  return rows_(absensiSh).filter(row => String(get_(row, am, 'ID Coach')) === coach.id)
    .sort((a, b) => new Date(get_(b, am, 'Waktu Simpan')).getTime() - new Date(get_(a, am, 'Waktu Simpan')).getTime())
    .slice(0, limit)
    .map(row => {
      const key = attendanceKey_(row, am);
      const evaluation = scores[key] || {};
      return {
        dateLabel: dateLabel_(get_(row, am, 'Tanggal')),
        member: String(get_(row, am, 'Nama Anggota')),
        status: String(get_(row, am, 'Status Kehadiran')),
        score: evaluation.score == null ? '—' : evaluation.score,
        note: evaluation.note || ''
      };
    });
}

// ---------- API: POST ----------
function doPost(e) {
  const p = e && e.parameter ? e.parameter : {};
  const lock = LockService.getScriptLock();
  let locked = false;
  try {
    lock.waitLock(20000);
    locked = true;
    switch (p.action) {
      case 'admin_login': return adminLogin_(p);
      case 'save_attendance': return saveAttendance_(p);
      case 'report_data': return reportData_(p);
      case 'export_docx': return exportDocx_(p);
      default: return fail_('Aksi POST tidak dikenal.');
    }
  } catch (error) {
    Logger.log(error && error.stack ? error.stack : error);
    return fail_(error.message || 'Terjadi kesalahan server.');
  } finally {
    if (locked) lock.releaseLock();
  }
}

function adminLogin_(p) {
  const username = String(p.username || '').trim().toLowerCase();
  const password = String(p.password || '');
  const expectedUser = adminUsername_();
  const expectedPass = prop_('ADMIN_PASS');
  if (!expectedUser || !expectedPass) return fail_('ADMIN_USER dan ADMIN_PASS belum diatur pada Script Properties.');
  if (username !== expectedUser || password !== expectedPass) return fail_('Username atau password administrator salah.');
  const token = uuid_() + uuid_();
  CacheService.getScriptCache().put('admin_' + token, 'valid', SESI_ADMIN_DETIK);
  return ok_({ token, message: 'Berhasil masuk sebagai administrator.' });
}
function requireAdmin_(token) {
  return !!token && CacheService.getScriptCache().get('admin_' + token) === 'valid';
}

function saveAttendance_(p) {
  const coach = coachByToken_(p.coach);
  if (!coach) return fail_('Link coach tidak valid atau sudah dinonaktifkan.');
  const dateString = String(p.date || '');
  const date = dateFromInput_(dateString);
  const session = text_(p.session, 60);
  if (!session) return fail_('Nama sesi wajib diisi.');

  let requested;
  try { requested = JSON.parse(p.records || '[]'); }
  catch (error) { return fail_('Data anggota tidak dapat dibaca.'); }
  if (!Array.isArray(requested) || !requested.length) return fail_('Tidak ada data anggota untuk disimpan.');
  if (requested.length > 250) return fail_('Jumlah anggota melebihi batas pemrosesan.');

  const active = activeMembers_(coach.divisi);
  const activeById = {};
  active.forEach(member => { activeById[member.id] = member; });
  const attendanceSh = sheet_('Absensi');
  const evaluationSh = sheet_('Penilaian');
  const now = new Date();
  let saved = 0;

  requested.forEach(item => {
    const member = activeById[String(item.memberId || '')];
    if (!member) throw new Error('Daftar anggota berubah atau anggota tidak termasuk divisi coach. Muat ulang halaman.');
    const status = String(item.status || '');
    if (STATUS_ABSENSI.indexOf(status) < 0) throw new Error('Status kehadiran tidak valid untuk ' + member.nama + '.');
    const score = Number(item.score);
    if (!Number.isFinite(score) || score < 0 || score > 100 || Math.floor(score) !== score) {
      throw new Error('Nilai harus berupa bilangan bulat 0 sampai 100 untuk ' + member.nama + '.');
    }
    const note = text_(item.note, 180);
    const key = [dateString, session, coach.id, member.id].join('|');

    const attendanceRow = [uuid_(), date, session, coach.id, coach.nama, coach.divisi, member.id, member.nama, member.kelas, status, now];
    const evaluationRow = [uuid_(), date, session, coach.id, coach.nama, coach.divisi, member.id, member.nama, member.kelas, score, note, now];
    upsertByKey_(attendanceSh, 'ID Absensi', key, attendanceRow, attendanceKey_);
    upsertByKey_(evaluationSh, 'ID Penilaian', key, evaluationRow, evaluationKey_);
    saved++;
  });
  return ok_({ message: 'Absensi dan penilaian ' + saved + ' anggota berhasil disimpan. Pengiriman ulang pada coach, tanggal, dan sesi yang sama akan memperbarui data sebelumnya.', saved });
}

// ---------- Reporting ----------
function getReportRows_(from, to, division) {
  const attendanceSh = sheet_('Absensi');
  const evaluationSh = sheet_('Penilaian');
  const am = headerMap_(attendanceSh), nm = headerMap_(evaluationSh);
  const evaluations = {};
  rows_(evaluationSh).forEach(row => {
    evaluations[evaluationKey_(row, nm)] = {
      score: get_(row, nm, 'Nilai'),
      note: String(get_(row, nm, 'Catatan Coach') || '')
    };
  });
  return rows_(attendanceSh).map(row => {
    const key = attendanceKey_(row, am);
    const evaluation = evaluations[key] || {};
    const rawDate = get_(row, am, 'Tanggal');
    return {
      date: dateKey_(rawDate),
      dateLabel: dateLabel_(rawDate),
      session: String(get_(row, am, 'Sesi')),
      coach: String(get_(row, am, 'Nama Coach')),
      division: String(get_(row, am, 'Divisi')),
      member: String(get_(row, am, 'Nama Anggota')),
      className: String(get_(row, am, 'Kelas')),
      status: String(get_(row, am, 'Status Kehadiran')),
      score: evaluation.score == null ? '' : evaluation.score,
      note: evaluation.note || ''
    };
  }).filter(row => row.date && row.date >= from && row.date <= to && (division === 'Semua Divisi' || row.division === division))
    .sort((a, b) => a.date.localeCompare(b.date) || a.member.localeCompare(b.member, 'id'));
}
function validateReportRequest_(p) {
  const from = String(p.from || ''), to = String(p.to || ''), division = String(p.division || 'Semua Divisi');
  dateFromInput_(from);
  dateFromInput_(to);
  if (from > to) throw new Error('Tanggal awal tidak boleh melewati tanggal akhir.');
  if (division !== 'Semua Divisi' && DIVISI.indexOf(division) < 0) throw new Error('Pilihan divisi tidak valid.');
  return { from, to, division };
}
function reportData_(p) {
  if (!requireAdmin_(p.adminToken)) return fail_('Sesi administrator berakhir. Silakan masuk kembali.', { expired: true });
  const filter = validateReportRequest_(p);
  const data = getReportRows_(filter.from, filter.to, filter.division);
  return ok_({
    fromLabel: dateLabel_(filter.from),
    toLabel: dateLabel_(filter.to),
    division: filter.division,
    rows: data
  });
}
function safeFileName_(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80);
}
function exportDocx_(p) {
  if (!requireAdmin_(p.adminToken)) return fail_('Sesi administrator berakhir. Silakan masuk kembali.', { expired: true });
  const filter = validateReportRequest_(p);
  const data = getReportRows_(filter.from, filter.to, filter.division);
  if (!data.length) return fail_('Tidak ada data pada periode tersebut. Pilih periode lain sebelum mengunduh.');

  const divisionName = filter.division === 'Semua Divisi' ? 'Semua Divisi' : filter.division;
  const title = 'Laporan Absensi Coach SMK BPP Bandung';
  const doc = DocumentApp.create(title);
  const docId = doc.getId();
  try {
    const body = doc.getBody();
    body.clear();
    const heading = body.appendParagraph('SMK BPP BANDUNG');
    heading.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    heading.editAsText().setBold(true).setFontFamily('Arial').setFontSize(13).setForegroundColor('#25232D');
    const sub = body.appendParagraph('EKSTRAKURIKULER MUSIK');
    sub.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    sub.editAsText().setBold(true).setFontFamily('Arial').setFontSize(10).setForegroundColor('#65528E');
    const titleP = body.appendParagraph('LAPORAN ABSENSI DAN PENILAIAN COACH');
    titleP.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    titleP.setSpacingBefore(14).setSpacingAfter(8);
    titleP.editAsText().setBold(true).setFontFamily('Arial').setFontSize(14);

    const info = body.appendParagraph('Periode: ' + dateLabel_(filter.from) + ' s.d. ' + dateLabel_(filter.to) + '\nDivisi: ' + divisionName);
    info.setSpacingAfter(12);
    info.editAsText().setFontFamily('Arial').setFontSize(9);

    const counts = { Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0 };
    const scores = [];
    data.forEach(row => {
      if (Object.prototype.hasOwnProperty.call(counts, row.status)) counts[row.status]++;
      if (row.score !== '' && Number.isFinite(Number(row.score))) scores.push(Number(row.score));
    });
    const average = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '-';
    const summary = body.appendParagraph('Ringkasan: ' + data.length + ' catatan · Hadir ' + counts.Hadir + ' · Izin ' + counts.Izin + ' · Sakit ' + counts.Sakit + ' · Alpa ' + counts.Alpa + ' · Rata-rata nilai ' + average);
    summary.setSpacingAfter(10);
    summary.editAsText().setFontFamily('Arial').setFontSize(8);

    const tableData = [['Tanggal', 'Sesi', 'Coach', 'Nama Anggota', 'Kelas', 'Divisi', 'Kehadiran', 'Nilai', 'Catatan']];
    data.forEach(row => tableData.push([
      row.dateLabel, row.session, row.coach, row.member, row.className, row.division,
      row.status, String(row.score === '' ? '-' : row.score), row.note || '-'
    ]));
    const table = body.appendTable(tableData);
    for (let r = 0; r < table.getNumRows(); r++) {
      const tableRow = table.getRow(r);
      for (let c = 0; c < tableRow.getNumCells(); c++) {
        const cell = tableRow.getCell(c);
        const cellText = cell.getChild(0).asParagraph().editAsText();
        cellText.setFontFamily('Arial').setFontSize(r === 0 ? 8 : 7);
        if (r === 0) {
          cell.setBackgroundColor('#292533');
          cellText.setBold(true).setForegroundColor('#FFFFFF');
        } else if (r % 2 === 0) {
          cell.setBackgroundColor('#F1EFF6');
        }
      }
    }

    const footer = body.appendParagraph('\nDokumen dibuat otomatis dari sistem Absensi Coach Ekstrakurikuler Musik SMK BPP Bandung.');
    footer.setSpacingBefore(12);
    footer.editAsText().setFontFamily('Arial').setFontSize(8).setItalic(true).setForegroundColor('#666666');
    doc.saveAndClose();

    const filename = 'Laporan_Absensi_Coach_' + safeFileName_(filter.from) + '_sd_' + safeFileName_(filter.to) + '.docx';
    const blob = DriveApp.getFileById(docId).getAs(MIME_DOCX).setName(filename);
    const base64 = Utilities.base64Encode(blob.getBytes());
    DriveApp.getFileById(docId).setTrashed(true);
    return ok_({ filename, mimeType: MIME_DOCX, base64, rows: data.length });
  } catch (error) {
    try { DriveApp.getFileById(docId).setTrashed(true); } catch (cleanupError) { Logger.log(cleanupError); }
    throw error;
  }
}

// ---------- Setup & spreadsheet menu ----------
function setupAll() {
  ['Anggota', 'Coach', 'Absensi', 'Penilaian'].forEach(name => sheet_(name));
  ensureMemberIds_();
  const ss = ss_();
  Logger.log('Database siap: ' + ss.getUrl());
  Logger.log('Jumlah anggota yang sudah disetujui: ' + activeMembers_('Semua Divisi').length);
  Logger.log('Pastikan Script Properties ADMIN_USER dan ADMIN_PASS telah diisi.');
  Logger.log('Isi WEBSITE_URL dengan alamat website (mis. URL GitHub Pages) agar menu pembuatan coach menghasilkan link lengkap.');
}
