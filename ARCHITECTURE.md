# snapme: Architecture

Versi 0.1, 8 Oktober 2026. Dibaca bersama `PRD.md` (apa yang dibangun) dan `DESIGN-SYSTEM.md` (tampilannya). Dokumen ini menjawab: dengan apa, disusun bagaimana, dan dikerjakan dengan alur apa.

## 1. Prinsip

1. **Pakai yang sudah jadi dulu.** Kerangka, komponen, dan pustaka yang terawat dipasang lebih dulu, lalu disesuaikan dengan design system. Menulis sendiri adalah pilihan terakhir (§2).
2. **Lokal dulu.** Kamera, deteksi gesture, penyuntingan, dan ekspor berjalan di browser. Server hanya dipakai saat pengguna membuat link.
3. **Token saja.** Warna, radius, bayangan, dan fon hanya didefinisikan di `globals.css`. Komponen memakai nama token.
4. **Modul berat dimuat belakangan.** Welcome tidak memuat kode kamera, gesture, atau kanvas.
5. **Logika murni dipisah dari perangkat.** Ambang gesture, geometri strip, dan aturan kedaluwarsa adalah fungsi murni yang bisa diuji tanpa kamera.

## 2. Aturan "pakai yang sudah jadi dulu"

Aturan ini mengikat manusia maupun alat otomatis.

### Tangga keputusan

Untuk setiap kebutuhan, turun satu anak tangga hanya bila anak tangga di atasnya tidak memenuhi:

1. **Fitur platform**: API browser atau fitur Next.js (contoh: Web Share API, `MediaRecorder`, `next/font`).
2. **Komponen atau pustaka di tabel §3.**
3. **Komponen dari registry shadcn lain atau pustaka npm terawat**: cari dulu di registry shadcn dan npm, pakai yang terawat dan terus dirawat.
4. **Tulis sendiri**, hanya untuk komponen khas produk di DESIGN-SYSTEM §9 atau bila tiga langkah di atas gagal. Catat alasannya di `docs/DECISIONS.md`.

### Cara menyesuaikan komponen jadi

1. Pasang lewat CLI (`npx shadcn@latest add ...`) sehingga kodenya masuk ke `src/components/ui`.
2. Ubah tampilannya **hanya** lewat token (`globals.css`) dan varian (`class-variance-authority`) agar cocok dengan DESIGN-SYSTEM §9. Perilaku dan aksesibilitas bawaan (Radix) tidak diubah.
3. Tampilkan hasilnya di halaman `/dev/ui` dan bandingkan berdampingan dengan berkas acuan di `docs/ui-reference/` (DESIGN-SYSTEM §10).

### Yang tidak boleh ditulis sendiri

Dialog, lembar bawah, tab, sakelar, slider, tooltip, toast, carousel, pengelolaan fokus, pembuat QR, pustaka transformasi kanvas (geser, putar, ubah ukuran), model deteksi tangan, klien penyimpanan, pembuat ID, validasi skema, ikon.

### Syarat pustaka baru

Lisensi permisif (MIT, Apache-2.0, BSD), ada rilis atau commit dalam 12 bulan terakhir, mendukung versi React dan Tailwind yang terpasang, dan tidak mengirim data ke pihak ketiga. Periksa sebelum memasang, catat di `docs/DECISIONS.md`.

## 3. Stack

Versi tidak dipaku di dokumen ini. Pasang versi stabil terbaru saat M0, lalu biarkan lockfile yang mengunci.

| Lapisan | Pilihan | Dipakai untuk | Catatan |
|---|---|---|---|
| Kerangka | Next.js (App Router) + React + TypeScript | Halaman, rute server, metadata halaman strip | |
| Gaya | Tailwind CSS v4 | Token dan utilitas | Token di DESIGN-SYSTEM §13 |
| Komponen dasar | shadcn/ui (Radix) | Semua komponen umum di DESIGN-SYSTEM §9 | Kode disalin ke repo, jadi bebas disesuaikan |
| Titik awal gaya | Registry neobrutalism berbasis shadcn | Varian bergaris tebal dan berbayang keras | Lihat "Evaluasi registry" di bawah |
| Ikon | `@phosphor-icons/react` | Semua ikon | Mengganti `lucide-react` bawaan shadcn |
| Gerak | `motion` (`motion/react`) | Transisi di DESIGN-SYSTEM §7 | |
| State | `zustand` | State sesi booth | |
| Kamera | `react-webcam` | Pembungkus `getUserMedia` | |
| Gesture | `@mediapipe/tasks-vision` (Gesture Recognizer) | Gesture Snap | Kategori bawaannya memuat `Victory`, `Open_Palm`, `Thumb_Up`. Berkas wasm dan model di-host sendiri |
| Kanvas | `konva` + `react-konva` | Penyusunan strip, stiker, efek, ekspor PNG | Efek foto memakai filter bawaan Konva agar seragam antar browser |
| QR | `qrcode` | QR di kaki strip | |
| Video | `canvas.captureStream()` + `MediaRecorder` | Unduhan Strip Hidup | API browser, tanpa pustaka |
| Validasi | `zod` | Isi permintaan API | |
| ID | `nanoid` | ID link dan token | |
| Data | Cloudflare D1 (SQLite) | Strip, estafet, dan peristiwa analitik | Hanya diakses lewat binding Worker (`DB`); RLS Postgres tidak lagi relevan |
| Penyimpanan berkas | Cloudflare R2 | Strip PNG, klip Strip Hidup, slot estafet | Unggahan dan bacaan lewat URL presigned dari server (`aws4fetch`); rute memverifikasi hasil unggahan |
| Anggaran laju | Cloudflare KV | Kuota peristiwa analitik 200 per jam per sidang | Kuota strip dan estafet tetap dihitung persis di D1 |
| Analitik | Endpoint peristiwa first-party (`POST /api/events`, dikirim `navigator.sendBeacon`) | Ukuran PRD §4 | Tanpa cookie, tanpa pustaka pihak ketiga, daftar peristiwa tertutup di `src/lib/analyticsEvents.ts` |
| Hosting | Cloudflare Workers + OpenNext (`@opennextjs/cloudflare`) | Aplikasi, rute API, dan pembersih | `npm run deploy`; Cron Trigger harian memanggil `scheduled` di `worker.ts` |
| CLI | `wrangler` | Membuat sumber daya, migrasi D1, rahasia, pratinjau lokal | `npm run preview` menjalankan pratinjau produksi-fidelitas di port 8787 |
| Uji | Vitest, Playwright | Unit dan end-to-end | Playwright punya kamera palsu di Chromium; proyek `firefox` dan `webkit` memuat `crossbrowser.spec.ts` |
| Ukur kinerja | Lighthouse (devDependency) | LCP Welcome di server produksi | `npm run perf:lcp`; preset bawaan seluler |

### Evaluasi registry neobrutalism (dikerjakan di M0)

Yang sudah saya periksa pada 8 Oktober 2026:

- **RetroUI** (`retroui.dev`, repo `neobrutalism/neobrutalism`): berbasis shadcn, lisensi MIT, komponen dipasang lewat registry. Tanggal commit terakhir belum saya lihat.
- **Neobrutalism components** (`neobrutalism.dev`, repo `ekmas/neobrutalism-components`): README-nya menyatakan tidak lagi dirawat. Jangan dijadikan sumber utama.
- **BoldKit** (`boldkit.dev`): berbasis shadcn, sudut bawaannya nol, berlawanan dengan radius di design system.

Langkah M0: periksa tanggal commit terakhir RetroUI dan kecocokannya dengan versi React dan Tailwind yang terpasang. Bila lolos syarat §2, ambil varian `button`, `card`, dan `badge` dari sana sebagai titik awal. Bila tidak, pakai shadcn/ui polos: gaya snapme (garis 2 px, bayangan keras, pil) cukup diterapkan lewat token dan varian. Keputusan dicatat di `docs/DECISIONS.md`.

### Perintah awal (panduan untuk M0, sudah dijalankan)

```powershell
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
npx shadcn@latest init
npx shadcn@latest add button badge card dialog drawer tabs toggle-group switch slider sonner tooltip skeleton carousel
npm i zustand zod nanoid motion @phosphor-icons/react react-webcam konva react-konva @mediapipe/tasks-vision qrcode
npm i -D vitest @testing-library/react @playwright/test @axe-core/playwright @types/qrcode
```

M10 menambahkan lapisan Cloudflare-nya (dijalankan di M10):

```powershell
npm i @opennextjs/cloudflare aws4fetch
npm i -D wrangler
```

Bila `create-next-app` menolak folder yang sudah berisi dokumen, buat di folder sementara lalu pindahkan isinya ke root.

## 4. Struktur folder

```
snapme/
├─ PRD.md  DESIGN-SYSTEM.md  ARCHITECTURE.md
├─ MILESTONES.md                 rencana rilis: pekerjaan dan syarat selesai tiap tahap
├─ wrangler.jsonc                binding Worker, Cron Trigger, env `e2e`
├─ worker.ts                     Worker kustom OpenNext: fetch + scheduled pembersih
├─ open-next.config.ts           konfigurasi adapter Cloudflare
├─ migrations/                   migrasi D1 (dialek SQLite)
├─ r2-cors.json                  CORS bucket untuk PUT presigned dari browser
├─ docs/
│  ├─ DECISIONS.md               catatan keputusan dan pustaka yang ditambah
│  └─ ui-reference/              acuan pasti UI: welcome.html, capture.html, customize.html
├─ public/
│  ├─ mediapipe/wasm/            disalin dari paket saat pemasangan, tidak di git
│  ├─ models/gesture_recognizer.task
│  ├─ stickers/
├─ src/
│  ├─ app/
│  │  ├─ page.tsx                Welcome (komponen server, statis)
│  │  ├─ booth/layout.tsx        Booth Shell + stepper
│  │  ├─ booth/{layout,capture,customize,result}/page.tsx
│  │  ├─ s/[id]/page.tsx         halaman strip (noindex)
│  │  ├─ r/[id]/page.tsx         halaman gabung estafet
│  │  ├─ privasi/page.tsx
│  │  ├─ dev/ui/page.tsx         galeri komponen, hanya saat pengembangan
│  │  └─ api/...                 rute server (§7)
│  ├─ components/ui/             komponen shadcn yang sudah disesuaikan
│  ├─ components/booth/          komponen khas produk (DESIGN-SYSTEM §9)
│  ├─ features/
│  │  ├─ camera/                 useCamera, izin, pemilihan perangkat
│  │  ├─ gesture/                gestureSource (MediaPipe), holdDetector (murni)
│  │  ├─ capture/                mesin keadaan, hitung mundur, perekam bingkai
│  │  ├─ editor/                 StripCanvas, efek, stiker, ekspor
│  │  ├─ live/                   LiveStripPlayer, perekam video
│  │  ├─ relay/                  klien estafet
│  │  └─ share/                  unggah, QR, hapus
│  ├─ lib/
│  │  ├─ layouts.ts              geometri ekspor (DESIGN-SYSTEM §5)
│  │  ├─ cloudflare.ts           seam binding (getBindings, null → 503)
│  │  ├─ db/                     prepared statement D1 per tabel
│  │  ├─ r2/                     presign aws4fetch + verifikasi berkas bucket
│  │  ├─ purge.ts                badan pembersih harian
│  │  └─ expiry.ts  tokens.ts
│  └─ stores/booth.ts            state sesi (zustand)
└─ tests/  e2e/
```

## 5. Rute dan keadaan sesi

| Rute | Jenis | Isi |
|---|---|---|
| `/` | Server, statis | Welcome |
| `/booth/layout` | Klien | Pilih layout |
| `/booth/capture` | Klien | Kamera, Gesture Snap, baki foto |
| `/booth/customize` | Klien | Kanvas hias, Strip Hidup, QR |
| `/booth/result` | Klien | Unduh, cetak, bagikan |
| `/s/[id]` | Server | Halaman strip: diam, hidup, unduh, hapus |
| `/r/[id]` | Server lalu klien | Gabung estafet, lalu masuk ke `/booth/capture` dengan slot terkunci |
| `/privasi` | Server, statis | Kebijakan privasi |

Masuk ke langkah booth tanpa prasyarat (misalnya `/booth/customize` tanpa foto) dialihkan ke langkah yang belum selesai.

### Mesin keadaan pemotretan

```
idle ─► meminta-izin ─► siap ─► menahan ─► hitung-mundur ─► memotret ─► jeda ─► siap
                │         ▲        │ (gesture lepas)                              │
                ▼         └────────┘                                              ▼
             ditolak                                             semua slot terisi ─► lengkap
```

- `siap ─► hitung-mundur` juga dipicu tombol kamera atau Spasi, tanpa lewat `menahan`.
- Selama `hitung-mundur`, perekam bingkai mengumpulkan 10 bingkai pada 1,5 detik terakhir (Strip Hidup).
- Mesin keadaan ini fungsi murni (`reduce(state, event)`), diuji tanpa kamera.

### State sesi (`stores/booth.ts`)

`layoutId`, `shots[]` (tiap entri: gambar diam + bingkai klip + pemilik slot), `settings` (gesture nyala, kamera terpilih), `editor` (frame, efek, stiker[], teks[]), `live`, `share` (id, token hapus, kedaluwarsa), `relay` (id, peran, slot terkunci). Foto disimpan di memori. Penyimpanan lintas muat ulang (FR-14) memakai IndexedDB.

## 6. Modul inti

**Kamera.** `react-webcam` dengan `facingMode: "user"`, pratinjau dicerminkan lewat CSS, foto diambil dari bingkai video ke kanvas lalu dicerminkan agar sama dengan pratinjau. Resolusi diminta 1280 x 720 atau lebih, lalu di-crop ke rasio slot.

**Gesture.** Dua bagian terpisah:

- `gestureSource`: memuat `GestureRecognizer` dalam mode video dari berkas di `public/`, membaca bingkai yang diperkecil dengan laju dibatasi (sekitar 10 sampai 15 kali per detik), dan memancarkan `{kategori, skor, waktu}`. Dimuat dengan `import()` dinamis setelah izin kamera diberikan.
- `holdDetector`: fungsi murni yang mengubah aliran itu menjadi peristiwa `tahan-mulai`, `tahan-progres`, `tahan-selesai`, `tahan-batal` memakai ambang dari PRD §7.2. Ambang ada di satu berkas konstanta.

**Editor.** `react-konva` menyusun strip dari geometri di `lib/layouts.ts`. Efek foto adalah preset filter Konva. Stiker memakai `Transformer` bawaan. Ekspor memanggil `stage.toDataURL` dengan `pixelRatio` yang menghasilkan ukuran di DESIGN-SYSTEM §5. Padanan daftar untuk keyboard dan pembaca layar membaca state yang sama.

**Strip Hidup.** Bingkai klip disimpan sebagai `ImageBitmap`. `LiveStripPlayer` menggambar ulang kanvas strip dengan bingkai berjalan. Unduhan merekam kanvas itu lewat `captureStream` dan `MediaRecorder`, dengan jenis berkas dipilih lewat `MediaRecorder.isTypeSupported`.

**Bagikan dan QR.** Setelah persetujuan: minta ID dan URL unggah presigned dari server (`presignPut` di `lib/r2/presign.ts`, aws4fetch menandatangani PUT beserta Content-Type-nya), unggah langsung dari browser ke bucket R2, konfirmasi lewat rute complete (yang memeriksa hasilnya dengan `bucket.head`), lalu render ulang strip dengan QR ke `/s/{id}`. Halaman `/s` membaca berkasnya lewat `presignGet` berumur pendek.

**Estafet.** Sama seperti bagikan, tetapi yang diunggah adalah foto per slot ke `relays/{id}/slot-{n}.jpg`. Teman mengambil giliran dengan menukar ID estafet menjadi token tamu; klaimnya dijaga UPDATE bersyarat `status = 'waiting'` di D1.

## 7. Data dan API

### Tabel (D1, dialek SQLite)

Skemanya ada di `migrations/0001_init.sql` (M10 memindahkan lima migrasi Postgres yang lama). Dialek SQLite tidak punya tipe `uuid`/`timestamptz`/`jsonb`, jadi ID tetap teks dan timestamp menjadi TEXT ISO-8601 UTC yang selalu diisi aplikasi (`new Date().toISOString()`), sehingga perbandingan leksikografisnya sama dengan perbandingan kronologis. Tidak ada RLS: D1 hanya bisa diakses lewat binding Worker, jadi tidak ada jalur anon yang perlu ditolak.

| Tabel | Kolom |
|---|---|
| `strips` | `id` (teks, nanoid), `layout`, `still_path`, `live_path` (boleh kosong), `status` (`draft`, `complete`, `deleted`), `delete_token_hash`, `relay_id` (boleh kosong), `rate_key`, `created_at`, `expires_at` |
| `relays` | `id`, `layout`, `slots` (teks JSON: indeks, pemilik `host` atau `guest`, path), `host_token_hash`, `guest_token_hash` (boleh kosong), `status` (`waiting`, `claimed`, `complete`, `cancelled`), `strip_id` (boleh kosong; gerbang pemenang tunggal jalur pemulihan `complete`), `rate_key`, `created_at`, `expires_at` |
| `events` | `id` (INTEGER PRIMARY KEY AUTOINCREMENT), `name` (daftar tertutup), `rate_key`, `created_at`. Retensi 90 hari |

Catatan M9 yang tetap berlaku di D1: `layout` dibatasi daftar tertutup dan `slots` dipastikan array lewat check `json_valid(slots) AND json_type(slots) = 'array'`, sedangkan bentuk tiap elemen slot diperiksa saat dibaca (`relaySlotsOf`, yang juga mem-parse teks JSON-nya). Indeks unik parsial `relays_strip_id_key` menjaga satu estafet hanya menunjuk satu strip; satu estafet bisa menyisakan lebih dari satu baris `strips` kalau baris lamanya adalah batu nisan penghapusan, dan yang dijaga gerbangnya adalah satu strip aktif per estafet.

### Storage

Satu bucket R2 pribadi `snapme` (tanpa akses publik; akses hanya lewat URL presigned). Path: `strips/{id}/still.png`, `strips/{id}/live.webm|mp4`, `relays/{id}/slot-{n}.jpg`. URL unggah (PUT, Content-Type ikut ditandatangani) dan URL baca dibuat server lewat `presignPut`/`presignGet` (`src/lib/r2/presign.ts`); CORS bucket-nya diatur di `r2-cors.json`, jadi browser boleh PUT langsung ke R2 dari origin aplikasi.

### Rute server

| Rute | Fungsi |
|---|---|
| `POST /api/strips` | Buat strip `draft`, kembalikan `id`, token hapus, dan URL unggah presigned (`upload.url`) |
| `POST /api/strips/[id]/complete` | Verifikasi berkas ada (`bucket.head`), tandai `complete`, pasang `expires_at` 7 hari |
| `DELETE /api/strips/[id]` | Hapus berkas dan tandai baris `deleted`. Butuh token hapus |
| `POST /api/relays` | Buat estafet, kembalikan `id`, token pembuat, URL unggah presigned slot pembuat |
| `POST /api/relays/[id]/claim` | Ambil giliran: kembalikan token tamu dan slot. Hanya berhasil sekali (UPDATE bersyarat) |
| `POST /api/relays/[id]/complete` | Tandai lengkap, buat strip, kembalikan URL unggah PNG. Dijaga gerbang pemenang tunggal `strip_id` |
| `POST /api/relays/[id]/strip` | Serahkan tautan strip dan URL baca foto slot hanya ke pemegang token estafet (M8, temuan tinjauan keamanan) |
| `DELETE /api/relays/[id]` | Batalkan dan hapus. Butuh token pembuat |
| `POST /api/events` | Catat 1 sampai 20 peristiwa analitik (nama dari daftar tertutup). Anggaran 200 peristiwa per jam per sidang, dihitung di KV |
| `GET /api/cron/purge` | Picu manual pembersih (`Authorization: Bearer CRON_SECRET`). Pemicu hariannya Cron Trigger Workers lewat `scheduled` di `worker.ts`, yang menjalankan badan yang sama (`src/lib/purge.ts`) |

Unggahan tidak melewati rute server: klien mengunggah langsung ke R2 lewat URL presigned, dan rute complete yang memeriksa hasilnya. Kedaluwarsa juga diperiksa saat baca: halaman dan API menjawab 410 walau cron belum berjalan.

## 8. Privasi dan keamanan

- **Akses data**: D1 dan R2 hanya bisa dijangkau lewat binding Worker (`DB`, `BUCKET`), tidak ada endpoint publik dan tidak ada kunci yang dipegang klien. Seam-nya satu: `getBindings()` di `src/lib/cloudflare.ts`, yang mengembalikan null (rute menjawab 503) bila satu binding pun kosong.
- **Token**: token hapus, pembuat, dan tamu dibuat acak, disimpan di perangkat pengguna, dan hanya hash-nya yang disimpan di basis data.
- **Link**: ID nanoid 12 karakter atau lebih. Halaman `/s` dan `/r` diberi `noindex` dan `Referrer-Policy: no-referrer`.
- **Batas**: jenis berkas PNG, JPEG, WebM, MP4. Ukuran diam 2 MB, klip 5 MB, slot estafet 1 MB. Divalidasi dengan `zod`; jenisnya dipaksa dua kali, yaitu Content-Type yang ikut ditandatangani di URL unggah (R2 menolak PUT dengan jenis lain) dan `bucket.head` di rute complete/claim.
- **Pembatasan laju**: kuota strip dan estafet dihitung persis dari baris D1 dengan pola hitung-setelah-sisip; anggaran peristiwa analitik dihitung di KV dengan jendela tetap per jam (200 peristiwa per sidang). Pilihan dan alasannya di `docs/DECISIONS.md` M6 dan M10.
- **Persetujuan**: dialog sebelum setiap unggahan pertama (PRD SE-02, SH-04).
- **Tanpa pihak ketiga**: fon di-host sendiri, wasm dan model MediaPipe di-host sendiri, tanpa pelacak. Hitungan peristiwa PRD §4 lewat rute sendiri (`POST /api/events`), tanpa cookie dan tanpa kolom identitas.
- **Header**: `Permissions-Policy: camera=(self)`, `X-Content-Type-Options: nosniff`, dan CSP penuh untuk semua rute sejak M9 (`next.config.ts`, disusun dari env: host S3 R2 hanya ditambahkan bila `R2_ACCOUNT_ID` ada, dan nilai yang sama ada di `vars` wrangler supaya CSP produksi identik dengan saat build). `script-src` memuat `'unsafe-inline'` (skrip bootstrap App Router tanpa nonce; nonce memaksa render dinamis) dan `wasm-unsafe-eval` (MediaPipe); `'unsafe-eval'` hanya di pengembangan. Rincian tiap direktif dan temuan verifikasinya di `docs/DECISIONS.md` M9. M10 melepas `cacheComponents`/PPR beserta `htmlLimitedBots: /.*/ ` karena runtime Worker menolak mesin Cache Components di bawah permintaan bersamaan; `/s/[id]` dan `/r/[id]` dirender dinamis (`await connection()`) dan tetap menjawab 404 sungguhan (alasannya di `docs/DECISIONS.md` M10)
- **Analitik**: `rate_key` pada tabel `events` memakai hash bergaram dengan scope `events` (terpisah dari sidang `strips`/`relays`), dan anggaran 200 peristiwa per jam per sidang dijaga di KV sebelum INSERT; selisih balapan paling banyak satu batch per permintaan serentak (telemetri, alasannya di `docs/DECISIONS.md` M10)
- **Metadata**: ekspor lewat kanvas tidak membawa EXIF.
- **Rahasia**: `CRON_SECRET`, `RATE_LIMIT_SALT`, `R2_ACCESS_KEY_ID`, dan `R2_SECRET_ACCESS_KEY` tidak pernah masuk repo: lokalnya `.dev.vars` (contoh di `.dev.vars.example`), produksinya `wrangler secret put`. `R2_ACCOUNT_ID` bukan rahasia (ada di `wrangler.jsonc` dan `.env.local`).

## 9. Kinerja

- `/` adalah komponen server statis. Kode booth dipisah per rute.
- MediaPipe dan Konva dimuat dengan `import()` dinamis di langkah yang memakainya.
- Deteksi gesture memakai bingkai yang diperkecil dan laju terbatas. Bila pratinjau tersendat, turunkan laju dulu, baru pertimbangkan Web Worker.
- Bingkai klip 480 px. Dilepas (`close()`) saat sesi diulang.
- Stiker dan frame dalam ukuran yang sudah dioptimalkan. Fon lewat `next/font`.

## 10. Pengujian

| Lapisan | Alat | Yang diuji |
|---|---|---|
| Unit | Vitest | `holdDetector`, mesin keadaan pemotretan, geometri `layouts.ts` (jumlah piksel pas 1800), aturan kedaluwarsa |
| Komponen | Vitest + Testing Library | Keadaan tombol, stepper, baki foto |
| Basis data dan rute | Vitest + `wrangler getPlatformProxy` (miniflare lokal) | Rute API di atas D1/R2/KV sungguhan: klaim estafet sekali, gerbang pemenang tunggal, rollback kuota, purge, anggaran events. Berkas di `tests/db/`, harness di `tests/db/harness.ts` |
| End-to-end | Playwright (Chromium dengan `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream`) | Alur dasar sampai unduh, izin ditolak, estafet dengan dua konteks browser, halaman kedaluwarsa |
| End-to-end ber-binding | Playwright (`playwright.cf.config.ts`, `npm run test:e2e:cf`) terhadap `npm run preview:e2e` | Alur ber-jaringan yang menyentuh D1/R2: bagikan, Strip Hidup, estafet, a11y halaman ber-link |
| Privasi | Playwright | Tidak ada permintaan jaringan yang membawa gambar selama `/booth/capture` (PRD GS-01) |
| Aksesibilitas | `@axe-core/playwright` + uji keyboard manual | Semua halaman |
| Manual | HP Android kelas menengah, iPhone, laptop | Gesture pada berbagai cahaya, cetak 4R dan pindai QR |

Perintah pemeriksaan sebelum sebuah milestone dianggap selesai: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npx playwright test` untuk alur yang disentuh, dan `npm run test:e2e:cf` untuk alur yang menyentuh D1/R2.

## 11. Milestone

Urutan kerja, pekerjaan, dan syarat selesai tiap milestone ada di `MILESTONES.md` (M0 Fondasi sampai M10 Migrasi Cloudflare). Berkas itu satu-satunya sumber untuk milestone dan memuat pula syarat selesai yang berlaku umum tiap tahap.

## 12. Yang belum diverifikasi

- Kinerja Gesture Recognizer di HP kelas menengah: ambang dan laju di PRD §7.2 masih nilai awal dan butuh uji pakai di perangkat sungguhan. Langkahnya ada di tabel manual pengguna `docs/DECISIONS.md` (M9).
- Keterbacaan QR 168 px dari cetakan asli: butuh cetak 4R dan kamera HP. Langkah dan tabelnya di `docs/DECISIONS.md` (M9); ini salah satu butir "Selesai bila" M9.
- Sentuhan, kamera sungguhan, dan unduhan di Chrome Android, Safari iOS, Edge, serta Firefox sungguhan. Mesin WebKit dan Gecko sudah tercakup otomatis (`npx playwright test --project=firefox --project=webkit`, hijau di M9); sisanya tabel manual pengguna.
- Pembaca layar (NVDA, VoiceOver, TalkBack): audit axe dan uji keyboard otomatis sudah hijau, verifikasi dengan pembaca layar butuh pengguna.
- LCP Welcome: **tercapai di produksi.** Median 2,416 detik pada preset seluler Lighthouse terhadap batas 2,5 detik (PRD §8); lima jalankan 16 Oktober 2026 terhadap Worker produksi, sebaran 2.317 sampai 2.517 ms, FCP 1,066 detik, TBT 62 ms, CLS 0, skor 97. Angka 3,17 detik (M9, `next start`) dan 3,745 detik (M10, `wrangler dev`) diukur di server lokal, bukan CDN, jadi keduanya melebih-lebihkan selisihnya. Langkah 1 rencana lama (mengeluarkan `sonner` dari jalur kritis Welcome lewat `DeferredToaster`) sudah dikerjakan: JS sebelum `load` di pratinjau turun 12,0 KB dan chunk sonner tidak lagi ikut pra-`load`, sementara median produksi bergerak 28 ms yang masih di dalam derau. Langkah 2 dan 3 rencana lama tidak lagi diperlukan untuk memenuhi target, tetapi tetap tersedia bila pengukuran di perangkat nyata kelak menunjukkan sebaliknya. Ekspor strip (median 922 ms) sudah di dalam target. Rincian, tabel, dan bukti bundelnya di `docs/DECISIONS.md` (M9, "Langkah 1 rencana"; M10, "Bukti verifikasi").
- Streaming metadata/PPR: dilepas di M10 karena runtime Worker menolaknya di bawah permintaan bersamaan (rincian dan buktinya di `docs/DECISIONS.md` M10). `/s/[id]` dan `/r/[id]` kini dirender dinamis penuh dan tetap menjawab 404 sungguhan; kalau upstream (Next atau OpenNext) memperbaiki `CacheSignal` di workerd, PPR bisa dipertimbangkan lagi sebagai pekerjaan tersendiri.
- Deploy ke Cloudflare: `npm run deploy` dan bukti produksi dicatat di `docs/DECISIONS.md` (M10). Pembongkaran proyek Supabase dan kaitan Vercel adalah tindakan dasbor pengguna.
- Data produksi D1/R2: sumber daya dibuat segar di akun pengguna; tidak ada data lama untuk dimigrasikan karena repo ini belum pernah dideploy.

Yang sudah selesai dan tidak perlu diperiksa lagi: perintah di §3 sudah dijalankan sejak M0, pemilihan registry neobrutalism diputuskan di M0 (`docs/DECISIONS.md`), dan dukungan `MediaRecorder` antar-browser sudah dipetakan di M7 (`pickLiveKind`) dengan proyek WebKit dan Firefox ikut hijau di M9. M10 memindahkan backend ke D1/KV/R2 lewat OpenNext dan menggantikan `@cloudflare/vitest-pool-workers` dengan `wrangler getPlatformProxy` untuk uji basis data (alasan dan buktinya di `docs/DECISIONS.md` M10).
