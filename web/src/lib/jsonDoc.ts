export type JsonSeg = string | number;
export type JsonValue = unknown;

export function formatJsonPath(segs: JsonSeg[]): string {
  return segs.reduce<string>((acc, seg) => {
    if (typeof seg === 'number') return `${acc}[${seg}]`;
    if (/^[A-Za-z_][\w$]*$/.test(seg)) return `${acc}.${seg}`;
    return `${acc}[${JSON.stringify(seg)}]`;
  }, '$');
}

export function parseJsonPath(path: string): JsonSeg[] {
  const segs: JsonSeg[] = [];
  const src = path.trim();
  let i = src.startsWith('$') ? 1 : 0;
  while (i < src.length) {
    if (src[i] === '.') {
      i++;
      let id = '';
      while (i < src.length && /[\w$]/.test(src[i])) id += src[i++];
      if (id) segs.push(id);
      continue;
    }
    if (src[i] === '[') {
      i++;
      if (src[i] === '"') {
        let str = '';
        i++;
        while (i < src.length && src[i] !== '"') {
          if (src[i] === '\\') {
            str += src[i + 1] ?? '';
            i += 2;
          } else {
            str += src[i++];
          }
        }
        i++;
        if (src[i] === ']') i++;
        segs.push(str);
        continue;
      }
      let num = '';
      while (i < src.length && src[i] !== ']') num += src[i++];
      if (src[i] === ']') i++;
      segs.push(Number(num));
      continue;
    }
    i++;
  }
  return segs;
}

export function getAt(root: JsonValue, segs: JsonSeg[]): JsonValue {
  let cur: JsonValue = root;
  for (const seg of segs) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, JsonValue>)[seg as string];
  }
  return cur;
}

function clone<T>(v: T): T {
  return structuredClone(v);
}

export function deleteAt(root: JsonValue, segs: JsonSeg[]): JsonValue {
  if (segs.length === 0) return null;
  const next = clone(root);
  const parentSegs = segs.slice(0, -1);
  const last = segs[segs.length - 1];
  const parent = parentSegs.length ? getAt(next, parentSegs) : next;
  if (Array.isArray(parent) && typeof last === 'number') {
    parent.splice(last, 1);
  } else if (parent && typeof parent === 'object') {
    delete (parent as Record<string, JsonValue>)[String(last)];
  }
  return next;
}

export function setAt(root: JsonValue, segs: JsonSeg[], value: JsonValue): JsonValue {
  if (segs.length === 0) return value;
  const next = clone(root);
  let cur: any = next;
  for (let i = 0; i < segs.length - 1; i++) {
    cur = cur[segs[i] as string];
  }
  cur[segs[segs.length - 1] as string] = value;
  return next;
}

function uniqueKey(obj: Record<string, unknown>, base = 'newField'): string {
  if (!(base in obj)) return base;
  let n = 1;
  while (`${base}${n}` in obj) n++;
  return `${base}${n}`;
}

export function addChild(
  root: JsonValue,
  parentSegs: JsonSeg[],
  options: { key?: string; value: JsonValue }
): JsonValue {
  const next = clone(root);
  const parent = parentSegs.length ? getAt(next, parentSegs) : next;
  if (Array.isArray(parent)) {
    parent.push(options.value);
    return next;
  }
  if (parent && typeof parent === 'object') {
    const rec = parent as Record<string, JsonValue>;
    rec[uniqueKey(rec, options.key || 'newField')] = options.value;
    return next;
  }
  return root;
}

export function defaultValueForType(type: string): JsonValue {
  switch (type) {
    case 'string':
      return '';
    case 'number':
      return 0;
    case 'boolean':
      return true;
    case 'object':
      return {};
    case 'array':
      return [];
    default:
      return null;
  }
}

export function stringifyJson(value: JsonValue, indent = 2): string {
  return JSON.stringify(value, null, indent);
}

export function tryParseJson(text: string): { ok: true; value: JsonValue } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}
