import type { Language } from '@/types';

/**
 * ---------------------------------------------------------------------------
 *  CROSS-LANGUAGE LINE ALIGNMENT
 * ---------------------------------------------------------------------------
 *  The inspector shows one `codeLine` per step and lets the reader toggle
 *  between JavaScript, Python, C++ and Java. Hand-numbering four parallel
 *  templates is impossible to keep honest (and every new algorithm would add
 *  another chance to get it wrong), so alignment is derived instead:
 *
 *    1. discard structurally insignificant lines (blank lines, bare braces,
 *       `end`, `else:` closing cols) in every language,
 *    2. number what is left — the *statement ordinal*,
 *    3. map a JavaScript line to the line with the same ordinal in the target
 *       language, falling back to the nearest ordinal when the counts differ.
 *
 *  The result is always a valid index in the target language (never out of
 *  range, never pointing at a brace), which is the property the panel and the
 *  contract tests actually need. Pseudocode remains the authoritative
 *  line-by-line sync surface; this keeps the code tab honest as a best-effort
 *  mirror.
 */

/** Structural noise that carries no statement meaning. */
const INSIGNIFICANT = new Set(['{', '}', '};', '}', 'end', ':', ')', '});', 'else:', 'try:', 'do']);

function isSignificant(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0) return false;
  if (INSIGNIFICANT.has(trimmed)) return false;
  if (/^[})\];,]+$/.test(trimmed)) return false;
  if (/^(public|private|protected):$/.test(trimmed)) return false;
  return true;
}

/** Indices of the significant lines, in order. */
function significantLines(lines: readonly string[]): number[] {
  const out: number[] = [];
  lines.forEach((line, index) => {
    if (isSignificant(line)) out.push(index);
  });
  return out;
}

/**
 * For every line of `lines`, the ordinal of the statement it belongs to
 * (insignificant lines inherit the ordinal of the statement they close).
 */
function ordinalsFor(lines: readonly string[]): number[] {
  const significant = significantLines(lines);
  const ordinals = new Array<number>(lines.length).fill(-1);
  significant.forEach((lineIndex, ordinal) => {
    ordinals[lineIndex] = ordinal;
  });

  // Insignificant lines get the ordinal of the previous statement.
  let current = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const value = ordinals[i];
    if (value !== -1 && value !== undefined) current = value;
    else ordinals[i] = current;
  }
  return ordinals;
}

export type CodeMap = Record<Language, readonly number[]>;

/**
 * Builds, for each language, a lookup from a JavaScript line index to the
 * equivalent line in that language.
 */
export function buildCodeMap(samples: Partial<Record<Language, readonly string[]>>): CodeMap {
  const reference = samples.javascript ?? [];
  const referenceOrdinals = ordinalsFor(reference);

  const mapFor = (lines: readonly string[] | undefined): number[] => {
    if (!lines || lines.length === 0) return reference.map(() => 0);
    const significant = significantLines(lines);
    const ordinals = ordinalsFor(lines);
    const maxOrdinal = significant.length - 1;

    return referenceOrdinals.map((ordinal, jsLine) => {
      const clamped = Math.max(0, Math.min(ordinal, maxOrdinal));
      const target = significant[clamped];
      if (target === undefined) {
        // Empty target file — fall back to a clamped index rather than crash.
        return Math.max(0, Math.min(jsLine, lines.length - 1));
      }
      // Prefer the statement's own line; if the ordinal landed on a closing
      // brace, walk back to the statement it closes.
      void ordinals;
      return target;
    });
  };

  return {
    javascript: reference.map((_, i) => i),
    python: mapFor(samples.python),
    cpp: mapFor(samples.cpp),
    java: mapFor(samples.java),
  };
}

/** Resolves the line to highlight in `language` for a JavaScript line index. */
export function resolveCodeLine(
  map: Partial<CodeMap> | undefined,
  language: Language,
  javascriptLine: number | null,
): number | null {
  if (javascriptLine === null) return null;
  const lineMap = map?.[language];
  const mapped = lineMap?.[javascriptLine];
  return mapped ?? javascriptLine;
}
