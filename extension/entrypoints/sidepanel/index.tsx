import { useState, useEffect, useCallback } from 'react';
import { initWasm, formatJson, minifyJson, sortJson, decodeJson, jsonpathQuery, buildTree, jsonToTable, diffJson, jsonToCsv } from '@/utils/wasm';

type ToolId = 'format' | 'minify' | 'sort' | 'decode' | 'jsonpath' | 'tree' | 'table' | 'diff' | 'csv';

interface ToolMeta {
  id: ToolId;
  label: string;
  icon: string;
}

const tools: ToolMeta[] = [
  { id: 'format', label: 'Format', icon: '{}' },
  { id: 'minify', label: 'Minify', icon: '─' },
  { id: 'sort', label: 'Sort', icon: '↑↓' },
  { id: 'decode', label: 'Decode', icon: '🔓' },
  { id: 'jsonpath', label: 'JSONPath', icon: '$' },
  { id: 'tree', label: 'Tree', icon: '🌳' },
  { id: 'table', label: 'Table', icon: '📊' },
  { id: 'diff', label: 'Diff', icon: '⇄' },
  { id: 'csv', label: 'CSV', icon: '📄' },
];

const sampleJson = `{
  "name": "JSON Toolkit",
  "version": "0.1.0",
  "features": ["format", "minify", "sort", "query"],
  "author": {
    "name": "junhey",
    "url": "https://github.com/junhey"
  }
}`;

export default function SidePanel() {
  const [ready, setReady] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolId>('format');
  const [input, setInput] = useState(sampleJson);
  const [input2, setInput2] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [path, setPath] = useState('$.name');
  const [encoding, setEncoding] = useState('base64');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    initWasm()
      .then(() => setReady(true))
      .catch((e) => setError(`WASM init failed: ${e.message}`));
  }, []);

  const run = useCallback(async () => {
    if (!input.trim()) return;
    setError('');
    setOutput('');

    try {
      let result = '';
      switch (activeTool) {
        case 'format':
          result = await formatJson(input, 2, false);
          break;
        case 'minify':
          result = await minifyJson(input);
          break;
        case 'sort':
          result = await sortJson(input, 'key', 'asc');
          break;
        case 'decode':
          result = await decodeJson(input, encoding);
          break;
        case 'jsonpath':
          result = await jsonpathQuery(input, path);
          break;
        case 'tree': {
          const tree = await buildTree(input, 100);
          result = JSON.stringify(tree, null, 2);
          break;
        }
        case 'table': {
          const table = await jsonToTable(input);
          result = JSON.stringify(table, null, 2);
          break;
        }
        case 'diff': {
          const diffs = await diffJson(input, input2 || '{}');
          result = diffs.map((d: any) => `${d.type}: ${d.path} — ${d.left ?? '(none)'} → ${d.right ?? '(none)'}`).join('\n');
          break;
        }
        case 'csv':
          result = await jsonToCsv(input, ',');
          break;
      }
      setOutput(result);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  }, [input, input2, activeTool, path, encoding]);

  const copy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!ready) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading WASM engine...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: '-apple-system, sans-serif', background: '#fff' }}>
      {/* Header */}
      <div style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 20 }}>⚡</span>
        <strong>JSON Toolkit — Side Panel</strong>
      </div>

      {/* Tool bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: 8, borderBottom: '1px solid #e5e7eb' }}>
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            style={{
              padding: '4px 10px',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              background: activeTool === tool.id ? '#3b82f6' : '#fff',
              color: activeTool === tool.id ? '#fff' : '#374151',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            {tool.icon} {tool.label}
          </button>
        ))}
      </div>

      {/* Options */}
      <div style={{ padding: 8, borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 8, alignItems: 'center' }}>
        {activeTool === 'jsonpath' && (
          <input value={path} onChange={(e) => setPath(e.target.value)} placeholder="$.store.book[*].title" style={inputStyle} />
        )}
        {activeTool === 'decode' && (
          <select value={encoding} onChange={(e) => setEncoding(e.target.value)} style={inputStyle}>
            <option value="base64">Base64</option>
            <option value="base64url">Base64 URL</option>
            <option value="url">URL Encode</option>
            <option value="unicode">Unicode</option>
          </select>
        )}
        <button onClick={run} style={{ marginLeft: 'auto', padding: '6px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>
          ▶ Run
        </button>
        {output && (
          <button onClick={copy} style={{ padding: '6px 12px', background: '#e5e7eb', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        )}
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeTool === 'diff' && (
          <div style={{ display: 'flex', gap: 1, flex: 1 }}>
            <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="JSON A" style={{ ...textAreaStyle, flex: 1 }} />
            <textarea value={input2} onChange={(e) => setInput2(e.target.value)} placeholder="JSON B" style={{ ...textAreaStyle, flex: 1 }} />
          </div>
        )}
        {activeTool !== 'diff' && (
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='{"key": "value"}'
            style={{ ...textAreaStyle, flex: 1, background: '#fafafa' }}
          />
        )}
        {error && <div style={{ padding: 8, background: '#fef2f2', color: '#dc2626', fontSize: 12 }}>{error}</div>}
        {output && (
          <textarea value={output} readOnly style={{ ...textAreaStyle, flex: 1, background: '#f0fdf4', borderTop: '2px solid #3b82f6' }} />
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '4px 8px',
  border: '1px solid #e5e7eb',
  borderRadius: 4,
  fontSize: 12,
  fontFamily: 'monospace',
  flex: 1,
};

const textAreaStyle: React.CSSProperties = {
  padding: 12,
  border: 'none',
  fontFamily: 'monospace',
  fontSize: 12,
  resize: 'none',
  outline: 'none',
};
