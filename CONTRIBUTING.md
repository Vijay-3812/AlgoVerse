# Contributing to AlgoVerse

Thanks for wanting to help. This project has one architectural rule that makes
everything else simple, so it is worth reading first.

## The rule

**Algorithms never touch the DOM.** A generator is a pure function that returns
a `Trace` — an ordered list of immutable snapshots. Components replay that list
and nothing more. If you find yourself reaching for `useEffect` to make an
algorithm "work", the logic belongs in the generator instead.

## Getting set up

```bash
git clone https://github.com/<you>/algoverse.git
cd algoverse
npm install
npm run dev          # http://localhost:5173
```

## The three gates

Every pull request must pass exactly these:

```bash
npm run typecheck    # strict TypeScript, `any` is a lint error in review
npm test             # Vitest: trace contract + per-algorithm invariants
npm run build        # production bundle must build
```

CI runs the same three commands, so a green local run means a green CI run.

## Adding an algorithm

The full walkthrough lives in the README
([How to add a new algorithm in 5 steps](README.md#how-to-add-a-new-algorithm-in-5-steps)).
The short version:

1. Pick the category folder under `src/algorithms/<category>/`.
2. Write one file: a `spec` (id, complexity, pseudocode, four aligned code
   samples, explanation, learn content, default input, `generate`).
3. Emit steps through `TraceBuilder`, painting roles rather than colours.
4. Add a test: the shared contract plus one assertion that is *specific to the
   algorithm's promise* (BFS: levels differ by ≤ 1 across every edge; Kruskal:
   the accepted edges never close a cycle; …).
5. Add a row to the category's loader table (`<CATEGORY>_LOADERS`).

## Style

- Strict TypeScript. `any` is not allowed; `unknown` plus a narrowing helper is.
- JSDoc on every generator: explain the *insight* the animation is meant to
  reveal, not the signature.
- Comments explain **why**. The code already says what.
- Animation: transform and opacity only, memoised geometry, and everything
  behind `prefers-reduced-motion`.
- Accessibility: every visualiser exposes a `role="img"` figure with a
  meaningful name, controls have accessible names, focus rings are never removed.

## Commit messages

Conventional-commit style, imperative mood, scope by area:

```
feat(graphs): add Hopcroft–Karp maximum matching
fix(trees): keep the parent's child list in sync after a B-tree split
docs(readme): document the eight snapshot shapes
```

## Review expectations

- A reviewer will run the app and scrub the new trace, not just read the diff.
- Expect questions about *why* a step is emitted — a trace is a design artefact.
- Small, focused pull requests get reviewed much faster than large ones.

## Code of conduct

Participation is covered by the [Code of Conduct](CODE_OF_CONDUCT.md).
