import { motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { AlgorithmInput, AlgorithmMeta, AnyAlgorithmModule, AnyTrace, MetricsSnapshot } from '@/types';
import { ZERO_METRICS } from '@/types';
import { ALGORITHM_BY_ID, algorithmsInCategory } from '@/engine/catalogue';
import { SPEED_STOPS, clampCursor, stepDurationMs, totalDurationMs } from '@/engine/playback';
import { useAlgorithmModule } from '@/hooks/useAlgorithmModule';
import { useArrayValues } from '@/hooks/useArrayInput';
import { useSessionStore } from '@/store/sessionStore';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/primitives/Icon';
import { Badge, DifficultyBadge } from '@/components/primitives/Badge';
import { Segmented } from '@/components/primitives/Segmented';
import { Slider } from '@/components/primitives/Slider';
import { VisualizerSkeleton } from '@/components/primitives/Skeleton';
import { TraceStage } from '@/visualizers/TraceStage';
import { cn } from '@/utils/cn';
import { formatCount, formatMs } from '@/utils/format';
import { NotFoundPage } from './NotFoundPage';

/** Metrics shown in the diff table, in the order they appear in the strip. */
const METRIC_ROWS: readonly { readonly key: keyof MetricsSnapshot; readonly label: string }[] = [
  { key: 'comparisons', label: 'comparisons' },
  { key: 'swaps', label: 'swaps' },
  { key: 'writes', label: 'writes' },
  { key: 'reads', label: 'reads' },
  { key: 'calls', label: 'calls' },
];

interface Lane {
  readonly meta: AlgorithmMeta;
  readonly module: AnyAlgorithmModule | null;
  readonly trace: AnyTrace | null;
  readonly status: 'loading' | 'ready' | 'error';
}

/**
 * Compare Mode: two algorithms, one clock.
 *
 * Both lanes are stepped by the *same* cursor, which is the only honest way to
 * race them — the reader sees "at the end of bubble sort's 180th step, merge
 * sort is already sorting its second half". Each lane keeps its own trace and
 * its own metrics; nothing is shared except the playhead, so the comparison is
 * never contaminated by one algorithm's state.
 */
export function ComparePage() {
  const { leftId, rightId } = useParams<{ leftId: string; rightId: string }>();
  const navigate = useNavigate();
  const values = useArrayValues();
  const graphInput = useSessionStore((s) => s.graphInput);
  const datasetKind = useSessionStore((s) => s.datasetKind);
  const seed = useSessionStore((s) => s.seed);

  const leftMeta = leftId ? ALGORITHM_BY_ID.get(leftId) : undefined;
  const rightMeta = rightId ? ALGORITHM_BY_ID.get(rightId) : undefined;
  const left = useAlgorithmModule(leftId ?? '');
  const right = useAlgorithmModule(rightId ?? '');

  const input = useMemo<AlgorithmInput | null>(() => {
    if (!leftMeta || !rightMeta) return null;
    const kind = leftMeta.inputKind;
    if (kind === 'array') {
      const base: AlgorithmInput = { kind: 'array', values };
      if (leftMeta.category === 'searching') {
        return { ...base, target: values[Math.floor(values.length / 2)] ?? 0 };
      }
      return base;
    }
    if (kind === 'tree') return { kind: 'tree', values };
    if (kind === 'graph') return graphInput ?? null;
    return null;
  }, [graphInput, leftMeta, rightMeta, values]);

  const buildLane = useCallback(
    (module: typeof left.module, meta: AlgorithmMeta | undefined): Lane['trace'] => {
      if (!module || !meta) return null;
      try {
        return module.definition.generate(input ?? module.definition.defaultInput(), {
          runId: `${meta.id}@compare`,
          dataSet: datasetKind,
          seed,
        });
      } catch (cause) {
        console.error('[AlgoVerse] compare trace failed', cause);
        return null;
      }
    },
    [datasetKind, input, seed],
  );

  const leftTrace = useMemo(() => buildLane(left.module, leftMeta), [buildLane, left.module, leftMeta]);
  const rightTrace = useMemo(() => buildLane(right.module, rightMeta), [buildLane, right.module, rightMeta]);

  const length = Math.max(leftTrace?.steps.length ?? 0, rightTrace?.steps.length ?? 0);

  /* ── the shared clock ────────────────────────────────────────────────── */
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const accumulator = useRef(0);
  const lastFrame = useRef(0);
  const cursorRef = useRef(0);

  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);

  useEffect(() => {
    setCursor(0);
    cursorRef.current = 0;
    setPlaying(false);
    accumulator.current = 0;
  }, [input, leftId, rightId]);

  useEffect(() => {
    if (!playing || length === 0) return undefined;
    let frame = 0;

    const loop = (now: number): void => {
      const delta = lastFrame.current === 0 ? 16 : now - lastFrame.current;
      lastFrame.current = now;
      accumulator.current += delta;

      let next = cursorRef.current;
      // Consume whole steps: at 4× several steps can elapse inside one frame.
      let guard = 0;
      while (guard < 400) {
        const duration = stepDurationMs(leftTrace?.steps[next], speed);
        if (accumulator.current < duration) break;
        accumulator.current -= duration;
        if (next >= length - 1) {
          accumulator.current = 0;
          setPlaying(false);
          break;
        }
        next += 1;
        guard += 1;
      }

      if (next !== cursorRef.current) {
        cursorRef.current = next;
        setCursor(next);
      }
      frame = requestAnimationFrame(loop);
    };

    lastFrame.current = 0;
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [leftTrace, length, playing, speed]);

  if (!leftMeta || !rightMeta) return <NotFoundPage title="Pick two algorithms to compare" />;

  const leftStep = leftTrace?.steps[cursor] ?? null;
  const rightStep = rightTrace?.steps[cursor] ?? null;
  const leftMetrics = leftStep?.metrics ?? ZERO_METRICS;
  const rightMetrics = rightStep?.metrics ?? ZERO_METRICS;
  const leftFinal = leftTrace?.steps[leftTrace.steps.length - 1]?.metrics ?? ZERO_METRICS;
  const rightFinal = rightTrace?.steps[rightTrace.steps.length - 1]?.metrics ?? ZERO_METRICS;
  const leftDone = Boolean(leftTrace) && cursor >= (leftTrace?.steps.length ?? 1) - 1;
  const rightDone = Boolean(rightTrace) && cursor >= (rightTrace?.steps.length ?? 1) - 1;

  const step = (delta: 1 | -1): void => {
    setPlaying(false);
    setCursor((current) => clampCursor(current + delta, length));
  };

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[1800px] flex-col gap-3 px-3 py-3 lg:px-5">
      <header className="flex flex-wrap items-center gap-2">
        <Link
          to="/"
          className="text-2xs uppercase tracking-[0.16em] text-ink-faint transition-colors hover:text-accent-cyan"
        >
          AlgoVerse
        </Link>
        <span aria-hidden className="text-ink-faint/50">
          /
        </span>
        <h1 className="font-display text-sm font-semibold tracking-tight text-ink">Compare Mode</h1>
        <Badge tone="violet" mono>
          lockstep
        </Badge>
        <p className="min-w-0 flex-1 truncate text-2xs text-ink-faint">
          Both traces advance on one shared cursor, so step <span className="font-mono text-ink-dim">{cursor + 1}</span> of
          each algorithm is on screen at the same time.
        </p>
        <Button
          size="sm"
          variant="secondary"
          icon="shuffle"
          onClick={() => navigate(`/compare/${rightMeta.id}/${leftMeta.id}`)}
        >
          Swap sides
        </Button>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
        <LaneCard
          lane={{ meta: leftMeta, module: left.module, trace: leftTrace, status: left.status }}
          side="left"
          cursor={cursor}
          speed={speed}
          done={leftDone}
          metrics={leftMetrics}
          onPick={(id) => navigate(`/compare/${id}/${rightMeta.id}`)}
        />
        <LaneCard
          lane={{ meta: rightMeta, module: right.module, trace: rightTrace, status: right.status }}
          side="right"
          cursor={cursor}
          speed={speed}
          done={rightDone}
          metrics={rightMetrics}
          onPick={(id) => navigate(`/compare/${leftMeta.id}/${id}`)}
        />
      </div>

      <section className="glass-strong flex flex-col gap-3 rounded-2xl px-3 py-3" aria-label="Comparison transport">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="icon-sm"
            variant={playing ? 'primary' : 'secondary'}
            onClick={() => {
              if (!playing && cursor >= length - 1) setCursor(0);
              setPlaying((value) => !value);
            }}
            aria-label={playing ? 'Pause both traces' : 'Play both traces'}
            disabled={length === 0}
          >
            <Icon name={playing ? 'pause' : 'play'} size={15} filled={!playing} />
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={() => step(-1)} disabled={cursor <= 0} aria-label="Step back">
            <Icon name="step-back" size={15} />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => step(1)}
            disabled={cursor >= length - 1}
            aria-label="Step forward"
          >
            <Icon name="step-forward" size={15} />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => {
              setPlaying(false);
              setCursor(0);
            }}
            disabled={cursor === 0 && !playing}
            aria-label="Reset both traces"
          >
            <Icon name="reset" size={15} />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => {
              setPlaying(false);
              setCursor(Math.max(0, length - 1));
            }}
            disabled={length === 0}
            aria-label="Jump to the end"
          >
            <Icon name="jump-end" size={15} />
          </Button>

          <div className="min-w-[190px] flex-1">
            <Slider
              ariaLabel="Shared step"
              min={0}
              max={Math.max(0, length - 1)}
              step={1}
              value={cursor}
              onChange={(value) => {
                setPlaying(false);
                setCursor(value);
              }}
            />
          </div>

          <span className="font-mono text-2xs text-ink-faint">
            {cursor + 1} / {Math.max(1, length)}
          </span>

          <Segmented
            ariaLabel="Comparison speed"
            options={SPEED_STOPS.map((stop) => ({ value: String(stop), label: `${stop}×` }))}
            value={String(speed)}
            onChange={(value) => setSpeed(Number(value))}
          />
        </div>

        <MetricsDiff
          left={{ meta: leftMeta, current: leftMetrics, final: leftFinal, steps: leftTrace?.steps.length ?? 0 }}
          right={{ meta: rightMeta, current: rightMetrics, final: rightFinal, steps: rightTrace?.steps.length ?? 0 }}
          durationMs={totalDurationMs(leftTrace ?? rightTrace, speed)}
        />
      </section>
    </div>
  );
}

function LaneCard({
  lane,
  side,
  cursor,
  speed,
  done,
  metrics,
  onPick,
}: {
  lane: Lane;
  side: 'left' | 'right';
  cursor: number;
  speed: number;
  done: boolean;
  metrics: MetricsSnapshot;
  onPick: (algorithmId: string) => void;
}) {
  const options = algorithmsInCategory(lane.meta.category).filter((entry) => entry.status === 'ready');
  const over = Boolean(lane.trace) && cursor > (lane.trace?.steps.length ?? 0) - 1;

  return (
    <section
      aria-label={`${lane.meta.name} lane`}
      className={cn(
        'flex min-h-[320px] flex-col overflow-hidden rounded-2xl border border-line/60 bg-surface/30',
        over && 'opacity-70',
      )}
    >
      <header className="flex flex-wrap items-center gap-2 border-b border-line/60 px-3 py-2">
        <label className="sr-only" htmlFor={`lane-${side}`}>
          Algorithm for the {side} lane
        </label>
        <select
          id={`lane-${side}`}
          value={lane.meta.id}
          onChange={(event) => onPick(event.target.value)}
          className="max-w-[220px] rounded-lg border border-line/70 bg-transparent px-2 py-1 font-display text-xs text-ink outline-none transition-colors hover:border-accent-cyan/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-cyan"
        >
          {options.map((option) => (
            <option key={option.id} value={option.id} className="bg-base text-ink">
              {option.name}
            </option>
          ))}
        </select>
        <DifficultyBadge difficulty={lane.meta.difficulty} />
        <div className="ml-auto flex items-center gap-1.5">
          {done ? (
            <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <Badge tone="lime" mono>
                finished
              </Badge>
            </motion.span>
          ) : (
            <Badge tone="cyan" mono>
              step {cursor + 1}
            </Badge>
          )}
          <Badge tone="neutral" mono>
            {formatCount(metrics.comparisons)} cmp
          </Badge>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        {lane.status === 'loading' || !lane.trace || !lane.module ? (
          <div className="flex h-full items-center justify-center">
            <VisualizerSkeleton />
          </div>
        ) : (
          <TraceStage module={lane.module} trace={lane.trace} index={cursor} speed={speed} />
        )}
      </div>
    </section>
  );
}

function MetricsDiff({
  left,
  right,
  durationMs,
}: {
  left: { meta: AlgorithmMeta; current: MetricsSnapshot; final: MetricsSnapshot; steps: number };
  right: { meta: AlgorithmMeta; current: MetricsSnapshot; final: MetricsSnapshot; steps: number };
  durationMs: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-2xs">
        <caption className="sr-only">Cumulative metrics for both algorithms at the current step</caption>
        <thead>
          <tr className="text-ink-faint">
            <th scope="col" className="py-1 text-left font-normal">
              metric
            </th>
            <th scope="col" className="py-1 text-right font-normal">
              {left.meta.name}
            </th>
            <th scope="col" className="py-1 text-right font-normal">
              {right.meta.name}
            </th>
            <th scope="col" className="py-1 text-right font-normal">
              difference
            </th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {METRIC_ROWS.map((row) => {
            const a = left.current[row.key];
            const b = right.current[row.key];
            const delta = a - b;
            return (
              <tr key={row.key} className="border-t border-line/40">
                <th scope="row" className="py-1 text-left font-normal text-ink-dim">
                  {row.label}
                </th>
                <td className="py-1 text-right text-ink">{formatCount(a)}</td>
                <td className="py-1 text-right text-ink">{formatCount(b)}</td>
                <td
                  className={cn(
                    'py-1 text-right',
                    delta === 0 ? 'text-ink-faint' : delta < 0 ? 'text-accent-lime' : 'text-accent-pink',
                  )}
                >
                  {delta > 0 ? '+' : ''}
                  {formatCount(delta)}
                </td>
              </tr>
            );
          })}
          <tr className="border-t border-line/40">
            <th scope="row" className="py-1 text-left font-normal text-ink-dim">
              total steps
            </th>
            <td className="py-1 text-right text-ink">{formatCount(left.steps)}</td>
            <td className="py-1 text-right text-ink">{formatCount(right.steps)}</td>
            <td className="py-1 text-right text-ink-faint">
              {left.steps === right.steps ? 'equal' : left.steps < right.steps ? 'left is shorter' : 'right is shorter'}
            </td>
          </tr>
          <tr className="border-t border-line/40">
            <th scope="row" className="py-1 text-left font-normal text-ink-dim">
              work at the end
            </th>
            <td className="py-1 text-right text-ink">{formatCount(left.final.comparisons + left.final.writes)}</td>
            <td className="py-1 text-right text-ink">{formatCount(right.final.comparisons + right.final.writes)}</td>
            <td className="py-1 text-right text-ink-faint">
              comparisons + writes · {formatMs(Math.round(durationMs))} of playback
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
