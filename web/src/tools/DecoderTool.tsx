import { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, Copy, Check, Download, Trash2, AlertCircle, Sparkles, ArrowRightLeft } from 'lucide-react';
import { useStore } from '../store';
import { t } from '../lib/i18n';
import { getAdapter } from '../lib/adapter';
import { downloadText } from '../components/ToolShell';
import { JsonCodeEditor } from '../components/JsonCodeEditor';
import { useIsDark } from '../lib/useIsDark';
import {
  ENCODE_METHODS,
  DECODE_METHODS,
  detectEncoding,
  getMethodHint,
  getMethodLabel,
  type CodecMethod,
} from '../lib/encodings';

type Mode = 'encode' | 'decode';

export function DecoderTool() {
  const { lang } = useStore();
  const isDark = useIsDark();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [methodId, setMethodId] = useState('unicode');
  const [mode, setMode] = useState<Mode>('encode');
  const [realTime, setRealTime] = useState(true);
  const [copied, setCopied] = useState(false);
  const [detected, setDetected] = useState<string | null>(null);
  const [processTime, setProcessTime] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const methods = mode === 'encode' ? ENCODE_METHODS : DECODE_METHODS;
  const activeMethod: CodecMethod =
    methods.find((m) => m.id === methodId) || methods[0];

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, []);

  const selectMethod = (method: CodecMethod) => {
    setMode(method.mode);
    setMethodId(method.id);
  };

  const process = useCallback(async () => {
    if (!input.trim()) {
      setOutput('');
      setError(null);
      setDetected(null);
      setProcessTime(0);
      return;
    }

    setError(null);
    const start = performance.now();

    try {
      let result: string;
      if (mode === 'decode') {
        result = await getAdapter().decode(input, methodId);
      } else {
        result = await getAdapter().encode(input, methodId);
      }
      setOutput(result);
      setProcessTime(performance.now() - start);
    } catch (e: any) {
      setError(e.toString().replace(/^Error:\s*/, ''));
      setOutput('');
      setProcessTime(0);
    }
  }, [input, methodId, mode]);

  useEffect(() => {
    if (mode === 'decode' && input.trim()) {
      const detectedEnc = detectEncoding(input);
      if (detectedEnc && detectedEnc !== methodId) {
        setDetected(detectedEnc);
      } else {
        setDetected(null);
      }
    } else {
      setDetected(null);
    }
  }, [input, mode, methodId]);

  useEffect(() => {
    if (!realTime) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => process(), 300);
    return () => clearTimeout(debounceRef.current);
  }, [input, methodId, mode, realTime, process]);

  const handleCopy = () => copy(output);
  const handleClear = () => {
    setInput('');
    setOutput('');
    setError(null);
    setDetected(null);
    setProcessTime(0);
  };

  const inputSize = new Blob([input]).size;
  const outputSize = new Blob([output]).size;
  const isOutputJson = output.trim().startsWith('{') || output.trim().startsWith('[');
  const totalMethods = ENCODE_METHODS.length + DECODE_METHODS.length;

  const MethodCard = ({ method }: { method: CodecMethod }) => {
    const selected = mode === method.mode && methodId === method.id;
    const hint = getMethodHint(method, lang);
    return (
      <button
        type="button"
        onClick={() => selectMethod(method)}
        className={`text-left rounded-xl border px-3 py-2.5 transition-all ${
          selected
            ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-900/25 text-blue-600 dark:text-blue-400 shadow-sm'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-gray-50 dark:hover:bg-gray-800/80'
        }`}
      >
        <div className={`text-sm leading-tight ${selected ? 'font-semibold' : 'font-medium text-gray-800 dark:text-gray-100'}`}>
          {getMethodLabel(method, lang)}
        </div>
        {hint && (
          <div className="text-[11px] mt-0.5 text-gray-400 leading-tight">{hint}</div>
        )}
      </button>
    );
  };

  return (
    <div className="tool-page">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex-shrink-0">
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50"
        >
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {lang === 'zh' ? '转换方式' : 'Conversion Methods'}
            </h3>
            <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500">
              {lang === 'zh' ? `${totalMethods} 种` : `${totalMethods} types`}
            </span>
          </div>
          <span className="text-xs text-gray-400">
            {getMethodLabel(activeMethod, lang)}
            {pickerOpen ? ' ▲' : ' ▼'}
          </span>
        </button>

        {pickerOpen && (
          <div className="px-4 pb-4 space-y-4 border-t border-gray-100 dark:border-gray-800 max-h-56 overflow-y-auto">
            <div className="pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {lang === 'zh' ? '加密' : 'Encode'}
                </span>
                <span className="text-[10px] tracking-wider text-gray-400 uppercase">ENCODE</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ENCODE_METHODS.map((m) => (
                  <MethodCard key={`enc-${m.id}`} method={m} />
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {lang === 'zh' ? '解密' : 'Decode'}
                </span>
                <span className="text-[10px] tracking-wider text-gray-400 uppercase">DECODE</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {DECODE_METHODS.map((m) => (
                  <MethodCard key={`dec-${m.id}`} method={m} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Options bar */}
      <div className="tool-toolbar">
        <div className="text-sm text-gray-600 dark:text-gray-300">
          <span className="text-gray-400 mr-1">{lang === 'zh' ? '当前' : 'Current'}:</span>
          <span className="font-medium text-blue-600 dark:text-blue-400">
            {getMethodLabel(activeMethod, lang)}
          </span>
        </div>

        <label className="text-sm flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={realTime}
            onChange={(e) => setRealTime(e.target.checked)}
            className="rounded accent-blue-600"
          />
          <Activity className={`w-3.5 h-3.5 ${realTime ? 'text-green-500' : 'text-gray-400'}`} />
          <span className="text-gray-700 dark:text-gray-200">Real-time</span>
        </label>

        <div className="flex-1" />

        {!realTime && (
          <button
            onClick={() => process()}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <ArrowRightLeft className="w-4 h-4" />
            {t(lang, 'process')}
          </button>
        )}
      </div>

      {detected && mode === 'decode' && (
        <button
          onClick={() => {
            setMethodId(detected);
            setDetected(null);
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-medium border border-blue-200/70 dark:border-blue-800/60 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {lang === 'zh'
            ? `检测到: ${DECODE_METHODS.find((e) => e.id === detected)?.nameZh || detected} · 点击自动选择`
            : `Detected: ${DECODE_METHODS.find((e) => e.id === detected)?.nameEn || detected} · Click to select`}
        </button>
      )}

      {output && !error && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-900/20 dark:to-emerald-900/20 text-xs font-medium border border-blue-100/70 dark:border-blue-800/40">
          <span className="text-gray-600 dark:text-gray-300">
            {getMethodLabel(activeMethod, lang)}
          </span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-600 dark:text-gray-300">
            {inputSize} bytes → {outputSize} bytes
          </span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-500">{processTime.toFixed(1)}ms</span>
        </div>
      )}

      <div className="tool-split">
        <div className="tool-pane">
          <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
            <label className="text-xs font-medium text-gray-500">{t(lang, 'input')}</label>
            <span className="text-xs text-gray-400">{inputSize} bytes</span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 min-h-0 w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 code-font resize-none overflow-auto focus:outline-none focus:ring-2 focus:ring-blue-500"
            spellCheck={false}
            placeholder={
              mode === 'decode'
                ? lang === 'zh'
                  ? '粘贴需要解码/解析的文本...'
                  : 'Paste text to decode/parse...'
                : lang === 'zh'
                  ? '粘贴要编码的纯文本或 JSON...'
                  : 'Paste plain text or JSON to encode...'
            }
          />
        </div>

        <div className="tool-pane">
          <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
            <label className="text-xs font-medium text-gray-500">{t(lang, 'output')}</label>
            {output && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{outputSize} bytes</span>
                <button onClick={handleCopy} className="text-xs flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors">
                  {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  {copied ? t(lang, 'copied') : t(lang, 'copy')}
                </button>
                <button
                  onClick={() => downloadText(mode === 'decode' ? 'decoded.txt' : 'encoded.txt', output)}
                  className="text-xs flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors"
                >
                  <Download className="w-3 h-3" />
                </button>
                <button onClick={handleClear} className="text-xs flex items-center gap-1 text-gray-500 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {error ? (
            <div className="flex-1 min-h-0 p-3 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm overflow-auto flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>{error}</div>
            </div>
          ) : isOutputJson ? (
            <JsonCodeEditor
              value={output}
              readOnly
              isDark={isDark}
              placeholder={lang === 'zh' ? '结果将显示在这里...' : 'Output will appear here...'}
            />
          ) : (
            <textarea
              value={output}
              readOnly
              className="flex-1 min-h-0 w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 code-font resize-none overflow-auto focus:outline-none"
              placeholder={lang === 'zh' ? '结果将显示在这里...' : 'Output will appear here...'}
            />
          )}
        </div>
      </div>
    </div>
  );
}
