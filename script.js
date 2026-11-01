(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const STATUSES = ['Hadir', 'Izin', 'Sakit', 'Alpa'];
  const coachToken = new URLSearchParams(window.location.search).get('coach') || '';
  let coach = null;
  let members = [];
  let checkin = null;
  let cameraStream = null;
  let currentLocation = null;
  let capturedPhoto = '';
  let adminToken = '';
  let currentReport = null;

  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[ch]);

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
      throw new Error('URL backend belum diatur. Isi SCRIPT_URL di config.js dengan URL Web App Apps Script yang sudah di-deploy.');
    }
    let url = SCRIPT_URL.trim();
    const options = { method, mode: 'cors', credentials: 'omit', redirect: 'follow', cache: 'no-store' };
    if (method === 'GET') {
      const params = new URLSearchParams({ action, ...data });
      url += `${url.includes('?') ? '&' : '?'}${params.toString()}`;
    } else {
      // URLSearchParams membuat request form-urlencoded sederhana tanpa custom header,
      // sehingga browser tidak perlu mengirim preflight OPTIONS.
      options.body = new URLSearchParams({ action, ...data });
    }
    let response;
    try {
      response = await fetch(url, options);
    } catch (error) {
      const detail = error && error.message ? ` (${error.message})` : '';
      throw new Error('Tidak dapat membaca respons Google Apps Script. Periksa URL /exec di config.js, deploy versi backend terbaru dengan akses "Anyone", dan pastikan website dibuka melalui HTTPS.' + detail);
    }
    if (!response.ok) throw new Error(`Server merespons HTTP ${response.status}.`);
    const raw = await response.text();
    let result;
    try { result = JSON.parse(raw); }
    catch (error) {
      throw new Error('Backend tidak mengirim JSON. Kemungkinan URL masih menunjuk ke deployment lama atau Apps Script belum di-deploy ulang.');
    }
    if (!result || typeof result !== 'object') throw new Error('Respons server tidak valid.');
    if (result.result === 'error' && /^Aksi (GET|POST) tidak dikenal/i.test(String(result.message || ''))) {
      result.message = 'Backend masih menggunakan versi lama. Deploy ulang file code.gs V3.1 melalui Manage deployments → Edit → New version.';
    }
    return result;
  }

  function loadSchoolLogo() {
    const image = $('#school-logo');
    const fallback = $('#brand-fallback');
    if (!image || !fallback) return;
    const candidates = ['logo.png', 'logo.svg', 'logo.webp', 'logo.jpg', 'logo.jpeg', 'logo.avif', 'logo.gif', 'logo.PNG', 'logo.SVG', 'logo.WEBP', 'logo.JPG', 'logo.JPEG', 'logo.AVIF', 'logo.GIF', 'logo'];
    let index = 0;
    image.onload = () => {
      image.hidden = false;
      fallback.hidden = true;
      image.dataset.loaded = 'true';
    };
    image.onerror = () => {
      index += 1;
      if (index < candidates.length) image.src = new URL(candidates[index], document.baseURI).href;
      else {
        image.hidden = true;
        fallback.hidden = false;
      }
    };
    image.src = new URL(candidates[index], document.baseURI).href;
  }

  function jakartaDateKey() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const value = {};
    parts.forEach((part) => { value[part.type] = part.value; });
    return `${value.year}-${value.month}-${value.day}`;
  }

  function switchView(name) {
    if (name !== 'absensi') {
      stopCamera();
      if (!checkin) resetCaptureFlow();
    }
    $$('.view').forEach((section) => section.classList.toggle('active', section.id === `view-${name}`));
    $$('.nav-btn').forEach((button) => button.classList.toggle('active', button.dataset.view === name));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderPrograms() {
    const symbols = { Seni: '✧', Bahasa: '文', Olahraga: '◉' };
    $('#extracurricular-grid').innerHTML = EXTRACURRICULARS.map((item, index) => `
      <article class="program-card neo-card">
        <div class="program-top"><span class="program-symbol">${symbols[item.category] || '✦'}</span><span class="program-count">${item.count} partisipasi</span></div>
        <h3>${escapeHTML(item.name)}</h3>
        <p>${escapeHTML(item.description)}</p>
        <div class="program-meta">
          <div class="meta-item"><span>PEMBINA / COACH</span><strong>${item.coaches.map(escapeHTML).join('<br>')}</strong></div>
          <div class="meta-item"><span>KETUA / KOORDINATOR</span><strong>${escapeHTML(item.chair)}</strong></div>
          <div class="meta-item"><span>HARI LATIHAN</span><strong>${escapeHTML(item.schedule)}</strong></div>
          <div class="meta-item"><span>ANGGOTA AKTIF</span><strong>${item.count} siswa (rujukan laporan)</strong></div>
        </div>
        <details>
          <summary>Lihat visi, misi & kegiatan</summary>
          <div class="program-details">
            <h4>Visi</h4><p>${escapeHTML(item.vision)}</p>
            <h4>Misi</h4><ul>${item.missions.map((mission) => `<li>${escapeHTML(mission)}</li>`).join('')}</ul>
            <h4>Standar kegiatan</h4><ul>${item.activities.map((activity) => `<li>${escapeHTML(activity)}</li>`).join('')}</ul>
            <h4>Target kejuaraan</h4><p>${escapeHTML(item.competition)}</p>
            <p class="small-muted">Tanggal sampel absensi pada laporan sumber: ${escapeHTML(item.sampleDates)}.</p>
          </div>
        </details>
      </article>
    `).join('');

    const select = $('#report-division');
    select.innerHTML = '<option value="Semua Ekstrakurikuler">Semua Ekstrakurikuler</option>' +
      EXTRACURRICULARS.map((item) => `<option value="${escapeHTML(item.name)}">${escapeHTML(item.name)}</option>`).join('');
  }

  function showCoachGate(message) {
    $('#coach-workspace').hidden = true;
    $('#coach-gate').hidden = false;
    if (message) {
      $('#coach-gate').innerHTML = `
        <div class="gate-icon">!</div><h2>Link coach tidak dapat digunakan</h2>
        <p>${escapeHTML(message)}</p><p class="small-muted">Hubungi pengelola untuk memeriksa atau menerbitkan ulang link akses.</p>
      `;
    }
  }

  async function loadCoach() {
    if (!coachToken) {
      showCoachGate('Halaman ini menggunakan link pribadi yang diterbitkan pengelola. Coach tidak perlu membuat akun atau memasukkan kata sandi.');
      return;
    }
    $('#coach-gate').hidden = true;
    $('#coach-workspace').hidden = false;
    $('#coach-name').textContent = 'Memverifikasi link…';
    $('#coach-division').textContent = '';
    try {
      const result = await request('coach_info', { coach: coachToken }, 'GET');
      if (result.result !== 'success') throw new Error(result.message || 'Link coach tidak valid.');
      coach = result.coach;
      members = Array.isArray(result.members) ? result.members : [];
      checkin = result.checkin || null;
      $('#coach-name').textContent = coach.nama;
      $('#coach-division').textContent = coach.ekstrakurikuler;
      renderCheckinState();
      renderMembers();
      renderHistory(Array.isArray(result.recent) ? result.recent : []);
      renderCheckinHistory(Array.isArray(result.checkinRecent) ? result.checkinRecent : []);
    } catch (error) {
      showCoachGate(error.message || 'Terjadi kesalahan saat memverifikasi link.');
    }
  }

  function renderCheckinState() {
    const existing = $('#checkin-existing');
    const startArea = $('#checkin-start-area');
    const captureArea = $('#capture-area');
    const memberWorkspace = $('#member-workspace');
    if (checkin) {
      existing.hidden = false;
      startArea.hidden = true;
      captureArea.hidden = true;
      memberWorkspace.hidden = false;
      const photoAt = checkin.waktuLabel || 'Waktu tercatat oleh server';
      $('#checkin-existing-info').textContent = `${photoAt} · Akurasi lokasi ±${checkin.akurasi || '—'} m`;
      const map = $('#checkin-existing-map');
      if (checkin.mapUrl) { map.href = checkin.mapUrl; map.hidden = false; } else { map.hidden = true; }
    } else {
      existing.hidden = true;
      startArea.hidden = false;
      captureArea.hidden = true;
      memberWorkspace.hidden = true;
      $('#capture-photo').disabled = true;
      $('#submit-checkin').disabled = true;
      $('#retake-photo').hidden = true;
    }
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      cameraStream = null;
    }
    const video = $('#camera-preview');
    if (video) video.srcObject = null;
  }

  function resetCaptureFlow() {
    capturedPhoto = '';
    currentLocation = null;
    $('#checkin-start-area').hidden = false;
    $('#capture-area').hidden = true;
    $('#camera-preview').hidden = false;
    $('#photo-preview').hidden = true;
    $('#camera-placeholder').hidden = false;
    $('#capture-photo').disabled = true;
    $('#submit-checkin').disabled = true;
    $('#retake-photo').hidden = true;
    $('#camera-status').textContent = 'Menunggu izin kamera…';
    $('#location-status').textContent = 'Menunggu izin lokasi…';
  }

  function getPosition() {
    return new Promise((resolve, reject) => {
      if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        return reject(new Error('Kamera dan GPS memerlukan HTTPS. Buka website melalui alamat GitHub Pages/hosting HTTPS, bukan HTTP atau file lokal.'));
      }
      if (!navigator.geolocation) return reject(new Error('Browser ini tidak mendukung akses lokasi.'));
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy || 0)
        }),
        (error) => {
          const messages = {
            1: 'Izin lokasi ditolak. Izinkan akses lokasi pada pengaturan browser.',
            2: 'Lokasi perangkat tidak tersedia. Coba aktifkan GPS dan ulangi.',
            3: 'Permintaan lokasi melewati batas waktu. Coba lagi.'
          };
          reject(new Error(messages[error.code] || 'Gagal mendapatkan lokasi perangkat.'));
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
    });
  }

  async function startCheckin() {
    if (!coach || checkin) return;
    const button = $('#start-checkin');
    setBusy(button, true, 'Meminta izin…');
    showMessage($('#checkin-message'), 'Browser akan meminta izin kamera dan lokasi. Pilih Izinkan pada kedua permintaan.');
    $('#checkin-start-area').hidden = true;
    $('#capture-area').hidden = false;
    $('#camera-placeholder').hidden = false;
    $('#camera-status').textContent = 'Mengaktifkan kamera…';
    $('#location-status').textContent = 'Mengambil koordinat GPS…';
    $('#capture-photo').disabled = true;
    $('#submit-checkin').disabled = true;
    capturedPhoto = '';
    currentLocation = null;
    $('#photo-preview').hidden = true;
    $('#camera-preview').hidden = false;
    $('#retake-photo').hidden = true;
    try {
      const cameraPromise = navigator.mediaDevices && navigator.mediaDevices.getUserMedia
        ? navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
        : Promise.reject(new Error('Browser tidak mendukung kamera. Buka website melalui HTTPS dan gunakan browser modern.'));
      const results = await Promise.allSettled([cameraPromise, getPosition()]);
      if (results[0].status === 'fulfilled') cameraStream = results[0].value;
      if (results[1].status === 'fulfilled') currentLocation = results[1].value;
      const failed = results.find((item) => item.status === 'rejected');
      if (failed) throw failed.reason;
      const video = $('#camera-preview');
      video.srcObject = cameraStream;
      await video.play();
      $('#camera-placeholder').hidden = true;
      $('#camera-status').textContent = 'Kamera aktif.';
      $('#location-status').textContent = `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)} · akurasi ±${currentLocation.accuracy} m`;
      $('#capture-photo').disabled = false;
      showMessage($('#checkin-message'), 'Lokasi berhasil diperoleh. Ambil foto untuk melanjutkan.');
    } catch (error) {
      stopCamera();
      $('#camera-status').textContent = 'Kamera/lokasi belum siap.';
      showMessage($('#checkin-message'), error.message || 'Tidak dapat mengakses kamera atau lokasi.', 'error');
      $('#capture-area').hidden = false;
      $('#checkin-start-area').hidden = false;
    } finally {
      setBusy(button, false);
    }
  }

  function capturePhoto() {
    const video = $('#camera-preview');
    const canvas = $('#photo-canvas');
    if (!video.videoWidth || !video.videoHeight) {
      showMessage($('#checkin-message'), 'Tunggu hingga gambar kamera terlihat, lalu ambil foto.', 'error');
      return;
    }
    const maxDimension = 1280;
    let scale = Math.min(1, maxDimension / Math.max(video.videoWidth, video.videoHeight));
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      showMessage($('#checkin-message'), 'Perangkat tidak dapat memproses foto. Muat ulang halaman lalu coba kembali.', 'error');
      return;
    }
    const maxBase64Length = 1450000; // buffer aman di bawah batas server 1.600.000 karakter
    const encodeAtScale = (nextScale, qualities) => {
      canvas.width = Math.max(1, Math.round(video.videoWidth * nextScale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * nextScale));
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      for (const quality of qualities) {
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        if ((dataUrl.split(',')[1] || '').length <= maxBase64Length) return dataUrl;
      }
      return '';
    };
    capturedPhoto = encodeAtScale(scale, [0.76, 0.68, 0.60, 0.52]);
    if (!capturedPhoto) {
      scale *= 0.78;
      capturedPhoto = encodeAtScale(scale, [0.68, 0.58, 0.50]);
    }
    if (!capturedPhoto) {
      showMessage($('#checkin-message'), 'Ukuran foto masih terlalu besar. Coba ambil foto dengan latar yang lebih sederhana atau perangkat lain.', 'error');
      return;
    }
    $('#photo-preview').src = capturedPhoto;
    $('#photo-preview').hidden = false;
    video.hidden = true;
    $('#retake-photo').hidden = false;
    $('#capture-photo').disabled = true;
    $('#submit-checkin').disabled = !currentLocation;
    stopCamera();
    showMessage($('#checkin-message'), 'Foto berhasil diambil. Periksa hasil foto lalu kirim absensi.');
  }

  async function retakePhoto() {
    capturedPhoto = '';
    $('#photo-preview').hidden = true;
    $('#camera-preview').hidden = false;
    $('#camera-placeholder').hidden = true;
    $('#retake-photo').hidden = true;
    $('#capture-photo').disabled = true;
    $('#submit-checkin').disabled = true;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser tidak menyediakan akses kamera. Gunakan browser modern melalui HTTPS.');
      }
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
      const video = $('#camera-preview');
      video.srcObject = cameraStream;
      await video.play();
      $('#capture-photo').disabled = false;
      $('#camera-status').textContent = 'Kamera aktif.';
    } catch (error) {
      stopCamera();
      $('#capture-area').hidden = true;
      $('#checkin-start-area').hidden = false;
      $('#start-checkin').hidden = false;
      showMessage($('#checkin-message'), (error.message || 'Kamera tidak dapat dibuka kembali.') + ' Tekan Absen Sekarang untuk mengulangi proses izin.', 'error');
    }
  }

  async function submitCheckin() {
    if (!coachToken || !currentLocation || !capturedPhoto) {
      showMessage($('#checkin-message'), 'Foto dan lokasi wajib tersedia sebelum mengirim absensi.', 'error');
      return;
    }
    const button = $('#submit-checkin');
    setBusy(button, true, 'Menyimpan absensi…');
    showMessage($('#checkin-message'), 'Mengunggah foto dan menyimpan lokasi serta waktu server…');
    try {
      const photoBase64 = capturedPhoto.split(',')[1] || '';
      const result = await request('save_coach_checkin', {
        coach: coachToken,
        latitude: String(currentLocation.latitude),
        longitude: String(currentLocation.longitude),
        accuracy: String(currentLocation.accuracy),
        photoMime: 'image/jpeg',
        photoBase64
      });
      if (result.result !== 'success' && result.alreadyCheckedIn && result.checkin) {
        checkin = result.checkin;
        renderCheckinState();
        stopCamera();
        showMessage($('#checkin-message'), 'Absensi hari ini sudah tercatat sebelumnya.', 'success');
        await refreshCoachHistory();
        return;
      }
      if (result.result !== 'success') throw new Error(result.message || 'Absensi gagal disimpan.');
      checkin = result.checkin;
      renderCheckinState();
      showMessage($('#checkin-message'), result.message || 'Absensi coach berhasil tersimpan.', 'success');
      stopCamera();
      $('#capture-area').hidden = true;
      await refreshCoachHistory();
    } catch (error) {
      showMessage($('#checkin-message'), error.message || 'Gagal mengirim absensi.', 'error');
    } finally {
      setBusy(button, false);
    }
  }

  function renderMembers() {
    const list = $('#member-list');
    $('#member-count').textContent = `${members.length} nama anggota aktif pada ${coach ? coach.ekstrakurikuler : 'ekstrakurikuler ini'}`;
    if (!members.length) {
      list.innerHTML = '<div class="empty-state">Belum ada nama anggota pada sheet AnggotaAktif untuk ekstrakurikuler ini. Pengelola perlu mengisi roster terlebih dahulu; jumlah agregat pada laporan sumber tidak memuat daftar nama siswa.</div>';
      $('#save-members').disabled = true;
      return;
    }
    $('#save-members').disabled = false;
    list.innerHTML = members.map((member, index) => `
      <article class="member-row" data-member-id="${escapeHTML(member.id)}">
        <div class="member-id"><strong>${escapeHTML(member.nama)}</strong><span>${escapeHTML(member.kelas || 'Kelas belum diisi')}</span></div>
        <div class="member-field"><label for="status-${index}">KEHADIRAN</label><select class="field-input attendance-status" id="status-${index}" required><option value="">Pilih status</option>${STATUSES.map((status) => `<option value="${status}">${status}</option>`).join('')}</select></div>
        <div class="member-field"><label for="score-${index}">NILAI (0–100)</label><input class="field-input member-score" id="score-${index}" type="number" min="0" max="100" step="1" inputmode="numeric" placeholder="Opsional"></div>
        <div class="member-field"><label for="note-${index}">CATATAN</label><input class="field-input member-note" id="note-${index}" type="text" maxlength="250" placeholder="Catatan coach (opsional)"></div>
      </article>
    `).join('');
  }

  async function saveMembers() {
    if (!coach || !checkin || !members.length) return;
    const records = [];
    const cards = $$('.member-row');
    for (let index = 0; index < cards.length; index += 1) {
      const card = cards[index];
      const status = $('.attendance-status', card).value;
      const scoreText = $('.member-score', card).value.trim();
      const score = scoreText === '' ? '' : Number(scoreText);
      if (!STATUSES.includes(status)) {
        showMessage($('#member-message'), `Pilih status kehadiran untuk ${members[index].nama}.`, 'error');
        $('.attendance-status', card).focus();
        return;
      }
      if (scoreText !== '' && (!Number.isInteger(score) || score < 0 || score > 100)) {
        showMessage($('#member-message'), `Nilai ${members[index].nama} harus berupa bilangan bulat 0 sampai 100.`, 'error');
        $('.member-score', card).focus();
        return;
      }
      records.push({
        memberId: members[index].id,
        status,
        score: scoreText === '' ? '' : String(score),
        note: $('.member-note', card).value.trim()
      });
    }

    const button = $('#save-members');
    setBusy(button, true, 'Menyimpan data…');
    showMessage($('#member-message'), 'Menyimpan kehadiran dan penilaian anggota…');
    try {
      const result = await request('save_member_records', {
        coach: coachToken,
        checkinId: checkin.id,
        records: JSON.stringify(records)
      });
      if (result.result !== 'success') throw new Error(result.message || 'Data anggota gagal disimpan.');
      showMessage($('#member-message'), result.message || 'Kehadiran dan evaluasi anggota tersimpan.', 'success');
      await refreshCoachHistory();
    } catch (error) {
      showMessage($('#member-message'), error.message || 'Gagal menyimpan data anggota.', 'error');
    } finally {
      setBusy(button, false);
    }
  }

  async function refreshCoachHistory() {
    if (!coachToken) return false;
    try {
      const result = await request('coach_info', { coach: coachToken }, 'GET');
      if (result.result !== 'success') return false;
      checkin = result.checkin || checkin;
      renderCheckinHistory(result.checkinRecent || []);
      renderHistory(result.recent || []);
      renderCheckinState();
      return true;
    } catch (error) {
      // Kegagalan memuat ulang riwayat tidak boleh membatalkan pesan sukses
      // untuk transaksi absensi/penilaian yang sudah tersimpan.
      console.warn('Riwayat coach belum dapat diperbarui:', error);
      return false;
    }
  }

  function renderCheckinHistory(rows) {
    const container = $('#coach-checkin-history');
    if (!rows.length) {
      container.innerHTML = '<div class="empty-state">Belum ada riwayat absensi coach.</div>';
      return;
    }
    container.innerHTML = rows.map((row) => `
      <div class="history-item"><div><strong>${escapeHTML(row.dateTimeLabel)}</strong><small>${escapeHTML(row.ekstrakurikuler)} · Akurasi ±${escapeHTML(row.accuracy || '—')} m</small></div>${row.mapUrl ? `<a href="${escapeHTML(row.mapUrl)}" target="_blank" rel="noopener">Peta ↗</a>` : ''}</div>
    `).join('');
  }

  function renderHistory(rows) {
    const body = $('#coach-history-rows');
    $('#coach-monitor').hidden = false;
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="5">Belum ada data kehadiran atau penilaian anggota.</td></tr>';
      return;
    }
    body.innerHTML = rows.map((row) => `
      <tr><td>${escapeHTML(row.dateLabel)}</td><td><strong>${escapeHTML(row.member)}</strong></td><td><span class="status-text status-${escapeHTML(row.status)}">${escapeHTML(row.status)}</span></td><td>${escapeHTML(row.score === '' || row.score == null ? '—' : row.score)}</td><td>${escapeHTML(row.note || '—')}</td></tr>
    `).join('');
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
      const todayStr = jakartaDateKey();
      $('#date-from').value = todayStr.slice(0, 8) + '01';
      $('#date-to').value = todayStr;
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
    $('#download-docx').disabled = true;
    $('#admin-login-form').reset();
  }

  function renderReport(data) {
    const coachRows = Array.isArray(data.coachRows) ? data.coachRows : [];
    const memberRows = Array.isArray(data.memberRows) ? data.memberRows : [];
    const counts = { Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0 };
    memberRows.forEach((row) => { if (Object.prototype.hasOwnProperty.call(counts, row.status)) counts[row.status] += 1; });
    const scores = memberRows
      .filter((row) => row.score !== '' && row.score != null)
      .map((row) => Number(row.score))
      .filter((value) => Number.isFinite(value));
    const average = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—';
    $('#report-stats').innerHTML = [
      ['ABSENSI COACH', coachRows.length],
      ['CATATAN ANGGOTA', memberRows.length],
      ['HADIR / IZIN', `${counts.Hadir} / ${counts.Izin}`],
      ['SAKIT / ALPA', `${counts.Sakit} / ${counts.Alpa}`],
      ['RATA-RATA NILAI', average]
    ].map(([label, value]) => `<div class="stat-box"><span>${escapeHTML(label)}</span><strong>${escapeHTML(value)}</strong></div>`).join('');

    $('#report-coach-rows').innerHTML = coachRows.length ? coachRows.map((row) => `
      <tr><td>${escapeHTML(row.dateLabel)}</td><td>${escapeHTML(row.timeLabel)}</td><td><strong>${escapeHTML(row.coach)}</strong></td><td>${escapeHTML(row.ekstrakurikuler)}</td><td>${escapeHTML(row.latitude)}, ${escapeHTML(row.longitude)}<br><span class="muted">±${escapeHTML(row.accuracy)} m</span>${row.mapUrl ? `<br><a href="${escapeHTML(row.mapUrl)}" target="_blank" rel="noopener">Buka peta ↗</a>` : ''}</td><td>${row.photoUrl ? `<a href="${escapeHTML(row.photoUrl)}" target="_blank" rel="noopener">Foto bukti ↗</a>` : '—'}</td></tr>
    `).join('') : '<tr><td colspan="6">Belum ada absensi coach pada periode ini.</td></tr>';

    $('#report-member-rows').innerHTML = memberRows.length ? memberRows.map((row) => `
      <tr><td>${escapeHTML(row.dateLabel)}</td><td>${escapeHTML(row.coach)}</td><td><strong>${escapeHTML(row.member)}</strong><br><span class="muted">${escapeHTML(row.className || '')}</span></td><td>${escapeHTML(row.ekstrakurikuler)}</td><td><span class="status-text status-${escapeHTML(row.status)}">${escapeHTML(row.status)}</span></td><td>${escapeHTML(row.score === '' || row.score == null ? '—' : row.score)}</td></tr>
    `).join('') : '<tr><td colspan="6">Belum ada catatan anggota pada periode ini.</td></tr>';

    $('#report-period').textContent = `${data.fromLabel} — ${data.toLabel} · ${data.ekstrakurikuler}`;
    $('#report-result').hidden = false;
  }

  async function loadReport() {
    if (!adminToken) return;
    const from = $('#date-from').value;
    const to = $('#date-to').value;
    const extracurricular = $('#report-division').value;
    const button = $('#load-report');
    if (!from || !to || from > to) {
      showMessage($('#report-message'), 'Periksa tanggal awal dan akhir laporan.', 'error');
      return;
    }
    currentReport = null;
    $('#report-result').hidden = true;
    $('#download-docx').disabled = true;
    setBusy(button, true, 'Mengambil rekap…');
    showMessage($('#report-message'), 'Mengambil data absensi dan penilaian…');
    try {
      const result = await request('report_data', { adminToken, from, to, extracurricular });
      if (result.result !== 'success') {
        if (result.expired) { logoutAdmin(); throw new Error('Sesi administrator berakhir. Silakan masuk kembali.'); }
        throw new Error(result.message || 'Data laporan gagal dimuat.');
      }
      currentReport = { from, to, extracurricular };
      renderReport(result);
      $('#download-docx').disabled = false;
      const coachCount = Array.isArray(result.coachRows) ? result.coachRows.length : 0;
      const memberCount = Array.isArray(result.memberRows) ? result.memberRows.length : 0;
      showMessage($('#report-message'), `Berhasil memuat ${coachCount} absensi coach dan ${memberCount} catatan anggota.`, 'success');
    } catch (error) {
      showMessage($('#report-message'), error.message || 'Gagal memuat laporan.', 'error');
    } finally {
      setBusy(button, false);
    }
  }

  function base64ToBlob(base64, mimeType) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: mimeType });
  }

  async function downloadDocx() {
    if (!adminToken || !currentReport) return;
    const button = $('#download-docx');
    setBusy(button, true, 'Membuat dokumen Word…');
    showMessage($('#report-message'), 'Menyusun laporan dan bukti foto…');
    try {
      const result = await request('export_docx', {
        adminToken,
        from: currentReport.from,
        to: currentReport.to,
        extracurricular: currentReport.extracurricular
      });
      if (result.result !== 'success' || !result.base64) {
        if (result.expired) logoutAdmin();
        throw new Error(result.message || 'Dokumen gagal dibuat.');
      }
      const blob = base64ToBlob(result.base64, result.mimeType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = result.filename || 'Laporan_Absensi_Ekstrakurikuler.docx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
      showMessage($('#report-message'), 'Laporan DOCX berhasil dibuat dan diunduh.', 'success');
    } catch (error) {
      showMessage($('#report-message'), error.message || 'Gagal mengunduh laporan DOCX.', 'error');
    } finally {
      setBusy(button, false);
    }
  }

  function init() {
    const now = new Date();
    $('#year').textContent = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Jakarta', year: 'numeric' }).format(now);
    $('#today-label').textContent = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'Asia/Jakarta' }).format(now);
    loadSchoolLogo();
    renderPrograms();
    $('.brand').addEventListener('click', (event) => {
      event.preventDefault();
      switchView('beranda');
    });
    $$('.nav-btn').forEach((button) => button.addEventListener('click', () => switchView(button.dataset.view)));
    $$('[data-go]').forEach((button) => button.addEventListener('click', () => switchView(button.dataset.go)));
    $('#start-checkin').addEventListener('click', startCheckin);
    $('#capture-photo').addEventListener('click', capturePhoto);
    $('#retake-photo').addEventListener('click', retakePhoto);
    $('#submit-checkin').addEventListener('click', submitCheckin);
    $('#save-members').addEventListener('click', saveMembers);
    $('#admin-login-form').addEventListener('submit', adminLogin);
    $('#admin-logout').addEventListener('click', logoutAdmin);
    $('#load-report').addEventListener('click', loadReport);
    $('#download-docx').addEventListener('click', downloadDocx);
    window.addEventListener('beforeunload', stopCamera);
    if (coachToken) switchView('absensi');
    loadCoach();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
