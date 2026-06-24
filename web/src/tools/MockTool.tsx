import { useState, useCallback, useRef } from 'react';
import { Copy, Check, Download, Trash2, RefreshCw, Dice5, Zap, Sparkles, Clock, Layers, Database, AlertCircle } from 'lucide-react';
import { useStore } from '../store';
import { t } from '../lib/i18n';
import { getAdapter } from '../lib/adapter';
import { useClipboard, downloadText } from '../components/ToolShell';
import { JsonCodeEditor } from '../components/JsonCodeEditor';

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

const hintCategories = [
  {
    label: 'Identity',
    hints: [
      { hint: '@name', desc: 'Random name', icon: '👤' },
      { hint: '@email', desc: 'Email address', icon: '📧' },
      { hint: '@phone', desc: 'Phone number', icon: '📱' },
      { hint: '@uuid', desc: 'Unique ID', icon: '🔑' },
    ],
  },
  {
    label: 'Number',
    hints: [
      { hint: '@number', desc: 'Random integer', icon: '🔢' },
      { hint: '@float', desc: 'Float number', icon: '🔢' },
      { hint: '@price', desc: 'Price amount', icon: '💰' },
      { hint: '@boolean', desc: 'Boolean value', icon: '☯️' },
    ],
  },
  {
    label: 'Text',
    hints: [
      { hint: '@lorem', desc: 'Paragraph text', icon: '📝' },
      { hint: '@sentence', desc: 'Single sentence', icon: '💬' },
      { hint: '@title', desc: 'Title text', icon: '📌' },
    ],
  },
  {
    label: 'Address',
    hints: [
      { hint: '@city', desc: 'City name', icon: '🏙️' },
      { hint: '@country', desc: 'Country name', icon: '🌍' },
      { hint: '@address', desc: 'Full address', icon: '📍' },
      { hint: '@zip', desc: 'ZIP code', icon: '📮' },
    ],
  },
  {
    label: 'Web',
    hints: [
      { hint: '@url', desc: 'URL address', icon: '🌐' },
      { hint: '@ip', desc: 'IP address', icon: '🖥️' },
      { hint: '@domain', desc: 'Domain name', icon: '🌍' },
      { hint: '@color', desc: 'Color value', icon: '🎨' },
    ],
  },
  {
    label: 'Time',
    hints: [
      { hint: '@date', desc: 'Date', icon: '📅' },
      { hint: '@time', desc: 'Time', icon: '🕐' },
      { hint: '@datetime', desc: 'DateTime', icon: '📆' },
    ],
  },
  {
    label: 'Company',
    hints: [
      { hint: '@company', desc: 'Company name', icon: '🏢' },
      { hint: '@job', desc: 'Job title', icon: '💼' },
    ],
  },
  {
    label: 'Structure',
    hints: [
      { hint: '@array', desc: 'Array', icon: '📦' },
      { hint: '@object', desc: 'Nested object', icon: '📋' },
      { hint: '@null', desc: 'Null value', icon: '∅' },
    ],
  },
];

const presets = [
  { name: 'User', template: `{ "id": "@uuid", "name": "@name", "email": "@email" }` },
  { name: 'Product', template: `{ "id": "@uuid", "name": "@lorem", "price": "@price" }` },
  { name: 'Post', template: `{ "id": "@uuid", "title": "@title", "body": "@lorem", "tags": ["@array"] }` },
  { name: 'Order', template: `{ "orderId": "@uuid", "items": [{ "product": "@lorem", "qty": "@number" }] }` },
];

// Helper function to calculate JSON depth and field count
function analyzeJson(jsonStr: string): { fields: number; maxDepth: number } {
  try {
    const obj = JSON.parse(jsonStr);
    let fields = 0;
    let maxDepth = 0;

    const traverse = (node: any, depth: number) => {
      if (depth > maxDepth) maxDepth = depth;
      if (Array.isArray(node)) {
        node.forEach((item) => traverse(item, depth + 1));
      } else if (typeof node === 'object' && node !== null) {
        Object.keys(node).forEach((key) => {
          fields++;
          traverse(node[key], depth + 1);
        });
      }
    };

    traverse(obj, 0);
    return { fields, maxDepth: Math.max(0, maxDepth - 1) };
  } catch {
    return { fields: 0, maxDepth: 0 };
  }
}

export function MockTool() {
  const { lang, theme } = useStore();
  const [template, setTemplate] = useState(defaultTemplate);
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [arraySize, setArraySize] = useState(5);
  const [maxDepth, setMaxDepth] = useState(3);
  const [seed, setSeed] = useState<number | null>(null);
  const [genStats, setGenStats] = useState<{ fields: number; depth: number; size: string; time: number } | null>(null);
  const { copied, copy } = useClipboard();
  const genTimeRef = useRef<number>(0);

  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const insertHint = useCallback((hint: string) => {
    setTemplate((prev) => prev + (prev.endsWith('\n') ? '' : '\n') + `  "${hint.replace('@', '')}": "${hint}"`);
  }, []);

  const generate = useCallback(async () => {
    setError(null);
    setGenStats(null);

    // Validate template JSON syntax first
    try {
      JSON.parse(template);
    } catch (e: any) {
      setError(lang === 'zh' ? '模板 JSON 格式错误：' + e.message : 'Template JSON error: ' + e.message);
      return;
    }

    const startTime = performance.now();
    try {
      const result = await getAdapter().generateMock(template, arraySize, maxDepth, seed);
      const endTime = performance.now();
      genTimeRef.current = endTime - startTime;

      setOutput(result);

      // Calculate stats
      const { fields, maxDepth: depth } = analyzeJson(result);
      const sizeKB = new Blob([result]).size;
      setGenStats({
        fields,
        depth,
        size: sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(2)}MB` : `${sizeKB.toFixed(1)}KB`,
        time: Math.round(endTime - startTime),
      });
    } catch (e: any) {
      setError(e.toString().replace(/^Error:\s*/, ''));
      setOutput('');
    }
  }, [template, arraySize, maxDepth, seed, lang]);

  const regenerate = () => {
    setSeed(Math.floor(Math.random() * 1000000));
  };

  const loadPreset = (presetTemplate: string) => {
    setTemplate(presetTemplate);
    setOutput('');
    setError(null);
    setGenStats(null);
  };

  const clearOutput = () => {
    setOutput('');
    setError(null);
    setGenStats(null);
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Options bar - product design */}
      <div className="flex items-center gap-4 flex-wrap px-4 py-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <label className="text-sm flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-500" />
          <span className="text-gray-500">{t(lang, 'arraySize')}:</span>
          <input
            type="number"
            min={1}
            max={100}
            value={arraySize}
            onChange={(e) => setArraySize(Number(e.target.value))}
            className="w-16 px-2 py-1 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label className="text-sm flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-500" />
          <span className="text-gray-500">{t(lang, 'maxDepth')}:</span>
          <input
            type="number"
            min={1}
            max={10}
            value={maxDepth}
            onChange={(e) => setMaxDepth(Number(e.target.value))}
            className="w-16 px-2 py-1 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label className="text-sm flex items-center gap-2">
          <Dice5 className="w-4 h-4 text-amber-500" />
          <span className="text-gray-500">{t(lang, 'seed')}:</span>
          <input
            type="number"
            value={seed ?? ''}
            onChange={(e) => setSeed(e.target.value ? Number(e.target.value) : null)}
            placeholder={lang === 'zh' ? '随机' : 'random'}
            className="w-24 px-2 py-1 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <button
          onClick={() => setSeed(Math.floor(Math.random() * 1000000))}
          className="px-2 py-1 text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
          title={lang === 'zh' ? '随机种子' : 'Random seed'}
        >
          🎲
        </button>
        <div className="flex-1" />
        <button
          onClick={generate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
        >
          <Zap className="w-4 h-4" />
          {t(lang, 'generate')}
        </button>
        <button
          onClick={regenerate}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
          title={lang === 'zh' ? '重新生成（新种子）' : 'Regenerate with new seed'}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Template Presets */}
      <div className="flex items-center gap-2 flex-wrap">
        <Sparkles className="w-4 h-4 text-purple-500" />
        <span className="text-xs text-gray-500 mr-1">{lang === 'zh' ? '模板预设：' : 'Presets:'}</span>
        {presets.map((preset) => (
          <button
            key={preset.name}
            onClick={() => loadPreset(preset.template)}
            className="px-2.5 py-1 text-xs rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800 transition-colors font-medium"
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Enhanced Hint System - Category Groups */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-200 dark:border-gray-700/50">
        <div className="space-y-2.5">
          {hintCategories.map((category) => (
            <div key={category.label}>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500 mr-2">
                {category.label}
              </span>
              <div className="inline-flex flex-wrap gap-1 ml-1">
                {category.hints.map((h) => (
                  <button
                    key={h.hint}
                    onClick={() => insertHint(h.hint)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-100 dark:border-blue-800/50"
                    title={`${h.hint} - ${h.desc}`}
                  >
                    <span>{h.icon}</span>
                    <span>{h.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Input/Output panels */}
      <div className="flex-1 grid grid-cols-2 gap-3 min-h-0">
        {/* Template Input */}
        <div className="flex flex-col min-h-0">
          <label className="text-xs font-medium text-gray-500 mb-1.5">{t(lang, 'template')}</label>
          <JsonCodeEditor
            value={template}
            onChange={setTemplate}
            isDark={isDark}
            placeholder={lang === 'zh' ? '输入 Mock 模板 JSON...' : 'Enter mock template JSON...'}
          />
        </div>

        {/* Output Panel */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-gray-500">{t(lang, 'output')}</label>

            {/* Output Stats Panel */}
            {genStats && (
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs border border-green-200 dark:border-green-800">
                <Database className="w-3 h-3" />
                <span>{genStats.fields} fields</span>
                <span className="text-green-300">·</span>
                <Layers className="w-3 h-3" />
                <span>{genStats.depth} levels</span>
                <span className="text-green-300">·</span>
                <span>{genStats.size}</span>
                <span className="text-green-300">·</span>
                <Clock className="w-3 h-3" />
                <span>{genStats.time}ms</span>
              </div>
            )}

            {/* Action Buttons */}
            {output && !error && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copy(output)}
                  className="text-xs flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  {copied ? t(lang, 'copied') : t(lang, 'copy')}
                </button>
                <button
                  onClick={() => downloadText('mock-data.json', output)}
                  className="text-xs flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors"
                >
                  <Download className="w-3 h-3" />
                </button>
                <button
                  onClick={clearOutput}
                  className="text-xs flex items-center gap-1 text-gray-500 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {error ? (
            <div className="flex-1 p-3 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm overflow-auto flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>{error}</div>
            </div>
          ) : (
            <JsonCodeEditor
              value={output}
              readOnly
              isDark={isDark}
              placeholder={
                lang === 'zh'
                  ? '点击 Generate 按钮生成数据...\n\n提示：在左侧编辑器中输入包含 @hint 的模板，然后点击生成'
                  : 'Click Generate to create data...\n\nTip: Enter a template with @hints in the left editor, then click Generate'
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
