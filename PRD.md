# snapme: Product Requirements Document

| | |
|---|---|
| Versi | 0.1 (draf untuk perencanaan omp) |
| Tanggal | 8 Oktober 2026 |
| Pemilik | Rori Setiawan |
| Dokumen terkait | `DESIGN-SYSTEM.md`, `ARCHITECTURE.md`, `MILESTONES.md`, halaman acuan UI di `docs/ui-reference/` |

## 1. Ringkasan

snapme adalah photobooth di browser. Pengguna membuka kamera, berpose, menghias strip foto, lalu mengunduh atau mencetaknya, tanpa akun dan tanpa memasang aplikasi. Foto diproses di perangkat pengguna dan hanya diunggah bila pengguna sendiri membuat link.

Tiga hal yang membedakan snapme:

1. **Gesture Snap** (fitur interaktif): angkat dua jari, tahan sebentar, hitung mundur berjalan sendiri.
2. **Strip Estafet** (pembeda 1): satu orang mengisi setengah strip, mengirim link, dan temannya melengkapi dari perangkat lain kapan saja dalam 48 jam.
3. **Strip Hidup + QR** (pembeda 2): tiap pose ikut terekam sebagai klip pendek. QR pada strip cetak membuka versi bergeraknya.

## 2. Masalah dan peluang

Photobooth web yang ada umumnya berhenti di alur "ambil 3 sampai 4 foto, pilih frame, unduh PNG". Tiga gesekan yang masih tersisa:

- **Tombol jauh dari pose.** Untuk foto beramai-ramai, satu orang harus menekan tombol lalu kembali ke posisi sebelum hitung mundur habis.
- **Foto bareng menuntut waktu yang sama.** Booth bersama yang ada mengharuskan semua orang online bersamaan.
- **Strip cetak itu benda mati.** Momen di antara pose (tertawa, salah gaya) hilang.

### Pemindaian pembanding

Dipindai cepat pada 8 Oktober 2026 dari halaman publik masing-masing produk. Ini bukan audit menyeluruh: kolom "yang ditonjolkan" hanya memuat apa yang tertulis di sumber, dan produk lain di luar daftar ini belum diperiksa.

| Produk | Jenis | Yang ditonjolkan di sumbernya | Relevansi untuk snapme |
|---|---|---|---|
| LensBooth | Web | Booth solo dan Shared Booth: dua orang di lokasi berbeda memotret bersamaan dengan shutter tersinkron, lewat link undangan, tanpa daftar | Foto bareng sudah ada, tetapi sinkron (harus online bersamaan). Strip Estafet mengisi sisi asinkron |
| Polaroid Booth | Web | Strip 3 foto dan 4-cut, filter, frame, stiker, PNG resolusi tinggi | Mewakili alur dasar yang harus disamai |
| BeautyPlus Photo Booth | Web | Empat foto menjadi strip digital, gratis | Alur dasar |
| Dreamina (CapCut) | Web, AI | Membuat strip bergaya dari foto unggahan atau prompt | Arah berbeda (generatif), di luar lingkup snapme |
| M.Booth | Web, MVP perorangan | Dua orang memotret terpisah, orang kedua berpose dengan overlay foto pertama, untuk pasangan jarak jauh | Bukti bahwa mekanik asinkron dengan overlay layak. Masih MVP satu foto |
| Simple Booth HALO | Aplikasi iPad untuk acara | Mode tanpa sentuh: angkat telapak untuk mulai, QR untuk mengambil foto | Gesture sudah terbukti di kios dan aplikasi native |
| Auto Selfie Pro, Peace Cam | Aplikasi iOS | Tanda dua jari memicu foto dengan hitung mundur | Sama, di native |

Kesimpulan yang bisa dipertanggungjawabkan: pemicu gesture sudah ada di aplikasi native dan kios, dan estafet asinkron sudah ada sebagai MVP awal, tetapi keduanya tidak saya temukan di photobooth web arus utama yang dipindai. Klaim "satu-satunya" tidak boleh dipakai di materi pemasaran tanpa pemindaian ulang.

## 3. Pengguna sasaran

| Persona | Situasi | Yang dicari |
|---|---|---|
| **Geng nongkrong** (pelajar dan mahasiswa, 2 sampai 5 orang, satu laptop atau HP disandarkan) | Di kelas, kafe, kos | Foto ramai-ramai tanpa ada yang lari ke tombol, hasil lucu yang langsung bisa dibagikan |
| **Teman atau pasangan jarak jauh** | Beda kota, jadwal tidak selalu cocok | Strip "bareng" tanpa harus online bersamaan |
| **Panitia acara kecil** (ulang tahun, kelulusan, bazar kampus) | Satu laptop di meja, printer foto 4R | Booth gratis, hasil siap cetak, tamu bisa mengambil lewat QR |

Perangkat utama: HP Android kelas menengah dan laptop dengan webcam. Bahasa antarmuka: Indonesia santai (lihat §9).

## 4. Tujuan dan ukuran keberhasilan

Angka di bawah adalah target awal untuk divalidasi setelah ada data, bukan hasil pengukuran.

| Tujuan | Ukuran | Target awal |
|---|---|---|
| Alur dasar selesai tanpa bantuan | Sesi yang mencapai unduh dibagi sesi yang memberi izin kamera | 60% atau lebih |
| Gesture Snap benar-benar dipakai | Foto yang dipicu gesture dibagi semua foto, pada sesi dengan gesture menyala | 50% atau lebih |
| Estafet tuntas | Estafet yang selesai dibagi estafet yang dibuat | 40% atau lebih |
| Strip Hidup menambah nilai | Sesi yang mengaktifkan Strip Hidup dibagi sesi yang mencapai halaman Hias | 30% atau lebih |
| Cepat dipakai | Waktu dari Welcome sampai foto pertama | di bawah 30 detik (median) |

Pengukuran memakai analitik tanpa cookie dan tanpa data pribadi (hanya hitungan peristiwa). Pilihan alatnya ditetapkan di M9.

## 5. Lingkup

**Masuk v1**

- Alur dasar: Welcome, pilih layout, ambil foto, hias, hasil.
- Gesture Snap, Strip Estafet (2 orang), Strip Hidup + QR.
- Ekspor siap cetak: strip 2 x 6 inci dan lembar 4R.
- Link strip pribadi yang kedaluwarsa otomatis.

**Tidak masuk v1**

- Akun, login, galeri pribadi.
- Pembayaran dan pemesanan cetak. Layar "Order" dan "Payment" pada gambar referensi tidak dibuat.
- Filter wajah atau beautify berbasis AI, dan pembuatan gambar AI di sisi pengguna.
- Booth bersama real-time (panggilan video).
- Estafet lebih dari 2 orang.
- Aplikasi native dan mode kios terkunci.
- CMS untuk template. Template disimpan sebagai berkas di repo.

## 6. Alur pengguna utama

```
Welcome ─► Pilih layout ─► Ambil foto ─► Hias strip ─► Hasil
                              │              │           ├─ Unduh PNG / Cetak 4R
                              │              │           └─ Buat link + QR (unggah, dengan izin)
                              │              └─ Strip Hidup nyala/mati
                              └─ Estafet ke Teman ─► link /r/{id} ─► teman mengisi sisa ─► Hias ─► Hasil
```

Jalur alternatif "Pakai Foto Galeri": dari Welcome langsung ke Hias dengan foto yang dipilih dari perangkat (P1).

## 7. Kebutuhan fungsional

Prioritas: **P0** wajib untuk rilis pertama, **P1** segera setelahnya, **P2** bila ada waktu.

### 7.1 Alur dasar

| ID | Kebutuhan | Prioritas | Kriteria terima |
|---|---|---|---|
| FR-01 | Halaman Welcome dengan satu aksi utama "Mulai Foto" | P0 | Aksi utama terlihat tanpa menggulir pada 360 x 640 dan 1366 x 768. Halaman tidak memuat kode kamera, gesture, atau kanvas |
| FR-02 | Pilih layout: Strip 4 foto, Strip 3 foto | P0 | Layout terpilih menentukan jumlah foto dan rasio crop di layar kamera |
| FR-03 | Layout Grid 2 x 2 (4R) | P1 | Ekspor 1200 x 1800 px |
| FR-04 | Izin kamera dengan penjelasan sebelum dialog browser | P0 | Ada layar penjelas dan tombol "Izinkan Kamera". Bila ditolak: pesan cara mengaktifkan lagi dan tombol "Pakai Foto Galeri" |
| FR-05 | Pratinjau kamera dicerminkan, dengan panduan crop sesuai layout | P0 | Foto tersimpan sama seperti yang terlihat di pratinjau |
| FR-06 | Ambil foto dengan hitung mundur 3 detik lewat tombol atau tombol Spasi | P0 | Hitung mundur diumumkan ke pembaca layar. Ada kilat layar tunggal, dimatikan saat `prefers-reduced-motion` |
| FR-07 | Baki foto: lihat hasil, ulang foto terakhir, ulang foto tertentu | P0 | Mengulang satu foto tidak menghapus foto lain |
| FR-08 | Pilih kamera bila perangkat punya lebih dari satu | P1 | Pilihan tersimpan selama sesi |
| FR-09 | Hias: pilih frame, efek foto, stiker (geser, putar, ubah ukuran, hapus) | P0 | Minimal 6 frame, 6 efek, 12 stiker. Semua kontrol bisa dipakai dengan keyboard (lihat DESIGN-SYSTEM §11) |
| FR-10 | Hias: teks pendek (maks. 24 karakter) dan tanggal | P1 | Teks memakai fon dari design system |
| FR-11 | Ekspor strip PNG 600 x 1800 px (2 x 6 inci, 300 dpi) | P0 | Berkas di bawah 2 MB, tanpa metadata lokasi, nama `snapme-YYYYMMDD-HHmm.png` |
| FR-12 | Cetak 4R: dua strip berdampingan pada 1200 x 1800 px dengan garis potong | P0 | Dialog cetak browser menampilkan satu halaman 4 x 6 inci tanpa margin tambahan |
| FR-13 | Pakai Foto Galeri: pilih foto dari perangkat sebagai pengganti kamera | P1 | Menerima JPEG, PNG, WebP, HEIC bila browser mendukung. Foto di-crop sesuai slot |
| FR-14 | Sesi bertahan saat halaman dimuat ulang | P1 | Foto dan pilihan hias pulih dari penyimpanan lokal. Ada tombol "Mulai dari awal" yang menghapusnya |
| FR-15 | Halaman Privasi | P0 | Menjelaskan apa yang diproses di perangkat, apa yang diunggah, masa simpan, dan cara menghapus |

### 7.2 Fitur interaktif: Gesture Snap

Pengguna mengangkat tanda dua jari ke kamera. Indikator terisi selama gesture ditahan, lalu hitung mundur 3 detik berjalan dan foto diambil. Tidak ada yang perlu menyentuh perangkat.

| ID | Kebutuhan | Prioritas | Kriteria terima |
|---|---|---|---|
| GS-01 | Deteksi gesture berjalan seluruhnya di perangkat | P0 | Selama langkah Ambil Foto tidak ada permintaan jaringan yang membawa gambar. Diuji otomatis |
| GS-02 | Dua jari (kategori `Victory`) ditahan memicu hitung mundur | P0 | Nilai awal: skor 0,6 atau lebih selama 0,8 detik berturut-turut. Melepas gesture sebelum itu mengosongkan indikator |
| GS-03 | Umpan balik saat menahan | P0 | Indikator terisi di atas pratinjau, disertai teks "Terdeteksi. Tahan..." |
| GS-04 | Jeda 1,5 detik setelah foto sebelum gesture dibaca lagi | P0 | Satu pose tidak menghasilkan dua foto |
| GS-05 | Tombol kamera dan Spasi selalu tersedia | P0 | Semua alur selesai tanpa gesture |
| GS-06 | Sakelar Gesture Snap, pilihan diingat di perangkat | P0 | Mati berarti model tidak dijalankan |
| GS-07 | Model dimuat setelah izin kamera, tidak menghalangi pemotretan | P0 | Selama memuat ada status "Menyiapkan gesture...". Bila gagal dimuat, sakelar disembunyikan dan muncul satu pemberitahuan |
| GS-08 | Telapak terbuka (`Open_Palm`) ditahan: ulang foto terakhir | P1 | Sama: indikator, ambang, jeda |
| GS-09 | Jempol (`Thumb_Up`) ditahan setelah semua foto ada: lanjut ke Hias | P1 | Hanya aktif saat semua slot terisi |
| GS-10 | Mengenali gesture dari siapa pun di dalam bingkai | P1 | Deteksi sampai 2 tangan |

Ambang pada GS-02 dan GS-04 adalah nilai awal yang disetel lewat uji pakai di M3. Target kinerja: deteksi minimal 10 kali per detik pada HP Android kelas menengah tanpa membuat pratinjau tersendat.

### 7.3 Pembeda 1: Strip Estafet

Pembuat strip mengisi sebagian slot, lalu mengirim link. Teman membuka link di perangkatnya, melihat foto yang sudah ada, dan mengisi slot sisanya kapan saja sebelum link kedaluwarsa.

| ID | Kebutuhan | Prioritas | Kriteria terima |
|---|---|---|---|
| SE-01 | Tombol "Estafet ke Teman" muncul setelah minimal setengah slot terisi | P0 | Bawaan Strip 4: pembuat mengisi slot 1 dan 3, teman mengisi 2 dan 4 |
| SE-02 | Persetujuan unggah sebelum link dibuat | P0 | Dialog menyebut apa yang diunggah, siapa yang bisa melihat, dan kapan terhapus |
| SE-03 | Link `/r/{id}` bisa dibagikan lewat lembar bagikan sistem atau disalin | P0 | Memakai Web Share API bila ada, tombol salin bila tidak |
| SE-04 | Teman melihat foto yang sudah ada dan slot yang harus diisi | P0 | Slot milik pembuat terkunci |
| SE-05 | Overlay bayangan foto pembuat di pratinjau kamera teman untuk menyamakan pose | P0 | Opasitas 35%, bisa dimatikan |
| SE-06 | Hanya satu perangkat yang bisa mengambil giliran | P0 | Pengunjung berikutnya melihat "Estafet ini sudah diambil" |
| SE-07 | Setelah lengkap, kedua pihak mendapat halaman strip `/s/{id}` | P0 | Pembuat melihat status "Menunggu teman" lalu "Selesai" saat membuka link-nya lagi |
| SE-08 | Link estafet kedaluwarsa 48 jam, strip jadi kedaluwarsa 7 hari | P0 | Setelah kedaluwarsa, halaman menampilkan pesan dan berkas sudah terhapus |
| SE-09 | Pembuat bisa membatalkan dan menghapus | P0 | Berkas terhapus dalam satu permintaan |
| SE-10 | Teman yang menghias, pembuat bisa menghias ulang salinannya | P1 | Hiasan tidak menimpa versi pihak lain |

### 7.4 Pembeda 2: Strip Hidup + QR

Selama hitung mundur, kamera juga merekam rangkaian bingkai pendek. Strip bisa diputar sebagai animasi, dan strip cetak membawa QR yang membuka versi bergeraknya.

| ID | Kebutuhan | Prioritas | Kriteria terima |
|---|---|---|---|
| SH-01 | Rekam 10 bingkai selebar 480 px selama 1,5 detik terakhir hitung mundur, untuk tiap foto | P0 | Tidak menunda pengambilan foto utama |
| SH-02 | Sakelar Strip Hidup di halaman Hias dengan pratinjau berulang | P0 | Pratinjau menghormati `prefers-reduced-motion`: berhenti, dengan tombol Putar |
| SH-03 | Unduh versi bergerak sebagai video pendek (WebM atau MP4, mengikuti kemampuan browser) | P1 | Durasi sekitar 3 detik, di bawah 5 MB. Bila browser tidak mendukung perekaman, tombol disembunyikan |
| SH-04 | "QR di strip": membuat link `/s/{id}` dan menempatkan QR di kaki strip | P0 | Meminta persetujuan unggah. QR minimal 168 px pada ekspor (sekitar 14 mm saat dicetak 300 dpi) dan lolos uji pindai dari cetakan asli |
| SH-05 | Halaman `/s/{id}`: strip diam, versi hidup, tombol unduh, tanggal kedaluwarsa | P0 | Tidak diindeks mesin pencari. Video berputar tanpa suara |
| SH-06 | Pemilik bisa menghapus strip dari halaman itu | P0 | Butuh token hapus yang tersimpan di perangkat pembuat |

## 8. Kebutuhan non-fungsional

| Area | Kebutuhan |
|---|---|
| Kinerja | Welcome: LCP di bawah 2,5 detik pada jaringan 4G dan HP kelas menengah. Modul gesture dan kanvas dimuat hanya di langkah yang memakainya. Ekspor strip selesai di bawah 2 detik (target) |
| Aksesibilitas | WCAG 2.2 AA. Seluruh alur bisa diselesaikan dengan keyboard dan tanpa gesture. Detail di DESIGN-SYSTEM §11 |
| Privasi | Lokal dulu: tidak ada foto yang meninggalkan perangkat tanpa tindakan pengguna. Unggahan disimpan pribadi, link tidak bisa ditebak, terhapus otomatis. Tidak ada pelacak pihak ketiga |
| Keamanan | Semua akses data lewat server. Batas ukuran dan jenis berkas. Pembatasan laju pembuatan link. Detail di ARCHITECTURE §8 |
| Browser | Dua versi mayor terakhir Chrome, Edge, Firefox, dan Safari (desktop dan mobile). Kamera membutuhkan HTTPS |
| Responsif | 360 px sampai 1440 px ke atas. Tata letak mengikuti DESIGN-SYSTEM §5 |
| Hukum | Foto wajah adalah data pribadi. Persetujuan eksplisit sebelum unggah dan hak hapus mengikuti semangat UU No. 27 Tahun 2022 (PDP). Ini bukan nasihat hukum: periksa ulang bila snapme dipakai komersial |

## 9. Konten dan bahasa

- Bahasa antarmuka: Indonesia santai, kalimat pendek, kata kerja konkret. Tidak ada emoji di antarmuka.
- Satu label untuk satu maksud di seluruh produk: "Mulai Foto", "Lanjut Hias", "Selesai & Unduh", "Estafet ke Teman". Daftar lengkap di DESIGN-SYSTEM §12.
- Nama fitur ditulis tetap: Gesture Snap, Strip Estafet, Strip Hidup.
- snapme adalah merek sendiri. Gambar referensi hanya arah gaya: nama, logo, dan aset Fujifilm tidak dipakai.

## 10. Rilis bertahap

| Tahap | Isi | Milestone (`MILESTONES.md`) |
|---|---|---|
| Alpha | Alur dasar P0 tanpa backend | M0 sampai M2, M4, M5 |
| Beta 1 | Gesture Snap | M3 |
| Beta 2 | Link strip, QR, Strip Hidup | M6, M7 |
| Rilis 1.0 | Strip Estafet, audit aksesibilitas dan keamanan | M8, M9 |

## 11. Risiko

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Deteksi gesture lambat atau meleset di HP lama | Fitur utama terasa rusak | Tombol selalu ada (GS-05), ambang disetel dari uji pakai, deteksi diturunkan resolusinya |
| Pengguna menolak izin kamera | Alur berhenti | Layar penjelas sebelum dialog (FR-04) dan jalur Foto Galeri (FR-13) |
| Foto orang lain diunggah tanpa izin lewat estafet | Privasi | Persetujuan di kedua sisi, link pribadi, masa simpan pendek, tombol hapus |
| Biaya penyimpanan membengkak | Operasional | Batas ukuran berkas, kedaluwarsa otomatis, pembatasan laju |
| QR kecil gagal dipindai dari cetakan | Strip Hidup tidak sampai ke pengguna | Ukuran minimum di SH-04 dan uji cetak sebagai syarat rilis |
| Perbedaan perekaman video antar browser | Unduh versi hidup tidak konsisten | Deteksi kemampuan, sembunyikan tombol bila tidak didukung (SH-03) |

## 12. Asumsi yang perlu dikonfirmasi

Saya mengambil keputusan berikut agar dokumen bisa dipakai. Ubah bila tidak sesuai:

1. Antarmuka berbahasa Indonesia. Gambar referensi berbahasa Inggris.
2. snapme gratis, tanpa akun, tanpa pembayaran.
3. Masa simpan: strip 7 hari, link estafet 48 jam.
4. Estafet dibatasi 2 orang pada v1.
5. Hosting Cloudflare Workers dan D1, KV, R2 paket gratis (ARCHITECTURE §3).
6. Tema terang saja pada v1 (DESIGN-SYSTEM §0).

## Sumber pemindaian pembanding

- [LensBooth di AlternativeTo](https://alternativeto.net/software/lensbooth/about/)
- [LensBooth di Peerlist](https://peerlist.io/kishannaik/project/lensbooth--virtual-photo-booth)
- [Polaroid Booth: free online photo booth](https://polaroidbooth.com/blog-free-online-photo-booth.html)
- [Geek Vibes Nation: photo booths vs online photo booth tools (BeautyPlus)](https://geekvibesnation.com/photo-booths-vs-online-photo-booth-tools-which-one-should-you-choose/)
- [Dreamina: AI online photo booth](https://dreamina.capcut.com/ai-image/photo-booth-online)
- [M.Booth di Contra](https://contra.com/p/XRXUL3Z6-mbooth-turns-two-peoples-photos)
- [Simple Booth: Touchless Mode](https://docs.simplebooth.com/customization-guide/basic-setup/main-preset-settings/touchless-mode.md)
- [Auto Selfie Pro di App Store](https://apps.apple.com/us/app/id6754797418)
- [Peace Cam di App Store](https://apps.apple.com/fr/app/id1661419533)
