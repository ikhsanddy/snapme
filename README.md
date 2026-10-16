# snapme

[![Live demo](https://img.shields.io/badge/demo-snapme.ikhsandyy--dev.workers.dev-3b82f6?logo=cloudflare&logoColor=white)](https://snapme.ikhsandyy-dev.workers.dev)
[![License: MIT](https://img.shields.io/badge/license-MIT-bd0000)](LICENSE)
[![CI](https://github.com/ikhsanddy/snapme/actions/workflows/ci.yml/badge.svg)](https://github.com/ikhsanddy/snapme/actions/workflows/ci.yml)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

snapme is a photobooth that runs in the browser: open the camera, pose, decorate the strip, then
download or print it. No account, no install, and a photo leaves the device only when the user
makes a link from it.

Three things it does differently:

1. **Gesture Snap**: raise two fingers, hold for a moment, and the countdown runs itself. Nobody
   has to run back to the shutter.
2. **Strip Estafet**: one person fills half the strip, sends a link, and a friend completes the
   other half from another device, any time within 48 hours.
3. **Strip Hidup + QR**: every pose is also recorded as a short clip, and the QR on the printed
   strip opens the moving version of that strip.

**Status:** `v0.1.0`. The full v1 scope of the PRD is implemented and deployed, milestones M0 to
M10 are complete, and what changed in each one is in [CHANGELOG.md](CHANGELOG.md). What is verified
and what still needs a real device is listed in
[ARCHITECTURE.md §12](ARCHITECTURE.md#12-yang-belum-diverifikasi).

## Live demo

| Resource | URL |
| --- | --- |
| App | <https://snapme.ikhsandyy-dev.workers.dev> |

The hosted instance runs on Cloudflare Workers (OpenNext), with D1 for metadata, KV for the
analytics budget, and a private R2 bucket for strips and clips. It exists to show the thing
working, without an availability commitment. Everything except link sharing runs with no backend
at all: with no bindings configured, the data routes answer 503 and the booth still works end to
end. The deployment runbook is in [ARCHITECTURE.md §3](ARCHITECTURE.md#3-stack).

## Features

- Four steps: pick a layout, take photos, decorate the strip, take the result
- Layouts: Strip 4, Strip 3, and Grid 2x2 for a 4R sheet
- Countdown capture from the shutter button or the Space key, with the countdown announced to
  screen readers
- Gesture Snap, detected on the device with MediaPipe: `Victory` starts the countdown, `Open_Palm`
  retakes the last photo, `Thumb_Up` moves on to decorating
- Shot tray with per-slot retakes, plus a camera picker when a device has more than one
- Editor: 6 frames, 7 effects, and 12 stickers (drag, rotate, scale, delete), plus a short text
  line and a date
- Export: 600 x 1800 PNG (2 x 6 inches at 300 dpi, no EXIF) and a 1200 x 1800 4R sheet with a cut
  line
- Strip Hidup: 10 frames per pose as a short WebM or MP4 clip, following what the browser supports
- QR on the strip that opens `/s/{id}`
- Strip Estafet between two devices, single claim, relay link expires in 48 hours and the strip in
  7 days
- Gallery picker: use an existing photo instead of the camera (JPEG, PNG, WebP, HEIC where the
  browser supports it)
- Sessions survive a reload through IndexedDB, with a "Mulai dari awal" button that clears them
- Accessibility: WCAG 2.2 AA target, the whole flow works with a keyboard, and every gesture has a
  button equivalent
- Analytics: first-party event counts only, no cookies, no third-party scripts

The interface is in Indonesian, and the fixed labels are listed in
[DESIGN-SYSTEM.md §12](DESIGN-SYSTEM.md#12-suara-dan-teks-antarmuka).

## Privacy

- The camera, gesture detection, editing, and export all run in the browser. No image is uploaded
  during capture, and an automated test asserts that no request carrying image data leaves
  `/booth/capture`.
- Uploads happen only after an explicit consent dialog that names what is uploaded, who can see
  it, and when it is deleted, and they go straight from the browser to a private R2 bucket through
  presigned URLs.
- Strip links are 12-character IDs or longer, are `noindex`, and send no referrer. The delete token
  stays on the device that created the strip.
- Fonts, the gesture model, and its wasm are self-hosted. There is no third-party tracker.
- What is processed where, what is stored, and how to delete it is in `/privasi` in the app.

## Getting started

Node 20 or newer is required (the project is developed and verified on Node 24); `npm ci` installs
from the lockfile.

```sh
git clone https://github.com/ikhsanddy/snapme.git
cd snapme
npm ci
npm run dev
```

`npm run dev` serves the app on <http://localhost:3000>. The camera needs a secure context: HTTPS
or `localhost`. Without Cloudflare bindings the app runs with no backend, so the share, QR, and
relay steps answer 503 while capture, editing, and export work normally.

To run the production-fidelity build on the Workers runtime (port 8787 in `wrangler dev`):

```sh
cp .dev.vars.example .dev.vars   # then fill in the secrets
npm run preview
```

End-to-end tests need a browser once: `npx playwright install chromium`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server (no bindings; data routes answer 503) |
| `npm run build` | Production build |
| `npm run preview` | Production-fidelity preview: OpenNext build, then `wrangler dev` on 8787 |
| `npm run preview:e2e` | Same, with the `e2e` wrangler env (remote R2) for network tests |
| `npm run deploy` | OpenNext build, then deploy the Worker (requires Cloudflare credentials) |
| `npm run cf-typegen` | Regenerate `cloudflare-env.d.ts` from `wrangler.jsonc` (generated on install too) |
| `npm run lint` | ESLint |
| `npm run typegen` | Generate the Next.js route types (`LayoutProps`, `PageProps`) without a full build |
| `npm run typecheck` | Route types, then `tsc --noEmit` |
| `npm test` | Vitest: units, components, and route tests against real D1, R2, and KV |
| `npx playwright test` | Playwright end-to-end tests against the dev server |
| `npm run test:e2e:cf` | End-to-end tests against the Cloudflare preview |
| `npm run perf:lcp` | Lighthouse mobile preset against the preview |

## Configuration

| File | Committed | Contents |
| --- | --- | --- |
| `wrangler.jsonc` | Yes | Worker name, bindings, Cron Trigger, and the `e2e` env. The account ID, D1 database ID, and KV namespace ID in it are identifiers, not credentials: they grant nothing without an API token |
| `.env.example` | Yes | The single build-time variable (`R2_ACCOUNT_ID`, used to build the CSP) |
| `.dev.vars.example` | Yes | Template for the runtime secrets: `CRON_SECRET`, `RATE_LIMIT_SALT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` |
| `.env.local` | No | Your copy of `.env.example`; also used by `next build` |
| `.dev.vars` | No | Your copy of `.dev.vars.example`, read by `wrangler dev` |
| `cloudflare-env.d.ts` | No | Binding types derived from `wrangler.jsonc`; `npm ci` and `npm run cf-typegen` generate it |

Secrets never belong in the repository. Locally they live in the ignored `.dev.vars`; in production
they are set with `wrangler secret put` or in the Cloudflare dashboard. See
[SECURITY.md](.github/SECURITY.md).

## Repository layout

| Path | Contents |
| --- | --- |
| `src/app` | App Router pages and the API routes |
| `src/components` | shadcn/ui components restyled with the design tokens, plus booth components |
| `src/features` | Booth logic by area: camera, capture, gesture, editor, live, relay, share, session |
| `src/lib` | Pure logic and server seams: strip geometry, expiry, tokens, D1 statements, R2 presigning, the purge job |
| `src/stores` | Booth session state (zustand) |
| `tests` | Vitest units, component tests, and `tests/db` route tests on real bindings |
| `e2e` | Playwright specs, including the fake-camera flow and the privacy assertion |
| `migrations` | D1 migrations |
| `public` | Sticker assets and the self-hosted gesture model; the MediaPipe wasm is copied from `node_modules` on install |
| `docs/ui-reference` | The three reference pages that fix the layout of Welcome, Ambil Foto, and Hias Strip |
| `docs/DECISIONS.md` | Every engineering decision, with the evidence behind it |

## Documentation

| Document | Contents |
| --- | --- |
| [PRD.md](PRD.md) | What is built, priorities, and acceptance criteria |
| [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) | Tokens, typography, components, layout, accessibility |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Stack, folder structure, routes, data model, testing, workflow |
| [MILESTONES.md](MILESTONES.md) | Release plan with the acceptance criteria of each phase |
| [CHANGELOG.md](CHANGELOG.md) | What changed per milestone |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Decision log, including what was measured and what failed |

These documents are written in Indonesian; code, identifiers, filenames, and commit messages are in
English. When a document and the reference pages in `docs/ui-reference` disagree, the document wins
and the difference is reported.

## Contributing

Read [CONTRIBUTING.md](.github/CONTRIBUTING.md) before opening a pull request. Report
vulnerabilities privately through [SECURITY.md](.github/SECURITY.md), and keep discussion
respectful per the [Code of Conduct](.github/CODE_OF_CONDUCT.md).

## License

snapme is open source under the [MIT License](LICENSE). Copyright (c) 2026 Ikhsan Dyy.

Third-party dependencies keep their own licenses (MediaPipe under Apache-2.0, and the rest as
listed in `package.json` and their own repositories). snapme is an independent project: no name,
logo, or asset of another photobooth product is used. The third-party style reference in
`docs/ui-reference/referensi_uiux.webp` is not committed and is not redistributed with this
repository, since it is a collage of another product's screens and customers.
