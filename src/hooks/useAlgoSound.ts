import { useEffect, useRef } from 'react';
import type { StepKind } from '@/types';
import { useUiStore } from '@/store/uiStore';
import { usePrefersReducedMotion } from './useMediaQuery';

/**
 * Web Audio "click track" for the visualiser.
 *
 * One lazily-created `AudioContext` and one gain node for the whole app: each
 * interesting step fires a short sine blip whose pitch maps to the step kind
 * (compare = a soft tick, swap = a fifth above, sorted = a rising triad).
 * The context is created on the first user gesture (browsers block it
 * otherwise) and the oscillator count is capped so a 20 000-step merge sort at
 * 8× cannot turn into a buzzsaw.
 */

const KIND_TONE: Partial<Record<StepKind, { hz: number; ms: number; type: OscillatorType }>> = {
  compare: { hz: 440, ms: 45, type: 'sine' },
  swap: { hz: 660, ms: 55, type: 'triangle' },
  write: { hz: 320, ms: 40, type: 'sine' },
  pivot: { hz: 520, ms: 70, type: 'sine' },
  sorted: { hz: 880, ms: 90, type: 'sine' },
  complete: { hz: 1320, ms: 220, type: 'sine' },
  found: { hz: 1040, ms: 160, type: 'sine' },
  'not-found': { hz: 180, ms: 200, type: 'sawtooth' },
  conflict: { hz: 140, ms: 130, type: 'square' },
  relax: { hz: 300, ms: 45, type: 'sine' },
  visit: { hz: 500, ms: 35, type: 'sine' },
  probe: { hz: 380, ms: 45, type: 'triangle' },
  union: { hz: 620, ms: 50, type: 'triangle' },
};

/** Steps worth a sound — everything else stays silent to avoid noise. */
const AUDIBLE: ReadonlySet<StepKind> = new Set(Object.keys(KIND_TONE) as StepKind[]);

export interface UseAlgoSoundOptions {
  /** Step kind that just became visible. */
  readonly kind: StepKind | null;
  /** Step counter — changes exactly once per step, driving the effect. */
  readonly stepIndex: number;
  /** 0..1 progress, used to detune the pitch over the run (a rising melody). */
  readonly progress: number;
}

let context: AudioContext | null = null;
let master: GainNode | null = null;
let activeVoices = 0;

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!context) {
    context = new Ctor();
    master = context.createGain();
    master.gain.value = 0.12;
    master.connect(context.destination);
  }
  if (context.state === 'suspended') void context.resume();
  return context;
}

function blip(hz: number, ms: number, type: OscillatorType, detune = 0): void {
  const ctx = ensureContext();
  if (!ctx || !master) return;
  if (activeVoices > 6) return; // never let dense traces stack up
  activeVoices += 1;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = hz;
  osc.detune.value = detune;

  const now = ctx.currentTime;
  const duration = ms / 1000;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.9, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(master);
  osc.start(now);
  osc.stop(now + duration + 0.02);
  osc.onended = () => {
    activeVoices = Math.max(0, activeVoices - 1);
    osc.disconnect();
    gain.disconnect();
  };
}

/** Play a one-shot tone (used by completion fanfares and button feedback). */
export function playTone(kind: StepKind): void {
  const tone = KIND_TONE[kind];
  if (tone) blip(tone.hz, tone.ms, tone.type);
}

export function useAlgoSound({ kind, stepIndex, progress }: UseAlgoSoundOptions): void {
  const enabled = useUiStore((s) => s.soundEnabled);
  const reduced = usePrefersReducedMotion();
  const lastPlayed = useRef(-1);

  useEffect(() => {
    if (!enabled || reduced || !kind || stepIndex === lastPlayed.current) return;
    if (!AUDIBLE.has(kind)) return;
    lastPlayed.current = stepIndex;

    // Unlock the context on the first audible step (a user gesture already
    // happened — they pressed play), then speak.
    const tone = KIND_TONE[kind];
    if (!tone) return;
    const detune = Math.round(progress * 300 - 150);
    blip(tone.hz, tone.ms, tone.type, detune);
  }, [enabled, kind, progress, reduced, stepIndex]);
}
