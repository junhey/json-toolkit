import { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, Zap, Copy, Check, Download, Trash2, AlertCircle, ArrowRight, Minimize2 } from 'lucide-react';
import { useStore } from '../store';
import { t } from '../lib/i18n';
import { getAdapter } from '../lib/adapter';
import { downloadText } from '../components/ToolShell';
import { JsonCodeEditor } from '../components/JsonCodeEditor';

export function MinifierTool() {
  const { lang, theme } = useStore();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [realTime, setRealTime] = useState(true);
  const [copied, setCopied] = useState(false);
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
      return;
    }
    setError(null);
    try {
      const result = await getAdapter().minify(input);
      setOutput(result);
      setError(null);
    } catch (e: any) {
      setError(e.toString().replace(/^Error:\s*/, ''));
      setOutput('');
    }
  }, [input]);

  // Real-time minify with debounce 300ms
  useEffect(() => {
    if (!realTime || !input.trim()) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => process(), 300);
    return () => clearTimeout(debounceRef.current);
  }, [input, realTime, process]);

  const copyOutput = () => copy(output);
  const clearAll = () => { setInput(''); setOutput(''); setError(null); };

  // Stats calculation
  const inputLines = input ? input.split('\n').length : 0;
  const outputLines = output ? 1 : 0;
  const inputSize = new Blob([input]).size;
  const outputSize = new Blob([output]).size;
  const compressionRatio = input.length > 0 ? ((1 - output.length / input.length) * 100) : 0;

  const formatSize = (bytes: number) => bytes >= 1024 ? `${(bytes / 1024).toFixed(1)}KB` : `${bytes}B`;

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Options bar */}
      <div className="flex items-center gap-4 flex-wrap px-4 py-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <label className="text-sm flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={realTime} onChange={(e) => setRealTime(e.target.checked)} className="rounded accent-blue-600" />
          <Activity className="w-3.5 h-3.5 text-green-500" />
          <span className="text-gray-700 dark:text-gray-200">{t(lang, 'realTime')}</span>
        </label>
        <div className="flex-1" />
        {!realTime && (
          <button
            onClick={() => process()}
            className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Minimize2 className="w-4 h-4" />
            {lang === 'zh' ? '压缩' : 'Compress'}
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
            placeholder={lang === 'zh' ? '粘贴 JSON 进行压缩...' : 'Paste JSON to minify...'}
          />
        </div>

        {/* Output */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-gray-500">{t(lang, 'output')}</label>
            {output && (
              <div className="flex items-center gap-3">
                {/* Compression stats badge */}
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200/70 dark:border-green-800/60 flex items-center gap-1.5">
                  <span>{inputLines}</span>
                  <ArrowRight className="w-3 h-3" />
                  <span>1</span>
                  <span className="mx-1 text-green-300">|</span>
                  <Zap className="w-3 h-3" />
                  <span>{compressionRatio.toFixed(0)}%</span>
                  <span className="mx-1 text-green-300">|</span>
                  <span>{formatSize(inputSize)}</span>
                  <ArrowRight className="w-3 h-3" />
                  <span>{formatSize(outputSize)}</span>
                </span>
                <button onClick={copyOutput} className="text-xs flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors">
                  {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  {copied ? t(lang, 'copied') : t(lang, 'copy')}
                </button>
                <button onClick={() => downloadText('minified.json', output)} className="text-xs flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors">
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
              placeholder={lang === 'zh' ? '压缩结果将显示在这里...' : 'Minified output will appear here...'}
            />
          )}
        </div>
      </div>
    </div>
  );
}
