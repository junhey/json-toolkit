import { describe, expect, it } from 'vitest';
import {
  addChild,
  deleteAt,
  duplicateAt,
  formatJsonPath,
  getAt,
  parseJsonPath,
  setAt,
  shouldAutoBeautify,
  stringifyJson,
} from './jsonDoc';

const sample = {
  name: 'JSON Toolkit',
  philosophy: { belief: 'Format first' },
  milestones: [
    { year: 2024, event: 'First release' },
    { year: 2026, event: 'Editor' },
  ],
  features: ['format', 'fold'],
};

describe('json path', () => {
  it('formats and parses dotted and indexed paths', () => {
    expect(formatJsonPath(['philosophy', 'belief'])).toBe('$.philosophy.belief');
    expect(formatJsonPath(['milestones', 1, 'year'])).toBe('$.milestones[1].year');
    expect(parseJsonPath('$.milestones[1].year')).toEqual(['milestones', 1, 'year']);
    expect(parseJsonPath('$["weird.key"]')).toEqual(['weird.key']);
  });

  it('reads nested values', () => {
    expect(getAt(sample, ['philosophy', 'belief'])).toBe('Format first');
    expect(getAt(sample, ['milestones', 1, 'year'])).toBe(2026);
  });
});

describe('node mutations', () => {
  it('deletes object keys and array items', () => {
    expect(deleteAt(sample, ['name'])).not.toHaveProperty('name');
    const next = deleteAt(sample, ['milestones', 0]) as typeof sample;
    expect(next.milestones).toHaveLength(1);
    expect(next.milestones[0].year).toBe(2026);
  });

  it('adds children to objects and arrays', () => {
    const withKey = addChild(sample, [], { key: 'extra', value: true }) as Record<string, unknown>;
    expect(withKey.extra).toBe(true);
    const withItem = addChild(sample, ['features'], { value: 'copy path' }) as typeof sample;
    expect(withItem.features).toEqual(['format', 'fold', 'copy path']);
  });

  it('duplicates object fields with a unique key', () => {
    const next = duplicateAt(sample, ['philosophy']) as Record<string, unknown>;
    expect(next.philosophy).toEqual(sample.philosophy);
    expect(next.philosophy1).toEqual(sample.philosophy);
  });

  it('duplicates array items after the source index', () => {
    const next = duplicateAt(sample, ['features', 0]) as typeof sample;
    expect(next.features).toEqual(['format', 'format', 'fold']);
  });

  it('setAt replaces a nested value', () => {
    const next = setAt(sample, ['name'], 'json.cn-style') as typeof sample;
    expect(next.name).toBe('json.cn-style');
    expect(stringifyJson({ a: 1 }, 2)).toBe('{\n  "a": 1\n}');
  });
});

describe('shouldAutoBeautify', () => {
  it('pretty-prints one-line valid JSON', () => {
    expect(shouldAutoBeautify('{"alpha":1,"beta":{"gamma":"ok"}}')).toBe(true);
  });

  it('pretty-prints two-line JSON', () => {
    expect(shouldAutoBeautify('{\n"alpha":1}')).toBe(true);
  });

  it('leaves already-formatted JSON alone', () => {
    expect(
      shouldAutoBeautify(`{
  "alpha": 1,
  "beta": {
    "gamma": "ok"
  }
}`)
    ).toBe(false);
  });

  it('pretty-prints a document with a huge wrapped-less line', () => {
    const huge = `{\n  "blob": "${'x'.repeat(5000)}"\n}`;
    expect(shouldAutoBeautify(huge)).toBe(true);
  });

  it('ignores invalid or non-JSON text', () => {
    expect(shouldAutoBeautify('not json')).toBe(false);
    expect(shouldAutoBeautify('{')).toBe(false);
    expect(shouldAutoBeautify('')).toBe(false);
  });
});
