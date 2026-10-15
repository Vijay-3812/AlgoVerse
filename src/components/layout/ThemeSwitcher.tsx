import { motion } from 'framer-motion';
import type { Theme } from '@/types';
import { useThemeStore } from '@/store/themeStore';
import { Icon, type IconName } from '@/components/primitives/Icon';
import { Tooltip } from '@/components/primitives/Tooltip';
import { cn } from '@/utils/cn';

const OPTIONS: readonly { value: Theme; label: string; icon: IconName }[] = [
  { value: 'dark', label: 'Dark', icon: 'moon' },
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'cyberpunk', label: 'Cyberpunk', icon: 'zap' },
];

/**
 * Theme switcher.
 *
 * Three fixed buttons with a `layoutId` pill that slides between them — the
 * cross-fade itself is CSS (tokens transition), so the swap never re-renders a
 * visualiser mid-animation.
 */
export function ThemeSwitcher({ className }: { className?: string }) {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn('flex items-center gap-0.5 rounded-xl border border-line/70 bg-surface/50 p-0.5', className)}
    >
      {OPTIONS.map((option) => {
        const active = theme === option.value;
        return (
          <Tooltip key={option.value} label={option.label} side="bottom">
            <button
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${option.label} theme`}
              onClick={() => setTheme(option.value)}
              className={cn(
                'relative flex h-7 w-7 items-center justify-center rounded-[10px] transition-colors',
                active ? 'text-ink' : 'text-ink-faint hover:text-ink-dim',
              )}
            >
              {active ? (
                <motion.span
                  layoutId="theme-pill"
                  transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                  className="absolute inset-0 -z-10 rounded-[10px] border border-line/80 bg-elevated shadow-sm"
                />
              ) : null}
              <Icon name={option.icon} size={14} />
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
