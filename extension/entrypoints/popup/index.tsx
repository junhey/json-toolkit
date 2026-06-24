import { useState, useEffect, useCallback } from 'react';
import { initWasm, formatJson, minifyJson, sortJson, jsonpathQuery } from '@/utils/wasm';

type Tool = 'format' | 'minify' | 'sort' | 'jsonpath';

const tools: { id: Tool; label: string; icon: string }[] = [
  { id: 'format', label: 'Format', icon: '{}' },
  { id: 'minify', label: 'Minify', icon: '─' },
  { id: 'sort', label: 'Sort', icon: '↑↓' },
  { id: 'jsonpath', label: 'Path', icon: '$' },
];

export default function Popup() {
  const [ready, setReady] = useState(false);
  const [activeTool, setActiveTool] = useState<Tool>('format');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [path, setPath] = useState('$.*');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    initWasm()
      .then(() => setReady(true))
      .catch((e) => setError(`WASM init failed: ${e.message}`));

    // Try to get detected JSON from active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_JSON' }, (response) => {
          if (chrome.runtime.lastError) return;
          if (response?.json) {
            setInput(response.json);
          }
        });
      }
    });

    // Load last input from storage
    chrome.storage.local.get('lastInput', (result) => {
      if (result.lastInput && !input) {
        setInput(result.lastInput);
      }
    });
  }, []);

  const run = useCallback(async () => {
    if (!input.trim()) return;
    setError('');
    setOutput('');

    // Save to storage
    chrome.storage.local.set({ lastInput: input });

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
        case 'jsonpath':
          result = await jsonpathQuery(input, path);
          break;
      }
      setOutput(result);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  }, [input, activeTool, path]);

  const copy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!ready) {
    return (
      <div style={{ width: 400, height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
        Loading WASM...
      </div>
    );
  }

  return (
    <div style={{ width: 400, height: 500, display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* Header */}
      <div style={{ padding: '8px 12px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 18 }}>⚡</span>
          <strong style={{ fontSize: 14 }}>JSON Toolkit</strong>
        </div>
      </div>

      {/* Tool tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            style={{
              flex: 1,
              padding: '8px 4px',
              border: 'none',
              background: activeTool === tool.id ? '#eff6ff' : 'transparent',
              color: activeTool === tool.id ? '#2563eb' : '#6b7280',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: activeTool === tool.id ? 600 : 400,
              borderBottom: activeTool === tool.id ? '2px solid #3b82f6' : 'none',
            }}
          >
            <span style={{ marginRight: 4 }}>{tool.icon}</span>
            {tool.label}
          </button>
        ))}
      </div>

      {/* JSONPath input */}
      {activeTool === 'jsonpath' && (
        <input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="$.store.book[*].title"
          style={{ padding: '6px 10px', border: '1px solid #e5e7eb', fontSize: 12, fontFamily: 'monospace' }}
        />
      )}

      {/* Input */}
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder='{"key": "value"}'
        style={{
          flex: 1,
          padding: 8,
          border: 'none',
          borderBottom: '1px solid #e5e7eb',
          fontFamily: 'monospace',
          fontSize: 11,
          resize: 'none',
          outline: 'none',
          background: '#f9fafb',
        }}
      />

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, padding: 8, background: '#f9fafb' }}>
        <button
          onClick={run}
          style={{
            flex: 1,
            padding: '6px 12px',
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Run
        </button>
        {output && (
          <button
            onClick={copy}
            style={{
              padding: '6px 12px',
              background: '#e5e7eb',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            {copied ? '✓' : 'Copy'}
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: 8, background: '#fef2f2', color: '#dc2626', fontSize: 11 }}>
          {error}
        </div>
      )}

      {/* Output */}
      {output && (
        <textarea
          value={output}
          readOnly
          style={{
            flex: 1,
            padding: 8,
            border: 'none',
            fontFamily: 'monospace',
            fontSize: 11,
            resize: 'none',
            outline: 'none',
            background: '#f0fdf4',
          }}
        />
      )}
    </div>
  );
}
