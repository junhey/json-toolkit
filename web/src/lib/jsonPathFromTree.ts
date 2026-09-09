import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';
import type { SyntaxNode } from '@lezer/common';
import { formatJsonPath, type JsonSeg } from './jsonDoc';

const VALUE_NODES = new Set([
  'Object',
  'Array',
  'String',
  'Number',
  'True',
  'False',
  'Null',
]);

function propertyName(state: EditorState, property: SyntaxNode): string | null {
  const name = property.getChild('PropertyName');
  if (!name) return null;
  try {
    return JSON.parse(state.sliceDoc(name.from, name.to));
  } catch {
    const raw = state.sliceDoc(name.from, name.to);
    return raw.replace(/^"|"$/g, '');
  }
}

function indexInArray(array: SyntaxNode, pos: number): number | null {
  let index = 0;
  let child = array.firstChild;
  while (child) {
    if (VALUE_NODES.has(child.name)) {
      if (pos >= child.from && pos <= child.to) return index;
      index++;
    }
    child = child.nextSibling;
  }
  return null;
}

export function jsonPathAt(state: EditorState, pos: number): string {
  const segs: JsonSeg[] = [];
  const chain: SyntaxNode[] = [];
  let node: SyntaxNode | null = syntaxTree(state).resolveInner(pos, -1);
  while (node) {
    chain.push(node);
    node = node.parent;
  }
  for (let i = chain.length - 1; i >= 0; i--) {
    const n = chain[i];
    if (n.name === 'Property') {
      const key = propertyName(state, n);
      if (key != null) segs.push(key);
    } else if (n.name === 'Array') {
      const idx = indexInArray(n, pos);
      if (idx != null) segs.push(idx);
    }
  }
  return formatJsonPath(segs);
}

export interface VisibleNodeAction {
  lineTo: number;
  path: string;
  canAdd: boolean;
  canDelete: boolean;
}

export function visibleNodeActions(state: EditorState, from: number, to: number): VisibleNodeAction[] {
  const byLine = new Map<number, VisibleNodeAction>();
  const consider = (pos: number, canAdd: boolean, canDelete: boolean) => {
    if (pos < from || pos > to) return;
    const line = state.doc.lineAt(pos);
    if (byLine.has(line.to)) {
      const prev = byLine.get(line.to)!;
      prev.canAdd = prev.canAdd || canAdd;
      prev.canDelete = prev.canDelete || canDelete;
      return;
    }
    byLine.set(line.to, {
      lineTo: line.to,
      path: jsonPathAt(state, Math.min(pos + 1, state.doc.length)),
      canAdd,
      canDelete,
    });
  };

  syntaxTree(state).iterate({
    from,
    to,
    enter(node) {
      if (node.name === 'Property') {
        const valueObj = node.node.getChild('Object');
        const valueArr = node.node.getChild('Array');
        consider(node.from, Boolean(valueObj || valueArr), true);
      } else if (node.name === 'Object' || node.name === 'Array') {
        const parent = node.node.parent;
        if (!parent || parent.name === 'JsonText') {
          consider(node.from, true, false);
        } else if (parent.name === 'Array') {
          consider(node.from, true, true);
        }
      }
    },
  });

  return [...byLine.values()].sort((a, b) => a.lineTo - b.lineTo);
}
