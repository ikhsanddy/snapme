# snapme

![snapme](public/brand/snapme-mark.svg)

[![License: MIT](https://img.shields.io/badge/license-MIT-bd0000)](LICENSE)
[![CI](https://github.com/ikhsanddy/snapme/actions/workflows/ci.yml/badge.svg)](https://github.com/ikhsanddy/snapme/actions/workflows/ci.yml)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

snapme is a photobooth that runs entirely in your browser: open the camera, pose, decorate the
strip, then download or print it. No account, no install, no server. Nothing you photograph ever
leaves the device, because there is nothing to upload it to.

Three things it does differently:

1. **Gesture Snap**: raise two fingers, hold for a moment, and the countdown runs itself. Nobody
   has to run back to the shutter.
2. **Strip Estafet**: the idea is that one person fills half the strip and a friend completes the
   other half from another device. The invite UI is in the app, but making the link is the one step
   that needs a backend, and it currently answers *"belum tersedia"* (not yet available).
3. **Strip Hidup + QR**: every pose is also recorded as a short clip you can download. The QR that
   would open a moving strip page depends on the same unavailable link step.

**Status:** `v0.1.0`. The full v1 scope of the PRD was implemented through milestones M0 to M10
(see [CHANGELOG.md](CHANGELOG.md)). On 2026-10-18 the entire backend was dismantled at the owner's
decision, so snapme is now a client-only app: the booth runs locally end to end, and the features
that stored or shared data report *"belum tersedia"* instead. What each milestone changed is in
[CHANGELOG.md](CHANGELOG.md); the teardown itself has its own dated entry there and in
[docs/DECISIONS.md](docs/DECISIONS.md).

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
- QR switch on the strip canvas and a share card with a consent dialog; the link creation behind
  them is the part that answers *"belum tersedia"*
- Strip Estafet invite card with the same consent dialog; relay links answer *"belum tersedia"* the
  same way
- Gallery picker: use an existing photo instead of the camera (JPEG, PNG, WebP, HEIC where the
  browser supports it)
- Sessions survive a reload through IndexedDB, with a "Mulai dari awal" button that clears them
- Accessibility: WCAG 2.2 AA target, the whole flow works with a keyboard, and every gesture has a
  button equivalent
- Analytics: first-party event counts only, no cookies, no third-party scripts; the queue stays in
  the browser and silently drops its batches while the endpoint answers 503

The interface is in Indonesian, and the fixed labels are listed in
[DESIGN-SYSTEM.md §12](docs/DESIGN-SYSTEM.md#12-suara-dan-teks-antarmuka).

## Privacy

- Everything runs in the browser: camera, gesture detection, editing, export, and the Strip Hidup
  recorder. No image or clip is sent anywhere, and an automated test asserts that no request
  carrying image data leaves `/booth/capture`.
- There is no upload path at all. The share and relay dialogs still ask for consent before they
  would have uploaded anything, and both currently end in the *"belum tersedia"* message.
- The pages that once displayed shared strips and relays (`/s/{id}`, `/r/{id}`) always answer 404
  and stay `noindex` with `no-referrer`.
- Fonts, the gesture model, and its wasm are self-hosted. There is no third-party tracker and the
  CSP allows no external hosts.
- What is processed where is described in `/privasi` in the app.

## Getting started

Node 20 or newer is required (the project is developed and verified on Node 24); `npm ci` installs
from the lockfile. No environment variables or accounts are needed for the build.

```sh
git clone https://github.com/ikhsanddy/snapme.git
cd snapme
npm ci
npm run dev
```

`npm run dev` serves the app on <http://localhost:3000>. The camera needs a secure context: HTTPS
or `localhost`.

End-to-end tests need a browser once: `npx playwright install chromium`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run brand:icons` | Derive `apple-icon.png` and `favicon.ico` from the brand SVGs |
| `npm run lint` | ESLint |
| `npm run typegen` | Generate the Next.js route types (`LayoutProps`, `PageProps`) without a full build |
| `npm run typecheck` | Route types, then `tsc --noEmit` |
| `npm test` | Vitest: units, components, and security guards |
| `npx playwright test` | Playwright end-to-end tests against the dev server |

## Configuration

None. snapme has no build-time or runtime environment variables, no external services, and no
secrets to fill in.

Secrets never belong in the repository. If you believe a credential was committed, do not open a
public issue: follow [SECURITY.md](.github/SECURITY.md).

## Repository layout

| Path | Contents |
| --- | --- |
| `src/app` | App Router pages and the `/api` stub routes that answer 503 |
| `src/components` | `ui`: the shadcn/ui primitives restyled with the design tokens; `site`: the shell shared by the site pages and the booth (wordmark, header) |
| `src/features` | Booth logic and its components, by area: booth shell, camera, capture, gesture, editor, result, gallery, live, relay, session, share, metrics |
| `src/lib` | Isomorphic logic: strip geometry, route schemas, relay slots, the client fetch helpers, and the analytics queue |
| `src/stores` | Booth session state (zustand) |
| `tests` | Vitest, mirroring `src/`: units, components, stores, plus the client-bundle security guard in `tests/security` |
| `tests/e2e` | Playwright specs, including the fake-camera flow and the privacy assertion |
| `docs` | The working documents (PRD, design system, architecture, milestones), `docs/DECISIONS.md`, and `docs/ui-reference` |
| `public` | Sticker assets and the self-hosted gesture model; the MediaPipe wasm is copied from `node_modules` on install |

## Documentation

| Document | Contents |
| --- | --- |
| [docs/PRD.md](docs/PRD.md) | What is built, priorities, and acceptance criteria |
| [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) | Tokens, typography, components, layout, accessibility |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, folder structure, routes, testing, workflow |
| [docs/MILESTONES.md](docs/MILESTONES.md) | Release plan with the acceptance criteria of each phase |
| [CHANGELOG.md](CHANGELOG.md) | What changed per milestone, plus the backend teardown |
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
