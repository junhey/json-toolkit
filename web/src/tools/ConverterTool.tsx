import { useState } from 'react';
import { useClipboard, downloadText } from '../components/ToolShell';
import { useStore } from '../store';
import { t } from '../lib/i18n';
import { getAdapter } from '../lib/adapter';
import { Copy, Check, Download, Zap } from 'lucide-react';

export function ConverterTool() {
  const { lang } = useStore();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState<'json2csv' | 'csv2json'>('json2csv');
  const [delim, setDelim] = useState('csv');
  const { copied, copy } = useClipboard();

  const process = async () => {
    if (!input.trim()) return;
    setError(null);
    try {
      if (direction === 'json2csv') {
        const result = await getAdapter().jsonToCsv(input, delim);
        setOutput(result);
      } else {
        const result = await getAdapter().csvToJson(input, delim);
        setOutput(result);
      }
    } catch (e: any) {
      setError(e.toString().replace(/^Error:\s*/, ''));
    }
  };

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center gap-3 flex-wrap p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button onClick={() => setDirection('json2csv')} className={`px-3 py-1 text-sm transition-colors ${direction === 'json2csv' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
            JSON → CSV
          </button>
          <button onClick={() => setDirection('csv2json')} className={`px-3 py-1 text-sm transition-colors ${direction === 'csv2json' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
            CSV → JSON
          </button>
        </div>
        <label className="text-sm flex items-center gap-2">
          {t(lang, 'format')}:
          <select value={delim} onChange={(e) => setDelim(e.target.value)} className="px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <option value="csv">CSV</option>
            <option value="tsv">TSV</option>
          </select>
        </label>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={process} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
          <Zap className="w-4 h-4" />
          {t(lang, 'process')}
        </button>
        <div className="flex-1" />
        {output && (
          <>
            <button onClick={() => copy(output)} className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1 transition-colors">
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copied ? t(lang, 'copied') : t(lang, 'copy')}
            </button>
            <button onClick={() => downloadText(delim === 'csv' ? 'output.csv' : 'output.tsv', output)} className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1 transition-colors">
              <Download className="w-4 h-4" />
              {t(lang, 'download')}
            </button>
          </>
        )}
      </div>
      <div className="flex-1 grid grid-cols-2 gap-3 min-h-0">
        <div className="flex flex-col min-h-0">
          <label className="text-xs font-medium text-gray-500 mb-1">{direction === 'json2csv' ? 'JSON' : 'CSV/TSV'}</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 code-font resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
            spellCheck={false}
            placeholder={direction === 'json2csv' ? 'Paste JSON array here...' : 'Paste CSV/TSV here...'}
          />
        </div>
        <div className="flex flex-col min-h-0">
          <label className="text-xs font-medium text-gray-500 mb-1">{direction === 'json2csv' ? 'CSV/TSV' : 'JSON'}</label>
          {error ? (
            <div className="flex-1 p-3 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-600 text-sm overflow-auto">
              {error}
            </div>
          ) : (
            <textarea
              value={output}
              readOnly
              className="flex-1 w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 code-font resize-none focus:outline-none"
              placeholder="Output will appear here..."
            />
          )}
        </div>
      </div>
    </div>
  );
}
