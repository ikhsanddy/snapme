# snapme: Milestones

Sepuluh milestone, dikerjakan berurutan, satu milestone per sesi omp. Nomor kebutuhan (FR, GS, SE, SH) merujuk ke `PRD.md` §7.

## Cara memakai

Dari root repo, buka `omp`, lalu:

```text
/plan Kerjakan milestone M0 dari @MILESTONES.md. Susun rencananya dulu: berkas yang dibuat, perintah yang dijalankan, hasil /skill:find-skills untuk kata kunci milestone ini, dan cara membuktikan tiap butir "Selesai bila". Jangan menulis kode sebelum rencana disetujui.
```

Ganti `M0` dengan milestone yang dikerjakan. PRD, DESIGN-SYSTEM, dan ARCHITECTURE sudah dimuat lewat `AGENTS.md`, jadi tidak perlu disebut lagi. Alur lengkap satu sesi ada di ARCHITECTURE §11.4.

Untuk milestone yang membangun halaman, sebut juga berkas acuannya dengan `@` di akhir prompt supaya langsung terbaca:

| Milestone | Tambahkan ke prompt |
|---|---|
| M0 | `@docs/ui-reference/welcome.html @docs/ui-reference/capture.html @docs/ui-reference/customize.html` |
| M1 | `@docs/ui-reference/welcome.html` |
| M2, M3 | `@docs/ui-reference/capture.html` |
| M4, M7 | `@docs/ui-reference/customize.html` |
| M8 | `@docs/ui-reference/capture.html` |

## Status

- [x] M0 Fondasi
- [ ] M1 Welcome dan kerangka booth
- [ ] M2 Kamera
- [ ] M3 Gesture Snap
- [ ] M4 Hias strip
- [ ] M5 Hasil dan cetak
- [ ] M6 Link strip dan QR
- [ ] M7 Strip Hidup
- [ ] M8 Strip Estafet
- [ ] M9 Pengerasan

Agent mencentang kotak setelah semua butir "Selesai bila" dan syarat "Selesai berarti" di `AGENTS.md` terpenuhi.

## Berlaku untuk semua milestone

- Awali dengan `/skill:find-skills` memakai kata kunci milestone, lalu usulkan hasilnya.
- Pekerjaan UI diawali `/skill:design-taste-frontend` dan mengikuti DESIGN-SYSTEM.
- Butir bertanda **(P1)** dikerjakan hanya setelah semua butir lain di milestone itu selesai. Yang tidak sempat dicatat di laporan dan dibawa ke M9.
- Sebelum commit: `/review` atas perubahan yang belum di-commit.

---

## M0 Fondasi

**Tujuan.** Repo siap dikembangkan: kerangka terpasang, komponen dasar sudah bergaya snapme, dan ada galeri komponen untuk dibandingkan dengan halaman acuan.

**Baca.** ARCHITECTURE §2, §3, §4, §11.3. DESIGN-SYSTEM §2 sampai §9, §13. Ketiga berkas di `docs/ui-reference/` sebagai contoh komponen dalam pemakaian.
**Kata kunci find-skills.** `nextjs`, `shadcn`, `tailwind`.

**Pekerjaan**

- [x] `git init` bila belum ada, `.gitignore`, `.env.example` kosong.
- [x] Pasang find-skills dan taste-skill (ARCHITECTURE §11.3). Pastikan keduanya muncul di `/extensions`.
- [x] Scaffold Next.js dan pasang dependensi (ARCHITECTURE §3).
- [x] `shadcn init`, tambahkan komponen di DESIGN-SYSTEM §9.
- [x] Evaluasi registry neobrutalism (ARCHITECTURE §3), catat keputusan di `docs/DECISIONS.md`.
- [x] Token di `src/app/globals.css` (DESIGN-SYSTEM §13), fon lewat `next/font`.
- [x] Ganti ikon `lucide-react` di komponen shadcn dengan `@phosphor-icons/react`, lalu lepas `lucide-react`.
- [x] Sesuaikan varian komponen dengan DESIGN-SYSTEM §9.
- [x] Skrip npm: `dev`, `lint`, `typecheck`, `test`, `build`. Konfigurasi Vitest dan Playwright dengan satu uji contoh.
- [x] Halaman `/dev/ui` yang menampilkan setiap komponen dalam semua keadaan.
- [x] Pastikan `docs/ui-reference/` berisi tiga berkas HTML acuan dan gambar referensi, dan ketiganya terbuka di browser.

**Bukan bagian milestone ini.** Halaman produk, kamera, backend.

**Selesai bila**

- `/dev/ui` menampilkan semua komponen umum DESIGN-SYSTEM §9 dalam keadaan bawaan, hover, fokus, aktif, nonaktif, dan memuat.
- Tombol, chip, tab pil, sakelar, dan kartu di `/dev/ui` tampak sama dengan yang ada di berkas acuan saat dibandingkan berdampingan.
- Pencarian nilai warna heksadesimal di `src/` hanya menemukan `globals.css`.
- `lucide-react` tidak ada di `package.json`.
- Semua perintah di `AGENTS.md` berjalan dan lolos.

**Agent.** `scout` untuk mendaftar komponen yang masih memakai ikon atau gaya bawaan. `sonic` untuk penggantian ikon.

---

## M1 Welcome dan kerangka booth

**Tujuan.** Pengunjung melihat Welcome, memilih layout, dan masuk ke kerangka langkah booth.

**Kebutuhan.** FR-01, FR-02, FR-15.
**Baca.** `docs/ui-reference/welcome.html`. DESIGN-SYSTEM §5, §10.1, §12. ARCHITECTURE §5.
**Kata kunci find-skills.** `web design guidelines`, `react best practices`, `accessibility`.

**Pekerjaan**

- [ ] Welcome (`/`) sebagai komponen server, mengikuti anatomi DESIGN-SYSTEM §10.1.
- [ ] Booth Shell dan stepper (`src/app/booth/layout.tsx`).
- [ ] `lib/layouts.ts`: geometri Strip 4 dan Strip 3 (DESIGN-SYSTEM §5) dengan uji unit bahwa jumlah pikselnya pas.
- [ ] `/booth/layout`: pilih layout, simpan ke state sesi.
- [ ] `stores/booth.ts` (kerangka state di ARCHITECTURE §5) dan pengalihan langkah tanpa prasyarat.
- [ ] `/privasi`.

**Bukan bagian milestone ini.** Tombol "Pakai Foto Galeri" belum ditampilkan sampai FR-13 dikerjakan di M4.

**Selesai bila**

- Welcome cocok dengan `docs/ui-reference/welcome.html` saat dibandingkan berdampingan pada 360 x 640, 768, dan 1280 px, dan "Mulai Foto" terlihat tanpa menggulir.
- Bundel `/` tidak memuat `react-webcam`, `@mediapipe/tasks-vision`, `konva`.
- Pre-Flight Check taste-skill dijalankan untuk Welcome, dengan pengecualian DESIGN-SYSTEM §0.
- Uji Playwright: Welcome ke Pilih layout ke `/booth/capture`.

---

## M2 Kamera

**Tujuan.** Pengguna mengambil semua foto untuk layout terpilih dengan tombol atau keyboard.

**Kebutuhan.** FR-04, FR-05, FR-06, FR-07. FR-08 **(P1)**.
**Baca.** `docs/ui-reference/capture.html`. DESIGN-SYSTEM §10.2. ARCHITECTURE §5 (mesin keadaan), §6 (kamera).
**Kata kunci find-skills.** `playwright`, `webcam`, `react testing`.

**Pekerjaan**

- [ ] Layar penjelas izin kamera dan penanganan izin ditolak.
- [ ] `features/camera`: pratinjau dicerminkan, crop sesuai rasio slot.
- [ ] `features/capture`: mesin keadaan sebagai fungsi murni dengan uji unit.
- [ ] `CameraStage`, `CountdownOverlay`, `ShutterButton`, `ShotTray`.
- [ ] Hitung mundur 3 detik, kilat tunggal, pengumuman `aria-live`.
- [ ] Ulang foto terakhir dan ulang foto tertentu.
- [ ] Spasi mengambil foto saat fokus di area kamera.
- [ ] **(P1)** Pilih kamera.

**Selesai bila**

- Uji Playwright dengan kamera palsu: empat foto terambil, satu diulang, lanjut ke Hias.
- Uji Playwright izin ditolak: pesan dan jalan keluar tampil.
- Foto tersimpan sama dengan pratinjau (tercermin) dan berasio slot.
- Kilat tidak muncul saat `prefers-reduced-motion`.
- Halaman cocok dengan `docs/ui-reference/capture.html` pada 360 dan 1280 px (kecuali HUD gesture, yang masuk di M3).

---

## M3 Gesture Snap

**Tujuan.** Foto bisa dipicu dengan tanda dua jari tanpa menyentuh perangkat.

**Kebutuhan.** GS-01 sampai GS-07. GS-08, GS-09, GS-10 **(P1)**.
**Baca.** PRD §7.2. ARCHITECTURE §6 (gesture), §9. `docs/ui-reference/capture.html` untuk empat keadaan HUD dan indikator tahan.
**Kata kunci find-skills.** `mediapipe`, `web performance`.

**Pekerjaan**

- [ ] Salin berkas wasm dan model ke `public/` (ARCHITECTURE §4). Tidak memuat dari CDN.
- [ ] `gestureSource`: dimuat dinamis setelah izin kamera, laju dibatasi.
- [ ] `holdDetector`: fungsi murni dengan uji unit (tahan cukup lama, lepas lebih awal, jeda setelah foto).
- [ ] `GestureHUD` dengan empat keadaan dan sakelar Gesture Snap yang diingat.
- [ ] Status "Menyiapkan gesture..." dan jalur gagal muat.
- [ ] Uji Playwright: tidak ada permintaan jaringan yang membawa gambar selama `/booth/capture`.
- [ ] **(P1)** Telapak untuk ulang, jempol untuk lanjut, dua tangan.

**Selesai bila**

- Semua uji unit `holdDetector` dan uji privasi GS-01 lolos.
- Dengan sakelar mati, model tidak dimuat dan tidak berjalan.
- Hasil uji manual dicatat di `docs/DECISIONS.md`: perangkat, cahaya, berapa kali berhasil dari 10 percobaan, dan ambang akhir yang dipakai.

**Butuh dari pengguna.** Uji manual di satu HP Android dan satu laptop. Agent tidak bisa memverifikasi deteksi dengan kamera palsu.

---

## M4 Hias strip

**Tujuan.** Pengguna menghias strip dan mendapat PNG siap cetak.

**Kebutuhan.** FR-09, FR-11. FR-10, FR-13 **(P1)**.
**Baca.** `docs/ui-reference/customize.html`. DESIGN-SYSTEM §5 (geometri), §8, §10.3, §11. ARCHITECTURE §6 (editor).
**Kata kunci find-skills.** `canvas`, `konva`, `image generation`.

**Pekerjaan**

- [ ] `StripCanvas` dengan react-konva dari `lib/layouts.ts`.
- [ ] Minimal 6 frame dan 6 efek (preset filter Konva).
- [ ] Minimal 12 stiker di `public/stickers`. Boleh dibuat dengan role `image`, wajib ditinjau pengguna sebelum masuk repo.
- [ ] Stiker: tempel, geser, putar, ubah ukuran, hapus, dengan `Transformer` bawaan Konva.
- [ ] Padanan daftar untuk keyboard dan pembaca layar (DESIGN-SYSTEM §11).
- [ ] Tab pil Frame, Efek, Stiker. Lembar bawah di layar sempit.
- [ ] Ekspor PNG.
- [ ] **(P1)** Teks dan tanggal. **(P1)** Pakai Foto Galeri, lalu tampilkan tombolnya di Welcome.

**Selesai bila**

- Uji otomatis: PNG ekspor Strip 4 berukuran tepat 600 x 1800 px dan di bawah 2 MB.
- Satu stiker bisa ditempel, dipindah, diputar, dan dihapus hanya dengan keyboard.
- Konva tidak ikut termuat di `/` dan `/booth/capture`.
- Halaman cocok dengan `docs/ui-reference/customize.html` pada 360 dan 1280 px.

**Agent.** Dua pekerja `task` boleh berjalan paralel bila berkasnya terpisah: satu untuk `features/editor`, satu untuk aset dan data frame serta stiker.

---

## M5 Hasil dan cetak

**Tujuan.** Pengguna mengunduh strip dan mencetaknya di kertas 4R.

**Kebutuhan.** FR-11 (unduh), FR-12. FR-03, FR-14 **(P1)**.
**Baca.** DESIGN-SYSTEM §5, §9. PRD §7.1.
**Kata kunci find-skills.** `print css`, `indexeddb`.

**Pekerjaan**

- [ ] `/booth/result`: pratinjau, "Selesai & Unduh", "Cetak 4R", "Mulai dari awal".
- [ ] Nama berkas `snapme-YYYYMMDD-HHmm.png`.
- [ ] Lembar 4R 1200 x 1800 px: dua strip berdampingan dengan garis potong, dan gaya cetak satu halaman 4 x 6 inci.
- [ ] **(P1)** Layout Grid 2 x 2. **(P1)** Sesi bertahan saat dimuat ulang (IndexedDB).

**Selesai bila**

- Uji Playwright: alur penuh dari Welcome sampai berkas terunduh.
- Pratinjau cetak Chromium menampilkan tepat satu halaman.
- Alur dasar selesai tanpa satu pun permintaan ke server selain aset statis.

Setelah M5, snapme sudah bisa dipakai sebagai photobooth lokal (tahap Alpha di PRD §10).

---

## M6 Link strip dan QR

**Tujuan.** Pengguna bisa membuat link pribadi untuk stripnya dan menaruh QR di strip.

**Kebutuhan.** SH-04, SH-05, SH-06.
**Baca.** ARCHITECTURE §7, §8. PRD §7.4, §8.
**Kata kunci find-skills.** `supabase`, `security`, `nextjs route handlers`.

**Butuh dari pengguna sebelum mulai.** Proyek Supabase (URL dan kunci service role di `.env.local`), dan keputusan cara pembatasan laju (ARCHITECTURE §8).

**Pekerjaan**

- [ ] Skema `strips` dan bucket pribadi sebagai berkas migrasi di repo. RLS menolak `anon`.
- [ ] Rute `POST /api/strips`, `POST /api/strips/[id]/complete`, `DELETE /api/strips/[id]`, `GET /api/cron/purge`.
- [ ] Validasi `zod`, batas jenis dan ukuran berkas, token hapus yang di-hash.
- [ ] Dialog persetujuan unggah, unggah langsung ke Storage dengan URL bertanda tangan.
- [ ] `QRPlate` di kaki strip (168 px pada ekspor), render ulang strip setelah link dibuat.
- [ ] Halaman `/s/[id]`: strip, unduh, tanggal kedaluwarsa, hapus. `noindex`. Jawaban 410 bila kedaluwarsa.
- [ ] Header keamanan (ARCHITECTURE §8).

**Selesai bila**

- Uji end-to-end: buat link, buka `/s/{id}` di konteks lain, hapus, lalu halaman menjawab tidak ditemukan.
- Uji unit kedaluwarsa: strip lewat 7 hari menjawab 410 walau pembersih belum berjalan.
- Kunci service role tidak muncul di bundel klien.
- `security-reviewer` sudah meninjau `src/app/api` dan `lib/supabase`, dan temuannya ditangani atau dicatat.

**Batas aman.** Migrasi dijalankan ke proyek Supabase oleh pengguna, atau oleh agent hanya setelah disetujui.

---

## M7 Strip Hidup

**Tujuan.** Tiap pose punya klip pendek, strip bisa diputar, dan QR membuka versi bergeraknya.

**Kebutuhan.** SH-01, SH-02. SH-03 **(P1)**.
**Baca.** PRD §7.4. ARCHITECTURE §6 (Strip Hidup), §9.
**Kata kunci find-skills.** `mediarecorder`, `video`, `web performance`.

**Pekerjaan**

- [ ] Perekam bingkai di mesin keadaan pemotretan: 10 bingkai 480 px pada 1,5 detik terakhir hitung mundur.
- [ ] `LiveStripPlayer` dan sakelar Strip Hidup di Hias.
- [ ] Unggah versi hidup bersama strip, tampilkan di `/s/[id]`.
- [ ] Hormati `prefers-reduced-motion`: berhenti dengan tombol Putar.
- [ ] Lepas `ImageBitmap` saat sesi diulang.
- [ ] **(P1)** Unduh video lewat `MediaRecorder`, tombol tersembunyi bila tidak didukung.

**Selesai bila**

- Perekaman bingkai tidak mengubah waktu pengambilan foto utama (uji unit pada mesin keadaan).
- `/s/{id}` menampilkan versi hidup untuk strip yang punya klip, dan versi diam untuk yang tidak.
- Uji manual di Chrome, Firefox, dan Safari dicatat di `docs/DECISIONS.md`.

---

## M8 Strip Estafet

**Tujuan.** Dua orang di perangkat dan waktu berbeda mengisi satu strip.

**Kebutuhan.** SE-01 sampai SE-09. SE-10 **(P1)**.
**Baca.** PRD §7.3. ARCHITECTURE §6 (estafet), §7, §8.
**Kata kunci find-skills.** `supabase`, `security`, `playwright`.

**Pekerjaan**

- [ ] Skema `relays` sebagai migrasi. Rute `POST /api/relays`, `claim`, `complete`, `DELETE`.
- [ ] `RelayInviteCard`, dialog persetujuan, bagikan lewat Web Share API atau salin.
- [ ] Halaman `/r/[id]`: foto yang sudah ada, slot terkunci, ambil giliran.
- [ ] Overlay bayangan 35% di pratinjau kamera teman, dengan sakelar.
- [ ] Giliran hanya bisa diambil sekali (dijamin di basis data, bukan hanya di klien).
- [ ] Status pembuat: "Menunggu teman", "Selesai". Batalkan dan hapus.
- [ ] Kedaluwarsa 48 jam, ikut dibersihkan oleh pembersih M6.

**Selesai bila**

- Uji Playwright dua konteks browser: pembuat mengisi slot 1 dan 3, teman mengisi 2 dan 4, keduanya sampai di `/s/{id}` yang sama.
- Uji: konteks ketiga yang membuka link melihat "Estafet ini sudah diambil". Dua permintaan `claim` bersamaan hanya satu yang berhasil.
- `security-reviewer` sudah meninjau rute estafet.

---

## M9 Pengerasan

**Tujuan.** snapme layak dirilis: bisa diakses, cepat, aman, dan terukur.

**Baca.** PRD §4, §8, §11. DESIGN-SYSTEM §11, §14. ARCHITECTURE §9, §10, §13.
**Kata kunci find-skills.** `accessibility audit`, `web vitals`, `security review`.

**Pekerjaan**

- [ ] Butir **(P1)** yang tertunda dari milestone sebelumnya.
- [ ] Audit `@axe-core/playwright` di semua halaman dan uji keyboard manual untuk seluruh alur.
- [ ] Ukur LCP Welcome dan ukuran bundel tiap rute, bandingkan dengan PRD §8.
- [ ] Uji lintas browser: Chrome, Edge, Firefox, Safari, Chrome Android, Safari iOS.
- [ ] Analitik tanpa cookie untuk ukuran di PRD §4. Pilihan alat diusulkan dulu ke pengguna.
- [ ] Tinjau ulang semua butir ARCHITECTURE §13 dan perbarui dokumen yang nilainya berubah.

**Butuh dari pengguna.** Cetak satu strip dengan QR di kertas 4R dan pindai dari cetakannya. Deploy ke Vercel.

**Selesai bila**

- Tidak ada pelanggaran axe tingkat serius atau kritis.
- Target PRD §8 tercapai, atau selisihnya dicatat beserta rencana.
- QR pada cetakan asli terbaca oleh kamera HP.
- Daftar periksa DESIGN-SYSTEM §14 lolos untuk semua halaman.
