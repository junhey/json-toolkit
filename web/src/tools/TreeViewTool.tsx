import { useState, useCallback } from 'react';
import { ChevronRight, ChevronDown, Pencil, Check, X, Plus, Trash2, Copy } from 'lucide-react';
import { useStore } from '../store';
import { t } from '../lib/i18n';
import { getAdapter } from '../lib/adapter';
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

const typeIcons: Record<string, string> = {
  object: '{}',
  array: '[]',
  string: '""',
  number: '#',
  boolean: 'T/F',
  null: '∅',
};

function TreeItem({ node, depth, onEdit, onAddChild, onDelete }: {
  node: TreeNode;
  depth: number;
  onEdit: (path: string, newValue: string) => void;
  onAddChild: (path: string) => void;
  onDelete: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.value_preview);

  const startEdit = () => {
    setEditValue(node.value_preview);
    setEditing(true);
  };
  const saveEdit = () => {
    onEdit(node.path, editValue);
    setEditing(false);
  };
  const cancelEdit = () => {
    setEditing(false);
  };

  return (
    <div>
      <div
        className="group flex items-start gap-1 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-1 code-font"
        style={{ paddingLeft: `${depth * 16}px` }}
      >
        {node.expandable ? (
          <button onClick={() => setExpanded(!expanded)} className="flex-shrink-0 mt-0.5">
            {expanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
          </button>
        ) : (
          <span className="w-3.5 h-3.5 flex-shrink-0" />
        )}
        <span className="font-medium text-gray-700 dark:text-gray-300">{node.key}:</span>
        {editing ? (
          <span className="flex items-center gap-1 ml-1">
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
              className="px-1 py-0 text-xs rounded border border-blue-400 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <button onClick={saveEdit} className="text-green-500 hover:text-green-600"><Check className="w-3 h-3" /></button>
            <button onClick={cancelEdit} className="text-red-500 hover:text-red-600"><X className="w-3 h-3" /></button>
          </span>
        ) : (
          <>
            <span className={`ml-1 ${typeColors[node.value_type] || 'text-gray-500'}`}>
              {node.value_preview}
            </span>
            {node.size > 0 && (
              <span className="text-xs text-gray-400 ml-1">({node.size})</span>
            )}
            {/* Action buttons - show on hover */}
            <div className="hidden group-hover:flex items-center gap-0.5 ml-2">
              <button onClick={startEdit} className="p-0.5 text-gray-400 hover:text-blue-500" title="Edit">
                <Pencil className="w-3 h-3" />
              </button>
              {node.expandable && (
                <button onClick={() => onAddChild(node.path)} className="p-0.5 text-gray-400 hover:text-green-500" title="Add child">
                  <Plus className="w-3 h-3" />
                </button>
              )}
              {depth > 0 && (
                <button onClick={() => onDelete(node.path)} className="p-0.5 text-gray-400 hover:text-red-500" title="Delete">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
      {expanded && node.children.map((child, i) => (
        <TreeItem key={i} node={child} depth={depth + 1} onEdit={onEdit} onAddChild={onAddChild} onDelete={onDelete} />
      ))}
    </div>
  );
}

export function TreeViewTool() {
  const { lang } = useStore();
  const [input, setInput] = useState('');
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState('');
  const { copied, copy } = useClipboard();

  const process = async () => {
    if (!input.trim()) return;
    setError(null);
    try {
      const result = await getAdapter().buildTree(input, 10);
      setTree(result);
      setOutput(input);
    } catch (e: any) {
      setError(e.toString().replace(/^Error:\s*/, ''));
      setTree(null);
    }
  };

  // Apply edit to JSON by path
  const applyEdit = useCallback((jsonStr: string, path: string, newValue: string): string => {
    try {
      const data = JSON.parse(jsonStr);
      const parts = path.split('.').filter(p => p !== '$');
      let current = data;
      for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        current = current[key] ?? current[parseInt(key)] ?? current;
      }
      const lastKey = parts[parts.length - 1];
      // Try to parse the new value as JSON, otherwise treat as string
      let parsedValue: any = newValue;
      try {
        parsedValue = JSON.parse(newValue);
      } catch {
        parsedValue = newValue;
      }
      if (Array.isArray(current)) {
        current[parseInt(lastKey)] = parsedValue;
      } else {
        current[lastKey] = parsedValue;
      }
      return JSON.stringify(data, null, 2);
    } catch {
      return jsonStr;
    }
  }, []);

  // Delete node by path
  const applyDelete = useCallback((jsonStr: string, path: string): string => {
    try {
      const data = JSON.parse(jsonStr);
      const parts = path.split('.').filter(p => p !== '$');
      let current = data;
      for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        current = current[key] ?? current[parseInt(key)] ?? current;
      }
      const lastKey = parts[parts.length - 1];
      if (Array.isArray(current)) {
        current.splice(parseInt(lastKey), 1);
      } else {
        delete current[lastKey];
      }
      return JSON.stringify(data, null, 2);
    } catch {
      return jsonStr;
    }
  }, []);

  // Add child to object/array
  const applyAddChild = useCallback((jsonStr: string, path: string): string => {
    try {
      const data = JSON.parse(jsonStr);
      const parts = path.split('.').filter(p => p !== '$');
      let current = data;
      for (const part of parts) {
        current = current[part] ?? current[parseInt(part)] ?? current;
      }
      if (Array.isArray(current)) {
        current.push(null);
      } else if (typeof current === 'object' && current !== null) {
        current['newField'] = null;
      }
      return JSON.stringify(data, null, 2);
    } catch {
      return jsonStr;
    }
  }, []);

  const handleEdit = async (path: string, newValue: string) => {
    const updated = applyEdit(output, path, newValue);
    setOutput(updated);
    setInput(updated);
    try {
      const result = await getAdapter().buildTree(updated, 10);
      setTree(result);
    } catch {}
  };

  const handleDelete = async (path: string) => {
    const updated = applyDelete(output, path);
    setOutput(updated);
    setInput(updated);
    try {
      const result = await getAdapter().buildTree(updated, 10);
      setTree(result);
    } catch {}
  };

  const handleAddChild = async (path: string) => {
    const updated = applyAddChild(output, path);
    setOutput(updated);
    setInput(updated);
    try {
      const result = await getAdapter().buildTree(updated, 10);
      setTree(result);
    } catch {}
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Action bar */}
      <div className="flex items-center gap-2">
        <button
          onClick={process}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {t(lang, 'process')}
        </button>
        {tree && (
          <span className="text-xs text-gray-400 ml-2">
            {lang === 'zh' ? '提示：悬停节点可编辑/添加/删除' : 'Tip: hover a node to edit/add/delete'}
          </span>
        )}
        <div className="flex-1" />
        {output && (
          <>
            <button onClick={() => copy(output)} className="text-xs flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors">
              {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              {copied ? t(lang, 'copied') : t(lang, 'copy')}
            </button>
            <button onClick={() => downloadText('edited.json', output)} className="text-xs flex items-center gap-1 text-gray-500 hover:text-blue-500">
              <Copy className="w-3 h-3" />
              {t(lang, 'download')}
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
            className="flex-1 w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 code-font resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            spellCheck={false}
            placeholder="Paste JSON here..."
          />
        </div>
        <div className="flex flex-col min-h-0">
          <label className="text-xs font-medium text-gray-500 mb-1">{t(lang, 'result')}</label>
          {error ? (
            <div className="flex-1 p-3 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-600 text-sm overflow-auto">
              {error}
            </div>
          ) : tree ? (
            <div className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-auto p-3">
              <TreeItem
                node={tree}
                depth={0}
                onEdit={handleEdit}
                onAddChild={handleAddChild}
                onDelete={handleDelete}
              />
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
