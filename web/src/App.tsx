import { useState, useEffect } from 'react';
import { Search, Sun, Moon, Monitor, Languages, Zap, Github, ChevronRight } from 'lucide-react';
import { useStore } from './store';
import { tools, categories, getToolName, getToolDesc } from './lib/tools';
import { t } from './lib/i18n';
import { FormatterTool } from './tools/FormatterTool';
import { MinifierTool } from './tools/MinifierTool';
import { SorterTool } from './tools/SorterTool';
import { DecoderTool } from './tools/DecoderTool';
import { JsonPathTool } from './tools/JsonPathTool';
import { TreeViewTool } from './tools/TreeViewTool';
import { TableViewTool } from './tools/TableViewTool';
import { DiffTool } from './tools/DiffTool';
import { ValidatorTool } from './tools/ValidatorTool';
import { ConverterTool } from './tools/ConverterTool';
import { MockTool } from './tools/MockTool';
import * as Icons from 'lucide-react';

const toolComponents: Record<string, React.FC> = {
  'formatter': FormatterTool,
  'minifier': MinifierTool,
  'sorter': SorterTool,
  'decoder': DecoderTool,
  'jsonpath': JsonPathTool,
  'tree-view': TreeViewTool,
  'table-view': TableViewTool,
  'diff': DiffTool,
  'validator': ValidatorTool,
  'converter': ConverterTool,
  'mock': MockTool,
};

function App() {
  const { theme, lang, setTheme, setLang, addRecentlyUsed, recentlyUsed } = useStore();
  const [activeTool, setActiveTool] = useState<string>('formatter');
  const [searchQuery, setSearchQuery] = useState('');

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = () => {
      const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.classList.toggle('dark', isDark);
    };
    applyTheme();
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', applyTheme);
      return () => mq.removeEventListener('change', applyTheme);
    }
  }, [theme]);

  const filteredTools = searchQuery
    ? tools.filter((tool) => {
        const name = getToolName(tool, lang).toLowerCase();
        const desc = getToolDesc(tool, lang).toLowerCase();
        const q = searchQuery.toLowerCase();
        return name.includes(q) || desc.includes(q) || tool.id.includes(q);
      })
    : tools;

  const ActiveComponent = activeTool ? toolComponents[activeTool] : null;
  const activeToolMeta = activeTool ? tools.find((t) => t.id === activeTool) : null;

  const selectTool = (id: string) => {
    setActiveTool(id);
    addRecentlyUsed(id);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-950 dark:via-gray-950 dark:to-slate-950 text-gray-900 dark:text-gray-100">
      {/* Sidebar */}
      <aside className="w-72 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">JSON Toolkit</h1>
              <p className="text-xs text-gray-400">{t(lang, 'appDesc')}</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t(lang, 'search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
            />
          </div>
        </div>

        {/* Tool list */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {/* Recently used */}
          {!searchQuery && recentlyUsed.length > 0 && (
            <div className="mb-3">
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {lang === 'zh' ? '最近使用' : 'Recent'}
              </div>
              {recentlyUsed.slice(0, 3).map((id) => {
                const tool = tools.find((t) => t.id === id);
                if (!tool) return null;
                const Icon = (Icons as any)[tool.icon] || Icons.Box;
                const isActive = activeTool === tool.id;
                return (
                  <button
                    key={id}
                    onClick={() => selectTool(id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm truncate">{getToolName(tool, lang)}</span>
                  </button>
                );
              })}
            </div>
          )}

          {categories.map((cat) => {
            const catTools = filteredTools.filter((tool) => tool.category === cat.id);
            if (catTools.length === 0) return null;
            return (
              <div key={cat.id} className="mb-3">
                <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {lang === 'zh' ? cat.zh : cat.en}
                </div>
                {catTools.map((tool) => {
                  const Icon = (Icons as any)[tool.icon] || Icons.Box;
                  const isActive = activeTool === tool.id;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => selectTool(tool.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm ${isActive ? 'font-medium' : ''} truncate`}>{getToolName(tool, lang)}</div>
                        <div className="text-xs text-gray-400 truncate">{getToolDesc(tool, lang)}</div>
                      </div>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer: Theme & Language */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={t(lang, theme === 'dark' ? 'dark' : theme === 'light' ? 'light' : 'system')}
            >
              {theme === 'dark' ? <Moon className="w-4 h-4" /> : theme === 'light' ? <Sun className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
              title={lang === 'zh' ? '中文' : 'English'}
            >
              <Languages className="w-4 h-4" />
              <span className="text-xs font-medium">{lang === 'zh' ? '中' : 'EN'}</span>
            </button>
          </div>
          <a
            href="https://github.com/junhey/json-toolkit"
            target="_blank"
            rel="noopener"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <Github className="w-4 h-4" />
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {ActiveComponent && activeToolMeta ? (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="px-6 py-3 border-b border-gray-200/80 dark:border-gray-800 bg-white/95 dark:bg-gray-900/90 backdrop-blur flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                activeTool === 'formatter' ? 'bg-blue-50 dark:bg-blue-900/30' :
                activeTool === 'mock' ? 'bg-purple-50 dark:bg-purple-900/30' : 'bg-gray-100 dark:bg-gray-800'
              }`}>
                {(() => {
                  const Icon = (Icons as any)[activeToolMeta.icon] || Icons.Box;
                  return <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
                })()}
              </div>
              <div>
                <h2 className="text-base font-semibold leading-tight">{getToolName(activeToolMeta, lang)}</h2>
                <p className="text-xs text-gray-400 leading-tight">{getToolDesc(activeToolMeta, lang)}</p>
              </div>
            </div>
            {/* Tool content */}
            <div className="flex-1 overflow-auto p-5 lg:p-6 fade-in">
              <ActiveComponent />
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

export default App;
