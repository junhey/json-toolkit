import { useState } from 'react';
import { useStore } from '../store';
import { t } from '../lib/i18n';
import { getAdapter } from '../lib/adapter';
import { Zap } from 'lucide-react';
import type { DiffResult } from '../lib/types';

const diffColors: Record<string, string> = {
  modified: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  added: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  removed: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  same: 'text-gray-400',
};

const diffLabels: Record<string, string> = {
  modified: 'MOD',
  added: 'ADD',
  removed: 'DEL',
  same: ' = ',
};

export function DiffTool() {
  const { lang } = useStore();
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');
  const [diffs, setDiffs] = useState<DiffResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const process = async () => {
    if (!left.trim() || !right.trim()) return;
    setError(null);
    try {
      const result = await getAdapter().diff(left, right);
      setDiffs(result);
    } catch (e: any) {
      setError(e.toString().replace(/^Error:\s*/, ''));
      setDiffs(null);
    }
  };

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center gap-2">
        <button onClick={process} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
          <Zap className="w-4 h-4" />
          {t(lang, 'process')}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 h-64">
        <div className="flex flex-col min-h-0">
          <label className="text-xs font-medium text-gray-500 mb-1">{t(lang, 'leftJson')}</label>
          <textarea
            value={left}
            onChange={(e) => setLeft(e.target.value)}
            className="flex-1 w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 code-font resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
            spellCheck={false}
            placeholder="JSON A..."
          />
        </div>
        <div className="flex flex-col min-h-0">
          <label className="text-xs font-medium text-gray-500 mb-1">{t(lang, 'rightJson')}</label>
          <textarea
            value={right}
            onChange={(e) => setRight(e.target.value)}
            className="flex-1 w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 code-font resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
            spellCheck={false}
            placeholder="JSON B..."
          />
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <label className="text-xs font-medium text-gray-500 mb-1 block">{t(lang, 'result')}</label>
        {error ? (
          <div className="p-3 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-600 text-sm">
            {error}
          </div>
        ) : diffs ? (
          <div className="h-full overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            {diffs.filter(d => d.diff_type !== 'same').length === 0 ? (
              <div className="p-4 text-center text-green-500 text-sm">✓ JSON objects are identical</div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {diffs.filter(d => d.diff_type !== 'same').map((d, i) => (
                  <div key={i} className={`flex items-center gap-3 px-3 py-2 border-l-4 ${diffColors[d.diff_type]}`}>
                    <span className="text-xs font-mono font-bold w-8">{diffLabels[d.diff_type]}</span>
                    <span className="text-sm font-mono flex-1">{d.path}</span>
                    {d.left_value && <span className="text-xs font-mono line-through opacity-60">{d.left_value}</span>}
                    {d.left_value && d.right_value && <span className="text-gray-400">→</span>}
                    {d.right_value && <span className="text-xs font-mono">{d.right_value}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="h-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400">
            {t(lang, 'noData')}
          </div>
        )}
      </div>
    </div>
  );
}
