export type HighlightNode =
  | { kind: 'null' }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'number'; raw: string }
  | { kind: 'string'; value: string; href?: string }
  | { kind: 'array'; items: HighlightNode[] }
  | { kind: 'object'; entries: Array<{ key: string; value: HighlightNode }> };

export interface HighlightParseError {
  message: string;
  line: number;
  column: number;
}

export type HighlightParseResult =
  | { ok: true; tree: HighlightNode; text: string }
  | { ok: false; error: HighlightParseError };

export interface HighlightParseOptions {
  indent?: number;
  sortKeys?: boolean;
  nestedParse?: boolean;
}

const LARGE_NUM_PREFIX = '__jsoncn_n:';

/** Integers with 16+ digits lose precision in JSON.parse. */
function protectLargeNumbers(src: string): string {
  return src.replace(
    /"(?:\\.|[^"\\])*"|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/g,
    (token) => {
      if (token.startsWith('"')) return token;
      const abs = token.replace(/^-/, '').split(/[eE]/)[0].split('.')[0];
      if (abs.length >= 16) {
        return `"${LARGE_NUM_PREFIX}${token}"`;
      }
      return token;
    }
  );
}

function isHttpLink(value: string): boolean {
  return /^http/i.test(value);
}

export function buildHighlightTree(value: unknown): HighlightNode {
  if (value === null) return { kind: 'null' };
  if (typeof value === 'boolean') return { kind: 'boolean', value };
  if (typeof value === 'number') {
    return { kind: 'number', raw: Number.isFinite(value) ? String(value) : 'null' };
  }
  if (typeof value === 'string') {
    if (value.startsWith(LARGE_NUM_PREFIX)) {
      return { kind: 'number', raw: value.slice(LARGE_NUM_PREFIX.length) };
    }
    return {
      kind: 'string',
      value,
      href: isHttpLink(value) ? value : undefined,
    };
  }
  if (Array.isArray(value)) {
    return { kind: 'array', items: value.map(buildHighlightTree) };
  }
  if (typeof value === 'object') {
    return {
      kind: 'object',
      entries: Object.entries(value as Record<string, unknown>).map(([key, child]) => ({
        key,
        value: buildHighlightTree(child),
      })),
    };
  }
  return { kind: 'null' };
}

function sortHighlightTree(node: HighlightNode): HighlightNode {
  if (node.kind === 'array') {
    return { kind: 'array', items: node.items.map(sortHighlightTree) };
  }
  if (node.kind === 'object') {
    return {
      kind: 'object',
      entries: [...node.entries]
        .sort((a, b) => a.key.localeCompare(b.key))
        .map((entry) => ({ key: entry.key, value: sortHighlightTree(entry.value) })),
    };
  }
  return node;
}

function expandNestedJsonStrings(node: HighlightNode): HighlightNode {
  if (node.kind === 'string') {
    const trimmed = node.value.trim();
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      const inner = parseJsonForHighlight(trimmed, { indent: 2, nestedParse: true });
      if (inner.ok) return inner.tree;
    }
    return node;
  }
  if (node.kind === 'array') {
    return { kind: 'array', items: node.items.map(expandNestedJsonStrings) };
  }
  if (node.kind === 'object') {
    return {
      kind: 'object',
      entries: node.entries.map((entry) => ({
        key: entry.key,
        value: expandNestedJsonStrings(entry.value),
      })),
    };
  }
  return node;
}

export function stringifyCompact(node: HighlightNode): string {
  switch (node.kind) {
    case 'null':
      return 'null';
    case 'boolean':
      return node.value ? 'true' : 'false';
    case 'number':
      return node.raw;
    case 'string':
      return JSON.stringify(node.value);
    case 'array':
      return `[${node.items.map(stringifyCompact).join(',')}]`;
    case 'object':
      return `{${node.entries
        .map((entry) => `${JSON.stringify(entry.key)}:${stringifyCompact(entry.value)}`)
        .join(',')}}`;
  }
}

function stringifyHighlight(node: HighlightNode, indent: number, level: number): string {
  const pad = ' '.repeat(indent * level);
  const inner = ' '.repeat(indent * (level + 1));
  switch (node.kind) {
    case 'null':
      return 'null';
    case 'boolean':
      return node.value ? 'true' : 'false';
    case 'number':
      return node.raw;
    case 'string':
      return JSON.stringify(node.value);
    case 'array': {
      if (node.items.length === 0) return '[]';
      const items = node.items
        .map((item) => inner + stringifyHighlight(item, indent, level + 1))
        .join(',\n');
      return `[\n${items}\n${pad}]`;
    }
    case 'object': {
      if (node.entries.length === 0) return '{}';
      const items = node.entries
        .map(
          (entry) =>
            `${inner}${JSON.stringify(entry.key)}: ${stringifyHighlight(entry.value, indent, level + 1)}`
        )
        .join(',\n');
      return `{\n${items}\n${pad}}`;
    }
  }
}

export function formatParseError(error: unknown): HighlightParseError {
  const raw = error instanceof Error ? error.message : String(error);
  const lineCol = raw.match(/line\s+(\d+)\s+column\s+(\d+)/i);
  const position = raw.match(/position\s+(\d+)/i);
  let line = 1;
  let column = 1;
  if (lineCol) {
    line = Number(lineCol[1]);
    column = Number(lineCol[2]);
  } else if (position) {
    column = Number(position[1]) + 1;
  }
  return {
    message: `解析错误：${raw}`,
    line,
    column,
  };
}

export function displayParseError(error: HighlightParseError, lang: 'zh' | 'en'): string {
  const detail = error.message
    .replace(/^解析错误：/, '')
    .replace(/\s*\(line\s+\d+\s+column\s+\d+\)/gi, '')
    .replace(/\s*at position\s+\d+/gi, '')
    .trim()
    .replace(/[，,;；]+$/, '');
  return lang === 'zh'
    ? `${detail}（第 ${error.line} 行，第 ${error.column} 列）`
    : `${detail} (line ${error.line}, column ${error.column})`;
}

export function parseJsonForHighlight(
  input: string,
  options: HighlightParseOptions = {}
): HighlightParseResult {
  const indent = options.indent && options.indent > 0 ? options.indent : 2;
  try {
    const parsed = JSON.parse(protectLargeNumbers(input));
    let tree = buildHighlightTree(parsed);
    if (options.nestedParse) {
      tree = expandNestedJsonStrings(tree);
    }
    if (options.sortKeys) {
      tree = sortHighlightTree(tree);
    }
    return {
      ok: true,
      tree,
      text: stringifyHighlight(tree, indent, 0),
    };
  } catch (error) {
    return { ok: false, error: formatParseError(error) };
  }
}

export function collectCollapsiblePaths(node: HighlightNode, path = '$'): string[] {
  if (node.kind === 'array') {
    const nested = node.items.flatMap((item, index) =>
      collectCollapsiblePaths(item, `${path}[${index}]`)
    );
    return [path, ...nested];
  }
  if (node.kind === 'object') {
    const nested = node.entries.flatMap((entry) =>
      collectCollapsiblePaths(entry.value, `${path}.${entry.key}`)
    );
    return [path, ...nested];
  }
  return [];
}
