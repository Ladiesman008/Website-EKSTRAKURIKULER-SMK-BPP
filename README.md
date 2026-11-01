# Rekonstruksi Sistem Absensi Coach — SMK BPP Bandung

Paket ini mengganti aplikasi lama yang berpusat pada reels, pendaftaran, dan profil siswa menjadi tiga area utama:

1. **Beranda** — informasi ekstrakurikuler Musik Modern, Musik Tradisional, serta Olah Vokal & Paduan Suara.
2. **Absensi Coach** — coach membuka link pribadi tanpa login, memeriksa daftar anggota aktif, mengisi kehadiran, nilai 0–100, dan catatan.
3. **Tarik Data** — administrator memilih periode/divisi, melihat rekap, lalu mengunduh dokumen DOCX.

Tema menggunakan dark neumorphism hitam/charcoal dengan aksen ungu lembut.

## Isi paket

- `index.html` — struktur halaman.
- `style.css` — tema dark neumorphism dan layout responsif.
- `script.js` — navigasi, akses coach, absensi, penilaian, rekap, dan unduh DOCX.
- `config.js` — URL Web App Apps Script.
- `code.gs` — backend Apps Script, migrasi data anggota, akses coach, penyimpanan absensi/nilai, dan ekspor DOCX.
- `appsscript.json` — manifest Apps Script (zona waktu dan scopes).

## Database Google Sheets

Backend mempertahankan sheet `Anggota` dari proyek lama. Kolom lama tidak dihapus. Sistem menambahkan kolom `ID Anggota` untuk identitas stabil setiap anggota.

Sheet yang digunakan:

| Sheet | Isi |
|---|---|
| `Anggota` | Data anggota dari sistem sebelumnya; hanya anggota berstatus verifikasi `Disetujui` yang ditampilkan. Penanda jabatan nonaktif/alumni/keluar dikecualikan. |
| `Coach` | ID coach, nama, divisi, token akses, status link, waktu pembuatan. |
| `Absensi` | Satu catatan per anggota untuk tanggal/sesi/coach, termasuk status kehadiran. |
| `Penilaian` | Nilai, catatan coach, dan identitas sesi yang sama dengan absensi. |

Sheet lama seperti `Postingan` dan `Likes` tidak dihapus, tetapi tidak digunakan oleh aplikasi hasil rekonstruksi.

## Instalasi backend

1. Buka **Google Spreadsheet** yang selama ini menjadi database proyek lama.
2. Pilih **Extensions → Apps Script** pada spreadsheet tersebut. Script harus tetap bound ke spreadsheet karena backend memakai `SpreadsheetApp.getActiveSpreadsheet()`.
3. Ganti isi file `Code.gs` dengan isi `code.gs` di paket ini.
4. Di Apps Script, buka **Project Settings** lalu aktifkan tampilan `appsscript.json`. Ganti manifest dengan isi file `appsscript.json` di paket ini.
5. Pada **Project Settings → Script Properties**, buat properti berikut:

   | Property | Contoh nilai | Keterangan |
   |---|---|---|
   | `ADMIN_USER` | `adminbpp` | Username pengelola laporan |
   | `ADMIN_PASS` | password yang kuat | Password pengelola laporan; jangan dibagikan |
   | `WEBSITE_URL` | `https://akun.github.io/nama-proyek/` | URL website publik yang sudah di-host; opsional tetapi disarankan |

6. Pilih fungsi `setupAll` pada editor Apps Script, lalu klik **Run**. Berikan izin Spreadsheet, Docs, dan Drive. Fungsi ini membuat sheet baru dan menambahkan `ID Anggota` bila belum ada. Fungsi ini tidak menghapus data anggota lama dan tidak membuat anggota contoh palsu.
7. Pastikan data pada sheet `Anggota` mempunyai `Status Verifikasi` bernilai `Disetujui` dan kolom `Divisi` cocok dengan salah satu nama divisi yang digunakan website.
8. Pilih **Deploy → Manage deployments**. Edit deployment Web App yang lama dan buat versi baru, atau buat deployment baru.
   - **Execute as:** akun pemilik script.
   - **Who has access:** Anyone (diperlukan agar coach dapat memakai link tanpa login Google).
9. Salin URL Web App `/exec`. Masukkan URL itu ke `SCRIPT_URL` pada `config.js`. Jika mengedit deployment lama, URL lama biasanya tetap sama.

> Akses publik hanya digunakan pada endpoint aplikasi. Endpoint data coach memerlukan token khusus; endpoint laporan tetap memerlukan login administrator. Jangan pernah membagikan password administrator.

## Instalasi frontend

1. Upload enam file frontend/backend yang relevan (`index.html`, `style.css`, `script.js`, `config.js`; file backend tetap di Apps Script) ke hosting statis seperti GitHub Pages atau Netlify.
2. Tetapkan `WEBSITE_URL` pada Script Properties dengan URL halaman website, misalnya `https://akun.github.io/nama-proyek/`.
3. Pastikan file bernama persis `index.html`, `style.css`, `script.js`, dan `config.js` berada dalam satu folder.

## Membuat link pribadi coach

1. Buka Google Spreadsheet database dan muat ulang halaman.
2. Dari menu spreadsheet pilih **Absensi Coach → Buat link coach baru**.
3. Masukkan nama coach dan salah satu nama divisi secara persis:
   - `Musik Modern`
   - `Musik Tradisional (Angklung & Gamelan)`
   - `Olah Vokal & Paduan Suara`
   - `Semua Divisi` juga dapat digunakan bila coach menangani semua divisi.
4. Link pribadi akan muncul. Bagikan hanya kepada coach tersebut.
5. Jika link bocor atau tidak lagi digunakan, buka sheet `Coach`, salin `ID Coach`, lalu gunakan menu **Absensi Coach → Nonaktifkan link coach**.

**Penting:** link coach adalah kunci akses (bearer link). Siapa pun yang memiliki link dapat mengisi absensi atas nama coach tersebut. Karena itu, jangan bagikan link pada grup umum. Spreadsheet database juga harus dibatasi kepada pengelola yang berwenang.

## Pengaturan laporan

1. Buka menu **Tarik Data** pada website.
2. Login dengan `ADMIN_USER` dan `ADMIN_PASS` dari Script Properties.
3. Pilih tanggal awal, tanggal akhir, dan divisi.
4. Klik **Tampilkan Rekap** untuk memeriksa data.
5. Klik **Download laporan DOCX**.

Dokumen DOCX saat ini dibangun otomatis dengan format laporan standar (judul sekolah, periode, divisi, ringkasan kehadiran/nilai, dan tabel data). **Template DOCX contoh yang disebutkan belum ikut tersedia pada unggahan awal**, sehingga susunan ini belum dapat disamakan persis dengan template sekolah. Setelah template DOCX asli diberikan, generator `exportDocx_` dapat disesuaikan agar mengikuti kolom, tata letak, dan bagian tanda tangan dokumen tersebut.

## Catatan implementasi dan batasan

- Coach tidak mempunyai akun/password. Identitas coach diambil dari token pada query URL `?coach=...`.
- Setiap anggota aktif ditentukan dari status verifikasi `Disetujui`; baris dengan jabatan yang menandakan nonaktif, alumni, atau keluar tidak ditampilkan.
- Data coach dibatasi berdasarkan divisi yang terdaftar pada sheet `Coach`, kecuali coach dengan divisi `Semua Divisi`.
- Nilai wajib berupa bilangan bulat 0–100. Status kehadiran wajib dipilih. Catatan bersifat opsional.
- Pengiriman ulang untuk coach, tanggal, sesi, dan anggota yang sama memperbarui catatan sebelumnya, bukan menggandakan baris.
- Halaman coach menampilkan hingga 25 catatan evaluasi terakhir milik coach tersebut.
- Data laporan DOCX dibuat dari sheet Absensi dan Penilaian. Tidak ada pengiriman otomatis ke kepala sekolah; administrator mengunduh dan menyerahkan dokumennya.
- Template DOCX belum disesuaikan karena tidak ada file DOCX pada lima file sumber yang terunggah.

## Jika link belum dapat digunakan

- Pastikan URL di `config.js` adalah deployment `/exec` yang benar.
- Pastikan Apps Script dideploy sebagai Web App dan aksesnya `Anyone`.
- Pastikan fungsi `setupAll` sudah dijalankan dan sheet `Coach`, `Absensi`, serta `Penilaian` tersedia.
- Pastikan status coach pada sheet `Coach` adalah `Aktif`.
- Pastikan `ADMIN_USER` dan `ADMIN_PASS` sudah diisi sebelum mencoba menu laporan.
- Jika muncul error otorisasi DOCX, jalankan `setupAll` kembali dari editor Apps Script dan selesaikan permintaan izin Google Docs/Drive.
