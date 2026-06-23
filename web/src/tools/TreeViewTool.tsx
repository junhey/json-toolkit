import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useStore } from '../store';
import { t } from '../lib/i18n';
import { getAdapter } from '../lib/adapter';
import { sampleJson } from '../components/ToolShell';
import { Copy, Check, Download, Trash2, FileText } from 'lucide-react';
import { useClipboard, downloadText } from '../components/ToolShell';
import type { TreeNode } from '../lib/types';

const typeColors: Record<string, string> = {
  object: 'text-blue-500',
  array: 'text-purple-500',
  string: 'text-green-500',
  number: 'text-orange-500',
  boolean: 'text-red-500',
  null: 'text-gray-400',
};

function TreeItem({ node, depth }: { node: TreeNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2);

  return (
    <div>
      <div
        className="flex items-start gap-1 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-1 cursor-pointer code-font"
        style={{ paddingLeft: `${depth * 16}px` }}
        onClick={() => node.expandable && setExpanded(!expanded)}
      >
        {node.expandable ? (
          expanded ? <ChevronDown className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
        ) : (
          <span className="w-3.5 h-3.5 flex-shrink-0" />
        )}
        <span className="font-medium text-gray-700 dark:text-gray-300">{node.key}:</span>
        <span className={`ml-1 ${typeColors[node.value_type] || 'text-gray-500'}`}>
          {node.value_preview}
        </span>
        {node.size > 0 && (
          <span className="text-xs text-gray-400 ml-1">({node.size})</span>
        )}
      </div>
      {expanded && node.children.map((child, i) => (
        <TreeItem key={i} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export function TreeViewTool() {
  const { lang } = useStore();
  const [input, setInput] = useState('');
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { copied, copy } = useClipboard();

  const process = async () => {
    if (!input.trim()) return;
    setError(null);
    try {
      const result = await getAdapter().buildTree(input, 10);
      setTree(result);
    } catch (e: any) {
      setError(e.toString().replace(/^Error:\s*/, ''));
      setTree(null);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center gap-2">
        <button onClick={process} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
          ⚡ {t(lang, 'process')}
        </button>
        <button onClick={() => setInput(sampleJson)} className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1">
          <FileText className="w-4 h-4" /> {t(lang, 'sample')}
        </button>
      </div>
      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        <div className="flex flex-col min-h-0">
          <label className="text-xs font-medium text-gray-500 mb-1">{t(lang, 'input')}</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 code-font resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            spellCheck={false}
            placeholder="Paste JSON here..."
          />
        </div>
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-gray-500">{t(lang, 'result')}</label>
            {tree && (
              <button onClick={() => copy(JSON.stringify(tree, null, 2))} className="text-xs flex items-center gap-1 text-gray-500 hover:text-blue-500">
                {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                {copied ? t(lang, 'copied') : t(lang, 'copy')}
              </button>
            )}
          </div>
          {error ? (
            <div className="flex-1 p-3 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-600 text-sm overflow-auto">
              {error}
            </div>
          ) : tree ? (
            <div className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-auto p-3">
              <TreeItem node={tree} depth={0} />
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
