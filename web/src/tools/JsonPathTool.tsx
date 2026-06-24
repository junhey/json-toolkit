import { useState, useRef, useCallback } from 'react';
import { Search, Copy, Check, Download, Trash2, AlertCircle } from 'lucide-react';
import { useStore } from '../store';
import { t } from '../lib/i18n';
import { getAdapter } from '../lib/adapter';
import { downloadText } from '../components/ToolShell';
import { JsonCodeEditor } from '../components/JsonCodeEditor';

const pathPresets = [
  { label: '$', desc: 'Root', path: '$' },
  { label: '$.*', desc: 'All children', path: '$.*' },
  { label: '$..*', desc: 'All descendants', path: '$..*' },
  { label: '$.store.book[*]', desc: 'All books', path: '$.store.book[*]' },
  { label: '$.store.book[*].title', desc: 'Book titles', path: '$.store.book[*].title' },
  { label: '$.store.book[*].price', desc: 'Book prices', path: '$.store.book[*].price' },
];

export function JsonPathTool() {
  const { lang, theme } = useStore();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [path, setPath] = useState('$');
  const [copied, setCopied] = useState(false);
  const [queryTime, setQueryTime] = useState<number | null>(null);
  const [matchCount, setMatchCount] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, []);

  const query = useCallback(
    async (pathValue?: string) => {
      const activePath = pathValue ?? path;
      if (!input.trim()) {
        setOutput('');
        setError(null);
        setMatchCount(null);
        setQueryTime(null);
        return;
      }
      setError(null);
      const start = performance.now();
      try {
        const result = await getAdapter().jsonpath(input, activePath);
        const elapsed = Math.round(performance.now() - start);
        setOutput(result);
        setQueryTime(elapsed);
        // Calculate match count from result
        try {
          const parsed = JSON.parse(result);
          if (Array.isArray(parsed)) {
            setMatchCount(parsed.length);
          } else if (result.trim()) {
            setMatchCount(1);
          } else {
            setMatchCount(0);
          }
        } catch {
          // Fallback to line count
          setMatchCount(result.trim() ? result.split('\n').length : 0);
        }
      } catch (e: any) {
        const msg = e.toString().replace(/^Error:\s*/, '');
        setError(msg);
        setOutput('');
        setMatchCount(null);
        setQueryTime(null);
      }
    },
    [input, path]
  );

  const handlePresetClick = useCallback(
    (presetPath: string) => {
      setPath(presetPath);
      // Auto-query after setting preset
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => query(presetPath), 50);
    },
    [query]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        query();
      }
    },
    [query]
  );

  const copyOutput = () => copy(output);
  const clearAll = () => {
    setInput('');
    setOutput('');
    setError(null);
    setPath('$');
    setMatchCount(null);
    setQueryTime(null);
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {/* JSON Input */}
      <div className="flex flex-col" style={{ height: '40%' }}>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-gray-500">{t(lang, 'input')}</label>
          <span className="text-xs text-gray-400">
            {input ? `${input.split('\n').length} lines` : ''}
          </span>
        </div>
        <JsonCodeEditor
          value={input}
          onChange={setInput}
          isDark={isDark}
          placeholder={
            lang === 'zh'
              ? '粘贴 JSON 数据...'
              : 'Paste JSON data here...'
          }
        />
      </div>

      {/* Path Input & Presets */}
      <div className="flex flex-col gap-2 px-4 py-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
            {t(lang, 'path')}:
          </span>
          <input
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="$.store.book[*].author"
            className="flex-1 px-3 py-2 text-sm font-mono rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
          />
          <button
            onClick={() => query()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Search className="w-4 h-4" />
            Query
          </button>
        </div>
        {/* Preset chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-gray-400 mr-1">
            {t(lang, 'preset')}:
          </span>
          {pathPresets.map((p) => (
            <button
              key={p.path}
              onClick={() => handlePresetClick(p.path)}
              title={p.desc}
              className={`px-2.5 py-1 text-xs font-mono rounded-md border transition-colors ${
                path === p.path
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Result Output */}
      <div className="flex flex-col min-h-0" style={{ height: '40%' }}>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-gray-500">{t(lang, 'result')}</label>
          <div className="flex items-center gap-3">
            {/* Stats badge */}
            {matchCount !== null && !error && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  matchCount > 0
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200/60 dark:border-green-800/40'
                    : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border border-yellow-200/60 dark:border-yellow-800/40'
                }`}
              >
                {matchCount > 0 ? (
                  <>
                    {matchCount}{' '}
                    {lang === 'zh' ? '条匹配' : 'matches'} found
                    {queryTime != null && (
                      <> · {queryTime}ms</>
                    )}
                  </>
                ) : (
                  lang === 'zh'
                    ? '未找到匹配结果'
                    : 'No results found for this path'
                )}
              </span>
            )}
            {output && (
              <div className="flex items-center gap-1">
                <button
                  onClick={copyOutput}
                  className="text-xs flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  {copied ? t(lang, 'copied') : t(lang, 'copy')}
                </button>
                <button
                  onClick={() => downloadText('jsonpath-result.json', output)}
                  className="text-xs flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors"
                >
                  <Download className="w-3 h-3" />
                </button>
                <button
                  onClick={clearAll}
                  className="text-xs flex items-center gap-1 text-gray-500 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
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
            placeholder={
              lang === 'zh'
                ? '查询结果将显示在这里...'
                : 'Query results will appear here...'
            }
          />
        )}
      </div>
    </div>
  );
}
