// Platform adapter - auto-detects WASM vs Tauri

let wasmModule: any = null;
let isTauri = false;

// Detect Tauri environment
if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
  isTauri = true;
}

export async function initAdapter() {
  if (isTauri) {
    // Tauri environment - no need to load WASM
    return;
  }
  // Web environment - load WASM module
  try {
    wasmModule = await import('../wasm/json_core.js');
    await wasmModule.default();
  } catch (e) {
    console.error('Failed to load WASM module:', e);
    throw e;
  }
}

export function getAdapter() {
  if (isTauri) {
    return tauriAdapter;
  }
  if (!wasmModule) {
    throw new Error('WASM module not initialized. Call initAdapter() first.');
  }
  return createWasmAdapter(wasmModule);
}

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

export type JsonToolApi = ReturnType<typeof createWasmAdapter>;
