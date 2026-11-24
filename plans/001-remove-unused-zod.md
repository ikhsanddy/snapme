# Plan 001: Remove the unused Zod schemas and dependency

> **Executor instructions**: Follow this plan in the main worktree. Touch only the files in
> Scope. Run the listed checks and report failures without weakening them.
>
> **Drift check**: `git diff --stat cc2cd77..HEAD -- src/lib/schemas.ts package.json package-lock.json`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `cc2cd77`, 2026-11-24

## Why this matters

The capture route currently includes a 105,369-byte Zod chunk even though the backend was
removed. `src/lib/schemas.ts` still evaluates two Zod schemas that have no callers. Removing the
dead schemas and dependency reduces install weight and lets the capture client bundle exclude
Zod without changing any live validation or media limits.

## Current state

- `src/lib/schemas.ts:1` imports `z` and `LAYOUTS`/`LayoutId`.
- `CREATE_STRIP_SCHEMA` and `CREATE_RELAY_SCHEMA` are exported but have no importers.
- Live exports are `LIVE_MIME_TYPES`, `LiveKind`, `STILL_MIME`, `RELAY_SLOT_MIME`, and
  `RELAY_SLOT_BYTE_LIMIT`; their callers remain unchanged.
- `package.json` and `package-lock.json` contain Zod.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Remove dependency | `npm uninstall zod` | exit 0; manifest and lock updated |
| Typecheck | `npm run typecheck` | exit 0 |
| Relevant units | `npm test -- tests/features/capture/clip-recorder.test.ts tests/features/result/export-filename.test.ts` | all pass |
| Confirm removal | `git grep -n -E 'CREATE_(STRIP|RELAY)_SCHEMA|from "zod"' -- . ':!package-lock.json'` | no matches |

## Scope

**In scope**:

- `src/lib/schemas.ts`
- `package.json`
- `package-lock.json`
- `CHANGELOG.md`
- `plans/README.md` and this plan's status row

**Out of scope**: every caller of the live constants/types, application behavior, security checks,
and other dependencies.

## Steps

### Step 1: Remove dead schema code

Delete the `zod` and `layouts` imports plus `CREATE_STRIP_SCHEMA` and `CREATE_RELAY_SCHEMA`.
Keep all constants and `LiveKind`; update the file comment so it no longer claims the client
validates request schemas.

**Verify**: `git grep -n -E 'CREATE_(STRIP|RELAY)_SCHEMA|from "zod"' -- src` returns no matches.

### Step 2: Remove the package

Run `npm uninstall zod`. Do not manually edit the lockfile.

**Verify**: `npm ls zod` reports no installed dependency and `git diff -- package.json package-lock.json`
contains only Zod removal and its now-unused transitive dependencies.

### Step 3: Verify and document

Run the typecheck and relevant unit tests. Add one concise Unreleased changelog bullet, mark this
plan DONE, and leave the known `_global-error` build caveat separate rather than suppressing it.

**Verify**: both check commands exit 0.

## Done criteria

- [ ] No schema symbols or Zod imports remain in `src`.
- [ ] Zod is absent from `package.json`, `package-lock.json`, and `npm ls zod`.
- [ ] `npm run typecheck` passes.
- [ ] The two targeted Vitest files pass.
- [ ] Only in-scope files changed, and the plan status is DONE.

## STOP conditions

- A repo-wide search finds a real schema caller or another runtime Zod import.
- `npm uninstall zod` changes unrelated direct dependencies.
- A targeted check fails for a reason caused by this change.

## Maintenance notes

The remaining schema module is a media-constants module in practice. If server validation returns,
create schemas at that server boundary instead of restoring Zod to every client importer.
