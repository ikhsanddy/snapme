# snapme: instruksi untuk agent

snapme adalah photobooth di browser: kamera, pose, hias strip, unduh atau cetak. Tanpa akun, foto diproses di perangkat pengguna.

## Dokumen proyek

Tiga dokumen di bawah dimuat otomatis ke setiap sesi lewat impor `@`. Semuanya mengikat. Bila saling bertentangan: PRD menentukan apa yang dibangun, DESIGN-SYSTEM menentukan tampilan, ARCHITECTURE menentukan cara membangun.

@PRD.md

@DESIGN-SYSTEM.md

@ARCHITECTURE.md

`MILESTONES.md` tidak diimpor. Baca bagian milestone yang sedang dikerjakan saja.

## Halaman acuan UI

Tiga berkas HTML mandiri berikut adalah acuan pasti susunan, ukuran, dan keadaan halaman. Tidak diimpor otomatis karena besar: **baca berkasnya sebelum mengerjakan atau meninjau halaman yang bersangkutan**, dan bandingkan hasilnya berdampingan di browser.

| Halaman | Berkas acuan | Rute |
|---|---|---|
| Welcome | `docs/ui-reference/welcome.html` | `/` |
| Ambil Foto | `docs/ui-reference/capture.html` | `/booth/capture` |
| Hias Strip | `docs/ui-reference/customize.html` | `/booth/customize` |

Gambar arah gaya: `docs/ui-reference/referensi_uiux.webp`. Berkasnya **tidak ikut di-commit** dan tidak boleh disebarkan ulang (berkas pihak ketiga; alasannya di `docs/ui-reference/README.md`). Halaman lain disusun dari kerangka dan komponen yang sama (DESIGN-SYSTEM §5, §9).

Berkas acuan menulis gaya inline dengan nilai mentah dan memakai mesin templat kecil untuk interaksinya. Keduanya jangan disalin ke produk: pakai token, komponen, dan pustaka di ARCHITECTURE §3. Bila berkas acuan berbeda dengan DESIGN-SYSTEM.md, DESIGN-SYSTEM.md yang menang dan perbedaannya dilaporkan.

## Aturan kerja

1. **Satu milestone per sesi**, sesuai urutan di `MILESTONES.md`. Jangan mengerjakan milestone berikutnya tanpa diminta.
2. **Pakai yang sudah jadi dulu** (ARCHITECTURE §2). Sebelum menulis komponen atau utilitas, periksa tabel stack, registry shadcn, lalu npm. Menulis sendiri hanya untuk komponen khas produk di DESIGN-SYSTEM §9, dan alasannya dicatat di `docs/DECISIONS.md`.
3. **find-skills di awal milestone.** Jalankan `/skill:find-skills` dengan kata kunci milestone itu, lalu usulkan hasilnya ke pengguna beserta sumbernya. Jangan memasang skill tanpa persetujuan.
4. **taste-skill sebelum UI.** Muat `/skill:design-taste-frontend`, nyatakan Design Read dan dial dari DESIGN-SYSTEM §0, dan patuhi batas pemakaiannya. Bila skill bertentangan dengan DESIGN-SYSTEM.md, dokumen proyek yang menang.
5. **Token saja.** Warna, radius, bayangan, dan fon hanya didefinisikan di `src/app/globals.css`. Tidak ada nilai mentah di komponen.
6. **Lokal dulu.** Tidak ada gambar yang dikirim ke jaringan tanpa persetujuan pengguna di antarmuka. Tidak ada skrip, fon, atau pelacak pihak ketiga.
7. **Teks antarmuka** berbahasa Indonesia dan memakai label tetap di DESIGN-SYSTEM §12. Nama berkas, kode, dan pesan commit berbahasa Inggris (Conventional Commits).
8. **Subagent** tidak mewarisi percakapan. Setiap penugasan menyebut milestone, berkas yang boleh disentuh, dan bagian dokumen yang relevan. Pekerja paralel tidak boleh menyentuh berkas yang sama.

## Batas aman

- Jangan `git commit` dan jangan `git push`. Pengguna yang menjalankan `omp commit` setelah meninjau.
- Jangan men-deploy dan jangan menjalankan perintah yang mengubah sumber daya Cloudflare di akun pengguna (`wrangler d1/r2/kv ... --remote`, `wrangler secret put`), kecuali diminta di milestone itu atau pengguna memintanya. `npm run deploy` dan pembongkaran akun Supabase/Vercel adalah tindakan pengguna.
- Jangan menulis rahasia ke repo. Rahasia runtime masuk `.dev.vars` (tidak di-commit, dicontohkan di `.dev.vars.example`) dan `wrangler secret put`; `R2_ACCOUNT_ID` masuk `.env.local` (dicontohkan di `.env.example`).
- Jangan mengubah `PRD.md`, `DESIGN-SYSTEM.md`, `ARCHITECTURE.md`, atau `.omp/config.yml` diam-diam. Usulkan perubahannya dulu.
- Jangan memakai nama, logo, atau aset Fujifilm dari gambar referensi.
- Jangan memakai foto wajah orang sebagai aset contoh tanpa izin.

## Perintah

Tersedia setelah M0. Jalankan dari root repo.

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan Next.js (tanpa binding; rute data menjawab 503) |
| `npm run preview` | Pratinjau produksi-fidelitas: build OpenNext lalu `wrangler dev` di 8787 |
| `npm run preview:e2e` | Sama, dengan binding env `e2e` (R2 remote) untuk uji ber-jaringan |
| `npm run cf-typegen` | Regenerasi `cloudflare-env.d.ts` dari `wrangler.jsonc` |
| `npm run deploy` | Build OpenNext lalu deploy Worker (tindakan pengguna) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest (unit, komponen, dan uji D1/R2/KV di `tests/db/`) |
| `npm run build` | Build produksi |
| `npx playwright test` | Uji end-to-end terhadap dev server |
| `npm run test:e2e:cf` | Uji end-to-end ber-binding terhadap pratinjau Cloudflare |
| `npm run perf:lcp` | Lighthouse preset seluler terhadap pratinjau |

Pengguna bekerja di Windows. Perintah yang ditunjukkan kepada pengguna ditulis untuk PowerShell.

## Selesai berarti

Sebuah milestone baru boleh dilaporkan selesai bila:

1. Semua butir "Selesai bila" milestone itu terpenuhi.
2. `npm run lint`, `npm run typecheck`, `npm test`, dan `npm run build` lolos, dan uji Playwright untuk alur yang disentuh lolos.
3. Daftar periksa DESIGN-SYSTEM §14 terpenuhi untuk UI yang disentuh.
4. `docs/DECISIONS.md` dan kotak centang di `MILESTONES.md` diperbarui.

Laporan akhir memuat: yang dikerjakan, hasil tiap perintah pemeriksaan, yang belum selesai atau dilewati beserta alasannya, dan keputusan yang perlu dikonfirmasi pengguna. Jangan menyatakan selesai bila ada pemeriksaan yang gagal atau belum dijalankan.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
