import { useState, useEffect } from 'react';
import {
  Search,
  Sun,
  Moon,
  Monitor,
  Languages,
  Zap,
  Github,
  ChevronRight,
  Star,
  ChevronUp,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';
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
  formatter: FormatterTool,
  minifier: MinifierTool,
  sorter: SorterTool,
  decoder: DecoderTool,
  jsonpath: JsonPathTool,
  'tree-view': TreeViewTool,
  'table-view': TableViewTool,
  diff: DiffTool,
  validator: ValidatorTool,
  converter: ConverterTool,
  mock: MockTool,
};

function App() {
  const {
    theme,
    lang,
    setTheme,
    setLang,
    addRecentlyUsed,
    recentlyUsed,
    favorites,
    toggleFavorite,
    moveFavorite,
  } = useStore();
  const [activeTool, setActiveTool] = useState<string>('formatter');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = () => {
      const isDark =
        theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.classList.toggle('dark', isDark);
    };
    applyTheme();
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', applyTheme);
      return () => mq.removeEventListener('change', applyTheme);
    }
  }, [theme]);

  useEffect(() => {
    const meta = tools.find((item) => item.id === activeTool);
    document.title = meta
      ? `${getToolName(meta, lang)} · JSON Toolkit`
      : 'JSON Toolkit';
  }, [activeTool, lang]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      e.preventDefault();
      document.getElementById('tool-search')?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
  const favoriteSet = new Set(favorites);

  const selectTool = (id: string) => {
    setActiveTool(id);
    addRecentlyUsed(id);
    setSidebarOpen(false);
  };

  const recentIds = recentlyUsed.filter((id) => !favoriteSet.has(id)).slice(0, 5);

  const renderToolButton = (
    toolId: string,
    options?: { showReorder?: boolean; showDesc?: boolean }
  ) => {
    const tool = tools.find((t) => t.id === toolId);
    if (!tool) return null;
    const Icon = (Icons as any)[tool.icon] || Icons.Box;
    const isActive = activeTool === tool.id;
    const isFav = favoriteSet.has(tool.id);

    return (
      <div
        key={toolId}
        className={`group w-full flex items-center gap-1 rounded-lg transition-all ${
          isActive
            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
      >
        <button
          onClick={() => selectTool(tool.id)}
          className="flex-1 min-w-0 flex items-center gap-3 px-3 py-2 text-left"
        >
          <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />
          <div className="min-w-0 flex-1">
            <div className={`text-sm truncate ${isActive ? 'font-medium' : ''}`}>
              {getToolName(tool, lang)}
            </div>
            {options?.showDesc && (
              <div className="text-xs text-gray-400 truncate">{getToolDesc(tool, lang)}</div>
            )}
          </div>
          {isActive && !options?.showReorder && (
            <ChevronRight className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          )}
        </button>

        {options?.showReorder && (
          <div className="flex flex-col pr-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <button
              type="button"
              title={lang === 'zh' ? '上移' : 'Move up'}
              onClick={() => moveFavorite(tool.id, 'up')}
              className="p-0.5 rounded text-gray-400 hover:text-blue-500"
            >
              <ChevronUp className="w-3 h-3" />
            </button>
            <button
              type="button"
              title={lang === 'zh' ? '下移' : 'Move down'}
              onClick={() => moveFavorite(tool.id, 'down')}
              className="p-0.5 rounded text-gray-400 hover:text-blue-500"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        )}

        <button
          type="button"
          title={isFav ? (lang === 'zh' ? '取消收藏' : 'Unfavorite') : lang === 'zh' ? '收藏' : 'Favorite'}
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(tool.id);
          }}
          className={`p-2 mr-1 rounded-md transition-colors ${
            isFav
              ? 'text-amber-500 hover:text-amber-600'
              : 'text-gray-300 opacity-0 group-hover:opacity-100 hover:text-amber-500'
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
        </button>
      </div>
    );
  };

  return (
    <div className="flex h-full bg-gradient-to-br from-slate-50 via-sky-50/40 to-cyan-50/20 dark:from-gray-950 dark:via-gray-950 dark:to-slate-950 text-gray-900 dark:text-gray-100">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`w-72 h-full min-h-0 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col fixed md:static inset-y-0 left-0 z-40 transform transition-transform md:transform-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 via-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-bold tracking-tight">JSON Toolkit</h1>
              <p className="text-xs text-gray-400">{t(lang, 'appDesc')}</p>
            </div>
            <button
              type="button"
              className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="tool-search"
              type="search"
              placeholder={t(lang, 'search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 pb-2">
          {!searchQuery && favorites.length > 0 && (
            <div className="mb-3">
              <div className="px-3 py-1.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {lang === 'zh' ? '收藏' : 'Favorites'}
                </span>
                <span className="text-[10px] text-gray-400">
                  {lang === 'zh' ? '可排序' : 'Reorder'}
                </span>
              </div>
              {favorites.map((id) => renderToolButton(id, { showReorder: true }))}
            </div>
          )}

          {!searchQuery && recentIds.length > 0 && (
            <div className="mb-3">
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {lang === 'zh' ? '最近使用' : 'Recent'}
              </div>
              {recentIds.map((id) => renderToolButton(id))}
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
                {catTools.map((tool) => renderToolButton(tool.id, { showDesc: true }))}
              </div>
            );
          })}
        </div>

        <div className="p-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() =>
                setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark')
              }
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={t(lang, theme === 'dark' ? 'dark' : theme === 'light' ? 'light' : 'system')}
            >
              {theme === 'dark' ? (
                <Moon className="w-4 h-4" />
              ) : theme === 'light' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Monitor className="w-4 h-4" />
              )}
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

      <main className="flex-1 overflow-hidden min-w-0 min-h-0">
        {ActiveComponent && activeToolMeta ? (
          <div className="h-full min-h-0 flex flex-col overflow-hidden">
            <div className="flex-shrink-0 px-4 sm:px-6 py-3 border-b border-gray-200/80 dark:border-gray-800 bg-white/95 dark:bg-gray-900/90 backdrop-blur flex items-center gap-3">
              <button
                type="button"
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-4 h-4" />
              </button>
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  activeTool === 'formatter'
                    ? 'bg-blue-50 dark:bg-blue-900/30'
                    : activeTool === 'mock'
                      ? 'bg-cyan-50 dark:bg-cyan-900/30'
                      : 'bg-gray-100 dark:bg-gray-800'
                }`}
              >
                {(() => {
                  const Icon = (Icons as any)[activeToolMeta.icon] || Icons.Box;
                  return <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
                })()}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold leading-tight">
                  {getToolName(activeToolMeta, lang)}
                </h2>
                <p className="text-xs text-gray-400 leading-tight">
                  {getToolDesc(activeToolMeta, lang)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleFavorite(activeToolMeta.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  favoriteSet.has(activeToolMeta.id)
                    ? 'border-amber-300 bg-amber-50 text-amber-600 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-amber-300 hover:text-amber-500'
                }`}
                title={
                  favoriteSet.has(activeToolMeta.id)
                    ? lang === 'zh'
                      ? '取消收藏'
                      : 'Unfavorite'
                    : lang === 'zh'
                      ? '收藏到顶部'
                      : 'Pin to favorites'
                }
              >
                <Star
                  className={`w-4 h-4 ${favoriteSet.has(activeToolMeta.id) ? 'fill-current' : ''}`}
                />
                {lang === 'zh' ? '收藏' : 'Favorite'}
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden p-3 sm:p-4 lg:p-5">
              <ActiveComponent />
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

export default App;
