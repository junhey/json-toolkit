import { useState, useCallback } from 'react';
import { Copy, Check, Download, Trash2, RefreshCw, Dice5 } from 'lucide-react';
import { useStore } from '../store';
import { t } from '../lib/i18n';
import { getAdapter } from '../lib/adapter';
import { useClipboard, downloadText } from '../components/ToolShell';

const defaultTemplate = `{
  "id": "@uuid",
  "name": "@name",
  "email": "@email",
  "age": "@number",
  "active": "@boolean",
  "tags": "@array",
  "address": {
    "city": "@city",
    "country": "@country"
  },
  "createdAt": "@date"
}`;

const hintList = [
  { hint: '@name', desc: '随机姓名' },
  { hint: '@email', desc: '邮箱' },
  { hint: '@number', desc: '数字' },
  { hint: '@boolean', desc: '布尔值' },
  { hint: '@date', desc: '日期' },
  { hint: '@uuid', desc: 'UUID' },
  { hint: '@url', desc: 'URL' },
  { hint: '@ip', desc: 'IP地址' },
  { hint: '@color', desc: '颜色' },
  { hint: '@city', desc: '城市' },
  { hint: '@country', desc: '国家' },
  { hint: '@phone', desc: '电话' },
  { hint: '@company', desc: '公司名' },
  { hint: '@lorem', desc: '随机文本' },
  { hint: '@price', desc: '价格' },
  { hint: '@array', desc: '数组' },
];

export function MockTool() {
  const { lang } = useStore();
  const [template, setTemplate] = useState(defaultTemplate);
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [arraySize, setArraySize] = useState(5);
  const [maxDepth, setMaxDepth] = useState(3);
  const [seed, setSeed] = useState<number | null>(null);
  const { copied, copy } = useClipboard();

  const generate = useCallback(async () => {
    setError(null);
    try {
      const result = await getAdapter().generateMock(template, arraySize, maxDepth, seed);
      setOutput(result);
    } catch (e: any) {
      setError(e.toString().replace(/^Error:\s*/, ''));
      setOutput('');
    }
  }, [template, arraySize, maxDepth, seed]);

  const regenerate = () => {
    setSeed(Math.floor(Math.random() * 1000000));
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Options bar */}
      <div className="flex items-center gap-4 flex-wrap p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
        <label className="text-sm flex items-center gap-2">
          <span className="text-gray-500">{t(lang, 'arraySize')}:</span>
          <input
            type="number"
            min={1}
            max={100}
            value={arraySize}
            onChange={(e) => setArraySize(Number(e.target.value))}
            className="w-16 px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
          />
        </label>
        <label className="text-sm flex items-center gap-2">
          <span className="text-gray-500">{t(lang, 'maxDepth')}:</span>
          <input
            type="number"
            min={1}
            max={10}
            value={maxDepth}
            onChange={(e) => setMaxDepth(Number(e.target.value))}
            className="w-16 px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
          />
        </label>
        <label className="text-sm flex items-center gap-2">
          <span className="text-gray-500">{t(lang, 'seed')}:</span>
          <input
            type="number"
            value={seed ?? ''}
            onChange={(e) => setSeed(e.target.value ? Number(e.target.value) : null)}
            placeholder="random"
            className="w-24 px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
          />
        </label>
        <div className="flex-1" />
        <button
          onClick={generate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Dice5 className="w-4 h-4" />
          {t(lang, 'generate')}
        </button>
        <button
          onClick={regenerate}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
          title="Random seed"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Hint badges */}
      <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        {hintList.map((h) => (
          <button
            key={h.hint}
            onClick={() => setTemplate((prev) => prev + (prev.endsWith('\n') ? '' : '\n') + `  "${h.hint.replace('@', '')}": "${h.hint}"`)}
            className="px-2 py-0.5 text-xs rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            title={h.desc}
          >
            {h.hint}
          </button>
        ))}
      </div>

      {/* Input/Output panels */}
      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        <div className="flex flex-col min-h-0">
          <label className="text-xs font-medium text-gray-500 mb-1">{t(lang, 'template')}</label>
          <textarea
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="flex-1 w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 code-font resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            spellCheck={false}
            placeholder="Enter template JSON..."
          />
        </div>
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-gray-500">{t(lang, 'output')}</label>
            {output && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copy(output)}
                  className="text-xs flex items-center gap-1 text-gray-500 hover:text-blue-500"
                >
                  {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  {copied ? t(lang, 'copied') : t(lang, 'copy')}
                </button>
                <button
                  onClick={() => downloadText('mock-data.json', output)}
                  className="text-xs flex items-center gap-1 text-gray-500 hover:text-blue-500"
                >
                  <Download className="w-3 h-3" />
                  {t(lang, 'download')}
                </button>
                <button
                  onClick={() => setOutput('')}
                  className="text-xs flex items-center gap-1 text-gray-500 hover:text-blue-500"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
          {error ? (
            <div className="flex-1 p-3 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm overflow-auto">
              {error}
            </div>
          ) : (
            <textarea
              value={output}
              readOnly
              className="flex-1 w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 code-font resize-none focus:outline-none"
              placeholder="Generated data will appear here..."
            />
          )}
        </div>
      </div>
    </div>
  );
}
