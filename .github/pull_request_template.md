## What and why

<!-- Describe the purpose of this change and why it is needed. Link the issue it closes, if any. -->

## How verified

<!-- Name the commands you ran and what they printed. For UI work, say which screens and which widths you checked, and against which reference file in docs/ui-reference. -->

## Checklist

- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes
- [ ] `npm run build` passes
- [ ] `npx playwright test` passes for the flows this change touches
- [ ] `docs/DECISIONS.md` has an entry for any architectural or notable technical decision
- [ ] `MILESTONES.md` acceptance criteria are updated when this completes a milestone
- [ ] UI changes satisfy the review checklist in `DESIGN-SYSTEM.md §14`, including comparing the page with its file in `docs/ui-reference` at 360, 768, and 1280 px
- [ ] Interface text uses the fixed labels in `DESIGN-SYSTEM.md §12`: Indonesian, no emoji, no em dashes
- [ ] Styling goes through the tokens in `src/app/globals.css`: no raw color, radius, or shadow values in components
- [ ] Keyboard use, focus rings, and `prefers-reduced-motion` still work
- [ ] No image, font, or asset is sent to the network without the consent dialog, and no third-party script or tracker is added
- [ ] Commit messages are in English and follow Conventional Commits
- [ ] No credentials, tokens, secrets, or `.env` values in the diff
