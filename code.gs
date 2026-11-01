/**
 * SISTEM ABSENSI COACH — EKSTRAKURIKULER SMK BALAI PERGURUAN PUTRI BANDUNG
 * Google Apps Script V8, bound ke Google Spreadsheet.
 * Waktu absensi ditentukan oleh server Apps Script (Asia/Jakarta), bukan jam perangkat.
 */
const TZ = 'Asia/Jakarta';
const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const ADMIN_SESSION_SECONDS = 21600;
const STATUS_ANGGOTA = ['Hadir', 'Izin', 'Sakit', 'Alpa'];
const DIVISIONS = ['Seni Musik', 'English Club', 'Boxing', 'Futsal', 'Seni Tari', 'Basket'];

const EXTRACURRICULAR_SEED = [
  { id: 'seni-musik', name: 'Seni Musik', coaches: ['Sahrul Mubarok, S. Pd.'], chair: 'Faris Al Fathir', count: 44, schedule: 'Senin & Selasa' },
  { id: 'english-club', name: 'English Club', coaches: ['Ms. Salsabila Maulida Aisyah Fristi Juniar, S. Pd.'], chair: 'Ade', count: 41, schedule: 'Rabu' },
  { id: 'boxing', name: 'Boxing', coaches: ['H. Gilang Muhammad Farji Faresi, M. Pd.'], chair: 'Muhammad Akram', count: 27, schedule: 'Senin' },
  { id: 'futsal', name: 'Futsal', coaches: ['M. Rasyid, S. Pd.'], chair: 'Variel', count: 20, schedule: 'Rabu' },
  { id: 'seni-tari', name: 'Seni Tari', coaches: ['Ghina Zalfa Dewi, S. Pd.'], chair: 'Jasmine', count: 16, schedule: 'Kamis' },
  { id: 'basket', name: 'Basket', coaches: ['Lizaldi Ramandhika, S. Pd.', 'Cselia Midtsaluna, S. Pd.'], chair: 'Alif', count: 14, schedule: 'Kamis' }
];

const HEADERS = {
  // Sheet Anggota lama tidak diubah. Roster baru ditempatkan pada AnggotaAktif.
  AnggotaAktif: ['ID Anggota', 'Nama Lengkap', 'Kelas', 'Ekstrakurikuler', 'Status', 'Catatan'],
  Ekstrakurikuler: ['ID', 'Nama Ekstrakurikuler', 'Pembina / Coach', 'Ketua / Koordinator', 'Partisipasi Aktif (TA 2025/2026)', 'Hari Latihan'],
  Coach: ['ID Coach', 'Nama Coach', 'Ekstrakurikuler', 'Token Akses', 'Status', 'Dibuat Pada', 'Link Akses'],
  AbsensiCoach: ['ID Absensi Coach', 'Tanggal', 'Waktu Server', 'ID Coach', 'Nama Coach', 'Ekstrakurikuler', 'Latitude', 'Longitude', 'Akurasi GPS (m)', 'Link Peta', 'ID Foto Drive', 'URL Foto'],
  AbsensiAnggota: ['ID Catatan', 'ID Absensi Coach', 'Tanggal', 'Waktu Server', 'ID Coach', 'Nama Coach', 'Ekstrakurikuler', 'ID Anggota', 'Nama Anggota', 'Kelas', 'Status Kehadiran'],
  Penilaian: ['ID Penilaian', 'ID Absensi Coach', 'Tanggal', 'Waktu Server', 'ID Coach', 'Nama Coach', 'Ekstrakurikuler', 'ID Anggota', 'Nama Anggota', 'Kelas', 'Nilai', 'Catatan Coach']
};

// ------------------------------- Utilities -------------------------------
function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
function ok_(value) { return json_(Object.assign({ result: 'success' }, value || {})); }
function fail_(message, extra) { return json_(Object.assign({ result: 'error', message: String(message || 'Terjadi kesalahan.') }, extra || {})); }
function uuid_() { return Utilities.getUuid().replace(/-/g, ''); }
function prop_(key) { return PropertiesService.getScriptProperties().getProperty(key) || ''; }
function cleanText_(value, max) {
  const result = String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max || 180);
  return /^[=+\-@]/.test(result) ? "'" + result : result;
}
function adminUsername_() { return prop_('ADMIN_USER').trim().toLowerCase(); }
function ss_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Script harus terikat (bound) pada Google Spreadsheet database.');
  return ss;
}
function sheet_(name) {
  if (!HEADERS[name]) throw new Error('Sheet tidak dikenal: ' + name);
  const ss = ss_();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  const required = HEADERS[name];
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, required.length).setValues([required]);
    sh.setFrozenRows(1);
  } else {
    const existing = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getDisplayValues()[0].map(String);
    required.forEach(header => {
      if (existing.indexOf(header) < 0) {
        const col = sh.getLastColumn() + 1;
        sh.getRange(1, col).setValue(header);
        existing.push(header);
      }
    });
    sh.setFrozenRows(1);
  }
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground('#1f3b82').setFontColor('#ffffff');
  return sh;
}
function headerMap_(sh) {
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
  const map = {};
  headers.forEach((name, index) => { map[String(name).trim()] = index; });
  return map;
}
function objectRows_(sh) {
  if (sh.getLastRow() < 2) return [];
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
  return sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues().map((row, index) => {
    const obj = { _row: index + 2 };
    headers.forEach((name, col) => { obj[String(name).trim()] = row[col]; });
    return obj;
  });
}
function appendObject_(sh, obj) {
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
  sh.appendRow(headers.map(name => Object.prototype.hasOwnProperty.call(obj, name) ? obj[name] : ''));
  return sh.getLastRow();
}
function updateObject_(sh, rowNumber, obj) {
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
  const row = sh.getRange(rowNumber, 1, 1, sh.getLastColumn()).getValues()[0];
  headers.forEach((name, index) => {
    if (Object.prototype.hasOwnProperty.call(obj, name)) row[index] = obj[name];
  });
  sh.getRange(rowNumber, 1, 1, row.length).setValues([row]);
}
function dateKey_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return Utilities.formatDate(value, TZ, 'yyyy-MM-dd');
  const text = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? '' : Utilities.formatDate(parsed, TZ, 'yyyy-MM-dd');
}
function dateLabel_(value) {
  const key = dateKey_(value);
  if (!key) return String(value || '');
  const parts = key.split('-').map(Number);
  return Utilities.formatDate(new Date(parts[0], parts[1] - 1, parts[2], 12), TZ, 'dd MMMM yyyy');
}
function timeLabel_(value) {
  if (!(value instanceof Date) || isNaN(value.getTime())) return '';
  return Utilities.formatDate(value, TZ, 'HH:mm:ss');
}
function dateTimeLabel_(value) {
  if (!(value instanceof Date) || isNaN(value.getTime())) return '';
  return Utilities.formatDate(value, TZ, 'dd MMM yyyy, HH:mm:ss');
}
function dateFromInput_(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error('Format tanggal laporan tidak valid.');
  const y = Number(match[1]), m = Number(match[2]), d = Number(match[3]);
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) throw new Error('Tanggal laporan tidak valid.');
  return String(value);
}
function currentDateKey_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
function mapUrl_(lat, lon) { return 'https://www.google.com/maps?q=' + encodeURIComponent(String(lat) + ',' + String(lon)); }
function findObject_(sh, header, value) { return objectRows_(sh).find(row => String(row[header] || '') === String(value)) || null; }

// ------------------------- Seed data & coach links -------------------------
function seedExtracurriculars_() {
  const sh = sheet_('Ekstrakurikuler');
  const existing = objectRows_(sh);
  EXTRACURRICULAR_SEED.forEach(item => {
    const old = existing.find(row => String(row.ID) === item.id || String(row['Nama Ekstrakurikuler']) === item.name);
    const obj = {
      'ID': item.id,
      'Nama Ekstrakurikuler': item.name,
      'Pembina / Coach': item.coaches.join(' / '),
      'Ketua / Koordinator': item.chair,
      'Partisipasi Aktif (TA 2025/2026)': item.count,
      'Hari Latihan': item.schedule
    };
    if (old) updateObject_(sh, old._row, obj); else appendObject_(sh, obj);
  });
}
function coachWebsiteUrl_(token) {
  const base = prop_('WEBSITE_URL').trim();
  const query = 'coach=' + encodeURIComponent(token);
  if (!base) return '?' + query;
  return base + (base.indexOf('?') >= 0 ? '&' : '?') + query;
}
function createCoach_(name, extracurricular) {
  const coachName = cleanText_(name, 140);
  const ex = String(extracurricular || '').trim();
  if (!coachName) throw new Error('Nama coach wajib diisi.');
  if (DIVISIONS.indexOf(ex) < 0) throw new Error('Nama ekstrakurikuler tidak sesuai daftar resmi.');
  const sh = sheet_('Coach');
  const token = uuid_() + uuid_();
  const id = uuid_();
  const row = {
    'ID Coach': id,
    'Nama Coach': coachName,
    'Ekstrakurikuler': ex,
    'Token Akses': token,
    'Status': 'Aktif',
    'Dibuat Pada': new Date(),
    'Link Akses': coachWebsiteUrl_(token)
  };
  appendObject_(sh, row);
  return { id: id, nama: coachName, ekstrakurikuler: ex, token: token, url: row['Link Akses'] };
}
function seedCoaches_() {
  const sh = sheet_('Coach');
  const rows = objectRows_(sh);
  EXTRACURRICULAR_SEED.forEach(item => item.coaches.forEach(name => {
    const active = rows.find(row => String(row['Nama Coach']) === name && String(row['Ekstrakurikuler'] || row['Divisi']) === item.name && String(row.Status).toLowerCase() === 'aktif');
    if (!active) createCoach_(name, item.name);
  }));
  refreshCoachLinks_();
}
function refreshCoachLinks_() {
  const sh = sheet_('Coach');
  objectRows_(sh).forEach(row => {
    if (!row['Token Akses']) return;
    updateObject_(sh, row._row, { 'Link Akses': coachWebsiteUrl_(String(row['Token Akses'])) });
  });
}
function coachByToken_(token) {
  const value = String(token || '').trim();
  if (value.length < 48) return null;
  const row = objectRows_(sheet_('Coach')).find(item => String(item['Token Akses']) === value && String(item.Status).toLowerCase() === 'aktif');
  if (!row) return null;
  const extracurricular = String(row['Ekstrakurikuler'] || row.Divisi || '');
  if (DIVISIONS.indexOf(extracurricular) < 0) return null; // Menonaktifkan kompatibilitas link lama dari struktur Musik Modern.
  return { id: String(row['ID Coach']), nama: String(row['Nama Coach']), ekstrakurikuler: extracurricular };
}
function menuLinks_() {
  refreshCoachLinks_();
  SpreadsheetApp.getUi().alert('Link coach telah diperbarui. Buka sheet Coach, lalu salin kolom Link Akses sesuai nama coach. Link bersifat rahasia dan menjadi kunci akses absensi.');
}
function menuDeactivateCoach_() {
  const ui = SpreadsheetApp.getUi();
  const prompt = ui.prompt('Nonaktifkan link coach', 'Masukkan ID Coach dari sheet Coach:', ui.ButtonSet.OK_CANCEL);
  if (prompt.getSelectedButton() !== ui.Button.OK) return;
  const id = prompt.getResponseText().trim();
  const sh = sheet_('Coach');
  const row = objectRows_(sh).find(item => String(item['ID Coach']) === id);
  if (!row) return ui.alert('ID Coach tidak ditemukan.');
  updateObject_(sh, row._row, { Status: 'Nonaktif' });
  ui.alert('Link coach berhasil dinonaktifkan.');
}
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Absensi Coach')
    .addItem('Siapkan database & link coach', 'setupAll')
    .addItem('Perbarui / tampilkan link coach', 'menuLinks_')
    .addItem('Nonaktifkan link coach', 'menuDeactivateCoach_')
    .addToUi();
}

// ------------------------------- Members -----------------------------------
function ensureRosterIds_() {
  const sh = sheet_('AnggotaAktif');
  const rows = objectRows_(sh);
  rows.forEach(row => {
    if (!String(row['ID Anggota'] || '').trim()) updateObject_(sh, row._row, { 'ID Anggota': uuid_() });
  });
}
function activeMembers_(extracurricular) {
  ensureRosterIds_();
  return objectRows_(sheet_('AnggotaAktif')).filter(row => {
    const status = String(row.Status || '').trim().toLowerCase();
    return String(row['Ekstrakurikuler'] || '').trim() === extracurricular && ['aktif', 'disetujui'].indexOf(status) >= 0 && String(row['Nama Lengkap'] || '').trim();
  }).map(row => ({
    id: String(row['ID Anggota']),
    nama: String(row['Nama Lengkap']),
    kelas: String(row.Kelas || ''),
    ekstrakurikuler: String(row['Ekstrakurikuler'])
  }));
}

// ------------------------------- Photos ------------------------------------
function photoFolder_() {
  let folderId = prop_('PHOTO_FOLDER_ID');
  if (folderId) {
    try { return DriveApp.getFolderById(folderId); } catch (e) { Logger.log('Folder foto lama tidak tersedia; membuat folder baru.'); }
  }
  const folder = DriveApp.createFolder('Bukti Absensi Coach — SMK BPP Bandung');
  PropertiesService.getScriptProperties().setProperty('PHOTO_FOLDER_ID', folder.getId());
  return folder;
}
function savePhoto_(photoBase64, mimeType, coachName, dateKey) {
  const mime = String(mimeType || 'image/jpeg').toLowerCase();
  if (['image/jpeg', 'image/png', 'image/webp'].indexOf(mime) < 0) throw new Error('Format foto harus JPG, PNG, atau WEBP.');
  const encoded = String(photoBase64 || '');
  if (!encoded || encoded.length > 1600000) throw new Error('Foto kosong atau terlalu besar. Ambil ulang foto dengan ukuran lebih kecil.');
  const bytes = Utilities.base64Decode(encoded);
  const extension = mime === 'image/png' ? 'png' : (mime === 'image/webp' ? 'webp' : 'jpg');
  const filename = 'Absensi_' + String(coachName).replace(/[^a-zA-Z0-9]+/g, '_') + '_' + dateKey + '_' + new Date().getTime() + '.' + extension;
  const blob = Utilities.newBlob(bytes, mime, filename);
  const file = photoFolder_().createFile(blob);
  // Foto tetap private di Drive pemilik database. Dokumen DOCX dapat menyertakan salinan gambarnya.
  return { id: file.getId(), url: file.getUrl() };
}

// -------------------------------- Check-in ---------------------------------
function checkinRowForCoachDate_(coachId, dateKey) {
  return objectRows_(sheet_('AbsensiCoach')).find(row => String(row['ID Coach']) === String(coachId) && dateKey_(row.Tanggal) === dateKey) || null;
}
function checkinPublic_(row) {
  if (!row) return null;
  return {
    id: String(row['ID Absensi Coach']),
    date: dateKey_(row.Tanggal),
    waktuLabel: dateTimeLabel_(row['Waktu Server']),
    akurasi: Math.round(Number(row['Akurasi GPS (m)'] || 0)),
    mapUrl: String(row['Link Peta'] || ''),
    photoUrl: String(row['URL Foto'] || '')
  };
}
function saveCoachCheckin_(p) {
  const coach = coachByToken_(p.coach);
  if (!coach) return fail_('Link coach tidak valid atau sudah dinonaktifkan.');
  const lat = Number(p.latitude), lon = Number(p.longitude), accuracy = Number(p.accuracy);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) return fail_('Koordinat lokasi tidak valid.');
  if (!Number.isFinite(accuracy) || accuracy < 0) return fail_('Akurasi GPS tidak valid.');
  const now = new Date(); // Satu timestamp server untuk tanggal dan jam yang sama.
  const today = Utilities.formatDate(now, TZ, 'yyyy-MM-dd');
  const existing = checkinRowForCoachDate_(coach.id, today);
  if (existing) return fail_('Absensi coach untuk hari ini sudah tercatat.', { alreadyCheckedIn: true, checkin: checkinPublic_(existing) });
  const photo = savePhoto_(p.photoBase64, p.photoMime, coach.nama, today);
  const id = uuid_();
  const sh = sheet_('AbsensiCoach');
  try {
    appendObject_(sh, {
      'ID Absensi Coach': id,
      Tanggal: today,
      'Waktu Server': now,
      'ID Coach': coach.id,
      'Nama Coach': coach.nama,
      Ekstrakurikuler: coach.ekstrakurikuler,
      Latitude: lat,
      Longitude: lon,
      'Akurasi GPS (m)': accuracy,
      'Link Peta': mapUrl_(lat, lon),
      'ID Foto Drive': photo.id,
      'URL Foto': photo.url
    });
  } catch (error) {
    try { DriveApp.getFileById(photo.id).setTrashed(true); } catch (cleanupError) { Logger.log(cleanupError); }
    throw error;
  }
  const saved = {
    id: id,
    date: today,
    waktuLabel: dateTimeLabel_(now),
    akurasi: Math.round(accuracy),
    mapUrl: mapUrl_(lat, lon),
    photoUrl: photo.url
  };
  return ok_({ message: 'Absensi coach berhasil disimpan dengan waktu server.', checkin: saved });
}

// ----------------------- Member attendance / scores -----------------------
function saveMemberRecords_(p) {
  const coach = coachByToken_(p.coach);
  if (!coach) return fail_('Link coach tidak valid atau sudah dinonaktifkan.');
  const checkin = findObject_(sheet_('AbsensiCoach'), 'ID Absensi Coach', String(p.checkinId || ''));
  if (!checkin || String(checkin['ID Coach']) !== coach.id) return fail_('Absensi coach tidak ditemukan. Lakukan Absen Sekarang terlebih dahulu.');
  if (dateKey_(checkin.Tanggal) !== currentDateKey_()) return fail_('Sesi absensi sudah berganti hari. Muat ulang link coach dan lakukan absensi hari ini.');
  let requested;
  try { requested = JSON.parse(p.records || '[]'); } catch (e) { return fail_('Data anggota tidak dapat dibaca.'); }
  if (!Array.isArray(requested) || !requested.length || requested.length > 250) return fail_('Daftar anggota kosong atau melebihi batas pemrosesan.');

  const active = activeMembers_(coach.ekstrakurikuler);
  const byId = {};
  active.forEach(member => { byId[member.id] = member; });
  const seen = {};
  // Validasi seluruh payload lebih dahulu agar satu data tidak valid tidak meninggalkan
  // setengah daftar anggota tersimpan.
  const normalized = requested.map(item => {
    const member = byId[String(item.memberId || '')];
    if (!member) throw new Error('Anggota tidak termasuk roster aktif ekstrakurikuler coach ini. Muat ulang data.');
    if (seen[member.id]) throw new Error('Anggota yang sama dikirim lebih dari satu kali: ' + member.nama + '.');
    seen[member.id] = true;
    const status = String(item.status || '');
    if (STATUS_ANGGOTA.indexOf(status) < 0) throw new Error('Status kehadiran tidak valid untuk ' + member.nama + '.');
    const scoreText = String(item.score == null ? '' : item.score).trim();
    let score = '';
    if (scoreText !== '') {
      score = Number(scoreText);
      if (!Number.isInteger(score) || score < 0 || score > 100) throw new Error('Nilai harus bilangan bulat 0 sampai 100 untuk ' + member.nama + '.');
    }
    return { member: member, status: status, score: score, note: cleanText_(item.note, 250) };
  });

  const attendanceSheet = sheet_('AbsensiAnggota');
  const scoreSheet = sheet_('Penilaian');
  const date = dateKey_(checkin.Tanggal);
  const now = new Date();
  const attendanceRows = objectRows_(attendanceSheet);
  const scoreRows = objectRows_(scoreSheet);
  normalized.forEach(entry => {
    const member = entry.member;
    const existingAttendance = attendanceRows.find(row => String(row['ID Absensi Coach']) === String(checkin['ID Absensi Coach']) && String(row['ID Anggota']) === member.id);
    const attendanceObject = {
      'ID Catatan': existingAttendance ? existingAttendance['ID Catatan'] : uuid_(),
      'ID Absensi Coach': String(checkin['ID Absensi Coach']),
      Tanggal: date,
      'Waktu Server': now,
      'ID Coach': coach.id,
      'Nama Coach': coach.nama,
      Ekstrakurikuler: coach.ekstrakurikuler,
      'ID Anggota': member.id,
      'Nama Anggota': member.nama,
      Kelas: member.kelas,
      'Status Kehadiran': entry.status
    };
    if (existingAttendance) updateObject_(attendanceSheet, existingAttendance._row, attendanceObject);
    else appendObject_(attendanceSheet, attendanceObject);

    const existingScore = scoreRows.find(row => String(row['ID Absensi Coach']) === String(checkin['ID Absensi Coach']) && String(row['ID Anggota']) === member.id);
    const scoreObject = {
      'ID Penilaian': existingScore ? existingScore['ID Penilaian'] : uuid_(),
      'ID Absensi Coach': String(checkin['ID Absensi Coach']),
      Tanggal: date,
      'Waktu Server': now,
      'ID Coach': coach.id,
      'Nama Coach': coach.nama,
      Ekstrakurikuler: coach.ekstrakurikuler,
      'ID Anggota': member.id,
      'Nama Anggota': member.nama,
      Kelas: member.kelas,
      Nilai: entry.score,
      'Catatan Coach': entry.note
    };
    if (existingScore) updateObject_(scoreSheet, existingScore._row, scoreObject);
    else appendObject_(scoreSheet, scoreObject);
  });
  return ok_({ saved: normalized.length, message: 'Kehadiran dan evaluasi ' + normalized.length + ' anggota berhasil disimpan.' });
}

// -------------------------------- Coach API -------------------------------
function coachCheckinHistory_(coach, limit) {
  return objectRows_(sheet_('AbsensiCoach')).filter(row => String(row['ID Coach']) === coach.id)
    .sort((a, b) => new Date(b['Waktu Server']).getTime() - new Date(a['Waktu Server']).getTime())
    .slice(0, limit).map(row => ({
      dateTimeLabel: dateTimeLabel_(row['Waktu Server']),
      ekstrakurikuler: String(row.Ekstrakurikuler),
      accuracy: Math.round(Number(row['Akurasi GPS (m)'] || 0)),
      mapUrl: String(row['Link Peta'] || '')
    }));
}
function coachRecentMembers_(coach, limit) {
  const scoreRows = objectRows_(sheet_('Penilaian'));
  const scoreByKey = {};
  scoreRows.forEach(row => { scoreByKey[String(row['ID Absensi Coach']) + '|' + String(row['ID Anggota'])] = row; });
  return objectRows_(sheet_('AbsensiAnggota')).filter(row => String(row['ID Coach']) === coach.id)
    .sort((a, b) => new Date(b['Waktu Server']).getTime() - new Date(a['Waktu Server']).getTime())
    .slice(0, limit).map(row => {
      const score = scoreByKey[String(row['ID Absensi Coach']) + '|' + String(row['ID Anggota'])] || {};
      return {
        dateLabel: dateLabel_(row.Tanggal),
        member: String(row['Nama Anggota']),
        status: String(row['Status Kehadiran']),
        score: score.Nilai == null ? '' : score.Nilai,
        note: String(score['Catatan Coach'] || '')
      };
    });
}
function coachInfo_(token) {
  const coach = coachByToken_(token);
  if (!coach) return fail_('Link coach tidak valid atau sudah dinonaktifkan.');
  const todayCheckin = checkinRowForCoachDate_(coach.id, currentDateKey_());
  return ok_({
    coach: { nama: coach.nama, ekstrakurikuler: coach.ekstrakurikuler },
    members: activeMembers_(coach.ekstrakurikuler),
    checkin: checkinPublic_(todayCheckin),
    checkinRecent: coachCheckinHistory_(coach, 10),
    recent: coachRecentMembers_(coach, 30)
  });
}
function doGet(e) {
  const p = e && e.parameter ? e.parameter : {};
  try {
    if (p.action === 'health') return ok_({ service: 'Absensi Coach SMK BPP', version: '3.1', timezone: TZ });
    if (p.action === 'coach_info') return coachInfo_(p.coach);
    return fail_('Aksi GET tidak dikenal.');
  } catch (error) {
    Logger.log(error && error.stack ? error.stack : error);
    return fail_(error.message || 'Terjadi kesalahan server.');
  }
}

// ------------------------------- Admin API --------------------------------
function adminLogin_(p) {
  const username = String(p.username || '').trim().toLowerCase();
  const password = String(p.password || '');
  const expectedUser = prop_('ADMIN_USER').trim().toLowerCase();
  const expectedPass = prop_('ADMIN_PASS');
  if (!expectedUser || !expectedPass) return fail_('ADMIN_USER dan ADMIN_PASS belum diatur pada Script Properties.');
  if (username !== expectedUser || password !== expectedPass) return fail_('Username atau password administrator salah.');
  const token = uuid_() + uuid_();
  CacheService.getScriptCache().put('admin_' + token, 'valid', ADMIN_SESSION_SECONDS);
  return ok_({ token, message: 'Berhasil masuk sebagai administrator.' });
}
function requireAdmin_(token) { return !!token && CacheService.getScriptCache().get('admin_' + token) === 'valid'; }
function validateReportFilter_(p) {
  const from = dateFromInput_(p.from);
  const to = dateFromInput_(p.to);
  const extracurricular = String(p.extracurricular || 'Semua Ekstrakurikuler');
  if (from > to) throw new Error('Tanggal awal tidak boleh melewati tanggal akhir.');
  if (extracurricular !== 'Semua Ekstrakurikuler' && DIVISIONS.indexOf(extracurricular) < 0) throw new Error('Nama ekstrakurikuler tidak valid.');
  return { from, to, extracurricular };
}
function reportRows_(filter) {
  const selected = row => row.date >= filter.from && row.date <= filter.to && (filter.extracurricular === 'Semua Ekstrakurikuler' || row.ekstrakurikuler === filter.extracurricular);
  const coachRows = objectRows_(sheet_('AbsensiCoach')).map(row => ({
    id: String(row['ID Absensi Coach']),
    date: dateKey_(row.Tanggal),
    dateLabel: dateLabel_(row.Tanggal),
    timeLabel: timeLabel_(row['Waktu Server']),
    coach: String(row['Nama Coach']),
    ekstrakurikuler: String(row.Ekstrakurikuler),
    latitude: String(row.Latitude),
    longitude: String(row.Longitude),
    accuracy: String(row['Akurasi GPS (m)']),
    mapUrl: String(row['Link Peta'] || ''),
    photoId: String(row['ID Foto Drive'] || ''),
    photoUrl: String(row['URL Foto'] || '')
  })).filter(selected).sort((a, b) => a.date.localeCompare(b.date) || a.timeLabel.localeCompare(b.timeLabel));

  const scoreByKey = {};
  objectRows_(sheet_('Penilaian')).forEach(row => {
    scoreByKey[String(row['ID Absensi Coach']) + '|' + String(row['ID Anggota'])] = row;
  });
  const memberRows = objectRows_(sheet_('AbsensiAnggota')).map(row => {
    const score = scoreByKey[String(row['ID Absensi Coach']) + '|' + String(row['ID Anggota'])] || {};
    return {
      date: dateKey_(row.Tanggal),
      dateLabel: dateLabel_(row.Tanggal),
      timeLabel: timeLabel_(row['Waktu Server']),
      coach: String(row['Nama Coach']),
      ekstrakurikuler: String(row.Ekstrakurikuler),
      member: String(row['Nama Anggota']),
      className: String(row.Kelas || ''),
      status: String(row['Status Kehadiran']),
      score: score.Nilai == null ? '' : score.Nilai,
      note: String(score['Catatan Coach'] || '')
    };
  }).filter(selected).sort((a, b) => a.date.localeCompare(b.date) || a.member.localeCompare(b.member, 'id'));
  return { coachRows, memberRows };
}
function reportData_(p) {
  if (!requireAdmin_(p.adminToken)) return fail_('Sesi administrator berakhir. Silakan masuk kembali.', { expired: true });
  const filter = validateReportFilter_(p);
  const rows = reportRows_(filter);
  return ok_({
    fromLabel: dateLabel_(filter.from),
    toLabel: dateLabel_(filter.to),
    ekstrakurikuler: filter.extracurricular,
    coachRows: rows.coachRows,
    memberRows: rows.memberRows
  });
}

// --------------------------------- DOCX ------------------------------------
function applyTableStyle_(table, headerFill, fontSize) {
  for (let r = 0; r < table.getNumRows(); r++) {
    const tableRow = table.getRow(r);
    for (let c = 0; c < tableRow.getNumCells(); c++) {
      const cell = tableRow.getCell(c);
      cell.setPaddingTop(5).setPaddingBottom(5).setPaddingLeft(5).setPaddingRight(5);
      const para = cell.getChild(0).asParagraph();
      const text = para.editAsText();
      text.setFontFamily('Arial').setFontSize(r === 0 ? fontSize : Math.max(7, fontSize - 1));
      if (r === 0) {
        cell.setBackgroundColor(headerFill || '#203B82');
        text.setBold(true).setForegroundColor('#FFFFFF');
      } else if (r % 2 === 0) {
        cell.setBackgroundColor('#F1F4F9');
        text.setForegroundColor('#253047');
      } else {
        cell.setBackgroundColor('#FFFFFF');
        text.setForegroundColor('#253047');
      }
    }
  }
}
function appendSectionHeading_(body, text) {
  const p = body.appendParagraph(text);
  p.setSpacingBefore(15).setSpacingAfter(7);
  p.editAsText().setFontFamily('Arial').setFontSize(13).setBold(true).setForegroundColor('#0F172A');
  return p;
}
function appendSubHeading_(body, text) {
  const p = body.appendParagraph(text);
  p.setSpacingBefore(9).setSpacingAfter(4);
  p.editAsText().setFontFamily('Arial').setFontSize(10).setBold(true).setForegroundColor('#1E3A8A');
  return p;
}
function appendLinkedText_(cell, label, url) {
  const para = cell.getChild(0).asParagraph();
  para.setText(label || '—');
  if (url) para.editAsText().setLinkUrl(0, label.length - 1, url).setForegroundColor('#1D4ED8').setUnderline(true);
}
function exportDocx_(p) {
  if (!requireAdmin_(p.adminToken)) return fail_('Sesi administrator berakhir. Silakan masuk kembali.', { expired: true });
  const filter = validateReportFilter_(p);
  const data = reportRows_(filter);
  if (!data.coachRows.length && !data.memberRows.length) return fail_('Tidak ada data absensi pada periode tersebut. Pilih periode lain sebelum mengunduh.');

  const doc = DocumentApp.create('Laporan Absensi Ekstrakurikuler SMK BPP Bandung');
  const docId = doc.getId();
  try {
    const body = doc.getBody();
    body.clear();
    body.setMarginTop(42).setMarginBottom(42).setMarginLeft(45).setMarginRight(45);

    // Sampul/identitas mengikuti bahasa visual dokumen sumber: blok navy, aksen biru, Arial.
    const masthead = body.appendTable([['']]);
    const headCell = masthead.getCell(0, 0);
    headCell.setBackgroundColor('#10182F').setPaddingTop(20).setPaddingBottom(20).setPaddingLeft(14).setPaddingRight(14);
    let hp = headCell.getChild(0).asParagraph();
    hp.setText('SMK BALAI PERGURUAN PUTRI BANDUNG').setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    hp.editAsText().setFontFamily('Arial').setFontSize(12).setBold(true).setForegroundColor('#B7C7E5');
    hp = headCell.appendParagraph('LAPORAN ABSENSI & EVALUASI EKSTRAKURIKULER');
    hp.setAlignment(DocumentApp.HorizontalAlignment.CENTER).setSpacingBefore(8).setSpacingAfter(5);
    hp.editAsText().setFontFamily('Arial').setFontSize(17).setBold(true).setForegroundColor('#FFFFFF');
    hp = headCell.appendParagraph('Laporan Bidang Kesiswaan — ' + dateLabel_(filter.from) + ' s.d. ' + dateLabel_(filter.to));
    hp.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    hp.editAsText().setFontFamily('Arial').setFontSize(10).setForegroundColor('#C8D9F2');

    const selectedPrograms = filter.extracurricular === 'Semua Ekstrakurikuler' ? EXTRACURRICULAR_SEED : EXTRACURRICULAR_SEED.filter(item => item.name === filter.extracurricular);
    const totalActive = selectedPrograms.reduce((sum, item) => sum + item.count, 0);
    const presentCount = data.memberRows.filter(row => row.status === 'Hadir').length;
    const summaryTable = body.appendTable([
      ['TOTAL EKSTRAKURIKULER', 'PARTISIPASI AKTIF (RUJUKAN)', 'ABSENSI COACH', 'CATATAN ANGGOTA'],
      [String(selectedPrograms.length) + ' Bidang', totalActive + ' Entri', String(data.coachRows.length) + ' Sesi', String(data.memberRows.length) + ' Entri']
    ]);
    applyTableStyle_(summaryTable, '#203B82', 8);
    const summaryNote = body.appendParagraph('Ringkasan periode: ' + data.coachRows.length + ' absensi coach · ' + presentCount + ' anggota berstatus Hadir · ' + data.memberRows.length + ' catatan kehadiran/evaluasi. Partisipasi aktif merupakan angka rujukan dari laporan TA 2025/2026, bukan hitungan presensi pada periode ini.');
    summaryNote.setSpacingBefore(8).setSpacingAfter(8);
    summaryNote.editAsText().setFontFamily('Arial').setFontSize(8).setForegroundColor('#475569');

    appendSectionHeading_(body, 'BAB I: REKAPITULASI ABSENSI COACH');
    body.appendParagraph('Tabel berikut mencatat waktu yang diterima server, lokasi perangkat, tingkat akurasi GPS, serta bukti foto yang dikirim oleh coach melalui link akses pribadi.').editAsText().setFontFamily('Arial').setFontSize(9).setForegroundColor('#334155');
    const coachTableRows = [['No.', 'Tanggal', 'Jam Server', 'Ekstrakurikuler', 'Pembina / Coach', 'Koordinat & Akurasi', 'Bukti Foto']];
    data.coachRows.forEach((row, index) => coachTableRows.push([
      String(index + 1), row.dateLabel, row.timeLabel, row.ekstrakurikuler, row.coach,
      row.latitude + ', ' + row.longitude + ' (±' + row.accuracy + ' m)', row.photoUrl ? 'Buka foto di Drive' : '—'
    ]));
    const coachTable = body.appendTable(coachTableRows);
    applyTableStyle_(coachTable, '#203B82', 7);
    data.coachRows.forEach((row, index) => {
      if (row.photoUrl) appendLinkedText_(coachTable.getCell(index + 1, 6), 'Buka foto di Drive', row.photoUrl);
    });

    appendSectionHeading_(body, 'BAB II: KEHADIRAN & EVALUASI ANGGOTA');
    const memberTableRows = [['No.', 'Tanggal', 'Coach', 'Ekstrakurikuler', 'Nama Anggota', 'Kelas', 'Kehadiran', 'Nilai', 'Catatan']];
    data.memberRows.forEach((row, index) => memberTableRows.push([
      String(index + 1), row.dateLabel, row.coach, row.ekstrakurikuler, row.member,
      row.className || '—', row.status, row.score === '' ? '—' : String(row.score), row.note || '—'
    ]));
    const memberTable = body.appendTable(memberTableRows);
    applyTableStyle_(memberTable, '#203B82', 7);

    appendSectionHeading_(body, 'BAB III: IDENTITAS PROGRAM EKSTRAKURIKULER');
    const exRows = [['No.', 'Ekstrakurikuler', 'Pembina / Coach', 'Ketua / Koordinator', 'Partisipasi Aktif', 'Hari Latihan']];
    selectedPrograms.forEach((item, index) => {
        exRows.push([String(index + 1), item.name, item.coaches.join(' / '), item.chair, item.count + ' siswa', item.schedule]);
    });
    const exTable = body.appendTable(exRows);
    applyTableStyle_(exTable, '#203B82', 7);

    // Lampiran foto disisipkan langsung ke DOCX; tautan Drive tetap ada di tabel untuk audit.
    const withPhotos = data.coachRows.filter(row => row.photoId);
    if (withPhotos.length) {
      body.appendPageBreak();
      appendSectionHeading_(body, 'LAMPIRAN: BUKTI FOTO ABSENSI COACH');
      body.appendParagraph('Foto yang dikirim saat check-in disisipkan ke dokumen ini sebagai bukti visual. Setiap foto memuat identitas dan waktu server pada keterangannya.').editAsText().setFontFamily('Arial').setFontSize(9).setForegroundColor('#475569');
      const maxEmbedded = 30;
      withPhotos.slice(0, maxEmbedded).forEach((row, index) => {
        appendSubHeading_(body, (index + 1) + '. ' + row.coach + ' — ' + row.ekstrakurikuler);
        const cap = body.appendParagraph(row.dateLabel + ' pukul ' + row.timeLabel + ' WIB | GPS: ' + row.latitude + ', ' + row.longitude + ' | Akurasi ±' + row.accuracy + ' m');
        cap.editAsText().setFontFamily('Arial').setFontSize(8).setForegroundColor('#475569');
        try {
          const image = body.appendImage(DriveApp.getFileById(row.photoId).getBlob());
          const originalWidth = image.getWidth();
          const originalHeight = image.getHeight();
          const targetWidth = Math.min(300, originalWidth);
          const targetHeight = originalWidth ? Math.round(originalHeight * targetWidth / originalWidth) : 220;
          image.setWidth(targetWidth).setHeight(targetHeight);
        } catch (imageError) {
          body.appendParagraph('Foto tetap tersimpan di Drive: ' + row.photoUrl).editAsText().setFontFamily('Arial').setFontSize(8).setForegroundColor('#1D4ED8');
        }
        if (index < Math.min(withPhotos.length, maxEmbedded) - 1) body.appendParagraph(' ');
      });
      if (withPhotos.length > maxEmbedded) {
        body.appendParagraph('Catatan: ' + (withPhotos.length - maxEmbedded) + ' foto lain tidak disisipkan karena batas ukuran dokumen; tautannya tetap tersedia pada tabel rekap absensi coach.').editAsText().setFontFamily('Arial').setFontSize(8).setItalic(true).setForegroundColor('#64748B');
      }
    }

    appendSectionHeading_(body, 'PENGESAHAN');
    const sig = body.appendTable([
      ['Mengetahui,\nWAKASEK KESISWAAN', 'Bandung, ' + Utilities.formatDate(new Date(), TZ, 'dd MMMM yyyy') + '\nKOORDINATOR EKSTRAKURIKULER'],
      ['\n\n\nNABILA PUTRI SONJAYA, S. PD.', '\n\n\nSAHRUL MUBAROK, S. PD.']
    ]);
    for (let r = 0; r < sig.getNumRows(); r++) {
      for (let c = 0; c < sig.getRow(r).getNumCells(); c++) {
        const cell = sig.getCell(r, c);
        cell.setPaddingTop(7).setPaddingBottom(7).setPaddingLeft(8).setPaddingRight(8);
        cell.getChild(0).asParagraph().editAsText().setFontFamily('Arial').setFontSize(9).setForegroundColor('#253047');
      }
    }
    const footer = body.appendParagraph('Dokumen dibuat otomatis oleh Sistem Absensi Coach Ekstrakurikuler SMK Balai Perguruan Putri Bandung. Waktu absensi mengacu pada server Google Apps Script dengan zona waktu Asia/Jakarta.');
    footer.setSpacingBefore(12);
    footer.editAsText().setFontFamily('Arial').setFontSize(7).setItalic(true).setForegroundColor('#64748B');

    doc.saveAndClose();
    const filename = 'Laporan_Absensi_Ekstrakurikuler_' + filter.from + '_sd_' + filter.to + '.docx';
    const blob = DriveApp.getFileById(docId).getAs(MIME_DOCX).setName(filename);
    const base64 = Utilities.base64Encode(blob.getBytes());
    DriveApp.getFileById(docId).setTrashed(true);
    return ok_({ filename: filename, mimeType: MIME_DOCX, base64: base64, coachCount: data.coachRows.length, memberCount: data.memberRows.length });
  } catch (error) {
    try { DriveApp.getFileById(docId).setTrashed(true); } catch (cleanupError) { Logger.log(cleanupError); }
    throw error;
  }
}

// -------------------------------- doPost -----------------------------------
function doPost(e) {
  const p = e && e.parameter ? e.parameter : {};
  const action = String(p.action || '');
  const requiresWriteLock = action === 'save_coach_checkin' || action === 'save_member_records';
  const lock = requiresWriteLock ? LockService.getScriptLock() : null;
  let locked = false;
  try {
    // Hanya transaksi tulis yang diserialisasi. Login, baca rekap, dan ekspor DOCX
    // tidak perlu menahan antrean check-in coach.
    if (lock) {
      lock.waitLock(25000);
      locked = true;
    }
    switch (action) {
      case 'save_coach_checkin': return saveCoachCheckin_(p);
      case 'save_member_records': return saveMemberRecords_(p);
      case 'admin_login': return adminLogin_(p);
      case 'report_data': return reportData_(p);
      case 'export_docx': return exportDocx_(p);
      default: return fail_('Aksi POST tidak dikenal.');
    }
  } catch (error) {
    Logger.log(error && error.stack ? error.stack : error);
    return fail_(error.message || 'Terjadi kesalahan server.');
  } finally {
    if (locked && lock) lock.releaseLock();
  }
}

// --------------------------------- Setup -----------------------------------
function setupAll() {
  ['AnggotaAktif', 'Ekstrakurikuler', 'Coach', 'AbsensiCoach', 'AbsensiAnggota', 'Penilaian'].forEach(name => sheet_(name));
  seedExtracurriculars_();
  seedCoaches_();
  ensureRosterIds_();
  const ss = ss_();
  Logger.log('Database siap: ' + ss.getUrl());
  Logger.log('Jumlah coach/link aktif: ' + objectRows_(sheet_('Coach')).filter(row => String(row.Status).toLowerCase() === 'aktif').length);
  Logger.log('Roster anggota aktif: ' + objectRows_(sheet_('AnggotaAktif')).filter(row => ['aktif', 'disetujui'].indexOf(String(row.Status).toLowerCase()) >= 0).length);
  Logger.log('Isi Script Properties ADMIN_USER, ADMIN_PASS, dan WEBSITE_URL sebelum membagikan website.');
  Logger.log('Buka sheet Coach untuk menyalin kolom Link Akses. Link coach berfungsi sebagai kunci akses rahasia.');
  return 'Setup selesai. Periksa sheet Coach untuk link pribadi dan sheet AnggotaAktif untuk mengisi daftar siswa.';
}
