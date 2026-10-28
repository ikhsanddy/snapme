# Contributing to snapme

Thanks for taking a look at snapme. This guide covers the setup, the conventions that bind this
repository, and how to propose a change.

## Prerequisites

- Node.js 20 or newer (the project is developed on Node 24; `package.json` declares the floor)
- npm with the committed lockfile (`npm ci`, not `npm install`, for reproducible installs)
- Chromium for the Playwright end-to-end tests:

  ```sh
  npx playwright install chromium
  ```

- A camera or a fake one. `npm run dev` needs a secure context: `localhost` counts.
- Nothing else. snapme is a client-only app: there is no backend to run, no database, and no
  environment variables to configure. The share and relay steps answer 503 ("not yet available")
  by design.

## Getting started

```sh
git clone https://github.com/ikhsanddy/snapme.git
cd snapme
npm ci
npm run dev            # http://localhost:3000
```

Useful entry points:

| Path | What to read first |
| --- | --- |
| `docs/PRD.md` | What is being built, with priorities and acceptance criteria |
| `docs/DESIGN-SYSTEM.md` | Tokens, components, layout, accessibility, review checklist |
| `docs/ARCHITECTURE.md` | Stack, structure, routes, data model, testing, workflow |
| `docs/MILESTONES.md` | The work order and the acceptance criteria of each milestone |
| `docs/ui-reference` | The reference pages that fix the layout of each booth screen |

## Available commands

| Command | Description |
| --- | --- |
| `npm run dev` | Next.js dev server on <http://localhost:3000> |
| `npm run build` | Production build (no environment variables needed) |
| `npm run brand:icons` | Derive `apple-icon.png` and `favicon.ico` from the brand SVGs |
| `npm run lint` | ESLint |
| `npm run typegen` | Generate the Next.js route types (`LayoutProps`, `PageProps`) without a full build |
| `npm run typecheck` | Route types, then `tsc --noEmit` |
| `npm test` | Vitest: units, components, stores, and the client-bundle security guard |
| `npx playwright test` | End-to-end tests against the dev server |

Before opening a pull request, the checks that must pass are `npm run lint`, `npm run typecheck`,
`npm test`, `npm run build`, and the Playwright suite for the flow you touched:

```sh
npm run lint && npm run typecheck && npm test && npm run build
npx playwright test
```

## Repository conventions

These rules are not negotiable in a pull request:

- Comments, identifiers, filenames, and commit messages are in English, following
  [Conventional Commits](https://www.conventionalcommits.org/). Interface text and the working
  documents (`docs/PRD.md`, `docs/DESIGN-SYSTEM.md`, `docs/ARCHITECTURE.md`, `docs/MILESTONES.md`)
  are in Indonesian.
- The repository root holds only entry points and tool configs (`next.config.ts`, the test and
  lint configs, `package.json`). Documents go to `docs/`, tests to `tests/` (units) and
  `tests/e2e/` (Playwright). Before opening a pull request, `npx tsc --noEmit` must leave no
  build artifact in the root.
- One milestone per commit. `MILESTONES.md` is the only source of milestones; do not start the next
  one unsolicited.
- Screens are owned by features, so a screen never has two homes. `src/app` holds routes only
  (`page.tsx`, `layout.tsx`, `route.ts`, `globals.css`). `src/components/ui` holds the shadcn/ui
  primitives as the CLI writes them, `src/components/site` holds only the shell shared by the site
  pages and the booth (wordmark, header), and every product component lives inside its feature at
  `src/features/<area>` next to the logic it renders. The client bundle stays free of server-only
  modules and secrets (`tests/security`).
- Use what already exists before writing something: a platform feature, the stack table in
  `ARCHITECTURE.md §3`, then a component from shadcn/ui or an npm package. Writing it yourself is
  reserved for the product-specific components in `DESIGN-SYSTEM.md §9`, and the reason belongs in
  `docs/DECISIONS.md`.
- Style through tokens only. Colors, radii, shadows, and fonts are defined in
  `src/app/globals.css`; components use the token names. No raw values in components.
- Interface text follows the fixed labels in `DESIGN-SYSTEM.md §12`. No emoji, no em dashes.
- UI work must satisfy the review checklist in `DESIGN-SYSTEM.md §14`, and a page that has a
  reference file in `docs/ui-reference` must be compared side by side with it.
- Local first. No image, font, or asset leaves the device without an explicit consent dialog, and
  no third-party script, tracker, or CDN is added.
- Every architectural or notable technical decision gets an entry in `docs/DECISIONS.md`, and a
  milestone's completion criteria get updated in `MILESTONES.md`.

## How to propose a change

1. Small fixes (typos, a bug with a clear cause) can go straight to a pull request.
2. For anything larger, such as a new feature, a layout change, or a refactor of the core modules,
   open an issue first so the approach can be agreed on before code is written.
3. Keep a pull request to one change. Include how you verified it: the commands you ran and what
   they printed.
4. Fill in the pull request template, including the checklist items that apply.

## Secrets

Never commit a credential. snapme currently needs none: there are no environment variables for the
build or at runtime, and the repository carries no `.env*` or `.dev.vars` files. If a change needs
a credential, it must keep reading it from the environment, never from a committed file. If you
believe a secret was committed, do not open a public issue: follow
[SECURITY.md](SECURITY.md) and rotate the credential first.

## Licensing of contributions

snapme is open source under the [MIT License](../LICENSE), and contributions are accepted under the
same license (inbound equals outbound). By submitting a pull request you confirm that the work is
yours to submit and that you agree to license it under the MIT License. Do not paste code from a
project whose license is incompatible with MIT, and do not add assets (images, fonts, audio) unless
their license allows redistribution and the origin is stated in the pull request.
