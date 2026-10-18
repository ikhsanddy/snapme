# snapme: Milestones

Ini rencana rilis snapme: sebelas milestone yang dikerjakan berurutan; setiap milestone mencantumkan pekerjaannya dan butir "Selesai bila"-nya. Nomor kebutuhan (FR, GS, SE, SH) merujuk ke `PRD.md` §7.

## Status

- [x] M0 Fondasi
- [x] M1 Welcome dan kerangka booth
- [x] M2 Kamera
- [x] M3 Gesture Snap
- [x] M4 Hias strip
- [x] M5 Hasil dan cetak
- [x] M6 Link strip dan QR
- [x] M7 Strip Hidup
- [x] M8 Strip Estafet
- [x] M9 Pengerasan
- [x] M10 Migrasi Cloudflare

## Berlaku untuk semua milestone

- Butir bertanda **(P1)** dikerjakan hanya setelah semua butir lain di milestone itu selesai. Yang tidak sempat dicatat di laporan dan dibawa ke M9.

---

## M0 Fondasi

**Tujuan.** Repo siap dikembangkan: kerangka terpasang, komponen dasar sudah bergaya snapme, dan ada galeri komponen untuk dibandingkan dengan halaman acuan.

**Baca.** ARCHITECTURE §2, §3, §4. DESIGN-SYSTEM §2 sampai §9, §13. Ketiga berkas di `docs/ui-reference/` sebagai contoh komponen dalam pemakaian.

**Pekerjaan**

- [x] `git init` bila belum ada, `.gitignore`, `.env.example` kosong.
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
- Semua skrip npm (`lint`, `typecheck`, `test`, `build`) berjalan dan lolos.

---

## M1 Welcome dan kerangka booth

**Tujuan.** Pengunjung melihat Welcome, memilih layout, dan masuk ke kerangka langkah booth.

**Kebutuhan.** FR-01, FR-02, FR-15.
**Baca.** `docs/ui-reference/welcome.html`. DESIGN-SYSTEM §5, §10.1, §12. ARCHITECTURE §5.

**Pekerjaan**

- [x] Welcome (`/`) sebagai komponen server, mengikuti anatomi DESIGN-SYSTEM §10.1.
- [x] Booth Shell dan stepper (`src/app/booth/layout.tsx`).
- [x] `lib/layouts.ts`: geometri Strip 4 dan Strip 3 (DESIGN-SYSTEM §5) dengan uji unit bahwa jumlah pikselnya pas.
- [x] `/booth/layout`: pilih layout, simpan ke state booth.
- [x] `stores/booth.ts` (kerangka state di ARCHITECTURE §5) dan pengalihan langkah tanpa prasyarat.
- [x] `/privasi`.

**Bukan bagian milestone ini.** Tombol "Pakai Foto Galeri" belum ditampilkan sampai FR-13 dikerjakan di M4.

**Selesai bila**

- Welcome cocok dengan `docs/ui-reference/welcome.html` saat dibandingkan berdampingan pada 360 x 640, 768, dan 1280 px, dan "Mulai Foto" terlihat tanpa menggulir.
- Bundel `/` tidak memuat `react-webcam`, `@mediapipe/tasks-vision`, `konva`.
- Uji Playwright: Welcome ke Pilih layout ke `/booth/capture`.

---

## M2 Kamera

**Tujuan.** Pengguna mengambil semua foto untuk layout terpilih dengan tombol atau keyboard.

**Kebutuhan.** FR-04, FR-05, FR-06, FR-07. FR-08 **(P1)**.
**Baca.** `docs/ui-reference/capture.html`. DESIGN-SYSTEM §10.2. ARCHITECTURE §5 (mesin keadaan), §6 (kamera).

**Pekerjaan**

- [x] Layar penjelas izin kamera dan penanganan izin ditolak.
- [x] `features/camera`: pratinjau dicerminkan, crop sesuai rasio slot.
- [x] `features/capture`: mesin keadaan sebagai fungsi murni dengan uji unit.
- [x] `CameraStage`, `CountdownOverlay`, `ShutterButton`, `ShotTray`.
- [x] Hitung mundur 3 detik, kilat tunggal, pengumuman `aria-live`.
- [x] Ulang foto terakhir dan ulang foto tertentu.
- [x] Spasi mengambil foto saat fokus di area kamera.
- [x] **(P1)** Pilih kamera.

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

**Pekerjaan**

- [x] Salin berkas wasm dan model MediaPipe ke `public/` (ARCHITECTURE §4). Tidak memuat dari CDN.
- [x] `gestureSource`: dimuat dinamis setelah izin kamera, laju dibatasi.
- [x] `holdDetector`: fungsi murni dengan uji unit (tahan cukup lama, lepas lebih awal, jeda setelah foto).
- [x] `GestureHUD` dengan empat keadaan dan sakelar Gesture Snap yang diingat.
- [x] Status "Menyiapkan gesture..." dan jalur gagal muat.
- [x] Uji Playwright: tidak ada permintaan jaringan yang membawa gambar selama `/booth/capture`.
- [x] **(P1)** Telapak untuk ulang, jempol untuk lanjut, dua tangan. Dua tangan lewat `numHands: 2` sejak P0; pengenalan telapak dan jempol dibuktikan uji unit `holdDetector`, karena kamera palsu tidak punya tangan.

**Selesai bila**

- Semua uji unit `holdDetector` dan uji privasi GS-01 lolos.
- Dengan sakelar mati, model tidak dimuat dan tidak berjalan.
- Hasil uji manual dicatat di `docs/DECISIONS.md`: perangkat, cahaya, berapa kali berhasil dari 10 percobaan, dan ambang akhir yang dipakai. (terpenuhi atas konfirmasi pengguna 16 Oktober 2026: deteksi di HP berhasil; jumlah dari 10 dan uji laptop tidak dirinci; ambang akhir tetap nilai awal, tabel di `docs/DECISIONS.md` M3)

**Butuh dari pengguna.** Uji manual di satu HP Android dan satu laptop; deteksi tidak bisa diverifikasi dengan kamera palsu.

---

## M4 Hias strip

**Tujuan.** Pengguna menghias strip dan mendapat PNG siap cetak.

**Kebutuhan.** FR-09, FR-11. FR-10, FR-13 **(P1)**.
**Baca.** `docs/ui-reference/customize.html`. DESIGN-SYSTEM §5 (geometri), §8, §10.3, §11. ARCHITECTURE §6 (editor).

**Pekerjaan**

- [x] `StripCanvas` dengan react-konva dari `lib/layouts.ts`.
- [x] Minimal 6 frame dan 6 efek (preset filter Konva).
- [x] Minimal 12 stiker di `public/stickers`. Boleh memakai gambar hasil generasi, wajib ditinjau pengguna sebelum masuk repo. (Dua belas SVG ditulis tangan di repo atas keputusan pengguna, bukan gambar hasil generasi.)
- [x] Stiker: tempel, geser, putar, ubah ukuran, hapus, dengan `Transformer` bawaan Konva.
- [x] Padanan daftar untuk keyboard dan pembaca layar (DESIGN-SYSTEM §11).
- [x] Tab pil Frame, Efek, Stiker. Lembar bawah di layar sempit. (Ditambah tab Teks untuk FR-10.)
- [x] Ekspor PNG.
- [x] **(P1)** Teks dan tanggal. **(P1)** Pakai Foto Galeri, lalu tampilkan tombolnya di Welcome.

**Selesai bila**

- Uji otomatis: PNG ekspor Strip 4 berukuran tepat 600 x 1800 px dan di bawah 2 MB.
- Satu stiker bisa ditempel, dipindah, diputar, dan dihapus hanya dengan keyboard.
- Konva tidak ikut termuat di `/` dan `/booth/capture`.
- Halaman cocok dengan `docs/ui-reference/customize.html` pada 360 dan 1280 px.

---

## M5 Hasil dan cetak

**Tujuan.** Pengguna mengunduh strip dan mencetaknya di kertas 4R.

**Kebutuhan.** FR-11 (unduh), FR-12. FR-03, FR-14 **(P1)**.
**Baca.** DESIGN-SYSTEM §5, §9. PRD §7.1.

**Pekerjaan**

- [x] `/booth/result`: pratinjau, "Selesai & Unduh", "Cetak 4R", "Mulai dari awal".
- [x] Nama berkas `snapme-YYYYMMDD-HHmm.png`.
- [x] Lembar 4R 1200 x 1800 px: dua strip berdampingan dengan garis potong, dan gaya cetak satu halaman 4 x 6 inci.
- [x] **(P1)** Layout Grid 2 x 2. **(P1)** Sesi bertahan saat dimuat ulang (IndexedDB).

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

**Butuh dari pengguna sebelum mulai.** Proyek Supabase (URL dan kunci service role di `.env.local`), dan keputusan cara pembatasan laju (ARCHITECTURE §8).

**Pekerjaan**

- [x] Skema `strips` dan bucket pribadi sebagai berkas migrasi di repo. RLS menolak `anon`. (`supabase/migrations/20261012000000_strips_bucket.sql`; penerapan ke proyek menunggu proyek pengguna)
- [x] Rute `POST /api/strips`, `POST /api/strips/[id]/complete`, `DELETE /api/strips/[id]`, `GET /api/cron/purge`. (diuji unit dengan klien Supabase palsu)
- [x] Validasi `zod`, batas jenis dan ukuran berkas, token hapus yang di-hash.
- [x] Dialog persetujuan unggah, unggah langsung ke Storage dengan URL bertanda tangan. (jalur 503 sudah diuji e2e; unggahan sungguhan menunggu proyek)
- [x] `QRPlate` di kaki strip (168 px pada ekspor), render ulang strip setelah link dibuat. (kotak QR dan glif penanda sudah terbukti di browser; render ulang ber-QR menunggu unggahan sungguhan)
- [x] Halaman `/s/[id]`: strip, unduh, tanggal kedaluwarsa, hapus. `noindex`. Jawaban 410 bila kedaluwarsa. (halaman menjawab 404 untuk strip yang tidak ada, terbukti lewat `curl`; status 410 harfiah dijawab rute API, penyimpangan tercatat di `DECISIONS.md`)
- [x] Header keamanan (ARCHITECTURE §8). (diverifikasi lewat `curl -i` pada `/` dan `/s/abc`; CSP penuh menyusul di M9)

**Selesai bila**

- Uji end-to-end: buat link, buka `/s/{id}` di konteks lain, hapus, lalu halaman menjawab tidak ditemukan. (hijau: `SUPABASE_E2E=1 npx playwright test share.spec.ts` → 3 lolos, 1 dilewati; alur sungguhan sampai unggah ke Storage, konteks kedua, dan hapus)
- Uji unit kedaluwarsa: strip lewat 7 hari menjawab 410 walau pembersih belum berjalan. (hijau: `tests/api-strips.test.ts`)
- Kunci service role tidak muncul di bundel klien. (hijau: build dengan `.env.local` sungguhan, 50 berkas `.next/static` dipindai, nol memuat kuncinya; `tests/client-bundle-secrecy.test.ts`)
- Tinjauan keamanan atas `src/app/api` dan `lib/supabase` sudah dilakukan, dan temuannya ditangani atau dicatat. (delapan temuan: satu blocker dan empat major sudah diperbaiki, sisanya diperbaiki atau dicatat; tabelnya di `docs/DECISIONS.md` bagian M6)

**Batas aman.** Migrasi sudah dijalankan ke proyek Supabase `snapme` (ref `owdjkpzywzljnvuyfiui`) atas persetujuan pengguna 9 Oktober 2026, lewat `supabase link` + `supabase db push`. Perubahan skema berikutnya mengikuti aturan yang sama dan selalu dengan persetujuan pengguna.

---

## M7 Strip Hidup

**Tujuan.** Tiap pose punya klip pendek, strip bisa diputar, dan QR membuka versi bergeraknya.

**Kebutuhan.** SH-01, SH-02. SH-03 **(P1)**.
**Baca.** PRD §7.4. ARCHITECTURE §6 (Strip Hidup), §9.

**Pekerjaan**

- [x] Perekam bingkai di mesin keadaan pemotretan: 10 bingkai 480 px pada 1,5 detik terakhir hitung mundur. (`src/features/capture/clipRecorder.ts` + `useClipRecorder.ts`; sampling 1500 sampai 2850 ms, jadi momen jepret di 3000 ms tidak tersentuh)
- [x] `LiveStripPlayer` dan sakelar Strip Hidup di Hias. (diwujudkan sebagai prop `live` di `StripStage` + `useClipTicker`, dengan lencana "Klip"; alasannya di `DECISIONS.md` M7)
- [x] Unggah versi hidup bersama strip, tampilkan di `/s/[id]`. (migrasi bucket 5 MB + jenis video diterapkan ke proyek atas persetujuan pengguna 9 Oktober 2026; bukti ber-jaringan di `DECISIONS.md` M7)
- [x] Hormati `prefers-reduced-motion`: berhenti dengan tombol Putar. (di Hias dan di pemutar `/s/[id]`)
- [x] Lepas `ImageBitmap` saat booth dimulai ulang. (`setShot`, `setLayout`, dan `reset` memanggil `close()`; dijaga `tests/booth-live.test.ts`)
- [x] **(P1)** Unduh video lewat `MediaRecorder`, tombol tersembunyi bila tidak didukung. (2 putaran x 10 bingkai = sekitar 3 detik, di bawah 5 MB; dijaga `e2e/live.spec.ts`)

**Selesai bila**

- Perekaman bingkai tidak mengubah waktu pengambilan foto utama (uji unit pada mesin keadaan). (hijau: `tests/clip-recorder.test.ts` menjalankan tabel peristiwa yang sama dengan dan tanpa pengamat perekam)
- `/s/{id}` menampilkan versi hidup untuk strip yang punya klip, dan versi diam untuk yang tidak. (hijau: `SUPABASE_E2E=1 npx playwright test share.spec.ts live.spec.ts` → 8 lolos, 1 dilewati; konteks kedua melihat `<video>` bertanda tangan `/storage/`, sedangkan strip tanpa klip nol `video`)
- Uji manual di Chrome, Firefox, dan Safari dicatat di `docs/DECISIONS.md`. (tabel disiapkan dengan status menunggu pengguna; perangkat di luar Chromium headless belum tersedia)

**Batas aman.** Migrasi `20261013000000_live_video.sql` (batas bucket 5 MB + `video/webm`, `video/mp4`) sudah diterapkan ke proyek Supabase `snapme` atas persetujuan pengguna 9 Oktober 2026. Perubahan skema berikutnya mengikuti aturan yang sama dan selalu dengan persetujuan pengguna.

**Catatan uji.** `e2e/gesture.spec.ts` "pilihan sakelar diingat setelah halaman dimuat ulang" diperbaiki: navigasinya masih menganggap state booth belum tersimpan lintas muat ulang (komentar lamanya menyebut "FR-14 menyusul"), sedangkan M5 sudah mempersistensinya, jadi ujinya berlomba dengan tunda simpan 400 ms. Sekarang ujinya menunggu simpanan selesai lalu memastikan halaman tetap di langkah yang sama.

---

## M8 Strip Estafet

**Tujuan.** Dua orang di perangkat dan waktu berbeda mengisi satu strip.

**Kebutuhan.** SE-01 sampai SE-09. SE-10 **(P1)**.
**Baca.** PRD §7.3. ARCHITECTURE §6 (estafet), §7, §8.

**Pekerjaan**

- [x] Skema `relays` sebagai migrasi. Rute `POST /api/relays`, `claim`, `complete`, `strip`, `DELETE`. (`supabase/migrations/20261014000000_relays.sql`; rute diuji unit dengan klien Supabase palsu: `tests/api-relays.test.ts` 22 lolos. Migrasi sudah diterapkan ke proyek `snapme` atas persetujuan pengguna di M8)
- [x] `RelayInviteCard`, dialog persetujuan, bagikan lewat Web Share API atau salin. (`src/components/booth/RelayInviteCard.tsx` + `src/features/relay/shareLink.ts`; jalur salin diuji e2e, jalur Web Share lewat guard `canShare`)
- [x] Halaman `/r/[id]`: foto yang sudah ada, slot terkunci, ambil giliran. (`src/app/r/[id]/page.tsx` + `RelayJoinView`; foto pembuat lewat URL bertanda tangan 1 jam)
- [x] Overlay bayangan 35% di pratinjau kamera teman, dengan sakelar. (prop `overlay` di `CameraStage`, sakelar "Bayangan pose teman" dengan chip Nyala/Mati; dijaga `e2e/relay.spec.ts`)
- [x] Giliran hanya bisa diambil sekali (dijamin di basis data, bukan hanya di klien). (`UPDATE ... WHERE status = 'waiting'`; nol baris berubah → 409. Uji unit + uji klaim bersamaan e2e)
- [x] Status pembuat: "Menunggu teman", "Selesai". Batalkan dan hapus. (`RelayJoinView` dan `RelayCompleteView` + `RelayCancel.tsx`, SE-09 bisa kapan pun, termasuk setelah selesai)
- [x] Kedaluwarsa 48 jam, ikut dibersihkan oleh pembersih M6. (`RELAY_TTL_HOURS = 48`, kelompok `relays` di `GET /api/cron/purge`; uji unit pembersih)

**Selesai bila**

- Uji Playwright dua konteks browser: pembuat mengisi slot 1 dan 3, teman mengisi 2 dan 4, keduanya sampai di `/s/{id}` yang sama. (hijau: `SUPABASE_E2E=1 npx playwright test relay.spec.ts` → 4 lolos; teman mendarat di `/s/{id}` dan gambar stripnya dimuat dari Storage bertanda tangan, pembuat melihat tautan ke path yang sama)
- Uji: konteks ketiga yang membuka link melihat "Estafet ini sudah diambil". Dua permintaan `claim` bersamaan hanya satu yang berhasil. (hijau di berkas yang sama: konteks ketiga melihat pesannya tanpa tombol, dan dua `POST claim` paralel menghasilkan tepat 200 + 409 terhadap Postgres sungguhan)
- Tinjauan keamanan atas rute estafet sudah dilakukan. (selesai: satu temuan major — gate token di `/r/[id]` status selesai hanya presentasional — sudah diperbaiki dengan rute ber-token `POST /api/relays/[id]/strip`; empat temuan minor dicatat di `docs/DECISIONS.md` M8, dua di antaranya ikut diperbaiki. Catatan: gate jenis isi `claim` dan validasi runtime baris `relays`)

**Batas aman.** Migrasi `20261014000000_relays.sql` (tabel `relays`, dua indeks, `image/jpeg` di daftar jenis bucket) sudah diterapkan ke proyek Supabase `snapme` (ref `owdjkpzywzljnvuyfiui`) lewat `npx supabase db push` atas persetujuan pengguna di M8; `supabase migration list` mengonfirmasi barisnya ada di remote. Perubahan skema berikutnya mengikuti aturan yang sama dan selalu dengan persetujuan pengguna.

**Sisa untuk M9.** Constraint bentuk `slots` dan daftar layout tertutup di tabel `relays`, kolom `strip_id` + UPDATE bersyarat untuk menutup balapan pemulihan `complete`, dan uji manual gesture/estafet di perangkat sungguhan (Chromium headless tidak punya tangan). **Dua butir pertama selesai di M9** lewat `20261015000000_relays_hardening.sql` dan gerbang pemenang tunggal di rute `complete`; uji manual gesture tetap menunggu pengguna.

---

## M9 Pengerasan

**Tujuan.** snapme layak dirilis: bisa diakses, cepat, aman, dan terukur.

**Baca.** PRD §4, §8, §11. DESIGN-SYSTEM §11, §14. ARCHITECTURE §9, §10, §12.

**Pekerjaan**

- [x] Butir **(P1)** yang tertunda dari milestone sebelumnya. (SE-10, GestureHUD boleh-tanpa-gesture, `Open_Palm`, `Thumb_Up`, pemilih kamera, teks dan tanggal, FR-14, dan FR-13 sudah dikerjakan di M3 sampai M8. Sisa P1 M8 di tabel `relays` — constraint bentuk `slots`, daftar layout tertutup, kolom `strip_id` — dikerjakan di M9 lewat migrasi `20261015000000_relays_hardening.sql` dan gerbang pemenang tunggal di `POST /api/relays/[id]/complete`)
- [x] Audit `@axe-core/playwright` di semua halaman dan uji keyboard manual untuk seluruh alur. (axe: 9 halaman × 2 viewport nol pelanggaran, ditambah dua audit ber-link `SUPABASE_E2E=1`; keyboard: `e2e/keyboard-flow.spec.ts` menuntaskan seluruh alur tanpa satu pun `page.mouse`. Uji pembaca layar manual masuk tabel pengguna)
- [x] Ukur LCP Welcome dan ukuran bundel tiap rute, bandingkan dengan PRD §8. (Lighthouse preset seluler di server produksi: median LCP 3,17 detik terhadap batas 2,5 detik, selisih dan rencananya dicatat; ekspor strip median 922 ms terhadap target 2 detik; tabel transfer per rute diukur dari peramban karena Next.js 16 menghapus metrik `First Load JS`)
- [x] Uji lintas browser: Chrome, Edge, Firefox, Safari, Chrome Android, Safari iOS. (Mesin Gecko dan WebKit hijau otomatis lewat proyek `firefox` dan `webkit`; Edge tidak terpasang dan `npx playwright install msedge` gagal karena hak akses, jadi proyek `msedge` dilepas dan Edge sungguhan masuk tabel manual pengguna; Chrome diliput proyek `chromium`; Chrome Android dan Safari iOS butuh perangkat sungguhan)
- [x] Analitik tanpa cookie untuk ukuran di PRD §4. Pilihan alat diusulkan dulu ke pengguna. (Pengguna memilih endpoint peristiwa first-party; migrasi `20261016000000_events.sql` diterapkan, daftar peristiwa tertutup, kueri lima rasio PRD §4 didokumentasikan, dan peristiwa kunjungan sungguhan terbukti masuk basis data)
- [x] Tinjau ulang semua butir ARCHITECTURE §12 dan perbarui dokumen yang nilainya berubah. (§12 ditulis ulang; §3, §7, dan §8 diperbarui; PRD dan DESIGN-SYSTEM tidak berubah)

**Butuh dari pengguna.** Cetak satu strip dengan QR di kertas 4R dan pindai dari cetakannya. Deploy ke Vercel. (QR selesai 16 Oktober 2026; deploy digantikan M10 ke Cloudflare, jadi tidak ada tugas Vercel yang tersisa di sini.)

**Selesai bila**

- Tidak ada pelanggaran axe tingkat serius atau kritis. (terpenuhi: audit otomatis nol pelanggaran di sembilan halaman pada 360 dan 1280 px, plus halaman strip dan estafet ber-link di bawah gerbang `SUPABASE_E2E=1`)
- Target PRD §8 tercapai, atau selisihnya dicatat beserta rencana. (terpenuhi: ekspor strip dan FCP di dalam target; LCP Welcome **tercapai di produksi**, median 2,416 detik terhadap batas 2,5 detik dari lima jalankan 16 Oktober 2026. Angka M9 3,17 detik dan M10 3,745 detik diukur di server lokal, bukan CDN. Langkah 1 rencana dikerjakan: JS sebelum `load` di pratinjau turun 165,9 menjadi 153,9 KB dan chunk sonner tidak lagi ikut pra-`load`; langkah 2 dan 3 tidak lagi diperlukan untuk target. Tabel dan buktinya di `docs/DECISIONS.md` M9 "Langkah 1 rencana")
- QR pada cetakan asli terbaca oleh kamera HP. (terpenuhi: dikonfirmasi pengguna 16 Oktober 2026, QR cetakan terbaca kamera HP)
- Daftar periksa DESIGN-SYSTEM §14 lolos untuk semua halaman. (terpenuhi: tabel per butir di `docs/DECISIONS.md` M9, termasuk hasil zoom 200% dan temuan keyboard pada pil pilihan hiasan)

---

## M10 Migrasi Cloudflare

**Tujuan.** Backend snapme berjalan penuh di Cloudflare: D1 untuk basis data, KV untuk anggaran laju peristiwa, R2 untuk berkas, Worker (OpenNext) menggantikan Vercel, tanpa sisa kode Supabase.

**Baca.** ARCHITECTURE §3, §4, §6, §7, §8, §10, §12. `docs/DECISIONS.md` M9 dan M10.

**Pekerjaan**

- [x] Infrastruktur: `wrangler.jsonc` (binding DB/ASSETS/RATE_LIMIT_KV/BUCKET, Cron Trigger harian, env `e2e` dengan R2 remote), `worker.ts` (custom worker OpenNext + `scheduled` pembersih), `open-next.config.ts`, `migrations/0001_init.sql`, `r2-cors.json`, `.dev.vars.example`.
- [x] Modul pustaka baru: `src/lib/cloudflare.ts` (seam `getBindings`, null → 503), `src/lib/db/{rows,strips,relays,events}.ts` (prepared statement D1, tiga gerbang atomik `meta.changes`), `src/lib/r2/{storage,presign}.ts` (`bucket.head`, aws4fetch presigned PUT/GET), `src/lib/rateLimit.ts` (kuota strips/relays tetap di D1, anggaran events di KV jendela tetap), `src/lib/purge.ts`.
- [x] Cutover 10 rute `src/app/api/**`: kontrak unggah berubah dari `{ path, token }` ke `{ path, url }` (presigned PUT); verifikasi berkas lewat `bucket.head`.
- [x] Halaman RSC `/s/[id]` dan `/r/[id]`: URL presigned GET, unduhan lewat `response-content-disposition` yang ikut ditandatangani.
- [x] Klien `features/share/api.ts` dan `features/relay/api.ts`: PUT langsung ke URL presigned, `@supabase/storage-js` dilepas.
- [x] `next.config.ts`: origin CSP dari `R2_ACCOUNT_ID`; `package.json`: skrip `preview`, `preview:e2e`, `deploy`, `cf-typegen`, `test:e2e:cf`.
- [x] Tambalan kecil `scripts/patch-opennext.mjs` (dijalankan `postinstall` dan tiap skrip build Cloudflare) untuk celah upstream `@opennextjs/cloudflare` 1.20.10: manifest `preview-props.json` milik Next 16.4 belum masuk daftar manifest yang disisipkan ke bundel Worker (tanpa ini semua rute menjawab 500 dengan `Unexpected loadManifest(...)`). Alasan dan syarat penghapusannya di `docs/DECISIONS.md` M10.
- [x] Uji: `tests/db/harness.ts` (binding D1/R2/KV sungguhan lewat `wrangler getPlatformProxy`), `tests/db/{strips,relays,events}.test.ts` menggantikan uji klien Supabase palsu, `tests/client-bundle-secrecy.test.ts` diperbarui, gerbang e2e `CLOUDFLARE_E2E`, `playwright.cf.config.ts`.
- [x] Dokumen: ARCHITECTURE, PRD §12, `docs/DECISIONS.md` M10.
- [x] Penghapusan: `vercel.json`, `supabase/`, `src/lib/supabase/`, dependensi `@supabase/*`.
- [x] Pembongkaran proyek Supabase dan kaitan Vercel di dasbor. (dikonfirmasi pengguna 10 Oktober 2026: semua kotak sudah dicentang; `.env.local` kini hanya memuat `R2_ACCOUNT_ID` karena kata sandi Supabase-nya sudah tidak berguna)

**Butuh dari pengguna.** Login Cloudflare (`npx wrangler login`), token API R2 Object Read & Write untuk bucket `snapme`, dan pembongkaran proyek Supabase/Vercel setelah semuanya hijau. (Ketiganya selesai: login dan pembuatan sumber daya dijalankan di milestone ini, token R2 diisi pengguna ke `.dev.vars`, dan pembongkaran Supabase/Vercel dikonfirmasi pengguna 10 Oktober 2026.)

**Selesai bila**

- `npm run lint`, `npm run typecheck`, `npm test`, dan `npm run build` hijau. (terpenuhi: lint dan typecheck hijau; `npm test` 23 berkas dan 179 uji hijau, termasuk 63 uji basis data baru di `tests/db/`; `npm run build` hijau dan `opennextjs-cloudflare build` menghasilkan `.open-next/worker.js`. Catatan: `cacheComponents`/PPR beserta `htmlLimitedBots` dilepas selama milestone ini karena runtime Worker menolak mesin Cache Components di bawah permintaan bersamaan, rincian dan buktinya di `docs/DECISIONS.md` M10)
- Uji D1 berlari di atas SQLite sungguhan: kasus dari uji lama dipertahankan, termasuk dua klaim serentak → 200/409 dan rollback batas laju. (terpenuhi: `tests/db/strips.test.ts` 23 kasus, `tests/db/relays.test.ts` 30 kasus, `tests/db/events.test.ts` 10 kasus, semua di atas D1/R2/KV miniflare lewat `wrangler getPlatformProxy`; dua klaim serentak menghasilkan tepat satu 200 dan satu 409, dan rollback baris ke-11 batas laju diuji)
- Putaran pratinjau menembus R2 sungguhan: buat strip → PUT presigned → complete → buka `/s/{id}` → hapus; relay 201 + klaim serentak; `POST /api/events` sampai 429; purge 401/200. (terpenuhi: 31 pemeriksaan lulus di `wrangler dev --env e2e` dengan bucket R2 sungguhan, termasuk tautan unduh ber-`response-content-disposition` yang isinya bita identik, penghapusan objek, penuntasan estafet dua langkah, 25 batch peristiwa lalu 429, purge 401/200, dan Cron Trigger lokal; tabelnya di `docs/DECISIONS.md` M10)
- `npx playwright test` dan `npm run test:e2e:cf` hijau. (terpenuhi: suite utama terhadap dev server **66 lolos, 8 dilewati, 0 gagal**; suite ber-binding terhadap pratinjau Cloudflare **30 lolos, 3 dilewati, 0 gagal**. Tiga yang dilewati adalah jalur "server tanpa binding" yang memang tidak berlaku saat binding ada. Tiga temuan yang diperbaiki di sepanjang jalur ini dicatat di `docs/DECISIONS.md` M10: PPR/Cache Components dilepas, helper uji dipersempit ke `/api/**`, dan `fetchSlotShots` memakai `cache: "no-store"`)
- `npm run deploy` berhasil dan URL produksi menjawab; `npx wrangler d1 execute snapme-db --remote --command "select count(*) from strips"` menunjukkan baris uji; cron harian terlihat di dasbor. (terpenuhi: Worker `snapme` ter-deploy di `https://snapme.ikhsandyy-dev.workers.dev` (Version ID `26c7f70b-1280-4066-aaca-826f9e8f7c0c`), triggernya terdaftar saat deploy dengan `schedule: 0 3 * * *`; baris D1 remote `strips` 3, `relays` 1, `events` 1; 14 dari 15 pemeriksaan produksi lulus dan satu-satunya kegagalan adalah kesalahan skrip verifikasi, lalu bukti bit-identik diambil ulang dan lulus. Tabelnya di `docs/DECISIONS.md` M10. Cron harian di dasbor dikonfirmasi pengguna 16 Oktober 2026, dan deploy ulang pada tanggal yang sama menghasilkan Version ID `2dc38bdb-25ce-4016-a0ad-34423c94cbf9` dengan `GET /` 200)
- Median `npm run perf:lcp` terhadap pratinjau dicatat di `docs/DECISIONS.md` M10. (terpenuhi: median LCP 3,745 detik dari lima jalankan terhadap `wrangler dev`, pembanding M9 3,17 detik di `next start`; FCP 1,11 detik, TBT 44 ms, CLS 0, skor 0,87)
