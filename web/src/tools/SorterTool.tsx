import { useState } from 'react';
import { ToolShell } from '../components/ToolShell';
import { useStore } from '../store';
import { t } from '../lib/i18n';
import { getAdapter } from '../lib/adapter';

export function SorterTool() {
  const { lang } = useStore();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('key');
  const [order, setOrder] = useState('asc');

  const process = async () => {
    if (!input.trim()) return;
    setError(null);
    try {
      const result = await getAdapter().sort(input, sortBy, order);
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
        <>
          <label className="text-sm flex items-center gap-2">
            {t(lang, 'sortBy')}:
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <option value="key">{t(lang, 'byKey')}</option>
              <option value="value">{t(lang, 'byValue')}</option>
            </select>
          </label>
          <label className="text-sm flex items-center gap-2">
            {t(lang, 'sortOrder')}:
            <select value={order} onChange={(e) => setOrder(e.target.value)} className="px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <option value="asc">{t(lang, 'asc')}</option>
              <option value="desc">{t(lang, 'desc')}</option>
            </select>
          </label>
        </>
      }
    />
  );
}
