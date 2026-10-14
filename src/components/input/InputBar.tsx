import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DataSetKind, InputKind } from '@/types';
import { MAX_SIZE, MIN_SIZE, useSessionStore } from '@/store/sessionStore';
import { useArrayValues } from '@/hooks/useArrayInput';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/primitives/Icon';
import { Segmented } from '@/components/primitives/Segmented';
import { Slider } from '@/components/primitives/Slider';
import { Tooltip } from '@/components/primitives/Tooltip';
import { DATA_SET_LABEL } from '@/utils/format';
import { GRAPH_PRESETS } from '@/utils/graphPresets';
import { PRESET_BY_ID } from '@/utils/graphPresets';
import { cn } from '@/utils/cn';
import { toast } from '@/store/toastStore';

const PRESETS: ReadonlyArray<{ value: DataSetKind; label: string }> = [
  { value: 'random', label: 'Random' },
  { value: 'sorted', label: 'Sorted' },
  { value: 'reversed', label: 'Reversed' },
  { value: 'nearly-sorted', label: 'Nearly sorted' },
];

export interface InputBarProps {
  /** Which controls make sense for this algorithm's input shape. */
  readonly inputKind: InputKind;
  readonly className?: string;
}

/**
 * Dataset controls: presets, size, randomise, custom input, saved inputs.
 *
 * Every change bumps `seed` (or the custom values), which changes the run id,
 * which regenerates the trace — the whole data path is one store, so the
 * visualiser, timeline and metrics all move together with no extra wiring.
 */
export function InputBar({ inputKind, className }: InputBarProps) {
  const datasetKind = useSessionStore((s) => s.datasetKind);
  const size = useSessionStore((s) => s.size);
  const customValues = useSessionStore((s) => s.customValues);
  const saved = useSessionStore((s) => s.saved);
  const { setDatasetKind, setSize, randomise, applyCustomText, saveCurrent, removeSaved, loadSaved } =
    useSessionStore.getState();

  const [customOpen, setCustomOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  const values = useArrayValues();
  const graphPreset = useSessionStore((s) => s.graphPreset);
  const graphInput = useSessionStore((s) => s.graphInput);
  const setGraphPreset = useSessionStore((s) => s.setGraphPreset);

  const supportsSize = inputKind === 'array' || inputKind === 'tree';
  const supportsPresets = inputKind === 'array' || inputKind === 'tree';
  const isGraph = inputKind === 'graph';

  const activePreset = PRESET_BY_ID.get(graphPreset);
  const graphSummary = useMemo(() => {
    if (!graphInput || graphInput.kind !== 'graph') return 'algorithm default';
    const weights = graphInput.edges.filter((edge) => edge.weight !== undefined).length;
    return `${graphInput.nodes.length} nodes · ${graphInput.edges.length} edges${weights > 0 ? ' · weighted' : ''}`;
  }, [graphInput]);

  const preview = useMemo(() => {
    if (values.length <= 22) return values.join(' ');
    return `${values.slice(0, 12).join(' ')} … ${values.slice(-6).join(' ')}`;
  }, [values]);

  useEffect(() => {
    if (!customOpen) return undefined;
    const onPointerDown = (event: PointerEvent): void => {
      if (!popoverRef.current) return;
      if (!popoverRef.current.contains(event.target as Node)) setCustomOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [customOpen]);

  const applyCustom = useCallback(() => {
    if (applyCustomText(draft)) {
      setCustomOpen(false);
      toast.success('Custom input applied', `${draft.split(/[\s,;]+/).filter(Boolean).length} values`);
    } else {
      toast.error('Could not parse that input', 'Use comma, space or newline separated integers.');
    }
  }, [applyCustomText, draft]);

  return (
    <div className={cn('relative flex flex-wrap items-center gap-2', className)}>
      {isGraph ? (
        <>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Graph preset">
            {GRAPH_PRESETS.map((preset) => {
              const active = preset.id === graphPreset;
              return (
                <Tooltip key={preset.id} label={preset.hint} side="top">
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setGraphPreset(preset.id)}
                    className={cn(
                      'rounded-lg border px-2.5 py-1 font-mono text-2xs transition-colors',
                      active
                        ? 'border-accent-cyan/60 bg-accent-cyan/10 text-accent-cyan'
                        : 'border-line/70 text-ink-dim hover:border-accent-cyan/40 hover:text-ink',
                    )}
                  >
                    {preset.label}
                  </button>
                </Tooltip>
              );
            })}
          </div>
          <span className="rounded-lg border border-line/70 px-2 py-1 font-mono text-2xs text-ink-faint">
            {graphSummary}
            {activePreset?.id === 'auto' ? ' — chosen by the algorithm' : ''}
          </span>
        </>
      ) : supportsPresets ? (
        <Segmented
          ariaLabel="Dataset preset"
          size="sm"
          options={PRESETS.map((preset) => ({ value: preset.value, label: preset.label }))}
          value={customValues ? 'custom' : datasetKind}
          onChange={(value) => setDatasetKind(value as DataSetKind)}
        />
      ) : (
        <span className="rounded-lg border border-line/70 px-2 py-1 font-mono text-2xs text-ink-faint">
          input: {inputKind}
        </span>
      )}

      {supportsSize ? (
        <div className="flex min-w-[8.5rem] items-center gap-2">
          <Tooltip label="Dataset size" side="top">
            <Icon name="grid" size={13} className="text-ink-faint" />
          </Tooltip>
          <Slider
            ariaLabel="Dataset size"
            min={MIN_SIZE}
            max={MAX_SIZE}
            step={2}
            value={size}
            onChange={setSize}
            className="w-24"
          />
          <span className="w-8 font-mono text-2xs tabular-nums text-ink-dim">{size}</span>
        </div>
      ) : null}

      <Tooltip label="New random data" side="top">
        <Button size="icon-sm" variant="ghost" onClick={randomise} aria-label="Randomise data">
          <Icon name="shuffle" size={15} />
        </Button>
      </Tooltip>

      <Tooltip label="Enter custom values" side="top">
        <Button
          size="sm"
          variant="ghost"
          icon="plus"
          onClick={() => setCustomOpen((open) => !open)}
          aria-expanded={customOpen}
          aria-haspopup="dialog"
        >
          Custom
        </Button>
      </Tooltip>

      {customValues ? (
        <button
          type="button"
          onClick={() => setDatasetKind('random')}
          className="flex items-center gap-1 rounded-lg border border-accent-cyan/40 bg-accent-cyan/10 px-2 py-1 text-2xs text-accent-cyan transition-colors hover:bg-accent-cyan/15"
          title="Clear custom input"
        >
          custom · {customValues.length} values
          <Icon name="close" size={11} />
        </button>
      ) : null}

      {/* preview of the exact dataset in play */}
      <span
        className="hidden max-w-[22rem] truncate rounded-lg border border-line/60 bg-bg/40 px-2 py-1 font-mono text-2xs text-ink-faint lg:block"
        title={values.join(', ')}
      >
        [{preview}]
      </span>

      <AnimatePresence>
        {customOpen ? (
          <motion.div
            ref={popoverRef}
            role="dialog"
            aria-label="Custom input"
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="glass-strong absolute bottom-[calc(100%+10px)] left-0 z-50 w-[min(26rem,calc(100vw-2rem))] rounded-2xl p-3.5"
          >
            <p className="text-2xs font-medium uppercase tracking-[0.16em] text-ink-faint">Custom values</p>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={3}
              spellCheck={false}
              placeholder="64, 25, 12, 22, 11, 90, 45 …"
              className="mt-2 w-full resize-none rounded-xl border border-line/70 bg-bg/50 px-3 py-2 font-mono text-xs text-ink placeholder:text-ink-faint focus:border-accent-cyan/50 focus:outline-none"
            />
            <div className="mt-2.5 flex items-center gap-2">
              <Button size="sm" variant="primary" icon="check" onClick={applyCustom}>
                Apply
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  saveCurrent(`Input ${saved.length + 1}`);
                  toast.success('Input saved to this browser');
                }}
              >
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDraft(values.join(', '))}>
                Load current
              </Button>
            </div>

            {saved.length ? (
              <div className="mt-3 border-t border-line/60 pt-2.5">
                <p className="text-2xs uppercase tracking-[0.16em] text-ink-faint">Saved</p>
                <ul className="mt-1.5 max-h-32 space-y-1 overflow-y-auto">
                  {saved.map((entry) => (
                    <li key={entry.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          loadSaved(entry.id);
                          setCustomOpen(false);
                        }}
                        className="min-w-0 flex-1 truncate rounded-md px-2 py-1 text-left text-2xs text-ink-dim transition-colors hover:bg-surface/60 hover:text-ink"
                      >
                        {entry.name}
                        <span className="ml-2 font-mono text-ink-faint">{entry.values.length} values</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSaved(entry.id)}
                        aria-label={`Delete ${entry.name}`}
                        className="rounded-md p-1 text-ink-faint transition-colors hover:bg-surface hover:text-accent-red"
                      >
                        <Icon name="close" size={11} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <p className="mt-3 text-[10px] leading-relaxed text-ink-faint">
              Saved inputs live in this browser’s localStorage. CSV import and file drop land with the
              Phase 8 export/import pass — {DATA_SET_LABEL.custom} data already round-trips as text.
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
