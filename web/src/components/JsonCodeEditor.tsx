import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { useMemo, useRef, forwardRef, useImperativeHandle } from 'react';

const lightHighlight = HighlightStyle.define([
  { tag: t.propertyName, color: '#b91c1c', fontWeight: '600' },
  { tag: t.string, color: '#be185d' },
  { tag: t.number, color: '#15803d' },
  { tag: t.bool, color: '#1d4ed8', fontWeight: '600' },
  { tag: t.null, color: '#7c3aed', fontWeight: '600' },
  { tag: t.punctuation, color: '#64748b' },
  { tag: t.bracket, color: '#0f172a' },
  { tag: t.squareBracket, color: '#0f172a' },
  { tag: t.brace, color: '#0f172a' },
  { tag: t.separator, color: '#94a3b8' },
]);

const darkHighlight = HighlightStyle.define([
  { tag: t.propertyName, color: '#fca5a5', fontWeight: '600' },
  { tag: t.string, color: '#86efac' },
  { tag: t.number, color: '#93c5fd' },
  { tag: t.bool, color: '#fdba74', fontWeight: '600' },
  { tag: t.null, color: '#d8b4fe', fontWeight: '600' },
  { tag: t.punctuation, color: '#94a3b8' },
  { tag: t.bracket, color: '#e2e8f0' },
  { tag: t.squareBracket, color: '#e2e8f0' },
  { tag: t.brace, color: '#e2e8f0' },
  { tag: t.separator, color: '#64748b' },
]);

const lightTheme = EditorView.theme({
  '&': {
    fontSize: '13px',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    height: '100%',
    borderRadius: '10px',
  },
  '.cm-scroller': {
    fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, 'Courier New', monospace",
    lineHeight: '1.65',
    padding: '8px 0',
  },
  '.cm-content': {
    caretColor: '#2563eb',
  },
  '.cm-gutters': {
    backgroundColor: '#f8fafc',
    color: '#94a3b8',
    border: 'none',
    borderRight: '1px solid #e2e8f0',
  },
  '.cm-activeLine': {
    backgroundColor: '#f1f5f9',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#e2e8f0',
  },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: '#bfdbfe',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: '#2563eb',
  },
  '.cm-matchingBracket': {
    backgroundColor: '#dbeafe',
    outline: '1px solid #93c5fd',
  },
  '.cm-foldPlaceholder': {
    background: '#e2e8f0',
    border: 'none',
    color: '#64748b',
  },
}, { dark: false });

const darkTheme = EditorView.theme({
  '&': {
    fontSize: '13px',
    backgroundColor: '#0b1220',
    color: '#e2e8f0',
    height: '100%',
    borderRadius: '10px',
  },
  '.cm-scroller': {
    fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, 'Courier New', monospace",
    lineHeight: '1.65',
    padding: '8px 0',
  },
  '.cm-content': {
    caretColor: '#60a5fa',
  },
  '.cm-gutters': {
    backgroundColor: '#111827',
    color: '#64748b',
    border: 'none',
    borderRight: '1px solid #1e293b',
  },
  '.cm-activeLine': {
    backgroundColor: '#111b2f',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#1e293b',
  },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: '#1d4ed8',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: '#60a5fa',
  },
  '.cm-matchingBracket': {
    backgroundColor: '#1e3a5f',
    outline: '1px solid #3b82f6',
  },
  '.cm-foldPlaceholder': {
    background: '#1e293b',
    border: 'none',
    color: '#94a3b8',
  },
}, { dark: true });

export interface JsonCodeEditorHandle {
  focus: () => void;
}

interface JsonCodeEditorProps {
  value: string;
  onChange?: (v: string) => void;
  onPasteText?: (text: string) => void;
  readOnly?: boolean;
  isDark?: boolean;
  placeholder?: string;
  minHeight?: string;
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
      minHeight = '100%',
    },
    ref
  ) {
    const cmRef = useRef<ReactCodeMirrorRef>(null);

    useImperativeHandle(ref, () => ({
      focus: () => cmRef.current?.view?.focus(),
    }));

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
      });
      return [
        json(),
        EditorView.lineWrapping,
        syntaxHighlighting(isDark ? darkHighlight : lightHighlight),
        pasteHandler,
      ];
    }, [isDark, onPasteText]);

    return (
      <div
        className="h-full min-h-[220px] rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm bg-white dark:bg-gray-950"
        style={{ minHeight }}
      >
        <CodeMirror
          ref={cmRef}
          value={value}
          height={minHeight === '100%' ? '100%' : minHeight}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: !readOnly,
            highlightActiveLineGutter: !readOnly,
            bracketMatching: true,
            autocompletion: !readOnly,
            closeBrackets: !readOnly,
            defaultKeymap: true,
            indentOnInput: true,
          }}
          extensions={extensions}
          editable={!readOnly}
          placeholder={placeholder}
          onChange={(val) => onChange?.(val)}
          theme={isDark ? darkTheme : lightTheme}
        />
      </div>
    );
  }
);
