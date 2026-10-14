import type { Language } from '@/types';

/**
 * A ~90-line syntax highlighter instead of a 2 MB editor bundle.
 *
 * Monaco/Shiki are lovely, but they cost hundreds of kilobytes and a worker for
 * what is, on this panel, ~20 static lines of read-only code. This tokeniser
 * runs per line, is memoised by the caller, and produces the same information
 * the UI actually uses: token classes + line numbers + the active line.
 * Swapping in Shiki later is a one-component change (see `CodeBlock`).
 */

export type TokenType =
  | 'plain'
  | 'keyword'
  | 'string'
  | 'number'
  | 'comment'
  | 'function'
  | 'type'
  | 'operator'
  | 'punct';

export interface Token {
  readonly text: string;
  readonly type: TokenType;
}

const KEYWORDS: Record<Language, readonly string[]> = {
  javascript: [
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'break', 'continue',
    'new', 'class', 'extends', 'this', 'typeof', 'instanceof', 'in', 'of', 'null', 'undefined', 'true',
    'false', 'try', 'catch', 'finally', 'throw', 'async', 'await', 'yield', 'import', 'export', 'from',
    'default', 'switch', 'case', 'delete', 'void', 'static', 'get', 'set', 'as', 'interface', 'type',
  ],
  python: [
    'def', 'return', 'if', 'elif', 'else', 'for', 'while', 'break', 'continue', 'in', 'not', 'and', 'or',
    'is', 'None', 'True', 'False', 'class', 'import', 'from', 'as', 'with', 'lambda', 'yield', 'global',
    'nonlocal', 'pass', 'raise', 'try', 'except', 'finally', 'assert', 'async', 'await', 'del',
  ],
  cpp: [
    'auto', 'const', 'constexpr', 'return', 'if', 'else', 'for', 'while', 'do', 'break', 'continue',
    'struct', 'class', 'public', 'private', 'protected', 'template', 'typename', 'namespace', 'using',
    'new', 'delete', 'nullptr', 'true', 'false', 'static', 'inline', 'virtual', 'override', 'switch',
    'case', 'default', 'sizeof', 'this', 'void', 'bool', 'enum', 'operator', 'explicit', 'friend', 'mutable',
  ],
  java: [
    'public', 'private', 'protected', 'static', 'final', 'class', 'interface', 'extends', 'implements',
    'return', 'if', 'else', 'for', 'while', 'do', 'break', 'continue', 'new', 'null', 'true', 'false',
    'this', 'super', 'void', 'int', 'long', 'double', 'float', 'char', 'boolean', 'byte', 'short',
    'switch', 'case', 'default', 'try', 'catch', 'finally', 'throw', 'throws', 'abstract', 'synchronized',
    'instanceof', 'import', 'package', 'enum', 'record', 'var', 'yield',
  ],
};

const TYPES: Record<Language, readonly string[]> = {
  javascript: ['number', 'string', 'boolean', 'Promise', 'Map', 'Set', 'Array', 'Record', 'readonly'],
  python: ['list', 'dict', 'set', 'tuple', 'int', 'str', 'bool', 'float', 'self'],
  cpp: [
    'int', 'long', 'double', 'float', 'char', 'unsigned', 'size_t', 'string', 'vector', 'pair', 'map',
    'unordered_map', 'set', 'queue', 'stack', 'priority_queue', 'array', 'deque',
  ],
  java: [
    'Integer', 'Long', 'Double', 'String', 'List', 'ArrayList', 'Map', 'HashMap', 'Set', 'HashSet',
    'Deque', 'ArrayDeque', 'PriorityQueue', 'TreeMap', 'Optional',
  ],
};

/**
 * One alternation, tried in order: comments → strings → numbers → words →
 * operators → punctuation. Anything unmatched stays `plain`, so the highlighter
 * can never corrupt the code it is given (worst case it looks unstyled).
 */
function buildPattern(language: Language): RegExp {
  const comment = language === 'python' ? '#[^\\n]*' : '\\/\\/[^\\n]*|\\/\\*[^\\n]*\\*\\/';
  return new RegExp(
    [
      `(?<comment>${comment})`,
      `(?<string>"(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*')`,
      `(?<number>\\b\\d+(?:\\.\\d+)?\\b)`,
      `(?<word>[A-Za-z_$][A-Za-z0-9_$]*)`,
      `(?<operator>[+\\-*/%=<>!&|^~?:]{1,3})`,
      `(?<punct>[{}()\\[\\],;.])`,
    ].join('|'),
    'g',
  );
}

const PATTERNS: Record<Language, RegExp> = {
  javascript: buildPattern('javascript'),
  python: buildPattern('python'),
  cpp: buildPattern('cpp'),
  java: buildPattern('java'),
};

const KEYWORD_SETS: Record<Language, Set<string>> = {
  javascript: new Set(KEYWORDS.javascript),
  python: new Set(KEYWORDS.python),
  cpp: new Set(KEYWORDS.cpp),
  java: new Set(KEYWORDS.java),
};

const TYPE_SETS: Record<Language, Set<string>> = {
  javascript: new Set(TYPES.javascript),
  python: new Set(TYPES.python),
  cpp: new Set(TYPES.cpp),
  java: new Set(TYPES.java),
};

/** Tokenises a single line. Cheap enough to run per visible line, per frame. */
export function highlightLine(line: string, language: Language): Token[] {
  const pattern = PATTERNS[language];
  pattern.lastIndex = 0;

  const tokens: Token[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null = pattern.exec(line);

  while (match !== null) {
    if (match.index > cursor) {
      tokens.push({ text: line.slice(cursor, match.index), type: 'plain' });
    }

    const groups = match.groups ?? {};
    const text = match[0];
    let type: TokenType = 'plain';

    if (groups.comment !== undefined) type = 'comment';
    else if (groups.string !== undefined) type = 'string';
    else if (groups.number !== undefined) type = 'number';
    else if (groups.operator !== undefined) type = 'operator';
    else if (groups.punct !== undefined) type = 'punct';
    else if (groups.word !== undefined) {
      const after = line.slice(match.index + text.length);
      const keywordSet = KEYWORD_SETS[language];
      const typeSet = TYPE_SETS[language];
      if (keywordSet.has(text)) type = 'keyword';
      else if (typeSet.has(text)) type = 'type';
      else if (/^\s*\(/.test(after)) type = 'function';
      else type = 'plain';
    }

    tokens.push({ text, type });
    cursor = match.index + text.length;
    match = pattern.exec(line);
  }

  if (cursor < line.length) tokens.push({ text: line.slice(cursor), type: 'plain' });
  return tokens;
}

/** Token class → Tailwind colour, wired to the theme tokens. */
export const TOKEN_CLASS: Record<TokenType, string> = {
  plain: 'text-ink/90',
  keyword: 'text-accent-pink',
  string: 'text-accent-lime',
  number: 'text-accent-amber',
  comment: 'text-ink-faint italic',
  function: 'text-accent-cyan',
  type: 'text-accent-violet',
  operator: 'text-ink-dim',
  punct: 'text-ink-faint',
};
