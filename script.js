(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const DIVISIONS = [
    'Musik Modern',
    'Musik Tradisional (Angklung & Gamelan)',
    'Olah Vokal & Paduan Suara'
  ];
  const ATTENDANCE_STATUSES = ['Hadir', 'Izin', 'Sakit', 'Alpa'];
  const coachToken = new URLSearchParams(window.location.search).get('coach') || '';

  let coach = null;
  let members = [];
  let adminToken = '';
  let currentReport = null;

  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[ch]);

  function localDateString(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function showMessage(element, message, kind = '') {
    if (!element) return;
    element.textContent = message || '';
    element.className = `message ${kind}`.trim();
  }

  function setBusy(button, busy, busyText = 'Memproses…') {
    if (!button) return;
    if (busy) {
      button.dataset.originalText = button.innerHTML;
      button.disabled = true;
      button.textContent = busyText;
    } else {
      button.disabled = false;
      if (button.dataset.originalText) {
        button.innerHTML = button.dataset.originalText;
        delete button.dataset.originalText;
      }
    }
  }

  async function request(action, data = {}, method = 'POST') {
    if (typeof SCRIPT_URL === 'undefined' || !SCRIPT_URL) {
      throw new Error('URL backend belum diatur di config.js.');
    }

    let url = SCRIPT_URL;
    const options = { method };
    if (method === 'GET') {
      const params = new URLSearchParams({ action, ...data });
      url += `${url.includes('?') ? '&' : '?'}${params.toString()}`;
    } else {
      options.headers = { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' };
      options.body = new URLSearchParams({ action, ...data });
    }

    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`Server merespons HTTP ${response.status}.`);
    const result = await response.json();
    if (!result || typeof result !== 'object') throw new Error('Respons server tidak valid.');
    return result;
  }

  function switchView(name) {
    $$('.view').forEach((section) => section.classList.toggle('active', section.id === `view-${name}`));
    $$('.nav-btn').forEach((button) => button.classList.toggle('active', button.dataset.view === name));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderMembers() {
    const list = $('#member-list');
    $('#member-count').textContent = `${members.length} anggota aktif pada divisi ini`;

    if (!members.length) {
      list.innerHTML = '<div class="empty-state">Belum ada anggota aktif yang terdaftar pada divisi coach ini.</div>';
      return;
    }

    list.innerHTML = members.map((member, index) => `
      <article class="member-row" data-member-id="${escapeHTML(member.id)}">
        <div class="member-id">
          <strong>${escapeHTML(member.nama)}</strong>
          <span>${escapeHTML(member.kelas || 'Kelas belum diisi')} · ${escapeHTML(member.divisi || '')}</span>
        </div>
        <div class="member-field">
          <label for="status-${index}">KEHADIRAN</label>
          <select class="field-input attendance-status" id="status-${index}" required>
            <option value="">Pilih status</option>
            ${ATTENDANCE_STATUSES.map((status) => `<option value="${status}">${status}</option>`).join('')}
          </select>
        </div>
        <div class="member-field">
          <label for="score-${index}">NILAI (0–100)</label>
          <input class="field-input member-score" id="score-${index}" type="number" min="0" max="100" step="1" inputmode="numeric" placeholder="0–100" required>
        </div>
        <div class="member-field">
          <label for="note-${index}">CATATAN COACH</label>
          <input class="field-input member-note" id="note-${index}" type="text" maxlength="180" placeholder="Catatan singkat">
        </div>
      </article>
    `).join('');
  }

  async function loadCoach() {
    const gate = $('#coach-gate');
    const workspace = $('#coach-workspace');
    if (!coachToken) {
      gate.hidden = false;
      workspace.hidden = true;
      return;
    }

    gate.hidden = true;
    workspace.hidden = false;
    $('#coach-name').textContent = 'Memverifikasi link…';
    $('#coach-division').textContent = '';
    $('#member-list').innerHTML = '<div class="empty-state">Mengambil daftar anggota…</div>';

    try {
      const result = await request('coach_info', { coach: coachToken }, 'GET');
      if (result.result !== 'success') throw new Error(result.message || 'Link coach tidak valid atau sudah dinonaktifkan.');
      coach = result.coach;
      members = Array.isArray(result.members) ? result.members : [];
      $('#coach-name').textContent = coach.nama;
      $('#coach-division').textContent = coach.divisi;
      renderMembers();
      renderCoachHistory(Array.isArray(result.recent) ? result.recent : []);
    } catch (error) {
      workspace.hidden = true;
      gate.hidden = false;
      gate.innerHTML = `
        <div class="gate-icon">!</div>
        <h2>Link coach tidak dapat digunakan</h2>
        <p>${escapeHTML(error.message || 'Terjadi kesalahan saat memverifikasi link.')}</p>
        <p class="small-muted">Hubungi pengelola ekstrakurikuler untuk memeriksa atau menerbitkan link akses baru.</p>
      `;
    }
  }


  function renderCoachHistory(rows) {
    const panel = $('#coach-monitor');
    const body = $('#coach-history-rows');
    if (!rows.length) {
      panel.hidden = false;
      body.innerHTML = '<tr><td colspan="5">Belum ada riwayat penilaian.</td></tr>';
      return;
    }
    panel.hidden = false;
    body.innerHTML = rows.map((row) => `
      <tr>
        <td>${escapeHTML(row.dateLabel)}</td>
        <td><strong>${escapeHTML(row.member)}</strong></td>
        <td><span class="status-text status-${escapeHTML(row.status)}">${escapeHTML(row.status)}</span></td>
        <td>${escapeHTML(row.score)}</td>
        <td>${escapeHTML(row.note || '—')}</td>
      </tr>
    `).join('');
  }

  async function saveAttendance(event) {
    event.preventDefault();
    const button = $('#save-attendance');
    const message = $('#attendance-message');
    if (!coach || !members.length) {
      showMessage(message, 'Data coach atau anggota belum tersedia.', 'error');
      return;
    }

    const date = $('#session-date').value;
    const session = $('#session-name').value.trim();
    if (!date || !session) {
      showMessage(message, 'Tanggal dan nama sesi wajib diisi.', 'error');
      return;
    }

    const records = [];
    const cards = $$('.member-row');
    for (let i = 0; i < cards.length; i += 1) {
      const card = cards[i];
      const status = $('.attendance-status', card).value;
      const scoreText = $('.member-score', card).value;
      const score = Number(scoreText);
      if (!status || !ATTENDANCE_STATUSES.includes(status)) {
        showMessage(message, `Pilih status kehadiran untuk ${members[i].nama}.`, 'error');
        $('.attendance-status', card).focus();
        return;
      }
      if (scoreText === '' || !Number.isFinite(score) || score < 0 || score > 100) {
        showMessage(message, `Masukkan nilai 0–100 untuk ${members[i].nama}.`, 'error');
        $('.member-score', card).focus();
        return;
      }
      records.push({
        memberId: members[i].id,
        status,
        score,
        note: $('.member-note', card).value.trim()
      });
    }

    setBusy(button, true, 'Menyimpan data…');
    showMessage(message, 'Data sedang disimpan ke database…');
    try {
      const result = await request('save_attendance', {
        coach: coachToken,
        date,
        session,
        records: JSON.stringify(records)
      });
      if (result.result !== 'success') throw new Error(result.message || 'Data gagal disimpan.');
      showMessage(message, result.message || 'Absensi dan penilaian berhasil disimpan.', 'success');
    } catch (error) {
      showMessage(message, error.message || 'Terjadi kesalahan saat menyimpan data.', 'error');
    } finally {
      setBusy(button, false);
    }
  }

  async function adminLogin(event) {
    event.preventDefault();
    const button = $('#admin-login-button');
    showMessage($('#admin-auth-message'), 'Memeriksa akun administrator…');
    setBusy(button, true, 'Memeriksa…');
    try {
      const result = await request('admin_login', {
        username: $('#admin-username').value.trim(),
        password: $('#admin-password').value
      });
      if (result.result !== 'success') throw new Error(result.message || 'Username atau password tidak sesuai.');
      adminToken = result.token;
      $('#admin-auth').hidden = true;
      $('#report-workspace').hidden = false;
      $('#admin-password').value = '';
      const today = localDateString();
      $('#date-from').value = today.slice(0, 8) + '01';
      $('#date-to').value = today;
      showMessage($('#admin-auth-message'), '');
      await loadReport();
    } catch (error) {
      showMessage($('#admin-auth-message'), error.message || 'Gagal masuk.', 'error');
    } finally {
      setBusy(button, false);
    }
  }

  function logoutAdmin() {
    adminToken = '';
    currentReport = null;
    $('#admin-auth').hidden = false;
    $('#report-workspace').hidden = true;
    $('#report-result').hidden = true;
    $('#admin-login-form').reset();
  }

  function statMarkup(label, value) {
    return `<div class="stat-box"><span>${escapeHTML(label)}</span><strong>${escapeHTML(value)}</strong></div>`;
  }

  function renderReport(data) {
    const rows = Array.isArray(data.rows) ? data.rows : [];
    const present = rows.filter((r) => r.status === 'Hadir').length;
    const permission = rows.filter((r) => r.status === 'Izin').length;
    const sick = rows.filter((r) => r.status === 'Sakit').length;
    const absent = rows.filter((r) => r.status === 'Alpa').length;
    const scores = rows.map((r) => Number(r.score)).filter((n) => Number.isFinite(n));
    const average = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—';

    $('#report-stats').innerHTML = [
      statMarkup('TOTAL CATATAN', rows.length),
      statMarkup('HADIR', present),
      statMarkup('IZIN / SAKIT / ALPA', `${permission} / ${sick} / ${absent}`),
      statMarkup('RATA-RATA NILAI', average)
    ].join('');

    $('#report-rows').innerHTML = rows.length ? rows.map((row) => `
      <tr>
        <td>${escapeHTML(row.dateLabel)}</td>
        <td>${escapeHTML(row.coach)}</td>
        <td><strong>${escapeHTML(row.member)}</strong><br><span class="muted">${escapeHTML(row.className || '')}</span></td>
        <td>${escapeHTML(row.division)}</td>
        <td><span class="status-text status-${escapeHTML(row.status)}">${escapeHTML(row.status)}</span></td>
        <td>${escapeHTML(row.score ?? '—')}</td>
      </tr>
    `).join('') : '<tr><td colspan="6">Tidak ada data pada periode dan divisi tersebut.</td></tr>';

    $('#report-period').textContent = `${data.fromLabel} — ${data.toLabel} · ${data.division}`;
    $('#report-result').hidden = false;
  }

  async function loadReport() {
    if (!adminToken) return;
    const from = $('#date-from').value;
    const to = $('#date-to').value;
    const division = $('#report-division').value;
    const button = $('#load-report');
    if (!from || !to || from > to) {
      showMessage($('#report-message'), 'Periksa tanggal awal dan akhir laporan.', 'error');
      return;
    }
    setBusy(button, true, 'Mengambil rekap…');
    showMessage($('#report-message'), 'Mengambil data dari database…');
    try {
      const result = await request('report_data', { adminToken, from, to, division });
      if (result.result !== 'success') throw new Error(result.message || 'Data laporan gagal dimuat.');
      currentReport = { from, to, division };
      renderReport(result);
      showMessage($('#report-message'), `Berhasil memuat ${result.rows.length} catatan.`, 'success');
    } catch (error) {
      showMessage($('#report-message'), error.message || 'Gagal memuat laporan.', 'error');
    } finally {
      setBusy(button, false);
    }
  }

  function base64ToBlob(base64, mimeType) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mimeType });
  }

  async function downloadDocx() {
    if (!adminToken || !currentReport) return;
    const button = $('#download-docx');
    setBusy(button, true, 'Membuat DOCX…');
    try {
      const result = await request('export_docx', {
        adminToken,
        from: currentReport.from,
        to: currentReport.to,
        division: currentReport.division
      });
      if (result.result !== 'success' || !result.base64) throw new Error(result.message || 'Dokumen gagal dibuat.');
      const blob = base64ToBlob(result.base64, result.mimeType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = result.filename || 'Laporan_Absensi_Coach.docx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      showMessage($('#report-message'), 'Laporan DOCX berhasil dibuat.', 'success');
    } catch (error) {
      showMessage($('#report-message'), error.message || 'Gagal mengunduh laporan DOCX.', 'error');
    } finally {
      setBusy(button, false);
    }
  }

  function init() {
    $('#year').textContent = new Date().getFullYear();
    $('#today-label').textContent = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date());
    $('#session-date').value = localDateString();

    $$('.nav-btn').forEach((button) => button.addEventListener('click', () => switchView(button.dataset.view)));
    $$('[data-go]').forEach((button) => button.addEventListener('click', () => switchView(button.dataset.go)));
    $('#attendance-form').addEventListener('submit', saveAttendance);
    $('#admin-login-form').addEventListener('submit', adminLogin);
    $('#admin-logout').addEventListener('click', logoutAdmin);
    $('#load-report').addEventListener('click', loadReport);
    $('#download-docx').addEventListener('click', downloadDocx);

    loadCoach();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
