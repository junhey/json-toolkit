import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Copy,
  Check,
  Download,
  Trash2,
  Sparkles,
  AlertCircle,
  Minimize2,
  AlignLeft,
  FoldVertical,
  UnfoldVertical,
  Search,
} from 'lucide-react';
import { useStore } from '../store';
import { t } from '../lib/i18n';
import { getAdapter } from '../lib/adapter';
import { downloadText, useClipboard } from '../components/ToolShell';
import { JsonCodeEditor, type JsonCodeEditorHandle } from '../components/JsonCodeEditor';
import { useIsDark } from '../lib/useIsDark';

const SAMPLE_JSON = `{
  "name": "JSON Toolkit",
  "born": "2024",
  "message": "A powerful JSON editor for everyday work",
  "enabled": true,
  "owner": null,
  "philosophy": {
    "belief": "Format first, then edit",
    "promise": "Keep large documents scrollable and highlighted",
    "wish": "Fold, copy path, and mutate nodes in place"
  },
  "milestones": [
    { "year": 2024, "event": "First release" },
    { "year": 2025, "event": "Multi-platform toolkit" },
    { "year": 2026, "event": "In-place JSON editor" }
  ],
  "features": ["format", "fold", "copy path", "add child", "delete node"]
}`;

function tryParseNestedJsonStrings(value: unknown): unknown {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        return tryParseNestedJsonStrings(JSON.parse(trimmed));
      } catch {
        return value;
      }
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(tryParseNestedJsonStrings);
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = tryParseNestedJsonStrings(v);
    }
    return out;
  }
  return value;
}

export function FormatterTool() {
  const { lang } = useStore();
  const isDark = useIsDark();
  const { copied, copy } = useClipboard();
  const editorRef = useRef<JsonCodeEditorHandle>(null);
  const [doc, setDoc] = useState(SAMPLE_JSON);
  const [error, setError] = useState<string | null>(null);
  const [indent, setIndent] = useState(2);
  const [sortKeys, setSortKeys] = useState(false);
  const [autoDecode, setAutoDecode] = useState(true);
  const [pasteAutoFormat, setPasteAutoFormat] = useState(true);
  const [nestedParse, setNestedParse] = useState(false);
  const [decodedFrom, setDecodedFrom] = useState<string | null>(null);
  const skipNextDebounce = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

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

  const beautify = useCallback(
    async (text: string, opts?: { fromPaste?: boolean }) => {
      if (!text.trim()) {
        setError(null);
        setDecodedFrom(null);
        return '';
      }

      let actual = text;
      setDecodedFrom(null);

      if (autoDecode && !text.trim().startsWith('{') && !text.trim().startsWith('[')) {
        const decoded = await tryAutoDecode(text);
        if (decoded) {
          actual = decoded.decoded;
          setDecodedFrom(decoded.type);
        }
      }

      try {
        let toFormat = actual;
        if (nestedParse) {
          try {
            const parsed = JSON.parse(actual);
            toFormat = JSON.stringify(tryParseNestedJsonStrings(parsed));
          } catch {
            // keep original
          }
        }
        const result = await getAdapter().format(toFormat, indent, sortKeys);
        setError(null);
        return result;
      } catch (e: any) {
        const msg = e.toString().replace(/^Error:\s*/, '');
        setError(msg);
        return opts?.fromPaste ? text : actual;
      }
    },
    [autoDecode, indent, nestedParse, sortKeys, tryAutoDecode]
  );

  const process = useCallback(
    async (override?: string) => {
      const source = override ?? doc;
      const result = await beautify(source);
      skipNextDebounce.current = true;
      setDoc(result);
    },
    [beautify, doc]
  );

  useEffect(() => {
    if (!doc.trim()) return;
    let cancelled = false;
    (async () => {
      try {
        JSON.parse(doc);
        const result = await getAdapter().format(doc, indent, sortKeys);
        if (cancelled || result === doc) return;
        skipNextDebounce.current = true;
        setDoc(result);
      } catch {
        // keep current document
      }
    })();
    return () => {
      cancelled = true;
    };
    // Re-pretty when indent/sort change, not on every doc keystroke
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indent, sortKeys]);

  useEffect(() => {
    if (!doc.trim()) return;
    if (skipNextDebounce.current) {
      skipNextDebounce.current = false;
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        JSON.parse(doc);
        setError(null);
      } catch (e: any) {
        setError(String(e?.message || e));
      }
    }, 280);
    return () => clearTimeout(debounceRef.current);
  }, [doc]);

  const handlePasteText = useCallback(
    async (text: string) => {
      if (pasteAutoFormat) {
        const result = await beautify(text, { fromPaste: true });
        skipNextDebounce.current = true;
        setDoc(result);
        return;
      }
      skipNextDebounce.current = true;
      setDoc(text);
    },
    [beautify, pasteAutoFormat]
  );

  const runMinify = async () => {
    if (!doc.trim()) return;
    try {
      const result = await getAdapter().minify(doc);
      skipNextDebounce.current = true;
      setDoc(result);
      setError(null);
    } catch (e: any) {
      setError(e.toString().replace(/^Error:\s*/, ''));
    }
  };

  const applyQuickCodec = async (mode: 'encode' | 'decode', encoding: string) => {
    if (!doc.trim()) return;
    try {
      const result =
        mode === 'encode'
          ? await getAdapter().encode(doc, encoding)
          : await getAdapter().decode(doc, encoding);
      skipNextDebounce.current = true;
      if (mode === 'decode' || encoding === 'unicode') {
        const formatted = await beautify(result, { fromPaste: true });
        setDoc(formatted);
      } else {
        setDoc(result);
      }
      setError(null);
    } catch (e: any) {
      setError(e.toString().replace(/^Error:\s*/, ''));
    }
  };

  const loadSample = () => {
    skipNextDebounce.current = true;
    setDoc(SAMPLE_JSON);
    setError(null);
    setDecodedFrom(null);
  };

  const clearAll = () => {
    setDoc('');
    setError(null);
    setDecodedFrom(null);
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

  const Toggle = ({
    checked,
    onChange,
    label,
  }: {
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
  }) => (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-1.5 text-sm select-none">
      <span
        className={`relative rounded-full transition-colors ${checked ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
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
          {lang === 'zh' ? '格式化' : 'Format'}
        </button>
        <button
          type="button"
          onClick={runMinify}
          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium flex items-center gap-1.5 border border-blue-200/70 dark:border-blue-800"
        >
          <Minimize2 className="w-3.5 h-3.5" />
          {lang === 'zh' ? '压缩' : 'Minify'}
        </button>

        <button
          type="button"
          onClick={() => editorRef.current?.foldAll()}
          className="px-2 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1"
          title={t(lang, 'collapseAll')}
        >
          <FoldVertical className="w-3.5 h-3.5" />
          {lang === 'zh' ? '折叠' : 'Fold'}
        </button>
        <button
          type="button"
          onClick={() => editorRef.current?.unfoldAll()}
          className="px-2 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1"
          title={t(lang, 'expandAll')}
        >
          <UnfoldVertical className="w-3.5 h-3.5" />
          {lang === 'zh' ? '展开' : 'Unfold'}
        </button>
        <button
          type="button"
          onClick={() => editorRef.current?.openSearch()}
          className="px-2 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1"
        >
          <Search className="w-3.5 h-3.5" />
          {lang === 'zh' ? '查找' : 'Find'}
        </button>

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
        <Toggle checked={nestedParse} onChange={setNestedParse} label={lang === 'zh' ? '嵌套解析' : 'Nested'} />

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

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => copy(doc)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            title={t(lang, 'copy')}
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => downloadText('formatted.json', doc)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            title={t(lang, 'download')}
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            title={t(lang, 'clear')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {decodedFrom && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs border border-amber-200/70 dark:border-amber-800/60 flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5" />
          {lang === 'zh'
            ? `检测到 ${decodedFrom} 编码，已自动解码并美化`
            : `Detected ${decodedFrom}, auto-decoded and beautified`}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs border border-red-200/70 dark:border-red-800/60 flex-shrink-0">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span className="break-all">{error}</span>
        </div>
      )}

      <JsonCodeEditor
        ref={editorRef}
        value={doc}
        onChange={setDoc}
        onPasteText={handlePasteText}
        isDark={isDark}
        powerEdit
        indent={indent}
        placeholder={
          lang === 'zh'
            ? '粘贴 JSON，将自动美化并高亮。悬停行末可复制路径、添加或删除节点。'
            : 'Paste JSON to beautify. Hover a line to copy path, add or delete nodes.'
        }
      />
    </div>
  );
}
