// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '@/App';
import { registerBuiltins } from '@/algorithms/register';
import { usePlaybackStore } from '@/store/playbackStore';
import { useSessionStore } from '@/store/sessionStore';

/**
 * End-to-end shell smoke test.
 *
 * Mounts the real app (router, shell, routes, registry, stores) in jsdom and
 * drives the actual transport. This is the test that catches the class of bug
 * type-checking cannot: an unstable Zustand selector looping forever, a route
 * that fails to resolve, a trace that fails to load.
 */
function renderAt(path: string) {
  registerBuiltins();
  return render(
    <MemoryRouter
      initialEntries={[path]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>,
  );
}

describe('AlgoVerse shell', () => {
  beforeEach(() => {
    usePlaybackStore.getState().clearTrace();
  });

  it('renders the landing page with the catalogue', async () => {
    renderAt('/');
    expect(await screen.findByRole('heading', { name: /algorithms you can/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /every structure, one engine/i })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /sorting/i }).length).toBeGreaterThan(0);
  });

  it('lists algorithms for a category', async () => {
    renderAt('/algorithms/sorting');
    expect(await screen.findByRole('heading', { name: 'Sorting', level: 1 })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Bubble Sort', level: 2 })).toBeInTheDocument();
  });

  it('loads a trace and drives playback with the keyboard', async () => {
    const user = userEvent.setup();
    renderAt('/algorithms/sorting/bubble-sort');

    // The visualiser chunk resolves asynchronously; the transport reports it.
    await waitFor(() => {
      expect(usePlaybackStore.getState().trace?.algorithmId).toBe('bubble-sort');
    });

    const store = usePlaybackStore.getState();
    const total = store.playback.length;
    expect(total).toBeGreaterThan(3);
    expect(store.playback.cursor).toBe(0);

    // → steps forward
    await user.keyboard('{ArrowRight}');
    expect(usePlaybackStore.getState().playback.cursor).toBe(1);

    // ← steps back
    await user.keyboard('{ArrowLeft}');
    expect(usePlaybackStore.getState().playback.cursor).toBe(0);

    // Space plays, Space pauses
    await user.keyboard(' ');
    expect(usePlaybackStore.getState().playback.status).toBe('playing');
    await user.keyboard(' ');
    expect(usePlaybackStore.getState().playback.status).toBe('paused');

    // End jumps to the last step, R returns to the start
    await user.keyboard('{End}');
    expect(usePlaybackStore.getState().playback.cursor).toBe(total - 1);
    await user.keyboard('r');
    expect(usePlaybackStore.getState().playback.cursor).toBe(0);
  });

  it('exposes playback controls with accessible names', async () => {
    renderAt('/algorithms/sorting/bubble-sort');
    expect(await screen.findByRole('toolbar', { name: /playback controls/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^play$/i })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: /trace timeline/i })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: /playback speed/i })).toBeInTheDocument();
  });

  it('switches inspector tabs and language, keeping the panel mounted', async () => {
    const user = userEvent.setup();
    renderAt('/algorithms/sorting/bubble-sort');
    await waitFor(() => expect(usePlaybackStore.getState().trace).not.toBeNull());

    await user.click(screen.getByRole('tab', { name: /code/i }));
    expect(await screen.findByRole('button', { name: 'py' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'py' }));
    expect(screen.getByRole('button', { name: 'py' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('tab', { name: /complexity/i }));
    expect(await screen.findByText(/live counters/i)).toBeInTheDocument();
  });

  it('loads a tree trace and draws the binary snapshot', async () => {
    renderAt('/algorithms/trees/avl');
    await waitFor(() => expect(usePlaybackStore.getState().trace?.algorithmId).toBe('avl'), { timeout: 5000 });

    const user = userEvent.setup();
    const steps = usePlaybackStore.getState().playback.length;
    expect(steps).toBeGreaterThan(3);

    // Running the scrubber to the end is pure replay — the generator does not
    // run again, so step count and final cursor stay in lockstep.
    await user.keyboard('{End}');
    await waitFor(() => expect(usePlaybackStore.getState().playback.cursor).toBe(steps - 1));

    // The tree visualiser draws the structure as a labelled SVG figure; the
    // opening frames are the empty tree, which legitimately has nothing to draw.
    const svg = await screen.findByRole('img', { name: /tree with \d+ nodes/i });
    expect(svg).toBeInTheDocument();

    // Scrubbing back replays the same trace instead of regenerating it.
    await user.keyboard('{ArrowLeft}');
    expect(usePlaybackStore.getState().playback.cursor).toBe(steps - 2);
  });

  it('draws an n-ary tree snapshot for the B-tree', async () => {
    renderAt('/algorithms/trees/b-tree');
    await waitFor(() => expect(usePlaybackStore.getState().trace?.algorithmId).toBe('b-tree'), { timeout: 5000 });
    const snapshot = usePlaybackStore.getState().trace?.steps[0]?.state as { kind?: string } | undefined;
    expect(snapshot?.kind).toBe('nary');
  });

  it('loads a graph trace and draws the graph stage', async () => {
    renderAt('/algorithms/graphs/bfs');
    await waitFor(() => expect(usePlaybackStore.getState().trace?.algorithmId).toBe('bfs'), { timeout: 5000 });

    const steps = usePlaybackStore.getState().playback.length;
    expect(steps).toBeGreaterThan(5);

    // The graph visualiser names its figure from the live snapshot, so the
    // assertion also proves the generator produced a real node/edge list.
    const figure = await screen.findByRole('img', { name: /graph with \d+ nodes and \d+ edges/i });
    expect(figure).toBeInTheDocument();

    await userEvent.setup().keyboard('{End}');
    expect(usePlaybackStore.getState().playback.cursor).toBe(steps - 1);
  });

  it('shows a 404 with a route out for an unknown algorithm', async () => {
    renderAt('/algorithms/sorting/not-a-real-algorithm');
    expect(await screen.findByText(/no such algorithm/i)).toBeInTheDocument();
  });

  it('keeps the comparison lanes in lockstep on one cursor', async () => {
    renderAt('/compare/bubble-sort/merge-sort');

    // Both lanes are named, and the metrics table reports both algorithms.
    const leftLane = await screen.findByRole('region', { name: /bubble sort lane/i }, { timeout: 8000 });
    const rightLane = screen.getByRole('region', { name: /merge sort lane/i });
    expect(leftLane).toBeInTheDocument();
    expect(rightLane).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /step forward/i }));
    await user.click(screen.getByRole('button', { name: /step forward/i }));
    // The shared cursor is the source of truth for both lanes' step badges.
    expect(screen.getAllByText('step 3').length).toBe(2);
  });

  it('opens Learn Mode with an authored intro and a working quiz', async () => {
    renderAt('/algorithms/sorting/bubble-sort');
    await waitFor(() => expect(usePlaybackStore.getState().trace?.algorithmId).toBe('bubble-sort'), { timeout: 5000 });

    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: /learn/i }));

    // Both headings wait: Learn Mode is a lazy chunk, so this also covers the
    // Suspense boundary the tab renders while the panel arrives.
    expect(await screen.findByRole('heading', { name: /about/i }, { timeout: 8000 })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /quick check/i })).toBeInTheDocument();
    expect(screen.getByText(/compares neighbours and swaps them/i)).toBeInTheDocument();

    // Answering a question reveals the explanation and scores the run.
    const options = screen.getAllByRole('button', { pressed: false }).filter((button) =>
      /^O\(|^(n|V|E)/.test(button.textContent?.trim() ?? ''),
    );
    const target = options[0] ?? screen.getAllByRole('button', { pressed: false })[0];
    const before = screen.getAllByRole('button', { pressed: false }).length;
    await user.click(target as HTMLElement);
    expect(screen.getAllByRole('button', { pressed: false }).length).toBeLessThan(before);
  });

  it('runs palette commands, not just algorithm search', async () => {
    renderAt('/algorithms/graphs/dijkstra');
    await waitFor(() => expect(usePlaybackStore.getState().trace?.algorithmId).toBe('dijkstra'), { timeout: 5000 });

    const user = userEvent.setup();
    await user.keyboard('{Control>}k{/Control}');

    const palette = await screen.findByRole('dialog', { name: /command palette/i });
    expect(palette).toBeInTheDocument();
    expect(await screen.findByText(/learn about dijkstra/i)).toBeInTheDocument();

    // Typing a keyword that appears only in a command's keywords must match.
    await user.keyboard('cyberpunk');
    const row = await screen.findByRole('option', { name: /theme: cyberpunk/i });
    expect(row).toBeInTheDocument();
  });

  it('reads a shared session out of the URL and ignores nonsense in it', async () => {
    renderAt('/algorithms/sorting/bubble-sort?n=12&ds=reversed&theme=light&speed=99&step=3&junk=1');

    await waitFor(() => expect(usePlaybackStore.getState().trace?.algorithmId).toBe('bubble-sort'), { timeout: 5000 });
    await waitFor(() => expect(useSessionStore.getState().size).toBe(12));

    expect(useSessionStore.getState().datasetKind).toBe('reversed');
    expect(document.documentElement.dataset.theme).toBe('light');
    // Out-of-range values are clamped, unknown keys ignored.
    expect(usePlaybackStore.getState().playback.speed).toBe(8);
    expect(usePlaybackStore.getState().playback.cursor).toBe(3);
  });
});
