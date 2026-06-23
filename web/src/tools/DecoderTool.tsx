import { useState } from 'react';
import { ToolShell, sampleJson } from '../components/ToolShell';
import { useStore } from '../store';
import { t } from '../lib/i18n';
import { getAdapter } from '../lib/adapter';

export function DecoderTool() {
  const { lang } = useStore();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [encoding, setEncoding] = useState('base64');
  const [mode, setMode] = useState<'decode' | 'encode'>('decode');

  const process = async () => {
    if (!input.trim()) return;
    setError(null);
    try {
      if (mode === 'decode') {
        const result = await getAdapter().decode(input, encoding);
        setOutput(result);
      } else {
        const result = await getAdapter().encode(input, encoding);
        setOutput(result);
      }
    } catch (e: any) {
      setError(e.toString().replace(/^Error:\s*/, ''));
    }
  };

  const sample = mode === 'decode' ? btoa(JSON.stringify({ hello: "world", num: 42 })) : sampleJson;

  return (
    <ToolShell
      input={input}
      setInput={setInput}
      output={output}
      error={error}
      onProcess={process}
      sampleData={sample}
      options={
        <>
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setMode('decode')}
              className={`px-3 py-1 text-sm ${mode === 'decode' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800'}`}
            >
              Decode
            </button>
            <button
              onClick={() => setMode('encode')}
              className={`px-3 py-1 text-sm ${mode === 'encode' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800'}`}
            >
              Encode
            </button>
          </div>
          <label className="text-sm flex items-center gap-2">
            {t(lang, 'encoding')}:
            <select value={encoding} onChange={(e) => setEncoding(e.target.value)} className="px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <option value="base64">Base64</option>
              <option value="base64url">Base64URL</option>
              <option value="url">URL</option>
              <option value="unicode">Unicode</option>
            </select>
          </label>
        </>
      }
    />
  );
}
