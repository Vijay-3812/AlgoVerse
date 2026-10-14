import { defineModule } from '@/types';
import type { AlgorithmDefinition, IntervalSnapshot } from '@/types';
import { code, defineAlgorithm, finish, pseudo, type AlgorithmSpec } from '@/algorithms/kit';
import { TraceBuilder } from '@/utils/traceBuilder';
import { IntervalVisualizer } from '@/visualizers/IntervalVisualizer';
import { COMPLEXITY } from './specs';

/**
 * Activity Selection — earliest finishing time wins.
 *
 * One room, many candidate activities. Sorting by finish time and always taking
 * the first activity that starts after the last one finished is optimal, and the
 * trace makes the argument visible: the chosen bar ends leftmost, so it blocks
 * the fewest successors.
 *
 * @pure — identical input + run ⇒ identical trace.
 */
interface ActivityData {
  readonly op: 'inspect' | 'take' | 'conflict' | 'done';
  readonly activity?: string;
}

interface Activity {
  readonly name: string;
  readonly start: number;
  readonly end: number;
}

const ACTIVITIES: readonly Activity[] = [
  { name: 'standup', start: 1, end: 4 },
  { name: 'review', start: 3, end: 5 },
  { name: 'design', start: 0, end: 6 },
  { name: 'pair', start: 5, end: 7 },
  { name: 'demo', start: 3, end: 9 },
  { name: 'retro', start: 8, end: 11 },
  { name: 'bugfix', start: 6, end: 10 },
];

const spec: AlgorithmSpec<IntervalSnapshot, ActivityData> = {
  id: 'activity-selection',
  complexity: COMPLEXITY['activity-selection']!,
  pseudocode: pseudo(`
#activitySelection(intervals)
# sort by finish time            ← the greedy choice hinges on this order
# last ← −∞; chosen ← []
# for each activity a in that order
#   if a.start ≥ last
#     chosen.push(a); last ← a.end    ← compatible: take it, no regrets
#   else
#     skip a                          ← clashes with the last chosen one
# return chosen`),
  code: code(
    `
function activitySelection(intervals) {
  const sorted = [...intervals].sort((a, b) => a.end - b.end);
  const chosen = [];
  let last = -Infinity;
  for (const a of sorted) {
    if (a.start >= last) { chosen.push(a); last = a.end; }
  }
  return chosen;
}`,
    `
def activity_selection(intervals):
    chosen, last = [], float("-inf")
    for a in sorted(intervals, key=lambda x: x[1]):
        if a[0] >= last:
            chosen.append(a)
            last = a[1]
    return chosen`,
    `
vector<Interval> activitySelection(vector<Interval> intervals) {
  sort(intervals.begin(), intervals.end(),
       [](const Interval& a, const Interval& b) { return a.end < b.end; });
  vector<Interval> chosen;
  int last = INT_MIN;
  for (const auto& a : intervals) {
    if (a.start >= last) { chosen.push_back(a); last = a.end; }
  }
  return chosen;
}`,
    `
static List<int[]> activitySelection(int[][] intervals) {
  Arrays.sort(intervals, (a, b) -> Integer.compare(a[1], b[1]));
  List<int[]> chosen = new ArrayList<>();
  int last = Integer.MIN_VALUE;
  for (int[] a : intervals) {
    if (a[0] >= last) { chosen.add(a); last = a[1]; }
  }
  return chosen;
}`,
  ),
  explanation: [
    'The greedy rule is "always take the activity that finishes earliest and does not clash". Because a bar that ends sooner never blocks more than one that ends later, this is provably optimal.',
    'Sorting by finish time is what makes the single linear sweep correct — sorting by duration or by start time are the two intuitive alternatives, and both give wrong answers.',
    'Every rejected bar overlaps the last accepted one, which is visible in the trace: the shaded conflicts all cross the right edge of the chosen bar.',
  ],
  learn: {
    useCases: ['Meeting-room booking', 'CPU job scheduling with fixed windows', 'Event selection for calendars'],
    practice: [
      { title: 'Non-overlapping Intervals', url: 'https://leetcode.com/problems/non-overlapping-intervals/', difficulty: 'medium' },
      { title: 'Meeting Rooms', url: 'https://leetcode.com/problems/meeting-rooms/', difficulty: 'easy' },
    ],
  },
  defaultInput: () => ({ kind: 'number', value: ACTIVITIES.length }),
  generate: (_input, run) => {
    const sorted = [...ACTIVITIES].sort((a, b) => a.end - b.end || a.start - b.start);
    const span: [number, number] = [0, Math.max(...ACTIVITIES.map((a) => a.end))];
    const chosen: Activity[] = [];

    let last = Number.NEGATIVE_INFINITY;
    let current: Activity | null = null;
    let compatible = false;

    const builder = new TraceBuilder<IntervalSnapshot, ActivityData>(() => ({
      items: [
        // The chosen activities stay on the top lane; the candidates on a second
        // one, so "what is blocked by what" is visible at a glance.
        ...chosen.map((activity) => ({
          id: activity.name,
          label: activity.name,
          start: activity.start,
          end: activity.end,
          role: 'sorted' as const,
        })),
        ...sorted
          .filter((activity) => !chosen.includes(activity))
          .map((activity) => ({
            id: activity.name,
            label: activity.name,
            start: activity.start,
            end: activity.end,
            role: current === activity ? (compatible ? ('frontier' as const) : ('danger' as const)) : ('muted' as const),
          })),
      ],
      span,
      caption: current
        ? `${current.name} [${current.start}, ${current.end}] — last accepted ends at ${last === Number.NEGATIVE_INFINITY ? '−∞' : last}`
        : `${chosen.length} activities accepted`,
      badges: { chosen: chosen.length, last: last === Number.NEGATIVE_INFINITY ? '−∞' : last },
    }));

    builder.emit({
      kind: 'init',
      description: `${ACTIVITIES.length} activities, one room — sorted by finish time: ${sorted.map((a) => a.name).join(' → ')}.`,
      pseudocodeLine: 0,
      codeLine: 1,
      weight: 1.6,
      data: { op: 'inspect' },
    });

    for (const activity of sorted) {
      current = activity;
      compatible = activity.start >= last;

      builder.emit({
        kind: 'compare',
        description: `${activity.name} runs [${activity.start}, ${activity.end}] — starts ${compatible ? 'after' : 'before'} the last accepted finish (${last === Number.NEGATIVE_INFINITY ? '−∞' : last}).`,
        pseudocodeLine: 3,
        codeLine: 4,
        weight: 1.1,
        bump: 'comparisons',
        data: { op: 'inspect', activity: activity.name },
      });

      if (compatible) {
        chosen.push(activity);
        last = activity.end;
        builder.emit({
          kind: 'choose',
          description: `Take ${activity.name} — it ends at ${activity.end}, leaving the most room for what follows.`,
          pseudocodeLine: 4,
          codeLine: 4,
          weight: 1.5,
          bump: 'writes',
          data: { op: 'take', activity: activity.name },
        });
      } else {
        builder.emit({
          kind: 'conflict',
          description: `Skip ${activity.name} — it clutters the room the accepted activities already use.`,
          pseudocodeLine: 6,
          codeLine: 4,
          weight: 0.7,
          data: { op: 'conflict', activity: activity.name },
        });
      }
    }

    current = null;
    compatible = false;
    builder.emit({
      kind: 'complete',
      description: `${chosen.length} activities fit: ${chosen.map((a) => a.name).join(', ')}. No schedule can hold more — that is the greedy guarantee.`,
      pseudocodeLine: 7,
      codeLine: 5,
      weight: 3,
      data: { op: 'done' },
    });

    return finish({
      builder,
      spec,
      input: { kind: 'number', value: ACTIVITIES.length },
      run,
      result: {
        headline: `${chosen.length} activities`,
        detail: chosen.map((a) => a.name).join(', '),
        output: chosen.length,
      },
      expectedState: () => chosen.length === reference(),
    });
  },
};

/** Independent check: exhaustive search over every subset of activities. */
function reference(): number {
  let best = 0;
  const subsets = 1 << ACTIVITIES.length;
  for (let mask = 0; mask < subsets; mask += 1) {
    const picked = ACTIVITIES.filter((_, i) => mask & (1 << i));
    const sorted = [...picked].sort((a, b) => a.start - b.start);
    let ok = true;
    for (let i = 1; i < sorted.length; i += 1) {
      if ((sorted[i]?.start as number) < (sorted[i - 1]?.end as number)) ok = false;
    }
    if (ok) best = Math.max(best, picked.length);
  }
  return best;
}

export const definition: AlgorithmDefinition<IntervalSnapshot, ActivityData> = defineAlgorithm(spec);

/** The loadable module: definition + renderer, consumed by the registry. */
export const module = defineModule({ definition, Visualizer: IntervalVisualizer });
