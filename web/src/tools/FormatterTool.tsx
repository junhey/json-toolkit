import { useState, useEffect, useRef, useCallback } from 'react';
import { Copy, Check, Download, Trash2, Zap, Sparkles, AlertCircle, Paintbrush, Activity } from 'lucide-react';
import { useStore } from '../store';
import { t } from '../lib/i18n';
import { getAdapter } from '../lib/adapter';
import { downloadText } from '../components/ToolShell';
import { JsonCodeEditor } from '../components/JsonCodeEditor';

export function FormatterTool() {
  const { lang, theme } = useStore();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [indent, setIndent] = useState(2);
  const [sortKeys, setSortKeys] = useState(false);
  const [autoDecode, setAutoDecode] = useState(true);
  const [realTime, setRealTime] = useState(true);
  const [copied, setCopied] = useState(false);
  const [decodedFrom, setDecodedFrom] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, []);

  const tryAutoDecode = useCallback((text: string): { decoded: string; type: string } | null => {
    const trimmed = text.trim();
    if (!trimmed) return null;

    // Try Base64 decode
    if (/^[A-Za-z0-9+/=\s]+$/.test(trimmed) && trimmed.length > 8) {
      try {
        const decoded = atob(trimmed.replace(/\s/g, ''));
        if (decoded.trim().startsWith('{') || decoded.trim().startsWith('[')) {
          return { decoded, type: 'Base64' };
        }
      } catch {}
    }

    // Try URL decode
    if (trimmed.includes('%7B') || trimmed.includes('%5B') || trimmed.includes('%22')) {
      try {
        const decoded = decodeURIComponent(trimmed);
        if (decoded.trim().startsWith('{') || decoded.trim().startsWith('[')) {
          return { decoded, type: 'URL' };
        }
      } catch {}
    }

    // Try Unicode escape decode
    if (/\\u[0-9a-fA-F]{4}/.test(trimmed)) {
      try {
        const decoded = trimmed.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
          String.fromCharCode(parseInt(hex, 16))
        );
        if (decoded.trim().startsWith('{') || decoded.trim().startsWith('[')) {
          return { decoded, type: 'Unicode' };
        }
      } catch {}
    }

    return null;
  }, []);

  const process = useCallback(async (overrideInput?: string) => {
    const text = overrideInput ?? input;
    if (!text.trim()) {
      setOutput('');
      setError(null);
      setDecodedFrom(null);
      return;
    }

    setError(null);
    let actualInput = text;
    setDecodedFrom(null);

    // Auto-decode if enabled and input doesn't look like JSON
    if (autoDecode && !text.trim().startsWith('{') && !text.trim().startsWith('[')) {
      const decoded = tryAutoDecode(text);
      if (decoded) {
        actualInput = decoded.decoded;
        setDecodedFrom(decoded.type);
      }
    }

    try {
      const result = await getAdapter().format(actualInput, indent, sortKeys);
      setOutput(result);
      setError(null);
    } catch (e: any) {
      setError(e.toString().replace(/^Error:\s*/, ''));
      setOutput('');
    }
  }, [input, indent, sortKeys, autoDecode, tryAutoDecode]);

  // Real-time formatting
  useEffect(() => {
    if (!realTime || !input.trim()) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => process(), 280);
    return () => clearTimeout(debounceRef.current);
  }, [input, indent, sortKeys, autoDecode, realTime, process]);

  const copyOutput = () => copy(output);
  const clearAll = () => { setInput(''); setOutput(''); setError(null); setDecodedFrom(null); };

  // Stats
  const inputLines = input ? input.split('\n').length : 0;
  const outputLines = output ? output.split('\n').length : 0;
  const outputSize = new Blob([output]).size;

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Options bar */}
      <div className="flex items-center gap-4 flex-wrap px-4 py-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <label className="text-sm flex items-center gap-2">
          <Paintbrush className="w-4 h-4 text-indigo-500" />
          <span className="text-gray-500">{t(lang, 'indent')}:</span>
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {[2, 4, 8].map((v) => (
              <button
                key={v}
                onClick={() => setIndent(v)}
                className={`px-3 py-1 text-sm transition-colors ${
                  indent === v
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {v === 8 ? 'Tab' : `${v}SP`}
              </button>
            ))}
          </div>
        </label>
        <label className="text-sm flex items-center gap-2 cursor-pointer select-none text-gray-700 dark:text-gray-200">
          <input type="checkbox" checked={sortKeys} onChange={(e) => setSortKeys(e.target.checked)} className="rounded accent-blue-600" />
          {t(lang, 'sortKeys')}
        </label>
        <label className="text-sm flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={autoDecode} onChange={(e) => setAutoDecode(e.target.checked)} className="rounded accent-blue-600" />
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          {t(lang, 'autoDecode')}
        </label>
        <label className="text-sm flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={realTime} onChange={(e) => setRealTime(e.target.checked)} className="rounded accent-blue-600" />
          <Activity className="w-3.5 h-3.5 text-blue-500" />
          {t(lang, 'realTime')}
        </label>
        <div className="flex-1" />
        {!realTime && (
          <button
            onClick={() => process()}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {t(lang, 'process')}
          </button>
        )}
      </div>

      {/* Auto-decode notice */}
      {decodedFrom && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs border border-amber-200/70 dark:border-amber-800/60">
          <Sparkles className="w-3.5 h-3.5" />
          {lang === 'zh' ? `检测到 ${decodedFrom} 编码，已自动解码` : `Detected ${decodedFrom} encoding, auto-decoded`}
        </div>
      )}

      {/* Input/Output panels */}
      <div className="flex-1 grid grid-cols-2 gap-3 min-h-0">
        {/* Input */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-gray-500">{t(lang, 'input')}</label>
            <span className="text-xs text-gray-400">{inputLines} lines</span>
          </div>
          <JsonCodeEditor
            value={input}
            onChange={setInput}
            isDark={isDark}
            placeholder={lang === 'zh' ? '粘贴 JSON、Base64 或 URL 编码的 JSON...' : 'Paste JSON, Base64 or URL-encoded JSON...'}
          />
        </div>

        {/* Output */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-gray-500">{t(lang, 'output')}</label>
            {output && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{outputLines} lines · {(outputSize / 1024).toFixed(1)}KB</span>
                <button onClick={copyOutput} className="text-xs flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors">
                  {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  {copied ? t(lang, 'copied') : t(lang, 'copy')}
                </button>
                <button onClick={() => downloadText('formatted.json', output)} className="text-xs flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors">
                  <Download className="w-3 h-3" />
                </button>
                <button onClick={clearAll} className="text-xs flex items-center gap-1 text-gray-500 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {error ? (
            <div className="flex-1 p-3 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm overflow-auto flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>{error}</div>
            </div>
          ) : (
            <JsonCodeEditor
              value={output}
              readOnly
              isDark={isDark}
              placeholder={lang === 'zh' ? '格式化结果将显示在这里...' : 'Formatted output will appear here...'}
            />
          )}
        </div>
      </div>
    </div>
  );
}
