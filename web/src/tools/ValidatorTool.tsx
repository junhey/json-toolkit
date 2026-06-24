import { useState } from 'react';
import { useStore } from '../store';
import { t } from '../lib/i18n';
import { getAdapter } from '../lib/adapter';
import { ShieldCheck, ShieldX, Zap } from 'lucide-react';

export function ValidatorTool() {
  const { lang } = useStore();
  const [input, setInput] = useState('');
  const [schema, setSchema] = useState('');
  const [errors, setErrors] = useState<string[] | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        <button onClick={process} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
          <Zap className="w-4 h-4" />
          {t(lang, 'process')}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
        <div className="flex flex-col min-h-0">
          <label className="text-xs font-medium text-gray-500 mb-1">{t(lang, 'input')} (JSON)</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 code-font resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
            spellCheck={false}
            placeholder="JSON to validate..."
          />
        </div>
        <div className="flex flex-col min-h-0">
          <label className="text-xs font-medium text-gray-500 mb-1">{t(lang, 'schema')} (JSON Schema)</label>
          <textarea
            value={schema}
            onChange={(e) => setSchema(e.target.value)}
            className="flex-1 w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 code-font resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
            spellCheck={false}
            placeholder="JSON Schema..."
          />
        </div>
      </div>
      <div className="min-h-0">
        {error ? (
          <div className="p-3 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-600 text-sm">
            {error}
          </div>
        ) : isValid !== null && (
          isValid ? (
            <div className="p-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-600 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              <span className="font-medium">{t(lang, 'valid')} ✓</span>
            </div>
          ) : (
            <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 overflow-auto max-h-48">
              <div className="p-3 flex items-center gap-2 text-red-600 font-medium border-b border-red-200 dark:border-red-800">
                <ShieldX className="w-5 h-5" />
                {t(lang, 'invalid')} ({errors?.length} errors)
              </div>
              <div className="divide-y divide-red-100 dark:divide-red-900/30">
                {errors?.map((err, i) => (
                  <div key={i} className="px-3 py-2 text-sm text-red-600 dark:text-red-400 code-font">
                    {err}
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
