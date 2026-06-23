// Type definitions for JSON Toolkit

export type ToolCategory = 'format' | 'query' | 'convert' | 'validate';

export interface ToolMeta {
  id: string;
  nameZh: string;
  nameEn: string;
  descZh: string;
  descEn: string;
  category: ToolCategory;
  icon: string;
}

export interface TreeNode {
  key: string;
  value_type: string;
  value_preview: string;
  path: string;
  depth: number;
  expandable: boolean;
  children: TreeNode[];
  size: number;
}

export interface TableData {
  headers: string[];
  rows: string[][];
  total: number;
}

export type DiffType = 'modified' | 'removed' | 'added' | 'same';

export interface DiffResult {
  diff_type: DiffType;
  path: string;
  left_value: string | null;
  right_value: string | null;
}
