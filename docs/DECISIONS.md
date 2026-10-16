# Keputusan teknis snapme

Dicatat saat pengerjaan milestone. Satu entri: tanggal, keputusan, alasan, bukti.

## M0 Fondasi (8 Oktober 2026)

### Registry neobrutalism: dipakai sebagai titik awal `button`, `badge`, `card`

Keputusan ARCHITECTURE §3. Bukti pemeriksaan:

- Repo `neobrutalism/neobrutalism` (situs `retroui.dev`, sekarang mengarah ke `neobrutalism.com`): push terakhir `2026-08-03T09:28:45Z`, 1.616 bintang, 60 fork, lisensi MIT, tidak diarsipkan. Lolos syarat aktivitas ARCHITECTURE §2 (rilis/commit dalam 12 bulan terakhir). Sumber: <https://api.github.com/repos/neobrutalism/neobrutalism>.
- Perintah registry yang dipakai: `npx shadcn@latest add https://neobrutalism.com/r/radix/button.json https://neobrutalism.com/r/radix/card.json https://neobrutalism.com/r/radix/badge.json -y -o`. Varian `radix` dipilih karena shadcn/ui di proyek ini memakai primitif Radix.
- Kriteria kelayakan (ARCHITECTURE §3 langkah M0):
  1. **Terpasang bersih pada Tailwind v4 + React 19**: ya. CLI hanya menulis tiga berkas, tanpa dependensi baru (`radix-ui` dan `class-variance-authority` sudah ada dari `shadcn init`).
  2. **Varian CVA bisa dipetakan ke token snapme tanpa menulis ulang struktur**: ya. Struktur `cva` + `Slot` sama dengan shadcn/ui; yang diganti hanya kelas.
  3. **Tanpa dependensi runtime tambahan**: ya.
- Yang diganti ke token snapme (DESIGN-SYSTEM §9): `border-black` menjadi `border-ink`, `shadow-md`/`shadow-lg` (bayangan lunak bawaan Tailwind) menjadi `shadow-hard`/`shadow-hard-hover`, `rounded`/`rounded-xl` menjadi `rounded-pill`/`rounded-card`, `font-head` menjadi `font-display`/`font-sans`, ukuran menjadi 44 px (`sm`) dan 56 px (`lg`), plus cincin fokus `outline-violet` 3 px jarak 3 px.
- Ketiga berkas itu sekarang bergaya snapme, jadi tidak ada kode registry yang tersisa apa adanya. Registry dicatat di sini supaya perbandingan berikutnya tahu asalnya.

### Penyimpangan dari dokumen

| Hal | Dokumen | Kenyataan | Tindakan |
|---|---|---|---|
| Struktur `globals.css` | DESIGN-SYSTEM §13 menampilkan blok `@theme` dan `:root` | Keluaran `shadcn init` (preset `nova`, primitif `radix`) kini juga menambah `@import "tw-animate-css"`, `@import "shadcn/tailwind.css"`, `@custom-variant dark`, `@theme inline`, dan skala radius turunan | Struktur keluaran dipertahankan sesuai perintah §13 ("pertahankan strukturnya, ganti nilainya"), nilainya diambil dari §13 |
| `--color-muted` ganda | §2 memakai `muted` sebagai warna teks, `:root` §13 memetakan `--muted` ke `cream` | shadcn memetakan `bg-muted` ke permukaan netral. Dua arti untuk satu nama | `--color-muted` tetap #5E5E57 (teks sekunder). Permukaan netral memakai `bg-cream`. Pemetaan `--color-muted` dari shadcn dihapus dari `@theme inline` |
| Bayangan hover 5 px | §7 mewajibkan bayangan 5 px saat hover, tapi §4 tidak punya tokennya | Tanpa token, nilainya harus ditulis di komponen, melanggar §14 | Ditambah token `--shadow-hard-hover: 5px 5px 0 var(--color-ink)` di `globals.css` |
| Radius tooltip | §9 menyebut radius 8 px | §4 hanya punya `radius-thumb` 10 px sebagai nilai terdekat | Tooltip memakai `rounded-thumb` (10 px). Perlu satu kalimat di §9 atau token baru |
| Blok `.dark` bawaan shadcn | §0 dan §12: tema terang saja di v1 | `shadcn init` menulis blok `.dark` dengan nilai oklch tersendiri serta pemetaan `--color-sidebar-*` dan `--color-chart-*` | Blok `.dark` dan token `sidebar`/`chart` dihapus (tidak ada komponen yang memakainya). `@custom-variant dark` dipertahankan supaya utilitas `dark:` tidak pernah aktif tanpa kelas `.dark` |
| Ikon di `components.json` | §8: ikon selalu Phosphor | shadcn menulis `"iconLibrary": "lucide"` dan memasang `lucide-react` | Diubah ke `"phosphor"` supaya komponen yang ditambah kemudian memakai `@phosphor-icons/react`; `lucide-react` dilepas dari dependensi |
| `next-themes` | Tidak ada di ARCHITECTURE §3 | `shadcn init` memasangnya untuk `sonner` | Pemakaian `useTheme` di `sonner.tsx` dihapus (tema terang saja), paket dilepas |
| Halaman `/` | MILESTONES M1 membangun Welcome | Bawaan `create-next-app` menampilkan halaman contoh Next.js | Diganti placeholder kecil (judul snapme + penunjuk ke `/dev/ui`); aset contoh `public/*.svg` dihapus |
| Penanda baca `tests/` | ARCHITECTURE §4 menaruh uji di `tests/` dan `e2e/` | Uji menjalankan matcher bawaan Vitest, bukan `@testing-library/jest-dom` | Tidak menambah dependensi; asersi memakai `expect` bawaan |
| Nama berkas konfigurasi Vitest | Rencana menyebut `vitest.config.ts` | Vite memuat berkas `.ts` sebagai CommonJS karena `package.json` tanpa `"type": "module"`, dan memperingatkannya | Berkas dinamai `vitest.config.mts`; `tsconfig.json` sudah memuat `**/*.mts` |

### Penyesuaian pada kode registry shadcn/ui

Semua perubahan berikut hanya menyentuh kelas Tailwind dan susunan internal komponen; struktur, nama ekspor, `data-slot`, dan perilaku Radix tidak diubah.

| Hal | Kenyataan di kode registry | Tindakan |
|---|---|---|
| `react-hooks/set-state-in-effect` pada `carousel.tsx` | Registry memanggil `onSelect(api)` di dalam `useEffect`, dan ESLint Next 16 menandainya sebagai galat | Nilai `canScrollPrev`/`canScrollNext` dibaca saat render dari embla; langganan `select`/`reInit` hanya memicu render ulang. Perilaku sama, aturan tidak dimatikan |
| Prop cadangan | `Switch` punya prop `size`, `ToggleGroup` punya `variant` dan `spacing`, `Tabs` punya `variant="line"` dan ekspor `tabsListVariants` | Dihapus karena DESIGN-SYSTEM §9 hanya menspesifikasikan satu gaya dan tidak ada pemakainya |
| Thumb sakelar | §9 menetapkan track 56 x 32 px tanpa ukuran thumb | Berkas acuan `customize.html` memakai thumb 28 px yang mengisi tinggi track; komponen disamakan ke ukuran itu, dengan jarak jalan 24 px |
| Tombol tutup lembar bawah | Registry tidak menyediakan tombol tutup | Ditambah `Button` ghost 44 px dengan ikon `X`, konsisten dengan `dialog.tsx` |
| Panah tooltip | Registry memakai `rounded-[2px]` (radius mentah di luar token) | Kelas radius dihapus; panah memakai `bg-ink` sehingga menyatu dengan garis tepi |
| Durasi dialog | Registry memakai `duration-100` | Diganti `duration-[120ms]` mengikuti DESIGN-SYSTEM §7 |
| Impor `cn` | Berkas registry sebagian mengimpor dari paket `cn`, sebagian dari `@/lib/utils` | Dibiarkan seperti aslinya; `src/lib/utils.ts` hanya me-re-export dari paket `cn`, jadi keduanya sama |
| Overlay dialog dan lembar bawah | §9 tidak menetapkan warna overlay | Dipakai `bg-ink/60`, warna token yang sudah ada, tanpa efek kaca atau blur |

## M1 Welcome dan kerangka booth (9 Oktober 2026)

### Audit aksesibilitas M1

**Otomatis.** `e2e/a11y.spec.ts` menjalankan axe-core 4.14 lewat `@axe-core/playwright` pada empat halaman M1 (`/`, `/privasi`, `/booth/layout`, `/booth/capture`) di dua lebar (360 dan 1280 px), dengan tag `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`. Hasil: nol pelanggaran pada delapan pemindaian. Uji ini permanen, jadi regresi aksesibilitas M1 akan ketahuan.

**Manual** (skrip sekali pakai di luar repo, karena alat otomatis hanya menangkap sebagian hambatan):

| Pemeriksaan | Hasil |
|---|---|
| Urutan fokus | Logis dan mengikuti urutan visual di keempat halaman. `/booth/capture` hanya punya dua sasaran (wordmark dan Kembali) karena isinya masih kerangka |
| Penanda fokus terlihat | Ada di setiap elemen yang bisa difokus (cincin `violet` 3 px atau garis tepi `ink`) |
| Ukuran sasaran (2.5.8 AA) | Sasaran terkecil 40 x 40 px (kotak wordmark), batas 24 x 24 px. Tombol 44 sampai 56 px |
| Landmark | `header`, `nav`, `main`, dan `footer` di `/` dan `/privasi`; `header` dan `main` di halaman booth |
| Hierarki judul | `h1` lalu `h2` lalu `h3`, tanpa lompatan, di keempat halaman |
| Bahasa halaman | `lang="id"` di akar dokumen |

Perbaikan yang lahir dari audit: `/` sebelumnya tidak punya landmark `main`; konten hero sampai panel langkah sekarang dibungkus `main`, dan kaki privasi tetap di luarnya. Pemeriksaan pembaca layar nyata (NVDA atau VoiceOver) dan zoom 200 persen tetap dijadwalkan di M9.

### Penyimpangan dan keputusan M1

|Hal | Dokumen | Kenyataan | Tindakan |
|---|---|---|---|
| CTA di baris atas | §10.1 dan `welcome.html` memakai tombol `primary sm` | §1 melarang dua tombol jingga per layar dan §14 menuntut tepat satu aksi `primary` | Welcome dan booth: CTA header varian `secondary`. `/privasi` tidak punya aksi lain: CTA header varian `primary`. `SiteHeader` menerima prop `ctaVariant` |
| `display-lg` | §3: pink + bayangan keras, tanpa garis tepi huruf. Berkas acuan `capture.html` menambah `-webkit-text-stroke: 1px` | Dokumen menang | Tanpa garis tepi huruf. Dengan begitu 22 px pada layar sempit tetap lolos sebagai teks besar (3,36 : 1, batas 3 : 1) |
| Judul ubin Gesture Snap | `welcome.html` memakai 28 px | §3 membatasi `title` pada 16 sampai 22 px | Semua judul kartu memakai `title` 22 px. Perbedaan tampak saat dibandingkan berdampingan, disengaja |
| Judul panel "Dari kamera sampai cetak" | `welcome.html` memakai `clamp(18px, 2vw, 24px)` | §3 tidak punya gaya di rentang itu | Memakai `title` 22 px |
| Kotak wordmark | `welcome.html` memakai radius 12 px | §4 hanya punya `radius-thumb` 10 px | Memakai `rounded-thumb`. Perlu satu kalimat di §4 atau token baru bila 12 px memang disengaja |
| Slot kosong pada diagram hero | §4 menetapkan `border-empty` 2 px putus-putus `muted` | `muted` di atas `violet-soft` hanya 2,89 : 1, di bawah batas 3 : 1 untuk komponen nonteks | Diagram hero memakai garis putus-putus `ink` (8,3 : 1). Slot kosong di atas `cream` atau `paper` tetap memakai `muted` |
| Pilihan layout | §9 hanya menspesifikasikan "Swatch terpilih" | Radio asli perlu bisa diklik di seluruh kartu | Radio ditumpuk selebar kartu dengan `opacity-0`, kartu jadi sasaran klik, nama aksesibel dari `aria-labelledby` dan `aria-describedby`. Dibuktikan uji Playwright |
| Tombol "Pakai Foto Galeri" | §10.1 menampilkannya di hero | FR-13 masuk P1 dan MILESTONES M1 menundanya | Belum ditampilkan. Perbedaan tunggal pada pembandingan teks dengan `welcome.html` |
| Utilitas baru di `globals.css` | §3, §5, §6, §9 | Gaya ini dipakai lebih dari satu halaman | Ditambah `page-container`, `checker-ribbon`, `display-xl`, `display-lg`, `heading`, `title`, `ring-selected` supaya tidak ada nilai mentah di komponen |
| Cakupan `/booth/capture` | §10.2 menggambarkan kamera, baki foto, HUD gesture | M2 sampai M4 yang mengerjakannya | M1 hanya kerangka: area kamera kosong, slot kosong, aksi utama nonaktif. `CameraStage`, `ShotTray`, `ShutterButton`, `CountdownOverlay` belum dibuat |
| Cakupan `stores/booth.ts` | §5 mencantumkan `shots`, `editor`, `live`, `share`, `relay` | Milestone M1 belum memakainya | Hanya `layoutId` dan `settings` yang dibuat, sisanya menyusul bersama milestone pemiliknya supaya tidak ada tipe spekulatif |
| Halaman `/booth/layout` | §5 menamai rute ini | Nama folder segmen sama dengan berkas konvensi `layout.tsx` | Next 16 menerimanya: `src/app/booth/layout.tsx` dan `src/app/booth/layout/page.tsx` berdampingan. Dibuktikan build dan uji Playwright |

## M2 Kamera (10 Oktober 2026)

### Mesin keadaan pemotretan: `src/features/capture/machine.ts`

- Fase: `idle`, `requesting`, `denied`, `ready`, `holding`, `countdown`, `capturing`, `pause`, `complete` (ARCHITECTURE §5). Peristiwa: `PERMISSION_REQUEST`, `PERMISSION_GRANTED`, `PERMISSION_DENIED{reason}`, `SHOOT{target?}`, `HOLD_START`, `HOLD_CANCEL`, `TICK`, `SHOT_SAVED`, `FLASH_DONE`, `PAUSE_DONE{allFilled}`.
- `reduce` adalah fungsi murni: peristiwa yang datang di fase yang salah mengembalikan objek state yang sama, jadi tidak ada render ulang yang sia-sia. Diuji 8 uji di `tests/capture-machine.test.ts`, termasuk tabel "peristiwa diabaikan" untuk tujuh fase.
- Timer ada di `useCaptureMachine.ts`, bukan di reducer: 1000 ms per angka hitung mundur (`COUNTDOWN_STEP_MS`), jeda 300 ms setelah jepret (`PAUSE_MS`), kilat 160 ms (`FLASH_MS`). `PAUSE_DONE` membaca ulang store saat timer berbunyi, jadi keputusan "lengkap atau kembali siap" selalu memakai jumlah foto terbaru.
- **Flag kilat ikut state mesin**, bukan state halaman: React 19 lewat ESLint Next 16 melarang `setState` langsung di dalam efek (`react-hooks/set-state-in-effect`), dan kilat harus tetap menyala saat fase sudah berpindah ke `pause`. Timer kilat karena itu bergantung pada `flash`, bukan pada `phase`, supaya tidak dibersihkan saat fase berganti.
- Yang sudah disiapkan untuk M3: `HOLD_START`/`HOLD_CANCEL` sudah bertransisi `ready` ke `holding` dan kembali, `CameraStage` sudah punya slot `hud`, dan `isBusy`/`canShoot` adalah tabel per fase yang bisa dipakai HUD tanpa menebak.

### Kamera: `src/features/camera/`

- `useCamera.ts` adalah satu-satunya tempat `react-webcam` dipakai. `<Webcam>` baru dipasang setelah `requested` bernilai true, dan `useCamera.requestPermission()` menolak lebih dulu bila `navigator.mediaDevices.getUserMedia` tidak ada (`unavailable`), jadi konteks tidak aman tidak membuat halaman gagal render.
- Pemetaan galat: `NotAllowedError` dan `SecurityError` menjadi `denied`; sisanya (`NotFoundError`, `NotReadableError`, `OverconstrainedError`, dan string "getUserMedia not supported" dari react-webcam) menjadi `unavailable`. Dua pesan berbeda ditampilkan, keduanya menyebut langkah berikutnya (DESIGN-SYSTEM §12).
- `captureFrame.ts` memotong bingkai tengah ke rasio slot lalu mencerminkannya (`translate` + `scale(-1, 1)`) supaya hasilnya sama dengan pratinjau yang dicerminkan (FR-05). Hasil disimpan sebagai dataURL JPEG mutu 0,92; resolusi hasil sama dengan resolusi sumber yang dipotong (1280 x 720 menjadi 1022 x 720 pada Strip 4), penurunan skala baru terjadi di kanvas hias M4.
- **`ref` ke `<Webcam>` wajib.** `react-webcam` menaruh `HTMLVideoElement` di properti instans (`webcamRef.current.video`); tanpa `ref` di pemakaian komponen, `webcamRef.current` selalu null dan tidak ada foto yang tersimpan. Ketahuan dari uji Playwright pertama yang gagal.
- **Video yang dicerminkan punya stacking context sendiri.** Karena `mirrored` memasang `transform: scaleX(-1)`, elemen video dicat setelah elemen berposisi absolut yang datang lebih dulu di DOM, sehingga braket bidik tertutup. Braket diberi `z-10`.
- Perangkat: `enumerateDevices()` dipanggil ulang di `onUserMedia` (label baru terbaca setelah izin), disaring ke `videoinput`, dan pilihannya disimpan di `settings.cameraDeviceId` (hanya di memori, tanpa penyimpanan lintas muat ulang). Mengganti perangkat mengubah `videoConstraints`, dan `react-webcam` meminta ulang stream saat `videoConstraints` berubah; `shots` tidak tersentuh.

### Kamera palsu di uji Playwright

`playwright.config.ts` menambah `launchOptions.args` `--use-fake-ui-for-media-stream` dan `--use-fake-device-for-media-stream` pada proyek chromium (ARCHITECTURE §10). Berlaku untuk seluruh berkas uji; uji M1 tidak terpengaruh karena tidak membuka kamera.

Catatan dari penulisan uji:

|Hal|Kenyataan|Tindakan|
|---|---|---|
|Menunggu izin benar-benar selesai|Elemen `<video>` sudah ada beberapa ratus milidetik sebelum stream mengalir, jadi menunggu elemennya terlihat adalah balapan|Helper `izinkanKamera` menunggu `video.videoWidth > 0`|
|Stream sintetis untuk uji cermin|`react-webcam` memanggil `getUserMedia` lebih dari sekali (mount ganda di mode pengembangan) dan menghentikan stream yang dianggap basi, sehingga stream bersama mati sebelum dipakai|Skrip uji membuat stream baru tiap panggilan, dan kanvas sumbernya terus digambar ulang supaya bingkai mengalir|
|Klik "Izinkan Kamera" gagal|Baris tombol jepret (absolut, selebar panggung) menutupi tombol izin pada panggung yang pendek|Kontrol jepret hanya dirender saat kamera sudah diminta dan izin bukan `denied`, dan pembungkusnya `pointer-events-none`|

### Penyimpanan foto di M2

`stores/booth.ts` menyimpan `shots: (Shot | null)[]` dengan `Shot = { still: string; capturedAt: number }`, `still` berupa dataURL JPEG di memori. `setLayout` mengganti seluruh array sehingga invarian `shots.length === shotCount` selalu berlaku, dan mengganti layout mengosongkan foto. Penyimpanan lintas muat ulang (FR-14, IndexedDB) tetap milik M5.

`useRequireShots()` menutup prasyarat langkah setelah foto: `/booth/customize` dialihkan ke `/booth/capture` selama masih ada slot kosong. Halaman Hias sendiri masih placeholder karena M4 yang membangunnya.

### Penyimpangan M2

|Hal|Dokumen atau acuan|Kenyataan|Tindakan|
|---|---|---|---|
|Tombol jepret dan chip "Spasi" saat belum ada kamera|`capture.html` selalu menampilkan keduanya|Keduanya menutupi tombol "Izinkan Kamera" pada panggung yang pendek, dan tidak ada gunanya sebelum kamera hidup|Baris kontrol hanya dirender setelah kamera diminta dan izin bukan `denied`|
|Sudut braket bidik|`capture.html` memakai radius 6 px|§4 tidak punya token 6 px dan §6 hanya menyebut "empat sudut garis 4 px lime"|Sudut tegak tanpa radius. Dokumen menang|
|Radius chip pintasan "Spasi"|`capture.html` memakai 8 px|§4 hanya punya `radius-thumb` 10 px; `rounded-sm` memetakan ke 8,4 px|Memakai `rounded-sm` (8,4 px), token terdekat|
|Judul kartu "Senyum, kamera siap!"|Acuan memakai Unbounded 800 16 px|§3 mengizinkan `title` 16 sampai 22 px, tetapi utilitas `title` dipatok 22 px|Kartu ini memakai `font-display text-base font-extrabold` (16 px) supaya sama dengan acuan|
|Slot terisi di baki foto|Acuan memakai blok warna berlabel "Foto 1", "Foto 2"|Produk menampilkan foto hasil kamera (FR-05)|Foto asli dengan lencana centang; teks demo tidak dipakai|
|Legenda gesture, sakelar Gesture Snap, GestureHUD, RelayInviteCard, kata "gesture" di baris privasi|§10.2 menggambarkannya lengkap|Milik M3 dan M8|Tidak dirender di M2; baris privasi berbunyi "Kamera berjalan di perangkat ini." Kartu tip lime tetap ada dengan tiga baris yang benar untuk M2|
|Tombol pemilih kamera di kepala panel|Tidak ada di acuan|FR-08 (P1) menambahkannya|Tombol `neutral sm` berlabel perangkat + daftar tombol perangkat (pola disclosure, bukan komponen baru). Hanya dirender bila perangkat lebih dari satu|
|Aksi utama jingga ganda saat semua slot terisi|§2: satu aksi utama jingga per layar|Tombol jepret dan "Lanjut Hias" sama-sama jingga, persis seperti acuan|Diikuti acuan; keduanya memang disebut di §2 dan §9|
| Jeda antar angka hitung mundur | §7 menetapkan animasi angka 500 ms, tidak menetapkan jeda antar angka. `capture.html` memakai 800 ms| FR-06 menyebut hitung mundur 3 detik| 1000 ms per angka (3, 2, 1) supaya totalnya pas 3 detik seperti FR-06; animasi masuknya tetap 500 ms dengan lewatan 1,08 seperti §7. 800 ms di acuan hanya pacing demo|

## M3 Gesture Snap (9 Oktober 2026)

### Aset wasm dan model

- `public/mediapipe/wasm/` berisi enam berkas salinan `node_modules/@mediapipe/tasks-vision/wasm/` (`vision_wasm_internal.{js,wasm}`, `vision_wasm_module_internal.{js,wasm}`, `vision_wasm_nosimd_internal.{js,wasm}`). Disalin apa adanya, tidak ada CDN (ARCHITECTURE §4, §8). Berkas-berkas ini dikecualikan dari ESLint lewat `globalIgnores` karena ditulis Emscripten dan gagal aturan proyek (`require()`, alias `this`).
- `public/models/gesture_recognizer.task` (8.373.332 bita) diunduh dari URL resmi dokumentasi GestureRecognizer Web: `https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/gesture_recognizer.task`.
- `FilesetResolver.forVisionTasks("/mediapipe/wasm")` dan `modelAssetPath: "/models/gesture_recognizer.task"`: tidak ada permintaan ke luar origin saat deteksi berjalan. Dibuktikan uji Playwright GS-01.

### Ambang awal dan satu penyimpangan rumus laju

`src/features/gesture/thresholds.ts` memuat nilai awal PRD §7.2: skor 0,6, tahan 800 ms, jeda 1.500 ms setelah foto, interval deteksi 80 ms (sekitar 12,5 kali per detik), bingkai diperkecil 320 px.

**Penyimpangan dari rencana M3.** Rencana menjadwalkan tik berikutnya `max(0, 80 - elapsed)`. Diukur di Chromium headless tanpa GPU: satu inferensi memakan ratusan milidetik, sehingga jadwal itu berubah menjadi loop tanpa jeda yang memenuhi main thread. Akibatnya klik "Ambil foto" tertunda rata-rata 1,2 detik dan timer hitung mundur meleset. Perbaikannya: jeda minimal sama dengan durasi inferensi itu sendiri (`max(80 - elapsed, elapsed)`), jadi perangkat lambat turun ke siklus 50 persen dan timer UI tetap jalan. Perangkat yang sanggup inferensi di bawah 80 ms tetap 12,5 kali per detik.

### Penyimpangan M3

|Hal|Dokumen atau acuan|Kenyataan|Tindakan|
|---|---|---|---|
|Keadaan HUD "siap"|`capture.html` merendernya sebagai tombol demo `onClick=`|Klik tidak punya makna di produk, dan §11 meminta HUD memakai `role="status"`|Dirender sebagai `role="status"` noninteraktif|
|Durasi indikator tahan|Animasi `hold` di `capture.html` 900 ms|PRD GS-02 menetapkan 0,8 detik|800 ms (`HOLD_DURATION_MS`); batang mengikuti progres sampel, bukan animasi tetap|
|Keadaan "Menyiapkan gesture..."|§9 menyebut empat keadaan HUD|GS-07 meminta status memuat|Ditambah keadaan kelima `loading` di luar empat keadaan acuan|
|Delegate model|Rencana: GPU dengan fallback CPU|Di headless tanpa WebGL, `createFromOptions` gagal dan fallback CPU dipakai otomatis|GPU dulu, satu percobaan ulang dengan CPU; kegagalan keduanya memicu jalur GS-07 (sakelar disembunyikan, satu toast)|
|`numHands`|GS-10 (P1) meminta dua tangan|Konfigurasi model tidak bisa diubah tanpa memuat ulang model|`numHands: 2` dipasang sejak P0 supaya GS-10 tidak mengubah konfigurasi|
|Legenda gesture di kartu lime|Acuan memakai tiga baris (dua jari, telapak, jempol)|GS-08 dan GS-09 adalah P1|P0 sempat memakai dua baris; setelah P1 dikerjakan, legenda kembali ke tiga baris acuan persis (`HandPeace`, `HandPalm`, `ThumbsUp`)|
|Penanganan gesture P1|GS-08 (telapak mengulang foto terakhir), GS-09 (jempol lanjut ke hias), GS-10 (dua tangan)|Dikerjakan setelah P0 tuntas|`useGestureSnap` menangani aksi `retake` pada fase `ready` dan `complete` (dispatch `SHOOT` dengan target) dan `proceed` pada fase `complete` (`onProceed`). Loop juga berjalan di fase `complete` saat ada foto yang bisa diulang; kedua aksi tidak menyentuh fase `holding` mesin. GS-10 hanya konfigurasi `numHands: 2`|
|Uji kamera di Playwright|Rencana: seluruh uji memakai bawaan sakelar menyala|Chromium headless tanpa GPU butuh ratusan milidetik per inferensi, sehingga hitung mundur pada uji alur kamera bisa meleset|`e2e/capture.spec.ts` mematikan sakelar lewat localStorage (berkas ini menguji kamera, bukan gesture); `e2e/gesture.spec.ts` menguji sakelar menyala dan menunggu model siap sebelum memotret|
|Batas `expect` Playwright|Bawaan 5 detik|Inisialisasi model dan inferensi pertama di headless memblokir main thread beberapa detik|`expect.timeout` 15 detik di `playwright.config.ts`, dengan komentar alasan|
|Wrapper `foto`/`sampel` uji|Uji M2 memakai `getByRole("status")` untuk hitung mundur|HUD gesture juga `role="status"` sehingga selektornya ambigu|`CountdownOverlay` diberi `data-testid="countdown"`; helper uji memakai selektor itu|
|Pil HUD di 360 px|`capture.html` satu baris (252 x 44 px)|Dengan fon yang sama (Space Grotesk 700 15 px) produk butuh sekitar 264 px, jadi teks membungkus dua baris dan pil menjadi 49 px|Dibiarkan membungkus: min-height 44 px tetap terpenuhi dan pil tetap di tengah. Perbedaan lebar berasal dari rupa fon acuan di lingkungan uji, bukan dari token|

### Perbandingan berdampingan dengan `capture.html`

Dijalankan dengan Playwright pada 1280 dan 360 px, memakai `getComputedStyle` dan `getBoundingClientRect`; tangkapan layarnya sementara dan tidak disimpan di repo.

|Bagian|Acuan|Produk|
|---|---|---|
|Pil siap 1280 px|297 x 44, `paper`, garis 2 `ink`, radius 999, 15 px/700, padding 0 16, gap 10|297 x 44, nilai sama persis|
|Pil siap 360 px|252 x 44, satu baris|244 x 49, dua baris (lihat penyimpangan di atas)|
|Pil selesai|187 px, `lime`, radius 999, 15 px/700, gap 8|187 px, `lime`, radius 999, 15 px/700, gap 8|
|Pil menahan|`lime`, radius 16, padding 10 16, gap 6, batang 8 px `violet` di rel `paper`|Nilai sama dari `GestureHUD`; keadaan menahan hanya bisa dipicu tangan sungguhan, jadi dibuktikan uji komponen `tests/gesture-hud.test.tsx` (lebar batang mengikuti progres)|
|Sakelar Gesture Snap|`paper`, garis 2 `ink`, radius 999, min-height 44, padding 0 8 0 16, 15 px/700, chip `lime` "Nyala" / `cream` "Mati"|Sama persis sampai ukuran chip; `aria-pressed` mengikuti keadaan|
|Legenda|"Dua jari: mulai hitung mundur", "Telapak: ulang foto terakhir", "Jempol: lanjut ke hias"|Sama persis|
|Baris privasi|"Kamera dan deteksi gesture berjalan di perangkat ini. Tidak ada yang diunggah."|Sama persis|

### Sumber satu-satunya modul MediaPipe

`src/features/gesture/gestureSource.ts` adalah satu-satunya pengimpor `@mediapipe/tasks-vision`, dan impornya dinamis (`await import(...)`) sesuai ARCHITECTURE §9, jadi bundel Welcome dan langkah lain tidak ikut berat. Impor statis sengaja dihindari; alasannya ditulis di komentar berkas itu.

Perkakas: `createGestureSource` mengembalikan `start` (mulai loop), `stop` (jeda loop, model tetap hidup), dan `close` (tutup model). Pemisahan ini penting: menghentikan loop selama hitung mundur tidak boleh membuang model, kalau tidak setiap foto menunggu muat ulang model.

### Uji manual (diisi pengguna)

Deteksi gesture tidak bisa diverifikasi dengan kamera palsu: kamera palsu tidak punya tangan. Isi tabel ini setelah mencoba di perangkat nyata: buka `/booth/capture`, nyalakan Gesture Snap, lakukan 10 kali tanda dua jari di bawah cahaya yang biasa dipakai, dan catat berapa yang memicu hitung mundur.

|Perangkat|Browser|Cahaya|Berhasil dari 10|Catatan|
|---|---|---|---|---|
|HP (pengguna)|tidak dirinci|tidak dirinci|tidak dihitung; pengguna melaporkan "bisa"|Laporan pengguna 16 Oktober 2026|
|Laptop|-|-|belum diuji|Tidak dilaporkan pengguna|

Ambang akhir yang dipakai: skor 0,6, tahan 800 ms, jeda 1.500 ms, interval 80 ms. Bila hasil uji manual menunjukkan lemah, ubah hanya `src/features/gesture/thresholds.ts` (satu berkas konstanta, ARCHITECTURE §6) dan ulangi tabel di atas.

Laporan pengguna 16 Oktober 2026 hanya menyebut "sudah saya coba di HP dan hasilnya bisa", tanpa jumlah keberhasilan dari 10 percobaan dan tanpa uji laptop. Ambang karena itu **tidak diubah**: tidak ada keluhan deteksi yang perlu dijawab angka baru, dan menurunkan ambang tanpa data akan menaikkan risiko pemicu tak sengaja. M3 dicentang atas konfirmasi pengguna itu, dengan dua kekurangan yang dicatat apa adanya: jumlah "berhasil dari 10" dan uji laptop tidak tersedia.


## M4 Hias strip (9 Oktober 2026)

### 12 stiker: SVG ditulis tangan

Keputusan pengguna untuk M4. DESIGN-SYSTEM §8 mengizinkan stiker berupa gambar buatan yang ditinjau manusia; menulis SVG langsung menghindari langkah tinjauan gambar dan menjaga berkas tetap kecil (247 sampai 1.213 bita per berkas).

Spesifikasi seragam: `viewBox="0 0 256 256"`, isian warna datar dari palet §2, `stroke="#141414" stroke-width="14" stroke-linejoin="round"`, tanpa gradasi, tanpa teks, tanpa `defs`/`style`/`filters`, dan gambar dijaga di dalam batas 10 px supaya garis tepi 14 px tidak terpotong bingkai. Nilai heks di `public/stickers/` boleh ada karena kriteria M0 memindai `src/` saja.

Satu berkas diperbaiki setelah render pertama: `cloud.svg` semula tersusun dari tiga lingkaran bergaris; garis lingkaran yang tertimpa lingkaran berikutnya tetap terlihat sebagai busur hitam di dalam badan awan. Sekarang satu `<path>` tertutup yang menelusuri gabungan siluet (tiga busur atas plus alas membulat), jadi tidak ada garis dalam.

### Frame sebagai data, bukan berkas di `public/frames/`

ARCHITECTURE §4 mencantumkan `public/frames/`, tetapi frame di M4 adalah kombinasi warna geometris (latar, garis slot, warna wordmark) yang digambar Konva dari data. Aset raster akan menambah bobot dan kabur saat diskalakan ke 600 x 1800. `public/frames/` karena itu tidak dibuat, dan **frame ditunda sebagai keputusan yang perlu dikonfirmasi**: bila nanti frame bergambar memang diinginkan, ia masuk sebagai aset tambahan di samping enam frame warna ini.

Enam pasangan warna yang dipakai semuanya ada di tabel kontras §2: `klasik` (paper/ink), `malam` (ink/paper/lime), `limau` (lime/ink), `gulali` (pink/ink), `ungu` (violet/paper), `permen` (violet-soft/ink).

### Warna kanvas: token dibaca saat dipakai

Konva butuh nilai warna konkret, sedangkan DESIGN-SYSTEM §14 melarang nilai mentah di komponen. `src/features/editor/tokenColor.ts` membaca variabel token dari elemen akar (`getComputedStyle(document.documentElement).getPropertyValue("--color-paper")`), dan `canvasFonts.ts` membaca nama keluarga fon hasil `next/font` dari elemen probe berkelas `font-display`/`font-sans`/`font-mono`. Jadi token tetap satu sumber kebenaran, dan kanvas tidak menyimpan salinan heks.

Dibuktikan uji Playwright: piksel latar strip di kanvas sama dengan `paper` pada frame bawaan dan berubah jadi `ink` setelah memilih frame "Malam". Bila token tidak terbaca, nilainya kosong dan strip akan tembus pandang, sehingga pemeriksaan piksel ini menangkap kesalahan itu.

### Cache filter Konva: `pixelRatio` 1, bukan 600 / lebar panggung

Rencana M4 menetapkan `cachePixelRatio = 600 / lebar tampilan panggung`. Setelah membaca `Node.cache()` di konva 10, ternyata rect cache dihitung dengan `getClientRect({ skipTransform: true, relativeTo: parent })`, yaitu di ruang induk node dan tidak terpengaruh skala panggung. Artinya `pixelRatio: 1` sudah menghasilkan kanvas cache sebesar ukuran strip (mis. 528 x 372) dan tetap tajam saat ekspor, sedangkan nilai dari rencana akan membengkakkan memori tanpa menambah ketajaman. Dipakai `pixelRatio: 1` di `src/features/editor/filters.ts`.

Pemetaan efek ke filter bawaan Konva: `pop` = HSV (saturation 1,6) + Contrast (1,15), `piksel` = Pixelate (pixelSize 12), `lembut` = Blur (1,2) + Brighten (0,08), sisanya Grayscale, Sepia, dan Invert tanpa parameter. Diuji di browser dengan membandingkan sidik jari piksel kanvas sebelum dan sesudah efek dipasang; Retro mengubahnya besar, Piksel mengubahnya kecil tetapi konsisten (foto uji berupa gradien halus, jadi blok 12 px hampir sama dengan aslinya).

### Ekspor PNG (FR-11)

`exportStrip` bekerja dengan mengubah ukuran panggung di tempat menjadi 600 x 1800 lalu memulihkannya. `Stage.toDataURL` merender ulang layer ke kanvas baru, jadi kanvas yang terlihat tidak tersentuh, dan ukuran/skala dipulihkan secara imperatif karena prop React-nya tidak berubah sehingga react-konva tidak akan memasangnya lagi. Transformer di dalam panggung disembunyikan selama ekspor lewat nama `editor-overlay`.

Jalur kedua untuk batas 2 MB: bila PNG masih melebihi 2.097.152 bita, tiap foto slot digambar ulang lewat JPEG mutu 0,8 (menghaluskan derau yang tidak bisa dipadatkan PNG), lalu ekspor diulang sekali. Pada uji dengan foto gradien hasilnya 51 sampai 62 KB, jadi jalur ini belum pernah terpicu; ia tetap ada sebagai pagar untuk foto kamera sungguhan dan diuji manual pada M9.

Nama berkas `snapme-YYYYMMDD-HHmm.png` memakai waktu lokal. Unduhan dibuat lewat `Blob` + `URL.createObjectURL` (bukan `data:` langsung) supaya tidak menyentuh batas panjang URL, dan URL-nya dilepas setelah 10 detik.

### Ukuran strip di panggung dan tata letak kaki strip

Empat angka yang lahir dari pembandingan berdampingan dengan `customize.html`:

1. **Lebar panggung dijepit 180 sampai 216 px** (rencana menulis 320). Acuan memakai strip 210 px pada semua lebar. Pada 216 px panel produk setinggi 879 px dan halaman 987 px, hampir sama dengan acuan (871 dan 998 px), sehingga tombol "Selesai & Unduh" tetap dekat lipatan layar. Pada 320 px strip menjadi 960 px dan aksi utama terdorong jauh ke bawah.
2. **Warna seluruh teks kaki strip mengikuti warna wordmark frame.** Semula teks pengguna memakai `ink` dan tanggal memakai `muted`; di frame "Malam" keduanya tidak terbaca (`ink` di atas `ink`) atau hanya 2,85 : 1 (`muted` di atas `ink`, di bawah batas 4,5 : 1 untuk teks 28 px yang dicetak sekitar 6,7 pt). Warna wordmark sudah dijamin lolos kontras §2 untuk setiap frame.
3. **Kaki strip dibagi dua baris.** Baris atas 100 px untuk wordmark dan tanggal, sisanya untuk teks pengguna. Sebelumnya teks bawaan di y 1698 menimpa wordmark yang tegak di tengah kaki.
4. **Posisi bawaan teks pengguna y 1696**, tepat di bawah baris atas kaki. Konva memakai `lineHeight` 1, jadi teks 44 px sepanjang 24 karakter paling banyak dua baris (88 px) dan tetap muat di dalam strip.

### Penyimpangan M4

|Hal|Dokumen atau acuan|Kenyataan|Tindakan|
|---|---|---|---|
|Kartu "Strip Hidup" dan "QR di strip" di rel kanan|§10.3 dan `customize.html` menampilkannya|Milik M6 dan M7|Tidak dirender di M4 sesuai keputusan pengguna. Rel kanan: ringkasan dan aksi utama saja|
|Tombol "Cetak 4R"|§10.3 dan acuan menampilkannya|FR-12 milik M5|Belum dirender|
|Frame sebagai berkas aset|ARCHITECTURE §4 mencantumkan `public/frames/`|Frame adalah data warna geometris|Folder tidak dibuat; alasannya di atas|
|Tombol stiker|Acuan: "Ketuk untuk menempel atau melepas" (toggle demo)|Stiker bisa ditempel berkali-kali dan dihapus dari kanvas atau daftar|Tombol berarti tempel; kalimat bantu diubah mengikuti perilaku produk|
|Tab "Teks"|Tidak ada di acuan|FR-10 (P1) menambah teks dan tanggal|Tab keempat ditambahkan; susunannya sama dengan tiga tab lain|
|Daftar "Isi strip" di bawah kanvas|Tidak ada di acuan|§11 mewajibkan padanan daftar untuk kanvas|Bagian baru di kolom tengah, hanya dirender bila ada isi|
|Pembacaan ukuran di daftar "Isi strip"|Rencana: `x · y · rotasi`|Kriteria M4 menuntut "Perbesar" terbukti menaikkan lebar, dan tak ada tempat lain yang menampilkannya|Pembacaan ditambah ukuran (`120 px`) dan tinggi fon (`44 px`)|
|Pilihan hias di layar sempit|Acuan menampilkan rel pilihan secara inline pada 360 px|§9 menetapkan Drawer sebagai lembar bawah untuk pilihan hias di layar sempit|Di bawah 768 px rel kiri menjadi tombol "Hiasan" yang membuka lembar bawah. Diuji Playwright pada 360 px|
|Chip "4 foto siap" di kepala panel|§10.3: "di kanan chip lime"|`BoothPanel` menaruh `chip` tepat setelah judul dan `actions` di kanan|Halaman Hias memakai `actions`, jadi chip berada di kanan seperti acuan; ditambah ikon centang seperti acuan|
|Hook `useHtmlImage`|Rencana: paket `use-image` dihindari, ditulis sendiri|Satu berkas 30 baris tanpa dependensi baru|Ditulis di `src/features/editor/useHtmlImage.ts`|
|Kembalian `exportStrip`|Rencana: `{ dataUrl, bytes }`|Jumlah bita hanya dipakai di dalam fungsi untuk memutuskan jalur kedua|Mengembalikan `dataUrl` saja; ambang 2 MB dijaga di dalam|
|Impor tipe Konva|`konva` hanya mengekspor default|Tipe kelas diambil dari submodul (`konva/lib/Stage`, `konva/lib/shapes/Image`)|Sesuai peta ekspor paket; tidak ada impor nilai tambahan|
|Peran ARIA tab pil|§9: `toggle-group` tunggal|Radix merender `radiogroup` dengan `radio` di dalamnya|Tidak diubah (perilaku dan aksesibilitas Radix tidak disentuh, ARCHITECTURE §2); uji memakai peran `radio`|
|Utilitas `page-container`|§5: `max-width: 1280px` + `margin-inline: auto`|`margin-inline: auto` mematikan peregangan flex pada sumbu silang (CSS Flexbox §9.4), sehingga wadah mengecil mengikuti isi: panel 962 px, bukan 1203 px seperti acuan|Ditambah `width: 100%` di utilitas. Berlaku juga untuk Welcome dan Privasi, yang kini selebar acuan|

### Perbandingan berdampingan dengan `customize.html`

Diukur dengan `getBoundingClientRect` di Chromium pada 1280 x 900 dan 360 x 640; tangkapan layar tidak disimpan di repo.

|Bagian|Acuan 1280|Produk 1280|Acuan 360|Produk 360|
|---|---|---|---|---|
|Panel utama|1203 x 871|1203 x 879|328 x 1941|328 x 1149|
|Lebar kolom (kiri | tengah | kanan)|289 | 538 | 289|264 | 549 | 304|satu kolom|satu kolom|
|Strip|210 x 639|216 x 648|210 x 639|216 x 648|
|Tinggi dokumen|998|987|2158|1341|
|Pil tab|106 / 94 / 105, tinggi 44|114 / 102 / 113, tinggi 44|sama|tombol "Hiasan" (panel di lembar bawah)|
|Swatch frame (rasio 2 : 3)|87 x 131|79 x 118|85 x 127|panel di lembar bawah|
|Jarak kisi swatch|14 px|14 px|14 px|14 px|

Selisih yang tersisa punya sebab yang sudah dicatat: panel pada 360 px lebih pendek karena kartu Strip Hidup dan QR belum ada, dan pil tab sedikit lebih lebar karena rupa fon yang berbeda dari berkas acuan (yang memuat Google Fonts lewat `<link>`).

### Uji manual yang perlu dilengkapi pengguna

Dua hal tidak bisa diverifikasi dengan kamera palsu:

1. **Foto kamera sungguhan dan batas 2 MB.** Foto gradien menghasilkan PNG 51 sampai 62 KB, jadi jalur kedua rekompresi JPEG belum terpicu. Buka `/booth/capture` di perangkat nyata, ambil empat foto, lalu "Selesai & Unduh": catat ukuran berkasnya. Bila di atas 2 MB, turunkan `JPEG_QUALITY` di `captureFrame.ts` (satu konstanta) dan catat di sini.
2. **Cetak dan pindai QR.** Bagian ini milik M6 dan M9 (QR belum ada di strip).

### Id preset dipisah dari data preset

`stores/booth.ts` semula mengimpor `DEFAULT_FRAME_ID` dan `DEFAULT_EFFECT_ID` dari `presets.ts`. Akibatnya seluruh data preset (enam frame, tujuh efek, dua belas stiker beserta labelnya) ikut masuk bundel halaman yang tidak memakai kanvas: uji "konva tidak ikut termuat" menemukan teks `presets.ts` di salah satu skrip `/` lewat `GalleryPicker`, yang memakai store.

Id bawaan sekarang tinggal di `src/features/editor/defaults.ts` (dua string), dan `presets.ts` serta store membacanya dari sana. Tidak ada nilai yang digandakan.

### Bentuk asersi "Konva tidak dimuat"

Rencana memakai pemeriksaan substring `"Konva"` pada teks skrip. Asersi itu memberi positif palsu: kata "Konva" juga muncul di komentar biasa, termasuk komentar `presets.ts` yang menjelaskan bahwa berkas itu tidak mengimpor Konva.

Asersi diganti menjadi pemeriksaan perilaku: Konva memanggil `_injectGlobal` saat modulnya dievaluasi (`node_modules/konva/lib/Global.js`), jadi `"Konva" in window` bernilai true begitu pustakanya termuat. Uji memeriksa itu di `/` dan `/booth/capture`, ditambah pemeriksaan teks skrip untuk penanda milik kami sendiri (`editor-overlay`) yang hanya ada di potongan kode penyunting.

Dua uji lain yang gagal pada jalannya pertama juga diperbaiki, keduanya karena kesalahan uji, bukan kode produk: helper `masukHias` sekarang menunggu kanvas penyunting yang dimuat dinamis, dan uji keyboard membuka tab "Stiker" lebih dulu (tab bawaan adalah "Frame", jadi tombol tempel belum dirender).

### Yang diperiksa di browser selain uji otomatis

Selama pengerjaan, alur berikut dijalankan langsung di Chromium (dengan empat foto galeri sebagai pengganti kamera) dan hasilnya diperiksa:

|Pemeriksaan|Hasil|
|---|---|
|Ganti frame "Malam"|Latar strip, garis slot, dan wordmark berubah sesuai data frame; piksel latar panggung `ink`|
|Efek "Retro"|Keempat foto berubah warna (sepia); sidik jari kanvas berubah besar|
|Efek "Piksel"|Sidik jari kanvas berubah kecil tetapi konsisten dan kembali persis saat efek dikembalikan ke "Asli"|
|Seret stiker di kanvas|Posisi di daftar "Isi strip" berpindah dari (300, 900) ke (408, 1006), sama dengan jarak seret dikali skala panggung|
|Tombol Transformer|Pegangan ubah ukuran dan putar muncul di sekeliling node terpilih, tetap berukuran layar karena Transformer berada di luar grup berskala|
|Tombol Delete|Menghapus stiker terpilih dan barisnya hilang dari daftar|
|Ekspor saat stiker terpilih|PNG bersih tanpa kotak pilihan dan pegangan Transformer|
|Ekspor dengan teks 24 karakter dan tanggal|Teks membungkus dua baris dan tetap di dalam strip; tanggal rata kanan di baris atas kaki strip|
|Unduhan|Berkas `snapme-20261009-0936.png` dan seterusnya, 600 x 1800 px, 51 sampai 62 KB, tanpa penanda EXIF|

## M5 Hasil dan cetak (9 Oktober 2026)

### Pencetakan 4R: portal ke `body`, bukan pola `visibility`

Rencana awal memakai pola `body * { visibility: hidden }` dengan lembar cetak diletakkan di dalam pohon halaman. Pola itu lolos pemeriksaan dimensi, tetapi **gagal pada jumlah halaman**: `visibility: hidden` tidak menghilangkan kotak tataletaknya, jadi dokumen tetap setinggi halaman produk dan `page.pdf({ preferCSSPageSize: true })` menghasilkan **3 halaman**, bukan 1. Terbukti di uji pertama `e2e/result.spec.ts` uji 2.

Perbaikan: lembar cetak dirender lewat `createPortal` ke `document.body` (ResultView), dan `@media print` di `globals.css` menyembunyikan seluruh isi halaman dengan `body > * { display: none }`. Aturan `[data-print-sheet]` (spesifisitas atribut) menang atas `body > *`, jadi hanya lembar cetak yang tersisa; tingginya nol karena `position: fixed`, sehingga PDF tepat satu halaman. `@page { size: 4in 6in; margin: 0 }` menjaga halaman 4 x 6 inci tanpa margin tambahan.

- `page.pdf({ preferCSSPageSize: true })` menghasilkan 1 halaman; kotak gambar 384 x 576 px (4 x 6 inci pada 96 dpi) diuji pada strip, jumlah halaman diuji juga pada grid.
- Hitungan halaman di uji memakai pola `/\/Type\s*\/Page[^s]/g` atas PDF keluaran Chromium. `[^s]` menjaga `/Type /Pages` tidak ikut terhitung.
- `@page` tidak bisa dibatalkan per halaman; satu-satunya cetakan v1 adalah lembar 4R, jadi ukuran itu berlaku global dan diterima.
- Pemeriksaan visual dialog cetak sungguhan (Ctrl+P) tetap diserahkan ke pengguna.

### Ekspor dikerjakan sekali saat mount

`ResultView` mengekspor strip sekali saat dipasang, bukan saat tombol ditekan: tombol "Selesai & Unduh" dan "Cetak 4R" harus langsung menyerahkan berkas, dan aturan yang sama sudah dipakai jalur unduh M4. Komposisi lembar cetak (`src/features/editor/sheet.ts`) adalah Canvas2D murni: menyalin PNG strip dua kali berdampingan pada 1200 x 1800 px plus garis potong putus-putus 4 px di `x = 600`, warnanya dari token `--color-ink`.

Dua hal yang lahir dari kenyataan runtime:

1. **Gambar slot bisa belum terdekode saat ekspor mount.** `exportStrip` menyalin kanvas apa adanya, sedangkan `useHtmlImage` memuat gambar secara asinkron. `waitForSlotPhotos` menunggu setiap node `.slot-photo` punya gambar (batas 8 detik) sebelum ekspor; tanpa itu strip bisa keluar dengan slot kosong.
2. **Efek React StrictMode.** Mode pengembangan memasang efek dua kali. Tanpa penjaga, ekspor kedua bisa menyetel ukuran panggung di tengah ekspor pertama. `startedRef` memastikan ekspor berjalan sekali; jalur gagal menampilkan pesan galat di rel kanan dan menonaktifkan kedua tombol.

### Grid 2 x 2 dicetak sebagai lembar itu sendiri

`lib/layouts.ts` di parameterkan: `buildLayout` menerima `canvas`, `margin`, `gap`, `footer`, `slotWidth`, dan `columns` dengan bawaan nilai strip lama, jadi geometri strip-4 dan strip-3 tidak berubah sedikit pun (diuji: `tests/layouts.test.ts` lama tetap lolos). Grid memakai kanvas 1200 x 1800 px, margin 48, slot 540 x 744, gap 24, kaki 240, dan dua kolom.

`composePrintSheet` mengenali lembar yang sudah selebar 4R (`canvas.width >= 1200`) dan mengembalikan hasil ekspor apa adanya: menggambar strip 1200 px dua kali berdampingan hanya akan memotong gambar. FR-12 menyebut "dua strip berdampingan" untuk strip 2 x 6 inci; FR-03 menyebut ekspor 1200 x 1800 untuk grid.

`FOOTER_WORDMARK_ROW = 100` pindah ke `lib/layouts.ts` sebagai satu sumber: `StripStage` memakainya untuk menggambar wordmark dan tanggal, store memakainya untuk menaruh teks pengguna (strip: y 1696, grid: y 1660). Posisi bawaan stiker dan teks sekarang dihitung dari kanvas layout aktif, bukan angka tetap 300/900.

### "Mulai dari awal" mengarah ke pemilih layout

Bukan ke Welcome: pengguna yang baru selesai langsung memulai alur baru tanpa melewati halaman pemasaran, dan tombol Kembali di setiap langkah tetap menyediakan jalan ke atas. Handler memanggil `clearSession()` (hapus rekaman FR-14), `reset()` (kosongkan store), lalu `router.replace("/booth/layout")`.

### `idb` sebagai klien penyimpanan (FR-14)

Dipasang `idb@8.0.4` (MIT, terawat) alih-alih menulis pembungkus IndexedDB sendiri, sesuai ARCHITECTURE §2 ("klien penyimpanan" ada di daftar yang tidak boleh ditulis sendiri). Satu basis data `snapme-session`, satu object store `state`, satu kunci `"current"`.

- Rekaman menyimpan `layoutId`, `shots`, dan slice editor; `settings` tidak ikut karena gesture sudah punya jalurnya sendiri (GS-06 di localStorage) dan pemilihan kamera memang tidak disimpan (M2).
- `validateRecord` adalah satu-satunya pintu dari penyimpanan ke store: hanya `version === 1`, layout dikenal, jumlah slot sama dengan `shotCount`, dan tipe tiap bidang benar yang diterima. Rekaman rusak dihapus, bukan ditebak.
- `SessionSync` dipasang di `src/app/booth/layout.tsx`: membaca penyimpanan, mengisi store hanya bila store masih segar (`layoutId === null` dicek ulang setelah `await`, supaya alur galeri dari Welcome tidak tertimpa), lalu berlangganan dengan jeda simpan 400 ms.
- Store mendapat bidang `sessionReady` (awal `false`, tidak ikut `reset()`). `useRequireLayout` dan `useRequireShots` menunda pengalihan selama `sessionReady` masih `false`, jadi muat ulang di tengah langkah tidak memantul ke pemilih layout sebelum IndexedDB terbaca.
- DataURL JPEG ditulis apa adanya. Uji e2e "foto pulih setelah dimuat ulang" lolos tanpa penyesuaian waktu, jadi kontingensi menyimpan `Blob` tidak dijalankan.

### Penyimpangan M5

|Hal|Dokumen atau acuan|Kenyataan|Tindakan|
|---|---|---|---|
|Baris "Ekspor" di halaman Hias|§10.3 dan rencana M5 hanya menyebut baris statis "Ekspor 600 x 1800 px (2 x 6 inci, 300 dpi)"|Setelah FR-03 ada, baris itu salah untuk grid|Dibuat mengikuti layout: `Ekspor {canvas.width} x {canvas.height} px ({inci} x {inci} inci, 300 dpi)`. Angka inci diturunkan dari 300 dpi, bukan ditulis tetap|
|Label kartu dan ringkasan di pemilih layout|Rencana M5: ganti teks rel kanan jadi mengikuti kanvas|Kartu layout juga menampilkan "Ekspor 600 x 1800 px"|Keduanya mengikuti `LAYOUTS[id].canvas`|
|Diagram layout di kartu pemilih|Acuan lama: satu kolom `flex`|Grid butuh dua kolom|Kontainer diagram menjadi `grid` dengan jumlah kolom dari `layout.columns`; strip tetap satu kolom|
|Aksi utama di halaman Hias|Sebelumnya tombol unduh langsung (M4)|M5 memindahkan unduhan ke halaman Hasil|Tombol "Selesai & Unduh" di Hias menjadi tautan ke `/booth/result` (label tetap §12); unduhan dan cetak dijalankan di Hasil|
|Halaman Hasil|§10 belum punya berkas acuan untuk `/booth/result`|Halaman tetap harus punya susunan|Disusun dari Booth Shell (§5) dan komponen §9: rel kiri ringkasan, tengah pratinjau dan baris privasi, rel kanan tiga aksi. Chip kepala panel "4 foto" gaya `lime` seperti Hias|
|Rel kiri halaman Hasil|Hias memakai rel kiri untuk pilihan hias|Hasil tidak punya pilihan|Rel kiri dipakai ringkasan `dl` (Layout, Frame, Efek, Stiker) dalam kartu `radius-card`|
|Permintaan `__nextjs_font` di uji privasi|Daftar putih uji: `/_next/`, `/mediapipe/`, `/models/`, `/stickers/`, `/favicon.ico`|Server pengembangan Next melayani fon lewat `__nextjs_font` (di produksi semuanya di bawah `/_next/`)|Awalan itu ditambahkan ke daftar putih dengan komentar; keduanya aset statis milik aplikasi|
|`page.pdf` pada uji|Rencana: hitung halaman dari regex PDF|Regex bisa meleset bila Chromium memadatkan objek|Regex dipakai (berhasil untuk 1 halaman di semua uji); bila meleset di lingkungan lain, asersi kotak 384 x 576 px tetap menjadi bukti dan pemeriksaan dialog cetak menjadi uji manual|
|`masukAmbilFoto` di `e2e/helpers.ts`|Rencana M5 menambah helper `masukHasil`|Verifikasi grid juga butuh masuk dengan layout lain|Helper `masukAmbilFotoLayout(page, label)` ditambah; `masukAmbilFoto` memanggilnya dengan "Strip 4 foto"|

### Bukti browser untuk halaman Hasil

Selain uji yang sudah disebut di atas, alur berikut dijalankan langsung di Chromium lewat Playwright (kamera palsu, foto galeri sebagai pembanding):

|Pemeriksaan|Bukti|
|---|---|
|Unduhan strip|PNG IHDR 600 x 1800, di bawah 2 MB, nama `snapme-\d{8}-\d{4}.png`; toast "Strip tersimpan di perangkatmu." tampil|
|Unduhan grid|PNG IHDR 1200 x 1800|
|Lembar cetak|Media cetak: satu halaman, kotak gambar 384 x 576 px; grid juga satu halaman|
|Privasi alur dasar|Tidak ada permintaan ke origin lain, tidak ada `/api/`; hanya halaman aplikasi dan aset statis (uji 1 `result.spec.ts`)|
|Muat ulang di tengah langkah|2 foto pulih beserta isinya, frame "Malam" pulih, alur galeri 4 foto tidak tertimpa rekaman lama|
|"Mulai dari awal"|Kembali ke pemilih layout dengan "Belum dipilih"; rekaman lama tidak kembali setelah muat ulang|
|Halaman Hasil|Masuk daftar `e2e/a11y.spec.ts`: nol pelanggaran axe pada 360 dan 1280 px|

### Uji manual yang perlu dilengkapi pengguna

1. **Dialog cetak sungguhan.** `page.pdf` membuktikan satu halaman 4 x 6 inci, tetapi dialog cetak sistem (margin printer, "fit to page") tidak bisa diverifikasi secara otomatis. Cetak satu lembar 4R dari Chrome dan pastikan tidak ada margin tambahan.
2. **Cetak grid.** Pastikan hasil cetak grid 2 x 2 pas di kertas 4R tanpa skala tambahan dari driver printer.

## M6 Link strip dan QR (9 Oktober 2026)

### Proyek Supabase: dibuat dan dimigrasi lewat CLI (9 Oktober 2026)

Proyek `snapme` dibuat dengan Supabase CLI atas persetujuan pengguna (`npx supabase projects create snapme --org-id ahxywelellcukhlekfqa --region ap-southeast-1`), ref `owdjkpzywzljnvuyfiui`. CLI sudah terautentikasi di mesin ini, jadi tidak ada token yang perlu ditempel ke repo. Selanjutnya:

1. `npx supabase link --project-ref owdjkpzywzljnvuyfiui` (kata sandi basis data dibuat acak).
2. `npx supabase db push` → `Applying migration 20261012000000_strips_bucket.sql` … `Finished supabase db push`.
3. `.env.local` diisi empat variabel dari `.env.example` plus `SUPABASE_DB_PASSWORD` (kata sandi basis data, hanya untuk `db push` berikutnya). Berkas itu diabaikan `.gitignore` (diperiksa dengan `git check-ignore`), jadi tidak ada rahasia yang masuk repo.

Bukti pemeriksaan langsung ke proyek (klien REST dengan kunci service role):

|Pemeriksaan|Hasil|
|---|---|
|`insert` baris uji dengan service role|201|
|Baca `strips` dengan kunci `anon`|200 `[]` → RLS menolak `anon` (kriteria M6)|
|Baca `strips` dengan service role|200, barisnya terlihat|
|`GET /storage/v1/bucket/snapme`|`public: false`, `file_size_limit: 2097152`, `allowed_mime_types: ["image/png"]`|
|Baris uji dihapus|204|

`supabase/config.toml` ikut di-commit; `supabase/.temp` diabaikan `.gitignore` bawaan CLI.

### Pembatasan laju di basis data, bukan di memori fungsi serverless

Keputusan pengguna. Setiap instans fungsi serverless punya memorinya sendiri, jadi hitungan di memori tidak mengikat. Yang disimpan pada baris strip adalah `rate_key` = 16 karakter pertama SHA-256 dari `alamat IP + ":" + RATE_LIMIT_SALT`, dan rute `POST /api/strips` menghitung baris satu jam terakhir dengan `rate_key` yang sama (`CREATE_LIMIT` 10, `CREATE_WINDOW_MS` 1 jam). Satu kalimat ditambahkan ke halaman Privasi bagian "Kapan foto diunggah". `x-forwarded-for` diambil hop pertama; tanpa header itu (pengembangan lokal) semua permintaan memakai satu keranjang `"lokal"`.

### Unggahan langsung ke Storage, verifikasi di rute `complete`

URL unggah bertanda tangan tidak bisa membatasi isi berkas, jadi batas 2 MB dan jenis PNG ditegakkan setelah unggah: rute `complete` membuat URL baca 60 detik lalu `HEAD` ke berkasnya dan memeriksa `content-length` dan `content-type`. Klien juga mengirim `contentType: "image/png"` saat mengunggah. `@supabase/storage-js` ditambahkan sebagai dependensi langsung (versi 2.117.3, MIT): `StorageClient` dipakai di browser untuk `uploadToSignedUrl`, dan paket itu **tidak** di-ekspor ulang oleh `@supabase/supabase-js` (diperiksa di `dist/index.d.mts` baris 829). Kunci service role tetap tidak pernah masuk klien.

### Ekspor ulang ber-QR: antrean satu jalur di `ResultView`

Panggung diubah ukurannya saat ekspor, jadi dua ekspor tidak boleh berjalan bersamaan (catatan M4). M6 menambah satu antrean: `runExport` dijalankan satu per satu, kunci `layoutId|effectId|qrImageUrl` menjaga ekspor yang sama tidak diulang, dan permintaan yang datang di tengah ekspor dijalankan sekali lagi setelahnya. Rencana menaruh seluruh alur di `features/share/createStripLink.ts`; kenyataannya QR harus lebih dulu dirender React (data URL dari `useQrImageUrl`), jadi yang dipisah adalah lapisan jaringannya (`features/share/api.ts`) dan orkestrasinya tinggal di `ResultView`. Urutannya: `POST /api/strips` → token hapus disimpan di perangkat → QR digambar → ekspor ulang → unggah → `POST complete` → tanggal kedaluwarsa masuk store. Kegagalan setelah id dibuat membuang token di perangkat, mengosongkan `share.strip`, dan menampilkan toast pesan server; baris draf yatim dibersihkan cron setelah 24 jam.

### Kotak QR: 168 px, zona tenang 4 modul, sudut membulat

Acuan `customize.html` menggambar kotak QR 56 px pada strip 210 px (≈ 27 persen) dengan ikon Phosphor di dalamnya, dan `StripStage` mengikuti proporsi itu (168 px pada kanvas 600 px). Dua penyesuaian dari rencana:

1. **Zona tenang 4 modul di dalam kotak 168 px** (`margin: 4` pada `qrcode`), bukan 2 modul. Kotak QR tepat sebesar gambarnya, sedangkan latar strip bisa gelap (frame "Malam"), jadi zona tenang tidak boleh bergantung pada latar luar.
2. **Sudut kotak membulat 16 px** dengan gambar QR terjepit mengikutinya, sama seperti acuan. Jepitan itu hanya memakan zona tenang, jadi modul QR tidak tersentuh.

Glif penanda di dalam kotak disalin dari atribut `d` ikon `QrCode` bobot bold `@phosphor-icons/react` (viewBox 0 0 256 256) dengan komentar asalnya: Konva tidak bisa merender komponen React, dan §8 melarang menggambar path ikon sendiri. Glif hanya muncul di kanvas Hias (perilaku acuan); di langkah Hasil kotak QR baru digambar setelah QR sungguhan ada, supaya strip yang diunduh tanpa link tidak pernah berisi glif penanda.

### Penyimpangan M6

|Hal|Dokumen atau acuan|Kenyataan|Tindakan|
|---|---|---|---|
|Status 410 dari halaman `/s/[id]`|SH-05 dan MILESTONES M6: "jawaban 410 bila kedaluwarsa"|App Router tidak bisa memasang status pada halaman yang sudah dirender|Halaman merender tampilan kedaluwarsa ber-`noindex`; status 410 harfiah dijawab rute API (`complete` dan `DELETE`, diuji unit). Fallback `middleware` tidak dipakai karena tidak ada kebutuhan nyata. **Dikonfirmasi pengguna 9 Oktober 2026**|
|Rute blocking `/s/[id]`|Rencana: `await connection()` di halaman|Next 16 Cache Components menolak akses data runtime di luar `<Suspense>`; halaman ini isinya seluruhnya satu baris basis data, jadi tidak ada bagian statis yang berguna untuk di-stream|`export const instant = false` (rute blocking) supaya `notFound()` benar-benar menjawab 404, bukan 200 yang menyusul tampilan tidak ditemukan di tengah aliran. Dibuktikan `curl -i /s/abc` → 404. **Dikonfirmasi pengguna 9 Oktober 2026**|
|Tipe konteks route handler|Rencana: `RouteContext<'/jalur'>`|`RouteContext` baru ada setelah `.next/types` dibuat (`.next` tidak di-commit)|Konteks ditulis `{ params: Promise<{ id: string }> }` seperti contoh dokumentasi Next, jadi `npm run typecheck` tidak bergantung hasil typegen|
|Tombol "Unduh" di `/s/[id]`|Rencana: `secondary lg`|§14 menuntut tepat satu aksi `primary` per layar, dan halaman ini tidak punya aksi lain|"Unduh" menjadi `primary lg`|
|Baris atas `/s/[id]` dan 404|Rencana: `SiteHeader`|`SiteHeader` selalu membawa CTA "Mulai Foto", jadi labelnya muncul dua kali di layar yang aksinya sudah dipegang panel|`SiteHeader` menerima `ctaVariant="none"`; kedua halaman memakainya|
|Nama berkas unduhan di `/s/[id]`|FR-11: `snapme-YYYYMMDD-HHmm.png`|Halaman ini tidak tahu waktu pengambilan foto; yang diketahui hanya id strip|`snapme-{id}.png` lewat parameter `download` URL bertanda tangan|
|Kartu bagikan di langkah Hasil|§9 dan acuan tidak memuat kartu untuk langkah Hasil|SH-04 menuntut persetujuan unggah dan link yang bisa disalin|Kartu `radius-card` bergaris sama seperti kartu QR di Hias: keadaan belum ada link, sedang dibuat, dan sudah jadi (alamat, salin, tanggal kedaluwarsa). Tidak ada aksi `tangerine` baru|
|CSP|ARCHITECTURE §8 menyebut CSP|MediaPipe butuh `wasm-unsafe-eval`; tanpa CSP pun wasm satu origin sudah berjalan, dan aturan penuh dijadwalkan M9|Yang dipasang sekarang: `Permissions-Policy: camera=(self)`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` (khusus `/s` dan `/r`: `no-referrer`), `X-Robots-Tag: noindex`, dan `Content-Security-Policy: frame-ancestors 'none'` untuk `/s` dan `/r`. CSP penuh menyusul di M9|
|Tombol hapus di `/s/[id]`|Rencana: `readStripToken(id)` lalu `null` bila tidak ada|Membaca localStorage saat render membuat penanda server dan hasil hidrasi berbeda|Token dibaca lewat `useSyncExternalStore` (snapshot server `null`), lalu token diteruskan sebagai argumen ke handler hapus|
|Placeholder QR di Hias vs Hasil|Acuan menampilkan kotak QR begitu sakelarnya nyala|Strip yang diunduh tidak boleh berisi glif penanda|Kanvas Hias menampilkan glif (perilaku acuan), kanvas ekspor di Hasil hanya menampilkan QR sungguhan|

### Bukti browser M6

|Pemeriksaan|Bukti|
|---|---|
|Sakelar QR di Hias|Sakelar `switch` "QR di strip" menyala, pemberitahuan lime "Kamu akan dimintai izin unggah saat mengunduh." tampil, dan sidik jari kanvas berubah (kotak QR + glif tergambar). Uji 1 `e2e/share.spec.ts`|
|Persetujuan unggah|Dialog "Unggah strip?" menyebut apa yang diunggah, siapa yang bisa melihat, dan masa 7 hari. Uji 2 `e2e/share.spec.ts`|
|Tanpa proyek Supabase|Klik "Buat Link dan Unggah" menjawab 503 dan menampilkan "Pembuatan link belum tersedia."; kartu kembali menawarkan unggah. Uji 2 `e2e/share.spec.ts` (dilewati saat `.env.local` sudah ada)|
|Alur ber-link sungguhan|`SUPABASE_E2E=1 npx playwright test share.spec.ts` → 3 lolos, 1 dilewati (uji 503). Uji 4: buat link (unggah PNG ber-QR ke Storage lewat URL bertanda tangan), toast "Link strip dibuat.", alamat `/s/{id}` dan tanggal kedaluwarsa tampil, konteks browser kedua membuka alamat itu dan melihat stripnya tanpa tombol "Hapus strip", lalu pemilik menghapus dan halaman menjawab 404. Baris `complete` dan batu nisan `deleted` terlihat di basis data setelah uji|
|Berkas sisa uji dibersihkan|Setelah uji, sisa baris dan berkas di Storage dihapus manual lewat klien REST; `strips` kembali kosong|
|Halaman strip yang tidak ada|`curl -i http://localhost:3000/s/abc` → `404 Not Found` dengan `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex`, `Content-Security-Policy: frame-ancestors 'none'`, `Permissions-Policy: camera=(self)`; `/` tetap `strict-origin-when-cross-origin`|
|Kunci service role tidak di bundel klien|Build dengan `.env.local` sungguhan: 50 berkas di `.next/static` dipindai, nol memuat kunci service role, sedangkan `NEXT_PUBLIC_SUPABASE_URL` memang ada (memang publik, jadi pemindaiannya terbukti sanggup menemukan nilai yang bocor). `tests/client-bundle-secrecy.test.ts` juga memeriksa tidak ada berkas `"use client"` yang mengimpor `lib/supabase/server`|

### Perbandingan berdampingan kartu QR dengan `customize.html`

Diukur dengan `getComputedStyle` di Chromium pada 360 dan 1280 px (skrip sementara, tidak disimpan di repo).

|Bagian|Acuan|Produk|
|---|---|---|
|Kartu|`paper`, garis 2 `ink`, radius 14, padding 16|sama persis|
|Judul|Unbounded 800 16 px|sama persis|
|Paragraf isi|Space Grotesk 400 15 px, tinggi baris 21 px|Space Grotesk **500** 15 px, tinggi baris 21 px. §3 menetapkan teks isi 500, jadi dokumen yang menang|
|Pemberitahuan izin|`lime`, garis 2 `ink`, radius 10, padding 8 10, 14 px|sama persis|
|Sakelar|56 x 32, radius 999|sama persis|

### Tinjauan keamanan

Berkas yang ditinjau: `src/app/api`, `src/lib/supabase`, `src/lib/tokens.ts`, `src/lib/rateLimit.ts`, `src/lib/expiry.ts`, `src/features/share`, migrasi, `next.config.ts`, dan `vercel.json`. Delapan temuan, semuanya ditangani sebelum commit:

|#|Tingkat|Temuan|Tindakan|
|---|---|---|---|
|1|blocker|`POST /api/strips` menghitung `still_path` hanya untuk URL unggah dan **tidak menulisnya ke baris**, sedangkan rute `complete` menolak baris ber-`still_path` null. Alur ber-link selalu gagal 422, dan berkas yang terunggah tidak punya jejak untuk dihapus. Uji unit tidak menangkapnya karena klien palsu menambal `still_path` di setiap baris|`still_path` ditulis sejak pembuatan. Klien palsu tidak lagi menambal kolom itu (hanya nilai bawaan kolom), dan uji "membuat baris draf" sekarang memeriksanya|
|2|major|Bucket tidak punya `file_size_limit` dan `allowed_mime_types`, jadi URL unggah menerima berkas jauh di atas 2 MB dan berkas yang ditolak 422 tidak dibuang|Migrasi memasang `file_size_limit` 2 MB dan `allowed_mime_types` `image/png` (dengan `on conflict do update`); rute `complete` membuang berkas yang ditolak dan membandingkan jenis persis (`image/pngx` tidak lolos lagi)|
|3|major|Token unggah berlaku sekitar 2 jam dan Storage tidak melihat tabel: berkas bisa diunggah setelah barisnya dihapus, dan tidak ada yang pernah membersihkannya|`DELETE` tidak lagi menghapus barisnya, melainkan menjadikannya batu nisan `status = 'deleted'` dengan `expires_at = now + 3 jam` (lebih lama dari token unggah). Pembersih harian membuang baris dan berkasnya setelah masa tenggang itu; `/s/[id]` hanya menerima `complete`, jadi strip yang dihapus tetap 404|
|4|major|Kuota pembatasan laju dihitung dari baris `strips`, sedangkan `DELETE` menghapus baris itu: siklus buat-hapus-buat mengembalikan kuota tanpa batas|Batu nisan temuan 3 sekaligus menutup ini: baris `deleted` tetap ikut dihitung selama jendela satu jam, dan masa tenggangnya (3 jam) lebih panjang dari jendela|
|5|major|Periksa-dulu-lalu-sisip tidak atomik: permintaan serentak semuanya melihat hitungan di bawah batas|Urutannya dibalik menjadi hitung-setelah-sisip: baris baru disisipkan, dihitung, dan dibuang lagi bila kuota sudah lewat. Overshoot hanya mungkin beberapa baris pada balapan sempit, bukan seluruh burst|
|6|minor|Sidang alamat IP diambil dari hop pertama `x-forwarded-for`, yang bisa dipalsukan klien bila proxy hanya menambahkan|`x-real-ip` (diisi platform hosting, Vercel menimpanya) dipakai lebih dulu; `x-forwarded-for` hop pertama hanya cadangan. Diuji: header `x-forwarded-for` palsu tidak memindahkan keranjang saat `x-real-ip` ada. Bila kelak di-host sendiri, semantik proxy-nya wajib diperiksa lagi|
|7|minor|`POST /api/strips` menerima `content-type` apa pun, jadi halaman lintas situs bisa membakar kuota pengunjung lewat `fetch` `no-cors` atau form biasa|Rute menolak permintaan yang bukan `application/json`|
|8|minor|Garam pembatasan laju kosong diam-diam memakai `"dev-garam"`, dan sidangnya bisa dibalik dengan menebak ruang alamat IPv4|`rateKeyFor` mengembalikan `null` tanpa garam, dan rutenya menjawab 503 (aplikasi tetap jalan tanpa proyek maupun garam)|

Kategori yang dinyatakan bersih oleh peninjau: entropi dan perbandingan token, pemeriksaan otorisasi tiap rute, RLS dan model kapabilitas URL bertanda tangan, autentikasi cron, XSS/injeksi di halaman `/s/[id]` (id dan URL bertanda tangan dirender sebagai atribut), dan kebocoran pesan galat.

### Uji manual yang perlu dilengkapi pengguna

1. **Pindai QR dari cetakan.** Pengguna melaporkan sudah mencoba cetak dan pindai (9 Oktober 2026), tanpa rincian perangkat dan berapa yang berhasil. Karena strip ber-QR baru bisa diekspor setelah alur link berjalan hari ini, ulangi sekali dengan strip ber-link sungguhan (frame "Malam" sekaligus frame terang) dan catat perangkatnya; hasilnya menggantikan baris ini. Tetap syarat rilis M9.
2. **Jadwal cron.** `vercel.json` memasang pembersih harian 03:00 UTC. Deploy baru terjadi di M9, jadi jalannya cron belum pernah terlihat. Pembersihnya sendiri sudah diuji unit (baris kedaluwarsa, draf basi, batu nisan).
3. **Kata sandi basis data.** Dibuat acak dan disimpan di `.env.local` (tidak di-commit). Simpan di pengelola kata sandi pengguna; kalau hilang, reset dari dasbor Supabase lalu perbarui `.env.local`.

---

## M7 Strip Hidup (9 Oktober 2026)

### Klip hanya di memori, tidak ikut IndexedDB

Bingkai SH-01 disimpan sebagai `ImageBitmap` di `Shot.clip` (`src/stores/booth.ts`). `serializeSession` sengaja menyalin ulang tiap foto menjadi `{ still, capturedAt }`, jadi `ImageBitmap` tidak pernah menyentuh IndexedDB. Alasannya: structured clone `ImageBitmap` tidak seragam antar browser, dan rekaman 40 bingkai 480 px akan membengkakkan penyimpanannya. Akibatnya yang terlihat pengguna: memuat ulang halaman mematikan Strip Hidup untuk kunjungan itu, dan kartu Hias menampilkan sakelar nonaktif dengan penjelasan "Klip hanya terekam saat memotret lewat kamera." Bila kelak ingin persisten, konversinya ke `Blob` dikerjakan di M9.

Store juga melepas bingkainya (`close()`) setiap kali foto diganti, layout diganti, atau "Mulai dari awal" ditekan (butir "Lepas `ImageBitmap` saat booth dimulai ulang" di `MILESTONES.md`). Dijaga uji `tests/booth-live.test.ts`.

### Bucket naik ke 5 MB, batas 2 MB still ditegakkan rute `complete`

`MILESTONES.md` M7 dan PRD §8 menuntut klip di bawah 5 MB, sedangkan bucket `snapme` dipasang 2 MB untuk PNG (M6). Batas bucket hanya satu angka untuk semua berkas, jadi migrasi `20261013000000_live_video.sql` menaikkannya ke 5 MB dan menambah `video/webm` serta `video/mp4` ke daftar jenis. Batas 2 MB untuk still tidak hilang: rute `complete` sudah memeriksanya sendiri (pagar kedua) dan tetap menolak PNG di atas 2 MB. Versi hidup juga tetap diperiksa di rute itu (≤ 5 MB, jenis persis `video/webm` atau `video/mp4`). Migrasinya sudah dijalankan ke proyek `snapme` lewat `supabase db push` setelah pengguna menyetujui 9 Oktober 2026, jadi uji ber-jaringan M7 memakai bucket yang sebenarnya.

### Versi hidup best-effort di rute `complete`

Rekaman bisa gagal di perangkat pengguna (kodek, tab di latar, kehabisan memori), jadi klip tidak pernah memblokir stripnya. `POST /api/strips` menulis `live_path` sejak baris dibuat dan mengembalikan `liveUpload` kedua; bila setelah unggah ternyata berkasnya tidak ada atau tidak lolos pemeriksaan, rute `complete` membuang berkas itu, mengosongkan `live_path`, dan tetap menandai stripnya `complete`. Pengguna melihat toast "Versi hidup tidak ikut terunggah." dan strip diamnya tetap utuh. Kehadiran `live` di `CREATE_STRIP_SCHEMA` adalah satu-satunya penanda bahwa klien menginginkan jalur ini.

### Lencana "Klip" dan label baru

`LiveStripPlayer` di DESIGN-SYSTEM §9 diwujudkan sebagai prop `live` di `StripStage` (ditambah `useClipTicker` dan `LiveStripVideo` untuk `/s/[id]`), bukan komponen panggung terpisah. Alasannya: panggung Konva yang sama dipakai tiga hal yang harus identik (hias, ekspor PNG, rekam video), dan komponen kedua akan menduplikasi susunan strip yang sudah ada di satu berkas. Nama "LiveStripPlayer" tetap dipakai untuk pemutarnya di halaman strip (`src/features/live/LiveStripVideo.tsx`, tanpa Konva supaya halaman itu ringan).

Lencana digambar manual (Rect + Text) supaya angkanya sama persis dengan acuan: acuan memakai kiri dan bawah 6 px, tinggi 16 px, lebar 42 px, Space Mono 700 10 px, jarak huruf 0.06em pada strip 210 px. Ruang kanvas strip 600 px berarti 17 px, 46 px, 120 px, 28 px, dan 1.7. `Label`/`Tag` bawaan react-konva tidak dipakai karena padding-nya seragam, sedangkan acuan berpadding 2 px tegak dan 8 px datar.

Label antarmuka baru yang belum ada di DESIGN-SYSTEM §12: "Unduh Video", "Putar", "Jeda", "Versi hidup tidak ikut terunggah.", dan "Video strip tersimpan di perangkatmu." Semuanya dicatat di sini mengikuti presedem M6; bila pengguna setuju, tambahkan ke tabel §12 dokumen (dokumen tidak diubah diam-diam).

### Perbandingan berdampingan lencana "Klip" dengan `customize.html`

Diukur pada tangkapan layar 1280 px (skrip sementara, tidak disimpan di repo).

|Bagian|Acuan (strip 210 px)|Produk (kanvas 600 px)|
|---|---|---|
|Posisi lencana|kiri 6 px, bawah 6 px|17 px, 17 px|
|Ukuran|42 x 16 px|120 x 46 px|
|Huruf|Space Mono 700 10 px, jarak 0.06em|Space Mono 700 28 px, jarak 1.7|
|Isi|`ink` dengan teks `paper`, radius 999|sama|

### Bukti browser M7

|Pemeriksaan|Bukti|
|---|---|
|Perekaman tidak mengubah waktu foto utama|`tests/clip-recorder.test.ts`: tabel peristiwa yang sama dijalankan dengan dan tanpa pengamat perekam, urutan fasenya identik, dan offset sampling terakhir 2850 ms < 3000 ms|
|Klip benar-benar terekam dan berputar|`e2e/live.spec.ts` uji 1: setelah sakelar dinyalakan, sidik jari kanvas berubah tiap 500 ms; saat sakelar mati, dua sampel identik|
|`prefers-reduced-motion`|Uji 2: pratinjau diam, tetap berbeda dari keadaan sakelar mati (lencana "Klip"), tombol "Putar" menjalankan animasi, "Jeda" menghentikannya|
|Tanpa klip|Uji 3 (foto galeri): sakelar nonaktif dan teks "Klip hanya terekam saat memotret lewat kamera."|
|Unduh video (SH-03)|Uji 4: berkas `snapme-YYYYMMDD-HHmm.webm` terunduh di Chromium headless, ukurannya di atas 0 dan di bawah 5 MB|
|Unggah klip dan rute `complete`|`tests/api-strips.test.ts` (20 lolos): POST dengan `live` mengembalikan `liveUpload` dan menulis `live_path`; complete menyimpannya bila klipnya lolos, dan mengosongkan `live_path` bila berkasnya 404, jenisnya salah, atau lebih dari 5 MB|
|Alur ber-jaringan sungguhan|Setelah `npx supabase db push` (disetujui pengguna 9 Oktober 2026), `SUPABASE_E2E=1 npx playwright test share.spec.ts live.spec.ts` → 8 lolos, 1 dilewati. Konteks kedua membuka `/s/{id}` dan melihat `<video>` bertanda tangan dari `/storage/`; pemilik menghapus lalu halaman menjawab 404. Strip tanpa klip (uji lama) nol `video`|
|Lencana "Klip" dan kartu Hias|Tangkapan layar 1280 dan 360 px dibandingkan dengan `docs/ui-reference/customize.html`: kartu Strip Hidup duduk di urutan pertama rel kanan (judul Unbounded 800 16, sakelar 56 x 32, pemberitahuan lime), lencana menempati 20 persen lebar slot di kiri bawah seperti acuan|
|Perintah pemeriksaan|`npm run lint`, `npm run typecheck`, `npm test` (120 lolos, 18 berkas), `npm run build` (13 rute), dan `npx playwright test` (50 lolos, 3 dilewati) semuanya hijau|

### Uji manual yang perlu dilengkapi pengguna

Perangkat dan browser di luar Chromium headless belum pernah menjalankan versi hidup. Isi tabel ini setelah mencoba; hasilnya menggantikan status "menunggu pengguna". Kolom Chrome diisi di M9 dari jalankan headless (Chromium dengan kamera palsu); kolom Firefox dan Safari sebagian: yang bisa dipastikan lewat uji otomatis adalah kemampuan merekamnya, sedangkan pratinjau berputar dan pemutaran `/s/{id}` tetap butuh kamera dan perangkat sungguhan.

|Pemeriksaan|Chrome|Firefox|Safari|
|---|---|---|---|
|Kemampuan merekam (M9, headless)|`MediaRecorder` ada, `video/webm` dan `video/mp4` didukung, `canvas.captureStream` ada (Chromium 156)|`MediaRecorder` ada, `video/webm` didukung, `video/mp4` tidak, `canvas.captureStream` ada (Firefox 157) → `pickLiveKind` memilih webm|Build WebKit milik Playwright **tidak** membawa `MediaRecorder` maupun `canvas.captureStream` (WebKit 27.2), jadi tombol SH-03 memang tersembunyi di sana; Safari sungguhan (14.1 ke atas) punya keduanya dan belum diperiksa|
|Pratinjau berputar di Hias|**Lolos headless** (`e2e/live.spec.ts`, kamera palsu): sakelar menyala, klip berputar, dan saat sakelar mati kanvas kembali ke foto tetap|menunggu pengguna|menunggu pengguna|
|Rekam lalu unduh video (SH-03)|**Lolos headless** (`e2e/live.spec.ts` "unduh video versi hidup", di bawah 5 MB)|menunggu pengguna|menunggu pengguna|
|Pemutaran di `/s/{id}` (SH-05)|**Lolos ber-jaringan** (`SUPABASE_E2E=1`, `<video>` bertanda tangan dari Storage)|menunggu pengguna|menunggu pengguna|

Catatan: tombol "Unduh Video" dan pemutar di `/s/[id]` hanya muncul bila `MediaRecorder` mendukung `video/webm` atau `video/mp4`; di Safari yang merekam MP4, jenis berkas unduhannya `.mp4`.

---
## M8 Strip Estafet (9 Oktober 2026)

### Pembagian slot dan pemetaan foto pembuat

Aturan tunggal untuk semua layout: indeks 0-based genap milik pembuat, ganjil milik teman (`src/lib/relaySlots.ts`). Strip 4 → pembuat [0, 2], teman [1, 3]; Strip 3 → pembuat [0, 2], teman [1]; Grid 2 x 2 → sama seperti Strip 4. Pembuat selalu mengisi tepat setengah slot, jadi syarat SE-01 ("minimal setengah") terpenuhi di semua layout. Dua foto terisi pertama sesi lokal dipetakan berurutan ke slot pembuat; sesi lokal pembuat tidak diubah setelah link dibuat, jadi foto yang diulang setelahnya tidak mengubah berkas yang sudah diunggah (itu snapshot saat link dibuat).

### Slot teman diunggah saat penuntasan, bukan saat jepret

Rencana awal tidak menyebut kapan berkas slot teman naik ke Storage. Yang dipilih: **saat penuntasan**, dengan mekanisme penyembuhan sendiri. Rute `complete` memeriksa semua berkas slot; slot teman yang belum ada dijawab 422 beserta URL unggah baru untuk slot yang kurang, lalu klien mengunggah foto yang ada di sesinya dan mencoba sekali lagi (`RelaySlotsNeededError` + `finishRelayOnce` di `src/features/editor/ResultView.tsx`).

Alasan: URL unggah bertanda tangan berlaku sekitar 2 jam sedangkan link estafet hidup 48 jam, jadi menyimpan URL itu di sesi (atau di IndexedDB) akan kedaluwarsa di tengah jalan. Dengan cara ini URL-nya selalu segar, dan sesi yang pulih dari perangkat lain (foto lokal sudah ada di IndexedDB) bisa menambal berkas yang hilang tanpa endpoint tambahan. Akibat yang terlihat pengguna: unggahan terjadi sekali di "Selesai & Unduh", dan bila foto lokalnya juga tidak ada, pesannya "Isi ulang foto yang kurang."

### Token satu header, giliran sekali di basis data

Token pembuat dan tamu lewat header `x-relay-token`; hanya hash SHA-256-nya ada di baris `relays`. Di perangkat, token disimpan per id (`localStorage` `snapme:relay-token:{id}`) bersama perannya, karena satu perangkat bisa jadi pembuat di satu link dan tamu di link lain. Giliran sekali dijamin `UPDATE ... WHERE id = ? AND status = 'waiting'`; nol baris berubah berarti 409 "Estafet ini sudah diambil." (SE-06), dan penuntasan memakai pola yang sama dengan `status = 'claimed'`.

### Strip estafet hanya PNG diam, tanpa klip dan tanpa QR

Klip Strip Hidup milik teman tetap bisa diputar dan diunduh di perangkatnya, tetapi tidak diunggah: PRD tidak meminta versi hidup untuk estafet, dan menambahkannya berarti satu berkas lagi per estafet. QR juga tidak ada di strip estafet karena teman tidak pernah membuat link sendiri. Karena itu kartu "QR di strip" disembunyikan untuk sesi teman dan sesi lokal (`hidesUpload` di `CustomizeEditor`/`ResultView`).

### Tampilan `/r/[id]` setelah 48 jam

Kedaluwarsa diperiksa lebih dulu, jadi setelah 48 jam halaman estafet menampilkan "Estafet ini sudah kedaluwarsa." walau strip hasilnya masih hidup 7 hari (SE-08). Konsekuensinya tautan `/s/{id}` tidak lagi terjangkau dari `/r` setelah 48 jam; teman yang menuntaskan tetap disimpan di halamannya saat itu, dan pembuat bisa memintanya. Ini mengikuti rencana yang disetujui; bila pengguna ingin tautan strip tetap tampil selama 7 hari, itu perubahan perilaku kecil di halaman `/r/[id]`.

### Pembuat bisa membatalkan setelah estafet selesai

SE-09 tidak membatasi status, jadi tombol "Batalkan dan Hapus" ada di `RelayJoinView` (menunggu/diambil) dan `RelayCompleteView` (selesai) lewat komponen bersama `RelayCancel.tsx`. Satu permintaan menghapus berkas slot, strip hasilnya (bila ada), lalu menandai baris estafet `cancelled` dengan masa tenggang batu nisan yang sama dengan strip. Ini juga yang dipakai uji e2e untuk bersih-bersih.

### `localOnly` ikut tersimpan di rekaman sesi

Salinan lokal pembuat (SE-10) ditandai `localOnly` di store dan ikut disimpan di IndexedDB sebagai bidang opsional (versi rekaman tetap 1; rekaman lama tanpa bidang itu diterima). Tanpa itu, memuat ulang halaman akan mengubah salinan lokal menjadi sesi biasa yang menawarkan unggahan lagi.

### Refactor kecil yang menyertai M8

`countRecentCreations` menerima nama tabel (`"strips" | "relays"`) supaya kuota estafet terpisah dari kuota strip; pemanggil lama di `POST /api/strips` diperbarui. Pemeriksaan berkas hasil unggahan diekstrak ke `verifyStoredFile` (`src/lib/supabase/storage.ts`) dan dipakai rute complete strip, claim, dan complete estafet; tingkah laku rute strip tidak berubah (uji lama tetap hijau).

### Label antarmuka baru

Belum ada di DESIGN-SYSTEM §12, dicatat di sini mengikuti presedem M6/M7 (dokumen tidak diubah diam-diam): "Butuh 2 foto dulu.", "Bagikan tautan", "Lihat status", "Lengkapi strip ini", "Ambil Giliran", "Lanjut isi slot", "Menunggu teman", "Teman sudah mulai", "Bayangan pose teman", "Hias ulang salinanmu", "Batalkan dan Hapus", "Estafet ini sudah diambil.", "Estafet ini sudah selesai.", "Estafet sudah dibatalkan pembuatnya.", "Estafet ini sudah kedaluwarsa.", "Slot teman {n}", "Slot {n}, sudah terisi", "Link estafet dibuat.", "Tautan disalin.", "Tautan dibagikan.", "Tautan belum bisa dibagikan. Salin manual dari alamat di atas.", "Menyelesaikan estafet...", dan "Menyiapkan salinan...". "Slot teman {n}" dipakai untuk slot milik pihak lain di baki foto teman (lencana gembok); di pratinjau `/r` slotnya diberi nomor netral ("Slot {n}") karena yang melihat bisa pembuat maupun teman.

### Bukti browser M8

|Pemeriksaan|Bukti|
|---|---|
|Kartu Strip Estafet di rel kanan|Tangkapan layar `/booth/capture` 1280 dan 360 px dibandingkan dengan `docs/ui-reference/capture.html`: kartu `violet-soft` duduk antara kartu lime dan blok aksi, judul berikon `Users`, tombol "Estafet ke Teman" nonaktif bergaris putus-putus dengan teks bantu "Butuh 2 foto dulu." saat foto belum cukup|
|Halaman `/r` yang tidak ada|`curl`/Playwright: 404 + "Halaman tidak ditemukan." (tanpa gerbang env, ikut pola uji 404 M6)|
|Overlay bayangan dan slot terkunci|`e2e/relay.spec.ts` (ber-jaringan, lihat baris berikutnya)|
|Penyembuhan berkas slot teman (422 + URL pengganti)|Diuji langsung ke proyek: estafet dibuat, teman mengambil giliran, `complete` pertama dijawab 422 dengan URL unggah untuk slot 1 dan 3, setelah keduanya diunggah `complete` kedua dijawab 200 beserta `stripId`; PNG strip diunggah lalu `POST /api/strips/{id}/complete` dijawab 200 (`expiresAt` 7 hari)|
|SE-09 di proyek sungguhan|`DELETE /api/relays/{id}` dengan token pembuat → 204; halaman `/s/{id}` berikutnya 404 (berkas dan barisnya hilang); `DELETE` tanpa token → 401; halaman `/r/{id}` menampilkan "Estafet sudah dibatalkan pembuatnya."|
|Gate token di server|HTML halaman `/r/{id}` tanpa token (diambil lewat `fetch`) tidak memuat path `/s/{id}` maupun `storage/v1/object/sign`|
|Unit|`npm test`: 152 lolos, 21 berkas; di antaranya `tests/relay-slots.test.ts` (5), `tests/booth-relay.test.ts` (5), dan `tests/api-relays.test.ts` (22 kasus rute)|
|Perintah pemeriksaan|`npm run lint`, `npm run typecheck`, `npm test` (152), `npm run build` (rute `/api/relays`, `/api/relays/[id]`, `/api/relays/[id]/claim`, `/api/relays/[id]/complete`, `/api/relays/[id]/strip`, dan `/r/[id]` terdaftar), dan `npx playwright test` penuh (51 lolos, 6 dilewati) semuanya hijau|

### Catatan uji ber-jaringan: kuota per sidang

`e2e/relay.spec.ts` membuat satu estafet per uji, dan `POST /api/relays` dibatasi 10 pembuatan per jam per sidang alamat IP. Kalau semua uji memakai sidang yang sama, menjalankan berkasnya beberapa kali dalam satu jam akan gagal dengan 429. Karena itu tiap uji memasang `x-real-ip` sendiri (198.51.100.x acak) lewat `page.setExtraHTTPHeaders`; header itu memang yang dibaca `clientKeyFromRequest` (di produksi diisi platform hosting), jadi tiap uji mendapat keranjang kuotanya sendiri dan hasilnya tidak bergantung pada jalankan sebelumnya. Uji klaim bersamaan memakai `request.post` tanpa header itu, dan rute `claim` memang tidak dibatasi.

### Catatan uji: kompilasi dingin server pengembangan

Dua uji M8 pernah gagal hanya karena server pengembangan baru dinyalakan: kompilasi rute pertama memicu muat ulang halaman setelah `goto`, sehingga pemilihan radio di `e2e/helpers.ts` kadang jatuh sebelum React terhidrasi (tombol "Mulai Foto" tetap nonaktif) dan asersi halaman 404 berlomba dengan navigasi yang berulang. Perbaikannya: `masukAmbilFotoLayout` mengulang pemilihan radio sampai tombolnya menyala (`expect(...).toPass`), dan uji 404 mengulang `goto` + asersinya. Keduanya berlaku untuk seluruh berkas e2e, bukan hanya M8; sesudah itu `npx playwright test` penuh hijau dari server yang baru dinyalakan.

### Uji ber-jaringan M8

Alur dua konteks, konteks ketiga, dan klaim bersamaan ada di `e2e/relay.spec.ts` dengan gerbang `SUPABASE_E2E=1`. Setelah migrasi diterapkan atas persetujuan pengguna: `SUPABASE_E2E=1 npx playwright test relay.spec.ts` → **4 lolos, 0 dilewati, 0 gagal** (52 detik).

|Uji|Bukti|
|---|---|
|Alur utama dua konteks|Pembuat mengisi 2 foto, membuat link lewat dialog persetujuan, dan membacanya dari kartu (`/r/{id}`). Teman membuka link di konteks kedua: melihat 2 foto pembuat sebagai "Slot 1/3 sudah terisi" dan slot 2/4 putus-putus, mengambil giliran lewat dialog, mengisi 2 foto (baki menampilkan slot terkunci bergembok + sakelar bayangan menyala + lapisan `stage-overlay` terlihat), hias tanpa kartu QR, lalu "Selesai & Unduh" → mendarat di `/s/{id}` dan `<img alt="Strip">` memuat PNG bertanda tangan dari `storage/v1/object/sign`. Konteks ketiga tanpa token melihat "Estafet ini sudah selesai." tanpa tautan, dan payload halamannya tidak memuat path `/s/{id}` maupun URL bertanda tangan (regresi untuk temuan major). Pembuat membuka `/r` lagi: tautan "Lihat strip" menunjuk path yang sama, lalu "Batalkan dan Hapus" menghapus stripnya (halaman `/s/{id}` berikutnya menjawab 404)|
|Giliran sekali (SE-06)|Konteks ketiga setelah klaim API: "Estafet ini sudah diambil." dan tombol "Ambil Giliran" tidak ada|
|Klaim bersamaan|Dua `POST /api/relays/{id}/claim` paralel: tepat satu 200 dan satu 409 (bukan mock: Postgres sungguhan)|
|SE-10 (P1) hias ulang salinan pembuat|Di uji yang sama, setelah melihat tautan strip, pembuat menekan "Hias ulang salinanmu" → mendarat di `/booth/customize`, kanvas tampil, lencana kepala panel menunjukkan "4 foto siap" (semua slot termuat dari URL bertanda tangan), dan kartu "QR di strip" tidak ada|
|404|`/r/tidakada1234` → 404 + "Halaman tidak ditemukan." (tanpa gerbang env)|

Tiga kegagalan awal yang ditemukan dan diperbaiki selama pengujian ini: (1) `useSyncExternalStore` di view relay mengembalikan objek baru tiap panggilan → render tanpa henti dan halaman teman tidak pernah siap (sekarang snapshot-nya string mentah + `useMemo`); (2) `reset()` sebelum `router.push("/s/{id}")` membuat gerbang langkah booth mengalihkan ke pemilih layout lebih dulu (sekarang hanya rekaman perangkat dan irisan estafet yang dilepas); (3) kuota pembuatan 10 link per jam per sidang dipakai bersama antar-uji (sekarang tiap uji memasang `x-real-ip` sendiri, lihat catatan di atas).

### Hasil tinjauan keamanan (temuan major diperbaiki, sisanya dicatat)

Peninjauan baca-saja atas `src/app/api/relays/**`, `src/lib/supabase/{relays,storage}.ts`, `src/lib/{relaySlots,rateLimit,schemas,tokens,expiry}.ts`, `src/app/r/[id]/page.tsx`, `src/features/relay/**`, dan migrasi `relays` (tanpa blocker).

|Tingkat|Temuan|Tindakan|
|---|---|---|
|major|Gate token di `/r/[id]` status `complete` hanya presentasional: halaman server mengirim `stripId` dan URL baca bertanda tangan untuk semua slot ke props komponen klien, jadi siapa pun pemegang link estafet bisa membacanya dari payload RSC/HTML tanpa token (desain M8 keputusan 7 menjanjikan sebaliknya)|**Diperbaiki.** Rute baru `POST /api/relays/[id]/strip` memverifikasi `x-relay-token` terhadap hash pembuat/tamu di server, lalu mengembalikan `stripId`, `expiresAt`, peran, dan URL slot berumur 1 jam. Halaman `/r/[id]` status `complete` tidak lagi membaca tabel `strips` maupun menandatangani apa pun; `RelayCompleteView` meminta datanya sendiri setelah tokennya terbaca (keadaan memuat/gagal/siap). Dijaga 4 kasus unit baru di `tests/api-relays.test.ts`|
|minor|`claim` tanpa gate jenis isi: POST sederhana (form/`no-cors`) lintas situs bisa membakar giliran sekali pakai|**Diperbaiki.** `claim` menolak permintaan yang bukan `application/json` (400), klien resmi mengirim body JSON kosong, dan e2e mengirim `data: {}`. Dijaga uji unit baru|
|minor|Tidak ada validasi runtime baris DB (`slots` diasumsikan array; `row.layout in LAYOUTS` menembus rantai prototipe)|**Diperbaiki sebagian.** `relaySlotsOf(row)` memeriksa bentuk tiap slot dan dipakai semua konsumen (halaman `/r`, rute claim/complete/strip, pembersih), dan `Object.hasOwn(LAYOUTS, …)` menggantikan `in`. Constraint `check (jsonb_typeof(slots) = 'array')` dan daftar layout tertutup diusulkan untuk M9 (perlu migrasi baru)|
|minor|Balapan di jalur pemulihan: dua `complete` bersamaan saat stripnya sudah dihapus sama-sama membuat draf baru → dua baris `strips` ber-`relay_id` sama (tanpa unique index); jalur utamanya sendiri sudah aman (tepat satu pemenang)|**Diterima, dicatat.** Perbaikannya butuh kolom `strip_id` di `relays` + UPDATE bersyarat (migrasi baru). Dampaknya: satu baris yatim yang dibersihkan cron, dan pilihan tautan yang nondeterministik pada kasus langka itu|
|minor|Tanpa rate limit untuk `claim`/`complete`: (i) pemegang id bisa membebani Storage lewat HEAD berulang di `claim`; (ii) loop `complete` → `DELETE /api/strips/[id]` bisa mencetak baris `strips` tanpa kuota (`rate_key` kosong)|**Diterima, dicatat.** (i) terbatas 2 permintaan HEAD per panggilan dan berhenti begitu status bukan `waiting`; (ii) id dan token tetap diperlukan, dan tiap putaran butuh token tamu yang sah. Bila kelak perlu, tambahkan hitungan baris per `relay_id` di `complete`|
|—|Catatan non-keamanan: ARCHITECTURE §7 menyebut field "waktu isi" di `slots` yang tidak ada di implementasi|**Dicatat.** Slot menyimpan `{ index, owner, path }`; waktu isi tidak dipakai fitur mana pun hari ini. Dokumen tidak diubah diam-diam|

Titik yang dinyatakan benar oleh peninjau: token 32 bita acak + SHA-256 + perbandingan waktu tetap; RLS tanpa policy; bucket privat; verifikasi HEAD pasca-unggah; UPDATE bersyarat sekali-pakai untuk claim/complete; balasan API tidak membocorkan hash maupun path slot teman; balasan 422 berisi URL unggah tidak menaikkan hak (token diperiksa lebih dulu dan hanya slot `guest` yang ditandatangani); halaman `/s` dan `/r` sudah `noindex` + `no-referrer`.

### Batas aman

Migrasi `20261014000000_relays.sql` sudah diterapkan ke proyek Supabase `snapme` (ref `owdjkpzywzljnvuyfiui`) lewat `npx supabase db push` **atas persetujuan pengguna**; `npx supabase migration list` mengonfirmasi `20261014000000` ada di remote. Isinya: tabel `relays` (RLS menyala tanpa policy), dua indeks, dan `image/jpeg` ditambahkan ke daftar jenis bucket. Perubahan skema berikutnya mengikuti aturan yang sama: pengguna yang menjalankan, atau pihak lain setelah ada persetujuan.

## M9 Pengerasan (9 Oktober 2026)

Satu milestone, satu putaran kerja. Urutan kerjanya: pengerasan data (sisa M8), analitik, CSP penuh, audit aksesibilitas, kinerja, uji lintas peramban, dokumen.

### Pengerasan tabel `relays` (sisa temuan M8)

Migrasi `20261015000000_relays_hardening.sql`: kolom `strip_id` pada `relays`, constraint `relays_layout_check` (daftar layout tertutup, sejalan `LayoutId` di `src/lib/layouts.ts`), constraint `relays_slots_array_check` (`jsonb_typeof(slots) = 'array'`), dan indeks unik parsial `relays_strip_id_key`.

|Butir|Keputusan dan bukti|
|---|---|
|Bentuk tiap elemen slot|Tetap di `relaySlotsOf` (runtime), bukan check constraint: satu elemen cacat tidak boleh menjatuhkan seluruh baris|
|Balapan jalur pemulihan (temuan minor M8)|Rute `POST /api/relays/[id]/complete` memakai `relays.strip_id` sebagai gerbang pemenang tunggal: UPDATE bersyarat `strip_id is null` yang hanya boleh berhasil sekali. Yang kalah membuang draf yatimnya (barisnya saja, belum ada berkas terunggah) lalu menjawab draf pemenang. Jalur utama (claimed → complete) kini lewat jalur yang sama, jadi penuntasan dan pemulihan yang berbarengan tetap satu draf|
|Bukti|`tests/api-relays.test.ts` (27 lolos) menambah kasus: gerbang dibuka lagi bila strip pemenang dihapus, dua penuntasan pemulihan berbarengan → tepat satu baris `strips`, `stripId` kedua jawaban sama, dan draf yang kalah benar-benar terhapus (dilacak `fake.log.droppedStrips`); strip yang dipakai selalu yang ditunjuk gerbang, bukan draf sisa ber-`relay_id` sama, di tiga rute (`complete`, `strip`, dan `DELETE`)|

### Analitik first-party (PRD §4)

Keputusan pengguna: **endpoint peristiwa first-party**, bukan alat pihak ketiga. Migrasi `20261016000000_events.sql` membuat tabel `events` (`id` identity, `name`, `rate_key`, `created_at`; RLS menyala tanpa policy; dua indeks). Yang tersimpan hanya nama peristiwa, sidang pembatasan laju (SHA-256 alamat IP + `RATE_LIMIT_SALT`, sama seperti tabel lain), dan waktu: tidak ada cookie, kolom sidang, perangkat, atau jalur. Retensi 90 hari, dibuang `GET /api/cron/purge`.

|Bagian|Keputusan|
|---|---|
|Daftar peristiwa|Tertutup di `src/lib/analyticsEvents.ts` (16 nama), dipakai klien dan server. Rute `POST /api/events` menolak nama di luar daftar (400), badan bukan JSON (400), dan batch di luar 1 sampai 20 butir|
|Pembatasan laju|Anggaran 200 peristiwa per jam per sidang (`EVENT_LIMIT`), pola hitung-setelah-sisip yang sama dengan rute POST lain: batch yang melewati batas dibuang lagi sebelum menjawab 429|
|Tanpa env Supabase|Rute menjawab 503 diam-diam dan aplikasinya tetap jalan (pola M6 temuan 8)|
|Pengiriman klien|`src/lib/analytics.ts`: antrean di memori, dikirim `navigator.sendBeacon` saat mencapai 8 peristiwa, saat halaman disembunyikan, dan saat `pagehide`. Best-effort: tanpa retry, tanpa cookie, tidak pernah melempar|
|Bucket "cepat dipakai"|`snapme:t0` di sessionStorage diisi `SessionStartPing` di Welcome; ambang 15/30/60 detik ada di `src/lib/analyticsEvents.ts`|
|Bukti unit|`tests/api-events.test.ts` (7 lolos) dan `tests/analytics-queue.test.ts` (6 lolos): ambang batch, kirim saat disembunyikan dan `pagehide`, jatuh ke `fetch` bila beacon tidak ada atau menolak, batas bucket, pembatalan batch yang melewati anggaran, dan penolakan permintaan lintas situs. Pembersih: `tests/api-events.test.ts` juga menguji kelompok `events` di cron|
|Bukti ber-jaringan|Setelah migrasi diterapkan, `welcome_loaded` dari kunjungan sungguhan muncul di `events` (diperiksa lewat REST dengan kunci service role)|

Kueri rasio ukuran PRD §4 (dijalankan manual; dashboard tidak dibuat):

```sql
-- 1. Alur dasar selesai tanpa bantuan (target >= 60%)
select (select count(*) from events where name = 'download_png')::float
     / nullif((select count(*) from events where name = 'camera_granted'), 0);

-- 2. Gesture Snap benar-benar dipakai (target >= 50%)
select (select count(*) from events where name = 'photo_taken_gesture')::float
     / nullif((select count(*) from events
               where name in ('photo_taken_gesture', 'photo_taken_button')), 0);

-- 3. Estafet tuntas (target >= 40%)
select (select count(*) from events where name = 'relay_completed')::float
     / nullif((select count(*) from events where name = 'relay_created'), 0);

-- 4. Strip Hidup menambah nilai (target >= 30%)
select (select count(*) from events where name = 'live_enabled')::float
     / nullif((select count(*) from events where name = 'customize_reached'), 0);

-- 5. Cepat dipakai (median < 30 detik): sebaran bucket sebagai ganti durasi
select name, count(*) from events
where name like 'first\_photo\_%' group by name order by name;
```

Catatan kejujuran angka: rasio dihitung dari hitungan peristiwa, bukan sesi. `welcome_loaded`, `camera_granted`/`camera_denied`, `live_enabled`, `relay_created`, dan `download_png` dijaga agar hanya tercatat sekali per kunjungan halaman (temuan tinjauan M9: tombol unduh tetap hidup setelah unduhan pertama, jadi tanpa penjaga itu rasio #1 bisa melewati 100%), dan `photo_taken_*` memang dihitung per foto. `relay_completed` tercatat sekali per penuntasan; rasio #2 memakai semua foto, sedangkan PRD membatasinya pada sesi dengan gesture menyala, sehingga nilainya adalah batas bawah. Rasio-rasio ini juga baru bermakna untuk lalu lintas setelah rilis: jalankan pengembangan dan suite ber-jaringan (`SUPABASE_E2E=1`) menulis ke tabel yang sama.

### CSP penuh dan status halaman `/s` serta `/r`

`next.config.ts` memasang satu CSP untuk `/:path*` (menggantikan `Content-Security-Policy: frame-ancestors 'none'` yang dulu hanya di `/s` dan `/r`), disusun dari env: host Supabase ditambahkan hanya bila `NEXT_PUBLIC_SUPABASE_URL` ada.

```text
default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval';
style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: {SUPABASE};
media-src 'self' blob: data: {SUPABASE}; connect-src 'self' blob: data: {SUPABASE};
font-src 'self' data:; worker-src 'self' blob:; object-src 'none';
base-uri 'self'; form-action 'self'; frame-ancestors 'none'
```

|Direktif|Alasan|
|---|---|
|`script-src 'unsafe-inline'`|Skrip bootstrap App Router ditulis inline tanpa nonce. Nonce memaksa render dinamis setiap permintaan, bertabrakan dengan `cacheComponents` dan target LCP Welcome (PRD §8)|
|`script-src 'wasm-unsafe-eval'`|Gesture Snap menjalankan model MediaPipe yang di-host sendiri (ARCHITECTURE §6)|
|`'unsafe-eval'` hanya di pengembangan|React memakainya untuk menyusun ulang jejak galat di peramban; produksi tidak membutuhkannya. CSP produksi tidak memuat `'unsafe-eval'`|
|`img-src`/`media-src` `blob:` dan `data:`|Ekspor kanvas (`toDataURL`), bingkai klip sebagai ImageBitmap, dan hasil `MediaRecorder` sebagai URL blob|
|`connect-src` `blob:` dan `data:`|Konversi hasil ekspor menjadi Blob lewat `fetch(dataUrl)`; keduanya lokal, tidak keluar jaringan|
|`worker-src 'self' blob:`|MediaPipe membuat worker dari berkasnya sendiri dan dari blob|
|`font-src 'self' data:`|Fon di-host sendiri lewat `next/font`|
|`{SUPABASE}`|Unggahan langsung ke Storage dan URL bertanda tangan saat membaca|

Temuan selama verifikasi, semuanya dicatat:

|Temuan|Tindakan|
|---|---|
|`next dev` sudah memakai CSP ini sejak M9; seluruh suite chromium tetap hijau di server produksi (`npm run build && npm start`): **57 lolos, 11 dilewati, 0 gagal** (yang dilewati: uji ber-jaringan ber-gerbang `SUPABASE_E2E`, dan dua audit galeri `/dev/ui` yang memang tidak dirender di produksi). Suite kanonik di server pengembangan (semua proyek, `npx playwright test`) **64 lolos, 8 dilewati, 0 gagal**|Tidak ada perubahan direktif|
|`curl -I /` dan `/s/x` memperlihatkan satu CSP, tanpa `'unsafe-eval'`|Bukti: keluaran `curl`|
|Zod (lewat `src/lib/schemas.ts` yang ikut bundel klien) menjalankan uji kemampuan `Function("")` di dalam `try/catch`; di bawah CSP tanpa `'unsafe-eval'` uji itu memicu satu laporan `securitypolicyviolation` di konsol|**Dibiarkan.** Zod menangkapnya dan turun ke jalur validasi non-JIT: tidak ada perilaku yang berubah. Menambahkan `'unsafe-eval'` ke produksi demi menghilangkan satu laporan konsol bukan pertukaran yang sepadan|
|Halaman `/s/[id]` dan `/r/[id]` menjawab **200** di server produksi untuk id yang tidak ada (di server pengembangan 404). Cangkang PPR dikirim lebih dulu, jadi `notFound()` tidak bisa lagi mengubah status|**Diperbaiki** dengan `htmlLimitedBots: /.*/` di `next.config.ts`: semua permintaan dirender blocking seperti crawler, sehingga `notFound()` benar-benar menjawab 404 di produksi (`curl` membuktikan 404 + "Halaman tidak ditemukan."). Biayanya: metadata tidak lagi dialirkan, dan halaman `/s` serta `/r` menunggu satu baris basis data sebelum HTML pertama (memang begitu maksud `instant = false`)|
|Tiga uji e2e gagal di server produksi karena membandingkan piksel kanvas tepat setelah klik (penggambaran ulang Konva tidak sinkron dengan klik); di server pengembangan kebetulan lolos|Uji diperbaiki dengan `expect.poll`/`expect.poll(...).not.toBe(...)` di `customize.spec.ts`, `live.spec.ts` (dua tempat), dan `share.spec.ts`|
|`e2e/result.spec.ts` mengaudit "tanpa permintaan non-statis" pada alur dasar; analitik M9 memang sengaja memanggil `/api/events`|Daftar rute yang diizinkan ditambah `/api/events` dengan komentar: isinya hanya nama peristiwa, tanpa gambar|

### Hasil tinjauan kode dan keamanan

Tinjauan dijalankan baca-saja atas seluruh perubahan M9 setelah semua pemeriksaan hijau. Tidak ada blocker. Temuan yang bisa dikerjakan di ruang lingkup M9 langsung diperbaiki; sisa yang bukan lingkup M9 dicatat apa adanya.

|Tingkat|Temuan|Tindakan|
|---|---|---|
|major|`firstPhotoBucketEvent()` membaca sessionStorage tanpa penjaga; di peramban yang memblokir penyimpanan, galatnya melempar di dalam efek jepret setidaknya sebelum `SHOT_SAVED`, sehingga fase `capturing` tidak pernah maju dan bingkai klipnya tidak pernah dilepas. `markSessionStart()` juga melempar dari effect halaman Welcome|**Diperbaiki.** Keduanya dibungkus `try/catch` (pola yang sama dengan `track()` dan `relayToken.ts`), dan pemanggilan analitik di halaman Ambil Foto dipindah ke SETELAH `dispatch({ type: "SHOT_SAVED" })` supaya mesin keadaan selalu maju lebih dulu|
|medium|`POST /api/events` memakai pola hitung-setelah-sisip, jadi setelah anggaran habis setiap permintaan tetap melakukan INSERT 20 baris + COUNT + DELETE sebelum menjawab 429: yang dibatasi hanya baris tersimpan, bukan kerja tulis basis datanya|**Diperbaiki.** Gerbang murah sebelum sisip ditambahkan di `events`, `strips`, dan `relays` (tolak tanpa menulis bila jendela kuotanya sudah penuh), sementara pemeriksaan setelah sisip tetap jadi gerbang resmi untuk permintaan serentak|
|low|Rute `POST /api/events` hanya bergantung gate jenis isi untuk menutup permintaan lintas situs|**Diperbaiki.** Helper `isCrossSite()` (`src/lib/rateLimit.ts`) menolak permintaan yang membawa `Sec-Fetch-Site: cross-site` atau `Origin` yang bukan origin sendiri, dipakai di `events`, `strips`, dan `relays`|
|low|`rate_key` peristiwa memakai garam dan bentuk hash yang sama dengan `strips`/`relays`, sehingga pemegang akses basis data bisa menyambungkan timeline peristiwa ke baris strip berisi foto lewat kunci pseudonim yang stabil; teks halaman Privasi tidak menyebut konsekuensi itu|**Diperbaiki.** `rateKeyFor()` menerima `scope`; rute peristiwa memakai scope `events` sehingga hashnya berbeda untuk alamat yang sama (nilai lama tidak berubah karena scope bawaannya kosong). Halaman Privasi mendapat bagian "Hitungan peristiwa": apa yang dicatat, tanpa cookie, dan retensi 90 hari sidang terpisah|
|low|Peramban/permintaan ketiga yang bersamaan pada estafet `complete` bisa menerima draf yang kalah balapan (id + URL unggah) sebelum draf itu dibuang; berkas yang diunggah ke path itu menjadi yatim permanen karena pembersih hanya menghapus path yang dirujuk baris|**Diperbaiki.** Gerbang `relays.strip_id` dibaca lebih dulu daripada pencarian lewat `relay_id` di `complete`, `strip`, dan `DELETE`; baris yang belum terlihat dibaca ulang beberapa kali sebelum gerbangnya dibuka (pemenang menulis gerbang sebelum barisnya), dan pembuangan draf yang kalah jadi best-effort supaya jawabannya tidak jatuh jadi 500. Konsekuensinya dicatat: satu estafet boleh punya lebih dari satu baris `strips` bila baris lamanya batu nisan, yang dijaga adalah satu strip aktif per estafet|
|low|Tiga uji ber-link (`share`, `live`, `a11y`) memakai sidang pembatasan laju bawaan yang sama, sehingga 3 baris per jalankan terhadap kuota 10 per jam bisa habis setelah empat jalankan dalam satu jam|**Diperbaiki.** Ketiganya memanggil `pasangSidangBaru()` seperti uji estafet|
|note|CSP, `noindex`, dan `no-referrer` tidak punya asersi otomatis: satu suntingan bisa menghapusnya tanpa ada uji yang gagal|**Diperbaiki.** Uji baru di `e2e/crossbrowser.spec.ts` memeriksa CSP di `/` (memuat `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `wasm-unsafe-eval`, dan tanpa `'unsafe-eval'` di server produksi) serta `X-Robots-Tag` dan `Referrer-Policy` di `/s/[id]`. Uji ini berjalan di chromium, firefox, dan webkit|
|note|Komentar dan dokumen mengklaim "satu estafet hanya punya satu strip", padahal batu nisan penghapusan memang boleh menyisakan baris kedua|**Diperbaiki.** Komentar rute dan kalimat `docs/DECISIONS.md`/`ARCHITECTURE.md` diubah menjadi "satu strip aktif per estafet"|
|note|Angka rasio PRD §4 lebih longgar daripada yang disiratkan: `download_png` dan `relay_completed` dihitung per klik (bukan per sesi), jadi rasio #1 dan #3 bisa melewati 100%; rasio #2 memakai semua foto, sedangkan PRD menyebut sesi dengan gesture menyala|**Diperbaiki sebagian.** `download_png` kini dijaga sekali per kunjungan halaman Result (seperti `live_enabled`); rasio #2 tetap batas bawah dan itu dicatat di kalimat "Catatan kejujuran angka", bersama catatan bahwa jalankan pengembangan dan pengujian gated menulis ke tabel yang sama sehingga rasio baru bermakna setelah rilis|
|note|Siklus `POST complete` → `DELETE /api/strips/[id]` → `POST complete` mencetak baris `strips` baru tanpa menyentuh kuota, karena draf relay memakai `rate_key: ""`|**Diterima, dicatat.** Sama dengan penerimaan M8: barisnya tetap dibersihkan (batu nisan 3 jam, draf basi 24 jam) dan untuk berputar tetap dibutuhkan token estafet plus token hapus. Bila kelak perlu, tambahkan hitungan baris per `relay_id` di rute `complete`|
|note|Larangan lintas situs pada rute lama belum menutup permintaan tanpa header (`Origin`/`Sec-Fetch-Site` tidak ada) dan pembatasan laju tetap per alamat, bukan global|**Diterima, dicatat.** Pola yang sama sudah dicatat sejak M6 (`x-forwarded-for` hop pertama bisa dipalsukan bila proxy hanya menambahkan); di Vercel `x-real-ip` ditimpa platform|

Titik yang dinyatakan benar oleh peninjau: gerbang pemenang tunggal tidak bisa macet dan tidak bisa dipakai mengambil alih strip estafet lain; indeks unik parsial mencegah dua relay berbagi strip; bentuk balasan `claimed → complete` tidak berubah; token diverifikasi sebelum semua pembacaan; CSP memuat setiap origin dan jenis sumber yang benar-benar dipakai aplikasi dan gagal-tertutup bila env Supabase cacat; `'unsafe-eval'` hanya ada di pengembangan; `frame-ancestors` kini berlaku di seluruh rute tanpa menimpa header halaman pribadi; tabel `events` tidak menyimpan identitas langsung dan anggaran baris tersimpannya tidak bisa dilewati permintaan serentak; satu-satunya host luar adalah Supabase milik aplikasi sendiri; dan kode klien baru tidak pernah mengirim foto, klip, teks, atau isi strip.



### Audit aksesibilitas (axe, keyboard, zoom)

|Pemeriksaan|Hasil|
|---|---|
|axe otomatis|`npx playwright test e2e/a11y.spec.ts` → **18 lolos, 2 dilewati** di server produksi. Cakupannya 9 halaman × 2 viewport (360 dan 1280 px): welcome, privasi, pilih layout, ambil foto, hias, hasil, `/s` 404, `/r` 404, dan galeri `/dev/ui` (dua uji itu dilewati di produksi karena galerinya memang tidak dirender). Batasnya nol pelanggaran, lebih ketat daripada syarat "tanpa tingkat serius atau kritis"|
|axe pada halaman ber-link|Dua uji baru di bawah gerbang `SUPABASE_E2E=1`: `/s/{id}` strip lengkap dan `/r/{id}` status menunggu teman, memakai alur pembantu yang sama dengan `share.spec.ts` dan `relay.spec.ts` (dipindah ke `e2e/helpers.ts` supaya tidak diduplikasi). Hasil: **20 lolos, 0 gagal** di server pengembangan. Halaman estafet diaudit dari konteks browser kedua tanpa token, karena konteks pembuat menampilkan keadaan "menunggu teman"|
|Temuan axe di galeri `/dev/ui`|Galeri komponen hanya dirender di server pengembangan, dan di sanalah auditnya menemukan pelanggaran **kritis** `button-name`: dua sakelar contoh tanpa nama aksesibel (`#gesture` dan satu sakelar nonaktif). **Diperbaiki**: keduanya diberi `aria-label` ("Gesture Snap", "Strip Hidup"), sejalan DESIGN-SYSTEM §9 yang mewajibkan sakelar punya teks keadaan dan kontrol punya nama. Dua uji audit galeri (360 dan 1280 px) hijau setelahnya, dan di server produksi keduanya dilewati karena galerinya memang tidak dirender|
|Keyboard seluruh alur|`e2e/keyboard-flow.spec.ts` (baru): Welcome → pilih layout → izin kamera → 4 foto lewat Spasi → hias → hasil → dialog persetujuan QR ditutup dengan Esc → unduh PNG, **tanpa satu pun `page.mouse`**. Fokus dipindah dengan Tab; radio layout dan pil pilihan hiasan digerakkan panah|
|Temuan keyboard|Grup pil `ToggleGroup` Radix hanya menjadikan pil terpilih sebagai tab stop, dan panahnya bergerak dengan satu tekanan tersendat. Uji karena itu memakai panah sampai fokus benar-benar pindah (loop berbatas) dan kembali ke pil lain dengan fokus terprogram, pola yang sama dengan uji keyboard lama di `customize.spec.ts`. Tidak ada masalah aksesibilitas yang ditemukan: pil bisa dicapai dan diaktifkan dengan keyboard|
|Zoom 200%|Diperiksa dengan CDP `Emulation.setPageScaleFactor(2)` (browser tool) pada `/`, lalu setara zoom desktop (jendela 1280 px melihat ruang CSS 640 px) dan pembesaran teks 200% pada `/`, `/booth/capture`, `/booth/customize`. Hasil: `scrollWidth == clientWidth` di semua kombinasi (tidak ada luber horizontal) dan aksi utama tetap di dalam layar. Tangkapan layar: `test-results/zoom-*.png`|
|Pembaca layar|Belum diverifikasi (tidak ada pembaca layar di mesin ini); langkahnya masuk tabel manual pengguna di bawah|

### Kinerja (PRD §8)

Alat: Lighthouse 13 dengan preset bawaan seluler (CPU 4× lebih lambat, jaringan 4G lambat tersimulasi) di server produksi. Skrip baru: `npm run perf:lcp`.

|Ukuran|Target PRD §8|Hasil|Selisih|
|---|---|---|---|
|LCP Welcome|di bawah 2,5 detik|**3,17 detik** (median tujuh jalankan di server produksi **lokal** `next start`: 3028 sampai 3188 ms; angka terakhir 3062 ms)|**+670 ms di server lokal**; di produksi Cloudflare targetnya tercapai (median 2,4 detik, lihat "Langkah 1 rencana" di bawah)|
|Skor kinerja Lighthouse|—|92 sampai 94|—|
|FCP / TBT / CLS|—|917 ms / 76 sampai 116 ms / 0|—|
|Ekspor strip sampai siap unduh|di bawah 2 detik|**895 sampai 971 ms** (median 922 ms dari enam jalankan `e2e/perf.spec.ts` di server produksi; jalankan di server pengembangan 1135 ms)|Tercapai|
|Unduh setelah klik|—|22 sampai 43 ms|—|

Satu putaran optimasi terbatas sudah dijalankan sesuai rencana: `font-display` keluarga display diubah ke `optional` (LCP elemennya judul hero `display-xl` dari Unbounded). Hasilnya **tidak berbeda** (median 3,17 detik), karena yang menahan LCP bukan penggantian fon melainkan biaya gambar judul hero (1170 ms `element render delay` di jejak dengan CPU 4× lebih lambat) plus rebutan lebar pita dengan bundel JS. Pengaturannya dikembalikan ke `swap` supaya tipografi merek tidak jatuh ke fon cadangan di kunjungan pertama yang lambat.

Rencana untuk selisih 670 ms (dipilih pengguna sebelum dianggap selesai):

1. **Kurangi JS Welcome.** Terukur: 182 KB dari 304 KB total. Dua potongan terbesar 71 KB (runtime React/Next) dan 45 KB (kerangka + UI bersama). Kandidat: pindahkan `<Toaster />` dari root layout ke layout booth (sonner tidak dipakai Welcome), dan muat `GalleryPicker` di belakang interaksi seperti `CustomizeEditor`.
2. **Uji di perangkat sungguhan** (HP Android kelas menengah + 4G) sebelum mengubah desain. Preset seluler Lighthouse mensimulasikan 4G *lambat* (1,6 Mbps, RTT 150 ms), lebih pesimistis daripada definisi "4G" di PRD; median di perangkat sungguhan bisa saja sudah di bawah 2,5 detik.
3. **Bila masih lewat:** hero `display-xl` memakai `-webkit-text-stroke` dan `text-shadow` keras yang mahal digambar. Menggantinya adalah perubahan DESIGN-SYSTEM, jadi harus diusulkan ke pengguna dulu, bukan dikerjakan diam-diam.

Status 16 Oktober 2026: langkah 1 dikerjakan, dan setelah pengukuran di produksi targetnya ternyata sudah tercapai di sana sehingga langkah 2 dan 3 tidak diperlukan untuk memenuhi target. Rincian, angka, dan bukti bundelnya di subbagian "Langkah 1 rencana" di bawah.

Ukuran bundel per rute (transfer terkompresi, cache dimatikan, server produksi):

|Rute|JS|CSS|Fon|Lain|Total|
|---|---|---|---|---|---|
|`/`|182 KB|14 KB|91 KB|17 KB|304 KB|
|`/privasi`|182 KB|14 KB|91 KB|24 KB|312 KB|
|`/booth/layout`|178 KB|14 KB|91 KB|17 KB|301 KB|
|`/booth/capture`|301 KB|14 KB|91 KB|24 KB|431 KB|
|`/booth/customize`|307 KB|14 KB|91 KB|44 KB|457 KB|
|`/booth/result`|307 KB|14 KB|91 KB|27 KB|439 KB|
|`/s/{id}` (404)|233 KB|14 KB|91 KB|27 KB|366 KB|
|`/r/{id}` (404)|238 KB|14 KB|91 KB|27 KB|371 KB|

Catatan: Next.js 16 **menghapus metrik `size` dan `First Load JS`** dari keluaran `next build` (dokumentasinya menyebut keduanya tidak akurat untuk arsitektur server-driven). Karena itu tabel di atas diukur dari peramban sungguhan (`performance.getEntriesByType("resource")` dengan `Network.setCacheDisabled`), bukan disalin dari keluaran build. Yang tetap terjaga: modul kamera/gesture (301 KB) dan Konva (307 KB) hanya muncul di rutenya sendiri, dan uji "konva tidak ikut termuat di `/` dan `/booth/capture`" tetap hijau.

#### Langkah 1 rencana (dikerjakan 16 Oktober 2026)

Perubahan: `sonner` dikeluarkan dari jalur kritis Welcome. Root layout kini merender `DeferredToaster` (`src/components/ui/deferred-toaster.tsx`: `next/dynamic` dengan `ssr: false`), dan `GalleryPicker` mengimpor `sonner` secara dinamis di dalam `handleFiles` alih-alih di tingkat modul. Toaster tetap di root layout supaya toast yang dipicu tepat sebelum navigasi (Welcome → `/booth/capture`) tampil di halaman tujuan; `e2e/customize.spec.ts` ("dua foto galeri dilengkapi di kamera") menguji jalur itu dan tetap hijau. Tidak ada warna, token, tata letak, atau teks yang berubah.

Bukti bundel (pratinjau, `Network.setCacheDisabled`, snapshot pada `load` dan 2 detik sesudahnya):

|Ukuran|Sebelum|Sesudah|
|---|---|---|
|JS sebelum `load`|165,9 KB (8 berkas)|153,9 KB (7 berkas)|
|Chunk sonner|9,9 KB, diunduh sebelum `load`|9,9 KB (`3o_zaba4nwz_y.js`, 35.924 bita mentah), mulai 844 ms, sesudah `loadEventEnd` 823 ms|
|JS sampai 2 detik sesudah `load`|179,1 KB|181,2 KB|

Ukuran transfer per jenis (CSS, fon) tidak berubah. Di HTML produksi (9 skrip awal) tidak satu pun chunk memuat `data-sonner-toaster`.

Lighthouse preset seluler, lima jalankan per sel, angka median:

|Target|LCP sebelum|LCP sesudah|FCP sesudah|TBT sesudah|CLS sesudah|Skor sesudah|
|---|---|---|---|---|---|---|
|Produksi (`https://snapme.ikhsandyy-dev.workers.dev`)|2.388 ms|2.416 ms|1.066 ms|62 ms|0|97 (sebelum 98)|
|Pratinjau Cloudflare (`wrangler dev`)|3.737 ms|3.680 ms|1.104 ms|51 ms|0|88 (sebelum 87)|

Kesimpulan yang bisa dipertanggungjawabkan: **target LCP Welcome PRD §8 tercapai di produksi** (median 2,4 detik terhadap batas 2,5 detik), dan itu berlaku juga sebelum langkah 1. Dua angka lama berasal dari server lokal, bukan CDN: 3,17 detik dari `next start` dan 3,745 detik dari `wrangler dev`. Keduanya melebih-lebihkan selisihnya, jadi kalimat "selisih 670 ms" di bagian atas harus dibaca sebagai sifat server lokal. Langkah 1 tetap dikerjakan dan hasilnya nyata pada jalur kritis (JS sebelum `load` turun 12,0 KB dan chunk sonner tidak lagi ikut pra-`load`), tetapi tidak mengubah median produksi secara terukur: sebaran antarjalankan produksi 2.317 sampai 2.517 ms, jadi selisih 28 ms antara sebelum dan sesudah ada di dalam derau. Lima jalankan produksi "sebelum" memuat satu pencilan 3.897 ms pada jalankan pertama (cache kosong di mesin uji), yang tidak menggeser mediannya.

Langkah 2 (uji di perangkat sungguhan) dan langkah 3 (mengganti `-webkit-text-stroke`/`text-shadow` hero, perubahan DESIGN-SYSTEM) karena itu **tidak diperlukan** untuk memenuhi target ini; keduanya tetap tersedia sebagai rencana lanjutan bila pengukuran di perangkat nyata kelak menunjukkan sebaliknya.

### Uji lintas peramban

Proyek Playwright baru: `firefox` dan `webkit` (keduanya `testMatch: **/crossbrowser.spec.ts`). Berkas `e2e/crossbrowser.spec.ts` sengaja tidak menyentuh kamera (perangkat media palsu adalah bendera Chromium): alurnya lewat foto galeri sampai unduh PNG, plus pemeriksaan judul halaman statis dan dua panggung 404.

|Peramban|Hasil|
|---|---|
|Chromium (Desktop Chrome)|Lolos: berkas ini ikut proyek `chromium` yang memuat semua spec|
|Firefox|**2 lolos**|
|WebKit (Safari)|**2 lolos** (unduhan lewat `waitForEvent("download")` bekerja; `MediaRecorder` tidak diperlukan karena alur galeri tidak punya klip). Kemampuan merekamnya diperiksa terpisah: build WebKit milik Playwright **tidak** membawa `MediaRecorder` maupun `canvas.captureStream`, jadi tombol SH-03 di sana tersembunyi sesuai rancangan; Safari sungguhan belum diperiksa dan masuk tabel manual pengguna|
|Edge|**Dilepas dari suite**: `npx playwright install msedge` gagal di mesin ini ("insufficient privileges") dan Edge tidak terpasang. Mesinnya sama dengan Chromium (tercakup proyek `chromium`); verifikasi di Edge sungguhan masuk tabel manual pengguna|

### Daftar periksa DESIGN-SYSTEM §14

|Butir|Hasil|
|---|---|
|Komponen dari dasar §9|Lolos: tidak ada komponen baru di M9; halaman yang disentuh (`/`, `/booth/capture`, `/booth/customize`, `/booth/result`) memakai komponen yang sudah ada|
|Tidak ada nilai mentah di luar `globals.css`|Lolos: penjaga token lama tetap hijau, dan perubahan M9 tidak menambah nilai mentah (CSP dan `htmlLimitedBots` di `next.config.ts` bukan token tampilan)|
|Tepat satu aksi `primary` per layar|Lolos: tidak ada tombol baru; `/dev/ui` tetap galeri komponen di server pengembangan|
|Pasangan warna dari §2|Lolos: tidak ada warna baru; audit axe nol pelanggaran termasuk kontras|
|Keadaan memuat, kosong, galat, nonaktif|Lolos: kartu bagikan, dialog, dan halaman strip tetap punya keempatnya (diuji M6 sampai M8, suite tetap hijau)|
|Keyboard dan cincin fokus|Lolos: `e2e/keyboard-flow.spec.ts` menuntaskan seluruh alur tanpa mouse, ringkasan temuan panah ada di atas|
|`prefers-reduced-motion`|Lolos: uji `e2e/live.spec.ts` dan `e2e/capture.spec.ts` tetap hijau; tiga asersinya kini menunggu penggambaran ulang, bukan membandingkan tepat setelah klik|
|Rapi pada 360, 768, 1280 px|Lolos: audit axe pada 360 dan 1280 px nol pelanggaran; 768 px tercakup uji lembar bawah `customize.spec.ts` dan pemeriksaan zoom 200% (640 px setara). Perbandingan berdampingan dengan berkas acuan di `docs/ui-reference/` tidak diulang di M9 karena perubahan M9 memang tidak menyentuh tampilan: seluruh diff bekerja di `git diff --stat` tidak memuat berkas CSS atau token, dan suntingan JSX hanya berupa penangan peristiwa, atribut `aria-label`, serta pemanggilan analitik. Perbandingan berdampingan terakhir ada di M6 untuk halaman ber-acuan dan hasilnya tidak berubah|
|Label §12, tanpa emoji dan em dash|Lolos: label baru tidak ditambahkan; teks yang disentuh M9 hanya komentar kode|
|Pemeriksaan tampilan Welcome dan `/s/{id}`|Dijalankan di M6 dan tetap berlaku: M9 tidak mengubah hero, susunan, atau teksnya (perubahan hanya CSP, analitik, dan judul dokumen)|

### Tabel manual pengguna (belum diverifikasi)

|Butir|Langkah|Status|
|---|---|---|
|Gesture Snap (M3)|Buka `npm run dev`, pilih layout, izinkan kamera, angkat dua jari dan tahan 0,8 detik → hitung mundur mulai; telapak untuk ulang foto terakhir; jempol setelah semua slot terisi untuk lanjut ke hias. Uji di cahaya redup dan terang|Dikonfirmasi pengguna 16 Oktober 2026 di HP (rincian di tabel M3)|
|Chrome Android / Safari iOS / Edge dan Firefox sungguhan|Buka `/`, jalankan alur galeri sampai unduh di tiap peramban, catat yang gagal. Mesin WebKit dan Gecko sudah tercakup otomatis oleh proyek `webkit` dan `firefox`; yang belum diperiksa adalah sentuhan, kamera sungguhan, dan unduhan di perangkat|Menunggu pengguna|
|QR pada cetakan asli (M9 "Selesai bila")|`npm run dev`, buat strip dengan "QR di strip" menyala, tekan "Cetak 4R" pada kertas 4R, lalu pindai QR-nya dengan kamera HP → harus membuka `/s/{id}` dan menampilkan stripnya. Ulangi sekali di kertas biasa untuk membandingkan|Lolos: dikonfirmasi pengguna 16 Oktober 2026, QR cetakan terbaca kamera HP (printer/kertas tidak dirinci)|
|Pembaca layar|NVDA (Windows) atau VoiceOver (macOS) atau TalkBack (Android): jalankan alur dasar, periksa hitung mundur dan penghitung foto terumumkan (`aria-live`), HUD gesture terbaca (`role="status"`), dan padanan daftar stiker bisa dipakai tanpa kanvas|Menunggu pengguna|
|Deploy|Digantikan M10: Worker Cloudflare `snapme` ter-deploy (lihat Bukti verifikasi M10)|Selesai lewat M10|

## M10 Migrasi Cloudflare (9 Oktober 2026)

Perintah pengguna: pindahkan seluruh backend snapme dari Supabase/Vercel ke Cloudflare (D1, KV, R2) dan deploy ke Workers. Repo ini belum pernah dideploy (baris "Deploy ke Vercel" M9 masih "menunggu pengguna"), jadi tidak ada data produksi yang dimigrasikan: skema D1 dibuat segar dari `migrations/0001_init.sql`.

### Runtime: OpenNext, bukan `next-on-pages` atau vinext

|Kandidat|Kenapa tidak dipakai|
|---|---|
|Cloudflare Pages + `next-on-pages`|Adapter itu **deprecated**: Cloudflare memensiunkan alur Pages untuk Next.js SSR dan mengarahkan ke Workers|
|vinext (Vite + Next di Workers)|Masih beta; fon lewat CDN pihak ketiga (melanggar syarat "fon di-host sendiri" ARCHITECTURE §8) dan dukungan `cacheComponents`/PPR belum lengkap, padahal halaman `/s` dan `/r` bergantung padanya|
|**`@opennextjs/cloudflare` + `wrangler`** (dipakai)|Adapter matang milik tim OpenNext, mendukung `cacheComponents`/PPR dan `next/font` self-hosted, dikonfigurasi manual lewat `wrangler.jsonc` dan `open-next.config.ts`|

Worker-nya kustom (`worker.ts`) mengikuti panduan resmi OpenNext: `fetch` dari keluaran build, `scheduled` untuk Cron Trigger. Tidak ada cache tambahan di `open-next.config.ts` karena tidak ada ISR (Welcome statis, `/s` dan `/r` dinamis). Catatan penting: `cacheComponents`/PPR semula dipertahankan, tetapi runtime Worker menolaknya di bawah permintaan bersamaan sehingga opsi itu dilepas (lihat bagian "Cache Components/PPR dilepas" di bawah).

### Pemetaan Supabase/Vercel → Cloudflare

|Supabase/Vercel|Cloudflare|Catatan|
|---|---|---|
|Postgres + RLS (`service role` saja)|D1 (`binding DB`)|D1 hanya bisa dijangkau lewat binding Worker; RLS tidak dipindahkan karena tidak ada jalur anon. Seam-nya `src/lib/cloudflare.ts` dengan perilaku lama: env kosong → null → rute menjawab 503|
|Storage bucket `snapme`|Bucket R2 `snapme`|Akses hanya lewat URL presigned; CORS bucket dari `r2-cors.json` (origin 3000, 8787, produksi)|
|Signed upload / signed URL Supabase|`presignPut`/`presignGet` (aws4fetch, Signature V4 di query string)|Content-Type **ikut ditandatangani** pada PUT, jadi R2 menolak unggahan jenis lain; rute complete tetap memverifikasi hasilnya dengan `bucket.head` (pengganti "URL bertanda tangan lalu HEAD" yang dulu memakai jaringan)|
|RPC/kueri builder|Prepared statement D1 (`src/lib/db/*`)|Tiga gerbang atomik tetap: `claimRelayOnce`, `completeRelayOnce`, `setRelayStripOnce`, kebenarannya dibaca dari `meta.changes === 1`|
|Vercel Cron|Cron Trigger Workers (`triggers.crons` di `wrangler.jsonc`, `scheduled` di `worker.ts`)|Tanpa HTTP dan tanpa rahasia bersama; rute `GET /api/cron/purge` dipertahankan untuk pemicu manual dengan `Authorization: Bearer CRON_SECRET`|
|Env Vercel + `.env.local`|`vars`/`secrets` wrangler + `.dev.vars` + `R2_ACCOUNT_ID` di `.env.local`|`R2_ACCOUNT_ID` harus ada saat `next build` (CSP) **dan** saat runtime (`vars` wrangler) supaya direktif CSP produksi identik dengan hasil build|

### Dialek SQL dan skema

- Timestamp disimpan sebagai TEXT ISO-8601 UTC yang selalu diisi aplikasi (`new Date().toISOString()`), bukan default DB: perbandingan leksikografis pada format itu sama dengan kronologis, jadi indeks kedaluwarsa tetap bekerja tanpa fungsi.
- Lima migrasi Postgres digantikan satu `migrations/0001_init.sql`; DDL lamanya tetap ada di riwayat git. Perbedaan yang disengaja: `status` `strips` ikut memuat `deleted` (batu nisan M6), `relays.layout` dibatasi daftar tertutup, dan `slots` dijaga check `json_valid(slots) AND json_type(slots) = 'array'` (padanan jsonb).
- `relaySlotsOf` kini mem-parse teks JSON selain menyaring elemen cacat; perilakunya sama bagi pemanggil (baris cacat tidak menjatuhkan halaman atau menyandera pembersih).
- `rate_key` ditambahkan sebagai kolom penuh di `strips` dan `relays` (di Postgres pun ada sejak M6/M8) dengan indeks `(rate_key, created_at)` supaya hitungan kuota tidak memindai tabel.

### Kuota: tetap persis di D1 untuk strip/estafet, pindah ke KV untuk peristiwa

- `strips` dan `relays` tetap memakai pola M6/M9: hitung-setelah-sisip, pra-cek murah, lalu rollback baris bila kuota terlampaui. Hasilnya identik dengan versi Supabase, termasuk baris batu nisan yang tetap dihitung.
- Peristiwa analitik pindah ke KV dengan **jendela tetap per jam** (kunci `ev:{rateKey}:{floor(now/3600000)}`, TTL 2 jam). Alasan: tabel `events` terus tumbuh, sedangkan anggarannya telemetri; memindai tabel itu setiap beacon adalah biaya yang tidak sebanding. Konsekuensi yang diterima: (a) batasnya bergeser dari jendela bergulir ke batas jam, dan (b) dua permintaan serentak bisa melewati batas paling banyak satu batch (maksimal 20 peristiwa) karena penambahan dilakukan setelah INSERT tanpa rollback. Keduanya tidak menyentuh data pengguna dan tidak mengubah kuota strip/estafet.
- `rate_key` untuk peristiwa tetap memakai scope `events` (temuan M9), jadi nilai yang tersimpan tidak bisa disambungkan ke sidang `strips`/`relays`.

### Uji basis data: `getPlatformProxy`, bukan `@cloudflare/vitest-pool-workers`

Rencana awal memakai `@cloudflare/vitest-pool-workers`. Paket itu (0.23.0) masih mensyaratkan peer `vitest ^4.1.0` sementara proyek ini vitest 5.0.3, dan ia memaku `wrangler 4.124.0` sebagai dependensi sendiri. Memaksanya lewat `--legacy-peer-deps` berarti menjalankan pool yang tidak didukung vitest 5, jadi pool-nya dilepas.

Gantinya: harness `tests/db/harness.ts` memakai `getPlatformProxy` dari wrangler, API resmi untuk mengakses binding dari Node. Hasilnya real miniflare/workerd tanpa mock SQL: `tests/db/{strips,relays,events}.test.ts` menguji rute sungguhan di atas D1/R2/KV sungguhan, dengan migrasi yang sama (`migrations/0001_init.sql`) diterapkan di awal berkas uji. Berkas lama yang memakai klien Supabase palsu dihapus, bukan dipinjamkan.

Catatan teknis: `D1Database.exec()` memecah masukan per baris, jadi harness merapatkan pernyataan (dan membuang komentar penuh-baris) sebelum menjalankan migrasi.

### Penghapusan jalur lama

`vercel.json`, `supabase/` (config + lima migrasi), `src/lib/supabase/`, dan dependensi `@supabase/supabase-js` serta `@supabase/storage-js` dihapus, tanpa shim atau alias. Klien unggah (`features/share/api.ts`, `features/relay/api.ts`) sekarang `PUT` ke URL presigned; kontrak respons rute berubah dari `{ path, token }` menjadi `{ path, url }`. `next.config.ts` menyusun CSP dari `R2_ACCOUNT_ID` (bukan `NEXT_PUBLIC_SUPABASE_URL`), dan uji rahasia (`tests/client-bundle-secrecy.test.ts`) menjaga dua hal baru: tidak ada berkas `"use client"` yang mengimpor `@/lib/cloudflare`, `@/lib/db/`, `@/lib/r2/`, `@/lib/purge`, atau `@/lib/tokens`; dan tidak ada lagi `process.env.NEXT_PUBLIC_` di `src/`.

Proyek Supabase (ref `owdjkpzywzljnvuyfiui`) dan kaitan Vercel di dasbor dibongkar pengguna pada 10 Oktober 2026 setelah semua pemeriksaan hijau; tidak ada lagi layanan lama yang menagih atau menyimpan data. `.env.local` di mesin ini dibersihkan mengikuti itu: hanya `R2_ACCOUNT_ID` yang tersisa, karena kata sandi basis data Supabase sudah tidak ada gunanya (rahasia runtime ada di `.dev.vars` dan `wrangler secret`).

### Celah upstream OpenNext: manifest `preview-props.json` (tambalan kecil)

`@opennextjs/cloudflare` 1.20.10 (dan `@opennextjs/aws` 4.1.9) menyisipkan isi manifest Next ke dalam bundel Worker, karena workerd tidak punya `readFileSync`. Daftar manifestnya dibaca dari pola glob `**/{*-manifest,required-server-files,prefetch-hints}.json`. Next 16.4 menambah manifest baru, `preview-props.json`, yang dimuat saat `NextNodeServer` disusun: tanpa tambalan, setiap permintaan di Worker gagal dengan `Unexpected loadManifest(/.next/server/preview-props.json) call!` (terbukti saat putaran pratinjau pertama; seluruh rute menjawab 500).

Yang dipilih: `scripts/patch-opennext.mjs`, dijalankan dari `postinstall` dan dari setiap skrip build Cloudflare (`preview`, `preview:e2e`, `deploy` lewat `cf:patch`). Sifatnya idempoten, gagal berisik bila polanya berubah (tanda versi paket berganti), dan boleh dihapus begitu upstream memuat `preview-props` di polanya. Alternatif yang ditolak: memakai `patch-package` (menambah dependensi untuk satu baris) atau memakukan Next ke versi lama (belum tentu bebas masalah yang sama).

### Catatan operasional Windows

- `wrangler dev` memegang berkas di `.open-next`. `opennextjs-cloudflare build` menghapus folder itu di awal (`initOutputDir`) sehingga build **selalu** gagal dengan `EPERM: rmSync .open-next` bila ada pratinjau yang sedang jalan. Karena itu: hentikan `npm run preview`/`preview:e2e` (Ctrl+C) sebelum menjalankan `npm run test:e2e:cf` atau `npm run deploy`, dan jangan menjalankan dua proses pratinjau bersamaan.
- Jangan menyunting berkas atau menjalankan `next build`/`wrangler types` selama build OpenNext atau pratinjau berjalan. Satu putaran verifikasi pernah rusak karena build lain menghapus `.open-next` di bawah server yang sedang melayani: seluruh rute menjawab hang/500 dengan `Could not resolve ./.build/durable-objects/...` sampai server dihentikan dan dibangun ulang.
- `wrangler dev` bind ke `127.0.0.1`, bukan `::1`, jadi `playwright.cf.config.ts` memakai `http://127.0.0.1:8787` (alamat `localhost` bisa menembak IPv6 yang tidak ada isinya).

### Cache Components/PPR dilepas: runtime Worker menolaknya di bawah beban

Rencana M10 mempertahankan `cacheComponents: true`, `partialPrefetching: true`, `htmlLimitedBots: /.*/ `, dan dua `export const instant = false` (keputusan M6/M9), lalu menguji jalur PPR itu di `wrangler dev`. Putaran e2e Cloudflare membuktikan kombinasi itu tidak layak di runtime Worker:

- `next build` dan `opennextjs-cloudflare build` hijau, `/s/[id]` dan `/r/[id]` keluar sebagai PPR, dan permintaan tunggal dilayani normal (putaran pratinjau 31 pemeriksaan lulus dengan konfigurasi itu).
- Begitu beberapa permintaan berjalan bersamaan (4 worker Playwright), log `wrangler dev` mencatat galat dari mesin Cache Components Next (nama `CacheSignal` ada di jejaknya), yang memakai penanda waktu lintas permintaan sementara workerd melarangnya:

```
Error: Cannot perform I/O on behalf of a different request. I/O objects (such as
streams, request/response bodies, and others) created in the context of one request
handler cannot be accessed from a different request's handler. (I/O type: IoContext)
  at patchedClearImmediate
  at CacheSignal.pendingTimeoutCleanup
  at CacheSignal.beginRead
  at CacheSignal.trackRead
  at trackPendingImport
```

- Setelah galat pertama, Worker menjawab 500 `Internal Server Error` untuk permintaan berikutnya (snapshot halaman Playwright menunjukkannya) atau menggantung: 30 dari 33 uji e2e gagal. Jadi ini bukan satu permintaan yang tersendat, melainkan Worker yang rusak setelah galat itu. Peringatan Next sendiri sudah menyebutkannya: "Next.js cannot guarantee that Cache Components will run as expected due to the current runtime's implementation of `setTimeout()`".

Tindakan (persis kontingensi yang disiapkan di rencana M10): `cacheComponents`, `partialPrefetching`, dan `htmlLimitedBots` dilepas dari `next.config.ts`, dua `export const instant = false` dihapus, dan `await connection()` di `/s/[id]` serta `/r/[id]` dipertahankan supaya keduanya dirender dinamis per permintaan. Tanpa cangkang PPR, `notFound()` menjawab 404 sungguhan tanpa trik crawler, jadi `htmlLimitedBots` tidak lagi diperlukan. Konsekuensi yang diterima: tidak ada PPR/streaming metadata. Keputusan yang digantikan (tetap tercatat sebagai riwayat di M6 dan M9): `instant = false` dan `htmlLimitedBots: /.*/ `.

### Kesiapan uji e2e: TCP, bukan permintaan HTTP

`playwright.cf.config.ts` menunggu port TCP (`webServer.port`), bukan permintaan HTTP ke `/`. Sebabnya temuan berikut di `wrangler dev --env e2e`:

|Permintaan ke `/` di pratinjau|Hasil|
|---|---|
|`curl` (mengirim `User-Agent` dan `Accept`)|200|
|Node `http` dengan `User-Agent`|200|
|Node `http` tanpa header apa pun|500 atau menggantung|
|Node `http` hanya `Accept: */*`|menggantung|
|Node `http` hanya `Connection: close`|menggantung|

Artinya permintaan tanpa header `User-Agent` (persis yang dikirim pemeriksaan kesiapan Playwright) tidak dilayani dengan benar oleh proksi pratinjau, sedangkan peramban dan `curl` selalu mengirim UA. `/` dilayani dari aset tanpa kode snapme, jadi ini bukan jalur kode aplikasi. Pemeriksaan UA-less terhadap Worker produksi ditambahkan di putaran verifikasi produksi (hasilnya di tabel di bawah) supaya klaimnya tidak bergantung pada simulasi lokal.

### Sidang pembatasan laju: `cf-connecting-ip` lebih dulu

`clientKeyFromRequest` di `src/lib/rateLimit.ts` sekarang membaca `cf-connecting-ip` sebelum `x-real-ip`/`x-forwarded-for`, karena header itulah yang diisi Cloudflare di tepi dan tidak bisa dipalsukan klien (warisan `x-real-ip` dari penyedia sebelumnya tetap dibaca sebagai cadangan). Dampaknya pada uji: `wrangler dev` mengisi `cf-connecting-ip` untuk semua pemanggil, jadi helper `pasangSidangBaru` yang semula hanya memalsukan `x-real-ip` kehilangan efeknya dan seluruh uji berbagi satu kuota. Gejalanya: setelah 10 pembuatan link dalam satu jam, `POST /api/strips` menjawab **429** dan tujuh uji ber-jaringan gagal dengan pesan yang tidak menyebut kuota ("Link strip dibuat." tidak pernah muncul). Helper sekarang mengirim kedua header (`cf-connecting-ip` dan `x-real-ip`) supaya tiap uji punya sidang sendiri di pratinjau maupun di `next dev`; di produksi Cloudflare menimpa `cf-connecting-ip` di tepi, jadi pengiriman header itu oleh klien tidak bisa dipakai menipu pembatasan laju. Baris uji di D1 lokal dihapus sekali untuk mengembalikan kuota.

### Origin peramban versus host pratinjau (`isCrossSite`)

Rute POST menolak permintaan yang jelas datang dari situs lain dengan membandingkan `Origin` peramban terhadap origin `request.url`. Di `wrangler dev`, URL permintaan dinormalkan ke host `localhost`, jadi uji yang memakai `http://127.0.0.1:8787` membuat peramban mengirim `Origin: http://127.0.0.1:8787` sementara Worker melihat `http://localhost:8787`, dan setiap POST dijawab 400 (`Permintaan tidak valid`). Gejalanya menyesatkan: tombol "Buat Link dan Unggah" hanya tidak pernah selesai, tanpa pesan yang menyebut sebabnya (tujuh uji ber-jaringan gagal begitu).

Bukti terukur dari `POST /api/strips`: tanpa header `Origin` → 201; `Origin: http://localhost:8787` → 201; `Origin: http://127.0.0.1:8787` → 400; `Origin: https://snapme.example.workers.dev` → 400. `playwright.cf.config.ts` karena itu memakai `http://localhost:8787`. Kode produk tidak diubah: di produksi `request.url` adalah URL publik yang sama dengan yang dipakai peramban, dan itu diuji ulang di putaran produksi (POST dengan Origin `workers.dev` → 201, dengan Origin situs lain → 400).

### Unggahan R2 diblokir: header sidang ikut terbawa ke preflight CORS

Gejala: tujuh uji ber-jaringan gagal dengan pesan yang tidak menyebut CORS ("Link strip dibuat." dan "Link estafet dibuat." tidak pernah muncul), padahal `POST /api/strips` sendiri sudah dijawab 201. Konsol peramban akhirnya menyebut sebabnya:

```
Access to fetch at 'https://<account>.r2.cloudflarestorage.com/snapme/strips/<id>/still.png?...'
from origin 'http://localhost:8787' has been blocked by CORS policy: Response to preflight request
doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the
requested resource.
```

Sebabnya bukan daftar origin (preflight dari `curl`/`node` dengan `Origin: http://localhost:8787` dijawab 204 + ACAO), melainkan **header sidang uji**: helper `pasangSidangBaru` memakai `page.setExtraHTTPHeaders`, yang berlaku untuk *semua* permintaan halaman, termasuk PUT lintas origin ke R2. Preflight-nya jadi meminta `content-type, cf-connecting-ip, x-real-ip`, sedangkan `r2-cors.json` hanya mengizinkan `Content-Type`; R2 menolak preflight, dan peramban memblokir PUT. Terbukti dari header permintaan yang dicatat Playwright: `{"content-type":"image/png","cf-connecting-ip":"198.51.100.42","x-real-ip":"198.51.100.42"}`.

Perbaikan: helper menyisipkan header sidang hanya ke panggilan `/api/**` milik aplikasi (`page.route`), bukan ke semua permintaan. Daftar origin `r2-cors.json` tetap harus memuat origin aplikasi yang dipakai (`http://localhost:3000`, `http://localhost:8787`, `http://127.0.0.1:8787`, dan origin produksi setelah deploy pertama).

### Foto slot teman tidak termuat: respons `<img>` yang ter-cache menghalangi `fetch` CORS

Gejala: uji estafet gagal di `stage-overlay` (SE-05) dan tray teman kosong (`0/4`, "Butuh 4 foto lagi"), padahal halaman `/r/[id]` menampilkan foto pembuat dengan normal (permintaan `<img>` ke R2 dijawab 200) dan `POST /api/relays`/`claim`/`complete` semuanya berhasil.

Isolasi memakai satu URL presigned yang sama di satu peramban:

|Dari mana `fetch(url)` dijalankan|Hasil|
|---|---|
|Konteks teman, halaman `/r/[id]` (foto sudah tampil sebagai `<img>`)|`TypeError: Failed to fetch`|
|Konteks teman, halaman `/booth/capture`|`TypeError: Failed to fetch`|
|Konteks teman, halaman lain di konteks yang sama|`TypeError: Failed to fetch`|
|Konteks pembuat yang belum pernah memuat URL itu|**200**|

Sebabnya cache HTTP, bukan CORS bucket: `/r/[id]` memuat foto slot lewat `<img>` (mode no-cors, respons tanpa `Access-Control-Allow-Origin`), peramban menyimpannya, dan `fetch()` berikutnya ber-mode cors tidak boleh memakai entri cache itu sehingga gagal tanpa mencoba ulang ke jaringan. Permintaan sungguhan di konteks yang bersih dijawab 200, jadi preflight dan `Access-Control-Allow-Origin` R2 memang benar. Ini jalur yang nyata dialami pengguna (foto pembuat selalu tampil dulu di `/r/[id]` sebelum teman menekan "Ambil Giliran"), bukan gejala uji.

Perbaikan: `fetchSlotShots` di `src/features/relay/bootstrap.ts` memakai `fetch(url, { cache: "no-store" })`, jadi foto slot selalu diambil dengan permintaan cors yang sungguhan. URL-nya presigned dan berumur pendek, jadi tidak ada yang rugi dengan tidak di-cache.

### Bukti verifikasi M10

Statis dan uji:

|Pemeriksaan|Hasil|
|---|---|
|`npm run cf-typegen`|`cloudflare-env.d.ts` dibuat ulang dari `wrangler.jsonc` (termasuk binding `DB`, `BUCKET`, `RATE_LIMIT_KV`, `ASSETS`)|
|`npm run lint`|Hijau (berkas jadi `.open-next/` dan `cloudflare-env.d.ts` masuk daftar abaikan; `worker.ts` memakai satu komentar izin eksplisit untuk `@ts-ignore` yang memang disyaratkan adapter)|
|`npm run typecheck`|Hijau|
|`npm test`|23 berkas, **179 uji hijau**, termasuk 63 uji basis data baru di `tests/db/` (strips 23, relays 30, events 10) yang berjalan di atas D1/R2/KV miniflare sungguhan|
|`npm run build`|Hijau; `/s/[id]` dan `/r/[id]` keluar sebagai rute dinamis (ƒ) karena PPR dilepas di bagian di atas|
|`opennextjs-cloudflare build`|Hijau; bundel Worker tersimpan di `.open-next/worker.js`|
|`npm run test:e2e:cf`|**30 lolos, 3 dilewati, 0 gagal** terhadap `wrangler dev --env e2e` (D1/KV lokal, R2 remote). Tiga yang dilewati adalah jalur "server tanpa binding" yang memang tidak berlaku saat binding ada. Perbaikan yang menyertainya: assertion Supabase-era di `e2e/live.spec.ts` (`/\/storage\//` menjadi host R2), URL dev yang di-hardcode di `e2e/relay.spec.ts` (`http://localhost:3000` menjadi relatif terhadap baseURL), dan helper `pasangSidangBaru` yang kini menyisipkan header sidang hanya ke `/api/**`|
|`npm run perf:lcp` (Lighthouse preset seluler, 5 jalankan)|Median **LCP 3,745 detik**, FCP 1,11 detik, TBT 44 ms, CLS 0, skor 0,87. Pembanding M9 di `next start`: LCP 3,17 detik. Angka ini diukur terhadap `wrangler dev` (workerd lokal dan koneksi R2 jarak jauh), bukan CDN produksi, jadi selisihnya indikatif dan bukan regresi yang terbukti. Tidak ada syarat target baru di milestone ini. Produksi Cloudflare sendiri diukur 16 Oktober 2026: median LCP **2,416 detik** (5 jalankan, 2.317 sampai 2.517 ms), FCP 1,066 detik, TBT 62 ms, CLS 0, skor 97, jadi di CDN target LCP PRD §8 tercapai (rinciannya di "Langkah 1 rencana" M9)|
|cron harian di dasbor|Dikonfirmasi pengguna 16 Oktober 2026: Cron Trigger `0 3 * * *` terlihat di Workers & Pages > snapme > Settings > Triggers. Pencatatannya milik pengguna karena dasbor tidak dibuka dari CLI|
|Deploy ulang (16 Oktober 2026)|Version ID `2dc38bdb-25ce-4016-a0ad-34423c94cbf9` (menggantikan `26c7f70b-…`), `schedule: 0 3 * * *` terdaftar ulang saat deploy, `GET /` 200, 9 skrip awal di HTML produksi tidak ada yang memuat `data-sonner-toaster`. Deploy ini membawa perubahan langkah 1 LCP dan perbaikan `e2e/share.spec.ts`|

Putaran pratinjau (`wrangler dev --env e2e`: D1/KV lokal, R2 **remote** sungguhan) memakai skrip buang yang menjalankan 31 pemeriksaan, semuanya lulus:

|Pemeriksaan|Hasil|
|---|---|
|`POST /api/strips` 201 + `upload.url`/`liveUpload.url` presigned (R2 + `X-Amz-Signature`)|Lulus|
|`PUT` presigned still (PNG) dan klip (WebM) ke R2 sungguhan|200 / 200|
|`POST complete` 200 + `expiresAt`; `GET /s/{id}` 200 memuat `<img>` dan `<video>`|Lulus|
|Tautan unduh ber-`response-content-disposition`: GET 200, `attachment; filename="snapme-<id>.png"`, isi bita identik dengan yang diunggah|Lulus|
|`DELETE` 204; `GET /s/{id}` ulang 404; objek R2 sudah tidak ada (GET presigned 404)|Lulus|
|Estafet: `POST /api/relays` 201 + URL presigned hanya slot pembuat; PUT slot 0/2|Lulus|
|Dua `claim` serentak → tepat satu 200 dan satu 409|Lulus|
|`complete` pertama 422 + URL segar slot tamu; PUT slot 1/3; `complete` kedua 200 + `stripId` + URL PNG; strip hasil diunggah dan dilengkapi; `GET /s/{stripId}` 200|Lulus|
|`POST /api/relays/{id}/strip` 200 untuk token pembuat, `role: host`, empat slot ber-URL presigned|Lulus|
|`POST /api/events` 25 batch × 8 = 200 peristiwa → 204 semua, batch ke-26 → 429|Lulus|
|`GET /api/cron/purge` tanpa bearer 401, dengan bearer 200 `{"purged":0}`|Lulus|
|Cron Trigger lokal (`/cdn-cgi/local/scheduled`) menjalankan `scheduled` di `worker.ts` → 200|Lulus|
|Bit identik setelah unggah: PUT presigned 200, objek dibaca kembali lewat S3 API, 68 bita sama, `content-type: image/png` (Content-Type yang ditandatangani tersimpan)|Lulus|
|Bucket dibersihkan setelah verifikasi (17 objek uji dihapus, sisa 0)|Lulus|

Putaran produksi setelah `npm run deploy` (Worker `snapme`, URL `https://snapme.ikhsandyy-dev.workers.dev`, Version ID `26c7f70b-1280-4066-aaca-826f9e8f7c0c`, cron `0 3 * * *` terdaftar di keluaran deploy): 15 pemeriksaan, 14 lulus pada jalankan pertama. Satu yang gagal adalah **kesalahan skrip verifikasi** (objek yang dibaca memang belum pernah diunggah), bukan temuan aplikasi; bukti bit-identiknya diambil ulang dan lulus.

|Pemeriksaan produksi|Hasil|
|---|---|
|`GET /` 200 dengan isi|47.206 bita|
|`GET /s/{id-acak}` 404 + halaman "Halaman tidak ditemukan."|Lulus (404 sungguhan dari Worker)|
|`POST /api/strips` dengan `Origin` situs lain|400|
|`POST /api/strips` dengan `Origin` workers.dev|201|
|`PUT` presigned lalu `complete` lalu `GET /s/{id}` dengan `<img>`|200 / 200 / 200|
|Preflight R2 dari origin produksi|204 dengan `Access-Control-Allow-Origin: https://snapme.ikhsandyy-dev.workers.dev`|
|`POST /api/relays` lalu dua `claim` serentak|201, lalu 200 dan 409|
|`POST /api/events`|204|
|`GET /api/cron/purge` tanpa bearer lalu dengan bearer|401 lalu 200 `{"purged":0}`|
|`GET /` **tanpa** header `User-Agent`|**200**, jadi hambatan UA-less sebelumnya memang hanya proksi `wrangler dev`, bukan Worker produksi|
|`DELETE /api/strips/{id}`|204|
|`PUT` presigned lalu dibaca kembali lewat S3 API|200 dan **bit identik** (68 bita, `image/png`)|
|`npx wrangler d1 execute snapme-db --remote`|`strips` 3, `relays` 1, `events` 1 (baris uji nyata dari Worker produksi)|
|cron harian|Terdaftar saat deploy (`schedule: 0 3 * * *`); jalur `scheduled`-nya sudah dibuktikan di pratinjau lewat `/cdn-cgi/local/scheduled`|

Daftar periksa DESIGN-SYSTEM §14: M10 tidak menambah atau mengubah tampilan apa pun (pekerjaannya backend, konfigurasi deploy, dan dua perbaikan perilaku klien: `cache: "no-store"` pada pengambilan foto slot serta penyempitan header sidang uji). Tidak ada komponen, token, warna, label, atau teks baru, jadi daftar periksa M9 tetap berlaku dan tidak ada butir baru untuk diperiksa.

Catatan alat: `npx wrangler r2 object get snapme/<kunci-ber-garis-miring>` melaporkan `The specified key does not exist` di wrangler 4.149.0 walau objeknya ada dan terbaca lewat S3 API maupun URL presigned (kunci tanpa `/` tidak diuji). Karena itu bukti bit identik memakai S3 API (`aws4fetch`) dengan kredensial yang sama; ini celah CLI, bukan celah R2, dan tidak memengaruhi aplikasi.

## Catatan uji: `share.spec.ts` tidak mematikan Gesture Snap (16 Oktober 2026)

Gejala: `npm run test:e2e:cf` gagal di `[cloudflare] › share.spec.ts:43:7` ("sakelar QR menyalakan kotak QR di kanvas dan pemberitahuan izin"). Dua jalankan penuh gagal pada langkah berbeda di uji yang sama (`page.waitForURL("**/booth/customize")` di `masukHias`, lalu `expect(sakelar).toBeChecked()`), keduanya dengan `Test timeout of 30000ms exceeded`; menjalankan `share.spec.ts` sendirian selalu hijau.

Isolasi: setiap berkas spek lain mematikan Gesture Snap lewat `matikanGesture` di `test.beforeEach` (a11y, capture, customize, live, relay, result, session). `share.spec.ts` satu-satunya yang tidak, jadi alur kamera empat fotonya menjalankan model MediaPipe di Chromium headless tanpa GPU. Inferensi gesture menahan main thread, dan uji 30 detik itu melewati batasnya saat mesin sibuk (spek ini berjalan terakhir di proyek `cloudflare`, sesudah estafet).

Bukti ini bukan regresi kode baru: dengan perubahan langkah 1 LCP di-`git stash`, `npm run test:e2e:cf` pada kode sebelum perubahan gagal pada uji yang sama, di langkah yang berbeda lagi.

Perbaikan: `test.beforeEach` + `matikanGesture` di `e2e/share.spec.ts`, sama seperti spek lain. Cakupan gesture tidak berkurang: `e2e/gesture.spec.ts` tetap menguji model dimuat dari origin sendiri tanpa membawa gambar, sakelar mati, pilihan diingat, dan jalur gagal muat. Setelah perbaikan, `npm run test:e2e:cf` hijau dua kali berturut-turut (30 lolos, 3 dilewati, 0 gagal).

## Repositori publik: lisensi MIT, permukaan repo, dan artefak lokal (16 Oktober 2026)

Keputusan: repositori ini dinyatakan **open source dengan lisensi MIT** dan dilengkapi permukaan repo yang layak dibaca orang luar, tanpa menyentuh kode produk. Pekerjaan ini di luar daftar milestone, jadi tidak ada kotak centang `MILESTONES.md` yang berubah.

| Keputusan | Isi | Alasan |
|---|---|---|
| Lisensi | `LICENSE` (MIT), `license`, `author`, `homepage`, `repository`, `bugs`, `keywords`, dan `engines` di `package.json` | Permintaan pengguna. Pemegang hak cipta awalnya diambil dari `PRD.md` ("Pemilik: Rori Setiawan"), lalu dikoreksi menjadi **Ikhsan Dyy** pada catatan paling bawah berkas ini; `private: true` dipertahankan karena paket ini aplikasi dan tidak diterbitkan ke npm |
| README | `README.md` baru, bahasa Inggris, dengan lencana, demo, fitur, privasi, perintah, konfigurasi, tata letak repo, dan tautan dokumen | Sebelumnya root repo tidak punya README sama sekali. Mengikuti pola `paperdraw`: README berbahasa Inggris, dokumen kerja berbahasa Indonesia |
| Berkas komunitas | `.github/CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1), `SECURITY.md`, `pull_request_template.md`, `dependabot.yml`, dan tiga `ISSUE_TEMPLATE` | Pola yang sama dengan `paperdraw`. Isinya disesuaikan: perintah npm snapme, gerbang `DESIGN-SYSTEM.md §14`, label tetap §12, dan larangan pihak ketiga |
| CI | `.github/workflows/ci.yml`: job `checks` (lint, typecheck, `npm test`, build) dan job `e2e` (`npx playwright test` di chromium, firefox, webkit) | Gerbang "Selesai berarti" (lint, typecheck, uji, build) dijalankan otomatis. Unggahan artefak laporan hanya saat gagal |
| Versi Node | `.nvmrc` berisi `24`, `engines.node` `>=20` | Mesin pengembangan memakai Node 24 dan CI memakai versi yang sama |
| CHANGELOG | `CHANGELOG.md` merangkum M0 sampai M10 per milestone beserta hash commit | Satu milestone satu commit, jadi riwayatnya bisa diaudit dari changelog |
| Gambar referensi pihak ketiga | `docs/ui-reference/referensi_uiux.webp` dilepas dari indeks git (`git rm --cached`), berkasnya tetap ada di perangkat, dan alasannya dicatat di `docs/ui-reference/README.md` | Isinya kumpulan tangkapan layar produk photobooth lain, lengkap dengan merek Fujifilm, harga, foto pelanggan, dan tangkapan layar pembayaran. Menyebarkannya ulang bertentangan dengan batasan "Batas aman" repo (tanpa nama, logo, atau aset Fujifilm; tanpa wajah orang tanpa izin) dan berisiko hak cipta. Arah gayanya sudah terkunci di token `DESIGN-SYSTEM.md §2` dan berkas HTML di folder yang sama |

Yang **tidak** diubah dan alasannya:

- `wrangler.jsonc` dan `cloudflare-env.d.ts` tetap memuat ID akun, ID basis data D1, dan ID namespace KV yang sungguhan. Ketiganya pengenal, bukan kredensial: tanpa API token tidak ada yang bisa dibuka, dan `SECURITY.md` menyatakannya. `cloudflare-env.d.ts` tetap ikut di-commit supaya `npm run typecheck` jalan di klon bersih tanpa `npm run cf-typegen`.

Bukti pemeriksaan:

| Pemeriksaan | Hasil |
|---|---|
| `git log --all --diff-filter=A -- .dev.vars .env.local` | Kosong: kedua berkas tidak pernah masuk riwayat git |
| `git grep -IE 'eyJ[A-Za-z0-9_-]{10,}\.'` pada seluruh revisi | Tidak ada token mirip JWT di riwayat |
| Pola kredensial (`AKIA`, `sk-`, `ghp_`, `glpat-`, `service_role`, `api_key`, `password` dengan nilai) pada seluruh revisi | Satu-satunya hasil adalah nilai uji di `tests/db/relays.test.ts` (`"rahasia-pembersih"`), bukan kredensial |
| URL `*.supabase.co` pada seluruh revisi | Tidak ada. Berkas `src/lib/supabase/*` dari M6 memang ada di riwayat lama, tetapi tanpa URL, kunci, atau `.env` |
| `git status --porcelain --ignored` | `test-results/`, `tsconfig.tsbuildinfo`, dan `docs/ui-reference/referensi_uiux.webp` sekarang terabaikan |
| `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` | Lolos: 23 berkas uji, 179 tes lulus, build sukses |
| `npx playwright test` (chromium, firefox, webkit) | 66 lulus, 8 dilewati (spek ber-binding dijalankan `npm run test:e2e:cf`), 0 gagal |

Yang perlu diputuskan pengguna:

- **Riwayat git masih memuat `referensi_uiux.webp`** dari commit M0. Melepasnya dari indeks hanya membersihkan versi berikutnya; menghapusnya dari riwayat butuh penulisan ulang riwayat dan `git push --force`. Selama belum ditulis ulang, berkasnya masih bisa diunduh dari commit lama.
- Nama pemegang hak cipta di `LICENSE` memakai nama di `PRD.md`. Ganti bila yang berlaku adalah nama lain atau nama badan.
- `DESIGN-SYSTEM.md §10` masih mencantumkan `referensi_uiux.webp` sebagai berkas di folder acuan. Penyelarasannya menunggu keputusan pengguna. README.md (baru) sudah tidak menyebut berkas itu.

## CI pertama gagal: tipe rute Next belum dibuat, jeda 300 ms, dan jalur artefak (16 Oktober 2026)

Gejala: run pertama di GitHub Actions (`38905443112`, commit `46faf03`) merah di kedua job. Job `checks` berhenti di langkah Typecheck dengan dua galat yang sama: `src/app/booth/layout.tsx(9,44): error TS2304: Cannot find name 'LayoutProps'` dan `src/app/layout.tsx(37,50)`. Job `e2e` berhenti di `e2e/keyboard-flow.spec.ts:122` (`seluruh alur selesai hanya dengan keyboard`): `getByTestId('countdown')` tidak pernah muncul dalam 15 detik; sisanya 66 lulus, 7 dilewati, 0 galat lain.

Tiga sebab, terpisah:

| Sebab | Bukti | Perbaikan |
|---|---|---|
| `LayoutProps` dan `PageProps` dihasilkan Next 16 ke `.next/types`, dan `tsconfig.json` memasukkannya. Di mesin pengembangan berkas itu sudah ada dari `next dev`/`next build`, jadi `tsc --noEmit` hijau di sana, tetapi klon bersih dan CI gagal | Direproduksi lokal: `.next` dipindahkan, `npm run typecheck` mengeluarkan tepat dua galat TS2304 yang sama; `npx next typegen` (perintah resmi Next 16, "Types generated successfully") lalu `tsc --noEmit` hijau | Skrip `typegen` (`next typegen`) ditambahkan, dan `typecheck` menjalankannya lebih dulu. Perintah dokumentasi `npm run typecheck` kini berdiri sendiri di klon bersih, tanpa langkah tambahan di CI |
| Mesin keadaan hanya menerima `SHOOT` pada fase `ready` (`SHOOTABLE_PHASES` di `machine.ts`), sedangkan `PAUSE_MS` 300 ms berjalan setelah tiap foto (GS-04). Spasi yang ditekan di dalam jeda itu hilang tanpa galat, jadi hitung mundur tidak pernah dimulai. Di runner CI, tekanan Spasi jatuh di jendela 300 ms itu | `machine.ts`: `pause: false` pada `SHOOTABLE_PHASES`, `PAUSE_MS = 300`, `FLASH_MS = 160`. Kegagalan hanya di CI, bukan di mesin pengembangan | Uji menunggu tombol "Ambil foto" aktif (`isBusy(phase)` bernilai salah hanya di luar `countdown`, `capturing`, dan `pause`) sebelum menekan Spasi |
| `handleKeyDown` di `CameraStage.tsx` mengabaikan Spasi yang datang dari elemen anak (`event.target !== event.currentTarget`). Tab bisa mendarat di elemen lain setelah video menyala, dan tekanannya lalu tidak melakukan apa pun | Kode `CameraStage.tsx`; kegagalan yang sama tanpa galat apa pun di halaman | Sebelum Spasi, fokus dipasang ke kontainer `role="group"` bernama "Area kamera" dan dipastikan dengan `toBeFocused()`. Pola memfokuskan elemen terprogram sudah dipakai uji yang sama untuk pil hiasan |

Tambahan: unggahan artefak gagal dengan "No files were found with the provided path: playwright-report", karena reporter `line` tidak menulis laporan HTML. Jalur unggahannya sekarang memuat `test-results` (trace, error context, tangkapan layar) dan `if-no-files-found: ignore`.

Retry Playwright sengaja **tidak** dipasang: uji yang gagal diperbaiki sebabnya, bukan ditutupi. Kalau nanti muncul flake baru tanpa sebab yang jelas, retry boleh dipertimbangkan sebagai jaring sementara dengan catatan di sini.

## CI kedua: langkah panah pil hiasan (16 Oktober 2026)

Gejala: run `38916264025` (commit `36cd264`). Job `checks` **hijau** (perbaikan `next typegen` bekerja). Job `e2e` masih merah, tetapi di tempat lain: `Error: Panah ArrowRight tidak sampai ke "Stiker"` dari `panahKe` (`e2e/keyboard-flow.spec.ts:64`, dipanggil dari baris 157). Langkah pemotretan yang sebelumnya gagal kini lulus; sisanya 66 lulus, 7 dilewati, 1 gagal.

Sebab: `panahKe` yang lama menekan panah sampai 12 kali berturut-turut lalu membandingkan nama fokus. Fokus roving Radix berpindah pada render berikutnya, jadi tekanan beruntun bisa habis tanpa satu pun berpindah. Ini bukan cacat produk: alur yang sama lulus di mesin pengembangan, dan lulus juga saat seluruh suite berjalan. Yang berbeda hanya beban runner.

Perbaikan yang dikerjakan:

| Perubahan | Alasan |
|---|---|
| `panahKe` berjalan satu pil tiap langkah: satu tekanan, lalu asersi bahwa pil tujuan langkah itu benar-benar fokus, diulang lewat `expect(...).toPass` sampai 15 detik | Tekanan yang hilang dicoba lagi, bukan dihitung sebagai kemajuan. Asersi per langkah juga menangkap fokus yang melompat dua pil |
| Fokus pil asal dipasang ulang di dalam tiap percobaan | Kalau fokusnya jatuh ke badan halaman, tekanan panah tidak melakukan apa pun dan percobaan sebelumnya hanya menghabiskan jatah |
| Urutan pil dibaca dari DOM (pil yang sedang fokus), bukan dari asumsi pil pertama | Walker-nya benar dari keadaan mana pun, jadi tekanan panah yang datang lebih awal dari tempat lain tidak merusaknya |

Bukti: satu tekanan panah nyasar disisipkan sementara sebelum pemanggilan `panahKe` untuk menguji daya pulihnya, dan uji tetap mendarat di pil Stiker (3 dari 3 jalankan berulang lulus); setelah tekanan nyasar dilepas, 3 jalankan berulang dan seluruh suite hijau (66 lulus, 8 dilewati, 0 gagal), `npm run lint` dan `npm run typecheck` hijau.

Pola yang terbaca dari dua kegagalan CI berturut-turut di uji yang sama: input keyboard yang datang sebelum render atau transisi selesai dianggap hilang oleh aplikasi, bukan salah. Uji yang menekan tombol lalu langsung mengasersi keadaan berikutnya sebaiknya menunggu keadaan antara, seperti yang kini dilakukan di langkah pemotretan dan langkah panah.

## Permintaan lanjutan: pemegang hak cipta, riwayat, proteksi branch (16 Oktober 2026)

Keputusan atas permintaan pengguna, semuanya di luar daftar milestone:

| Tindakan | Isi | Bukti |
|---|---|---|
| Pemegang hak cipta | **Ikhsan Dyy**, menggantikan nama yang tertulis di `PRD.md`. `LICENSE`, `author` di `package.json`, dan bagian License di `README.md` diperbarui (commit `5d867ed`) | `git show HEAD:LICENSE` |
| Rujukan gambar referensi | Tabel berkas di `DESIGN-SYSTEM.md §0` dan diagram folder `ARCHITECTURE.md §4` kini menyatakan `referensi_uiux.webp` tidak ikut di-commit | kedua dokumen |
| PR Dependabot #1 | Di-merge (squash) sebagai `8e42e33`: konva 10.8.0, motion 14.2.0, radix-ui 1.8.1, zod 4.6.7, @types/node 26.6.5, vitest 5.0.4, wrangler 4.150.0 | CI pada branch PR hijau sebelum merge; CI `master` hijau sesudahnya |
| Riwayat git ditulis ulang | `git filter-branch --index-filter 'git rm --cached --ignore-unmatch docs/ui-reference/referensi_uiux.webp' -- --all`, lalu `refs/original` dihapus, `git reflog expire --expire=now --all`, `git gc --prune=now` | `git log --all -- docs/ui-reference/referensi_uiux.webp` kosong; `git rev-list --objects --all \| grep -c referensi_uiux` = 0; blob `851e3ac` hilang dari basis objek; tree M0 hanya berisi `README.md`, `welcome.html`, `capture.html`, `customize.html` |
| Hash di dokumen | Penulisan ulang mengubah seluruh 23 hash, jadi 11 rujukan di `CHANGELOG.md` dan 2 rujukan commit di catatan CI diperbarui dari log hasil penulisan ulang (commit `1c9beca`) | `git log --format='%h %s'` |
| Force push | **Diblokir kebijakan lokal**: pola `git push*--force*` ditolak, dan guardrail itu sengaja tidak dilewati. Perintah untuk pengguna: `git push --force origin master` | percobaan push ditolak: `Blocked by bash pattern: git push*--force*` |
| Proteksi branch `master` | Wajib dua check CI ("Lint, typecheck, unit tests, build" dan "End-to-end (Playwright)", `strict` mati), tolak force push, tolak penghapusan, `enforce_admins` mati supaya pemilik tetap bisa push langsung dan menulis ulang riwayat bila memang perlu | `gh api repos/ikhsanddy/snapme/branches/master/protection` |
| Deskripsi dan topik repo | Satu kalimat deskripsi dan enam topik (`photobooth`, `nextjs`, `cloudflare-workers`, `mediapipe`, `konva`, `privacy`) dipasang lewat `gh repo edit` | API repo: `description` dan `topics` terisi |
| Cache Turbopack basi | Setelah `npm ci` mengganti `node_modules`, `npm run build` gagal dengan 15 galat `Module not found: @vercel/turbopack-next/internal/font/google/font`. Itu cache `.next` yang basi, bukan regresi paket: dengan `.next` dihapus, build hijau (exit 0), dan CI pada commit yang sama juga hijau. Jadi: setelah `npm ci`, hapus `.next` bila build lokal mendadak gagal di `next/font` | dua jalankan `npm run build`: exit 1 dengan `.next` lama, exit 0 sesudah `rm -rf .next` |
| Check "Workers Builds: snapme" | Merah di setiap commit. Itu pipeline build integrasi Git Cloudflare dari dasbor (`app: cloudflare-workers-and-pages`), bukan CI repo ini | `gh api repos/ikhsanddy/snapme/commits/<sha>/check-runs` |

Verifikasi tip hasil penulisan ulang sebelum push: `npm run lint`, `npm run typecheck`, `npm test` (179 lulus), `npm run build` (exit 0), dan `npx playwright test` (66 lulus, 8 dilewati, 0 gagal).

Yang belum diverifikasi: isi kegagalan "Workers Builds: snapme", karena tautannya hanya bisa dibuka dari dasbor Cloudflare. Pilihannya memperbaiki build command-nya di dasbor atau melepas integrasi Git untuk Worker `snapme` dan membiarkan `npm run deploy` dari CLI seperti yang ditulis `ARCHITECTURE.md §3`.

