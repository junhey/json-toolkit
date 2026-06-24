import { useState } from 'react';
import { ToolShell } from '../components/ToolShell';
import { useStore } from '../store';
import { t } from '../lib/i18n';
import { getAdapter } from '../lib/adapter';

export function JsonPathTool() {
  const { lang } = useStore();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [path, setPath] = useState('$.');

  const process = async () => {
    if (!input.trim()) return;
    setError(null);
    try {
      const result = await getAdapter().jsonpath(input, path);
      setOutput(result);
    } catch (e: any) {
      setError(e.toString().replace(/^Error:\s*/, ''));
    }
  };

  return (
    <ToolShell
      input={input}
      setInput={setInput}
      output={output}
      error={error}
      onProcess={process}
      options={
        <label className="text-sm flex items-center gap-2 flex-1">
          {t(lang, 'path')}:
          <input
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="$.store.book[*].author"
            className="flex-1 px-3 py-1 text-sm font-mono rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
          />
        </label>
      }
    />
  );
}
