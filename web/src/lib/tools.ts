import { ToolMeta, ToolCategory } from './types';
import { t } from './i18n';
import type { Lang } from './i18n';

export const tools: ToolMeta[] = [
  {
    id: 'formatter',
    nameZh: 'JSON 格式化',
    nameEn: 'JSON Formatter',
    descZh: '美化和格式化 JSON 字符串',
    descEn: 'Beautify and format JSON',
    category: 'format',
    icon: 'AlignLeft',
  },
  {
    id: 'minifier',
    nameZh: 'JSON 压缩',
    nameEn: 'JSON Minifier',
    descZh: '压缩 JSON 移除空白字符',
    descEn: 'Compress JSON remove whitespace',
    category: 'format',
    icon: 'Minimize2',
  },
  {
    id: 'sorter',
    nameZh: 'JSON 排序',
    nameEn: 'JSON Sorter',
    descZh: '按键名或值排序 JSON',
    descEn: 'Sort JSON by key or value',
    category: 'format',
    icon: 'ArrowDownAZ',
  },
  {
    id: 'decoder',
    nameZh: '解码器',
    nameEn: 'Decoder',
    descZh: 'Base64/URL/Unicode 解码',
    descEn: 'Base64/URL/Unicode decode',
    category: 'convert',
    icon: 'Unlock',
  },
  {
    id: 'jsonpath',
    nameZh: 'JSONPath 查询',
    nameEn: 'JSONPath Query',
    descZh: '使用 JSONPath 提取数据',
    descEn: 'Extract data with JSONPath',
    category: 'query',
    icon: 'Search',
  },
  {
    id: 'tree-view',
    nameZh: '树形视图',
    nameEn: 'Tree View',
    descZh: '可折叠的 JSON 树形浏览',
    descEn: 'Collapsible JSON tree browser',
    category: 'query',
    icon: 'GitBranch',
  },
  {
    id: 'table-view',
    nameZh: '表格视图',
    nameEn: 'Table View',
    descZh: '将 JSON 转为表格展示',
    descEn: 'Convert JSON to table',
    category: 'convert',
    icon: 'Table',
  },
  {
    id: 'diff',
    nameZh: 'JSON 对比',
    nameEn: 'JSON Diff',
    descZh: '比较两个 JSON 的差异',
    descEn: 'Compare two JSON objects',
    category: 'validate',
    icon: 'GitCompare',
  },
  {
    id: 'validator',
    nameZh: 'Schema 校验',
    nameEn: 'Schema Validator',
    descZh: 'JSON Schema 验证',
    descEn: 'JSON Schema validation',
    category: 'validate',
    icon: 'ShieldCheck',
  },
  {
    id: 'converter',
    nameZh: 'CSV 转换',
    nameEn: 'CSV Converter',
    descZh: 'JSON 与 CSV/TSV 互转',
    descEn: 'Convert between JSON and CSV/TSV',
    category: 'convert',
    icon: 'FileSpreadsheet',
  },
  {
    id: 'mock',
    nameZh: 'Mock 数据',
    nameEn: 'Mock Generator',
    descZh: '根据模板生成随机 JSON 数据',
    descEn: 'Generate random JSON data from template',
    category: 'convert',
    icon: 'Dice5',
  },
];

export const categories: { id: ToolCategory; zh: string; en: string }[] = [
  { id: 'format', zh: '格式化', en: 'Format' },
  { id: 'query', zh: '查询提取', en: 'Query' },
  { id: 'convert', zh: '转换', en: 'Convert' },
  { id: 'validate', zh: '校验', en: 'Validate' },
];

export function getToolName(tool: ToolMeta, lang: Lang): string {
  return lang === 'zh' ? tool.nameZh : tool.nameEn;
}

export function getToolDesc(tool: ToolMeta, lang: Lang): string {
  return lang === 'zh' ? tool.descZh : tool.descEn;
}
