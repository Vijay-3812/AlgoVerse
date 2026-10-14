import { motion } from 'framer-motion';
import { defineModule } from '@/types';
import type { AlgorithmDefinition, CallSnapshot, VisualizerProps } from '@/types';
import { code, defineAlgorithm, finish, numberOf, pseudo, type AlgorithmSpec } from '@/algorithms/kit';
import { CallVisualizer } from '@/visualizers/CallVisualizer';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { CallModel, callBuilder } from './kit';
import { COMPLEXITY, numberInput } from './specs';

/**
 * Tower of Hanoi — the recursion that makes exponential cost feel inevitable.
 *
 * `hanoi(n)` is three lines: move n−1 aside, move the biggest disk, move the
 * n−1 back on top. The call stack shows the two recursive calls per level, and
 * the rods underneath show the physical consequence — the largest disk moves
 * exactly once, and every extra disk doubles the work.
 *
 * @pure — identical input + run ⇒ identical trace.
 */

interface HanoiData {
  readonly call: string;
  readonly pegs?: readonly (readonly number[])[];
  readonly move?: { readonly from: number; readonly to: number; readonly disk: number };
}

/** Rods A/B/C, drawn from the trace's own disk state. */
function PegsView({ pegs }: { pegs: readonly (readonly number[])[] }) {
  const reduce = usePrefersReducedMotion();
  return (
    <div className="grid shrink-0 grid-cols-3 gap-3 border-t border-line/50 px-4 py-3" aria-label="rods">
      {pegs.map((peg, pegIndex) => (
        <div
          key={pegIndex}
          className="flex h-24 flex-col justify-end gap-1 rounded-xl border border-line/50 bg-surface/20 p-2"
        >
          {peg.map((disk) => (
            <motion.div
              key={disk}
              layout
              transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 28 }}
              className="mx-auto h-3 rounded-sm"
              style={{
                width: `${20 + disk * 14}%`,
                background: `linear-gradient(90deg, hsl(${190 + disk * 26} 90% 62%), hsl(${190 + disk * 26} 88% 44%))`,
              }}
              title={`disk ${disk}`}
            />
          ))}
          <span className="text-center font-mono text-[10px] text-ink-faint">
            {['A', 'B', 'C'][pegIndex] ?? String(pegIndex)}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * The shared call visualiser, with the rods attached underneath.
 *
 * Composition rather than a second stack renderer: the stack, the recursion
 * tree and the locals panel keep exactly the behaviour every other recursive
 * algorithm has, and Hanoi simply adds the one view that is specific to it.
 */
function HanoiVisualizer(props: VisualizerProps<CallSnapshot, HanoiData>) {
  const pegs = props.step.data?.pegs;
  return (
    <div className="flex h-full w-full flex-col">
      <div className="min-h-0 flex-1">
        <CallVisualizer {...props} />
      </div>
      {pegs && pegs.length === 3 ? <PegsView pegs={pegs} /> : null}
    </div>
  );
}

const spec: AlgorithmSpec<CallSnapshot, HanoiData> = {
  id: 'tower-of-hanoi',
  complexity: COMPLEXITY.hanoi!,
  pseudocode: pseudo(`
#hanoi(n, from, to, via)
# if n = 0: return              ← nothing left to move
# hanoi(n − 1, from, via, to)   ← clear the smaller disks aside
# move disk n: from → to        ← the only legal big move
# hanoi(n − 1, via, to, from)   ← stack them back on top`),
  code: code(
    `
function hanoi(n, from, to, via) {
  if (n === 0) return;
  hanoi(n - 1, from, via, to);
  move(n, from, to);
  hanoi(n - 1, via, to, from);
}`,
    `
def hanoi(n, frm, to, via):
    if n == 0:
        return
    hanoi(n - 1, frm, via, to)
    move(n, frm, to)
    hanoi(n - 1, via, to, frm)`,
    `
void hanoi(int n, int from, int to, int via) {
  if (n == 0) return;
  hanoi(n - 1, from, via, to);
  move(n, from, to);
  hanoi(n - 1, via, to, from);
}`,
    `
static void hanoi(int n, int from, int to, int via) {
  if (n == 0) return;
  hanoi(n - 1, from, via, to);
  move(n, from, to);
  hanoi(n - 1, via, to, from);
}`,
  ),
  explanation: [
    'You cannot move disk n until disks 1…n−1 are out of the way — so move them to the spare peg, move the large disk once, then bring them back.',
    'That is two recursive calls per level, so the move count satisfies T(n) = 2·T(n−1) + 1 and therefore equals 2ⁿ − 1. Every extra disk doubles the work.',
    'The largest disk moves exactly once in the entire sequence. With 20 disks that is a million moves; the legendary 64 disks would take longer than the age of the universe.',
  ],
  defaultInput: numberInput(4),
  generate: (input, run) => {
    const disks = Math.max(1, Math.min(6, Math.floor(numberOf(input, 4))));
    const model = new CallModel();
    const rods: number[][] = [Array.from({ length: disks }, (_, i) => disks - i), [], []];
    const builder = callBuilder<HanoiData>(model);
    let moves = 0;
    const total = 2 ** disks - 1;
    const name = (rod: number): string => ['A', 'B', 'C'][rod] ?? String(rod);

    /** Every step carries the full rod state, so the panel never guesses. */
    const rodState = (): number[][] => rods.map((rod) => [...rod]);

    builder.emit({
      kind: 'init',
      description: `${disks} disks on rod A → 2^${disks} − 1 = ${total} moves ahead.`,
      pseudocodeLine: 0,
      codeLine: 0,
      weight: 1.6,
    });

    const walk = (n: number, from: number, to: number, via: number): void => {
      model.flushReturned();
      const id = model.enter(`hanoi(${n})`, `${name(from)} → ${name(to)} via ${name(via)}`);
      model.setLocals([
        { name: 'n', value: String(n) },
        { name: 'from → to', value: `${name(from)} → ${name(to)}` },
      ]);

      builder.emit({
        kind: 'recurse',
        description:
          n === 0
            ? 'Base case: nothing to move at this level.'
            : `Move ${n - 1} disk${n - 1 === 1 ? '' : 's'} aside, then disk ${n} — then bring them back.`,
        pseudocodeLine: n === 0 ? 1 : 2,
        codeLine: n === 0 ? 1 : 2,
        bump: 'calls',
        weight: 1.15,
        data: { call: `hanoi(${n}, ${name(from)}, ${name(to)})`, pegs: rodState() },
      });

      if (n === 0) {
        model.leave(id);
        return;
      }

      walk(n - 1, from, via, to);

      const disk = rods[from]?.pop();
      if (disk !== undefined) rods[to]?.push(disk);
      moves += 1;
      model.setLocals([
        { name: 'move', value: `${moves} of ${total}` },
        { name: 'disk', value: String(disk ?? n) },
      ]);
      builder.emit({
        kind: 'write',
        description: `Move ${moves}/${total}: disk ${disk ?? n} from rod ${name(from)} to rod ${name(to)}.`,
        pseudocodeLine: 3,
        codeLine: 3,
        weight: 1.5,
        bump: 'writes',
        data: {
          call: `move(${n})`,
          pegs: rodState(),
          move: { from, to, disk: disk ?? n },
        },
      });

      walk(n - 1, via, to, from);
      model.leave(id);
      builder.emit({
        kind: 'return',
        description: `${n} disk${n === 1 ? '' : 's'} settled on rod ${name(to)}.`,
        pseudocodeLine: 4,
        codeLine: 4,
        weight: 1.3,
        data: { call: `hanoi(${n}) done`, pegs: rodState() },
      });
    };

    walk(disks, 0, 2, 1);
    model.reset();

    builder.emit({
      kind: 'complete',
      description: `All ${disks} disks on rod C after ${moves} moves — the optimal ${total}.`,
      pseudocodeLine: 4,
      codeLine: 4,
      weight: 3,
      data: { call: 'done', pegs: rodState() },
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: { headline: `${disks} disks moved`, detail: `${moves} moves (optimal)`, output: moves },
      expectedState: () => moves === total && (rods[2]?.length ?? 0) === disks,
    });
  },
};

export const definition: AlgorithmDefinition<CallSnapshot, HanoiData> = defineAlgorithm(spec);

/** The loadable module: definition + renderer, consumed by the registry. */
export const module = defineModule({ definition, Visualizer: HanoiVisualizer });
