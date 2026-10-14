import { memo, useEffect, useMemo, useRef } from 'react';
import type { Language } from '@/types';
import { TOKEN_CLASS, highlightLine, type Token } from '@/utils/highlight';
import { cn } from '@/utils/cn';

interface LineProps {
  readonly tokens: readonly Token[];
}

const Line = memo(function Line({ tokens }: LineProps) {
  return (
    <>
      {tokens.map((token, index) => (
        <span key={index} className={TOKEN_CLASS[token.type]}>
          {token.text}
        </span>
      ))}
    </>
  );
});

export interface CodeBlockProps {
  readonly lines: readonly string[];
  readonly language: Language;
  /** 0-based line currently executing; scrolled into view and highlighted. */
  readonly activeLine?: number | null;
  readonly className?: string;
  readonly showLineNumbers?: boolean;
  /** Pseudocode mode: no syntax highlighting, tighter typography. */
  readonly plain?: boolean;
  readonly ariaLabel?: string;
}

/**
 * Read-only, line-synchronised code viewer.
 *
 * Memoises tokenisation per line so scrubbing a 10 000-step timeline never
 * re-tokenises anything, and scrolls the active line into view with
 * `block: 'nearest'` so the panel doesn't jump around.
 */
export function CodeBlock({
  lines,
  language,
  activeLine = null,
  className,
  showLineNumbers = true,
  plain = false,
  ariaLabel,
}: CodeBlockProps) {
  const activeRef = useRef<HTMLDivElement>(null);

  const tokenised = useMemo(
    () => lines.map((line) => (plain ? [{ text: line, type: 'plain' as const }] : highlightLine(line, language))),
    [lines, language, plain],
  );

  useEffect(() => {
    if (activeLine === null) return;
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeLine]);

  return (
    <div
      role="region"
      aria-label={ariaLabel ?? 'Code'}
      className={cn('scroll-y h-full font-mono text-[12.5px] leading-[1.7]', className)}
    >
      {tokenised.map((tokens, index) => {
        const isActive = activeLine === index;
        return (
          <div
            key={index}
            ref={isActive ? activeRef : undefined}
            data-active={isActive || undefined}
            className={cn(
              'relative flex gap-3 px-3 py-[1px] transition-colors duration-200',
              isActive
                ? 'bg-accent-cyan/10 text-ink'
                : 'hover:bg-surface/40',
            )}
          >
            {isActive ? (
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-accent-cyan to-accent-violet"
              />
            ) : null}
            {showLineNumbers ? (
              <span
                aria-hidden
                className={cn(
                  'w-7 shrink-0 select-none text-right tabular-nums',
                  isActive ? 'text-accent-cyan' : 'text-ink-faint/70',
                )}
              >
                {index + 1}
              </span>
            ) : null}
            <code className="whitespace-pre">
              {tokens.length === 0 ? ' ' : <Line tokens={tokens} />}
            </code>
          </div>
        );
      })}
    </div>
  );
}
