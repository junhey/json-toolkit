import { EditorState } from '@codemirror/state';
import { json } from '@codemirror/lang-json';
import { ensureSyntaxTree } from '@codemirror/language';
import { describe, expect, it } from 'vitest';
import { jsonPathAt, visibleNodeActions } from './jsonPathFromTree';

function stateOf(doc: string) {
  const state = EditorState.create({ doc, extensions: [json()] });
  ensureSyntaxTree(state, doc.length, 5000);
  return state;
}

const doc = `{
  "name": "JSON Toolkit",
  "philosophy": {
    "belief": "Format first"
  },
  "milestones": [
    { "year": 2024 }
  ],
  "features": [
    "format",
    "fold"
  ]
}`;

describe('jsonPathAt', () => {
  it('resolves object keys, nested fields, and array indexes', () => {
    const state = stateOf(doc);
    const namePos = doc.indexOf('"name"') + 1;
    const beliefPos = doc.indexOf('"belief"') + 1;
    const yearPos = doc.indexOf('"year"') + 1;
    const foldPos = doc.indexOf('"fold"') + 1;
    expect(jsonPathAt(state, namePos)).toBe('$.name');
    expect(jsonPathAt(state, beliefPos)).toBe('$.philosophy.belief');
    expect(jsonPathAt(state, yearPos)).toBe('$.milestones[0].year');
    expect(jsonPathAt(state, foldPos)).toBe('$.features[1]');
  });
});

describe('visibleNodeActions', () => {
  it('marks containers as addable and properties as deletable', () => {
    const state = stateOf(doc);
    const items = visibleNodeActions(state, 0, doc.length);
    const byPath = Object.fromEntries(items.map((item) => [item.path, item]));

    expect(byPath.$?.canAdd).toBe(true);
    expect(byPath.$?.canDelete).toBe(false);

    expect(byPath['$.philosophy']?.canAdd).toBe(true);
    expect(byPath['$.philosophy']?.canDelete).toBe(true);
    expect(byPath['$.philosophy']?.canDuplicate).toBe(true);

    expect(byPath['$.name']?.canAdd).toBe(false);
    expect(byPath['$.name']?.canDelete).toBe(true);

    expect(byPath['$.features[1]']?.canDelete).toBe(true);
    expect(byPath['$.features[1]']?.canAdd).toBe(false);
  });
});
