# Changelog

snapme is built in the milestone order of [MILESTONES.md](MILESTONES.md), one milestone per commit.
Entries below follow the milestone, not a tag: `0.1.0` is the first released state and contains the
whole of M0 to M10. The reasoning, measurements, and failed attempts behind each entry are in
[docs/DECISIONS.md](docs/DECISIONS.md).

## 0.1.0 - 2026-10-16

First release. The full v1 scope of [PRD.md](PRD.md) §5, deployed on Cloudflare Workers.

### Added

**M0 Fondasi** (`251b7fe`)

- Next.js App Router project with TypeScript, Tailwind v4, and shadcn/ui components restyled through
  the design tokens
- Design tokens as the single source of color, radius, shadow, and font, plus the component gallery
  at `/dev/ui`
- Vitest, Playwright, ESLint, and the `wrangler` toolchain wired into npm scripts

**M1 Welcome dan kerangka booth** (`ca490fd`)

- Welcome page with one primary action, and the three feature panels where the Gesture Snap panel is
  the widest
- Booth shell: stepper, three-column layout down to one column, and the main action pinned to the
  bottom on narrow screens
- Layout picker for Strip 4, Strip 3, and Grid 2x2

**M2 Kamera** (`9dd5f04`)

- Camera permission screen shown before the browser dialog, with the gallery picker as the fallback
  when permission is refused
- Mirrored preview with a crop guide that matches the chosen layout, so the photo is stored as it
  looks on screen
- Countdown capture from the shutter button or Space, single flash, shot tray with per-slot retakes,
  and camera selection when a device has more than one

**M3 Gesture Snap** (`67b8b31`, `e544c2c`)

- Self-hosted MediaPipe wasm and gesture model, loaded only after camera permission and never on the
  Welcome route
- Hold detection as pure functions with thresholds in one file, the capture state machine reduced
  from events, and the on-screen indicator with "Terdeteksi. Tahan..."
- Gesture switch that is remembered on the device, `Open_Palm` to retake the last photo, and
  `Thumb_Up` to move on once every slot is filled
- A network assertion that no request carrying image data leaves the capture step

**M4 Hias strip** (`e544c2c`)

- Konva strip canvas with 6 frames, 7 effects, and 12 stickers that can be dragged, rotated, scaled,
  and deleted
- Short text line and date, keyboard controls for every decor item, and a list equivalent for screen
  readers so the canvas is not the only way to reach them

**M5 Hasil dan cetak** (`6b9e6f9`)

- PNG export at 600 x 1800 (2 x 6 inches at 300 dpi) without metadata, named
  `snapme-YYYYMMDD-HHmm.png`
- 4R print sheet with two strips side by side and a cut line
- Session persistence in IndexedDB, restored after a reload, with "Mulai dari awal" to clear it
- Gallery picker for JPEG, PNG, WebP, and HEIC where the browser supports it

**M6 Link strip dan QR** (`1308ac6`)

- Consent dialog before the first upload, naming what is uploaded, who can see it, and when it is
  deleted
- Direct browser upload to a private R2 bucket through presigned URLs, verified server side with
  `bucket.head`
- Strip page at `/s/{id}`, `noindex` and `no-referrer`, with a delete token kept on the device
- QR placed in the strip footer at 168 px, so it survives a 300 dpi print

**M7 Strip Hidup** (`8e45863`)

- Ten 480 px frames captured during the last 1.5 seconds of each countdown, without delaying the
  still photo
- Live preview that stops under `prefers-reduced-motion` and offers a play button
- Clip export as WebM or MP4 following what the browser supports, with the button hidden when
  recording is unavailable

**M8 Strip Estafet** (`707f83b`)

- Relay link at `/r/{id}` for two people on two devices: the creator fills the odd slots, the friend
  fills the rest, and the friend's preview carries a 35% shadow overlay of the creator's photos
- Single claim enforced by a conditional database update, so a second visitor is told the relay is
  taken
- Relay links expire in 48 hours and strips in 7 days; the creator can cancel and delete
- After completion both sides get the strip page, and the creator sees "Menunggu teman" then
  "Selesai"

### Changed

**M9 Pengerasan** (`cfaad79`)

- Full CSP, `Permissions-Policy`, `X-Content-Type-Options`, and no-referrer rules on private pages
- Rate limits: exact strip and relay quotas counted in the database, and an hourly analytics budget
  in KV
- Analytics through a first-party endpoint, without cookies and without an identity column
- Accessibility pass: axe on every page, keyboard-only completion of the whole flow, `aria-live`
  countdown, and status text beside every color-coded state
- Cross-browser test projects for WebKit and Gecko

**M10 Migrasi Cloudflare** (`cb75c6c`)

- Backend moved from the previous hosted stack to Cloudflare Workers with the OpenNext adapter, so
  the whole app, the API routes, and the daily purge job run as one Worker
- Data in D1, files in a private R2 bucket, the analytics budget in KV, and scheduled cleanup
  through a Cron Trigger
- Route tests run against real D1, R2, and KV bindings through `wrangler getPlatformProxy`
- Welcome LCP measured in production at a 2.416 s median against the 2.5 s budget

### Not in this release

Out of v1 scope on purpose, per [PRD.md](PRD.md) §5: accounts and a personal gallery, payment and
print ordering, AI face filters or generated images, real-time shared booths, relays of more than two
people, native apps and locked kiosk mode, and a template CMS.
