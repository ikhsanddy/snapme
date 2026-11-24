# Plan 003: Mount the live Konva stage only when clips exist

> **Executor instructions**: Follow this plan in the main worktree. Keep refs and handlers safe
> when no live stage is mounted. Touch only the files in Scope.
>
> **Drift check**: `git diff --stat cc2cd77..HEAD -- src/features/result/ResultView.tsx`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `cc2cd77`, 2026-11-24

## Why this matters

`ResultView` always mounts `LiveStage`, which creates a second Konva `Stage` and `StripStage` even
for static/gallery results with no clips. This duplicates photo decoding and may create
full-resolution filter caches. The component already computes clip availability, so a conditional
mount removes the work without changing live-strip behavior.

## Current state

- `ResultView` imports `hasLiveClips` and uses it for live-upload and video-button conditions.
- `src/features/result/ResultView.tsx:583` always renders `<LiveStage ref={liveRef} ... />`.
- `liveRef.current?.record()` already tolerates an absent stage and returns no recording.
- Video controls and live uploads are already gated on `hasLiveClips(shots)`.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Typecheck | `npm run typecheck` | exit 0 |
| Live, result, and share flows | `npx playwright test tests/e2e/live.spec.ts tests/e2e/result.spec.ts tests/e2e/share.spec.ts` | all pass |

## Scope

**In scope**:

- `src/features/result/ResultView.tsx`
- `CHANGELOG.md`
- `plans/README.md` and this plan's status row

**Out of scope**: `LiveStage`, clip recording, export composition, upload behavior, product
defaults, and UI labels.

## Steps

### Step 1: Guard the existing stage

Wrap the existing `<LiveStage>` element in `{hasLiveClips(shots) && (...)}`. Keep the same ref and
props. Do not create a placeholder stage or alter the optional `liveRef.current?.record()` calls.

**Verify**: `npm run typecheck` passes and the live button/upload conditions remain unchanged.

### Step 2: Verify both branches

Run typecheck and the three targeted Playwright specs. Existing live tests exercise the mounted
branch; result/share tests exercise static results and absent refs.

**Verify**: all targeted checks pass.

### Step 3: Document

Add one concise Unreleased changelog bullet and mark this plan DONE. The final canonical
`npm run build` runs after all three plans; the earlier isolated `_global-error` failure was a
cross-checkout React-resolution harness issue, not an application failure.

**Verify**: only in-scope files changed.

## Done criteria

- [x] `LiveStage` is absent when `hasLiveClips(shots)` is false.
- [x] Live results still mount the same stage and ref.
- [x] Absent refs remain safe through the existing optional calls.
- [x] `npm run typecheck` passes.
- [x] Live, result, and share Playwright specs pass.
- [x] Only in-scope files changed, and the plan status is DONE.

## STOP conditions

- A live flow calls `record()` without a mounted stage while clips are present.
- Static result rendering changes visually or functionally.
- A targeted test fails because live-stage mounting behavior changed unexpectedly.

## Maintenance notes

Any future consumer of `liveRef` must continue handling `null` when the session has no clips.
