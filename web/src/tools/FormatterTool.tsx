import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Copy,
  Check,
  Download,
  Trash2,
  Sparkles,
  AlertCircle,
  Columns2,
  Rows2,
  Minimize2,
  AlignLeft,
  ArrowLeftRight,
} from 'lucide-react';
import { useStore } from '../store';
import { t } from '../lib/i18n';
import { getAdapter } from '../lib/adapter';
import { downloadText, useClipboard } from '../components/ToolShell';
import { JsonCodeEditor } from '../components/JsonCodeEditor';
import { JsonHighlightView } from '../components/JsonHighlightView';
import { useIsDark } from '../lib/useIsDark';
import {
  collectCollapsiblePaths,
  parseJsonForHighlight,
  stringifyCompact,
  type HighlightNode,
} from '../lib/jsonHighlight';

const SAMPLE_JSON = `{
  "app": "JSON Toolkit",
  "version": 2,
  "enabled": true,
  "owner": null,
  "id": 12345678901234567890,
  "home": "https://www.json.cn/",
  "features": ["format", "minify", "jsonpath", "diff"],
  "nested": "{\\"ok\\":true,\\"count\\":3}",
  "meta": {
    "createdAt": "2026-09-09T03:00:00Z",
    "tags": ["dev", "json"]
  }
}`;

type LayoutMode = 'horizontal' | 'vertical';

export function FormatterTool() {
  const { lang } = useStore();
  const isDark = useIsDark();
  const { copied, copy } = useClipboard();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [tree, setTree] = useState<HighlightNode | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [compactView, setCompactView] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [indent, setIndent] = useState(2);
  const [sortKeys, setSortKeys] = useState(false);
  const [autoDecode, setAutoDecode] = useState(true);
  const [pasteAutoFormat, setPasteAutoFormat] = useState(true);
  const [nestedParse, setNestedParse] = useState(false);
  const [realTime, setRealTime] = useState(true);
  const [layout, setLayout] = useState<LayoutMode>('horizontal');
  const [decodedFrom, setDecodedFrom] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const skipNextDebounce = useRef(false);

  const tryAutoDecode = useCallback(async (text: string): Promise<{ decoded: string; type: string } | null> => {
    const trimmed = text.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return null;

    const tryAdapter = async (encoding: string, label: string) => {
      try {
        const decoded = await getAdapter().decode(trimmed, encoding);
        const t = decoded.trim();
        if (t.startsWith('{') || t.startsWith('[')) {
          return { decoded, type: label };
        }
      } catch {}
      return null;
    };

    return (
      (await tryAdapter('base64', 'Base64')) ||
      (await tryAdapter('url', 'URL')) ||
      (await tryAdapter('unicode', 'Unicode')) ||
      (await tryAdapter('gzip', 'Gzip')) ||
      null
    );
  }, []);

  const process = useCallback(
    async (overrideInput?: string) => {
      const text = overrideInput ?? input;
      if (!text.trim()) {
        setOutput('');
        setTree(null);
        setError(null);
        setDecodedFrom(null);
        setCompactView(false);
        return;
      }

      setError(null);
      let actualInput = text;
      setDecodedFrom(null);

      if (autoDecode && !text.trim().startsWith('{') && !text.trim().startsWith('[')) {
        const decoded = await tryAutoDecode(text);
        if (decoded) {
          actualInput = decoded.decoded;
          setDecodedFrom(decoded.type);
        }
      }

      try {
        const result = parseJsonForHighlight(actualInput, { indent, sortKeys, nestedParse });
        if (!result.ok) {
          setError(
            lang === 'zh'
              ? `${result.error.message}（第 ${result.error.line} 行，第 ${result.error.column} 列）`
              : `${result.error.message} (line ${result.error.line}, column ${result.error.column})`
          );
          setOutput('');
          setTree(null);
          return;
        }
        setOutput(result.text);
        setTree(result.tree);
        setCollapsed(new Set());
        setCompactView(false);
        setError(null);
      } catch (e: any) {
        setError(e.toString().replace(/^Error:\s*/, ''));
        setOutput('');
        setTree(null);
      }
    },
    [input, indent, sortKeys, autoDecode, nestedParse, tryAutoDecode, lang]
  );

  useEffect(() => {
    if (!realTime || !input.trim()) return;
    if (skipNextDebounce.current) {
      skipNextDebounce.current = false;
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => process(), 280);
    return () => clearTimeout(debounceRef.current);
  }, [input, indent, sortKeys, autoDecode, nestedParse, realTime, process]);

  const handlePasteText = useCallback(
    async (text: string) => {
      setInput(text);
      if (pasteAutoFormat) {
        skipNextDebounce.current = true;
        await process(text);
      }
    },
    [pasteAutoFormat, process]
  );

  const runMinify = () => {
    const src = output || input;
    if (!src.trim()) return;
    const result = parseJsonForHighlight(src, { indent, sortKeys, nestedParse });
    if (!result.ok) {
      setError(
        lang === 'zh'
          ? `${result.error.message}（第 ${result.error.line} 行，第 ${result.error.column} 列）`
          : `${result.error.message} (line ${result.error.line}, column ${result.error.column})`
      );
      return;
    }
    setTree(result.tree);
    setOutput(stringifyCompact(result.tree));
    setCompactView(true);
    setError(null);
  };

  const togglePath = (path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const applyQuickCodec = async (mode: 'encode' | 'decode', encoding: string) => {
    const src = input.trim() ? input : output;
    if (!src.trim()) return;
    try {
      const result =
        mode === 'encode'
          ? await getAdapter().encode(src, encoding)
          : await getAdapter().decode(src, encoding);
      setInput(result);
      skipNextDebounce.current = true;
      if (mode === 'decode' || encoding === 'unicode') {
        await process(result);
      } else {
        setOutput(result);
        setTree(null);
        setCompactView(false);
      }
      setError(null);
    } catch (e: any) {
      setError(e.toString().replace(/^Error:\s*/, ''));
    }
  };

  const swapPanes = () => {
    if (!output) return;
    setInput(output);
    skipNextDebounce.current = true;
    process(output);
  };

  const copyOutput = () => copy(output);
  const clearAll = () => {
    setInput('');
    setOutput('');
    setTree(null);
    setCollapsed(new Set());
    setCompactView(false);
    setError(null);
    setDecodedFrom(null);
  };

  const loadSample = () => {
    skipNextDebounce.current = true;
    setInput(SAMPLE_JSON);
    process(SAMPLE_JSON);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        process();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [process]);

  const inputLines = input ? input.split('\n').length : 0;
  const outputLines = output ? output.split('\n').length : 0;
  const outputSize = new Blob([output]).size;

  const Toggle = ({
    checked,
    onChange,
    label,
  }: {
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
  }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-1.5 text-sm select-none"
      title={label}
    >
      <span
        className={`relative w-8 h-4.5 rounded-full transition-colors ${
          checked ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
        }`}
        style={{ height: 18, width: 32 }}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-3.5' : ''
          }`}
        />
      </span>
      <span className="text-gray-700 dark:text-gray-200 whitespace-nowrap">{label}</span>
    </button>
  );

  return (
    <div className="tool-page">
      <div className="tool-toolbar">
        <button
          type="button"
          onClick={() => process()}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-1.5"
        >
          <AlignLeft className="w-3.5 h-3.5" />
          {t(lang, 'beautify')}
        </button>
        <button
          type="button"
          onClick={runMinify}
          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium flex items-center gap-1.5 border border-blue-200/70 dark:border-blue-800"
        >
          <Minimize2 className="w-3.5 h-3.5" />
          {lang === 'zh' ? '压缩' : 'Minify'}
        </button>

        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            type="button"
            onClick={() => setLayout('horizontal')}
            className={`px-2.5 py-1.5 text-sm flex items-center gap-1 ${
              layout === 'horizontal'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'
            }`}
            title={lang === 'zh' ? '左右布局' : 'Side by side'}
          >
            <Columns2 className="w-3.5 h-3.5" />
            {lang === 'zh' ? '左右' : 'LR'}
          </button>
          <button
            type="button"
            onClick={() => setLayout('vertical')}
            className={`px-2.5 py-1.5 text-sm flex items-center gap-1 ${
              layout === 'vertical'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'
            }`}
            title={lang === 'zh' ? '上下布局' : 'Stacked'}
          >
            <Rows2 className="w-3.5 h-3.5" />
            {lang === 'zh' ? '上下' : 'TB'}
          </button>
        </div>

        <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 mx-0.5" />

        <label className="text-sm flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
          <span className="text-gray-400">{t(lang, 'indent')}</span>
          <select
            value={indent}
            onChange={(e) => setIndent(Number(e.target.value))}
            className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-sm"
          >
            <option value={2}>2 SP</option>
            <option value={4}>4 SP</option>
            <option value={8}>8 SP</option>
          </select>
        </label>

        <Toggle checked={sortKeys} onChange={setSortKeys} label={lang === 'zh' ? '排序' : 'Sort'} />
        <Toggle checked={autoDecode} onChange={setAutoDecode} label={t(lang, 'autoDecode')} />
        <Toggle
          checked={pasteAutoFormat}
          onChange={setPasteAutoFormat}
          label={lang === 'zh' ? '粘贴美化' : 'Paste format'}
        />
        <Toggle
          checked={nestedParse}
          onChange={setNestedParse}
          label={lang === 'zh' ? '嵌套解析' : 'Nested'}
        />
        <Toggle checked={realTime} onChange={setRealTime} label={t(lang, 'realTime')} />
        <Toggle
          checked={showLineNumbers}
          onChange={setShowLineNumbers}
          label={t(lang, 'lineNumbers')}
        />

        <button
          type="button"
          onClick={() => setCollapsed(new Set())}
          className="text-xs px-2 py-1 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {t(lang, 'expandAll')}
        </button>
        <button
          type="button"
          onClick={() => tree && setCollapsed(new Set(collectCollapsiblePaths(tree)))}
          className="text-xs px-2 py-1 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {t(lang, 'collapseAll')}
        </button>

        <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 mx-0.5" />

        <button
          type="button"
          onClick={() => applyQuickCodec('encode', 'unicode')}
          className="text-xs px-2 py-1 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Uni {lang === 'zh' ? '编码' : 'Enc'}
        </button>
        <button
          type="button"
          onClick={() => applyQuickCodec('decode', 'unicode')}
          className="text-xs px-2 py-1 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Uni {lang === 'zh' ? '解码' : 'Dec'}
        </button>
        <button
          type="button"
          onClick={() => applyQuickCodec('decode', 'url')}
          className="text-xs px-2 py-1 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          URL {lang === 'zh' ? '解码' : 'Dec'}
        </button>

        <button
          type="button"
          onClick={loadSample}
          className="text-xs px-2 py-1 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {t(lang, 'loadSample')}
        </button>
        <button
          type="button"
          onClick={swapPanes}
          className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          title={lang === 'zh' ? '结果写回输入' : 'Use output as input'}
        >
          <ArrowLeftRight className="w-4 h-4" />
        </button>
      </div>

      {decodedFrom && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs border border-amber-200/70 dark:border-amber-800/60">
          <Sparkles className="w-3.5 h-3.5" />
          {lang === 'zh'
            ? `检测到 ${decodedFrom} 编码，已自动解码并美化`
            : `Detected ${decodedFrom}, auto-decoded and beautified`}
        </div>
      )}

      <div className={layout === 'horizontal' ? 'tool-split' : 'tool-split-stacked'}>
        <div className="tool-pane">
          <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
            <label className="text-xs font-medium text-gray-500">
              {lang === 'zh' ? '输入' : 'Input'}
            </label>
            <span className="text-xs text-gray-400">{inputLines} lines</span>
          </div>
          <JsonCodeEditor
            value={input}
            onChange={setInput}
            onPasteText={handlePasteText}
            isDark={isDark}
            placeholder={
              lang === 'zh'
                ? '粘贴 JSON（支持自动美化）/ Base64 / URL 编码内容...'
                : 'Paste JSON (auto-beautify) / Base64 / URL-encoded...'
            }
          />
        </div>

        <div className="tool-pane">
          <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
            <label className="text-xs font-medium text-gray-500">
              {lang === 'zh' ? '解析结果' : 'Result'}
            </label>
            {output && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">
                  {outputLines} lines · {outputSize >= 1024 ? `${(outputSize / 1024).toFixed(1)}KB` : `${outputSize}B`}
                </span>
                <button
                  onClick={copyOutput}
                  className="text-xs flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  {copied ? t(lang, 'copied') : t(lang, 'copy')}
                </button>
                <button
                  onClick={() => downloadText('formatted.json', output)}
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

          {error ? (
            <div className="flex-1 min-h-0 p-3 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm overflow-auto flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="break-all">
                <span className="font-bold">{lang === 'zh' ? '解析错误：' : 'Parse error: '}</span>
                {error.replace(/^解析错误：/, '')}
              </div>
            </div>
          ) : compactView || !tree ? (
            <JsonCodeEditor
              value={output}
              readOnly
              isDark={isDark}
              placeholder={
                lang === 'zh' ? '格式化结果将显示在这里...' : 'Formatted output will appear here...'
              }
            />
          ) : (
            <JsonHighlightView
              tree={tree}
              indent={indent}
              showLineNumbers={showLineNumbers}
              collapsed={collapsed}
              onToggle={togglePath}
              placeholder={
                lang === 'zh' ? '点击「整理」美化并高亮 JSON...' : 'Click Beautify to format and highlight JSON...'
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
