# snapme: Architecture

Versi 0.1, 8 Oktober 2026. Dibaca bersama `PRD.md` (apa yang dibangun) dan `DESIGN-SYSTEM.md` (tampilannya). Dokumen ini menjawab: dengan apa, disusun bagaimana, dan dikerjakan dengan alur apa di omp.

## 1. Prinsip

1. **Pakai yang sudah jadi dulu.** Kerangka, komponen, dan pustaka yang terawat dipasang lebih dulu, lalu disesuaikan dengan design system. Menulis sendiri adalah pilihan terakhir (§2).
2. **Lokal dulu.** Kamera, deteksi gesture, penyuntingan, dan ekspor berjalan di browser. Server hanya dipakai saat pengguna membuat link.
3. **Token saja.** Warna, radius, bayangan, dan fon hanya didefinisikan di `globals.css`. Komponen memakai nama token.
4. **Modul berat dimuat belakangan.** Welcome tidak memuat kode kamera, gesture, atau kanvas.
5. **Logika murni dipisah dari perangkat.** Ambang gesture, geometri strip, dan aturan kedaluwarsa adalah fungsi murni yang bisa diuji tanpa kamera.

## 2. Aturan "pakai yang sudah jadi dulu"

Aturan ini mengikat agent dan manusia.

### Tangga keputusan

Untuk setiap kebutuhan, turun satu anak tangga hanya bila anak tangga di atasnya tidak memenuhi:

1. **Fitur platform**: API browser atau fitur Next.js (contoh: Web Share API, `MediaRecorder`, `next/font`).
2. **Komponen atau pustaka di tabel §3.**
3. **Komponen dari registry shadcn lain atau pustaka npm terawat**: cari dulu, juga lewat `find-skills` (§11.3) untuk skill yang memandu pemakaiannya.
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
| Kerangka | Next.js (App Router) + React + TypeScript | Halaman, rute server, metadata halaman strip | Bawaan taste-skill juga React/Next |
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
| Data | Supabase (Postgres + Storage) | Link strip, estafet, dan hitungan peristiwa | Hanya diakses dari server |
| Analitik | Endpoint peristiwa first-party (`POST /api/events`, dikirim `navigator.sendBeacon`) | Ukuran PRD §4 | Tanpa cookie, tanpa pustaka pihak ketiga, daftar peristiwa tertutup di `src/lib/analyticsEvents.ts` |
| Hosting | Vercel | Aplikasi dan cron pembersih | |
| Uji | Vitest, Playwright | Unit dan end-to-end | Playwright punya kamera palsu di Chromium; proyek `firefox` dan `webkit` memuat `crossbrowser.spec.ts` |
| Ukur kinerja | Lighthouse (devDependency) | LCP Welcome di server produksi | `npm run perf:lcp`; preset bawaan seluler |

### Evaluasi registry neobrutalism (dikerjakan di M0)

Yang sudah saya periksa pada 8 Oktober 2026:

- **RetroUI** (`retroui.dev`, repo `neobrutalism/neobrutalism`): berbasis shadcn, lisensi MIT, komponen dipasang lewat registry. Tanggal commit terakhir belum saya lihat.
- **Neobrutalism components** (`neobrutalism.dev`, repo `ekmas/neobrutalism-components`): README-nya menyatakan tidak lagi dirawat. Jangan dijadikan sumber utama.
- **BoldKit** (`boldkit.dev`): berbasis shadcn, sudut bawaannya nol, berlawanan dengan radius di design system.

Langkah M0: periksa tanggal commit terakhir RetroUI dan kecocokannya dengan versi React dan Tailwind yang terpasang. Bila lolos syarat §2, ambil varian `button`, `card`, dan `badge` dari sana sebagai titik awal. Bila tidak, pakai shadcn/ui polos: gaya snapme (garis 2 px, bayangan keras, pil) cukup diterapkan lewat token dan varian. Keputusan dicatat di `docs/DECISIONS.md`.

### Perintah awal (panduan untuk M0, belum saya jalankan)

```powershell
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
npx shadcn@latest init
npx shadcn@latest add button badge card dialog drawer tabs toggle-group switch slider sonner tooltip skeleton carousel
npm i zustand zod nanoid motion @phosphor-icons/react react-webcam konva react-konva @mediapipe/tasks-vision qrcode @supabase/supabase-js
npm i -D vitest @testing-library/react @playwright/test @axe-core/playwright @types/qrcode
```

Bila `create-next-app` menolak folder yang sudah berisi dokumen, buat di folder sementara lalu pindahkan isinya ke root.

## 4. Struktur folder

```
snapme/
├─ AGENTS.md                     dimuat otomatis oleh omp, mengimpor tiga dokumen di bawah
├─ PRD.md  DESIGN-SYSTEM.md  ARCHITECTURE.md
├─ MILESTONES.md                 urutan kerja, dibaca per milestone
├─ .omp/config.yml               Model Roles dan pagar perintah untuk proyek ini
├─ .agents/skills/               find-skills dan taste-skill (§11.3)
├─ docs/
│  ├─ DECISIONS.md               catatan keputusan dan pustaka yang ditambah
│  └─ ui-reference/              acuan pasti UI: welcome.html, capture.html, customize.html, referensi_uiux.webp
├─ public/
│  ├─ mediapipe/wasm/            disalin dari node_modules/@mediapipe/tasks-vision/wasm
│  ├─ models/gesture_recognizer.task
│  ├─ frames/  stickers/
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
│  │  ├─ supabase/server.ts      klien server
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

**Bagikan dan QR.** Setelah persetujuan: minta ID dan URL unggah bertanda tangan dari server, unggah langsung dari browser ke Storage, konfirmasi, lalu render ulang strip dengan QR ke `/s/{id}`.

**Estafet.** Sama seperti bagikan, tetapi yang diunggah adalah foto per slot. Teman mengambil giliran dengan menukar ID estafet menjadi token tamu.

## 7. Data dan API

### Tabel (Postgres)

| Tabel | Kolom |
|---|---|
| `strips` | `id` (teks, nanoid), `layout`, `still_path`, `live_path` (boleh kosong), `status` (`draft`, `complete`), `delete_token_hash`, `relay_id` (boleh kosong), `created_at`, `expires_at` |
| `relays` | `id`, `layout`, `slots` (jsonb: indeks, pemilik `host` atau `guest`, path), `host_token_hash`, `guest_token_hash` (boleh kosong), `status` (`waiting`, `claimed`, `complete`, `cancelled`), `strip_id` (boleh kosong; gerbang pemenang tunggal jalur pemulihan `complete`), `created_at`, `expires_at` |
| `events` | `id` (identity), `name` (daftar tertutup), `rate_key`, `created_at`. Retensi 90 hari |

Catatan M9 pada `relays`: `layout` dibatasi daftar tertutup dan `slots` dipastikan array lewat check constraint, sedangkan bentuk tiap elemen slot diperiksa saat dibaca (`relaySlotsOf`). Indeks unik parsial `relays_strip_id_key` menjaga satu estafet hanya menunjuk satu strip; satu estafet bisa menyisakan lebih dari satu baris `strips` kalau baris lamanya adalah batu nisan penghapusan, dan yang dijaga gerbangnya adalah satu strip aktif per estafet.

### Storage

Satu bucket pribadi `snapme`. Path: `strips/{id}/still.png`, `strips/{id}/live.webm|mp4`, `relays/{id}/slot-{n}.jpg`. Dibaca lewat URL bertanda tangan berumur pendek yang dibuat server saat halaman dirender.

### Rute server

| Rute | Fungsi |
|---|---|
| `POST /api/strips` | Buat strip `draft`, kembalikan `id`, token hapus, dan URL unggah bertanda tangan |
| `POST /api/strips/[id]/complete` | Verifikasi berkas ada, tandai `complete`, pasang `expires_at` 7 hari |
| `DELETE /api/strips/[id]` | Hapus berkas dan baris. Butuh token hapus |
| `POST /api/relays` | Buat estafet, kembalikan `id`, token pembuat, URL unggah slot pembuat |
| `POST /api/relays/[id]/claim` | Ambil giliran: kembalikan token tamu dan URL unggah slot tamu. Hanya berhasil sekali |
| `POST /api/relays/[id]/complete` | Tandai lengkap, buat strip, kembalikan `/s/{id}`. Dijaga gerbang pemenang tunggal `strip_id` |
| `POST /api/relays/[id]/strip` | Serahkan tautan strip dan URL baca foto slot hanya ke pemegang token estafet (M8, temuan security-reviewer) |
| `DELETE /api/relays/[id]` | Batalkan dan hapus. Butuh token pembuat |
| `POST /api/events` | Catat 1 sampai 20 peristiwa analitik (nama dari daftar tertutup). Anggaran 200 peristiwa per jam per sidang |
| `GET /api/cron/purge` | Hapus berkas dan baris yang kedaluwarsa, termasuk peristiwa analitik yang lebih tua dari 90 hari. Dijalankan Vercel Cron harian, dilindungi rahasia |

Unggahan tidak melewati rute server (menghindari batas ukuran isi permintaan fungsi serverless). Kedaluwarsa juga diperiksa saat baca: halaman dan API menjawab 410 walau cron belum berjalan.

## 8. Privasi dan keamanan

- **Akses data**: RLS menolak semua akses `anon`. Kunci service role hanya ada di server (`SUPABASE_SERVICE_ROLE_KEY`, tanpa awalan `NEXT_PUBLIC_`).
- **Token**: token hapus, pembuat, dan tamu dibuat acak, disimpan di perangkat pengguna, dan hanya hash-nya yang disimpan di basis data.
- **Link**: ID nanoid 12 karakter atau lebih. Halaman `/s` dan `/r` diberi `noindex` dan `Referrer-Policy: no-referrer`.
- **Batas**: jenis berkas PNG, JPEG, WebM, MP4. Ukuran diam 2 MB, klip 5 MB, slot estafet 1 MB. Divalidasi dengan `zod` dan dibatasi pada URL unggah.
- **Pembatasan laju** pada rute `POST`: pakai fitur platform atau pustaka siap pakai. Pilihannya ditetapkan di M6 dan dicatat di `docs/DECISIONS.md`.
- **Persetujuan**: dialog sebelum setiap unggahan pertama (PRD SE-02, SH-04).
- **Tanpa pihak ketiga**: fon di-host sendiri, wasm dan model MediaPipe di-host sendiri, tanpa pelacak. Hitungan peristiwa PRD §4 lewat rute sendiri (`POST /api/events`), tanpa cookie dan tanpa kolom identitas.
- **Header**: `Permissions-Policy: camera=(self)`, `X-Content-Type-Options: nosniff`, dan CSP penuh untuk semua rute sejak M9 (`next.config.ts`, disusun dari env: host Supabase hanya ditambahkan bila `NEXT_PUBLIC_SUPABASE_URL` ada). `script-src` memuat `'unsafe-inline'` (skrip bootstrap App Router tanpa nonce; nonce memaksa render dinamis) dan `wasm-unsafe-eval` (MediaPipe); `'unsafe-eval'` hanya di pengembangan. Rincian tiap direktif dan temuan verifikasinya di `docs/DECISIONS.md` M9. `htmlLimitedBots: /.*/ ` membuat halaman ber-PPR dirender blocking seperti crawler, supaya `notFound()` pada `/s/[id]` dan `/r/[id]` benar-benar menjawab 404 di produksi
- **Analitik**: `rate_key` pada tabel `events` memakai hash bergaram yang sama dengan rute POST lain, dan rutenya dibatasi 200 peristiwa per jam per sidang
- **Metadata**: ekspor lewat kanvas tidak membawa EXIF.

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
| End-to-end | Playwright (Chromium dengan `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream`) | Alur dasar sampai unduh, izin ditolak, estafet dengan dua konteks browser, halaman kedaluwarsa |
| Privasi | Playwright | Tidak ada permintaan jaringan yang membawa gambar selama `/booth/capture` (PRD GS-01) |
| Aksesibilitas | `@axe-core/playwright` + uji keyboard manual | Semua halaman |
| Manual | HP Android kelas menengah, iPhone, laptop | Gesture pada berbagai cahaya, cetak 4R dan pindai QR |

Perintah pemeriksaan sebelum sebuah milestone dianggap selesai: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, dan `npx playwright test` untuk alur yang disentuh.

## 11. Alur kerja dengan omp

### 11.1 Model Roles

Disalin dari tangkapan layar model hub (Alt+M, tab Roles) dan dipaku untuk proyek ini di `.omp/config.yml`, yang hanya terbaca bila omp dijalankan dari root repo. Periksa dengan `omp config get modelRoles`. Bila sebuah ID tidak dikenali, cari dengan `omp models find <nama>` lalu perbaiki di berkas itu.

Tabel ini dicocokkan ulang dengan keluaran `omp config get modelRoles` pada 9 Oktober 2026 (M9). Tiga sel berbeda dari tangkapan layar awal dan sudah diperbaiki: `default` tidak memakai thinking eksplisit (mengikuti bawaan), `plan` memakai `max`, dan `advisor` memakai `medium`.

| Role | Model | Thinking | Bekerja saat |
|---|---|---|---|
| `default` | `opencode-go/deepseek-v4.1-flash` | bawaan | Permintaan biasa dan pengerjaan setelah rencana disetujui |
| `smol` | `deepseek/deepseek-flash` | high | Subagent `scout` dan `sonic`, tugas ringan |
| `slow` | `google-antigravity/gemini-3.8-flash` | high | Subagent `reviewer` |
| `vision` | `google-antigravity/gemini-3.8-flash` | high | Membaca gambar referensi dan tangkapan layar |
| `plan` | `zai/glm-5.3` | max | `/plan` |
| `commit` | `google-antigravity/gemini-3.7-flash` | auto | `omp commit` |
| `tiny` | `google-antigravity/gemini-3.7-flash` | auto | Judul sesi dan tugas kecil |
| `memory` | `deepseek/deepseek-flash` | high | Dukungan memori |
| `task` | `opencode-go/deepseek-v4.1-flash` | max | Subagent `task` |
| `advisor` | `google-antigravity/gemini-3.8-flash` | medium | Peninjau latar bila advisor dinyalakan |
| `image` | `google-antigravity/gemini-3-pro-image` | | Membuat stiker dan seni frame |
| `web`, `speech`, `dictation` | otomatis | | Pencarian web, suara |

Urutan Ctrl+P: `smol`, `default`, `slow`.

### 11.2 Agents

Lima agent aktif di `/agents`: `reviewer`, `scout`, `security-reviewer`, `sonic`, `task`. Agent `designer` dan `librarian` tidak ada di daftar itu, jadi pekerjaan UI dikerjakan `task` dengan skill taste-skill, dan riset pustaka dikerjakan sesi utama.

| Agent | Dipakai untuk | Contoh perintah |
|---|---|---|
| `scout` | Memetakan repo tanpa mengubah | "Use the scout to list every component under src/components/ui that still imports lucide-react. Do not edit." |
| `task` | Mengerjakan potongan milestone yang berkasnya tidak tumpang-tindih | "Use a task worker for features/gesture only. Follow ARCHITECTURE §6 and PRD §7.2." |
| `sonic` | Suntingan mekanis | "Use sonic to replace raw hex colors in src/components with token classes from DESIGN-SYSTEM §13." |
| `reviewer` | Tinjauan tiap milestone sebelum commit | `/review`, pilih "Review uncommitted changes" |
| `security-reviewer` | Tinjauan baca-saja untuk M6 dan M8 | "Use the security-reviewer on src/app/api and lib/supabase. Read-only." |

Subagent tidak mewarisi percakapan utama. Sebutkan dokumen dan bagian yang harus dibaca di setiap penugasan.

### 11.3 Skill wajib

Pasang sekali dari root repo (Windows PowerShell):

```powershell
# 1. find-skills: mencari skill yang sudah ada sebelum mengerjakan sesuatu
npx skills add vercel-labs/skills --skill find-skills -a universal -y

# 2. taste-skill: pagar kualitas UI
npx skills add Leonxlnx/taste-skill
```

Pada perintah kedua, pilih hanya `design-taste-frontend` dan tujuan Universal (`.agents/skills`). Padanan tanpa tanya-jawab: `npx skills add Leonxlnx/taste-skill --skill design-taste-frontend -a universal -y`. Bila muncul galat symlink di Windows, tambahkan `--copy`.

Kedua skill terpasang di `.agents/skills/`, salah satu lokasi skill proyek yang dibaca omp. Setelah memasang, jalankan `/reload-plugins` atau mulai sesi baru, lalu pastikan keduanya aktif di `/extensions` tab Skills.

**Aturan pakai untuk agent:**

1. **Di awal setiap milestone, jalankan `/skill:find-skills`** untuk topik milestone itu. Perintah di baliknya adalah `npx skills find <kata kunci>`. Kata kunci awal: `nextjs`, `shadcn`, `tailwind`, `react performance`, `accessibility`, `playwright`, `supabase`, `mediapipe`, `canvas konva`.
2. Skill yang ditemukan **diusulkan dulu ke pengguna** beserta sumber dan jumlah pemasangnya. Jangan memasang sendiri. Utamakan sumber resmi (`vercel-labs`, `anthropics`, `microsoft`, `supabase`). Skill dari penulis tak dikenal dibaca dulu `SKILL.md`-nya: skill bisa memerintahkan agent menjalankan perintah.
3. **Sebelum menulis atau mengubah UI, muat `/skill:design-taste-frontend`**, nyatakan Design Read dan dial dari DESIGN-SYSTEM §0, dan patuhi batas pemakaiannya di sana.
4. Bila skill bertentangan dengan `DESIGN-SYSTEM.md`, dokumen proyek yang menang.

### 11.4 Urutan kerja satu milestone

Satu milestone, satu sesi, dijalankan dari root repo.

1. `omp`, lalu `/plan` dengan prompt di §11.5. Model berpindah ke role `plan`.
2. Di Plan Review: `a` untuk memberi catatan, **Refine plan** untuk revisi, **Approve and execute** bila rencana sudah berdiri sendiri. Pengerjaan memakai role `default`.
3. Selama berjalan: Enter untuk mengarahkan, Ctrl+Q untuk mengantrekan, Esc untuk menghentikan.
4. Setelah agent melaporkan selesai: jalankan perintah pemeriksaan §10, lalu `/review` atas perubahan yang belum di-commit.
5. Untuk M6 dan M8: minta `security-reviewer`, dan baca sendiri perubahan pada rute API sebelum commit.
6. Keluar (Ctrl+D), lalu `omp commit`.

Mode goal (`/goal`) hanya dipakai untuk milestone yang garis akhirnya bisa diuji otomatis (M2, M4), dengan anggaran token (`/goal budget <N>`). Plan mode dan goal mode tidak bisa aktif bersamaan.

### 11.5 Prompt pembuka

`AGENTS.md` mengimpor PRD, DESIGN-SYSTEM, dan ARCHITECTURE dengan `@`, jadi ketiganya sudah ada di setiap sesi dan tidak perlu disebut di prompt. Yang disebut hanya `MILESTONES.md`, ditambah berkas acuan UI untuk milestone yang membangun halaman (daftarnya di `MILESTONES.md` bagian "Cara memakai"):

```text
/plan Kerjakan milestone M0 dari @MILESTONES.md. Susun rencananya dulu: berkas yang dibuat, perintah yang dijalankan, hasil /skill:find-skills untuk kata kunci milestone ini, dan cara membuktikan tiap butir "Selesai bila". Jangan menulis kode sebelum rencana disetujui.
```

Untuk milestone berikutnya, ganti `M0`. Setelah mengubah `AGENTS.md` atau salah satu dokumen yang diimpornya, mulai sesi baru (`/new`) supaya isinya dimuat ulang, dan periksa di `/extensions` bagian Context Files.

## 12. Milestone

Urutan kerja, pekerjaan, dan syarat selesai tiap milestone ada di `MILESTONES.md` (M0 Fondasi sampai M9 Pengerasan). Berkas itu satu-satunya sumber untuk milestone. Syarat selesai yang berlaku umum ada di `AGENTS.md` bagian "Selesai berarti".

## 13. Yang belum diverifikasi

- Kinerja Gesture Recognizer di HP kelas menengah: ambang dan laju di PRD §7.2 masih nilai awal dan butuh uji pakai di perangkat sungguhan. Langkahnya ada di tabel manual pengguna `docs/DECISIONS.md` (M9).
- Keterbacaan QR 168 px dari cetakan asli: butuh cetak 4R dan kamera HP. Langkah dan tabelnya di `docs/DECISIONS.md` (M9); ini salah satu butir "Selesai bila" M9.
- Sentuhan, kamera sungguhan, dan unduhan di Chrome Android, Safari iOS, Edge, serta Firefox sungguhan. Mesin WebKit dan Gecko sudah tercakup otomatis (`npx playwright test --project=firefox --project=webkit`, hijau di M9); sisanya tabel manual pengguna.
- Pembaca layar (NVDA, VoiceOver, TalkBack): audit axe dan uji keyboard otomatis sudah hijau, verifikasi dengan pembaca layar butuh pengguna.
- LCP Welcome: median 3,17 detik pada preset seluler Lighthouse terhadap batas 2,5 detik (PRD §8). Selisih 670 ms, hasil satu putaran optimasi terbatas, dan rencana lanjutannya di `docs/DECISIONS.md` (M9). Ekspor strip (median 922 ms) dan FCP (917 ms) sudah di dalam target.
- Deploy ke Vercel: langkah PowerShell-nya sudah disiapkan di `docs/DECISIONS.md` (M9) dan belum dijalankan; agent tidak men-deploy.
- Impor `@` di `AGENTS.md` memuat 66.840 karakter (PRD 17.415 + DESIGN-SYSTEM 26.041 + ARCHITECTURE 23.384) ke setiap sesi dan subagent; `MILESTONES.md` (20.635 karakter) tidak diimpor. Angka ini diukur ulang di M9; catatan lama "sekitar 71 ribu karakter" adalah perkiraan.

Yang sudah selesai dan tidak perlu diperiksa lagi: perintah di §3 dan §11.3 sudah dijalankan sejak M0, pemilihan registry neobrutalism diputuskan di M0 (`docs/DECISIONS.md`), ID model di `.omp/config.yml` sudah dicocokkan dengan `omp config get modelRoles` pada 9 Oktober 2026 (§11.1), dan dukungan `MediaRecorder` antar-browser sudah dipetakan di M7 (`pickLiveKind`) dengan proyek WebKit dan Firefox ikut hijau di M9. CLI `skills` tetap tidak mencantumkan omp sebagai agent tujuan; tujuan `universal` dipakai dan foldernya berisi `accessibility`, `design-taste-frontend`, `find-skills`, dan `web-perf`.
