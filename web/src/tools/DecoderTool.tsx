import { useState, useEffect, useRef, useCallback } from 'react';
import { Lock, Unlock, Activity, Copy, Check, Download, Trash2, AlertCircle, Sparkles, ArrowRightLeft } from 'lucide-react';
import { useStore } from '../store';
import { t } from '../lib/i18n';
import { getAdapter } from '../lib/adapter';
import { downloadText } from '../components/ToolShell';
import { JsonCodeEditor } from '../components/JsonCodeEditor';

const ENCODINGS = [
  { value: 'base64', label: 'Base64' },
  { value: 'base64url', label: 'B64Url' },
  { value: 'url', label: 'URL' },
  { value: 'unicode', label: 'Uni' },
] as const;

type Encoding = typeof ENCODINGS[number]['value'];
type Mode = 'decode' | 'encode';

function detectEncoding(text: string): Encoding | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Unicode escape sequences: \u0048\u0065\u006c\u006c\u006f
  if (/\\u[0-9a-fA-F]{4}/.test(trimmed)) {
    return 'unicode';
  }

  // URL encoded: %XX patterns
  if (/%[0-9a-fA-F]{2}/.test(trimmed)) {
    return 'url';
  }

  // Base64URL: [A-Za-z0-9\-_=]
  if (/^[A-Za-z0-9\-_=\s]+$/.test(trimmed) && trimmed.length > 8) {
    return 'base64url';
  }

  // Base64: [A-Za-z0-9+/=]
  if (/^[A-Za-z0-9+/=\s]+$/.test(trimmed) && trimmed.length > 8) {
    return 'base64';
  }

  return null;
}

export function DecoderTool() {
  const { lang, theme } = useStore();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [encoding, setEncoding] = useState<Encoding>('base64');
  const [mode, setMode] = useState<Mode>('decode');
  const [realTime, setRealTime] = useState(true);
  const [copied, setCopied] = useState(false);
  const [detected, setDetected] = useState<Encoding | null>(null);
  const [processTime, setProcessTime] = useState(0);
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
      setDetected(null);
      setProcessTime(0);
      return;
    }

    setError(null);
    const start = performance.now();

    try {
      let result: string;
      if (mode === 'decode') {
        result = await getAdapter().decode(input, encoding);
      } else {
        result = await getAdapter().encode(input, encoding);
      }
      setOutput(result);
      setProcessTime(performance.now() - start);
    } catch (e: any) {
      setError(e.toString().replace(/^Error:\s*/, ''));
      setOutput('');
      setProcessTime(0);
    }
  }, [input, encoding, mode]);

  // Auto-detect encoding on input change
  useEffect(() => {
    if (mode === 'decode' && input.trim()) {
      const detectedEnc = detectEncoding(input);
      if (detectedEnc && detectedEnc !== encoding) {
        setDetected(detectedEnc);
      } else {
        setDetected(null);
      }
    } else {
      setDetected(null);
    }
  }, [input, mode, encoding]);

  // Real-time processing with debounce (300ms)
  useEffect(() => {
    if (!realTime) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => process(), 300);
    return () => clearTimeout(debounceRef.current);
  }, [input, encoding, mode, realTime, process]);

  const handleCopy = () => copy(output);
  const handleClear = () => {
    setInput('');
    setOutput('');
    setError(null);
    setDetected(null);
    setProcessTime(0);
  };

  // Stats calculation
  const inputSize = new Blob([input]).size;
  const outputSize = new Blob([output]).size;
  const isOutputJson = output.trim().startsWith('{') || output.trim().startsWith('[');

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Options bar */}
      <div className="flex items-center gap-4 flex-wrap px-4 py-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        {/* Mode selector */}
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            onClick={() => setMode('decode')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 ${
              mode === 'decode'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
            }`}
          >
            <Unlock className="w-3.5 h-3.5" />
            Decode
          </button>
          <button
            onClick={() => setMode('encode')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 ${
              mode === 'encode'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Encode
          </button>
        </div>

        {/* Encoding selector */}
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {ENCODINGS.map((enc) => (
            <button
              key={enc.value}
              onClick={() => setEncoding(enc.value)}
              className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                encoding === enc.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              {enc.label}
            </button>
          ))}
        </div>

        {/* Real-time toggle */}
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

        {/* Process button (only when real-time is off) */}
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

      {/* Auto-detect badge */}
      {detected && mode === 'decode' && (
        <button
          onClick={() => {
            setEncoding(detected);
            setDetected(null);
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-medium border border-blue-200/70 dark:border-blue-800/60 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {lang === 'zh'
            ? `检测到: ${ENCODINGS.find((e) => e.value === detected)?.label} · 点击自动选择`
            : `Detected: ${ENCODINGS.find((e) => e.value === detected)?.label} · Click to select`}
        </button>
      )}

      {/* Stats panel (shown when there's output) */}
      {output && !error && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-900/20 dark:to-emerald-900/20 text-xs font-medium border border-blue-100/70 dark:border-blue-800/40">
          <span className={`flex items-center gap-1 ${mode === 'decode' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
            {mode === 'decode' ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            {mode === 'decode' ? 'Decoded' : 'Encoded'}
          </span>
          <span className="text-gray-500">·</span>
          <span className="text-gray-600 dark:text-gray-300">
            {mode === 'decode'
              ? `${ENCODINGS.find((e) => e.value === encoding)?.label} → Text`
              : `Text → ${ENCODINGS.find((e) => e.value === encoding)?.label}`}
          </span>
          <span className="text-gray-500">|</span>
          <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
            📥 {inputSize} bytes → 📤 {outputSize} bytes
          </span>
          <span className="text-gray-500">|</span>
          <span className="flex items-center gap-1 text-gray-500">
            ⏱️ {processTime.toFixed(1)}ms
          </span>
        </div>
      )}

      {/* Input/Output panels */}
      <div className="flex-1 grid grid-cols-2 gap-3 min-h-0">
        {/* Input panel */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-gray-500">{t(lang, 'input')}</label>
            <span className="text-xs text-gray-400">{inputSize} bytes</span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 code-font resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
            spellCheck={false}
            placeholder={
              mode === 'decode'
                ? lang === 'zh' ? '粘贴 Base64/URL/Unicode 编码的文本...' : 'Paste Base64/URL/Unicode encoded text...'
                : lang === 'zh' ? '粘贴要编码的纯文本或 JSON...' : 'Paste plain text or JSON to encode...'
            }
          />
        </div>

        {/* Output panel */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-gray-500">{t(lang, 'output')}</label>
            {output && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{outputSize} bytes</span>
                <button onClick={handleCopy} className="text-xs flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors">
                  {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  {copied ? t(lang, 'copied') : t(lang, 'copy')}
                </button>
                <button onClick={() => downloadText(mode === 'decode' ? 'decoded.txt' : 'encoded.txt', output)} className="text-xs flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors">
                  <Download className="w-3 h-3" />
                </button>
                <button onClick={handleClear} className="text-xs flex items-center gap-1 text-gray-500 hover:text-red-500 transition-colors">
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
          ) : isOutputJson ? (
            <JsonCodeEditor
              value={output}
              readOnly
              isDark={isDark}
              placeholder={lang === 'zh' ? '解码结果将显示在这里...' : 'Decoded output will appear here...'}
            />
          ) : (
            <textarea
              value={output}
              readOnly
              className="flex-1 w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 code-font resize-none focus:outline-none"
              placeholder={
                mode === 'decode'
                  ? lang === 'zh' ? '解码结果将显示在这里...' : 'Decoded output will appear here...'
                  : lang === 'zh' ? '编码结果将显示在这里...' : 'Encoded output will appear here...'
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
