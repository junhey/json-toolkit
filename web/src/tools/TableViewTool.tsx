import { useState } from 'react';
import { useStore } from '../store';
import { t } from '../lib/i18n';
import { getAdapter } from '../lib/adapter';
import { useClipboard, downloadText } from '../components/ToolShell';
import { Copy, Check, Zap } from 'lucide-react';
import type { TableData } from '../lib/types';

export function TableViewTool() {
  const { lang } = useStore();
  const [input, setInput] = useState('');
  const [table, setTable] = useState<TableData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { copied, copy } = useClipboard();

  const process = async () => {
    if (!input.trim()) return;
    setError(null);
    try {
      const result = await getAdapter().jsonToTable(input);
      setTable(result);
    } catch (e: any) {
      setError(e.toString().replace(/^Error:\s*/, ''));
      setTable(null);
    }
  };

  const tableToCsv = () => {
    if (!table) return '';
    const lines = [table.headers.join(',')];
    table.rows.forEach(row => lines.push(row.map(c => c.includes(',') ? `"${c}"` : c).join(',')));
    return lines.join('\n');
  };

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center gap-2">
        <button onClick={process} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
          <Zap className="w-4 h-4" />
          {t(lang, 'process')}
        </button>
        {table && table.rows.length > 0 && (
          <>
            <div className="flex-1" />
            <button onClick={() => copy(tableToCsv())} className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1 transition-colors">
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copied ? t(lang, 'copied') : 'CSV'}
            </button>
            <button onClick={() => downloadText('table.csv', tableToCsv())} className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              Download CSV
            </button>
          </>
        )}
      </div>
      <div className="flex-1 grid grid-cols-2 gap-3 min-h-0">
        <div className="flex flex-col min-h-0">
          <label className="text-xs font-medium text-gray-500 mb-1">{t(lang, 'input')}</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 code-font resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
            spellCheck={false}
            placeholder="Paste JSON array here..."
          />
        </div>
        <div className="flex flex-col min-h-0">
          <label className="text-xs font-medium text-gray-500 mb-1">{t(lang, 'result')} {table && `(${table.total} rows)`}</label>
          {error ? (
            <div className="flex-1 p-3 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-600 text-sm overflow-auto">
              {error}
            </div>
          ) : table ? (
            <div className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                  <tr>
                    {table.headers.map((h, i) => (
                      <th key={i} className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      {row.map((cell, j) => (
                        <td key={j} className="px-3 py-1.5 border-b border-gray-100 dark:border-gray-800 code-font">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400">
              {t(lang, 'noData')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
