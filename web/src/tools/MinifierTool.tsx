import { useState } from 'react';
import { ToolShell, sampleJson } from '../components/ToolShell';
import { getAdapter } from '../lib/adapter';

export function MinifierTool() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const process = async () => {
    if (!input.trim()) return;
    setError(null);
    try {
      const result = await getAdapter().minify(input);
      setOutput(result);
    } catch (e: any) {
      setError(e.toString().replace(/^Error:\s*/, ''));
    }
  };

  return <ToolShell input={input} setInput={setInput} output={output} error={error} onProcess={process} sampleData={sampleJson} />;
}
