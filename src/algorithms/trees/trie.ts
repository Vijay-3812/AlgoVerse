import type { AlgorithmDefinition, TreeSnapshot } from '@/types';
import { code, defineAlgorithm, finish, pseudo, textOf, type AlgorithmSpec } from '@/algorithms/kit';
import { defineModule } from '@/types';
import { TreeVisualizer } from '@/visualizers/TreeVisualizer';
import { TraceBuilder } from '@/utils/traceBuilder';
import { COMPLEXITY } from './specs';
import { TreeModel } from './kit';

export interface TrieData {
  readonly operation: 'insert' | 'search' | 'prefix';
  readonly word: string;
  readonly charIndex: number;
}

const WORDS = Object.freeze(['cat', 'car', 'card', 'care', 'dog', 'do']);

/**
 * Trie — one node per character, shared prefixes.
 *
 * The visual argument is the sharing: `car`, `card` and `care` all run through
 * the same c-a-r path, and inserting the fourth word reuses three nodes before
 * it creates anything. Terminal nodes are marked (`sub: END`), which is what
 * distinguishes "car" from "card" living in the same chain.
 */
const spec: AlgorithmSpec<TreeSnapshot, TrieData> = {
  id: 'trie',
  complexity: COMPLEXITY.trie!,
  pseudocode: pseudo(`
#insert(word)                       ▸ O(m) in the key length
#   node ← root
#   for ch in word
#     if node.child[ch] = null: node.child[ch] ← new Node(ch)
#     node ← node.child[ch]
#   node.isEnd ← true
#
#search(word)                        ▸ O(m)
#   node ← root
#   for ch in word
#     if node.child[ch] = null: return false
#     node ← node.child[ch]
#   return node.isEnd
#
#startsWith(prefix)                  ▸ O(m): the same walk, without isEnd
#   ▸ every key with this prefix lives in this subtree`),
  code: code(
    `
class TrieNode {
  constructor(ch) { this.ch = ch; this.children = new Map(); this.isEnd = false; }
}

class Trie {
  #root = new TrieNode("");
  insert(word) {
    let node = this.#root;
    for (const ch of word) {
      if (!node.children.has(ch)) node.children.set(ch, new TrieNode(ch));
      node = node.children.get(ch);
    }
    node.isEnd = true;
  }
  find(word) {
    let node = this.#root;
    for (const ch of word) {
      node = node.children.get(ch);
      if (!node) return null;
    }
    return node;
  }
  search(word) { return this.find(word)?.isEnd === true; }
  startsWith(prefix) { return this.find(prefix) !== null; }
}`,
    `
class TrieNode:
    def __init__(self, ch):
        self.ch = ch
        self.children = {}
        self.is_end = False


class Trie:
    def __init__(self):
        self.root = TrieNode("")

    def insert(self, word):
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode(ch)
            node = node.children[ch]
        node.is_end = True

    def find(self, word):
        node = self.root
        for ch in word:
            node = node.children.get(ch)
            if node is None:
                return None
        return node

    def starts_with(self, prefix):
        return self.find(prefix) is not None`,
    `
struct TrieNode {
  char ch;
  unordered_map<char, TrieNode*> children;
  bool isEnd = false;
  explicit TrieNode(char c) : ch(c) {}
};

struct Trie {
  TrieNode* root = new TrieNode(0);
  void insert(const string& word) {
    TrieNode* node = root;
    for (char ch : word) {
      if (!node->children.count(ch)) node->children[ch] = new TrieNode(ch);
      node = node->children[ch];
    }
    node->isEnd = true;
  }
  TrieNode* find(const string& word) {
    TrieNode* node = root;
    for (char ch : word) {
      auto it = node->children.find(ch);
      if (it == node->children.end()) return nullptr;
      node = it->second;
    }
    return node;
  }
  bool startsWith(const string& prefix) { return find(prefix) != nullptr; }
};`,
    `
static final class TrieNode {
  char ch;
  final Map<Character, TrieNode> children = new HashMap<>();
  boolean isEnd;
  TrieNode(char ch) { this.ch = ch; }
}

static final class Trie {
  private final TrieNode root = new TrieNode('\\0');

  void insert(String word) {
    TrieNode node = root;
    for (char ch : word.toCharArray()) {
      node = node.children.computeIfAbsent(ch, TrieNode::new);
    }
    node.isEnd = true;
  }

  TrieNode find(String word) {
    TrieNode node = root;
    for (char ch : word.toCharArray()) {
      node = node.children.get(ch);
      if (node == null) return null;
    }
    return node;
  }

  boolean search(String word) { TrieNode n = find(word); return n != null && n.isEnd; }
  boolean startsWith(String prefix) { return find(prefix) != null; }
}`,
  ),
  explanation: [
    'A trie stores one character per edge, so words that share a prefix share the path — no key is stored twice.',
    'Lookup is O(m) in the length of the word, independent of how many words are stored.',
    'A node flag marks the end of a real key, which is how "car" and "card" coexist on one chain.',
  ],
  learn: {
    useCases: ['Autocomplete and spelling suggestions', 'IP routing (longest prefix match)', 'Word games and Boggle solvers'],
    practice: [{ title: 'Implement Trie (Prefix Tree)', url: 'https://leetcode.com/problems/implement-trie-prefix-tree/', difficulty: 'medium' }],
  },
  defaultInput: () => ({ kind: 'string', text: 'cat', pattern: 'car' }),
  generate: (input, run) => {
    const seed = textOf(input).toLowerCase();
    const words = [...new Set([seed, ...WORDS])].filter((w) => w.length >= 2 && /^[a-z]+$/.test(w)).slice(0, 7);

    const model = new TreeModel();
    const rootId = model.create('◦', { sub: 'root', prefix: 't' });
    model.attach(rootId, null);
    let operation: TrieData['operation'] = 'insert';
    let word = words[0] as string;
    let charIndex = 0;
    let caption = 'Empty trie: one root node, no keys yet';

    const builder = new TraceBuilder<TreeSnapshot, TrieData>(() =>
      model.snapshot({
        kind: 'trie',
        caption,
        badges: { nodes: model.size, keys: keyCount(model), word, char: charIndex },
      }),
    );

    builder.emit({
      kind: 'init',
      description: `Bare root. Inserting ${words.length} words — watch shared prefixes reuse nodes.`,
      highlight: { nodes: [rootId] },
      badges: { nodes: 1, keys: 0 },
      pseudocodeLine: 0,
      codeLine: 4,
      weight: 1.5,
    });

    /** Inserts one word, creating only the nodes the trie does not already own. */
    const insertWord = (target: string): void => {
      operation = 'insert';
      word = target;
      model.clearRoles();
      let current = rootId;
      let reused = 0;
      const path: string[] = [rootId];

      for (let i = 0; i < target.length; i += 1) {
        charIndex = i;
        const ch = target[i] as string;
        const existing = (model.get(current)?.children ?? [])
          .filter((id): id is string => id !== null)
          .find((id) => model.labelOf(id) === ch);
        model.setRole(path, 'visited');

        if (existing) {
          reused += 1;
          current = existing;
          path.push(existing);
          model.setRole([existing], 'pivot');
          caption = `"${target}" · '${ch}' already exists — reuse the node`;
          builder.emit({
            kind: 'visit',
            description: `'${ch}' of "${target}" already has a node — prefixes are shared, nothing new is created.`,
            highlight: { nodes: [existing] },
            badges: { nodes: model.size, keys: keyCount(model), word: target, reused },
            pseudocodeLine: 3,
            codeLine: 10,
            data: { operation, word: target, charIndex: i },
            weight: 1,
            bump: ['reads'],
          });
        } else {
          const newId = model.create(ch, { prefix: 'c' });
          model.attach(newId, current);
          current = newId;
          path.push(newId);
          model.setRole([newId], 'success');
          caption = `"${target}" · new node '${ch}'`;
          builder.emit({
            kind: 'insert',
            description: `No '${ch}' child yet — create it. This is the first divergence for "${target}".`,
            highlight: { nodes: [newId] },
            badges: { nodes: model.size, keys: keyCount(model), word: target, created: i + 1 - reused },
            pseudocodeLine: 3,
            codeLine: 9,
            data: { operation, word: target, charIndex: i },
            weight: 1.25,
            bump: ['writes'],
          });
        }
      }

      const node = model.get(current);
      model.setSub(current, 'END');
      model.setRole(path, 'visited');
      model.setRole([current], 'success');
      caption = `"${target}" inserted — ${model.size} nodes total`;
      builder.emit({
        kind: 'mark',
        description: `Mark the last node of "${target}" as a key end (isEnd = true)${node ? '' : ''}.`,
        highlight: { nodes: [current] },
        badges: { nodes: model.size, keys: keyCount(model), word: target, reused },
        pseudocodeLine: 4,
        codeLine: 11,
        data: { operation, word: target, charIndex: target.length - 1 },
        weight: 1.7,
        bump: ['writes'],
      });
    };

    for (const target of words) insertWord(target);

    /* ── search a word that is present ────────────────────────────────────── */
    operation = 'search';
    const needle = words[words.length - 1] as string;
    model.clearRoles();
    let current: string | null = rootId;
    const path: string[] = [rootId];
    for (let i = 0; i < needle.length && current; i += 1) {
      const ch = needle[i] as string;
      const child: string | null =
        (model.get(current)?.children ?? [])
          .filter((id): id is string => id !== null)
          .find((id) => model.labelOf(id) === ch) ?? null;
      if (child) {
        current = child;
        path.push(child);
        model.setRole(path.slice(0, -1), 'visited');
        model.setRole([child], 'compare');
        builder.emit({
          kind: 'compare',
          description: `search("${needle}"): follow '${ch}' — found.`,
          highlight: { nodes: [child] },
          badges: { nodes: model.size, keys: keyCount(model), word: needle, char: i },
          pseudocodeLine: 8,
          codeLine: 18,
          data: { operation, word: needle, charIndex: i },
          weight: 0.9,
          bump: ['comparisons', 'reads'],
        });
      } else {
        current = null;
      }
    }
    if (current) {
      model.setRole(path, 'visited');
      model.setRole([current], 'success');
    }
    const foundNode = current;
    const isKey = foundNode ? model.get(foundNode)?.sub === 'END' : false;
    builder.emit({
      kind: 'found',
      description: foundNode
        ? `"${needle}" ends at a node marked ${isKey ? 'as a key end — search succeeds' : 'mid-chain — it is only a prefix'}; the walk took ${needle.length} steps no matter how many words are stored.`
        : `"${needle}" fell off the trie — no such prefix.`,
      highlight: { nodes: foundNode ? [foundNode] : [rootId] },
      badges: { nodes: model.size, keys: keyCount(model), word: needle },
      pseudocodeLine: 9,
      codeLine: 20,
      data: { operation, word: needle, charIndex: needle.length - 1 },
      weight: 2.1,
    });

    /* ── prefix query: the subtree IS the answer set ──────────────────────── */
    operation = 'prefix';
    const prefix = needle.slice(0, Math.max(2, needle.length - 2));
    const prefixNode = [...path].reverse().find((id) => {
      const depth = model.depth(id);
      return depth === Math.min(prefix.length, needle.length - 1);
    });
    const subtree = prefixNode ? model.subtree(prefixNode) : [rootId];
    model.clearRoles();
    model.setRole(subtree, 'frontier');
    model.setRole([prefixNode ?? rootId], 'pivot');
    caption = `startsWith("${prefix}") → the whole subtree below is in scope`;
    builder.emit({
      kind: 'frontier',
      description: `Prefix "${prefix}" resolves to one node; everything under it (${subtree.length - 1} nodes) shares that prefix.`,
      highlight: { nodes: subtree },
      badges: { nodes: model.size, keys: keyCount(model), prefix, subtree: subtree.length - 1 },
      pseudocodeLine: 13,
      codeLine: 23,
      data: { operation, word: prefix, charIndex: prefix.length - 1 },
      weight: 2,
      bump: ['reads'],
    });

    const output = words.slice();
    model.clearRoles();
    model.setRole([rootId], 'success');
    builder.emit({
      kind: 'complete',
      description: `Trie holds ${words.length} keys in ${model.size} nodes — sharing is the whole point.`,
      highlight: { nodes: [...model.nodes.keys()] },
      badges: { nodes: model.size, keys: keyCount(model) },
      pseudocodeLine: 14,
      codeLine: 24,
      weight: 2.2,
    });

    return finish({
      builder,
      spec,
      input,
      run,
      result: {
        headline: 'Trie built',
        detail: `${words.length} keys · ${model.size} nodes (naive storage would need ${words.reduce((n, w) => n + w.length, 0) + 1})`,
        output,
      },
    });
  },
};

/** Number of nodes flagged as key ends. */
function keyCount(model: TreeModel): number {
  return [...model.nodes.values()].filter((n) => n.sub === 'END').length;
}

export const definition: AlgorithmDefinition<TreeSnapshot, TrieData> = defineAlgorithm(spec);
export const module = defineModule({ definition, Visualizer: TreeVisualizer });
