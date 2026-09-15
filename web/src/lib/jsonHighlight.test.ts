import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildHighlightTree,
  collectCollapsiblePaths,
  displayParseError,
  formatParseError,
  parseJsonForHighlight,
  stringifyCompact,
} from './jsonHighlight.ts';

describe('parseJsonForHighlight', () => {
  it('pretty-prints compact JSON with 2-space indent', () => {
    const result = parseJsonForHighlight('{"b":1,"a":true}', { indent: 2 });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.text, '{\n  "b": 1,\n  "a": true\n}');
  });

  it('pretty-prints with 4-space indent', () => {
    const result = parseJsonForHighlight('{"a":1}', { indent: 4 });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.text, '{\n    "a": 1\n}');
  });

  it('pretty-prints with 8-space indent instead of tabs', () => {
    const result = parseJsonForHighlight('{"a":1}', { indent: 8 });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.text, '{\n        "a": 1\n}');
    assert.equal(result.text.includes('\t'), false);
  });

  it('sorts object keys when requested', () => {
    const result = parseJsonForHighlight('{"b":1,"a":2}', { indent: 2, sortKeys: true });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.text, '{\n  "a": 2,\n  "b": 1\n}');
  });

  it('preserves integers longer than 15 digits', () => {
    const result = parseJsonForHighlight('{"id":12345678901234567890}', { indent: 2 });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.text.includes('12345678901234567890'), true);
    assert.equal(result.text.includes('1.2345678901234568e+19'), false);
  });

  it('expands nested JSON strings when nestedParse is on', () => {
    const result = parseJsonForHighlight('{"nested":"{\\"ok\\":true,\\"count\\":3}"}', {
      indent: 2,
      nestedParse: true,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.tree.kind, 'object');
    if (result.tree.kind !== 'object') return;
    const nested = result.tree.entries.find((e) => e.key === 'nested')?.value;
    assert.equal(nested?.kind, 'object');
  });

  it('minifies without losing large integers', () => {
    const result = parseJsonForHighlight('{"id": 12345678901234567890}', { indent: 2 });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(stringifyCompact(result.tree), '{"id":12345678901234567890}');
  });

  it('returns a line/column parse error for invalid JSON', () => {
    const result = parseJsonForHighlight('{invalid}', { indent: 2 });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(typeof result.error.line, 'number');
    assert.equal(typeof result.error.column, 'number');
    assert.match(result.error.message, /解析错误|Parse error|Unexpected|position|token/i);
  });
});

describe('buildHighlightTree', () => {
  it('classifies keys, strings, numbers, booleans, null, arrays and objects', () => {
    const result = parseJsonForHighlight(
      '{"name":"Tom","age":30,"ok":true,"owner":null,"tags":["dev"],"meta":{"url":"https://json.cn"}}',
      { indent: 2 }
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const tree = result.tree;
    assert.equal(tree.kind, 'object');
    if (tree.kind !== 'object') return;

    const byKey = Object.fromEntries(tree.entries.map((e) => [e.key, e.value]));
    assert.equal(byKey.name.kind, 'string');
    assert.equal(byKey.age.kind, 'number');
    assert.equal(byKey.ok.kind, 'boolean');
    assert.equal(byKey.owner.kind, 'null');
    assert.equal(byKey.tags.kind, 'array');
    assert.equal(byKey.meta.kind, 'object');
  });

  it('marks http(s) strings as links like json.cn', () => {
    const node = buildHighlightTree('https://www.json.cn/demo.json');
    assert.equal(node.kind, 'string');
    if (node.kind !== 'string') return;
    assert.equal(node.href, 'https://www.json.cn/demo.json');
  });

  it('does not treat non-url strings as links', () => {
    const node = buildHighlightTree('hello');
    assert.equal(node.kind, 'string');
    if (node.kind !== 'string') return;
    assert.equal(node.href, undefined);
  });
});

describe('collectCollapsiblePaths', () => {
  it('collects object and array paths for expand/collapse all', () => {
    const result = parseJsonForHighlight('{"a":[1,{"b":2}],"c":{}}', { indent: 2 });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const paths = collectCollapsiblePaths(result.tree);
    assert.deepEqual(paths.sort(), ['$', '$.a', '$.a[1]', '$.c'].sort());
  });
});

describe('formatParseError', () => {
  it('extracts position from native JSON.parse errors', () => {
    let caught: unknown;
    try {
      JSON.parse('{oops}');
    } catch (e) {
      caught = e;
    }
    const formatted = formatParseError(caught);
    assert.equal(formatted.line >= 1, true);
    assert.match(formatted.message, /oops|token|JSON/i);
    const shown = displayParseError(formatted, 'zh');
    assert.match(shown, /第 \d+ 行/);
    assert.equal((shown.match(/第 \d+ 行/g) || []).length, 1);
    assert.doesNotMatch(shown, /line \d+ column/i);
  });
});
