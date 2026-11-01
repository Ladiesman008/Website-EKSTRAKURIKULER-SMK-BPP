# Sistem Absensi Coach & Evaluasi Ekstrakurikuler — SMK BPP Bandung

Versi 3.2 ini memperbaiki alur interaksi, koneksi API, validasi payload, dan layout responsif; versi ini juga mengganti data khusus Musik pada versi sebelumnya menjadi enam program dalam dokumen **Laporan Evaluasi & Kinerja Ekstrakurikuler SMK Balai Perguruan Putri Bandung, TA 2025/2026**.

## Fitur utama

1. **Beranda** menampilkan Seni Musik, English Club, Boxing, Futsal, Seni Tari, dan Basket; termasuk pembina/coach, ketua, partisipasi aktif, jadwal, visi, misi, kegiatan, dan target kejuaraan.
2. **Absensi Coach tanpa login** melalui link rahasia per coach. Coach menekan *Absen Sekarang* satu kali; browser meminta izin kamera dan lokasi, menampilkan hitung mundur 3 detik, mengambil foto otomatis, lalu langsung menyimpan absensi ke server.
3. **Timestamp server** disimpan dalam zona waktu `Asia/Jakarta`; tanggal dan jam tidak diambil dari jam perangkat coach.
4. **Bukti foto dan lokasi** disimpan ke Google Drive pribadi pemilik spreadsheet. Data koordinat, akurasi GPS, tautan peta, ID foto, dan URL foto tercatat di Google Sheets.
5. Setelah check-in berhasil, coach dapat mengisi **kehadiran dan nilai anggota aktif** (status Hadir/Izin/Sakit/Alpa, nilai 0–100 opsional, dan catatan).
6. **Tarik Data** hanya untuk administrator. Laporan dapat difilter menurut periode dan ekstrakurikuler, lalu diunduh sebagai DOCX yang menyertakan tabel absensi coach, tabel anggota, identitas enam program, dan lampiran foto.

## Data ekstrakurikuler dari dokumen sumber

| Ekstrakurikuler | Pembina / Coach | Ketua / Koordinator | Partisipasi aktif | Jadwal |
|---|---|---|---:|---|
| Seni Musik | Sahrul Mubarok, S. Pd. | Faris Al Fathir | 44 | Senin & Selasa |
| English Club | Ms. Salsabila Maulida Aisyah Fristi Juniar, S. Pd. | Ade | 41 | Rabu |
| Boxing | H. Gilang Muhammad Farji Faresi, M. Pd. | Muhammad Akram | 27 | Senin |
| Futsal | M. Rasyid, S. Pd. | Variel | 20 | Rabu |
| Seni Tari | Ghina Zalfa Dewi, S. Pd. | Jasmine | 16 | Kamis |
| Basket | Lizaldi Ramandhika, S. Pd. / Cselia Midtsaluna, S. Pd. | Alif | 14 | Kamis |

Total di dokumen sumber adalah **162 entri partisipasi aktif**. Karena dokumen juga menjelaskan adanya siswa yang mengikuti lebih dari satu ekstrakurikuler, angka ini diperlakukan sebagai akumulasi partisipasi, bukan jumlah siswa unik.

Dokumen sumber berisi jumlah anggota dan struktur pembina, tetapi tidak menyertakan daftar lengkap nama anggota per ekstrakurikuler. Karena itu, roster tidak diisi dengan nama contoh atau data rekaan. Pengelola harus mengisi daftar nama siswa pada sheet `AnggotaAktif` sebelum coach dapat mengabsen anggota.

## Isi paket

- `index.html` — struktur halaman website.
- `style.css` — dark neumorphism hitam/charcoal, layout responsif, dan area logo.
- `logo.png` / `logo.svg` / `logo.webp` / `logo.jpg` / `logo.jpeg` (juga AVIF/GIF) — letakkan file logo sekolah di folder yang sama dengan `index.html`. Frontend akan mencoba nama-nama ini otomatis. Nama file harus huruf kecil `logo` diikuti ekstensi; format PNG transparan atau SVG disarankan.
- `data.js` — data deskripsi enam ekstrakurikuler dari dokumen sumber.
- `script.js` — navigasi, izin kamera/lokasi, pengambilan foto, pengiriman check-in, kehadiran/nilai anggota, login admin, rekap, dan unduh DOCX.
- `config.js` — URL Web App Google Apps Script.
- `code.gs` — backend Apps Script, database Sheets, pembuatan link coach, upload foto ke Drive, timestamp server, dan generator DOCX.
- `appsscript.json` — manifest Apps Script.
- `Template_Laporan_Absensi_Ekstrakurikuler.docx` — contoh layout laporan kosong yang mengikuti identitas visual dokumen sekolah.

## Instalasi Google Sheets dan Apps Script

1. Buka spreadsheet yang akan menjadi database. Jika ingin mempertahankan database lama, gunakan spreadsheet yang sama; sheet lama tidak dihapus.
2. Buka **Extensions → Apps Script**.
3. Ganti isi file `Code.gs` dengan isi `code.gs` dari paket ini.
4. Aktifkan tampilan file manifest `appsscript.json`, lalu salin isi file manifest dari paket.
5. Pada **Project Settings → Script Properties**, buat properti berikut:

   | Property | Contoh | Keterangan |
   |---|---|---|
   | `ADMIN_USER` | `adminbpp` | Username administrator laporan |
   | `ADMIN_PASS` | kata sandi kuat | Password administrator; jangan dibagikan |
   | `WEBSITE_URL` | `https://domain-website-kamu/` | URL halaman website publik |
   | `PHOTO_FOLDER_ID` | (otomatis dibuat) | Jangan perlu diisi manual; folder akan dibuat saat check-in pertama |

6. Pilih fungsi `setupAll` lalu klik **Run**. Berikan izin Spreadsheet, Drive, dan Docs. Fungsi ini membuat sheet yang dibutuhkan, mengisi data enam ekstrakurikuler, dan membuat tujuh link coach (Basket memiliki dua coach).
7. Buka sheet `Coach`; salin setiap nilai pada kolom `Link Akses` dan bagikan hanya kepada coach yang bersangkutan. Menu spreadsheet **Absensi Coach → Perbarui / tampilkan link coach** dapat memperbarui link jika `WEBSITE_URL` baru diatur setelah setup.
8. Isi roster pada sheet `AnggotaAktif` dengan kolom:

   `ID Anggota | Nama Lengkap | Kelas | Ekstrakurikuler | Status | Catatan`

   Contoh nilai `Status`: `Aktif` atau `Disetujui`. Kolom `ID Anggota` boleh dikosongkan; sistem akan mengisinya otomatis. Nilai `Ekstrakurikuler` harus persis salah satu dari enam nama di atas. Jangan masukkan angka jumlah partisipasi sebagai pengganti nama siswa.
9. Deploy Apps Script sebagai **Web App**:
   - **Execute as:** akun pemilik script.
   - **Who has access:** Anyone, karena coach tidak menggunakan login Google.
10. Buka **Deploy → Manage deployments → Edit** pada deployment yang dipakai website, pilih **New version**, lalu deploy ulang `code.gs` terbaru. Dengan mengedit deployment yang sama, URL `/exec` biasanya tetap sama. Jika membuat deployment baru, salin URL `/exec` baru ke `SCRIPT_URL` di `config.js`.
11. Setelah deploy, uji endpoint kesehatan dengan membuka `URL_WEB_APP/exec?action=health`. Respons yang benar memuat `service: Absensi Coach SMK BPP` dan `version: 3.2`. Jika respons berbeda, frontend masih mengarah ke backend versi lama.

## Instalasi website

1. Upload `index.html`, `style.css`, `data.js`, `config.js`, `script.js`, dan file logo (`logo.png`, `logo.svg`, `logo.webp`, `logo.jpg`, `logo.jpeg`, `logo.avif`, atau `logo.gif`) ke folder hosting yang sama. Untuk GitHub Pages, letakkan file logo di folder yang sama dengan `index.html`; pemanggilan logo memakai path relatif sehingga berfungsi pada project site maupun custom domain.
2. Gunakan hosting **HTTPS** (misalnya GitHub Pages atau Netlify). API kamera dan GPS browser tidak berjalan dari halaman HTTP biasa atau file lokal.
3. Pastikan `WEBSITE_URL` pada Script Properties menunjuk ke alamat publik website yang sama.
4. Buka website melalui URL publik. Uji menu Beranda, lalu buka link coach dari sheet `Coach`.

## Pemeriksaan setelah update V3.2

- Buka website di desktop dan HP; pastikan logo terlihat di kiri atas. Jika belum, periksa apakah nama file benar-benar `logo.png` (atau salah satu ekstensi yang didukung) dan berada satu folder dengan `index.html`.
- Klik ketiga menu navigasi dan tombol “Buka portal coach”.
- Buka link coach; pastikan nama coach dan ekskul berhasil diverifikasi.
- Tekan “Absen Sekarang” satu kali dan izinkan kamera serta lokasi. Setelah hitung mundur 3 detik, foto harus terambil dan dikirim otomatis. Pastikan satu baris muncul pada `AbsensiCoach`.
- Isi status seluruh anggota aktif dan simpan; pastikan data masuk ke `AbsensiAnggota` dan `Penilaian`.
- Login administrator, tampilkan rekap, lalu unduh DOCX.
- Jika muncul pesan koneksi, periksa `SCRIPT_URL` dan endpoint `?action=health`; deployment backend harus versi 3.2.

## Cara kerja absensi coach

1. Coach membuka URL pribadi yang memuat token `?coach=...`.
2. Coach menekan **Absen Sekarang** satu kali. Browser meminta izin kamera dan lokasi.
3. Setelah kedua izin diberikan, kamera menampilkan pratinjau dan sistem mendapatkan koordinat serta estimasi akurasi GPS.
4. Hitung mundur 3 detik berjalan, foto diambil otomatis, lalu absensi langsung disimpan. Jika unggahan gagal karena jaringan, tombol **Coba Simpan Lagi** muncul tanpa perlu mengambil foto ulang.
5. Apps Script mencatat waktu server, tanggal, koordinat, akurasi, coach, ekstrakurikuler, serta menyimpan foto ke folder Drive pribadi.
6. Satu coach hanya dapat membuat satu check-in per tanggal. Pengiriman ulang pada hari yang sama akan dikenali sebagai duplikat, bukan membuat baris baru.
7. Setelah check-in tercatat, coach dapat memilih kehadiran setiap anggota dan memberikan nilai/catatan.

## Cara menarik laporan DOCX

1. Buka menu **Tarik Data** pada website.
2. Login dengan `ADMIN_USER` dan `ADMIN_PASS`.
3. Pilih tanggal awal, tanggal akhir, dan ekstrakurikuler atau `Semua Ekstrakurikuler`.
4. Klik **Tampilkan Rekap**, periksa tabel absensi coach dan anggota.
5. Klik **Download Laporan DOCX**. Dokumen memuat rekap coach, koordinat dan akurasi GPS, tautan foto Drive, kehadiran/nilai anggota, identitas program, dan lampiran foto (maksimal 30 foto disisipkan langsung agar ukuran dokumen tetap wajar).

## Tentang DOCX yang diunggah

File yang diberikan adalah **Laporan Evaluasi & Kinerja Ekstrakurikuler TA 2025/2026** sepanjang sembilan halaman, bukan formulir absensi kosong dengan placeholder. Sistem tidak menimpa laporan historis tersebut. Generator DOCX membuat dokumen laporan absensi terpisah dengan identitas sekolah, blok judul navy, aksen biru, struktur tabel, dan blok pengesahan yang mengacu pada gaya dokumen sumber. File `Template_Laporan_Absensi_Ekstrakurikuler.docx` disertakan sebagai contoh layout kosong.

## Catatan keamanan dan akurasi

- **Link coach adalah kunci akses rahasia (bearer link).** Siapa pun yang menerima link dapat melakukan absensi atas nama coach. Jangan membagikannya di grup umum. Jika link bocor, nonaktifkan coach dari menu spreadsheet dan buat link baru.
- Kamera dan lokasi hanya aktif setelah coach menekan tombol dan menyetujui izin browser. Coach dapat menolak izin, tetapi tanpa foto dan lokasi absensi tidak dapat dikirim.
- GPS perangkat dapat memiliki akurasi yang berbeda dan mungkin dipengaruhi kondisi gedung/perangkat. Website menyimpan koordinat dan nilai akurasi yang dilaporkan browser; **saat ini belum ada validasi radius/geofence sekolah** karena dokumen yang diunggah tidak mencantumkan koordinat resmi sekolah.
- Jangan membagikan folder bukti foto secara publik. Foto disimpan privat di Drive pemilik database; DOCX yang diunduh menyisipkan lampiran foto yang tersedia sehingga dapat diperiksa di dokumen laporan.
- Penggunaan kamera dan GPS memerlukan koneksi HTTPS dan izin pengguna. Di ponsel, gunakan browser yang mendukung `getUserMedia` dan Geolocation API.
- Nilai anggota bersifat opsional dan harus berada pada rentang 0–100 jika diisi. Status kehadiran wajib dipilih.
- Aplikasi ini tidak mengirim laporan otomatis ke kepala sekolah. Administrator mengunduh DOCX lalu menyerahkannya melalui prosedur sekolah.


## Perubahan V3.2

- Tombol **Absen Sekarang** menjalankan alur satu sentuhan: izin kamera/GPS → hitung mundur 3 detik → foto otomatis → simpan otomatis ke backend.
- Tidak ada lagi tombol Ambil Foto dan Kirim Absensi pada alur normal. Jika penyimpanan gagal, tombol **Coba Simpan Lagi** akan mengirim ulang foto yang sama.
- Tombol **Batalkan** tersedia sebelum foto diambil. Berpindah menu saat proses berlangsung akan menghentikan sesi kamera.
- Aksen ungu diganti menjadi hijau tua.
- Endpoint health backend mengembalikan versi `3.2`.
