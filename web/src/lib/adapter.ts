// Platform adapter - auto-detects WASM vs Tauri

let wasmModule: any = null;
let isTauri = false;

// Detect Tauri environment
if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
  isTauri = true;
}

export async function initAdapter() {
  if (isTauri) {
    return;
  }
  try {
    wasmModule = await import('../wasm/json_core.js');
    await wasmModule.default();
  } catch (e) {
    console.warn('WASM module unavailable, using JavaScript fallback for core tools:', e);
    wasmModule = null;
  }
}

export function getAdapter() {
  if (isTauri) {
    return tauriAdapter;
  }
  if (wasmModule) {
    return createWasmAdapter(wasmModule);
  }
  return jsFallbackAdapter;
}

function sortValue(value: unknown, by: string, order: string): unknown {
  const dir = order === 'desc' ? -1 : 1;
  if (Array.isArray(value)) {
    const mapped = value.map((item) => sortValue(item, by, order));
    if (by === 'value') {
      return mapped.sort((a, b) => dir * String(a).localeCompare(String(b)));
    }
    return mapped;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(([k, v]) => [
      k,
      sortValue(v, by, order),
    ]) as [string, unknown][];
    entries.sort((a, b) => {
      const key = by === 'value' ? String(a[1]).localeCompare(String(b[1])) : a[0].localeCompare(b[0]);
      return dir * key;
    });
    return Object.fromEntries(entries);
  }
  return value;
}

function stringifyPretty(value: unknown, indent: number) {
  return JSON.stringify(value, null, indent || 2);
}

const WASM_REQUIRED = 'This action needs the WASM engine. Rebuild with `pnpm wasm:build`. / 该功能需要 WASM，请执行 pnpm wasm:build';

const jsFallbackAdapter = {
  async format(input: string, indent: number, sortKeys: boolean): Promise<string> {
    const parsed = JSON.parse(input);
    return stringifyPretty(sortKeys ? sortValue(parsed, 'key', 'asc') : parsed, indent);
  },
  async minify(input: string): Promise<string> {
    return JSON.stringify(JSON.parse(input));
  },
  async sort(input: string, by: string, order: string): Promise<string> {
    return stringifyPretty(sortValue(JSON.parse(input), by, order), 2);
  },
  async decode(input: string, encoding: string): Promise<string> {
    if (encoding === 'url') return decodeURIComponent(input.replace(/\+/g, ' '));
    if (encoding === 'base64') return new TextDecoder().decode(Uint8Array.from(atob(input), (c) => c.charCodeAt(0)));
    if (encoding === 'unicode') {
      return input.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    }
    throw new Error(WASM_REQUIRED);
  },
  async encode(input: string, encoding: string): Promise<string> {
    if (encoding === 'url') return encodeURIComponent(input);
    if (encoding === 'base64') {
      const bytes = new TextEncoder().encode(input);
      let bin = '';
      bytes.forEach((b) => (bin += String.fromCharCode(b)));
      return btoa(bin);
    }
    if (encoding === 'unicode') {
      return Array.from(input)
        .map((ch) => {
          const code = ch.charCodeAt(0);
          return code > 127 ? `\\u${code.toString(16).padStart(4, '0')}` : ch;
        })
        .join('');
    }
    throw new Error(WASM_REQUIRED);
  },
  async jsonpath(_input: string, _path: string): Promise<string> {
    throw new Error(WASM_REQUIRED);
  },
  async buildTree(_input: string, _maxDepth: number): Promise<any> {
    throw new Error(WASM_REQUIRED);
  },
  async jsonToTable(_input: string): Promise<any> {
    throw new Error(WASM_REQUIRED);
  },
  async diff(_left: string, _right: string): Promise<any[]> {
    throw new Error(WASM_REQUIRED);
  },
  async jsonToCsv(_input: string, _delim: string): Promise<string> {
    throw new Error(WASM_REQUIRED);
  },
  async csvToJson(_input: string, _delim: string): Promise<string> {
    throw new Error(WASM_REQUIRED);
  },
  async validateSchema(_input: string, _schema: string): Promise<string[]> {
    throw new Error(WASM_REQUIRED);
  },
  async generateMock(
    _template: string,
    _arraySize: number,
    _maxDepth: number,
    _seed: number | null
  ): Promise<string> {
    throw new Error(WASM_REQUIRED);
  },
};

// WASM adapter
function createWasmAdapter(wasm: any) {
  return {
    async format(input: string, indent: number, sortKeys: boolean): Promise<string> {
      return wasm.wasm_format(input, indent, sortKeys);
    },
    async minify(input: string): Promise<string> {
      return wasm.wasm_minify(input);
    },
    async sort(input: string, by: string, order: string): Promise<string> {
      return wasm.wasm_sort(input, by, order);
    },
    async decode(input: string, encoding: string): Promise<string> {
      return wasm.wasm_decode(input, encoding);
    },
    async encode(input: string, encoding: string): Promise<string> {
      return wasm.wasm_encode(input, encoding);
    },
    async jsonpath(input: string, path: string): Promise<string> {
      return wasm.wasm_jsonpath(input, path);
    },
    async buildTree(input: string, maxDepth: number): Promise<any> {
      return wasm.wasm_build_tree(input, maxDepth);
    },
    async jsonToTable(input: string): Promise<any> {
      return wasm.wasm_json_to_table(input);
    },
    async diff(left: string, right: string): Promise<any[]> {
      return wasm.wasm_diff(left, right);
    },
    async jsonToCsv(input: string, delim: string): Promise<string> {
      return wasm.wasm_json_to_csv(input, delim);
    },
    async csvToJson(input: string, delim: string): Promise<string> {
      return wasm.wasm_csv_to_json(input, delim);
    },
    async validateSchema(input: string, schema: string): Promise<string[]> {
      try {
        return await wasm.wasm_validate_schema(input, schema);
      } catch {
        return ['Schema validation is not available in this build'];
      }
    },
    async generateMock(template: string, arraySize: number, maxDepth: number, seed: number | null): Promise<string> {
      return wasm.wasm_generate_mock(template, arraySize, maxDepth, seed);
    },
  };
}

// Tauri adapter
const tauriAdapter = {
  async format(input: string, indent: number, sortKeys: boolean): Promise<string> {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('format_json', { input, indent, sortKeys });
  },
  async minify(input: string): Promise<string> {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('minify_json', { input });
  },
  async sort(input: string, by: string, order: string): Promise<string> {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('sort_json', { input, by, order });
  },
  async decode(input: string, encoding: string): Promise<string> {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('decode_json', { input, encoding });
  },
  async encode(input: string, encoding: string): Promise<string> {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('encode_json', { input, encoding });
  },
  async jsonpath(input: string, path: string): Promise<string> {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('jsonpath_query', { input, path });
  },
  async buildTree(input: string, maxDepth: number): Promise<any> {
    const { invoke } = await import('@tauri-apps/api/core');
    const result = await invoke('build_tree', { input, maxDepth });
    return typeof result === 'string' ? JSON.parse(result) : result;
  },
  async jsonToTable(input: string): Promise<any> {
    const { invoke } = await import('@tauri-apps/api/core');
    const result = await invoke('json_to_table', { input });
    return typeof result === 'string' ? JSON.parse(result) : result;
  },
  async diff(left: string, right: string): Promise<any[]> {
    const { invoke } = await import('@tauri-apps/api/core');
    const result = await invoke('diff_json', { left, right });
    return typeof result === 'string' ? JSON.parse(result) : result;
  },
  async jsonToCsv(input: string, delim: string): Promise<string> {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('json_to_csv', { input, delim });
  },
  async csvToJson(input: string, delim: string): Promise<string> {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('csv_to_json', { input, delim });
  },
  async validateSchema(input: string, schema: string): Promise<string[]> {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('validate_schema', { input, schema });
  },
  async generateMock(template: string, arraySize: number, maxDepth: number, seed: number | null): Promise<string> {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('generate_mock', { template, arraySize, maxDepth, seed });
  },
};

export type JsonToolApi = ReturnType<typeof createWasmAdapter> | typeof jsFallbackAdapter;
