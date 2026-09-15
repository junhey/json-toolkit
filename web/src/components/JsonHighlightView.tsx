import { type ReactNode } from 'react';
import { MinusSquare, PlusSquare } from 'lucide-react';
import type { HighlightNode } from '../lib/jsonHighlight';

interface JsonHighlightViewProps {
  tree: HighlightNode | null;
  indent?: number;
  showLineNumbers?: boolean;
  collapsed: Set<string>;
  onToggle: (path: string) => void;
  placeholder?: string;
}

function indentPad(level: number, indent: number): string {
  return '\u00a0'.repeat(Math.max(0, level) * indent);
}

function CollapseToggle({
  expanded,
  onClick,
}: {
  expanded: boolean;
  onClick: () => void;
}) {
  const Icon = expanded ? MinusSquare : PlusSquare;
  return (
    <button
      type="button"
      className={`json-hl-toggle ${expanded ? 'json-hl-toggle-minus' : 'json-hl-toggle-plus'}`}
      onClick={onClick}
      aria-label={expanded ? 'Collapse' : 'Expand'}
    >
      <Icon className="w-3 h-3" />
    </button>
  );
}

function Primitive({ node }: { node: HighlightNode }) {
  switch (node.kind) {
    case 'null':
      return <span className="json-hl-null">null</span>;
    case 'boolean':
      return <span className="json-hl-boolean">{node.value ? 'true' : 'false'}</span>;
    case 'number':
      return <span className="json-hl-number">{node.raw}</span>;
    case 'string':
      if (node.href) {
        return (
          <>
            <span className="json-hl-string">"</span>
            <a href={node.href} target="_blank" rel="noopener noreferrer" className="json-hl-link">
              {node.value}
            </a>
            <span className="json-hl-string">"</span>
          </>
        );
      }
      return <span className="json-hl-string">{JSON.stringify(node.value)}</span>;
    default:
      return null;
  }
}

function NodeView({
  node,
  path,
  indent,
  level,
  collapsed,
  onToggle,
  trailingComma,
}: {
  node: HighlightNode;
  path: string;
  indent: number;
  level: number;
  collapsed: Set<string>;
  onToggle: (path: string) => void;
  trailingComma?: boolean;
}) {
  const comma = trailingComma ? ',' : '';

  if (node.kind !== 'array' && node.kind !== 'object') {
    return (
      <span className="json-hl-line">
        <span className="json-hl-pad">{indentPad(level, indent)}</span>
        <Primitive node={node} />
        {comma}
      </span>
    );
  }

  const expanded = !collapsed.has(path);
  const isArray = node.kind === 'array';
  const size = isArray ? node.items.length : node.entries.length;
  const open = isArray ? '[' : '{';
  const close = isArray ? ']' : '}';

  if (!expanded) {
    return (
      <span className="json-hl-line">
        <span className="json-hl-pad">{indentPad(level, indent)}</span>
        <CollapseToggle expanded={false} onClick={() => onToggle(path)} />
        {isArray ? (
          <>
            Array[<span className="json-hl-number">{size}</span>]{comma}
          </>
        ) : (
          <>Object{'{...}'}{comma}</>
        )}
      </span>
    );
  }

  if (size === 0) {
    return (
      <span className="json-hl-line">
        <span className="json-hl-pad">{indentPad(level, indent)}</span>
        <CollapseToggle expanded onClick={() => onToggle(path)} />
        {open}
        {close}
        {comma}
      </span>
    );
  }

  const children: ReactNode[] = isArray
    ? node.items.map((item, index) => (
        <NodeView
          key={`${path}[${index}]`}
          node={item}
          path={`${path}[${index}]`}
          indent={indent}
          level={level + 1}
          collapsed={collapsed}
          onToggle={onToggle}
          trailingComma={index < node.items.length - 1}
        />
      ))
    : node.entries.map((entry, index) => (
        <KeyedNode
          key={`${path}.${entry.key}`}
          entryKey={entry.key}
          node={entry.value}
          path={`${path}.${entry.key}`}
          indent={indent}
          level={level + 1}
          collapsed={collapsed}
          onToggle={onToggle}
          trailingComma={index < node.entries.length - 1}
        />
      ));

  return (
    <span className="json-hl-block" data-type={isArray ? 'array' : 'object'}>
      <span className="json-hl-line">
        <span className="json-hl-pad">{indentPad(level, indent)}</span>
        <CollapseToggle expanded onClick={() => onToggle(path)} />
        {open}
      </span>
      {children}
      <span className="json-hl-line">
        <span className="json-hl-pad">{indentPad(level, indent)}</span>
        {close}
        {comma}
      </span>
    </span>
  );
}

function KeyedNode({
  entryKey,
  node,
  path,
  indent,
  level,
  collapsed,
  onToggle,
  trailingComma,
}: {
  entryKey: string;
  node: HighlightNode;
  path: string;
  indent: number;
  level: number;
  collapsed: Set<string>;
  onToggle: (path: string) => void;
  trailingComma: boolean;
}) {
  const comma = trailingComma ? ',' : '';
  const keySpan = <span className="json-hl-key">{JSON.stringify(entryKey)}</span>;
  const colon = (
    <>
      :<span className="json-hl-nbsp">&nbsp;</span>
    </>
  );

  if (node.kind !== 'array' && node.kind !== 'object') {
    return (
      <span className="json-hl-line">
        <span className="json-hl-pad">{indentPad(level, indent)}</span>
        {keySpan}
        {colon}
        <Primitive node={node} />
        {comma}
      </span>
    );
  }

  const expanded = !collapsed.has(path);
  const isArray = node.kind === 'array';
  const size = isArray ? node.items.length : node.entries.length;
  const open = isArray ? '[' : '{';
  const close = isArray ? ']' : '}';

  if (!expanded) {
    return (
      <span className="json-hl-line">
        <span className="json-hl-pad">{indentPad(level, indent)}</span>
        {keySpan}
        {colon}
        <CollapseToggle expanded={false} onClick={() => onToggle(path)} />
        {isArray ? (
          <>
            Array[<span className="json-hl-number">{size}</span>]{comma}
          </>
        ) : (
          <>Object{'{...}'}{comma}</>
        )}
      </span>
    );
  }

  if (size === 0) {
    return (
      <span className="json-hl-line">
        <span className="json-hl-pad">{indentPad(level, indent)}</span>
        {keySpan}
        {colon}
        <CollapseToggle expanded onClick={() => onToggle(path)} />
        {open}
        {close}
        {comma}
      </span>
    );
  }

  const children: ReactNode[] = isArray
    ? node.items.map((item, index) => (
        <NodeView
          key={`${path}[${index}]`}
          node={item}
          path={`${path}[${index}]`}
          indent={indent}
          level={level + 1}
          collapsed={collapsed}
          onToggle={onToggle}
          trailingComma={index < node.items.length - 1}
        />
      ))
    : node.entries.map((entry, index) => (
        <KeyedNode
          key={`${path}.${entry.key}`}
          entryKey={entry.key}
          node={entry.value}
          path={`${path}.${entry.key}`}
          indent={indent}
          level={level + 1}
          collapsed={collapsed}
          onToggle={onToggle}
          trailingComma={index < node.entries.length - 1}
        />
      ));

  return (
    <span className="json-hl-block" data-type={isArray ? 'array' : 'object'}>
      <span className="json-hl-line">
        <span className="json-hl-pad">{indentPad(level, indent)}</span>
        {keySpan}
        {colon}
        <CollapseToggle expanded onClick={() => onToggle(path)} />
        {open}
      </span>
      {children}
      <span className="json-hl-line">
        <span className="json-hl-pad">{indentPad(level, indent)}</span>
        {close}
        {comma}
      </span>
    </span>
  );
}

export function JsonHighlightView({
  tree,
  indent = 2,
  showLineNumbers = true,
  collapsed,
  onToggle,
  placeholder,
}: JsonHighlightViewProps) {
  if (!tree) {
    return (
      <div className="json-hl-view json-hl-empty flex-1 min-h-0">
        <span className="text-gray-400 text-sm">{placeholder}</span>
      </div>
    );
  }

  return (
    <div className={`json-hl-view flex-1 min-h-0 ${showLineNumbers ? 'json-hl-with-lines' : ''}`}>
      <div className="json-hl-content">
        <NodeView
          node={tree}
          path="$"
          indent={indent}
          level={0}
          collapsed={collapsed}
          onToggle={onToggle}
        />
      </div>
    </div>
  );
}
