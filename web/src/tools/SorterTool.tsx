import { useState, useEffect, useRef, useCallback } from 'react';
import { Copy, Check, Download, Trash2, AlertCircle, Activity, ArrowUpDown, ArrowDownUp, Key, Zap } from 'lucide-react';
import { useStore } from '../store';
import { t } from '../lib/i18n';
import { getAdapter } from '../lib/adapter';
import { downloadText } from '../components/ToolShell';
import { JsonCodeEditor } from '../components/JsonCodeEditor';

export function SorterTool() {
  const { lang, theme } = useStore();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'key' | 'value'>('key');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [realTime, setRealTime] = useState(true);
  const [copied, setCopied] = useState(false);
  const [keyCount, setKeyCount] = useState(0);
  const [sortTime, setSortTime] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, []);

  const process = useCallback(async () => {
    if (!input.trim()) {
      setOutput('');
      setError(null);
      setKeyCount(0);
      setSortTime(0);
      return;
    }

    setError(null);
    const start = performance.now();

    try {
      // Extract top-level key count for stats
      let keys = 0;
      try {
        const parsed = JSON.parse(input);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          keys = Object.keys(parsed).length;
        }
      } catch { /* ignore */ }
      setKeyCount(keys);

      const result = await getAdapter().sort(input, sortBy, order);
      setOutput(result);
      setSortTime(Math.round(performance.now() - start));
    } catch (e: any) {
      setError(e.toString().replace(/^Error:\s*/, ''));
      setOutput('');
      setKeyCount(0);
      setSortTime(0);
    }
  }, [input, sortBy, order]);

  // Real-time sorting with debounce
  useEffect(() => {
    if (!realTime || !input.trim()) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => process(), 300);
    return () => clearTimeout(debounceRef.current);
  }, [input, sortBy, order, realTime, process]);

  const copyOutput = () => copy(output);
  const clearAll = () => { setInput(''); setOutput(''); setError(null); setKeyCount(0); setSortTime(0); };

  // Stats label
  const inputLines = input ? input.split('\n').length : 0;

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Options bar */}
      <div className="flex items-center gap-4 flex-wrap px-4 py-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        {/* Sort By */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">{t(lang, 'sortBy')}:</span>
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setSortBy('key')}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                sortBy === 'key'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              {t(lang, 'byKey')}
            </button>
            <button
              onClick={() => setSortBy('value')}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                sortBy === 'value'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <ArrowDownUp className="w-3.5 h-3.5" />
              {t(lang, 'byValue')}
            </button>
          </div>
        </div>

        {/* Order */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">{t(lang, 'sortOrder')}:</span>
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setOrder('asc')}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                order === 'asc'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              {t(lang, 'asc')}
            </button>
            <button
              onClick={() => setOrder('desc')}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                order === 'desc'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <ArrowDownUp className="w-3.5 h-3.5 rotate-180" />
              {t(lang, 'desc')}
            </button>
          </div>
        </div>

        {/* Real-time toggle */}
        <label className="text-sm flex items-center gap-2 cursor-pointer select-none ml-2">
          <input type="checkbox" checked={realTime} onChange={(e) => setRealTime(e.target.checked)} className="rounded accent-blue-600" />
          <Activity className="w-3.5 h-3.5 text-blue-500" />
          {t(lang, 'realTime')}
        </label>

        <div className="flex-1" />

        {/* Sort button (only when real-time is off) */}
        {!realTime && (
          <button
            onClick={() => process()}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            {t(lang, 'process')}
          </button>
        )}
      </div>

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
            placeholder={lang === 'zh' ? '粘贴需要排序的 JSON...' : 'Paste JSON to sort...'}
          />
        </div>

        {/* Output */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-gray-500">{t(lang, 'output')}</label>
            {output && (
              <div className="flex items-center gap-3">
                {/* Stats badge */}
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium border border-blue-200/70 dark:border-blue-800/60">
                  <Key className="w-3 h-3" />
                  {keyCount} {lang === 'zh' ? 'keys sorted' : 'keys sorted'}
                  <span className="text-blue-300 dark:text-blue-500">·</span>
                  {order === 'asc' ? t(lang, 'asc') : t(lang, 'desc')}
                  <span className="text-blue-300 dark:text-blue-500">·</span>
                  {sortTime}ms
                </span>
                <button onClick={copyOutput} className="text-xs flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors">
                  {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  {copied ? t(lang, 'copied') : t(lang, 'copy')}
                </button>
                <button onClick={() => downloadText('sorted.json', output)} className="text-xs flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors">
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
              placeholder={lang === 'zh' ? '排序结果将显示在这里...' : 'Sorted output will appear here...'}
            />
          )}
        </div>
      </div>
    </div>
  );
}
