export type CodecMode = 'encode' | 'decode';

export interface CodecMethod {
  id: string;
  mode: CodecMode;
  nameZh: string;
  nameEn: string;
  hintZh?: string;
  hintEn?: string;
}

/** Encode methods shown in the conversion picker (12 + base64url bonus kept out of count badge) */
export const ENCODE_METHODS: CodecMethod[] = [
  { id: 'unicode', mode: 'encode', nameZh: 'Unicode编码', nameEn: 'Unicode Encode', hintZh: '以 \\u 开头', hintEn: 'Starts with \\u' },
  { id: 'url', mode: 'encode', nameZh: 'URL编码', nameEn: 'URL Encode', hintZh: '以 % 开头', hintEn: 'Starts with %' },
  { id: 'utf16', mode: 'encode', nameZh: 'UTF16编码', nameEn: 'UTF16 Encode', hintZh: '以 \\x 开头', hintEn: 'Starts with \\x' },
  { id: 'base64', mode: 'encode', nameZh: 'Base64编码', nameEn: 'Base64 Encode' },
  { id: 'md5', mode: 'encode', nameZh: 'MD5计算', nameEn: 'MD5 Hash' },
  { id: 'hex', mode: 'encode', nameZh: '十六进制编码', nameEn: 'Hex Encode' },
  { id: 'sha1', mode: 'encode', nameZh: 'Sha1加密', nameEn: 'SHA1 Hash' },
  { id: 'html', mode: 'encode', nameZh: 'HTML普通编码', nameEn: 'HTML Encode' },
  { id: 'html_deep', mode: 'encode', nameZh: 'HTML深度编码', nameEn: 'HTML Deep Encode' },
  { id: 'html_to_js', mode: 'encode', nameZh: 'HTML转JS', nameEn: 'HTML to JS' },
  { id: 'gzip', mode: 'encode', nameZh: 'Gzip压缩', nameEn: 'Gzip Compress' },
  { id: 'escape', mode: 'encode', nameZh: '字符串转义', nameEn: 'String Escape' },
];

/** Decode / parse methods */
export const DECODE_METHODS: CodecMethod[] = [
  { id: 'unicode', mode: 'decode', nameZh: 'Unicode解码', nameEn: 'Unicode Decode', hintZh: '以 \\u 开头', hintEn: 'Starts with \\u' },
  { id: 'url', mode: 'decode', nameZh: 'URL解码', nameEn: 'URL Decode', hintZh: '以 % 开头', hintEn: 'Starts with %' },
  { id: 'utf16', mode: 'decode', nameZh: 'UTF16解码', nameEn: 'UTF16 Decode', hintZh: '以 \\x 开头', hintEn: 'Starts with \\x' },
  { id: 'base64', mode: 'decode', nameZh: 'Base64解码', nameEn: 'Base64 Decode' },
  { id: 'hex_ascii', mode: 'decode', nameZh: 'Hex/ASCII解码', nameEn: 'Hex/ASCII Decode' },
  { id: 'proto_hex', mode: 'decode', nameZh: 'Proto Hex解析', nameEn: 'Proto Hex Parse', hintZh: '转JSON', hintEn: 'to JSON' },
  { id: 'html_entity', mode: 'decode', nameZh: 'HTML实体解码', nameEn: 'HTML Entity Decode' },
  { id: 'url_params', mode: 'decode', nameZh: 'URL参数解析', nameEn: 'URL Params Parse' },
  { id: 'jwt', mode: 'decode', nameZh: 'JWT解码', nameEn: 'JWT Decode' },
  { id: 'cookie', mode: 'decode', nameZh: 'Cookie格式化', nameEn: 'Cookie Format' },
  { id: 'gzip', mode: 'decode', nameZh: 'Gzip解压', nameEn: 'Gzip Decompress' },
  { id: 'escape', mode: 'decode', nameZh: '字符串去转义', nameEn: 'String Unescape' },
];

export const ALL_CODEC_METHODS = [...ENCODE_METHODS, ...DECODE_METHODS];

export function getMethodLabel(method: CodecMethod, lang: 'zh' | 'en'): string {
  return lang === 'zh' ? method.nameZh : method.nameEn;
}

export function getMethodHint(method: CodecMethod, lang: 'zh' | 'en'): string | undefined {
  return lang === 'zh' ? method.hintZh : method.hintEn;
}

export function detectEncoding(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (trimmed.split('.').length === 3 && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/.test(trimmed)) {
    return 'jwt';
  }
  if (/\\u[0-9a-fA-F]{4}/.test(trimmed)) return 'unicode';
  if (/\\x[0-9a-fA-F]{2}/.test(trimmed)) return 'utf16';
  if (/&(#\d+|#x[0-9a-fA-F]+|[a-z]+);/i.test(trimmed)) return 'html_entity';
  if (/%[0-9a-fA-F]{2}/.test(trimmed) && trimmed.includes('=')) return 'url_params';
  if (/%[0-9a-fA-F]{2}/.test(trimmed)) return 'url';
  if (/^[0-9a-fA-F\s:]+$/.test(trimmed) && trimmed.replace(/\s|:/g, '').length >= 8) return 'hex_ascii';
  if (/^[A-Za-z0-9+/=\s]+$/.test(trimmed) && trimmed.length > 8) return 'base64';

  return null;
}
