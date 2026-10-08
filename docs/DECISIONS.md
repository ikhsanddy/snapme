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
