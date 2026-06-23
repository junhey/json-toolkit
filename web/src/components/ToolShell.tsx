import { useState, useCallback } from 'react';
import { Copy, Check, Download, Trash2, FileText } from 'lucide-react';
import { useStore } from '../store';
import { t } from '../lib/i18n';

export function useClipboard() {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);
  return { copied, copy };
}

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface ToolShellProps {
  input: string;
  setInput: (v: string) => void;
  output: string;
  error: string | null;
  options?: React.ReactNode;
  onProcess: () => void;
  onClear?: () => void;
  inputLabel?: string;
  outputLabel?: string;
  outputNode?: React.ReactNode;
  processLabel?: string;
  sampleData?: string;
}

export function ToolShell({
  input, setInput, output, error, options, onProcess, onClear,
  inputLabel, outputLabel, outputNode, processLabel, sampleData,
}: ToolShellProps) {
  const { lang } = useStore();
  const { copied, copy } = useClipboard();

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Options bar */}
      {options && (
        <div className="flex items-center gap-3 flex-wrap p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          {options}
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-2">
        <button
          onClick={onProcess}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Zap />
          {processLabel || t(lang, 'process')}
        </button>
        {sampleData && (
          <button
            onClick={() => setInput(sampleData)}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
          >
            <FileText className="w-4 h-4" />
            {t(lang, 'sample')}
          </button>
        )}
        <div className="flex-1" />
        <button
          onClick={() => copy(output)}
          disabled={!output}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1 disabled:opacity-40"
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          {copied ? t(lang, 'copied') : t(lang, 'copy')}
        </button>
        {output && (
          <button
            onClick={() => downloadText('output.txt', output)}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
          >
            <Download className="w-4 h-4" />
            {t(lang, 'download')}
          </button>
        )}
        <button
          onClick={() => { setInput(''); onClear?.(); }}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
        >
          <Trash2 className="w-4 h-4" />
          {t(lang, 'clear')}
        </button>
      </div>

      {/* Input/Output panels */}
      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        {/* Input */}
        <div className="flex flex-col min-h-0">
          <label className="text-xs font-medium text-gray-500 mb-1">{inputLabel || t(lang, 'input')}</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 code-font resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            spellCheck={false}
            placeholder="Paste JSON here..."
          />
        </div>
        {/* Output */}
        <div className="flex flex-col min-h-0">
          <label className="text-xs font-medium text-gray-500 mb-1">{outputLabel || t(lang, 'output')}</label>
          {error ? (
            <div className="flex-1 p-3 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm overflow-auto">
              {error}
            </div>
          ) : outputNode ? (
            <div className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-auto">
              {outputNode}
            </div>
          ) : (
            <textarea
              value={output}
              readOnly
              className="flex-1 w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 code-font resize-none focus:outline-none"
              placeholder="Output will appear here..."
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Zap() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

export const sampleJson = `{
  "name": "JSON Toolkit",
  "version": "0.1.0",
  "features": ["format", "minify", "sort", "decode", "jsonpath", "tree", "table", "diff", "schema", "csv"],
  "author": {
    "name": "junhey",
    "url": "https://github.com/junhey"
  },
  "stars": 999,
  "isAwesome": true,
  "tags": ["json", "tools", "rust", "tauri", "wasm"]
}`;
