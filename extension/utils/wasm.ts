// WASM loader for Chrome Extension
// Copies the json-core WASM module from the shared web build

let wasmModule: any = null;

export async function initWasm(): Promise<void> {
  if (wasmModule) return;

  try {
    // In the extension, we load WASM from the web_accessible_resources
    const wasmUrl = chrome.runtime.getURL('wasm/json_core_bg.wasm');
    const jsUrl = chrome.runtime.getURL('wasm/json_core.js');

    // Dynamic import the JS glue
    const mod = await import(/* @vite-ignore */ jsUrl);
    await mod.default(wasmUrl);
    wasmModule = mod;
  } catch (e) {
    console.error('WASM load failed:', e);
    throw e;
  }
}

function ensureReady() {
  if (!wasmModule) throw new Error('WASM not initialized. Call initWasm() first.');
  return wasmModule;
}

export async function formatJson(input: string, indent: number = 2, sortKeys: boolean = false): Promise<string> {
  return ensureReady().wasm_format(input, indent, sortKeys);
}

export async function minifyJson(input: string): Promise<string> {
  return ensureReady().wasm_minify(input);
}

export async function sortJson(input: string, by: string = 'key', order: string = 'asc'): Promise<string> {
  return ensureReady().wasm_sort(input, by, order);
}

export async function decodeJson(input: string, encoding: string = 'base64'): Promise<string> {
  return ensureReady().wasm_decode(input, encoding);
}

export async function encodeJson(input: string, encoding: string = 'base64'): Promise<string> {
  return ensureReady().wasm_encode(input, encoding);
}

export async function jsonpathQuery(input: string, path: string): Promise<string> {
  return ensureReady().wasm_jsonpath(input, path);
}

export async function buildTree(input: string, maxDepth: number = 100): Promise<any> {
  const result = ensureReady().wasm_build_tree(input, maxDepth);
  return typeof result === 'string' ? JSON.parse(result) : result;
}

export async function jsonToTable(input: string): Promise<any> {
  const result = ensureReady().wasm_json_to_table(input);
  return typeof result === 'string' ? JSON.parse(result) : result;
}

export async function diffJson(left: string, right: string): Promise<any[]> {
  const result = ensureReady().wasm_diff(left, right);
  return typeof result === 'string' ? JSON.parse(result) : result;
}

export async function jsonToCsv(input: string, delim: string = ','): Promise<string> {
  return ensureReady().wasm_json_to_csv(input, delim);
}

export async function csvToJson(input: string, delim: string = ','): Promise<string> {
  return ensureReady().wasm_csv_to_json(input, delim);
}
