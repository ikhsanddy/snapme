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
