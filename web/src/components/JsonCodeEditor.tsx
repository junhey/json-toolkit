import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { EditorView } from '@codemirror/view';
import { useMemo } from 'react';

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
    lineHeight: '1.6',
    padding: '10px 0',
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
    lineHeight: '1.6',
    padding: '10px 0',
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
}, { dark: true });

interface JsonCodeEditorProps {
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  isDark?: boolean;
  placeholder?: string;
}

export function JsonCodeEditor({
  value,
  onChange,
  readOnly = false,
  isDark = false,
  placeholder,
}: JsonCodeEditorProps) {
  const extensions = useMemo(
    () => [json(), EditorView.lineWrapping],
    []
  );

  return (
    <div className="h-full rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm bg-white dark:bg-gray-950">
      <CodeMirror
        value={value}
        height="100%"
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
          bracketMatching: true,
          autocompletion: true,
          closeBrackets: true,
          defaultKeymap: true,
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
