## What changed

<!-- One paragraph. If this adds an algorithm, say which category and which snapshot shape it reuses. -->

## Checklist

- [ ] `npm run typecheck` passes (strict, no `any`)
- [ ] `npm test` passes — new trace generators have contract + invariant tests
- [ ] `npm run build` passes
- [ ] Algorithm logic lives in `src/algorithms/**` (pure, returns a `Trace`), not in a component
- [ ] New generators carry JSDoc explaining the insight, not just the signature
- [ ] `prefers-reduced-motion` still respected (no new infinite animation)
- [ ] No new runtime dependency without a note below

## Screenshots / trace excerpt

<!-- A screenshot of the stage, or the step descriptions that changed. -->

## Notes for the reviewer

<!-- Trade-offs, follow-ups, anything you deliberately left out. -->
