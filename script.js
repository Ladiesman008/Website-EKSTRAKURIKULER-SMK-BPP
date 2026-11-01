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
  let checkinAttempt = 0;
  let checkinInProgress = false;
  let checkinSaveInProgress = false;
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
      result.message = 'Backend masih menggunakan versi lama. Deploy ulang file code.gs V3.2 melalui Manage deployments → Edit → New version.';
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
    closeProgramPopover();
    if (name !== 'absensi') {
      if (checkinInProgress && !checkinSaveInProgress) cancelCheckin();
      else stopCamera();
      // Jangan menghapus foto saat request penyimpanan berlangsung; foto masih
      // dibutuhkan untuk percobaan ulang bila jaringan terputus.
      if (!checkin && !checkinSaveInProgress) resetCaptureFlow();
    }
    $$('.view').forEach((section) => section.classList.toggle('active', section.id === `view-${name}`));
    $$('.nav-btn').forEach((button) => {
      const isDefaultItem = !button.dataset.scroll && button.dataset.view === name;
      button.classList.toggle('active', isDefaultItem);
      if (isDefaultItem) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderPrograms() {
    $('#extracurricular-grid').innerHTML = EXTRACURRICULARS.map((item) => `
      <button class="program-card neo-card program-open" type="button"
        data-program-open="${escapeHTML(item.id)}" aria-haspopup="dialog" aria-expanded="false"
        aria-label="Buka informasi ${escapeHTML(item.name)}">
        <span class="program-brand">
          <span class="program-emblem-wrap">
            <img class="program-emblem" src="${EXTRACURRICULAR_LOGOS[item.id] || ''}" alt="Emblem ${escapeHTML(item.name)}" loading="eager" decoding="async">
          </span>
          <span class="program-title-stack">
            <span class="program-category">${escapeHTML(item.category)}</span>
            <span class="program-title">${escapeHTML(item.name)}</span>
            <span class="program-count">${item.count} Anggota</span>
          </span>
        </span>
        <span class="program-open-arrow" aria-hidden="true">›</span>
      </button>
    `).join('');

    const select = $('#report-division');
    select.innerHTML = '<option value="Semua Ekstrakurikuler">Semua Ekstrakurikuler</option>' +
      EXTRACURRICULARS.map((item) => `<option value="${escapeHTML(item.name)}">${escapeHTML(item.name)}</option>`).join('');
  }

  function positionProgramPopover(trigger) {
    const panel = $('#program-popover');
    if (!panel || panel.hidden || !trigger) return;
    panel.style.left = '';
    panel.style.right = '';
    panel.style.top = '';
    panel.style.bottom = '';
    panel.style.width = '';

    if (window.innerWidth <= 760) {
      panel.style.left = '12px';
      panel.style.right = '12px';
      panel.style.bottom = '12px';
      panel.style.top = 'auto';
      panel.style.width = 'auto';
      return;
    }

    const anchor = trigger.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const gap = 16;
    const edge = 16;
    let left = anchor.right + gap;
    if (left + panelRect.width > window.innerWidth - edge) {
      left = anchor.left - panelRect.width - gap;
    }
    if (left < edge) left = Math.max(edge, (window.innerWidth - panelRect.width) / 2);

    let top = anchor.top + (anchor.height - panelRect.height) / 2;
    top = Math.max(edge, Math.min(top, window.innerHeight - panelRect.height - edge));
    panel.style.left = `${Math.round(left)}px`;
    panel.style.top = `${Math.round(top)}px`;
  }

  function closeProgramPopover(restoreFocus = false) {
    const panel = $('#program-popover');
    if (!panel || panel.hidden) return;
    const activeTrigger = $('[data-program-open][aria-expanded="true"]');
    if (activeTrigger) activeTrigger.setAttribute('aria-expanded', 'false');
    panel.classList.remove('is-visible');
    panel.setAttribute('aria-hidden', 'true');
    panel.hidden = true;
    if (restoreFocus && activeTrigger) activeTrigger.focus({ preventScroll: true });
  }

  function openProgramPopover(id, trigger) {
    const item = EXTRACURRICULARS.find((entry) => entry.id === id);
    const panel = $('#program-popover');
    if (!item || !panel || !trigger) return;

    const previousTrigger = $('[data-program-open][aria-expanded="true"]');
    if (previousTrigger && previousTrigger !== trigger) previousTrigger.setAttribute('aria-expanded', 'false');

    $('#program-popover-logo').src = EXTRACURRICULAR_LOGOS[item.id] || '';
    $('#program-popover-logo').alt = `Emblem ${item.name}`;
    $('#program-popover-title').textContent = item.name;
    $('#program-popover-subtitle').textContent = `${item.category} · ${item.count} anggota aktif`;
    $('#program-popover-content').innerHTML = `
      <div class="program-popover-intro">
        <p>${escapeHTML(item.description)}</p>
      </div>
      <div class="program-popover-facts">
        <div class="program-popover-fact"><span>PEMBINA / COACH</span><strong>${item.coaches.map(escapeHTML).join('<br>')}</strong></div>
        <div class="program-popover-fact"><span>KETUA / KOORDINATOR</span><strong>${escapeHTML(item.chair)}</strong></div>
        <div class="program-popover-fact"><span>HARI LATIHAN</span><strong>${escapeHTML(item.schedule)}</strong></div>
        <div class="program-popover-fact"><span>ANGGOTA AKTIF</span><strong>${item.count} siswa</strong></div>
      </div>
      <section class="program-popover-section"><h3>Visi</h3><p>${escapeHTML(item.vision)}</p></section>
      <section class="program-popover-section"><h3>Misi</h3><ol>${item.missions.map((entry) => `<li>${escapeHTML(entry)}</li>`).join('')}</ol></section>
      <section class="program-popover-section"><h3>Standar Kegiatan</h3><ul>${item.activities.map((entry) => `<li>${escapeHTML(entry)}</li>`).join('')}</ul></section>
      <section class="program-popover-section"><h3>Target Kejuaraan</h3><p>${escapeHTML(item.competition)}</p></section>
      <p class="program-popover-note">Tanggal sampel absensi pada laporan sumber: ${escapeHTML(item.sampleDates)}.</p>
    `;

    trigger.setAttribute('aria-expanded', 'true');
    panel.hidden = false;
    panel.setAttribute('aria-hidden', 'false');
    panel.classList.remove('is-visible');
    // Reflow only the floating panel; the program grid remains untouched.
    void panel.offsetWidth;
    panel.classList.add('is-visible');
    positionProgramPopover(trigger);
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
      $('#submit-checkin').hidden = true;
      const photoAt = checkin.waktuLabel || 'Waktu tercatat oleh server';
      $('#checkin-existing-info').textContent = `${photoAt} · Akurasi lokasi ±${checkin.akurasi || '—'} m`;
      const map = $('#checkin-existing-map');
      if (checkin.mapUrl) { map.href = checkin.mapUrl; map.hidden = false; } else { map.hidden = true; }
    } else {
      existing.hidden = true;
      startArea.hidden = false;
      captureArea.hidden = true;
      memberWorkspace.hidden = true;
      $('#submit-checkin').hidden = true;
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
    $('#camera-countdown').hidden = true;
    $('#camera-countdown').textContent = '';
    $('#location-status').textContent = 'Menunggu izin lokasi…';
    $('#camera-status').textContent = 'Menunggu izin kamera…';
    $('#submit-checkin').hidden = true;
    $('#cancel-checkin').hidden = false;
  }

  function getPosition() {
    return new Promise((resolve, reject) => {
      if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        return reject(new Error('Kamera dan GPS memerlukan HTTPS. Buka website melalui GitHub Pages/hosting HTTPS, bukan HTTP atau file lokal.'));
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

  function wait(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function capturePhoto() {
    const video = $('#camera-preview');
    const canvas = $('#photo-canvas');
    if (!video.videoWidth || !video.videoHeight) {
      throw new Error('Kamera belum menghasilkan gambar. Tekan Absen Sekarang untuk mencoba kembali.');
    }
    const maxDimension = 1280;
    let scale = Math.min(1, maxDimension / Math.max(video.videoWidth, video.videoHeight));
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Perangkat tidak dapat memproses foto. Muat ulang halaman lalu coba kembali.');
    const maxBase64Length = 1450000;
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
    let dataUrl = encodeAtScale(scale, [0.76, 0.68, 0.60, 0.52]);
    if (!dataUrl) {
      scale *= 0.78;
      dataUrl = encodeAtScale(scale, [0.68, 0.58, 0.50]);
    }
    if (!dataUrl) throw new Error('Ukuran foto masih terlalu besar. Coba lagi dengan pencahayaan lebih baik.');
    return dataUrl;
  }

  async function startCheckin() {
    if (!coach || checkin || checkinInProgress) return;
    const attempt = ++checkinAttempt;
    const button = $('#start-checkin');
    checkinInProgress = true;
    setBusy(button, true, 'Mengaktifkan kamera…');
    showMessage($('#checkin-message'), 'Izinkan akses kamera dan lokasi pada permintaan browser. Setelah keduanya siap, foto akan diambil otomatis.');
    $('#checkin-start-area').hidden = true;
    $('#capture-area').hidden = false;
    $('#camera-placeholder').hidden = false;
    $('#camera-countdown').hidden = true;
    $('#cancel-checkin').hidden = false;
    $('#camera-status').textContent = 'Membuka kamera…';
    $('#location-status').textContent = 'Mengambil koordinat GPS…';
    $('#photo-preview').hidden = true;
    $('#camera-preview').hidden = false;
    $('#submit-checkin').hidden = true;
    capturedPhoto = '';
    currentLocation = null;

    let pendingCameraStream = null;
    try {
      // Panggilan kamera dan geolokasi dimulai langsung dari klik coach.
      const cameraPromise = navigator.mediaDevices && navigator.mediaDevices.getUserMedia
        ? navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 960 } },
            audio: false
          })
        : Promise.reject(new Error('Browser tidak mendukung kamera. Buka website melalui HTTPS dan gunakan browser modern.'));
      const locationPromise = getPosition();
      const results = await Promise.allSettled([cameraPromise, locationPromise]);
      if (results[0].status === 'fulfilled') pendingCameraStream = results[0].value;
      if (attempt !== checkinAttempt) {
        if (pendingCameraStream) pendingCameraStream.getTracks().forEach((track) => track.stop());
        return;
      }
      const failed = results.find((item) => item.status === 'rejected');
      if (failed) throw failed.reason;

      cameraStream = pendingCameraStream;
      currentLocation = results[1].value;
      const video = $('#camera-preview');
      video.srcObject = cameraStream;
      await video.play();
      await wait(450); // beri waktu sensor kamera menstabilkan frame pertama
      if (attempt !== checkinAttempt) return;

      $('#camera-placeholder').hidden = true;
      $('#camera-status').textContent = 'Kamera aktif. Posisikan wajah di tengah.';
      $('#location-status').textContent = `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)} · akurasi ±${currentLocation.accuracy} m`;
      showMessage($('#checkin-message'), 'Foto akan diambil otomatis. Posisikan wajah di tengah kamera.');

      const countdown = $('#camera-countdown');
      countdown.hidden = false;
      for (let seconds = 3; seconds >= 1; seconds -= 1) {
        if (attempt !== checkinAttempt) return;
        countdown.textContent = String(seconds);
        $('#camera-status').textContent = `Foto otomatis dalam ${seconds} detik…`;
        await wait(1000);
      }
      if (attempt !== checkinAttempt) return;

      capturedPhoto = capturePhoto();
      $('#cancel-checkin').hidden = true;
      $('#photo-preview').src = capturedPhoto;
      $('#photo-preview').hidden = false;
      video.hidden = true;
      countdown.hidden = true;
      stopCamera();
      $('#camera-status').textContent = 'Foto berhasil diambil.';
      showMessage($('#checkin-message'), 'Foto berhasil diambil. Menyimpan absensi, lokasi, dan waktu server…');
      await submitCheckin();
    } catch (error) {
      if (attempt !== checkinAttempt) {
        if (pendingCameraStream) pendingCameraStream.getTracks().forEach((track) => track.stop());
        return;
      }
      if (pendingCameraStream) pendingCameraStream.getTracks().forEach((track) => track.stop());
      stopCamera();
      resetCaptureFlow();
      showMessage($('#checkin-message'), error.message || 'Tidak dapat mengakses kamera atau lokasi.', 'error');
    } finally {
      if (attempt === checkinAttempt) {
        checkinInProgress = false;
        setBusy(button, false);
      }
    }
  }

  function cancelCheckin() {
    if (!checkinInProgress) return;
    checkinAttempt += 1;
    checkinInProgress = false;
    stopCamera();
    resetCaptureFlow();
    setBusy($('#start-checkin'), false);
    showMessage($('#checkin-message'), 'Absensi dibatalkan. Foto dan lokasi tidak dikirim.');
  }

  async function submitCheckin() {
    if (checkinSaveInProgress) return;
    if (!coachToken || !currentLocation || !capturedPhoto) {
      showMessage($('#checkin-message'), 'Foto dan lokasi wajib tersedia sebelum menyimpan absensi.', 'error');
      return;
    }
    const button = $('#submit-checkin');
    checkinSaveInProgress = true;
    setBusy(button, true, 'Menyimpan absensi…');
    button.hidden = true;
    showMessage($('#checkin-message'), 'Menyimpan foto, lokasi, dan waktu server…');
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
      setBusy(button, false);
      button.textContent = 'Coba Simpan Lagi';
      button.hidden = false;
      showMessage($('#checkin-message'), `${error.message || 'Gagal menyimpan absensi.'} Foto tetap tersedia; tekan Coba Simpan Lagi tanpa mengambil foto ulang.`, 'error');
    } finally {
      checkinSaveInProgress = false;
      if (checkin) {
        setBusy(button, false);
        button.hidden = true;
      }
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
    $('#extracurricular-grid').addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-program-open]');
      if (!trigger) return;
      event.preventDefault();
      openProgramPopover(trigger.dataset.programOpen, trigger);
    });
    $('#close-program-popover').addEventListener('click', () => closeProgramPopover(true));
    document.addEventListener('click', (event) => {
      const panel = $('#program-popover');
      if (!panel || panel.hidden || panel.contains(event.target)) return;
      if (event.target.closest('[data-program-open]')) return;
      closeProgramPopover();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeProgramPopover(true);
    });
    window.addEventListener('resize', () => {
      const active = $('[data-program-open][aria-expanded="true"]');
      if (active) positionProgramPopover(active);
    });
    window.addEventListener('scroll', () => {
      // Close rather than leaving a detached panel floating over unrelated content.
      closeProgramPopover();
    }, { passive: true });
    $('.brand').addEventListener('click', (event) => {
      event.preventDefault();
      switchView('beranda');
    });
    $$('.nav-btn').forEach((button) => button.addEventListener('click', () => {
      switchView(button.dataset.view);
      $$('.nav-btn').forEach((item) => {
        item.classList.remove('active');
        item.removeAttribute('aria-current');
      });
      button.classList.add('active');
      button.setAttribute('aria-current', 'page');
      if (button.dataset.scroll) {
        window.setTimeout(() => {
          const requested = document.getElementById(button.dataset.scroll);
          const fallback = button.dataset.scroll === 'member-workspace'
            ? ($('#coach-workspace').hidden ? $('#coach-gate') : $('.checkin-card'))
            : null;
          const target = requested && !requested.hidden ? requested : fallback;
          target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 90);
      }
    }));
    $$('[data-go]').forEach((button) => button.addEventListener('click', () => switchView(button.dataset.go)));
    $('#start-checkin').addEventListener('click', startCheckin);
    $('#cancel-checkin').addEventListener('click', cancelCheckin);
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
