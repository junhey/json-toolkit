import { useState } from 'react';
import { useStore } from '../store';
import { t } from '../lib/i18n';
import { getAdapter } from '../lib/adapter';
import { ShieldCheck, ShieldX, Zap } from 'lucide-react';
import { JsonCodeEditor } from '../components/JsonCodeEditor';

export function ValidatorTool() {
  const { lang, theme } = useStore();
  const [input, setInput] = useState('');
  const [schema, setSchema] = useState('');
  const [errors, setErrors] = useState<string[] | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const process = async () => {
    if (!input.trim() || !schema.trim()) return;
    setError(null);
    try {
      const result = await getAdapter().validateSchema(input, schema);
      setErrors(result);
      setIsValid(result.length === 0);
    } catch (e: any) {
      setError(e.toString().replace(/^Error:\s*/, ''));
      setErrors(null);
      setIsValid(null);
    }
  };

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center gap-2">
        <button
          onClick={process}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Zap className="w-4 h-4" />
          {t(lang, 'process')}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
        <div className="flex flex-col min-h-0">
          <label className="text-xs font-medium text-gray-500 mb-1.5">{t(lang, 'input')} (JSON)</label>
          <JsonCodeEditor
            value={input}
            onChange={setInput}
            isDark={isDark}
            placeholder="JSON to validate..."
          />
        </div>
        <div className="flex flex-col min-h-0">
          <label className="text-xs font-medium text-gray-500 mb-1.5">{t(lang, 'schema')} (JSON Schema)</label>
          <JsonCodeEditor
            value={schema}
            onChange={setSchema}
            isDark={isDark}
            placeholder="JSON Schema..."
          />
        </div>
      </div>

      <div className="min-h-0">
        {error ? (
          <div className="p-3 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-600 text-sm">
            {error}
          </div>
        ) : isValid !== null ? (
          isValid ? (
            <div className="p-4 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-600 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              <span className="font-medium">{t(lang, 'valid')} ✓</span>
            </div>
          ) : (
            <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 overflow-auto max-h-56">
              <div className="p-3 flex items-center gap-2 text-red-600 font-medium border-b border-red-200 dark:border-red-800">
                <ShieldX className="w-5 h-5" />
                {t(lang, 'invalid')} ({errors?.length} errors)
              </div>
              <div className="divide-y divide-red-100 dark:divide-red-900/30">
                {errors?.map((err, i) => (
                  <div key={i} className="px-3 py-2 text-sm text-red-600 dark:text-red-400 code-font break-all">
                    {err}
                  </div>
                ))}
              </div>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
