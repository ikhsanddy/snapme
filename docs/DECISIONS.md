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

### Skill proyek yang dipasang

Dipasang ke `.agents/skills/` (ARCHITECTURE §11.3, MILESTONES M0):

| Skill | Sumber | Fungsi |
|---|---|---|
| `find-skills` | `vercel-labs/skills` | Mencari skill yang sudah ada sebelum menulis kode |
| `design-taste-frontend` | `Leonxlnx/taste-skill` | Pagar kualitas UI, dipakai di Welcome, `/s/{id}`, dan Privasi |
| `vercel-react-best-practices` | `vercel-labs/agent-skills` | Hasil `/skill:find-skills` kata kunci milestone M0 |
| `shadcn` | `shadcn-ui/ui` | Hasil `/skill:find-skills` kata kunci milestone M0 |

Hasil `npx skills find` untuk kata kunci `nextjs`, `shadcn`, `tailwind`: tiga kandidat di atas (masing-masing 365,4 ribu, 778,6 ribu, dan 16,3 ribu pemasangan). Dua yang resmi dipasang; `lombiq/tailwind-agent-skills@tailwind-4-docs` (komunitas, 16,3 ribu) tidak dipasang karena Tailwind v4 sudah terbaca dari token di `globals.css`.

Verifikasi keempat skill ada di `.agents/skills/`. Pengecekan di `/extensions` tab Skills diserahkan ke pengguna karena UI omp tidak terlihat dari sesi agent.

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

### Hasil find-skills untuk kata kunci M1

`npx skills find` dijalankan untuk tiga kata kunci milestone (`web design guidelines`, `react best practices`, `accessibility`):

|Kata kunci|Kandidat teratas|Pemasangan|Tindakan|
|---|---|---|---|
|`web design guidelines`|`vercel-labs/agent-skills@web-design-guidelines`|709,8 ribu|Tidak dipasang|
||`leonxlnx/taste-skill@design-taste-frontend`|576,7 ribu|Sudah terpasang di M0|
|`react best practices`|`vercel-labs/agent-skills@vercel-react-best-practices`|778,6 ribu|Sudah terpasang di M0|
|`accessibility`|`addyosmani/web-quality-skills@accessibility`|59,4 ribu|Tidak dipasang|
||`jakubkrehel/skills@better-accessibility`|24,8 ribu|Tidak dipasang|

**Keputusan: tidak ada pemasangan skill baru di M1.** Dua skill yang sudah terpasang menutupi kebutuhan M1, dan audit aksesibilitas menyeluruh memang dijadwalkan di M9 dengan `@axe-core/playwright` (sudah ada di devDependencies). Kedua kandidat aksesibilitas diusulkan ke pengguna; pemasangannya menunggu persetujuan.

### Pre-Flight Check taste-skill untuk Welcome

Dijalankan untuk `/` dengan pengecualian DESIGN-SYSTEM §0. Yang diperiksa dan hasilnya:

|Pemeriksaan|Hasil|
|---|---|
|Design Read dan dial dinyatakan sebelum menulis kode|Dinyatakan: consumer photobooth web app untuk pelajar dan mahasiswa Indonesia, playful Y2K neo-brutalist, shadcn/ui + Tailwind v4 di-restyle token DESIGN-SYSTEM.md; `DESIGN_VARIANCE 7`, `MOTION_INTENSITY 6`, `VISUAL_DENSITY 5`|
|Nol em dash dan en dash di teks antarmuka|Lolos. Pencarian karakter em dash dan en dash di `src/` tidak menemukan satu pun|
|Satu label per maksud, CTA tidak membungkus|Lolos. "Mulai Foto" hanya untuk memulai sesi, pil satu baris pada 360 sampai 1280 px|
|Pasangan warna hanya dari tabel §2|Lolos. Diperiksa: `ink` di `paper`, `lime`, `violet-soft`, `tangerine`; `paper` di `violet` dan `ink`; `muted` di `paper`, `cream`, `lime`|
|Kontras tombol dan kontrol|Lolos. Label tombol utama selalu `ink` di atas `tangerine` (5,33); kartu radio `ink` di atas `paper` (18,11) dengan cincin fokus `violet` 3 px|
|Hitungan eyebrow|2 label huruf besar di halaman, batas `ceil(4 bagian / 3)` = 2. Lolos|
|Tanpa pola klise|Lolos. Bukan tiga kartu sama lebar (ubin 2 : 1 : 1), bukan hero tengah, tanpa gradasi hiasan, tanpa Inter|
|`prefers-reduced-motion`|Lolos. Aturan global di `globals.css` mematikan transisi dan animasi|
|Gambar nyata|**Penyimpangan tercatat.** §8 melarang memakai wajah orang tanpa izin dan mengizinkan blok warna berlabel "Foto contoh"; halaman acuan memakai blok yang sama|
|Kepala hero maksimal 2 baris|**Penyimpangan tercatat.** Pada 360 px judul membungkus 3 baris, sama seperti `welcome.html`. Syarat yang mengikat adalah FR-01, dan itu diuji otomatis: aksi utama terlihat tanpa menggulir pada 360 x 640 dan 1366 x 768|
|Motion ditampilkan bila klaim > 4|**Penyimpangan tercatat.** Welcome hanya memakai umpan balik tekan tombol (§7), sama seperti acuan. Gerak lain (`motion/react`) masuk di langkah booth pada milestone yang memilikinya|

### Audit aksesibilitas M1

Skill `accessibility` dari `addyosmani/web-quality-skills` dipasang ke `.agents/skills/accessibility` (dan tercatat di `skills-lock.json`) setelah usulan M1 disetujui. Pemeriksaan kelayakan sebelum pasang: lisensi MIT, commit terakhir `2026-08-24`, 2.909 bintang, tidak diarsipkan. Skill ini memakai alur bukti lebih dulu (Lighthouse atau axe pada halaman yang sudah dirender, lalu pemeriksaan manual).

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

### Hasil find-skills untuk kata kunci M2

`npx skills find` dijalankan untuk tiga kata kunci milestone (`playwright`, `webcam`, `react testing`):

|Kata kunci|Kandidat teratas|Pemasangan|Tindakan|
|---|---|---|---|
|`playwright`|`microsoft/playwright-cli`|178,1 ribu|Tidak dipasang (diusulkan ke pengguna)|
||`anthropics/webapp-testing`|172,1 ribu|Tidak dipasang (diusulkan ke pengguna)|
||`currents-dev/playwright-best-practices`|91,2 ribu|Tidak dipasang (diusulkan ke pengguna)|
|`webcam`|`openclaw/camsnap`|3,1 ribu|Tidak dipasang: bukan photobooth browser|
|`react testing`|tanpa hasil yang relevan| |Tidak dipasang|

**Keputusan: tidak ada pemasangan skill baru di M2.** Repo sudah punya Playwright terkonfigurasi dengan tiga berkas uji yang berjalan, dan konvensinya (kamera palsu, selektor peran, axe) sudah jelas dari uji M1. Tiga kandidat Playwright diusulkan ke pengguna; pemasangannya menunggu persetujuan.

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
- Perangkat: `enumerateDevices()` dipanggil ulang di `onUserMedia` (label baru terbaca setelah izin), disaring ke `videoinput`, dan pilihannya disimpan di `settings.cameraDeviceId` (sesi saja, tanpa penyimpanan lintas muat ulang). Mengganti perangkat mengubah `videoConstraints`, dan `react-webcam` meminta ulang stream saat `videoConstraints` berubah; `shots` tidak tersentuh.

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

### Hasil find-skills untuk kata kunci M3

`npx skills find` dijalankan untuk dua kata kunci milestone (`mediapipe`, `web performance`):

|Kata kunci|Kandidat teratas|Pemasangan|Tindakan|
|---|---|---|---|
|`mediapipe`|`kinemotioninc/kinemotion@mediapipe-pose-detection`|82|Tidak dipasang: di bawah 100 pemasangan dan penulis tak dikenal|
||`liuchiawei/agent-skills@mediapipe-usage`|61|Tidak dipasang: alasan sama|
||`omer-metin/skills-for-antigravity@hand-gesture-recognition`|38|Tidak dipasang: alasan sama|
|`web performance`|`vercel-labs/agent-skills@vercel-react-best-practices`|778,6 ribu|Sudah terpasang sejak M0|
||`cloudflare/skills@web-perf`|93 ribu|**Dipasang 9 Oktober 2026** setelah pengguna menyetujui usulan M3|

**Keputusan pemasangan saat milestone: tidak ada yang dipasang sendiri.** Semua kandidat `mediapipe` berada di bawah ambang kelayakan find-skills (sumber tak dikenal, pemasangan sedikit); rujukan yang dipakai adalah dokumentasi resmi Google AI Edge untuk Gesture Recognizer Web, yang juga menjadi sumber URL model dan wasm. `cloudflare/skills@web-perf` (93 ribu pemasangan, sumber resmi Cloudflare) diusulkan ke pengguna dan dipasang setelah disetujui.

### Skill `web-perf` yang dipasang

Perintah: `npx skills add cloudflare/skills --skill web-perf -a universal -y`. Terpasang di `.agents/skills/web-perf/` dan tercatat di `skills-lock.json`; pemeriksaan kelayakan sebelum pasang: sumber resmi Cloudflare (repo `cloudflare/skills`, 3.014 bintang, lisensi Apache-2.0, push terakhir 9 Oktober 2026, tidak diarsipkan), 93 ribu pemasangan, penilaian otomatis skill.sh "Safe". Isinya memandu audit performa (Core Web Vitals, Lighthouse, analisis trace) dengan sumber retrieval resmi (web.dev, Chrome DevTools docs). Relevan untuk butir kinerja PRD §8 dan milestone M9; pemakaiannya belum dijalankan di M3.

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
|Legenda gesture di kartu lime|Acuan memakai tiga baris (dua jari, telapak, jempol)|GS-08 dan GS-09 adalah P1|P0 sempat memakai dua baris; setelah P1 dikerjakan di sesi yang sama, legenda kembali ke tiga baris acuan persis (`HandPeace`, `HandPalm`, `ThumbsUp`)|
|Penanganan gesture P1|GS-08 (telapak mengulang foto terakhir), GS-09 (jempol lanjut ke hias), GS-10 (dua tangan)|Dikerjakan setelah P0 tuntas di sesi yang sama|`useGestureSnap` menangani aksi `retake` pada fase `ready` dan `complete` (dispatch `SHOOT` dengan target) dan `proceed` pada fase `complete` (`onProceed`). Loop juga berjalan di fase `complete` saat ada foto yang bisa diulang; kedua aksi tidak menyentuh fase `holding` mesin. GS-10 hanya konfigurasi `numHands: 2`|
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

Agent tidak bisa memverifikasi deteksi gesture dengan kamera palsu: kamera palsu tidak punya tangan. Isi tabel ini setelah mencoba di perangkat nyata: buka `/booth/capture`, nyalakan Gesture Snap, lakukan 10 kali tanda dua jari di bawah cahaya yang biasa dipakai, dan catat berapa yang memicu hitung mundur.

|Perangkat|Browser|Cahaya|Berhasil dari 10|Catatan|
|---|---|---|---|---|
| | | | | |
| | | | | |

Ambang akhir yang dipakai: skor 0,6, tahan 800 ms, jeda 1.500 ms, interval 80 ms. Bila hasil uji manual menunjukkan lemah, ubah hanya `src/features/gesture/thresholds.ts` (satu berkas konstanta, ARCHITECTURE §6) dan ulangi tabel di atas.


## M4 Hias strip (9 Oktober 2026)

### Hasil find-skills untuk kata kunci M4

`npx skills find` dijalankan untuk tiga kata kunci milestone (`canvas`, `konva`, `image generation`):

|Kata kunci|Kandidat teratas|Pemasangan|Tindakan|
|---|---|---|---|
|`konva`|`terminalskills/skills@konva`|18|Tidak dipasang: di bawah ambang 100 pemasangan dan penulis tak dikenal|
||`p7gg/skills@konva-js`|7|Tidak dipasang: alasan sama|
|`canvas`|`anthropics/skills@canvas-design`|114,8 ribu|Tidak dipasang: artefak poster PNG/PDF, bukan editor kanvas|
||`currents-dev/playwright-best-practices`|91,2 ribu|Tidak dipasang: konvensi Playwright repo sudah terbentuk sejak M1|
|`image generation`|`leonxlnx/taste-skill@imagegen-frontend-web`|346,4 ribu|**Dipasang 9 Oktober 2026** setelah pengguna menyetujui|
||`101-skills/superpowers@ai-image-generation`|705,2 ribu|Tidak dipasang: fork yang tidak jelas asalnya|

`imagegen-frontend-web` terpasang di `.agents/skills/imagegen-frontend-web/` (`npx skills add leonxlnx/taste-skill --skill imagegen-frontend-web -a universal -y`) dan tercatat di `skills-lock.json`. Sumbernya repo yang sudah dipakai sejak M0 (`Leonxlnx/taste-skill`), penilaian otomatis skill.sh "Safe". Rujukan teknis kanvas tetap dokumentasi resmi konva.js dan react-konva; tiga kandidat `konva` di bawah ambang tidak dipasang.

### 12 stiker: SVG ditulis tangan, bukan role `image`

Keputusan pengguna untuk M4. DESIGN-SYSTEM §8 mengizinkan stiker dibuat dengan role `image` lalu ditinjau manusia; menulis SVG langsung menghindari langkah tinjauan gambar dan menjaga berkas tetap kecil (247 sampai 1.213 bita per berkas).

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

Agent tidak bisa memverifikasi dua hal dengan kamera palsu:

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
