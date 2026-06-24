import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRightLeft, Zap, Copy, Check, Download, Trash2, Activity, AlertCircle, FileJson, FileSpreadsheet } from 'lucide-react';
import { useStore } from '../store';
import { t } from '../lib/i18n';
import { getAdapter } from '../lib/adapter';
import { useClipboard, downloadText } from '../components/ToolShell';
import { JsonCodeEditor } from '../components/JsonCodeEditor';

export function ConverterTool() {
  const { lang, theme } = useStore();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState<'json2csv' | 'csv2json'>('json2csv');
  const [delim, setDelim] = useState<'csv' | 'tsv'>('csv');
  const [realTime, setRealTime] = useState(true);
  const [stats, setStats] = useState<{ fields?: number; records?: number; parsedLines?: number; outputLines?: number; size: number }>({ size: 0 });
  const { copied, copy } = useClipboard();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const process = useCallback(async (overrideInput?: string) => {
    const text = overrideInput ?? input;
    if (!text.trim()) {
      setOutput('');
      setError(null);
      setStats({ size: 0 });
      return;
    }

    setError(null);
    try {
      if (direction === 'json2csv') {
        const result = await getAdapter().jsonToCsv(text, delim);
        setOutput(result);

        // Calculate stats for JSON → CSV
        const parsed = JSON.parse(text);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        const fields = arr.length > 0 ? Object.keys(arr[0]).length : 0;
        setStats({ fields, records: arr.length, size: new Blob([result]).size });
      } else {
        const result = await getAdapter().csvToJson(text, delim);
        setOutput(result);

        // Calculate stats for CSV → JSON
        const lines = text.trim().split('\n').filter(l => l.trim()).length;
        const outParsed = JSON.parse(result);
        const outArr = Array.isArray(outParsed) ? outParsed : [outParsed];
        setStats({ parsedLines: lines, outputLines: outArr.length, size: new Blob([result]).size });
      }
    } catch (e: any) {
      setError(e.toString().replace(/^Error:\s*/, ''));
      setOutput('');
      setStats({ size: 0 });
    }
  }, [input, direction, delim]);

  // Real-time conversion with debounce
  useEffect(() => {
    if (!realTime) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => process(), 300);
    return () => clearTimeout(debounceRef.current);
  }, [input, direction, delim, realTime, process]);

  // Keyboard shortcut: Ctrl/Cmd + Enter
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        process();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [process]);

  const copyOutput = () => copy(output);
  const clearAll = () => { setInput(''); setOutput(''); setError(null); setStats({ size: 0 }); };

  const isJsonOutput = direction === 'csv2json';
  const inputPlaceholder = direction === 'json2csv'
    ? (lang === 'zh' ? '粘贴 JSON 数组（如 [{...}, {...}]）...' : 'Paste JSON array (e.g. [{...}, {...}])...')
    : (lang === 'zh' ? '粘贴 CSV/TSV 数据...' : 'Paste CSV/TSV data...');
  const outputPlaceholder = direction === 'json2csv'
    ? (lang === 'zh' ? 'CSV/TSV 输出将显示在这里...' : 'CSV/TSV output will appear here...')
    : (lang === 'zh' ? 'JSON 输出将显示在这里...' : 'JSON output will appear here...');

  const downloadFilename = direction === 'json2csv'
    ? (delim === 'csv' ? 'output.csv' : 'output.tsv')
    : 'output.json';

  // Stats display
  const renderStats = () => {
    if (!output) return null;
    const sizeKB = (stats.size / 1024).toFixed(1);
    if (direction === 'json2csv') {
      return (
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <FileSpreadsheet className="w-3 h-3" />
          {stats.fields} {lang === 'zh' ? '字段' : 'fields'}
          {' \u00b7 '}
          {stats.records} {lang === 'zh' ? '记录' : 'records'}
          {' \u00b7 '}
          {sizeKB}KB
        </span>
      );
    }
    return (
      <span className="text-xs text-gray-400 flex items-center gap-1">
        <FileJson className="w-3 h-3" />
        {stats.parsedLines} {lang === 'zh' ? '解析行' : 'parsed lines'}
        {' \u00b7 '}
        {stats.outputLines} {lang === 'zh' ? '输出行' : 'output rows'}
        {' \u00b7 '}
        {sizeKB}KB
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Options bar */}
      <div className="flex items-center gap-4 flex-wrap px-4 py-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        {/* Direction toggle */}
        <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden p-0.5">
          <button
            onClick={() => setDirection('json2csv')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${
              direction === 'json2csv'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            JSON
          </button>
          <ArrowRightLeft className="w-3.5 h-3.5 text-gray-400 mx-0.5" />
          <button
            onClick={() => setDirection('csv2json')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${
              direction === 'csv2json'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            CSV
          </button>
        </div>

        {/* Delimiter select */}
        <label className="text-sm flex items-center gap-2">
          <span className="text-gray-500">{t(lang, 'format')}:</span>
          <select
            value={delim}
            onChange={(e) => setDelim(e.target.value as 'csv' | 'tsv')}
            className="px-2.5 py-1.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            <option value="csv">CSV</option>
            <option value="tsv">TSV</option>
          </select>
        </label>

        {/* Real-time toggle */}
        <label className="text-sm flex items-center gap-2 cursor-pointer select-none ml-1">
          <input
            type="checkbox"
            checked={realTime}
            onChange={(e) => setRealTime(e.target.checked)}
            className="rounded accent-blue-600"
          />
          <Activity className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-gray-700 dark:text-gray-200">{t(lang, 'realTime')}</span>
        </label>

        {/* Process button (shown when real-time is off) */}
        <div className="flex-1" />
        {!realTime && (
          <button
            onClick={() => process()}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
          >
            <Zap className="w-4 h-4" />
            {t(lang, 'process')}
          </button>
        )}
      </div>

      {/* Input/Output panels */}
      <div className="flex-1 grid grid-cols-2 gap-3 min-h-0">
        {/* Input panel */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
              {direction === 'json2csv' ? <FileJson className="w-3 h-3" /> : <FileSpreadsheet className="w-3 h-3" />}
              {t(lang, 'input')}
              <span className="font-normal text-gray-400">({direction === 'json2csv' ? 'JSON' : 'CSV/TSV'})</span>
            </label>
            <span className="text-xs text-gray-400">{input ? `${input.split('\n').length} lines` : ''}</span>
          </div>
          <JsonCodeEditor
            value={input}
            onChange={setInput}
            isDark={isDark}
            placeholder={inputPlaceholder}
          />
        </div>

        {/* Output panel */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
              {direction === 'json2csv' ? <FileSpreadsheet className="w-3 h-3" /> : <FileJson className="w-3 h-3" />}
              {t(lang, 'output')}
              <span className="font-normal text-gray-400">({direction === 'json2csv' ? 'CSV/TSV' : 'JSON'})</span>
            </label>
            {output && (
              <div className="flex items-center gap-3">
                {renderStats()}
                <button onClick={copyOutput} className="text-xs flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors">
                  {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  {copied ? t(lang, 'copied') : t(lang, 'copy')}
                </button>
                <button onClick={() => downloadText(downloadFilename, output)} className="text-xs flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors">
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
          ) : isJsonOutput ? (
            <JsonCodeEditor
              value={output}
              readOnly
              isDark={isDark}
              placeholder={outputPlaceholder}
            />
          ) : (
            <pre className="flex-1 w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 code-font overflow-auto whitespace-pre-wrap break-words text-[13px] leading-relaxed shadow-sm">
              {output || <span className="text-gray-400">{outputPlaceholder}</span>}
            </pre>
          )}
        </div>
      </div>

      {/* Keyboard shortcut hint */}
      <div className="text-xs text-gray-400 text-center pb-1">
        <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-mono text-[11px]">Ctrl</kbd>
        {' + '}
        <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-mono text-[11px]">Enter</kbd>
        {lang === 'zh' ? ' 触发转换' : ' to convert'}
      </div>
    </div>
  );
}
