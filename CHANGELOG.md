# Changelog

snapme is built in the milestone order of [MILESTONES.md](docs/MILESTONES.md), one milestone per commit.
Entries below follow the milestone, not a tag: `0.1.0` is the first released state and contains the
whole of M0 to M10. The reasoning, measurements, and failed attempts behind each entry are in
[docs/DECISIONS.md](docs/DECISIONS.md).

## Unreleased

Housekeeping after 0.1.0: the repository was audited for dead weight and reorganised, and snapme now
carries its own mark. Nothing else in the flow changed.

### Added

- snapme's own mark, and the wordmark, favicon, and app icon built from it. The mark is a paper tile
  holding a fan of four photo prints; the favicon uses a single print, because four of them collapse
  into a colour patch at 16 px. `public/brand/snapme-mark.svg` is the source, `src/app/icon.svg` the
  small-size variant, and `npm run brand:icons` derives `src/app/apple-icon.png` and
  `src/app/favicon.ico` (16, 32, and 48 px) from both. The 15 KB `create-next-app` favicon, whose
  three frames were uncompressed bitmaps, is replaced by a 4.6 KB one with PNG payloads
- `sharp` as a dev dependency: the only renderer `scripts/render-brand-icons.mjs` needs

### Changed

- Server-only modules moved from `src/lib` to `src/server` (the binding seam, `db/`, `r2/`, `purge`,
  `rateLimit`, `tokens`, `expiry`), so the client-boundary rule is a path, not a hand-kept list
- `tests/` now mirrors `src/` (`tests/app/api`, `tests/components`, `tests/features`, `tests/lib`,
  `tests/server`, `tests/security`, `tests/stores`), with the miniflare harness and the route
  helpers in `tests/support`
- Client network calls share one module, `src/lib/http.ts` (`messageFrom`, `putToSignedUrl`)
- `src/features/gallery/muatFotoGaleri.ts` is `loadGalleryPhotos.ts`; the exported names follow it
- Every module in `src/components/ui` imports `cn` from `@/lib/utils`, matching what `shadcn add`
  generates
- The repository root now holds only the entry points and the tool configs: the four working
  documents (PRD, design system, architecture, milestones) moved to `docs/` next to the decision
  log, `r2-cors.json` moved to `infra/`, and the Playwright specs moved from `e2e/` to `tests/e2e/`
  so there is one test root
- `tsconfig.tsbuildinfo` is written into `.next/cache/`, so no TypeScript artifact lands in the
  repository root
- Product components moved out of `src/components/booth` into the features that own them: the booth
  shell to `src/features/booth`, the camera picker to `features/camera`, the capture stage, shot tray,
  countdown and shutter to `features/capture`, the gesture HUD and toggle to `features/gesture`, the
  relay invite card to `features/relay`. `src/components` now holds only `ui/` (the shadcn/ui
  primitives) and `site/` (header and wordmark)
- The result screen moved out of the editor: `ResultView`, the strip export, and the 4R print sheet
  now live in `src/features/result`, so `src/features/editor` is only the decorating step
- `GalleryPicker` moved from `src/components/site` to `src/features/gallery`, next to the loader it
  uses; component tests followed their components into `tests/features/<area>`
- The placement rule is written down in `ARCHITECTURE.md §4` and in the repository conventions in
  `.github/CONTRIBUTING.md`, so the next milestone does not have to rediscover it
- `DESIGN-SYSTEM.md §8` now documents the mark, its files, and the rule that the raster icons are
  derived rather than drawn twice; §10.1 shows the mark in the top bar, and `ARCHITECTURE.md §4`
  lists `public/brand/` and the three icon files under `src/app/`
- `brag-output*/**` is ignored by `eslint.config.mjs` and by git: a `/brag` run writes a Hyperframes
  composition (with a vendored `gsap.min.js` that fails the project's lint rules, exactly like the
  MediaPipe wasm) plus a rendered video, and neither belongs to `npm run lint` or to the repository

### Removed

- `CreateStripPayload` and `CreateRelayPayload` in `src/lib/schemas.ts`: type aliases nothing
  imported, while the routes take their types from the Zod schemas directly
- The `export` keyword on 26 symbols that only their own module uses (`StripLayout`, `CropRect`,
  `GESTURE_ACTIONS`, `BoothSettings`, and the like), so the module surface matches what is really
  shared. `src/components/ui` keeps the exports the shadcn CLI writes, so `shadcn add` stays
  comparable with upstream
- `--color-pink-700`: defined and documented but never used in any component. The palette and the
  contrast table in `DESIGN-SYSTEM.md §2` no longer list it
- Duplicated helpers: two copies of the canvas checksum (three, counting `customize.spec.ts`), the
  four-slot fill, the camera permission step in `tests/e2e/gesture.spec.ts`, and the request,
  rate-session, route-context, and bucket-clearing helpers in the route tests. The two bucket copies
  had already drifted: only one paginated

### Backend dibongkar: snapme jadi client-only (18 Oktober 2026)

Keputusan pengguna: cabut seluruh backend Cloudflare (Workers/OpenNext, D1, KV, R2, wrangler) dari
proyek ini. snapme kini aplikasi klien murni — booth kamera berjalan penuh secara lokal, tanpa
unggahan ke mana pun dan tanpa env yang dibutuhkan build.

**Removed**

- Seluruh sisi server: `src/server/` (`cloudflare.ts`, `db/`, `r2/`, `rateLimit.ts`, `expiry.ts`,
  `purge.ts`, `tokens.ts`), `src/app/api/cron/`, `worker.ts`, `open-next.config.ts`,
  `wrangler.jsonc`, `playwright.cf.config.ts`, `infra/`, `migrations/`,
  `scripts/cf-typegen.mjs`, `scripts/patch-opennext.mjs`
- Komponen dan modul yang hanya berguna di atas backend: `RelayJoinView`, `RelayCompleteView`,
  `RelayCancel`, `relay/bootstrap.ts`, `StripOwnerActions`, `LiveStripVideo`
- Uji dan penopangnya: `tests/support/`, `tests/app/api/`, `tests/server/`, jalur e2e ber-binding
  (`CLOUDFLARE_E2E`) beserta helper `pasangSidangBaru`/`undangEstafet`
- Dependensi `@opennextjs/cloudflare`, `aws4fetch`, `wrangler`, `lighthouse`; skrip npm `cf:patch`,
  `preview`, `preview:e2e`, `deploy`, `cf-typegen`, `test:e2e:cf`, `perf:lcp`
- Berkas env `.env.example` dan `.dev.vars.example`, termasuk salinan lokalnya (`.env.local`,
  `.dev.vars` yang berisi kredensial R2) dari mesin pengembangan

**Changed**

- Sembilan rute `/api` (`strips`, `strips/[id]`, `strips/[id]/complete`, `relays`, `relays/[id]`,
  `relays/[id]/claim`, `relays/[id]/complete`, `relays/[id]/strip`, `events`) menjadi stub yang
  menjawab 503 dengan pesan "belum tersedia" yang tetap, supaya klien menampilkan pesan itu, bukan
  galat jaringan atau 404
- `/s/[id]` dan `/r/[id]` menjadi stub `notFound()` (selalu 404) dengan metadata `noindex`; header
  `noindex` dan `no-referrer` untuk `/s/*` dan `/r/*` tetap dipasang `next.config.ts`
- CSP di `next.config.ts` tanpa satu pun host luar; `postinstall` kini hanya
  `copy-mediapipe-wasm.mjs`; `src/lib/schemas.ts` dipangkas ke ekspor yang masih dipakai klien
- Dokumen kondisi-kini (README, ARCHITECTURE, PRD, CONTRIBUTING, SECURITY) ditulis ulang untuk
  kondisi client-only

**Konsekuensi**

- Alur booth tidak berubah: welcome, layout, capture, gesture MediaPipe, customize, hasil, ekspor
  PNG/cetak, perekaman lokal Strip Hidup, dan sesi IndexedDB tetap berjalan seperti sebelumnya
- Fitur bagikan/estafet tetap utuh di UI (dialog persetujuan, kartu bagikan, QR lokal) dan kini
  selalu menerima pesan "belum tersedia"; tidak ada gambar yang meninggalkan perangkat
- Antrean analitik klien tetap ada dan diam-diam membuang batchnya selama rute peristiwa menjawab
  503


## 0.1.0 - 2026-10-16

First release. The full v1 scope of [PRD.md](docs/PRD.md) §5, deployed on Cloudflare Workers.

### Added

**M0 Fondasi** (`1988139`)

- Next.js App Router project with TypeScript, Tailwind v4, and shadcn/ui components restyled through
  the design tokens
- Design tokens as the single source of color, radius, shadow, and font, plus the component gallery
  at `/dev/ui`
- Vitest, Playwright, ESLint, and the `wrangler` toolchain wired into npm scripts

**M1 Welcome dan kerangka booth** (`7a0872e`)

- Welcome page with one primary action, and the three feature panels where the Gesture Snap panel is
  the widest
- Booth shell: stepper, three-column layout down to one column, and the main action pinned to the
  bottom on narrow screens
- Layout picker for Strip 4, Strip 3, and Grid 2x2

**M2 Kamera** (`880bc00`)

- Camera permission screen shown before the browser dialog, with the gallery picker as the fallback
  when permission is refused
- Mirrored preview with a crop guide that matches the chosen layout, so the photo is stored as it
  looks on screen
- Countdown capture from the shutter button or Space, single flash, shot tray with per-slot retakes,
  and camera selection when a device has more than one

**M3 Gesture Snap** (`89a5aea`, `40dc887`)

- Self-hosted MediaPipe wasm and gesture model, loaded only after camera permission and never on the
  Welcome route
- Hold detection as pure functions with thresholds in one file, the capture state machine reduced
  from events, and the on-screen indicator with "Terdeteksi. Tahan..."
- Gesture switch that is remembered on the device, `Open_Palm` to retake the last photo, and
  `Thumb_Up` to move on once every slot is filled
- A network assertion that no request carrying image data leaves the capture step

**M4 Hias strip** (`40dc887`)

- Konva strip canvas with 6 frames, 7 effects, and 12 stickers that can be dragged, rotated, scaled,
  and deleted
- Short text line and date, keyboard controls for every decor item, and a list equivalent for screen
  readers so the canvas is not the only way to reach them

**M5 Hasil dan cetak** (`771ea64`)

- PNG export at 600 x 1800 (2 x 6 inches at 300 dpi) without metadata, named
  `snapme-YYYYMMDD-HHmm.png`
- 4R print sheet with two strips side by side and a cut line
- Session persistence in IndexedDB, restored after a reload, with "Mulai dari awal" to clear it
- Gallery picker for JPEG, PNG, WebP, and HEIC where the browser supports it

**M6 Link strip dan QR** (`b4372be`)

- Consent dialog before the first upload, naming what is uploaded, who can see it, and when it is
  deleted
- Direct browser upload to a private R2 bucket through presigned URLs, verified server side with
  `bucket.head`
- Strip page at `/s/{id}`, `noindex` and `no-referrer`, with a delete token kept on the device
- QR placed in the strip footer at 168 px, so it survives a 300 dpi print

**M7 Strip Hidup** (`099d70a`)

- Ten 480 px frames captured during the last 1.5 seconds of each countdown, without delaying the
  still photo
- Live preview that stops under `prefers-reduced-motion` and offers a play button
- Clip export as WebM or MP4 following what the browser supports, with the button hidden when
  recording is unavailable

**M8 Strip Estafet** (`292ca73`)

- Relay link at `/r/{id}` for two people on two devices: the creator fills the odd slots, the friend
  fills the rest, and the friend's preview carries a 35% shadow overlay of the creator's photos
- Single claim enforced by a conditional database update, so a second visitor is told the relay is
  taken
- Relay links expire in 48 hours and strips in 7 days; the creator can cancel and delete
- After completion both sides get the strip page, and the creator sees "Menunggu teman" then
  "Selesai"

### Changed

**M9 Pengerasan** (`ee4ae8e`)

- Full CSP, `Permissions-Policy`, `X-Content-Type-Options`, and no-referrer rules on private pages
- Rate limits: exact strip and relay quotas counted in the database, and an hourly analytics budget
  in KV
- Analytics through a first-party endpoint, without cookies and without an identity column
- Accessibility pass: axe on every page, keyboard-only completion of the whole flow, `aria-live`
  countdown, and status text beside every color-coded state
- Cross-browser test projects for WebKit and Gecko

**M10 Migrasi Cloudflare** (`1a2d64a`)

- Backend moved from the previous hosted stack to Cloudflare Workers with the OpenNext adapter, so
  the whole app, the API routes, and the daily purge job run as one Worker
- Data in D1, files in a private R2 bucket, the analytics budget in KV, and scheduled cleanup
  through a Cron Trigger
- Route tests run against real D1, R2, and KV bindings through `wrangler getPlatformProxy`
- Welcome LCP measured in production at a 2.416 s median against the 2.5 s budget

### Not in this release

Out of v1 scope on purpose, per [PRD.md](docs/PRD.md) §5: accounts and a personal gallery, payment and
print ordering, AI face filters or generated images, real-time shared booths, relays of more than two
people, native apps and locked kiosk mode, and a template CMS.
