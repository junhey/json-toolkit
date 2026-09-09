import { EditorView, Decoration, WidgetType, ViewPlugin, type ViewUpdate, type DecorationSet } from '@codemirror/view';
import { Facet } from '@codemirror/state';
import { visibleNodeActions } from '../lib/jsonPathFromTree';

export type JsonEditorAction = 'copy-path' | 'copy-value' | 'add-child' | 'delete';

export interface JsonEditorHooks {
  enabled: boolean;
  readOnly: boolean;
  lang: 'zh' | 'en';
  onAction: (action: JsonEditorAction, path: string) => void;
}

export const jsonEditorHooks = Facet.define<JsonEditorHooks, JsonEditorHooks | null>({
  combine: (values) => values[0] ?? null,
});

function iconButton(svg: string, title: string, className: string, handler: (e: Event) => void) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `json-node-btn ${className}`;
  btn.title = title;
  btn.innerHTML = svg;
  btn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handler(e);
  });
  return btn;
}

const COPY_PATH =
  '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 9h11v11H9z"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>';
const COPY =
  '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
const PLUS =
  '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>';
const TRASH =
  '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>';

class NodeActionWidget extends WidgetType {
  constructor(
    readonly path: string,
    readonly canAdd: boolean,
    readonly canDelete: boolean,
    readonly readOnly: boolean,
    readonly lang: 'zh' | 'en',
    readonly onAction: JsonEditorHooks['onAction']
  ) {
    super();
  }

  eq(other: NodeActionWidget) {
    return (
      this.path === other.path &&
      this.canAdd === other.canAdd &&
      this.canDelete === other.canDelete &&
      this.readOnly === other.readOnly &&
      this.lang === other.lang
    );
  }

  toDOM() {
    const wrap = document.createElement('span');
    wrap.className = 'json-node-actions';
    wrap.contentEditable = 'false';
    const zh = this.lang === 'zh';
    wrap.appendChild(
      iconButton(COPY_PATH, zh ? '复制节点路径' : 'Copy path', '', () => this.onAction('copy-path', this.path))
    );
    wrap.appendChild(
      iconButton(COPY, zh ? '复制节点内容' : 'Copy value', '', () => this.onAction('copy-value', this.path))
    );
    if (!this.readOnly && this.canAdd) {
      wrap.appendChild(
        iconButton(PLUS, zh ? '添加子节点' : 'Add child', 'json-node-btn-add', () =>
          this.onAction('add-child', this.path)
        )
      );
    }
    if (!this.readOnly && this.canDelete) {
      wrap.appendChild(
        iconButton(TRASH, zh ? '删除节点' : 'Delete node', 'json-node-btn-del', () =>
          this.onAction('delete', this.path)
        )
      );
    }
    return wrap;
  }

  ignoreEvent() {
    return true;
  }
}

function buildDecos(view: EditorView): DecorationSet {
  const hooks = view.state.facet(jsonEditorHooks);
  if (!hooks?.enabled) return Decoration.none;
  const widgets = [];
  for (const range of view.visibleRanges) {
    for (const item of visibleNodeActions(view.state, range.from, range.to)) {
      widgets.push(
        Decoration.widget({
          widget: new NodeActionWidget(
            item.path,
            item.canAdd,
            item.canDelete,
            hooks.readOnly,
            hooks.lang,
            hooks.onAction
          ),
          side: 1,
        }).range(item.lineTo)
      );
    }
  }
  return Decoration.set(widgets, true);
}

export const jsonNodeActionPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDecos(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.transactions.length) {
        this.decorations = buildDecos(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations }
);
