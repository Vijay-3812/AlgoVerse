# Phase 1 — what shipped

**Objective:** foundation. Design system, Trace System contract, playback engine,
app shell, page transitions. No real algorithms yet — only the machinery that
makes every later algorithm cheap to add.

## 1. Trace System (the contract everything else obeys)

`src/types/trace.ts`

```ts
Step = { type/kind, indices (highlight), state snapshot, pseudocodeLine,
         codeLine, description, metrics, depth, weight }

Trace<TState, TData> = { steps: TraceStep[], result, complexity,
                         pseudocode, code: Partial<Record<Language, string[]>>, … }
AlgorithmDefinition<TState, TData> = { meta, complexity, pseudocode, code,
                                       explanation, defaultInput, generate }

Highlight  = { primary, secondary, tertiary, success, danger, muted,
               nodes, edges, deps }
MetricsSnapshot = { comparisons, swaps, writes, reads, calls, depth }
```

Purity contract (documented in the file):

1. `generate(input, run)` is deterministic — same input + seed ⇒ identical trace.
2. Snapshots are immutable by convention (new object per change, structural
   sharing, no per-step cloning).
3. Metrics are cumulative counters snapshotted per step, via `TraceBuilder.bump()`.

`TraceBuilder` (`src/utils/traceBuilder.ts`) removes the bookkeeping nobody should
hand-write: step indices, metric snapshots, recursion `enter()/exit()`, step
`weight`, timing, and the trace envelope.

**The single documented type escape hatch:** `defineModule()` in
`src/types/algorithm.ts` erases generics once so the registry can hold
heterogeneous modules in one map. `VisualizerFrame` re-attaches them at the one
place a module's own `generate` output meets its own renderer — the pairing is
preserved by construction.

## 2. Playback engine

`src/engine/playback.ts` — a pure reducer + time model, no React:

- `playbackReducer` handles load / play / pause / toggle / reset / step ± / seek /
  jump / settle / speed / loop, with cursor clamping and end-of-trace semantics.
- `stepDurationMs = BASE_STEP_MS * weight / speed`, clamped 8–2600 ms.
- `advance()` spends wall-clock time on **at most one step per frame** and carries
  the overshoot, so a stalled frame slows playback instead of skipping the
  interesting part of the algorithm.
- `progressToCursor` / `cursorProgress` make the scrubber bidirectional.

Driven by exactly one `requestAnimationFrame` in the app (`usePlaybackClock`),
parked while paused or hidden.

## 3. Design system

- `styles/tokens.css`: three complete themes (Dark / Light / **Cyberpunk**) as
  space-separated RGB channels, so Tailwind alpha modifiers work and a theme
  switch is one attribute write on `<html>` with a CSS cross-fade and **zero**
  React re-renders. Reactive `--algo-a/b/c` variables let the aurora respond to
  the current step.
- `styles/globals.css`: glass recipe, animated conic gradient borders, cursor
  spotlight, noise/grain, grid + vignette, `.kbd`, scroll containers, focus rings,
  and a global `prefers-reduced-motion` guard.
- Primitives: `GlassPanel`, `Button` (magnetic + ripple + gradient primary),
  `Icon` (46-glyph inline sprite, zero requests), `Badge`/`DifficultyBadge`/
  `ComplexityBadge`, `Tooltip` (hover + focus, `aria-describedby`), `Segmented`
  (shared-layout indicator), `Slider`, `AnimatedNumber` (spring ticks),
  `Skeleton`, `Toaster`.
- FX: `AuroraBackground` (CSS-only, theme- and step-reactive), `ConfettiCanvas`
  (one canvas for every burst in the app, DPR-aware, self-parking rAF),
  `TiltCard` (3D pointer tilt + spotlight), `HeroStage` (FLIP sorting reel).

## 4. Shell, navigation, state

- `AppShell` (+ TopBar, breadcrumbs, ThemeSwitcher, Toaster, ConfettiCanvas,
  CommandPalette) and `RouteTransition` (blur + scale + fade, `mode="wait"`).
- `Sidebar`: searchable collapsible tree, collapsible rail, difficulty dots and
  per-phase badges, roving keyboard focus, hover **prefetch** of module chunks,
  shared-layout selection pill.
- `WorkspaceLayout`: sidebar │ stage │ inspector with transport docked underneath;
  sheets on mobile/tablet (`MobileSheet`).
- `RightPanel` inspector: Pseudocode · Code (JS/Python/C++/Java, synced lines,
  offline tokeniser) · Explain (narration transcript, click-to-jump) · Complexity
  (Big-O best/avg/worst + live counters).
- Transport: `PlaybackBar`, `TimelineScrubber` (drag, hover preview tooltip,
  step-kind heat map, keyboard + full ARIA slider semantics), `MetricsStrip`
  (ticking counters, narration line, status pill).
- `InputBar`: random / sorted / reversed / nearly-sorted presets, size, randomise,
  custom values popover, saved inputs in localStorage.
- Stores: playback, session, ui, theme, toast, fx.
- ⌘K command palette **v1** (search across the catalogue, arrows + enter,
  prefetch) — Phase 8 extends it with commands.
- Pages: Landing (light hero + category grid + feature section), Category,
  Visualiser, 404 — all lazy-loaded.

## 5. Quality gates (all green)

```
npm run typecheck   ✔ strict, no `any`
npm run test        ✔ 40 tests / 5 files
npm run build       ✔ 3.5s · landing chunk 11 kB, visualiser page 49 kB,
                      placeholder module 8.8 kB (gzip 3.8 kB) — code-split per route
```

Tests: 18 playback-engine tests (clamping, end semantics, one-step-per-frame,
loop, time model), 7 `TraceBuilder` tests (snapshot semantics, depth, weight),
7 catalogue + registry tests (unique ids, search, lazy load, cache identity,
placeholder → real upgrade), 2 contract tests across **all 90+ catalogue
entries** (indices, metric monotonicity, line bounds, determinism), and 6 jsdom
smoke tests that mount the real app, load a trace, drive the transport by
keyboard, switch inspector tabs/languages and resolve the 404 route.

## 6. Decisions worth flagging

- **Seeded randomness everywhere** (`mulberry32`) so "Random" is reproducible —
  the precondition for shareable URLs and regression tests.
- **No Monaco/Shiki in Phase 1**: a ~90-line line tokeniser gives the synced
  highlighting the panel actually needs for ~20 read-only lines, at 0 kB.
  Swapping in Shiki later is confined to `CodeBlock`.
- **Custom keyframes/layout CSS instead of a UI kit**: full control over the glass
  + neon vocabulary, no design-system lock-in, tiny CSS (9.3 kB gzip total).
- **`ZERO_METRICS`/`EMPTY_HIGHLIGHT` frozen constants** returned from selectors —
  a selector returning a fresh object/array makes `useSyncExternalStore` loop.
- **Placeholder trace per unshipped algorithm**: no dead links, and Phase 1 has a
  real multi-step trace to exercise the transport from day one.

## 7. Phase 2 entry points (already stubbed)

- `src/algorithms/register.ts` — add `registerSorting()` next to `registerPlaceholders()`.
- `src/visualizers/` — `BubbleBarVisualizer` will be the first bar renderer
  (bars/dots/circular/spectrum views, wave sweep, Web Audio on compare).
- `HeroStage` switches from `demoReel.ts` to the real `bubble-sort` trace.
