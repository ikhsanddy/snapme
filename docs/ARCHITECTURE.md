# snapme: Architecture

Versi 0.2, 18 Oktober 2026. Dibaca bersama `PRD.md` (apa yang dibangun) dan `DESIGN-SYSTEM.md` (tampilannya). Dokumen ini menjawab: dengan apa, disusun bagaimana, dan dikerjakan dengan alur apa.

Perubahan besar dari versi 0.1: backend dibongkar (18 Oktober 2026, keputusan pengguna; catatannya di `docs/DECISIONS.md`). snapme kini aplikasi klien murni: seluruh alur booth berjalan di browser tanpa server, seluruh rute `/api` adalah stub yang menjawab 503 "belum tersedia", dan halaman `/s/[id]` serta `/r/[id]` selalu menjawab 404.

## 1. Prinsip

1. **Pakai yang sudah jadi dulu.** Kerangka, komponen, dan pustaka yang terawat dipasang lebih dulu, lalu disesuaikan dengan design system. Menulis sendiri adalah pilihan terakhir (§2).
2. **Semua di perangkat.** Kamera, deteksi gesture, penyuntingan, perekaman Strip Hidup, dan simpanan sesi berjalan di browser. Tidak ada unggahan ke mana pun: tidak ada server yang menerimanya.
3. **Token saja.** Warna, radius, bayangan, dan fon hanya didefinisikan di `globals.css`. Komponen memakai nama token.
4. **Modul berat dimuat belakangan.** Welcome tidak memuat kode kamera, gesture, atau kanvas.
5. **Logika murni dipisah dari perangkat.** Ambang gesture dan geometri strip adalah fungsi murni yang bisa diuji tanpa kamera.

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

Dialog, lembar bawah, tab, sakelar, slider, tooltip, toast, carousel, pengelolaan fokus, pembuat QR, pustaka transformasi kanvas (geser, putar, ubah ukuran), model deteksi tangan, pembuat ID, validasi skema, ikon.

### Syarat pustaka baru

Lisensi permisif (MIT, Apache-2.0, BSD), ada rilis atau commit dalam 12 bulan terakhir, mendukung versi React dan Tailwind yang terpasang, dan tidak mengirim data ke pihak ketiga. Periksa sebelum memasang, catat di `docs/DECISIONS.md`.

## 3. Stack

Versi tidak dipaku di dokumen ini. Pasang versi stabil terbaru, lalu biarkan lockfile yang mengunci.

| Lapisan | Pilihan | Dipakai untuk | Catatan |
|---|---|---|---|
| Kerangka | Next.js (App Router) + React + TypeScript | Halaman dan metadata | |
| Gaya | Tailwind CSS v4 | Token dan utilitas | Token di DESIGN-SYSTEM §13 |
| Komponen dasar | shadcn/ui (Radix) | Semua komponen umum di DESIGN-SYSTEM §9 | Kode disalin ke repo, jadi bebas disesuaikan |
| Titik awal gaya | Registry neobrutalism berbasis shadcn | Varian bergaris tebal dan berbayang keras | Lihat "Evaluasi registry" di bawah |
| Ikon | `@phosphor-icons/react` | Semua ikon | Mengganti `lucide-react` bawaan shadcn |
| Gerak | `motion` (`motion/react`) | Transisi di DESIGN-SYSTEM §7 | |
| State | `zustand` | State sesi booth | |
| Kamera | `react-webcam` | Pembungkus `getUserMedia` | |
| Gesture | `@mediapipe/tasks-vision` (Gesture Recognizer) | Gesture Snap | Kategori bawaannya memuat `Victory`, `Open_Palm`, `Thumb_Up`. Berkas wasm dan model di-host sendiri |
| Kanvas | `konva` + `react-konva` | Penyusunan strip, stiker, efek, ekspor PNG | Efek foto memakai filter bawaan Konva agar seragam antar browser |
| QR | `qrcode` | Kotak QR di kaki strip | Dimuat dengan `import()` dinamis; QR sungguhan hanya digambar bila link sudah ada, dan link itu kini tidak pernah jadi |
| Video | `canvas.captureStream()` + `MediaRecorder` | Unduhan Strip Hidup | API browser, tanpa pustaka |
| Validasi | `zod` | Batas jenis dan ukuran berkas yang divalidasi klien (`lib/schemas.ts`) | |
| ID | `nanoid` | ID sesi lokal (store booth dan IndexedDB) | |
| Analitik | Endpoint peristiwa first-party (`POST /api/events`, dikirim `navigator.sendBeacon`) | Ukuran PRD §4 | Tanpa cookie, tanpa pustaka pihak ketiga, daftar peristiwa tertutup di `src/lib/analyticsEvents.ts`. Selama rutenya 503, antrean membuang batchnya diam-diam (`lib/analytics.ts`) |
| Uji | Vitest, Playwright | Unit dan end-to-end | Playwright punya kamera palsu di Chromium; proyek `firefox` dan `webkit` memuat `crossbrowser.spec.ts` |

Tidak ada baris basis data, penyimpanan berkas, anggaran laju, hosting, dan CLI sumber daya: semuanya dibongkar bersama backendnya pada 18 Oktober 2026 (daftar yang dihapus dan alasannya di `docs/DECISIONS.md`). Tidak ada variabel lingkungan yang dibutuhkan build maupun runtime.

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

Bila `create-next-app` menolak folder yang sudah berisi dokumen, buat di folder sementara lalu pindahkan isinya ke root.

## 4. Struktur folder

```
snapme/
├─ next.config.ts  eslint.config.mjs  tsconfig.json  vitest.config.mts
├─ playwright.config.ts          uji e2e terhadap dev server
├─ docs/
│  ├─ PRD.md  DESIGN-SYSTEM.md  ARCHITECTURE.md
│  ├─ MILESTONES.md              rencana rilis: pekerjaan dan syarat selesai tiap tahap
│  ├─ DECISIONS.md               catatan keputusan dan pustaka yang ditambah
│  └─ ui-reference/              acuan pasti UI: welcome.html, capture.html, customize.html
├─ public/
│  ├─ brand/snapme-mark.svg      lambang merek (DESIGN-SYSTEM §8)
│  ├─ mediapipe/wasm/            disalin dari paket saat pemasangan, tidak di git
│  ├─ models/gesture_recognizer.task
│  ├─ stickers/
├─ src/
│  ├─ app/
│  │  ├─ page.tsx                Welcome (komponen server, statis)
│  │  ├─ booth/layout.tsx        Booth Shell + stepper
│  │  ├─ booth/{layout,capture,customize,result}/page.tsx
│  │  ├─ s/[id]/page.tsx         selalu 404: tidak ada strip yang tersimpan (noindex)
│  │  ├─ r/[id]/page.tsx         selalu 404: tidak ada estafet yang tersimpan (noindex)
│  │  ├─ privasi/page.tsx
│  │  ├─ dev/ui/page.tsx         galeri komponen, hanya saat pengembangan
│  │  ├─ icon.svg                favicon SVG, versi kecil lambang (DESIGN-SYSTEM §8)
│  │  ├─ apple-icon.png          diturunkan `npm run brand:icons`
│  │  ├─ favicon.ico             diturunkan `npm run brand:icons` (16, 32, 48 px)
│  │  └─ api/...                 stub kontrak lama: seluruhnya menjawab 503 "belum tersedia" (§7)
│  ├─ components/
│  │  ├─ ui/                    komponen shadcn yang sudah disesuaikan
│  │  └─ site/                  wordmark dan header, dipakai halaman situs dan kerangka booth
│  ├─ features/                 tiap fitur memiliki logika dan komponennya sendiri
│  │  ├─ booth/                 BoothPanel dan stepper: kerangka tiap langkah booth
│  │  ├─ camera/                CameraPicker, useCamera, izin, potong tengah
│  │  ├─ gesture/               GestureHUD, GestureToggle, gestureSource (MediaPipe), holdDetector (murni)
│  │  ├─ capture/               mesin keadaan, hitung mundur, CameraStage, ShotTray, perekam bingkai
│  │  ├─ editor/                CustomizeEditor, panel hias, StripCanvas, efek, stiker
│  │  ├─ result/                layar hasil: ResultView, ekspor strip, lembar cetak 4R
│  │  ├─ gallery/               pemilih foto galeri sebagai pengganti kamera (FR-13)
│  │  ├─ live/                  perekam video Strip Hidup dan dukungan medianya
│  │  ├─ relay/                 kartu undang estafet dan panggilan jaringannya (selalu 503)
│  │  ├─ session/               simpanan sesi IndexedDB
│  │  ├─ share/                 kartu bagikan, dialog persetujuan, pembuat QR lokal
│  │  └─ metrics/               ping pembuka sesi
│  ├─ lib/
│  │  ├─ layouts.ts              geometri ekspor (DESIGN-SYSTEM §5)
│  │  ├─ schemas.ts              batas jenis dan ukuran berkas, dipakai klien
│  │  ├─ relaySlots.ts           pembagian slot estafet (murni)
│  │  ├─ http.ts                 panggilan jaringan klien bersama (pesan galat, PUT ke URL bertanda tangan)
│  │  ├─ analytics.ts            antrean beacon analitik
│  │  └─ imageElement.ts  utils.ts  analyticsEvents.ts
│  └─ stores/booth.ts            state sesi (zustand)
└─ tests/                        cermin `src/`, plus
   ├─ security/                  pagar bundel klien
   ├─ e2e/                       Playwright: alur kamera palsu dan pagar privasi
   └─ components/  features/  lib/  stores/
```

Aturan penempatan, supaya tidak ada layar yang punya dua rumah: `src/app/` hanya memuat rute
(`page.tsx`, `layout.tsx`, `route.ts`, `globals.css`); `src/components/ui/` memuat primitif shadcn
apa adanya dari CLI, dan `src/components/site/` hanya bagian kerangka yang dipakai bersama halaman
situs dan booth (wordmark dan header); komponen produk tinggal di dalam fiturnya masing-masing di
`src/features/<area>/`, bersama logikanya. Tidak ada modul khusus server di `src/`: seluruh `src/`
aman untuk bundel klien, dan `tests/security` menjaga pagar itu beserta rahasianya.

## 5. Rute dan keadaan sesi

| Rute | Jenis | Isi |
|---|---|---|
| `/` | Server, statis | Welcome |
| `/booth/layout` | Klien | Pilih layout |
| `/booth/capture` | Klien | Kamera, Gesture Snap, baki foto |
| `/booth/customize` | Klien | Kanvas hias, Strip Hidup, QR |
| `/booth/result` | Klien | Unduh, cetak, bagikan |
| `/s/[id]` | Server | Selalu 404 (`notFound()`): tidak ada strip yang tersimpan. `noindex` dan `no-referrer` tetap dipasang `next.config.ts` |
| `/r/[id]` | Server | Selalu 404, aturan yang sama dengan `/s/[id]` |
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

`layoutId`, `shots[]` (tiap entri: gambar diam + bingkai klip + pemilik slot), `settings` (gesture nyala, kamera terpilih), `editor` (frame, efek, stiker[], teks[]), `live`, `share` (id, token hapus, kedaluwarsa), `relay` (id, peran, slot terkunci). Foto disimpan di memori. Penyimpanan lintas muat ulang (FR-14) memakai IndexedDB. Bagian `share` dan `relay` tetap ada sebagai state UI: keduanya tidak pernah terisi karena pembuatan link selalu gagal 503.

## 6. Modul inti

**Kamera.** `react-webcam` dengan `facingMode: "user"`, pratinjau dicerminkan lewat CSS, foto diambil dari bingkai video ke kanvas lalu dicerminkan agar sama dengan pratinjau. Resolusi diminta 1280 x 720 atau lebih, lalu di-crop ke rasio slot.

**Gesture.** Dua bagian terpisah:

- `gestureSource`: memuat `GestureRecognizer` dalam mode video dari berkas di `public/`, membaca bingkai yang diperkecil dengan laju dibatasi (sekitar 10 sampai 15 kali per detik), dan memancarkan `{kategori, skor, waktu}`. Dimuat dengan `import()` dinamis setelah izin kamera diberikan.
- `holdDetector`: fungsi murni yang mengubah aliran itu menjadi peristiwa `tahan-mulai`, `tahan-progres`, `tahan-selesai`, `tahan-batal` memakai ambang dari PRD §7.2. Ambang ada di satu berkas konstanta.

**Editor.** `react-konva` menyusun strip dari geometri di `lib/layouts.ts`. Efek foto adalah preset filter Konva. Stiker memakai `Transformer` bawaan. Ekspor memanggil `stage.toDataURL` dengan `pixelRatio` yang menghasilkan ukuran di DESIGN-SYSTEM §5. Padanan daftar untuk keyboard dan pembaca layar membaca state yang sama.

**Strip Hidup.** Bingkai klip disimpan sebagai `ImageBitmap`. `LiveStripPlayer` menggambar ulang kanvas strip dengan bingkai berjalan. Unduhan merekam kanvas itu lewat `captureStream` dan `MediaRecorder`, dengan jenis berkas dipilih lewat `MediaRecorder.isTypeSupported`. Perekaman dan unduhannya murni lokal.

**Bagikan dan QR.** UI-nya utuh: dialog persetujuan menyebut apa yang akan diunggah, siapa yang bisa melihat, dan kapan terhapus (PRD SE-02, SH-04); kartu bagikan punya tombol buat link, alamat, dan salin. Alurnya: `requestStrip()` memanggil `POST /api/strips`, yang sekarang selalu menjawab 503, sehingga kartu selalu berakhir di pesan "belum tersedia" dan tidak ada permintaan yang membawa gambar. Sakelar QR menyalakan kotak penanda di kanvas; QR sungguhan (`qrcode`, dimuat dinamis) hanya digambar setelah link ada, dan karena link tidak pernah jadi, QR itu tidak pernah muncul.

**Estafet.** Kartu undangan dan dialog persetujuannya tetap ada di langkah Ambil Foto; `POST /api/relays` menjawab 503, jadi pembuatan link estafet selalu berakhir di pesan yang sama, dan halaman `/r/[id]` untuk teman selalu 404. Pembagian slot (`lib/relaySlots.ts`) dan token lokalnya tetap diuji sebagai fungsi murni.

## 7. Data dan API

### Rute (stub kontrak lama)

Tidak ada basis data dan tidak ada penyimpanan berkas: semuanya dibongkar bersama backend pada 18 Oktober 2026 (`docs/DECISIONS.md`). Rute di bawah dipertahankan sebagai stub yang menjawab 503 dengan pesan tetap, supaya klien yang masih memanggilnya menampilkan "belum tersedia", bukan galat jaringan atau 404.

| Rute | Jawaban |
|---|---|
| `POST /api/strips` | 503 "Pembuatan link belum tersedia." |
| `POST /api/strips/[id]/complete` | 503, pesan yang sama |
| `DELETE /api/strips/[id]` | 503 "Penghapusan link belum tersedia." |
| `POST /api/relays` | 503 "Pembuatan link belum tersedia." |
| `POST /api/relays/[id]/claim` | 503, pesan yang sama |
| `POST /api/relays/[id]/complete` | 503, pesan yang sama |
| `POST /api/relays/[id]/strip` | 503, pesan yang sama |
| `DELETE /api/relays/[id]` | 503 "Penghapusan link belum tersedia." |
| `POST /api/events` | 503 "Pencatatan peristiwa belum tersedia." |

Karena tidak ada yang tersimpan, tidak ada pula kedaluwarsa, token hapus di sisi server, kuota, atau pembersih terjadwal. Halaman `/s/[id]` dan `/r/[id]` menjawab 404 lewat `notFound()` untuk `id` apa pun, dan antrean analitik klien membuang batchnya diam-diam saat `POST /api/events` menjawab 503 (`lib/analytics.ts`, tanpa pengulangan).

## 8. Privasi dan keamanan

- **Tidak ada unggahan.** Tidak ada foto, klip, atau peristiwa yang meninggalkan perangkat: tidak ada layanan yang menerimanya. Uji Playwright menegaskan tidak ada permintaan yang membawa gambar selama `/booth/capture` (PRD GS-01).
- **Persetujuan**: dialog sebelum unggahan tetap dipertahankan di UI (PRD SE-02, SH-04), walaupun unggahannya tidak pernah terjadi; alurnya selalu berakhir di pesan "belum tersedia".
- **Batas berkas**: jenis dan ukuran (diam 2 MB, klip 5 MB, slot estafet 1 MB) divalidasi di klien lewat `lib/schemas.ts` sebelum klien menawarkan unggahan.
- **Link**: halaman `/s/*` dan `/r/*` diberi `noindex` dan `Referrer-Policy: no-referrer`, dan keduanya selalu 404.
- **Header**: CSP penuh tanpa satu pun host luar (fon, wasm, dan model MediaPipe di-host sendiri; `wasm-unsafe-eval` untuk MediaPipe; `blob:` dan `data:` untuk kanvas, perekam, dan konversi Blob), `Permissions-Policy: camera=(self)`, `X-Content-Type-Options: nosniff`, dan `frame-ancestors 'none'`. `script-src` memuat `'unsafe-inline'` (skrip bootstrap App Router tanpa nonce; nonce memaksa render dinamis) dan `'unsafe-eval'` hanya di pengembangan. Rincian tiap direktif di `docs/DECISIONS.md` M9 (sejarah).
- **Tanpa pihak ketiga**: fon di-host sendiri, wasm dan model MediaPipe di-host sendiri, tanpa pelacak. Hitungan peristiwa PRD §4 lewat rute sendiri (`POST /api/events`), tanpa cookie dan tanpa kolom identitas; selama rutenya 503, antrean klien membuang batchnya tanpa mengulang.
- **Metadata**: ekspor lewat kanvas tidak membawa EXIF.
- **Rahasia**: tidak ada. Tidak ada variabel lingkungan yang dibutuhkan build maupun runtime, dan tidak ada berkas `.env*` atau `.dev.vars` di repo.

## 9. Kinerja

- `/` adalah komponen server statis. Kode booth dipisah per rute.
- MediaPipe dan Konva dimuat dengan `import()` dinamis di langkah yang memakainya.
- Deteksi gesture memakai bingkai yang diperkecil dan laju terbatas. Bila pratinjau tersendat, turunkan laju dulu, baru pertimbangkan Web Worker.
- Bingkai klip 480 px. Dilepas (`close()`) saat sesi diulang.
- Stiker dan frame dalam ukuran yang sudah dioptimalkan. Fon lewat `next/font`.

## 10. Pengujian

| Lapisan | Alat | Yang diuji |
|---|---|---|
| Unit | Vitest | `holdDetector`, mesin keadaan pemotretan, geometri `layouts.ts` (jumlah piksel pas 1800), antrean analitik, pembagian slot estafet, perekam bingkai |
| Komponen | Vitest + Testing Library | Keadaan tombol, stepper, baki foto, HUD gesture, daftar hiasan |
| Keamanan | Vitest (`tests/security`) | Tidak ada berkas klien yang mengimpor modul khusus server, dan tidak ada rahasia yang muncul di bundel statis hasil build |
| End-to-end | Playwright (Chromium dengan `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream`) | Alur dasar sampai unduh, izin ditolak, jalur "belum tersedia" (kartu bagikan, QR, estafet), dan halaman `/s` serta `/r` yang selalu 404 dan tidak diindeks |
| Privasi | Playwright | Tidak ada permintaan jaringan yang membawa gambar selama `/booth/capture` (PRD GS-01) |
| Aksesibilitas | `@axe-core/playwright` + uji keyboard manual | Semua halaman |
| Lintas peramban | Proyek `firefox` dan `webkit` (hanya `crossbrowser.spec.ts`) | Perilaku inti di mesin Gecko dan WebKit |
| Manual | HP Android kelas menengah, iPhone, laptop | Gesture pada berbagai cahaya, cetak 4R; pindai QR menunggu link yang bisa dibuat lagi |

Perintah pemeriksaan sebelum sebuah perubahan dianggap selesai: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, dan `npx playwright test` untuk alur yang disentuh.

Yang sudah selesai dan tidak perlu diperiksa lagi: perintah di §3 sudah dijalankan sejak M0, pemilihan registry neobrutalism diputuskan di M0 (`docs/DECISIONS.md`), dan dukungan `MediaRecorder` antar-browser sudah dipetakan di M7 (`pickLiveKind`) dengan proyek WebKit dan Firefox ikut hijau di M9. M10 memindahkan backend ke Cloudflare, dan pembongkaran baliknya pada 18 Oktober 2026 dicatat di `docs/DECISIONS.md`.

## 11. Milestone

Urutan kerja, pekerjaan, dan syarat selesai tiap milestone ada di `MILESTONES.md` (M0 Fondasi sampai M10 Migrasi Cloudflare, lalu catatan pembongkaran backend 18 Oktober 2026). Berkas itu satu-satunya sumber untuk milestone dan memuat pula syarat selesai yang berlaku umum tiap tahap.

## 12. Yang belum diverifikasi

- Kinerja Gesture Recognizer di HP kelas menengah: ambang dan laju di PRD §7.2 masih nilai awal dan butuh uji pakai di perangkat sungguhan. Langkahnya ada di tabel manual pengguna `docs/DECISIONS.md` (M9).
- Keterbacaan QR 168 px dari cetakan asli: butuh cetak 4R dan kamera HP, dan QR-nya sendiri butuh link yang bisa dibuat, jadi butir ini tertunda sampai fitur bagikan hidup lagi. Langkah dan tabelnya di `docs/DECISIONS.md` (M9).
- Sentuhan, kamera sungguhan, dan unduhan di Chrome Android, Safari iOS, Edge, serta Firefox sungguhan. Mesin WebKit dan Gecko sudah tercakup otomatis (`npx playwright test --project=firefox --project=webkit`, hijau di M9); sisanya tabel manual pengguna.
- Pembaca layar (NVDA, VoiceOver, TalkBack): audit axe dan uji keyboard otomatis sudah hijau, verifikasi dengan pembaca layar butuh pengguna.
- LCP Welcome: pengukuran produksi terakhir (median 2,416 detik, 16 Oktober 2026) diambil terhadap deployment yang sudah dibongkar, jadi angka itu historis. Ukur ulang terhadap `next start` lokal bila angka yang berlaku dibutuhkan; angka lokal lama (3,17 detik di M9) melebih-lebihkan selisihnya karena bukan CDN.
- Belum ada deployment publik: snapme dijalankan lewat `npm run dev` atau `next start` milik sendiri, tanpa layanan eksternal.
