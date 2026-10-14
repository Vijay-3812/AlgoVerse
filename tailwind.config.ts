import type { Config } from 'tailwindcss';

/**
 * Every colour resolves to a CSS variable defined in `src/styles/tokens.css`,
 * so theme switching is a single attribute flip on <html> with no re-render of
 * the component tree (only a cross-fade). Channels are space separated so
 * Tailwind's alpha modifiers (e.g. `bg-surface/60`) keep working.
 */
const withOpacity = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: withOpacity('--c-bg'),
        elevated: withOpacity('--c-elevated'),
        surface: withOpacity('--c-surface'),
        line: withOpacity('--c-line'),
        ink: {
          DEFAULT: withOpacity('--c-ink'),
          dim: withOpacity('--c-ink-dim'),
          faint: withOpacity('--c-ink-faint'),
        },
        accent: {
          cyan: withOpacity('--c-cyan'),
          violet: withOpacity('--c-violet'),
          pink: withOpacity('--c-pink'),
          lime: withOpacity('--c-lime'),
          amber: withOpacity('--c-amber'),
          red: withOpacity('--c-red'),
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        glass: '0 1px 0 0 rgb(255 255 255 / 0.06) inset, 0 20px 60px -20px rgb(0 0 0 / 0.75)',
        glow: '0 0 0 1px rgb(var(--c-cyan) / 0.35), 0 0 32px -4px rgb(var(--c-cyan) / 0.45)',
        'glow-violet': '0 0 0 1px rgb(var(--c-violet) / 0.35), 0 0 36px -6px rgb(var(--c-violet) / 0.5)',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        'aurora-drift': {
          '0%': { transform: 'translate3d(-6%, -4%, 0) scale(1.05) rotate(0deg)' },
          '50%': { transform: 'translate3d(6%, 5%, 0) scale(1.15) rotate(12deg)' },
          '100%': { transform: 'translate3d(-6%, -4%, 0) scale(1.05) rotate(0deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.85)', opacity: '0.9' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        aurora: 'aurora-drift 26s ease-in-out infinite',
        shimmer: 'shimmer 3.5s linear infinite',
        'pulse-ring': 'pulse-ring 1.6s ease-out infinite',
        float: 'float 6s ease-in-out infinite',
        scanline: 'scanline 6s linear infinite',
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
      transitionTimingFunction: {
        swift: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
