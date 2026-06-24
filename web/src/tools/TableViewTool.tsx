import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Copy,
  Check,
  Download,
  Zap,
  AlertCircle,
  Table2,
  Columns3,
  Rows3,
  LayoutGrid,
} from 'lucide-react';
import { useStore } from '../store';
import { t } from '../lib/i18n';
import { getAdapter } from '../lib/adapter';
import { useClipboard, downloadText } from '../components/ToolShell';
import { JsonCodeEditor } from '../components/JsonCodeEditor';

interface TableData {
  headers: string[];
  rows: string[][];
  total: number;
}

export function TableViewTool() {
  const { lang, theme } = useStore();
  const [input, setInput] = useState('');
  const [table, setTable] = useState<TableData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoConvert, setAutoConvert] = useState(true);
  const { copied, copy } = useClipboard();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const process = useCallback(async () => {
    if (!input.trim()) {
      setTable(null);
      setError(null);
      return;
    }
    setError(null);

    // Check if input looks like JSON array or object
    const trimmed = input.trim();
    if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) {
      setError(
        lang === 'zh'
          ? '输入必须是 JSON 数组或对象'
          : 'Input must be a JSON array or object'
      );
      setTable(null);
      return;
    }

    try {
      const result = await getAdapter().jsonToTable(input);
      setTable(result as TableData);
      setError(null);
    } catch (e: any) {
      const errMsg = e.toString().replace(/^Error:\s*/, '');
      setError(errMsg);
      setTable(null);
    }
  }, [input, lang]);

  // Auto-convert with debounce
  useEffect(() => {
    if (!autoConvert || !input.trim()) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => process(), 300);
    return () => clearTimeout(debounceRef.current);
  }, [input, autoConvert, process]);

  // Convert table to CSV
  const tableToCsv = useCallback((): string => {
    if (!table) return '';
    const lines = [
      table.headers.map((h) => (h.includes(',') || h.includes('"') ? `"${h.replace(/"/g, '""')}"` : h)).join(','),
    ];
    table.rows.forEach((row) =>
      lines.push(
        row
          .map((cell) =>
            cell.includes(',') || cell.includes('"') || cell.includes('\n')
              ? `"${cell.replace(/"/g, '""')}"`
              : cell
          )
          .join(',')
      )
    );
    return lines.join('\n');
  }, [table]);

  // Stats
  const colCount = table?.headers.length ?? 0;
  const rowCount = table?.rows.length ?? 0;
  const cellCount = colCount * rowCount;

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Options bar */}
      <div className="flex items-center gap-4 flex-wrap px-4 py-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <button
          onClick={process}
          disabled={!input.trim()}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Zap className="w-4 h-4" />
          {t(lang, 'process')}
        </button>
        <label className="text-sm flex items-center gap-2 cursor-pointer select-none text-gray-700 dark:text-gray-200">
          <input
            type="checkbox"
            checked={autoConvert}
            onChange={(e) => setAutoConvert(e.target.checked)}
            className="rounded accent-blue-600"
          />
          {t(lang, 'realTime')}
        </label>
        <div className="flex-1" />

        {/* Stats badges */}
        {table && table.rows.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
              <Columns3 className="w-3.5 h-3.5" />
              {colCount} {lang === 'zh' ? '列' : 'cols'}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <Rows3 className="w-3.5 h-3.5" />
              {rowCount} {lang === 'zh' ? '行' : 'rows'}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <LayoutGrid className="w-3.5 h-3.5" />
              {cellCount} {lang === 'zh' ? '单元格' : 'cells'}
            </span>
          </div>
        )}

        {/* Export buttons */}
        {table && table.rows.length > 0 && (
          <>
            <button
              onClick={() => copy(tableToCsv())}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied ? t(lang, 'copied') : lang === 'zh' ? '复制 CSV' : 'Copy CSV'}
            </button>
            <button
              onClick={() => downloadText('table.csv', tableToCsv())}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              {lang === 'zh' ? '下载 CSV' : 'Download CSV'}
            </button>
          </>
        )}
      </div>

      {/* Input/Output panels */}
      <div className="flex-1 grid grid-cols-2 gap-3 min-h-0">
        {/* Input */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-gray-500">{t(lang, 'input')}</label>
            <span className="text-xs text-gray-400">
              {input ? `${input.split('\n').length} lines` : ''}
            </span>
          </div>
          <JsonCodeEditor
            value={input}
            onChange={setInput}
            isDark={isDark}
            placeholder={
              lang === 'zh'
                ? '粘贴 JSON 数组或对象，自动转换为表格...'
                : 'Paste a JSON array or object to convert to table...'
            }
          />
        </div>

        {/* Output - Table View */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
              <Table2 className="w-3.5 h-3.5" />
              {t(lang, 'result')}
              {table && table.rows.length > 0 && (
                <span className="text-gray-400">({table.total})</span>
              )}
            </label>
          </div>

          {error ? (
            <div className="flex-1 p-4 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm overflow-auto flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>{error}</div>
            </div>
          ) : table && table.rows.length > 0 ? (
            <div className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 overflow-auto shadow-sm">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 dark:bg-gray-800/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
                    {table.headers.map((header, idx) => (
                      <th
                        key={idx}
                        className="px-4 py-2.5 text-left font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, rowIdx) => (
                    <tr
                      key={rowIdx}
                      className={`border-b border-gray-100 dark:border-gray-800 transition-colors ${
                        rowIdx % 2 === 0
                          ? 'bg-white dark:bg-gray-950 hover:bg-blue-50/60 dark:hover:bg-blue-900/10'
                          : 'bg-gray-50/50 dark:bg-gray-900/40 hover:bg-blue-50/80 dark:hover:bg-blue-900/15'
                      }`}
                    >
                      {row.map((cell, cellIdx) => (
                        <td
                          key={cellIdx}
                          className="px-4 py-2 text-gray-600 dark:text-gray-400 max-w-[240px] truncate"
                          title={cell.length > 30 ? cell : undefined}
                        >
                          <code className="font-mono text-[13px] leading-relaxed">
                            {cell === '' ? '\u00A0' : cell}
                          </code>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : input.trim() ? (
            <div className="flex-1 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 flex items-center justify-center gap-2 text-gray-400 dark:text-gray-500 text-sm">
              <Table2 className="w-5 h-5 opacity-50" />
              {lang === 'zh' ? '点击「处理」按钮转换表格' : "Click 'Process' to convert to table"}
            </div>
          ) : (
            <div className="flex-1 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-950/30 flex items-center justify-center gap-2 text-gray-400 dark:text-gray-600 text-sm">
              <LayoutGrid className="w-5 h-5 opacity-40" />
              {t(lang, 'noData')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
