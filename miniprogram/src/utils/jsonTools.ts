// JSON processing utilities for WeChat Mini Program
// Pure JS implementation (WASM not directly available in MP runtime)
// For WASM integration, see: https://developers.weixin.qq.com/miniprogram/dev/framework/client-sdk/wasm.html

export type ToolId = 'format' | 'minify' | 'sort' | 'decode' | 'jsonpath' | 'validate' | 'csv';

export interface ToolMeta {
  id: ToolId;
  name: string;
  icon: string;
  desc: string;
}

export const tools: ToolMeta[] = [
  { id: 'format', name: '格式化', icon: '{}', desc: '美化 JSON 格式' },
  { id: 'minify', name: '压缩', icon: '─', desc: '移除空白字符' },
  { id: 'sort', name: '排序', icon: '↑↓', desc: '按键名排序' },
  { id: 'decode', name: '解码', icon: '🔓', desc: 'Base64/URL 解码' },
  { id: 'jsonpath', name: 'JSONPath', icon: '$', desc: '路径查询提取' },
  { id: 'validate', name: '校验', icon: '✓', desc: 'JSON 语法校验' },
  { id: 'csv', name: 'CSV', icon: '📄', desc: '转 CSV 格式' },
];

// Format JSON with configurable indent
export function formatJson(input: string, indent: number = 2): string {
  const parsed = JSON.parse(input);
  return JSON.stringify(parsed, null, indent);
}

// Minify JSON
export function minifyJson(input: string): string {
  const parsed = JSON.parse(input);
  return JSON.stringify(parsed);
}

// Sort JSON keys recursively
export function sortJson(input: string, order: 'asc' | 'desc' = 'asc'): string {
  const parsed = JSON.parse(input);
  const sorted = sortObject(parsed, order);
  return JSON.stringify(sorted, null, 2);
}

function sortObject(obj: any, order: 'asc' | 'desc'): any {
  if (Array.isArray(obj)) {
    return obj.map((item) => sortObject(item, order));
  }
  if (obj !== null && typeof obj === 'object') {
    const keys = Object.keys(obj).sort((a, b) => {
      return order === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
    });
    const result: any = {};
    for (const key of keys) {
      result[key] = sortObject(obj[key], order);
    }
    return result;
  }
  return obj;
}

// Decode
export function decodeJson(input: string, encoding: string): string {
  switch (encoding) {
    case 'base64': {
      // Mini program base64 decode
      const decoded = base64Decode(input.trim());
      // Try to parse as JSON, if fails return raw
      try {
        JSON.parse(decoded);
        return formatJson(decoded);
      } catch {
        return decoded;
      }
    }
    case 'url': {
      const decoded = decodeURIComponent(input.trim());
      try {
        JSON.parse(decoded);
        return formatJson(decoded);
      } catch {
        return decoded;
      }
    }
    case 'unicode': {
      const decoded = input.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => {
        return String.fromCharCode(parseInt(code, 16));
      });
      return decoded;
    }
    default:
      throw new Error(`Unsupported encoding: ${encoding}`);
  }
}

// Simple base64 decode for mini program (no atob available)
function base64Decode(str: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  const cleanStr = str.replace(/[^A-Za-z0-9+/=]/g, '');

  for (let i = 0; i < cleanStr.length; i += 4) {
    const enc1 = chars.indexOf(cleanStr[i] || '=');
    const enc2 = chars.indexOf(cleanStr[i + 1] || '=');
    const enc3 = chars.indexOf(cleanStr[i + 2] || '=');
    const enc4 = chars.indexOf(cleanStr[i + 3] || '=');

    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;

    output += String.fromCharCode(chr1);
    if (enc3 !== 64) output += String.fromCharCode(chr2);
    if (enc4 !== 64) output += String.fromCharCode(chr3);
  }
  return output;
}

// Basic JSONPath query (supports $., $.., $[*], $.key)
export function jsonpathQuery(input: string, path: string): string {
  const data = JSON.parse(input);
  const result = queryPath(data, path);
  return JSON.stringify(result, null, 2);
}

function queryPath(data: any, path: string): any {
  // Normalize path
  let p = path.trim();
  if (p.startsWith('$')) p = p.substring(1);
  if (p.startsWith('.')) p = p.substring(1);

  if (!p || p === '') return data;

  // Handle recursive descent (..)
  if (p.startsWith('..')) {
    const key = p.substring(2);
    return findRecursive(data, key);
  }

  // Handle wildcard [*]
  if (p === '[*]' || p === '*') {
    return Array.isArray(data) ? data : [data];
  }

  // Handle array index [0]
  const arrayMatch = p.match(/^\[(\d+)\](.*)/);
  if (arrayMatch) {
    const idx = parseInt(arrayMatch[1]);
    const rest = arrayMatch[2];
    if (Array.isArray(data) && idx < data.length) {
      return rest ? queryPath(data[idx], rest) : data[idx];
    }
    return null;
  }

  // Handle dot notation key.key
  const dotIdx = p.indexOf('.');
  const bracketIdx = p.indexOf('[');

  let keyEnd: number;
  if (dotIdx === -1 && bracketIdx === -1) {
    keyEnd = p.length;
  } else if (dotIdx === -1) {
    keyEnd = bracketIdx;
  } else if (bracketIdx === -1) {
    keyEnd = dotIdx;
  } else {
    keyEnd = Math.min(dotIdx, bracketIdx);
  }

  const key = p.substring(0, keyEnd);
  const rest = p.substring(keyEnd);

  if (data == null) return null;
  const value = data[key];
  if (rest === '') return value;
  return queryPath(value, rest);
}

function findRecursive(data: any, key: string): any[] {
  const results: any[] = [];
  function search(obj: any) {
    if (obj === null || obj === undefined) return;
    if (Array.isArray(obj)) {
      for (const item of obj) search(item);
    } else if (typeof obj === 'object') {
      for (const k in obj) {
        if (k === key) results.push(obj[k]);
        search(obj[k]);
      }
    }
  }
  search(data);
  return results;
}

// Validate JSON
export function validateJson(input: string): { valid: boolean; error?: string } {
  try {
    JSON.parse(input);
    return { valid: true };
  } catch (e: any) {
    return { valid: false, error: e.message };
  }
}

// Convert JSON array to CSV
export function jsonToCsv(input: string, delimiter: string = ','): string {
  const data = JSON.parse(input);
  if (!Array.isArray(data)) {
    throw new Error('CSV conversion requires a JSON array');
  }
  if (data.length === 0) return '';

  // Collect all unique keys
  const keySet = new Set<string>();
  for (const item of data) {
    if (typeof item === 'object' && item !== null) {
      Object.keys(item).forEach((k) => keySet.add(k));
    }
  }
  const keys = Array.from(keySet);

  // Build CSV
  const lines: string[] = [];
  lines.push(keys.join(delimiter));

  for (const item of data) {
    const row = keys.map((k) => {
      const val = (item as any)[k];
      if (val === null || val === undefined) return '';
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      // Escape quotes
      if (str.includes(delimiter) || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    lines.push(row.join(delimiter));
  }

  return lines.join('\n');
}

// Run a tool
export function runTool(toolId: ToolId, input: string, options?: { path?: string; encoding?: string; indent?: number }): string {
  switch (toolId) {
    case 'format':
      return formatJson(input, options?.indent ?? 2);
    case 'minify':
      return minifyJson(input);
    case 'sort':
      return sortJson(input, 'asc');
    case 'decode':
      return decodeJson(input, options?.encoding ?? 'base64');
    case 'jsonpath':
      return jsonpathQuery(input, options?.path ?? '$');
    case 'validate': {
      const result = validateJson(input);
      if (result.valid) return '✓ JSON 语法正确';
      return `✗ ${result.error}`;
    }
    case 'csv':
      return jsonToCsv(input);
    default:
      throw new Error(`Unknown tool: ${toolId}`);
  }
}
