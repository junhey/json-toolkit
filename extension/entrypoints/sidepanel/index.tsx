import { useState, useEffect, useCallback } from 'react';
import {
  initWasm,
  formatJson,
  minifyJson,
  sortJson,
  decodeJson,
  encodeJson,
  jsonpathQuery,
  buildTree,
  jsonToTable,
  diffJson,
  jsonToCsv,
} from '@/utils/wasm';

type ToolId = 'format' | 'minify' | 'sort' | 'codec' | 'jsonpath' | 'tree' | 'table' | 'diff' | 'csv';

interface ToolMeta {
  id: ToolId;
  label: string;
}

const tools: ToolMeta[] = [
  { id: 'format', label: '格式化' },
  { id: 'minify', label: '压缩' },
  { id: 'sort', label: '排序' },
  { id: 'codec', label: '编解码' },
  { id: 'jsonpath', label: 'JSONPath' },
  { id: 'tree', label: '树形' },
  { id: 'table', label: '表格' },
  { id: 'diff', label: '对比' },
  { id: 'csv', label: 'CSV' },
];

const ENCODE_OPTS = [
  ['unicode', 'Unicode'],
  ['url', 'URL'],
  ['utf16', 'UTF16'],
  ['base64', 'Base64'],
  ['md5', 'MD5'],
  ['hex', 'Hex'],
  ['sha1', 'SHA1'],
  ['html', 'HTML'],
  ['html_deep', 'HTML深度'],
  ['html_to_js', 'HTML→JS'],
  ['gzip', 'Gzip'],
  ['escape', '转义'],
] as const;

const DECODE_OPTS = [
  ['unicode', 'Unicode'],
  ['url', 'URL'],
  ['utf16', 'UTF16'],
  ['base64', 'Base64'],
  ['hex_ascii', 'Hex/ASCII'],
  ['proto_hex', 'Proto Hex'],
  ['html_entity', 'HTML实体'],
  ['url_params', 'URL参数'],
  ['jwt', 'JWT'],
  ['cookie', 'Cookie'],
  ['gzip', 'Gzip'],
  ['escape', '去转义'],
] as const;

const sampleJson = `{
  "name": "JSON Toolkit",
  "version": "0.2.0",
  "features": ["format", "minify", "codec", "query"]
}`;

export default function SidePanel() {
  const [ready, setReady] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolId>('format');
  const [input, setInput] = useState(sampleJson);
  const [input2, setInput2] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [path, setPath] = useState('$.name');
  const [codecMode, setCodecMode] = useState<'encode' | 'decode'>('decode');
  const [encoding, setEncoding] = useState('base64');
  const [pasteAuto, setPasteAuto] = useState(true);
  const [copied, setCopied] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    initWasm()
      .then(() => setReady(true))
      .catch((e) => setError(`WASM init failed: ${e.message}`));
  }, []);

  const run = useCallback(
    async (override?: string) => {
      const text = override ?? input;
      if (!text.trim() && activeTool !== 'diff') return;
      setError('');
      setOutput('');

      try {
        let result = '';
        switch (activeTool) {
          case 'format':
            result = await formatJson(text, 2, false);
            break;
          case 'minify':
            result = await minifyJson(text);
            break;
          case 'sort':
            result = await sortJson(text, 'key', 'asc');
            break;
          case 'codec':
            result =
              codecMode === 'encode'
                ? await encodeJson(text, encoding)
                : await decodeJson(text, encoding);
            break;
          case 'jsonpath':
            result = await jsonpathQuery(text, path);
            break;
          case 'tree': {
            const tree = await buildTree(text, 100);
            result = JSON.stringify(tree, null, 2);
            break;
          }
          case 'table': {
            const table = await jsonToTable(text);
            result = JSON.stringify(table, null, 2);
            break;
          }
          case 'diff': {
            const diffs = await diffJson(text, input2 || '{}');
            result = diffs
              .map(
                (d: any) =>
                  `${d.type}: ${d.path} — ${d.left ?? '(none)'} → ${d.right ?? '(none)'}`
              )
              .join('\n');
            break;
          }
          case 'csv':
            result = await jsonToCsv(text, ',');
            break;
        }
        setOutput(result);
      } catch (e: any) {
        setError(e.message || String(e));
      }
    },
    [input, input2, activeTool, path, encoding, codecMode]
  );

  const onPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!pasteAuto || activeTool !== 'format') return;
    const text = e.clipboardData.getData('text');
    if (!text.trim()) return;
    e.preventDefault();
    setInput(text);
    await run(text);
  };

  const copy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const opts = codecMode === 'encode' ? ENCODE_OPTS : DECODE_OPTS;

  if (!ready) {
    return (
      <div style={{ ...shell(dark), placeItems: 'center', display: 'grid' }}>
        <div style={{ color: dark ? '#94a3b8' : '#64748b' }}>加载 WASM 引擎…</div>
      </div>
    );
  }

  return (
    <div style={shell(dark)}>
      <header
        style={{
          padding: '10px 14px',
          background: dark
            ? 'linear-gradient(135deg, #0ea5e9, #0284c7)'
            : 'linear-gradient(135deg, #0284c7, #0369a1)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <strong style={{ letterSpacing: '-0.02em' }}>JSON Toolkit</strong>
        <span style={{ opacity: 0.8, fontSize: 12 }}>v0.2.0</span>
        <button
          onClick={() => setDark((v) => !v)}
          style={ghostBtn}
          title="Toggle theme"
        >
          {dark ? '浅色' : '深色'}
        </button>
      </header>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          padding: 10,
          borderBottom: `1px solid ${dark ? '#1e293b' : '#e2e8f0'}`,
          background: dark ? '#0f172a' : '#f8fafc',
        }}
      >
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            style={{
              padding: '5px 10px',
              border: `1px solid ${
                activeTool === tool.id ? '#0284c7' : dark ? '#334155' : '#e2e8f0'
              }`,
              borderRadius: 8,
              background: activeTool === tool.id ? '#0284c7' : dark ? '#1e293b' : '#fff',
              color: activeTool === tool.id ? '#fff' : dark ? '#e2e8f0' : '#334155',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {tool.label}
          </button>
        ))}
      </div>

      <div
        style={{
          padding: '8px 10px',
          borderBottom: `1px solid ${dark ? '#1e293b' : '#f1f5f9'}`,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexWrap: 'wrap',
          background: dark ? '#0b1220' : '#fff',
        }}
      >
        {activeTool === 'format' && (
          <label style={labelStyle(dark)}>
            <input
              type="checkbox"
              checked={pasteAuto}
              onChange={(e) => setPasteAuto(e.target.checked)}
            />
            粘贴自动美化
          </label>
        )}
        {activeTool === 'jsonpath' && (
          <input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="$.store.book[*].title"
            style={field(dark)}
          />
        )}
        {activeTool === 'codec' && (
          <>
            <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: `1px solid ${dark ? '#334155' : '#e2e8f0'}` }}>
              <button
                onClick={() => {
                  setCodecMode('encode');
                  setEncoding('unicode');
                }}
                style={modeBtn(codecMode === 'encode', dark)}
              >
                加密
              </button>
              <button
                onClick={() => {
                  setCodecMode('decode');
                  setEncoding('unicode');
                }}
                style={modeBtn(codecMode === 'decode', dark)}
              >
                解密
              </button>
            </div>
            <select
              value={encoding}
              onChange={(e) => setEncoding(e.target.value)}
              style={field(dark)}
            >
              {opts.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </>
        )}
        <button onClick={() => run()} style={primaryBtn}>
          执行
        </button>
        {output && (
          <button onClick={copy} style={secondaryBtn(dark)}>
            {copied ? '已复制' : '复制'}
          </button>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeTool === 'diff' ? (
          <div style={{ display: 'flex', gap: 1, flex: 1 }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="JSON A"
              style={area(dark, true)}
            />
            <textarea
              value={input2}
              onChange={(e) => setInput2(e.target.value)}
              placeholder="JSON B"
              style={area(dark, true)}
            />
          </div>
        ) : (
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPaste={onPaste}
            placeholder='粘贴 JSON…'
            style={area(dark, true)}
          />
        )}
        {error && (
          <div style={{ padding: 8, background: '#fef2f2', color: '#dc2626', fontSize: 12 }}>
            {error}
          </div>
        )}
        {output && (
          <textarea
            value={output}
            readOnly
            style={{
              ...area(dark, false),
              borderTop: '2px solid #0284c7',
              background: dark ? '#052e1f' : '#f0fdf4',
              color: dark ? '#86efac' : '#166534',
            }}
          />
        )}
      </div>
    </div>
  );
}

const shell = (dark: boolean): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  fontFamily: '"DM Sans", "Segoe UI", sans-serif',
  background: dark ? '#020617' : '#fff',
  color: dark ? '#e2e8f0' : '#0f172a',
});

const ghostBtn: React.CSSProperties = {
  marginLeft: 'auto',
  background: 'rgba(255,255,255,0.15)',
  border: 'none',
  color: '#fff',
  borderRadius: 6,
  padding: '4px 8px',
  cursor: 'pointer',
  fontSize: 12,
};

const primaryBtn: React.CSSProperties = {
  marginLeft: 'auto',
  padding: '6px 14px',
  background: '#0284c7',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 12,
};

const secondaryBtn = (dark: boolean): React.CSSProperties => ({
  padding: '6px 12px',
  background: dark ? '#1e293b' : '#e2e8f0',
  color: dark ? '#e2e8f0' : '#334155',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 12,
});

const field = (dark: boolean): React.CSSProperties => ({
  padding: '5px 8px',
  border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
  borderRadius: 8,
  fontSize: 12,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  flex: 1,
  minWidth: 120,
  background: dark ? '#1e293b' : '#fff',
  color: dark ? '#e2e8f0' : '#0f172a',
});

const area = (dark: boolean, editable: boolean): React.CSSProperties => ({
  padding: 12,
  border: 'none',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 12,
  lineHeight: 1.55,
  resize: 'none',
  outline: 'none',
  flex: 1,
  background: editable ? (dark ? '#0b1220' : '#fafafa') : undefined,
  color: dark ? '#e2e8f0' : '#0f172a',
});

const labelStyle = (dark: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 12,
  color: dark ? '#cbd5e1' : '#475569',
});

const modeBtn = (active: boolean, dark: boolean): React.CSSProperties => ({
  padding: '5px 10px',
  border: 'none',
  background: active ? '#0284c7' : dark ? '#1e293b' : '#fff',
  color: active ? '#fff' : dark ? '#cbd5e1' : '#475569',
  cursor: 'pointer',
  fontSize: 12,
});
