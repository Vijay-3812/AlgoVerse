import type { SVGProps } from 'react';
import { cn } from '@/utils/cn';

/**
 * One inline SVG sprite for the whole app: no icon font, no network request,
 * no layout shift, and every glyph inherits `currentColor` so theming is free.
 * Icons are 24×24, 1.75 stroke, round caps — consistent optical weight.
 */
const PATHS = {
  // categories
  bars: 'M4 20V11M9.5 20V5M15 20v-6M20.5 20V8',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.35-4.35',
  stack: 'M12 3l8 4-8 4-8-4 8-4ZM4 12l8 4 8-4M4 17l8 4 8-4',
  hash: 'M4 9h16M4 15h16M10 3L8 21M16 3l-2 18',
  tree: 'M12 3v4M6 20v-3h12v3M12 7l-6 10M12 7l6 10',
  graph: 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8.6 13.4l6.8 4M15.4 6.6l-6.8 4',
  table: 'M3 5h18v14H3zM3 10h18M9 10v9M15 10v9',
  spark: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3ZM18.5 16l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z',
  text: 'M4 7V5h16v2M12 5v14M9 19h6',
  divide: 'M3 6h18M3 12h18M3 18h10',

  // transport
  play: 'M7 4l13 8-13 8V4Z',
  pause: 'M8 5v14M16 5v14',
  'step-forward': 'M6 4l9 8-9 8M19 4v16',
  'step-back': 'M18 4l-9 8 9 8M5 4v16',
  'jump-start': 'M19 4l-9 8 9 8M5 4v16M9 4v16',
  'jump-end': 'M5 4l9 8-9 8M19 4v16',
  reset: 'M3 12a9 9 0 1 0 2.6-6.3M3 4v5h5',
  loop: 'M17 2l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3',
  speed: 'M12 14l4-4M3 20a9 9 0 1 1 18 0M3 20h18',

  // actions
  shuffle: 'M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M4 12.5l5.5 5.5L20 7',
  chevronRight: 'M9 6l6 6-6 6',
  chevronDown: 'M6 9l6 6 6-6',
  chevronLeft: 'M15 6l-6 6 6 6',
  chevronUp: 'M6 15l6-6 6 6',
  panelLeft: 'M4 4h16v16H4zM9.5 4v16',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v5M12 8h.01',
  warning: 'M12 3l9 16H3l9-16ZM12 9v5M12 17h.01',
  star: 'M12 3l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 18l-5.9 3 1.2-6.5L2.5 9.9 9.1 9 12 3Z',
  link: 'M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1',
  download: 'M12 3v12M7 11l5 5 5-5M4 21h16',
  image: 'M3 5h18v14H3zM8.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM4 17l5-5 4 4 3-2 4 4',
  sound: 'M11 5L6 9H3v6h3l5 4V5ZM16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12',
  mute: 'M11 5L6 9H3v6h3l5 4V5ZM17 9l4 6M21 9l-4 6',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z',
  zap: 'M13 2L3 14h7l-1 8 10-12h-7l1-8Z',
  palette:
    'M12 3a9 9 0 1 0 0 18h1.5a2.5 2.5 0 0 0 0-5H13a2 2 0 0 1 0-4h4a4 4 0 0 0 0-9h-5ZM7.5 9.5h.01M11 7.5h.01M7 14h.01',
  code: 'M16 18l6-6-6-6M8 6l-6 6 6 6',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14M8 7h8M8 11h5',
  layers: 'M12 3l9 5-9 5-9-5 9-5ZM3 13l9 5 9-5M3 17l9 5 9-5',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM15.5 8.5l-2 5-5 2 2-5 5-2Z',
  grid: 'M3 9h18M3 15h18M9 3v18M15 3v18',
  dots: 'M6 12h.01M12 12h.01M18 12h.01',
  sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0',
  keyboard: 'M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M7 14h10',
  users: 'M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 20v-2a4 4 0 0 0-3-3.9M16 2.1a4 4 0 0 1 0 7.8',
  external: 'M14 3h7v7M21 3l-9 9M18 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5',
  rocket: 'M12 3c3 0 6 3 6 7 0 4-3 7-6 9-3-2-6-5-6-9 0-4 3-7 6-7ZM9 15l-3 3M15 15l3 3M12 10h.01',
} as const;

export type IconName = keyof typeof PATHS;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  readonly name: IconName;
  readonly size?: number | string;
  /** Solid icons (play/pause/star) look better filled. */
  readonly filled?: boolean;
}

export function Icon({ name, size = 16, filled = false, className, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn('shrink-0', className)}
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/** The AlgoVerse mark: three rising bars inside a glowing tile. */
export function AlgoVerseLogo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden="true">
      <defs>
        <linearGradient id="av-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgb(var(--c-cyan))" />
          <stop offset="55%" stopColor="rgb(var(--c-violet))" />
          <stop offset="100%" stopColor="rgb(var(--c-pink))" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="39" height="39" rx="11" fill="rgb(var(--c-surface) / 0.7)" stroke="url(#av-logo)" />
      <g fill="url(#av-logo)">
        <rect x="9" y="22" width="5.5" height="11" rx="2" />
        <rect x="17.2" y="16" width="5.5" height="17" rx="2" />
        <rect x="25.5" y="9" width="5.5" height="24" rx="2" />
      </g>
    </svg>
  );
}
