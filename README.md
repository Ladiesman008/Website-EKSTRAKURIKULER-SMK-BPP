# Absensi Coach SMK BPP — V3.20

## Catatan pembaruan V3.20 — emblem administrator
- Pada halaman **Tarik Data & Laporan**, di atas judul **Akses administrator** ditambahkan ikon dasi berbasis SVG inline.
- Ikon ditempatkan di dalam kotak berbingkai dengan nuansa arang/abu batu agar selaras dengan tema gelap.
- Efek cekung (inset) dan guratan terang-gelap pada ikon memberi kesan ukiran batu; ukurannya menyesuaikan layar HP.
- Perubahan hanya pada `index.html` dan `style.css`. Alur login administrator, pelaporan, absensi, dan backend tidak diubah.

### Cara memperbarui website ke V3.20
Ganti `index.html` dan `style.css` dengan file V3.20. Pertahankan `script.js`, `data.js`, `config.js`, `code.gs`, `appsscript.json`, dan seluruh folder `assets/`. Tidak perlu deploy ulang Google Apps Script. Setelah commit ke GitHub Pages, lakukan hard refresh atau buka ulang halaman agar CSS terbaru dimuat.

---

# Absensi Coach SMK BPP — V3.19

## Catatan pembaruan V3.19 — layout orientasi HP
- **Landscape:** susunan dashboard tetap memakai sidebar vertikal di kiri dan area konten di kanan. Header, statistik, dan kartu dibuat lebih ringkas agar pas di layar HP landscape yang pendek.
- **Portrait:** konten disusun vertikal; navigasi tetap mudah dijangkau di bagian atas saat scroll, statistik menjadi 2×2, dan enam kartu ekstrakurikuler menjadi satu kolom dengan emblem di kiri serta teks di kanan.
- Halaman Absensi Coach, Penilaian Anggota, dan Tarik Data ikut disesuaikan untuk form, kamera, tombol, tabel, dan jarak sentuh.
- Ditambahkan dukungan safe-area untuk layar berponi / sudut membulat melalui `viewport-fit=cover` dan `env(safe-area-inset-*)`.
- Orientasi tidak dikunci. CSS otomatis menyesuaikan ketika perangkat diputar antara portrait dan landscape.
- Perubahan hanya pada frontend (`index.html` dan `style.css`); backend dan alur absensi tidak diubah.

### Cara memperbarui website ke V3.19
Ganti `index.html` dan `style.css` dengan file V3.19. Pertahankan `script.js`, `data.js`, `config.js`, `code.gs`, `appsscript.json`, dan seluruh folder `assets/` seperti sebelumnya. Tidak perlu deploy ulang Google Apps Script. Setelah commit ke GitHub Pages, lakukan hard refresh atau buka ulang halaman agar CSS baru dimuat.

---


## Catatan pembaruan V3.18
- Tombol tutup animasi amplop memakai ikon silang SVG, bukan karakter teks, agar pusat visualnya presisi di dalam border bundar.
- Ukuran tombol dikunci dengan `box-sizing:border-box`, padding nol, grid centering, dan ukuran responsif desktop/mobile.
- Ruang banner disesuaikan supaya tombol tidak bertabrakan dengan teks pengembang.
- Cache frontend dinaikkan ke `v=3.18`.

## Catatan pembaruan V3.18
- Emoji tunggal 🤓 diperkecil menjadi 66 px desktop, 58 px ponsel, dan 54 px layar kecil.
- Emoji dibuat semi-transparan (sekitar 79–81%) agar tidak terlalu mendominasi layar.
- Gerakan acak diperlambat menjadi 1,45–2,15 detik per lintasan desktop dan 1,75–2,50 detik pada layout sentuh, dengan jeda 140–320 ms agar lebih mudah ditekan.
- Gerakan memakai animasi `transform` (bukan animasi `left/top`) agar lebih ringan dan halus. Posisi tetap berada di dalam batas layar, disesuaikan ulang ketika ukuran layar berubah, dan gerakan berhenti saat tab tidak terlihat.
- Transisi navigasi, kartu, popup, envelope, dan perpindahan halaman diseragamkan dengan easing yang lebih halus. `prefers-reduced-motion` tetap dihormati.
- Perubahan ini hanya pada frontend; `code.gs`, `config.js`, `data.js`, dan manifest tetap sama dengan V3.16. Tidak perlu deploy ulang Apps Script.

---

# Sistem Absensi Coach & Evaluasi Ekstrakurikuler — SMK BPP Bandung

**Riwayat desain: V3.14 — About Popup & Interactive Envelope Reveal**

Versi ini mempertahankan struktur dan fungsi V3.12, tetapi mengganti keseluruhan sistem visual menjadi neumorphism hitam-charcoal dengan material batu berlapis: kartu dan tombol tampak menonjol melalui bayangan luar dan bevel halus, sedangkan input serta tipografi memakai efek cekung/ukiran. Aksen hijau neon diminimalkan dan diganti highlight graphite/netral. Layout beranda, enam emblem ekstrakurikuler, popup melayang, ornamen daun, absensi kamera-GPS, penilaian anggota, dan ekspor DOCX tetap dipertahankan. Backend dan endpoint Google Apps Script tidak berubah.

## Cara memperbarui website ke V3.18

Untuk GitHub Pages, ganti `index.html`, `style.css`, dan `script.js` dengan versi V3.18. Pertahankan `data.js`, `config.js`, `code.gs`, `appsscript.json`, serta seluruh folder `assets/`. Query cache frontend sudah dinaikkan menjadi `v=3.18`. Perubahan ini hanya menyentuh frontend, sehingga Google Apps Script tidak perlu di-deploy ulang. Setelah commit, lakukan hard refresh (`Ctrl + Shift + R)`.

## Pembaruan fitur V3.15

- **Palet penuh charcoal:** latar, header, sidebar, banner, kartu statistik, kartu ekskul, popup, tabel, form, tombol, dan panel laporan menggunakan gradasi hitam-charcoal.
- **Neumorphism timbul 3D:** setiap panel utama memakai dua arah bayangan luar, highlight bevel di sisi atas-kiri, dan bayangan bawah-kanan yang lebih dalam. Tombol tetap memiliki state hover/pressed, tetapi tanpa lapisan glow hijau yang mencolok.
- **Tipografi ukiran:** judul, nama sekolah, label, statistik, dan isi popup memakai bayangan gelap pada sisi atas-kiri serta highlight kecil pada sisi bawah-kanan untuk memberi kesan huruf terukir ke dalam batu.
- **Form dan tabel cekung:** input, area kamera, baris anggota, statistik laporan, dan tabel memakai inset shadow graphite.
- **Popup detail ekskul:** panel tetap melayang di atas grid dan tidak menggeser kartu lain; permukaannya kini memakai material charcoal yang sama.
- **Emblem tetap relevan:** enam simbol ekskul mempertahankan identitas gambarnya masing-masing, tetapi duduk di dalam medali hitam-charcoal.
- **Aksen hijau diminimalkan:** tidak ada tombol primer berwarna hijau penuh atau glow hijau besar; indikator status tetap menggunakan warna semantik yang redup.
- **Responsif dan aksesibel:** aturan desktop/mobile dan dukungan `prefers-reduced-motion` tetap dipertahankan.

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

## Pembaruan tampilan V3.4

- Logo sekolah utama memakai medali 132 px pada desktop, 88 px pada ponsel, dan 75 px untuk layar sangat kecil; gambar menggunakan `object-fit: contain` agar logo tidak terpotong.
- Setiap ekstrakurikuler memiliki emblem SVG khusus di `assets/logos/`: not musik, buku terbuka untuk English Club, sarung tinju, bola futsal, figur tari, dan bola basket.
- Emblem menggunakan bahan visual yang sama: medali batu gelap, rim hijau, highlight bevel, dan bayangan timbul 3D. Bentuk simbol dibedakan agar tetap mudah dikenali.
- Tipografi memakai bayangan ukiran/engraving dengan highlight halus dan bayangan gelap. Panel, kartu, medali, dan tombol memakai beberapa lapis outer shadow dan inset highlight untuk kedalaman neumorphism.
- Foto gedung pada banner utama disimpan sebagai `assets/hero-school.jpg` dan merupakan crop dari referensi yang diberikan pengguna.
- Tidak ada perubahan backend; semua fungsi absensi satu sentuhan, kamera, GPS, roster, penilaian, dan DOCX tetap menggunakan API V3.2. Detail setiap ekskul kini dibuka melalui tombol panah pada kartu, supaya beranda tetap ringkas seperti referensi.

## Isi paket

- `index.html` — struktur halaman website.
- `style.css` — dark neumorphism hitam/charcoal, layout responsif, dan area logo.
- `logo.png` / `logo.svg` / `logo.webp` / `logo.jpg` / `logo.jpeg` (juga AVIF/GIF) — letakkan file logo sekolah di folder yang sama dengan `index.html`. Frontend akan mencoba nama-nama ini otomatis. Nama file harus huruf kecil `logo` diikuti ekstensi; format PNG transparan atau SVG disarankan.
- `data.js` — data deskripsi enam ekstrakurikuler dari dokumen sumber.
- `assets/logos/` — enam emblem SVG khusus (Seni Musik, English Club, Boxing, Futsal, Seni Tari, Basket), dengan gaya medali batu gelap dan aksen hijau. Pastikan folder `assets` ikut diunggah ke GitHub pada path yang sama dengan `index.html`.
- `script.js` — navigasi, izin kamera/lokasi, pengambilan foto, pengiriman check-in, kehadiran/nilai anggota, login admin, rekap, dan unduh DOCX.
- `config.js` — URL Web App Google Apps Script.
- `code.gs` — backend Apps Script, database Sheets, pembuatan link coach, upload foto ke Drive, timestamp server, dan generator DOCX.
- `appsscript.json` — manifest Apps Script.
- `Template_Laporan_Absensi_Ekstrakurikuler.docx` — contoh layout laporan kosong yang mengikuti identitas visual dokumen sekolah.

## Kesesuaian layout V3.4 dengan gambar referensi

- Header sekolah memenuhi lebar halaman, logo berada di kiri, judul sekolah dan tanggal di sisi kanan.
- Sidebar navigasi berada di kiri pada desktop; pada HP berubah menjadi navigasi horizontal yang tetap dapat disentuh.
- Banner beranda menggunakan foto fasad gedung yang dipotong dari gambar referensi yang diunggah, ditempatkan pada `assets/hero-school.jpg`.
- Statistik ditampilkan dalam empat kartu sejajar pada desktop.
- Enam ekstrakurikuler ditampilkan dalam grid 3 kolom × 2 baris pada desktop; pada layar kecil grid berubah menjadi dua kolom atau satu kolom.
- Tombol panah di kartu membuka detail pembina, ketua, jadwal, visi, misi, kegiatan, dan target kejuaraan.
- Panel kutipan diletakkan di bawah grid seperti komposisi referensi.

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

## Pemeriksaan setelah update V3.4

- Buka website di desktop dan HP; pastikan logo sekolah terlihat besar di kiri atas dan keenam emblem tampil pada kartu program. Jika emblem tidak muncul, pastikan folder `assets/logos/` ikut diunggah dengan nama file dan struktur folder yang sama. Jika belum, periksa apakah nama file benar-benar `logo.png` (atau salah satu ekstensi yang didukung) dan berada satu folder dengan `index.html`.
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


## Catatan perubahan sebelumnya V3.2.1
- Logo utama kemudian disetel ulang pada V3.4 menjadi 132 px pada desktop dan 88 px pada ponsel.
- Struktur header V3.4 mengikuti gambar referensi: logo besar di kiri, nama sekolah di sampingnya, serta tanggal dan status di sisi kanan.
- Backend tetap versi API 3.2; tidak perlu deployment Code.gs baru untuk perubahan visual ini.
- Setelah mengganti file V3.4, lakukan hard refresh agar style.css?v=3.4 termuat.


## Pembaruan V3.5 — Interaksi tombol dan dashboard

- Pointer mouse: tombol navigasi, tombol aksi, tombol detail, dan kartu ekstrakurikuler terangkat sedikit dengan transisi singkat.
- Saat ditekan: permukaan tombol terasa masuk/amblas dan border menampilkan glow hijau yang sangat tipis.
- Tombol utama memiliki respons 3D yang lebih terasa namun tetap mempertahankan tema dark-green.
- Di perangkat sentuh, efek tekan tetap aktif tanpa mengandalkan hover.
- Pengguna yang mengaktifkan `prefers-reduced-motion` mendapat transisi dan transformasi minimal.
- Tidak ada perubahan backend; cukup perbarui file frontend (`style.css`) dan metadata versi.

Jalankan `python verify_project.py` untuk pemeriksaan statis paket.


## Perbaikan V3.6 — logo ekskul selalu tampil

Keluhan logo yang tidak muncul ditangani dengan menghilangkan ketergantungan kartu ekskul pada file SVG eksternal. Keenam emblem (Seni Musik, English Club, Boxing, Futsal, Seni Tari, Basket) kini disematkan langsung di `data.js` sebagai SVG data URI. Dengan begitu, emblem tetap tampil meskipun pengguna mengunggah file satu per satu ke GitHub dan folder `assets/logos/` tidak ikut terunggah. File SVG terpisah di `assets/logos/` tetap disediakan sebagai sumber yang mudah diedit.

Cache buster pada HTML diperbarui menjadi V3.6 agar browser tidak menggunakan script lama. Logo kartu ekskul diperbesar dan diberi rim bevel serta cahaya hijau lembut. Untuk memasang, unggah ulang `index.html`, `data.js`, `script.js`, dan `style.css` minimal; lebih disarankan unggah seluruh isi ZIP. Backend tidak berubah.


## Pembaruan V3.7 — ukuran emblem dan ornamen daun

- Ukuran artwork emblem pada kartu ekstrakurikuler diperkecil menjadi 82% dari lingkaran medali. Ruang di antara artwork dan rim terlihat jelas, tanpa mengubah ukuran lingkaran medali utama.
- Ornamen daun abstrak dibuat sebagai `assets/leaf-ornament.svg`, dengan beberapa lapisan relief: bayangan gelap, permukaan batu hijau-charcoal, bevel terang, urat daun terukir, dan batang berlapis.
- Ornamen daun digunakan di bagian bawah sidebar kiri serta sudut kanan bawah panel kutipan. Pada layar ponsel, ornamen sidebar disembunyikan agar navigasi tetap ringkas, sedangkan ornamen kutipan dikecilkan.
- Pastikan folder `assets/` ikut diunggah ke GitHub, karena berisi `hero-school.jpg` dan `leaf-ornament.svg`. Enam emblem ekskul tetap disematkan dalam `data.js`.
- Cache-buster CSS, data, config, dan script diubah ke `?v=3.7`.
- Backend tidak berubah; tidak perlu deployment ulang Apps Script untuk pembaruan UI ini.


### Pratinjau V3.7

- `previews/leaf-ornament-on-charcoal.png` memperlihatkan ornamen daun di atas permukaan charcoal.
- `previews/emblem-spacing.png` memperlihatkan jarak emblem yang sudah diperkecil di dalam medali.


## V3.8 — Floating program details
- Setiap kartu ekstrakurikuler kini berupa tombol akses yang membuka panel detail melayang.
- Panel tidak mengubah ukuran grid, tidak mendorong kartu lain, dan tidak menggunakan backdrop layar penuh.
- Klik kartu lain untuk mengganti isi popup; klik area kosong, tombol X, atau Escape untuk menutup.
- Pada ponsel popup menjadi bottom-sheet yang dapat discroll; kontrol lain di luar panel tetap aktif.
- Ornamen daun SVG diperjelas dengan warna batu hijau-abu yang lebih terang, bevel kontras, dan urat daun terukir.
- Hanya HTML/CSS/JS/SVG berubah; backend Apps Script tidak perlu di-deploy ulang.

## V3.8 — Popup detail ekskul dan daun ukiran yang diperjelas

### Popup melayang
- Klik kartu ekstrakurikuler mana pun untuk membuka informasi detail dalam panel melayang.
- Grid kartu tidak diperluas, tidak mendorong atau mengubah posisi kartu lain.
- Panel tidak memakai backdrop layar penuh; kontrol lain yang berada di luar panel tetap bisa digunakan.
- Klik kartu ekskul lain untuk mengganti informasi di panel yang sama.
- Tutup dengan tombol `×`, tekan `Escape`, atau klik area kosong di luar panel.
- Di HP, panel tampil sebagai bottom-sheet dan isi detail bisa digulir.

### Ornamen daun
- `assets/leaf-ornament.svg` diperbarui dengan permukaan batu hijau-abu yang lebih terang, highlight bevel, bayangan ukir, batang timbul, dan urat daun yang lebih kontras.
- Ukuran dan opacity ornamen pada sidebar serta panel kutipan ditingkatkan agar tidak tenggelam di latar charcoal.

### File yang diunggah
Perbarui seluruh file frontend V3.8 (`index.html`, `style.css`, `script.js`, `data.js`) dan folder `assets/`. `code.gs` dan deployment Apps Script tidak berubah untuk pembaruan UI ini.


## Perbaikan V3.9 — daun selalu terlihat

Keluhan daun yang tidak muncul berasal dari dua risiko pada implementasi sebelumnya: gambar dipanggil melalui path relatif `assets/leaf-ornament.svg` (dapat gagal jika subfolder tidak ikut diunggah) dan ornamen kutipan berada di dalam panel pendek dengan `overflow:hidden`, sehingga hampir seluruh gambar terpotong. Pada V3.9, kedua ilustrasi daun sudah ditanam langsung sebagai SVG inline di `index.html`, tanpa request file tambahan dan tanpa lazy loading. Sidebar menggunakan ruang ornamen yang nyata; panel kutipan memakai `overflow:visible` serta ruang kanan khusus untuk daun. Ukuran tetap disesuaikan untuk mobile.

### File update
Untuk update GitHub, ganti `index.html` dan `style.css` dengan versi V3.9. File `assets/leaf-ornament.svg` boleh tetap disimpan, tetapi tidak lagi menjadi ketergantungan tampilan daun. Backend `code.gs`, `config.js`, dan spreadsheet tidak berubah. Pastikan file `data.js` serta aset lain dari paket lengkap tetap dipertahankan. Setelah commit, lakukan hard refresh.


## V3.10 — Daun ukiran cekung
Pada V3.10, ornamen daun di sidebar dan panel kutipan diubah dari relief timbul menjadi ukiran cekung. Siluet daun tidak lagi memakai bidang isi terang atau drop-shadow luar. Garis tepi dan urat daun memakai pasangan bayangan gelap di sisi kiri-atas dan bevel terang lembut di sisi kanan-bawah untuk memberi kesan alur yang dipahat ke permukaan batu. SVG tetap inline di `index.html`, sehingga tidak bergantung pada pemuatan file gambar eksternal.


## Pembaruan V3.10 — efek daun menjorok ke dalam
Perubahan V3.10 khusus pada ilustrasi daun. Bidang daun terang dan bayangan luar yang sebelumnya membuat efek timbul telah dihilangkan. Bentuk daun sekarang dibuat dari alur outline gelap, garis bayangan cekung pada sisi kiri-atas, bevel reflektif tipis pada sisi kanan-bawah, serta urat daun yang juga dipahat sebagai alur. Dua ornamen tetap inline di `index.html`, sehingga tidak membutuhkan asset tambahan. Cache CSS/JS/data dinaikkan ke `3.10`.

Pemasangan: ganti `index.html` dan `style.css` dari paket V3.10. Pertahankan file JavaScript, konfigurasi, backend, serta aset lain. Tidak perlu deploy ulang Apps Script. Lakukan hard refresh setelah commit.


## V3.11 — Black Neumorphism Ukiran Batu

Ornamen daun diselaraskan dengan permukaan dashboard hitam/charcoal. Tidak ada lagi bidang daun hijau. Bentuk daun memakai alur hitam pekat, bevel graphite abu-abu yang sangat terkendali pada sisi bawah/kanan, serta urat daun berupa garis pahatan. Efeknya cekung ke dalam batu, bukan timbul atau bercahaya.

Pembaruan hanya pada `index.html`, `style.css`, `assets/leaf-ornament.svg`, dan cache-buster asset versi 3.11. Backend tidak berubah. Untuk update GitHub, ganti `index.html` dan `style.css`; `leaf-ornament.svg` juga ikut diganti bila file tersebut digunakan di luar elemen inline.


## Pembaruan ornamen daun V3.13

- Ornamen daun sekarang menggunakan ilustrasi bunga botani yang diunggah oleh pengguna (`Desain tanpa judul.png`).
- Ilustrasi diolah menjadi monokrom graphite/charcoal: bidang putih asli dipetakan ke permukaan batu gelap, tinta hitam dipertahankan sebagai alur ukiran, dan tepi diberi bevel sangat halus.
- Latar hijau transparan dari file sumber tidak ikut ditampilkan.
- Gambar di-embed langsung sebagai CSS data URI (`--leaf-engraving`) agar tidak bergantung pada path atau folder aset di GitHub Pages. File `assets/leaf-botanical-carved.webp` juga disertakan sebagai salinan aset mandiri.
- Ornamen digunakan pada sidebar dan sudut kanan panel kutipan; skala otomatis menyesuaikan desktop dan ponsel.

### Cara memperbarui dari V3.13
Unggah ulang `index.html` dan `style.css` dari paket V3.13. File `assets/leaf-botanical-carved.webp` disertakan sebagai aset mandiri/backup, tetapi tampilan web memakai gambar inline sehingga tidak wajib dimuat terpisah. File backend dan konfigurasi tidak berubah; Google Apps Script tidak perlu di-deploy ulang. Lakukan hard refresh setelah commit.


## Fitur tambahan V3.15

- **Menu Tentang:** tombol Tentang membuka panel mengambang tanpa backdrop layar penuh. Isi menjelaskan tujuan website berdasarkan fungsi yang tersedia: informasi enam ekskul, absensi coach dengan foto/lokasi/timestamp server, pencatatan kehadiran dan nilai anggota, serta rekap DOCX untuk pelaporan kepala sekolah. Panel dapat ditutup melalui tombol X, klik area di luar panel, atau tombol Escape.
- **Emoji interaktif:** satu emoji 🤓 berukuran besar bergerak cepat ke titik-titik acak di layar. Saat emoji ditekan, gerakannya berhenti tepat di posisi tersebut dan memicu animasi amplop.
- **Animasi amplop:** amplop muncul dari posisi emoji yang ditekan, flap terbuka, lalu banner transparan bergaya glassmorphism bergerak keluar. Banner menampilkan “developed by Sahrul Mubarok, S. Pd.” dan “Tahun dibuat · 2026”. Tombol X menutup animasi dan memunculkan kembali emoji.
- **Aksesibilitas:** panel menggunakan dialog non-modal agar kontrol lain di luar panel tidak terkunci. Animasi mengikuti preferensi `prefers-reduced-motion`, dan tombol emoji dapat diakses dengan keyboard.
- **Backend tidak berubah:** tambahan ini hanya pada frontend; Google Apps Script tidak perlu di-deploy ulang.

## Memperbarui ke V3.18

Ganti `index.html`, `style.css`, dan `script.js` dengan file V3.18. File `data.js`, `config.js`, `code.gs`, serta folder `assets/` tetap dipakai seperti sebelumnya. Setelah upload ke GitHub Pages, lakukan hard refresh agar file dengan cache versi 3.17 dimuat.


## Hasil pemeriksaan V3.15

`verify_project_v315.py` menjalankan pemeriksaan statis khusus V3.15; hasil terbaru dicatat di `verification-v3.15.txt`. Pemeriksaan mencakup ID HTML, panel Tentang, animasi emoji/amplop, CSS responsif dan reduced-motion, enam emblem, sintaks JavaScript/Apps Script, serta keberadaan alur absensi, penilaian, dan ekspor DOCX. Pengujian izin kamera/GPS tetap dilakukan pada situs HTTPS setelah deployment.


## Pembaruan V3.16

- Hanya satu emoji 🤓 yang bergerak acak dengan jeda pendek dan lintasan cepat.
- Ukuran emoji: 112 px desktop, 96 px mobile, dan 88 px untuk layar sangat kecil.
- Area gerak memperhitungkan radius tombol agar emoji tidak mudah terpotong tepi layar.
- Efek huruf ukiran cekung diperkuat secara konsisten pada judul, teks, label, tombol, form, tabel, popup, dan footer.
- Warna permukaan tetap hitam charcoal; highlight teks hanya berupa pantulan graphite yang halus.

### File untuk pembaruan GitHub
Ganti `index.html`, `style.css`, dan `script.js` dari paket V3.16. Pertahankan `data.js`, `config.js`, folder `assets/`, serta backend Apps Script yang sedang digunakan.


## Pembaruan V3.18 — gerakan lebih mudah ditangkap dan animasi lebih halus

- Emoji tunggal 🤓 kini berukuran 66 px di desktop, 58 px di ponsel, dan 54 px di layar sangat kecil. Opasitas diturunkan ke sekitar 79–81% agar tampil lebih ringan.
- Lintasan gerak acak diperlambat menjadi 1,45–2,15 detik di desktop dan 1,75–2,50 detik pada perangkat sentuh. Jeda antarlintasan 140–320 ms memberi kesempatan lebih besar untuk menekan emoji.
- Posisi emoji dianimasikan melalui `transform` agar gerak lebih halus dan mengurangi layout repaint. Titik tujuan dijaga di dalam batas viewport dan disesuaikan ketika ukuran layar berubah.
- Saat tab browser tidak terlihat, emoji dibekukan; gerakan dilanjutkan saat tab kembali aktif. Saat emoji ditekan, posisi dibekukan untuk memulai animasi amplop.
- Transisi navigasi, kartu, panel popup, dan envelope menggunakan kurva easing yang lebih lembut. Pengaturan aksesibilitas `prefers-reduced-motion` tetap dipatuhi.
- Hanya `index.html`, `style.css`, dan `script.js` yang berubah untuk rilis ini. Backend, database, konfigurasi, dan data enam ekstrakurikuler tidak diubah.
