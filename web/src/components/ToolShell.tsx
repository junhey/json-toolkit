import { useState, useCallback } from 'react';
import { Copy, Check, Download, Trash2, Zap } from 'lucide-react';
import { useStore } from '../store';
import { t } from '../lib/i18n';
import { JsonCodeEditor } from './JsonCodeEditor';

export function useClipboard() {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
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

type EditorSyntax = 'json' | 'text';

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
  inputSyntax?: EditorSyntax;
  outputSyntax?: EditorSyntax;
  inputPlaceholder?: string;
  outputPlaceholder?: string;
}

export function ToolShell({
  input,
  setInput,
  output,
  error,
  options,
  onProcess,
  onClear,
  inputLabel,
  outputLabel,
  outputNode,
  processLabel,
  inputSyntax = 'json',
  outputSyntax = 'json',
  inputPlaceholder,
  outputPlaceholder,
}: ToolShellProps) {
  const { lang, theme } = useStore();
  const { copied, copy } = useClipboard();

  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const inputLines = input ? input.split('\n').length : 0;
  const outputLines = output ? output.split('\n').length : 0;

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Options bar */}
      {options && (
        <div className="flex items-center gap-3 flex-wrap px-4 py-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          {options}
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-2">
        <button
          onClick={onProcess}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Zap className="w-4 h-4" />
          {processLabel || t(lang, 'process')}
        </button>
        <div className="flex-1" />
        <button
          onClick={() => copy(output)}
          disabled={!output}
          className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1 disabled:opacity-40"
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          {copied ? t(lang, 'copied') : t(lang, 'copy')}
        </button>
        {output && (
          <button
            onClick={() => downloadText('output.txt', output)}
            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
          >
            <Download className="w-4 h-4" />
            {t(lang, 'download')}
          </button>
        )}
        <button
          onClick={() => {
            setInput('');
            onClear?.();
          }}
          className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
        >
          <Trash2 className="w-4 h-4" />
          {t(lang, 'clear')}
        </button>
      </div>

      {/* Input/Output panels */}
      <div className="flex-1 grid grid-cols-2 gap-3 min-h-0">
        {/* Input */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-gray-500">{inputLabel || t(lang, 'input')}</label>
            <span className="text-xs text-gray-400">{inputLines} lines</span>
          </div>
          {inputSyntax === 'json' ? (
            <JsonCodeEditor
              value={input}
              onChange={setInput}
              isDark={isDark}
              placeholder={inputPlaceholder || 'Paste JSON here...'}
            />
          ) : (
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 code-font resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              spellCheck={false}
              placeholder={inputPlaceholder || 'Input...'}
            />
          )}
        </div>

        {/* Output */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-gray-500">{outputLabel || t(lang, 'output')}</label>
            <span className="text-xs text-gray-400">{outputLines} lines</span>
          </div>
          {error ? (
            <div className="flex-1 p-3 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm overflow-auto">
              {error}
            </div>
          ) : outputNode ? (
            <div className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-auto shadow-sm">
              {outputNode}
            </div>
          ) : outputSyntax === 'json' ? (
            <JsonCodeEditor
              value={output}
              readOnly
              isDark={isDark}
              placeholder={outputPlaceholder || 'Output will appear here...'}
            />
          ) : (
            <textarea
              value={output}
              readOnly
              className="flex-1 w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 code-font resize-none focus:outline-none"
              placeholder={outputPlaceholder || 'Output will appear here...'}
            />
          )}
        </div>
      </div>
    </div>
  );
}
