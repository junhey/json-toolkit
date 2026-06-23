import { useState } from 'react';
import { ToolShell, sampleJson } from '../components/ToolShell';
import { useStore } from '../store';
import { t } from '../lib/i18n';
import { getAdapter } from '../lib/adapter';

export function FormatterTool() {
  const { lang } = useStore();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [indent, setIndent] = useState(2);
  const [sortKeys, setSortKeys] = useState(false);

  const process = async () => {
    if (!input.trim()) return;
    setError(null);
    try {
      const result = await getAdapter().format(input, indent, sortKeys);
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
      sampleData={sampleJson}
      options={
        <>
          <label className="text-sm flex items-center gap-2">
            {t(lang, 'indent')}:
            <select
              value={indent}
              onChange={(e) => setIndent(Number(e.target.value))}
              className="px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              <option value={2}>2 spaces</option>
              <option value={4}>4 spaces</option>
              <option value={8}>Tab</option>
            </select>
          </label>
          <label className="text-sm flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={sortKeys} onChange={(e) => setSortKeys(e.target.checked)} className="rounded" />
            {t(lang, 'sortKeys')}
          </label>
        </>
      }
    />
  );
}
