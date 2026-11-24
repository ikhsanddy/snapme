# Plan 002: Load Sonner only at capture toast call sites

> **Executor instructions**: Follow this plan in the main worktree. Preserve every toast message,
> branch, and error path. Touch only the files in Scope.
>
> **Drift check**: `git diff --stat cc2cd77..HEAD -- src/app/booth/capture/page.tsx src/features/gesture/useGestureSnap.ts`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `cc2cd77`, 2026-11-24

## Why this matters

The capture route statically imports Sonner in two modules, placing its 38,632-byte chunk in the
route's first-load JavaScript. The app already uses call-site dynamic imports for Welcome gallery
toasts. Matching that pattern keeps toast behavior while deferring the library until a toast is
actually needed.

## Current state

- `src/app/booth/capture/page.tsx:15` statically imports `toast`; relay invite/share handlers call
  it at lines 291-310.
- `src/features/gesture/useGestureSnap.ts:5` statically imports `toast`; the gesture-load failure
  path calls it at line 160.
- `src/features/gallery/GalleryPicker.tsx:41` dynamically imports `{ toast }` inside the async
  handler immediately before use.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Typecheck | `npm run typecheck` | exit 0 |
| Gesture and relay flows | `npx playwright test tests/e2e/gesture.spec.ts tests/e2e/relay.spec.ts` | all pass |
| Loader failure unit | `npm test -- tests/lib/toast.test.ts` | 1 test passes |

## Scope

**In scope**:

- `src/app/booth/capture/page.tsx`
- `src/features/gesture/useGestureSnap.ts`
- `src/lib/toast.ts`
- `tests/lib/toast.test.ts`
- `CHANGELOG.md`
- `plans/README.md` and this plan's status row

**Out of scope**: `DeferredToaster`, Sonner configuration, toast text, relay logic, gesture state
machine, and product defaults.

## Steps

### Step 1: Defer capture-page Sonner

Remove the module-level `toast` import. Use the shared non-throwing `loadToast()` helper before
the invite success, operational error, and share toasts; optional-call the returned function so
a failed chunk load cannot reject the handler or misreport a successful relay operation.

**Verify**: `git grep -n 'from "sonner"' -- src/app/booth/capture/page.tsx` returns no match and
`npm run typecheck` passes.

### Step 2: Defer gesture failure Sonner

Remove the module-level import from `useGestureSnap.ts`. Make its existing `.catch` callback
async, await `loadToast()`, recheck `cancelled` after the await, then optional-call the unchanged
failure toast. A rejected chunk resolves to `null` instead of becoming an unhandled rejection.

**Verify**: the failure path still sets `status` to `failed` and displays the same message;
`git grep -n 'from "sonner"' -- src/features/gesture/useGestureSnap.ts` returns no match.

### Step 3: Verify and document

Run typecheck, the loader-failure unit test, and the two targeted Playwright specs. Add one
concise Unreleased changelog bullet and mark this plan DONE. The final canonical `npm run build`
runs after all three plans; the earlier isolated `_global-error` failure was a cross-checkout
React-resolution harness issue.

**Verify**: all targeted checks pass.

## Done criteria

- [x] Neither scoped source file has a static Sonner import.
- [x] Toast messages, conditions, and error handling are unchanged.
- [x] `npm run typecheck` passes.
- [x] Gesture and relay Playwright specs pass.
- [x] The mocked Sonner chunk-rejection unit test passes; `loadToast()` returns `null`.
- [x] Only in-scope files changed, and the plan status is DONE.

## STOP conditions

- A dynamic import changes toast timing enough to break an existing assertion.
- A test fails because a toast disappears or an error path is swallowed.
- The change requires modifying Sonner configuration or `DeferredToaster`.

## Maintenance notes

Keep toast loading behind `loadToast()`: it must stay lazy and non-throwing. A future module-level
toast import should justify why it belongs in the route's critical bundle.
