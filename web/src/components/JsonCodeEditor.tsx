import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting, foldAll, unfoldAll, codeFolding, foldGutter } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { Prec } from '@codemirror/state';
import { openSearchPanel } from '@codemirror/search';
import { useMemo, useRef, forwardRef, useImperativeHandle, useState, useCallback, useEffect } from 'react';
import { jsonEditorHooks, jsonNodeActionPlugin, type JsonEditorAction } from './jsonNodePlugin';
import {
  addChild,
  defaultValueForType,
  deleteAt,
  duplicateAt,
  getAt,
  isContainer,
  parseJsonPath,
  stringifyJson,
  tryParseJson,
} from '../lib/jsonDoc';
import { jsonPathAt } from '../lib/jsonPathFromTree';
import { useStore } from '../store';
import { useClipboard } from './ToolShell';

const HIGHLIGHT_CHAR_LIMIT = 8_000_000;

const lightHighlight = HighlightStyle.define([
  { tag: t.propertyName, color: '#0550ae', fontWeight: '600' },
  { tag: t.string, color: '#0a7b33' },
  { tag: t.number, color: '#b45309' },
  { tag: t.bool, color: '#0550ae', fontWeight: '600' },
  { tag: t.null, color: '#6b7280', fontWeight: '600' },
  { tag: t.punctuation, color: '#64748b' },
  { tag: t.bracket, color: '#334155' },
  { tag: t.squareBracket, color: '#334155' },
  { tag: t.brace, color: '#334155' },
  { tag: t.separator, color: '#94a3b8' },
]);

const darkHighlight = HighlightStyle.define([
  { tag: t.propertyName, color: '#79b8ff', fontWeight: '600' },
  { tag: t.string, color: '#56d364' },
  { tag: t.number, color: '#f0a000' },
  { tag: t.bool, color: '#79b8ff', fontWeight: '600' },
  { tag: t.null, color: '#8b949e', fontWeight: '600' },
  { tag: t.punctuation, color: '#94a3b8' },
  { tag: t.bracket, color: '#e2e8f0' },
  { tag: t.squareBracket, color: '#e2e8f0' },
  { tag: t.brace, color: '#e2e8f0' },
  { tag: t.separator, color: '#64748b' },
]);

const fillTheme = EditorView.theme({
  '&': {
    height: '100%',
    maxHeight: '100%',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, 'Courier New', monospace",
    lineHeight: '1.7',
    padding: '8px 0',
  },
  '.cm-content': {
    minHeight: '100%',
    paddingRight: '8.5rem',
  },
  '.cm-gutters': {
    border: 'none',
  },
  '.cm-foldGutter': {
    width: '18px',
  },
  '.cm-foldGutter .cm-gutterElement': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#94a3b8',
    fontSize: '11px',
    lineHeight: 1,
  },
  '.cm-foldPlaceholder': {
    border: 'none',
    margin: '0 4px',
    padding: '0 6px',
    borderRadius: '4px',
  },
});

const lightTheme = EditorView.theme(
  {
    '&': {
      fontSize: '13px',
      backgroundColor: '#ffffff',
      color: '#0f172a',
      borderRadius: '10px',
    },
    '.cm-content': { caretColor: '#2563eb' },
    '.cm-gutters': {
      backgroundColor: '#f8fafc',
      color: '#94a3b8',
      borderRight: '1px solid #e2e8f0',
    },
    '.cm-activeLine': { backgroundColor: '#f1f5f9' },
    '.cm-activeLineGutter': { backgroundColor: '#e2e8f0' },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: '#bfdbfe',
    },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#2563eb' },
    '.cm-matchingBracket': {
      backgroundColor: '#dbeafe',
      outline: '1px solid #93c5fd',
    },
    '.cm-foldPlaceholder': { background: '#e2e8f0', color: '#64748b' },
  },
  { dark: false }
);

const darkTheme = EditorView.theme(
  {
    '&': {
      fontSize: '13px',
      backgroundColor: '#0b1220',
      color: '#e2e8f0',
      borderRadius: '10px',
    },
    '.cm-content': { caretColor: '#60a5fa' },
    '.cm-gutters': {
      backgroundColor: '#111827',
      color: '#64748b',
      borderRight: '1px solid #1e293b',
    },
    '.cm-activeLine': { backgroundColor: '#111b2f' },
    '.cm-activeLineGutter': { backgroundColor: '#1e293b' },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: '#1d4ed8',
    },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#60a5fa' },
    '.cm-matchingBracket': {
      backgroundColor: '#1e3a5f',
      outline: '1px solid #3b82f6',
    },
    '.cm-foldPlaceholder': { background: '#1e293b', color: '#94a3b8' },
  },
  { dark: true }
);

export interface JsonCodeEditorHandle {
  focus: () => void;
  foldAll: () => void;
  unfoldAll: () => void;
  openSearch: () => void;
  currentPath: () => string;
}

interface JsonCodeEditorProps {
  value: string;
  onChange?: (v: string) => void;
  onPasteText?: (text: string) => void;
  readOnly?: boolean;
  isDark?: boolean;
  placeholder?: string;
  className?: string;
  powerEdit?: boolean;
  indent?: number;
}

export const JsonCodeEditor = forwardRef<JsonCodeEditorHandle, JsonCodeEditorProps>(
  function JsonCodeEditor(
    {
      value,
      onChange,
      onPasteText,
      readOnly = false,
      isDark = false,
      placeholder,
      className = '',
      powerEdit = false,
      indent = 2,
    },
    ref
  ) {
    const lang = useStore((s) => s.lang);
    const cmRef = useRef<ReactCodeMirrorRef>(null);
    const { copy } = useClipboard();
    const [cursorPath, setCursorPath] = useState('$');
    const [toast, setToast] = useState<string | null>(null);
    const [menu, setMenu] = useState<{ x: number; y: number; path: string } | null>(null);
    const [addDialog, setAddDialog] = useState<{ path: string } | null>(null);
    const [addKey, setAddKey] = useState('newField');
    const [addType, setAddType] = useState('string');
    const [addValue, setAddValue] = useState('');
    const actionRef = useRef<(action: JsonEditorAction, path: string) => void>(() => {});

    const highlight = value.length <= HIGHLIGHT_CHAR_LIMIT;
    const parsed = tryParseJson(value);

    const showToast = (msg: string) => {
      setToast(msg);
      window.setTimeout(() => setToast(null), 1600);
    };

    const rewrite = useCallback(
      (next: unknown) => {
        onChange?.(stringifyJson(next, indent));
      },
      [indent, onChange]
    );

    const handleAction = useCallback(
      (action: JsonEditorAction, path: string) => {
        if (action === 'copy-path') {
          copy(path);
          showToast(lang === 'zh' ? `已复制路径 ${path}` : `Copied path ${path}`);
          return;
        }
        if (!parsed.ok) {
          showToast(lang === 'zh' ? '当前 JSON 无法解析' : 'JSON is invalid');
          return;
        }
        const segs = parseJsonPath(path);
        if (action === 'copy-value') {
          const node = getAt(parsed.value, segs);
          copy(typeof node === 'string' ? node : stringifyJson(node, indent));
          showToast(lang === 'zh' ? '已复制节点内容' : 'Copied value');
          return;
        }
        if (readOnly) return;
        if (action === 'delete') {
          rewrite(deleteAt(parsed.value, segs));
          showToast(lang === 'zh' ? `已删除 ${path}` : `Deleted ${path}`);
          return;
        }
        if (action === 'duplicate') {
          rewrite(duplicateAt(parsed.value, segs));
          showToast(lang === 'zh' ? `已复制节点 ${path}` : `Duplicated ${path}`);
          return;
        }
        if (action === 'add-child') {
          const parent = getAt(parsed.value, segs);
          if (!isContainer(parent)) {
            showToast(lang === 'zh' ? '只能向对象或数组添加子节点' : 'Can only add children to objects or arrays');
            return;
          }
          setAddKey('newField');
          setAddType('string');
          setAddValue('');
          setAddDialog({ path });
        }
      },
      [copy, indent, lang, parsed, readOnly, rewrite]
    );

    actionRef.current = handleAction;

    useImperativeHandle(ref, () => ({
      focus: () => cmRef.current?.view?.focus(),
      foldAll: () => {
        const view = cmRef.current?.view;
        if (view) foldAll(view);
      },
      unfoldAll: () => {
        const view = cmRef.current?.view;
        if (view) unfoldAll(view);
      },
      openSearch: () => {
        const view = cmRef.current?.view;
        if (view) openSearchPanel(view);
      },
      currentPath: () => cursorPath,
    }));

    const confirmAdd = () => {
      if (!addDialog || !parsed.ok) return;
      const segs = parseJsonPath(addDialog.path);
      const parent = getAt(parsed.value, segs);
      let value: unknown = defaultValueForType(addType);
      if (addType === 'string') value = addValue;
      if (addType === 'number') {
        const n = Number(addValue);
        value = Number.isFinite(n) ? n : 0;
      }
      if (addType === 'boolean') value = addValue !== 'false';
      rewrite(
        addChild(parsed.value, segs, {
          key: Array.isArray(parent) ? undefined : addKey.trim() || 'newField',
          value,
        })
      );
      setAddDialog(null);
      showToast(lang === 'zh' ? '已添加子节点' : 'Child added');
    };

    const extensions = useMemo(() => {
      const pasteHandler = EditorView.domEventHandlers({
        paste(event) {
          if (!onPasteText) return false;
          const text = event.clipboardData?.getData('text/plain');
          if (text == null) return false;
          event.preventDefault();
          onPasteText(text);
          return true;
        },
        contextmenu(event, view) {
          if (!powerEdit) return false;
          event.preventDefault();
          const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
          const path = jsonPathAt(view.state, pos ?? view.state.selection.main.head);
          setMenu({ x: event.clientX, y: event.clientY, path });
          return true;
        },
      });
      const updatePath = EditorView.updateListener.of((update) => {
        if (!powerEdit) return;
        if (update.selectionSet || update.docChanged) {
          const pos = update.state.selection.main.head;
          setCursorPath(jsonPathAt(update.state, pos));
        }
      });
      return [
        ...(highlight ? [json()] : []),
        codeFolding({ placeholderText: '…' }),
        foldGutter({
          openText: '▾',
          closedText: '▸',
        }),
        fillTheme,
        syntaxHighlighting(isDark ? darkHighlight : lightHighlight),
        Prec.high(pasteHandler),
        updatePath,
        jsonEditorHooks.of({
          enabled: powerEdit,
          readOnly,
          lang,
          onAction: (action, path) => actionRef.current(action, path),
        }),
        jsonNodeActionPlugin,
        EditorView.contentAttributes.of({
          'aria-label': readOnly ? 'JSON output' : 'JSON editor',
        }),
      ];
    }, [highlight, isDark, onPasteText, powerEdit, readOnly, lang]);

    useEffect(() => {
      if (!menu) return;
      const close = () => setMenu(null);
      window.addEventListener('click', close);
      return () => window.removeEventListener('click', close);
    }, [menu]);

    const lines = value ? value.split('\n').length : 0;
    const size = new Blob([value]).size;
    const sizeLabel = size >= 1024 ? `${(size / 1024).toFixed(1)}KB` : `${size}B`;

    return (
      <div
        className={`json-code-editor relative flex-1 min-h-0 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-950 flex flex-col ${className}`}
      >
        <div className="flex-1 min-h-0 overflow-hidden">
          <CodeMirror
            ref={cmRef}
            value={value}
            height="100%"
            minHeight="100%"
            maxHeight="100%"
            basicSetup={{
              lineNumbers: true,
              foldGutter: false,
              highlightActiveLine: !readOnly,
              highlightActiveLineGutter: !readOnly,
              bracketMatching: true,
              autocompletion: !readOnly,
              closeBrackets: !readOnly,
              defaultKeymap: true,
              indentOnInput: true,
              searchKeymap: true,
              foldKeymap: true,
            }}
            extensions={extensions}
            editable={!readOnly}
            placeholder={placeholder}
            onChange={(val) => onChange?.(val)}
            theme={isDark ? darkTheme : lightTheme}
          />
        </div>

        {powerEdit && (
          <div className="flex-shrink-0 flex items-center gap-3 px-3 py-1.5 text-xs border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-500">
            <span
              className={`font-semibold ${parsed.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}
            >
              {parsed.ok ? (lang === 'zh' ? '有效 JSON' : 'Valid JSON') : lang === 'zh' ? '语法错误' : 'Invalid'}
            </span>
            <span className="text-gray-400">{lang === 'zh' ? '路径' : 'Path'}</span>
            <button
              type="button"
              className="font-mono truncate text-left text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400"
              title={lang === 'zh' ? `点击复制 ${cursorPath}` : `Click to copy ${cursorPath}`}
              onClick={() => handleAction('copy-path', cursorPath)}
            >
              {cursorPath}
            </button>
            <span className="ml-auto whitespace-nowrap tabular-nums">
              {lines} {lang === 'zh' ? '行' : 'lines'} · {sizeLabel}
            </span>
            {toast && <span className="text-blue-600 dark:text-blue-400">{toast}</span>}
          </div>
        )}

        {menu && (
          <div
            className="fixed z-50 min-w-[188px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl py-1 text-sm"
            style={{ left: menu.x, top: menu.y }}
          >
            {(() => {
              const node = parsed.ok ? getAt(parsed.value, parseJsonPath(menu.path)) : undefined;
              const items: Array<[JsonEditorAction, string]> = [
                ['copy-path', lang === 'zh' ? '复制节点路径' : 'Copy path'],
                ['copy-value', lang === 'zh' ? '复制节点内容' : 'Copy value'],
              ];
              if (!readOnly) {
                if (isContainer(node)) items.push(['add-child', lang === 'zh' ? '添加子节点' : 'Add child']);
                if (menu.path !== '$') {
                  items.push(['duplicate', lang === 'zh' ? '复制节点' : 'Duplicate node']);
                  items.push(['delete', lang === 'zh' ? '删除节点' : 'Delete node']);
                }
              }
              return items;
            })().map(([action, label]) => (
              <button
                key={action}
                type="button"
                className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => {
                  handleAction(action, menu.path);
                  setMenu(null);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {addDialog && (
          <div className="absolute inset-0 z-40 bg-black/20 flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 shadow-xl">
              <div className="text-sm font-medium mb-3">
                {lang === 'zh' ? '添加子节点' : 'Add child'}
                <div className="text-xs font-mono text-gray-400 mt-1">{addDialog.path}</div>
              </div>
              {parsed.ok && !Array.isArray(getAt(parsed.value, parseJsonPath(addDialog.path))) && (
                <label className="block text-xs text-gray-500 mb-2">
                  {lang === 'zh' ? '键名' : 'Key'}
                  <input
                    value={addKey}
                    onChange={(e) => setAddKey(e.target.value)}
                    className="mt-1 w-full px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') confirmAdd();
                      if (e.key === 'Escape') setAddDialog(null);
                    }}
                  />
                </label>
              )}
              <label className="block text-xs text-gray-500 mb-2">
                {lang === 'zh' ? '类型' : 'Type'}
                <select
                  value={addType}
                  onChange={(e) => setAddType(e.target.value)}
                  className="mt-1 w-full px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                >
                  <option value="string">string</option>
                  <option value="number">number</option>
                  <option value="boolean">boolean</option>
                  <option value="null">null</option>
                  <option value="object">object</option>
                  <option value="array">array</option>
                </select>
              </label>
              {(addType === 'string' || addType === 'number' || addType === 'boolean') && (
                <label className="block text-xs text-gray-500 mb-3">
                  {lang === 'zh' ? '值' : 'Value'}
                  {addType === 'boolean' ? (
                    <select
                      value={addValue === 'false' ? 'false' : 'true'}
                      onChange={(e) => setAddValue(e.target.value)}
                      className="mt-1 w-full px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    >
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : (
                    <input
                      value={addValue}
                      onChange={(e) => setAddValue(e.target.value)}
                      className="mt-1 w-full px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') confirmAdd();
                        if (e.key === 'Escape') setAddDialog(null);
                      }}
                    />
                  )}
                </label>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700"
                  onClick={() => setAddDialog(null)}
                >
                  {lang === 'zh' ? '取消' : 'Cancel'}
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white"
                  onClick={confirmAdd}
                >
                  {lang === 'zh' ? '添加' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);
