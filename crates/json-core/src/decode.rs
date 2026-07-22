use crate::error::{JsonError, JsonResult};
use base64::Engine;
use flate2::read::{GzDecoder, GzEncoder};
use flate2::Compression;
use md5::{Digest, Md5};
use serde::{Deserialize, Serialize};
use sha1::Sha1;
use std::io::Read;

/// Encoding / transform type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Encoding {
    // Bidirectional
    Unicode,
    Url,
    Utf16,
    Base64,
    Base64Url,
    Hex,
    Html,
    HtmlDeep,
    HtmlToJs,
    Gzip,
    Escape,
    // Encode-only
    Md5,
    Sha1,
    // Decode-only / parse
    HexAscii,
    ProtoHex,
    HtmlEntity,
    UrlParams,
    Jwt,
    Cookie,
}

impl Encoding {
    pub fn from_id(id: &str) -> Option<Self> {
        match id {
            "unicode" => Some(Self::Unicode),
            "url" => Some(Self::Url),
            "utf16" => Some(Self::Utf16),
            "base64" => Some(Self::Base64),
            "base64url" => Some(Self::Base64Url),
            "hex" | "hexadecimal" => Some(Self::Hex),
            "html" | "html_normal" => Some(Self::Html),
            "html_deep" => Some(Self::HtmlDeep),
            "html_to_js" => Some(Self::HtmlToJs),
            "gzip" => Some(Self::Gzip),
            "escape" => Some(Self::Escape),
            "md5" => Some(Self::Md5),
            "sha1" => Some(Self::Sha1),
            "hex_ascii" => Some(Self::HexAscii),
            "proto_hex" => Some(Self::ProtoHex),
            "html_entity" => Some(Self::HtmlEntity),
            "url_params" => Some(Self::UrlParams),
            "jwt" => Some(Self::Jwt),
            "cookie" => Some(Self::Cookie),
            "unescape" => Some(Self::Escape),
            _ => None,
        }
    }

    pub fn id(self) -> &'static str {
        match self {
            Self::Unicode => "unicode",
            Self::Url => "url",
            Self::Utf16 => "utf16",
            Self::Base64 => "base64",
            Self::Base64Url => "base64url",
            Self::Hex => "hex",
            Self::Html => "html",
            Self::HtmlDeep => "html_deep",
            Self::HtmlToJs => "html_to_js",
            Self::Gzip => "gzip",
            Self::Escape => "escape",
            Self::Md5 => "md5",
            Self::Sha1 => "sha1",
            Self::HexAscii => "hex_ascii",
            Self::ProtoHex => "proto_hex",
            Self::HtmlEntity => "html_entity",
            Self::UrlParams => "url_params",
            Self::Jwt => "jwt",
            Self::Cookie => "cookie",
        }
    }
}

fn decode_err(encoding: &str, message: impl Into<String>) -> JsonError {
    JsonError::Decode {
        message: message.into(),
        encoding: encoding.into(),
    }
}

fn maybe_pretty(decoded_str: String) -> String {
    if let Ok(value) = serde_json::from_str::<serde_json::Value>(&decoded_str) {
        serde_json::to_string_pretty(&value).unwrap_or(decoded_str)
    } else {
        decoded_str
    }
}

/// Decode / transform an encoded string
pub fn decode_json(input: &str, encoding: Encoding) -> JsonResult<String> {
    let encoding_id = encoding.id();
    match encoding {
        Encoding::Md5 | Encoding::Sha1 | Encoding::HtmlToJs => {
            Err(decode_err(
                encoding_id,
                format!("{} is encode-only", encoding_id),
            ))
        }
        Encoding::Base64 => {
            let bytes = base64::engine::general_purpose::STANDARD
                .decode(input.trim())
                .map_err(|e| decode_err("base64", e.to_string()))?;
            let s = String::from_utf8(bytes).map_err(|e| decode_err("base64", e.to_string()))?;
            Ok(maybe_pretty(s))
        }
        Encoding::Base64Url => {
            let bytes = base64::engine::general_purpose::URL_SAFE
                .decode(input.trim())
                .or_else(|_| {
                    base64::engine::general_purpose::URL_SAFE_NO_PAD.decode(input.trim())
                })
                .map_err(|e| decode_err("base64url", e.to_string()))?;
            let s = String::from_utf8(bytes).map_err(|e| decode_err("base64url", e.to_string()))?;
            Ok(maybe_pretty(s))
        }
        Encoding::Url => {
            let s = urlencoding::decode(input)
                .map_err(|e| decode_err("url", e.to_string()))?
                .into_owned();
            Ok(maybe_pretty(s))
        }
        Encoding::Unicode => Ok(maybe_pretty(decode_unicode_escapes(input))),
        Encoding::Utf16 => Ok(maybe_pretty(decode_utf16_escapes(input)?)),
        Encoding::Hex | Encoding::HexAscii => {
            let bytes = decode_hex_bytes(input)?;
            let s = String::from_utf8(bytes).map_err(|e| decode_err("hex", e.to_string()))?;
            Ok(maybe_pretty(s))
        }
        Encoding::Gzip => {
            let cleaned = input.trim().replace(['\n', '\r', ' '], "");
            let compressed = base64::engine::general_purpose::STANDARD
                .decode(&cleaned)
                .or_else(|_| decode_hex_bytes(&cleaned))
                .map_err(|e| decode_err("gzip", format!("invalid gzip payload: {}", e)))?;
            let mut decoder = GzDecoder::new(&compressed[..]);
            let mut out = String::new();
            decoder
                .read_to_string(&mut out)
                .map_err(|e| decode_err("gzip", e.to_string()))?;
            Ok(maybe_pretty(out))
        }
        Encoding::Escape => Ok(maybe_pretty(unescape_string(input)?)),
        Encoding::Html | Encoding::HtmlDeep | Encoding::HtmlEntity => {
            Ok(maybe_pretty(decode_html_entities(input)))
        }
        Encoding::UrlParams => Ok(parse_url_params(input)?),
        Encoding::Jwt => Ok(decode_jwt(input)?),
        Encoding::Cookie => Ok(format_cookie(input)?),
        Encoding::ProtoHex => Ok(parse_proto_hex(input)?),
    }
}

/// Encode / transform a string
pub fn encode_json(input: &str, encoding: Encoding) -> JsonResult<String> {
    let encoding_id = encoding.id();
    match encoding {
        Encoding::HexAscii
        | Encoding::ProtoHex
        | Encoding::HtmlEntity
        | Encoding::UrlParams
        | Encoding::Jwt
        | Encoding::Cookie => Err(decode_err(
            encoding_id,
            format!("{} is decode-only", encoding_id),
        )),
        Encoding::Base64 => Ok(base64::engine::general_purpose::STANDARD.encode(input.as_bytes())),
        Encoding::Base64Url => {
            Ok(base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(input.as_bytes()))
        }
        Encoding::Url => Ok(urlencoding::encode(input).into_owned()),
        Encoding::Unicode => Ok(encode_unicode(input)),
        Encoding::Utf16 => Ok(encode_utf16_escapes(input)),
        Encoding::Hex => Ok(encode_hex(input.as_bytes())),
        Encoding::Md5 => {
            let mut hasher = Md5::new();
            hasher.update(input.as_bytes());
            Ok(format!("{:x}", hasher.finalize()))
        }
        Encoding::Sha1 => {
            let mut hasher = Sha1::new();
            hasher.update(input.as_bytes());
            Ok(format!("{:x}", hasher.finalize()))
        }
        Encoding::Html => Ok(encode_html_normal(input)),
        Encoding::HtmlDeep => Ok(encode_html_deep(input)),
        Encoding::HtmlToJs => Ok(html_to_js(input)),
        Encoding::Gzip => {
            let mut encoder = GzEncoder::new(input.as_bytes(), Compression::default());
            let mut compressed = Vec::new();
            encoder
                .read_to_end(&mut compressed)
                .map_err(|e| decode_err("gzip", e.to_string()))?;
            Ok(base64::engine::general_purpose::STANDARD.encode(compressed))
        }
        Encoding::Escape => Ok(escape_string(input)),
    }
}

fn encode_unicode(input: &str) -> String {
    let mut result = String::new();
    for c in input.chars() {
        if c.is_ascii() {
            result.push(c);
        } else {
            let mut buf = [0u16; 2];
            for code in c.encode_utf16(&mut buf) {
                result.push_str(&format!("\\u{:04x}", code));
            }
        }
    }
    result
}

fn decode_unicode_escapes(input: &str) -> String {
    let mut result = String::new();
    let mut chars = input.chars().peekable();

    while let Some(c) = chars.next() {
        if c == '\\' && chars.peek() == Some(&'u') {
            chars.next(); // consume 'u'
            let hex: String = chars.by_ref().take(4).collect();
            if let Ok(unit) = u16::from_str_radix(&hex, 16) {
                // Handle UTF-16 surrogate pairs: \uD83D\uDE00 → 😀
                if (0xD800..=0xDBFF).contains(&unit) {
                    let mut look = chars.clone();
                    if look.next() == Some('\\') && look.next() == Some('u') {
                        let hex2: String = look.by_ref().take(4).collect();
                        if let Ok(low) = u16::from_str_radix(&hex2, 16) {
                            if (0xDC00..=0xDFFF).contains(&low) {
                                // consume the second escape from the real iterator
                                chars.next(); // \
                                chars.next(); // u
                                for _ in 0..4 {
                                    chars.next();
                                }
                                let code =
                                    0x10000 + (((unit as u32 - 0xD800) << 10) | (low as u32 - 0xDC00));
                                if let Some(ch) = char::from_u32(code) {
                                    result.push(ch);
                                    continue;
                                }
                            }
                        }
                    }
                    result.push_str(&format!("\\u{:04x}", unit));
                } else if let Some(ch) = char::from_u32(unit as u32) {
                    result.push(ch);
                } else {
                    result.push_str(&format!("\\u{}", hex));
                }
            } else {
                result.push_str(&format!("\\u{}", hex));
            }
        } else {
            result.push(c);
        }
    }

    result
}

fn encode_utf16_escapes(input: &str) -> String {
    let mut result = String::new();
    for c in input.chars() {
        let mut buf = [0u16; 2];
        let units = c.encode_utf16(&mut buf);
        for unit in units.iter().copied() {
            let hi = (unit >> 8) as u8;
            let lo = (unit & 0xff) as u8;
            result.push_str(&format!("\\x{:02x}\\x{:02x}", hi, lo));
        }
    }
    result
}

fn decode_utf16_escapes(input: &str) -> JsonResult<String> {
    let bytes = parse_x_escapes(input)?;
    if bytes.len() % 2 != 0 {
        return Err(decode_err("utf16", "UTF-16 byte length must be even"));
    }
    let mut units = Vec::with_capacity(bytes.len() / 2);
    for chunk in bytes.chunks_exact(2) {
        units.push(u16::from_be_bytes([chunk[0], chunk[1]]));
    }
    String::from_utf16(&units).map_err(|e| decode_err("utf16", e.to_string()))
}

fn parse_x_escapes(input: &str) -> JsonResult<Vec<u8>> {
    let trimmed = input.trim();
    if trimmed.contains("\\x") || trimmed.contains("\\X") {
        let mut bytes = Vec::new();
        let mut chars = trimmed.chars().peekable();
        while let Some(c) = chars.next() {
            if c == '\\' && matches!(chars.peek(), Some('x') | Some('X')) {
                chars.next();
                let h1 = chars
                    .next()
                    .ok_or_else(|| decode_err("utf16", "incomplete \\x escape"))?;
                let h2 = chars
                    .next()
                    .ok_or_else(|| decode_err("utf16", "incomplete \\x escape"))?;
                let hex = format!("{}{}", h1, h2);
                let byte = u8::from_str_radix(&hex, 16)
                    .map_err(|_| decode_err("utf16", format!("invalid hex: {}", hex)))?;
                bytes.push(byte);
            } else if !c.is_whitespace() {
                return Err(decode_err(
                    "utf16",
                    "expected \\xHH sequences for UTF-16 decode",
                ));
            }
        }
        Ok(bytes)
    } else {
        decode_hex_bytes(trimmed)
    }
}

fn encode_hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

fn decode_hex_bytes(input: &str) -> JsonResult<Vec<u8>> {
    let cleaned: String = input
        .chars()
        .filter(|c| !c.is_whitespace() && *c != ':' && *c != '-')
        .collect();
    let cleaned = cleaned.strip_prefix("0x").unwrap_or(&cleaned);
    if cleaned.len() % 2 != 0 {
        return Err(decode_err("hex", "hex string length must be even"));
    }
    (0..cleaned.len())
        .step_by(2)
        .map(|i| {
            u8::from_str_radix(&cleaned[i..i + 2], 16)
                .map_err(|_| decode_err("hex", format!("invalid hex at {}", i)))
        })
        .collect()
}

fn encode_html_normal(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    for c in input.chars() {
        match c {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            '\'' => out.push_str("&#39;"),
            _ => out.push(c),
        }
    }
    out
}

fn encode_html_deep(input: &str) -> String {
    input
        .chars()
        .map(|c| format!("&#{};", c as u32))
        .collect()
}

fn html_to_js(input: &str) -> String {
    let escaped = input
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\n', "\\n")
        .replace('\r', "\\r")
        .replace('\t', "\\t");
    format!("document.write(\"{}\");", escaped)
}

fn decode_html_entities(input: &str) -> String {
    let mut result = String::new();
    let mut chars = input.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '&' {
            let mut entity = String::from("&");
            while let Some(&ch) = chars.peek() {
                entity.push(ch);
                chars.next();
                if ch == ';' || entity.len() > 32 {
                    break;
                }
            }
            result.push_str(&resolve_entity(&entity));
        } else {
            result.push(c);
        }
    }
    result
}

fn resolve_entity(entity: &str) -> String {
    match entity {
        "&amp;" => "&".into(),
        "&lt;" => "<".into(),
        "&gt;" => ">".into(),
        "&quot;" => "\"".into(),
        "&apos;" | "&#39;" => "'".into(),
        "&nbsp;" => " ".into(),
        _ if entity.starts_with("&#x") || entity.starts_with("&#X") => {
            let hex = entity
                .trim_start_matches("&#x")
                .trim_start_matches("&#X")
                .trim_end_matches(';');
            u32::from_str_radix(hex, 16)
                .ok()
                .and_then(char::from_u32)
                .map(|c| c.to_string())
                .unwrap_or_else(|| entity.to_string())
        }
        _ if entity.starts_with("&#") => {
            let num = entity.trim_start_matches("&#").trim_end_matches(';');
            num.parse::<u32>()
                .ok()
                .and_then(char::from_u32)
                .map(|c| c.to_string())
                .unwrap_or_else(|| entity.to_string())
        }
        _ => entity.to_string(),
    }
}

fn escape_string(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    for c in input.chars() {
        match c {
            '\\' => out.push_str("\\\\"),
            '"' => out.push_str("\\\""),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            '\u{08}' => out.push_str("\\b"),
            '\u{0c}' => out.push_str("\\f"),
            c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out
}

fn unescape_string(input: &str) -> JsonResult<String> {
    let mut result = String::new();
    // Strip surrounding quotes if present
    let s = input.trim();
    let body = if (s.starts_with('"') && s.ends_with('"') && s.len() >= 2)
        || (s.starts_with('\'') && s.ends_with('\'') && s.len() >= 2)
    {
        &s[1..s.len() - 1]
    } else {
        s
    };
    let mut chars = body.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '\\' {
            match chars.next() {
                Some('n') => result.push('\n'),
                Some('r') => result.push('\r'),
                Some('t') => result.push('\t'),
                Some('b') => result.push('\u{08}'),
                Some('f') => result.push('\u{0c}'),
                Some('\\') => result.push('\\'),
                Some('"') => result.push('"'),
                Some('\'') => result.push('\''),
                Some('u') => {
                    let hex: String = chars.by_ref().take(4).collect();
                    let code = u32::from_str_radix(&hex, 16)
                        .map_err(|_| decode_err("escape", format!("invalid \\u{}", hex)))?;
                    result.push(
                        char::from_u32(code)
                            .ok_or_else(|| decode_err("escape", format!("invalid codepoint {}", code)))?,
                    );
                }
                Some('x') => {
                    let hex: String = chars.by_ref().take(2).collect();
                    let code = u32::from_str_radix(&hex, 16)
                        .map_err(|_| decode_err("escape", format!("invalid \\x{}", hex)))?;
                    result.push(
                        char::from_u32(code)
                            .ok_or_else(|| decode_err("escape", format!("invalid codepoint {}", code)))?,
                    );
                }
                Some(other) => {
                    result.push('\\');
                    result.push(other);
                }
                None => result.push('\\'),
            }
        } else {
            result.push(c);
        }
    }
    Ok(result)
}

fn parse_url_params(input: &str) -> JsonResult<String> {
    let raw = input.trim();
    let query = if let Some(idx) = raw.find('?') {
        &raw[idx + 1..]
    } else {
        raw
    };
    let query = query.split('#').next().unwrap_or(query);
    let mut map = serde_json::Map::new();
    if !query.is_empty() {
        for pair in query.split('&') {
            if pair.is_empty() {
                continue;
            }
            let mut parts = pair.splitn(2, '=');
            let key = urlencoding::decode(parts.next().unwrap_or(""))
                .map(|s| s.into_owned())
                .unwrap_or_default();
            let value = parts
                .next()
                .map(|v| {
                    urlencoding::decode(v)
                        .map(|s| s.into_owned())
                        .unwrap_or_else(|_| v.to_string())
                })
                .unwrap_or_default();
            match map.get_mut(&key) {
                Some(serde_json::Value::Array(arr)) => {
                    arr.push(serde_json::Value::String(value));
                }
                Some(existing) => {
                    let prev = existing.clone();
                    *existing = serde_json::Value::Array(vec![prev, serde_json::Value::String(value)]);
                }
                None => {
                    map.insert(key, serde_json::Value::String(value));
                }
            }
        }
    }
    Ok(serde_json::to_string_pretty(&serde_json::Value::Object(map))?)
}

fn decode_jwt(input: &str) -> JsonResult<String> {
    let parts: Vec<&str> = input.trim().split('.').collect();
    if parts.len() < 2 {
        return Err(decode_err("jwt", "JWT must have at least header.payload"));
    }
    let header = decode_jwt_part(parts[0], "header")?;
    let payload = decode_jwt_part(parts[1], "payload")?;
    let mut obj = serde_json::Map::new();
    obj.insert("header".into(), header);
    obj.insert("payload".into(), payload);
    if parts.len() >= 3 {
        obj.insert(
            "signature".into(),
            serde_json::Value::String(parts[2].to_string()),
        );
    }
    Ok(serde_json::to_string_pretty(&serde_json::Value::Object(obj))?)
}

fn decode_jwt_part(part: &str, name: &str) -> JsonResult<serde_json::Value> {
    let padded = match part.len() % 4 {
        2 => format!("{}==", part),
        3 => format!("{}=", part),
        _ => part.to_string(),
    };
    let bytes = base64::engine::general_purpose::URL_SAFE
        .decode(&padded)
        .or_else(|_| base64::engine::general_purpose::URL_SAFE_NO_PAD.decode(part))
        .map_err(|e| decode_err("jwt", format!("invalid {} base64: {}", name, e)))?;
    let s = String::from_utf8(bytes).map_err(|e| decode_err("jwt", e.to_string()))?;
    serde_json::from_str(&s).map_err(|e| decode_err("jwt", format!("invalid {} json: {}", name, e)))
}

fn format_cookie(input: &str) -> JsonResult<String> {
    let mut map = serde_json::Map::new();
    for part in input.split(';') {
        let part = part.trim();
        if part.is_empty() {
            continue;
        }
        let mut kv = part.splitn(2, '=');
        let key = kv.next().unwrap_or("").trim().to_string();
        let value = kv.next().unwrap_or("").trim().to_string();
        map.insert(key, serde_json::Value::String(value));
    }
    Ok(serde_json::to_string_pretty(&serde_json::Value::Object(map))?)
}

/// Parse protobuf wire-format hex into a best-effort JSON object keyed by field number.
fn parse_proto_hex(input: &str) -> JsonResult<String> {
    let bytes = decode_hex_bytes(input)?;
    let value = decode_proto_message(&bytes)?;
    Ok(serde_json::to_string_pretty(&value)?)
}

fn decode_proto_message(bytes: &[u8]) -> JsonResult<serde_json::Value> {
    let mut map = serde_json::Map::new();
    let mut i = 0usize;
    while i < bytes.len() {
        let (key, ni) = read_varint(bytes, i)?;
        i = ni;
        let field = (key >> 3) as u64;
        let wire = (key & 0x7) as u8;
        let field_key = field.to_string();
        let value = match wire {
            0 => {
                let (v, ni) = read_varint(bytes, i)?;
                i = ni;
                serde_json::Value::Number(serde_json::Number::from(v))
            }
            1 => {
                if i + 8 > bytes.len() {
                    return Err(decode_err("proto_hex", "truncated fixed64"));
                }
                let v = u64::from_le_bytes(bytes[i..i + 8].try_into().unwrap());
                i += 8;
                serde_json::Value::String(format!("fixed64:{}", v))
            }
            2 => {
                let (len, ni) = read_varint(bytes, i)?;
                i = ni;
                let len = len as usize;
                if i + len > bytes.len() {
                    return Err(decode_err("proto_hex", "truncated length-delimited"));
                }
                let slice = &bytes[i..i + len];
                i += len;
                if let Ok(nested) = decode_proto_message(slice) {
                    if nested.as_object().map(|o| !o.is_empty()).unwrap_or(false) {
                        nested
                    } else if let Ok(s) = std::str::from_utf8(slice) {
                        if s.chars().all(|c| !c.is_control() || c == '\n' || c == '\t') {
                            serde_json::Value::String(s.to_string())
                        } else {
                            serde_json::Value::String(encode_hex(slice))
                        }
                    } else {
                        serde_json::Value::String(encode_hex(slice))
                    }
                } else if let Ok(s) = std::str::from_utf8(slice) {
                    serde_json::Value::String(s.to_string())
                } else {
                    serde_json::Value::String(encode_hex(slice))
                }
            }
            5 => {
                if i + 4 > bytes.len() {
                    return Err(decode_err("proto_hex", "truncated fixed32"));
                }
                let v = u32::from_le_bytes(bytes[i..i + 4].try_into().unwrap());
                i += 4;
                serde_json::Value::Number(serde_json::Number::from(v))
            }
            _ => {
                return Err(decode_err(
                    "proto_hex",
                    format!("unsupported wire type {}", wire),
                ))
            }
        };
        match map.get_mut(&field_key) {
            Some(serde_json::Value::Array(arr)) => arr.push(value),
            Some(existing) => {
                let prev = existing.clone();
                *existing = serde_json::Value::Array(vec![prev, value]);
            }
            None => {
                map.insert(field_key, value);
            }
        }
    }
    Ok(serde_json::Value::Object(map))
}

fn read_varint(bytes: &[u8], mut i: usize) -> JsonResult<(u64, usize)> {
    let mut result = 0u64;
    let mut shift = 0u32;
    loop {
        if i >= bytes.len() {
            return Err(decode_err("proto_hex", "truncated varint"));
        }
        let b = bytes[i];
        i += 1;
        result |= ((b & 0x7f) as u64) << shift;
        if b & 0x80 == 0 {
            return Ok((result, i));
        }
        shift += 7;
        if shift > 63 {
            return Err(decode_err("proto_hex", "varint too long"));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_decode_base64() {
        let input = "eyJoZWxsbyI6ICJ3b3JsZCJ9";
        let result = decode_json(input, Encoding::Base64).unwrap();
        assert!(result.contains("hello"));
        assert!(result.contains("world"));
    }

    #[test]
    fn test_decode_url() {
        let input = "%7B%22a%22%3A1%7D";
        let result = decode_json(input, Encoding::Url).unwrap();
        assert!(result.contains("\"a\""));
    }

    #[test]
    fn test_encode_base64() {
        let input = r#"{"hello": "world"}"#;
        let result = encode_json(input, Encoding::Base64).unwrap();
        assert_eq!(result, "eyJoZWxsbyI6ICJ3b3JsZCJ9");
    }

    #[test]
    fn test_decode_invalid_base64() {
        let result = decode_json("!!!not-base64!!!", Encoding::Base64);
        assert!(result.is_err());
    }

    #[test]
    fn test_md5() {
        let result = encode_json("hello", Encoding::Md5).unwrap();
        assert_eq!(result, "5d41402abc4b2a76b9719d911017c592");
    }

    #[test]
    fn test_hex_roundtrip() {
        let encoded = encode_json("Hi", Encoding::Hex).unwrap();
        assert_eq!(encoded, "4869");
        let decoded = decode_json(&encoded, Encoding::HexAscii).unwrap();
        assert_eq!(decoded, "Hi");
    }

    #[test]
    fn test_url_params() {
        let result = decode_json("a=1&b=hello%20world", Encoding::UrlParams).unwrap();
        assert!(result.contains("\"a\""));
        assert!(result.contains("hello world"));
    }

    #[test]
    fn test_cookie() {
        let result = decode_json("session=abc; path=/", Encoding::Cookie).unwrap();
        assert!(result.contains("session"));
        assert!(result.contains("abc"));
    }

    #[test]
    fn test_jwt() {
        let token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.sig";
        let result = decode_json(token, Encoding::Jwt).unwrap();
        assert!(result.contains("header"));
        assert!(result.contains("payload"));
        assert!(result.contains("HS256"));
    }

    #[test]
    fn test_gzip_roundtrip() {
        let encoded = encode_json("{\"a\":1}", Encoding::Gzip).unwrap();
        let decoded = decode_json(&encoded, Encoding::Gzip).unwrap();
        assert!(decoded.contains("\"a\""));
    }

    #[test]
    fn test_html_entity() {
        let result = decode_json("&lt;div&gt;", Encoding::HtmlEntity).unwrap();
        assert_eq!(result, "<div>");
    }

    #[test]
    fn test_escape_roundtrip() {
        let encoded = encode_json("a\nb\"c", Encoding::Escape).unwrap();
        assert!(encoded.contains("\\n"));
        let decoded = decode_json(&encoded, Encoding::Escape).unwrap();
        assert_eq!(decoded, "a\nb\"c");
    }

    #[test]
    fn test_unicode_surrogate_roundtrip() {
        let encoded = encode_json("😀hello", Encoding::Unicode).unwrap();
        assert!(encoded.contains("\\ud83d") || encoded.contains("\\uD83D"));
        let decoded = decode_json(&encoded, Encoding::Unicode).unwrap();
        assert_eq!(decoded, "😀hello");
    }

    #[test]
    fn test_utf16_roundtrip() {
        let encoded = encode_json("测A", Encoding::Utf16).unwrap();
        let decoded = decode_json(&encoded, Encoding::Utf16).unwrap();
        assert_eq!(decoded, "测A");
    }

    #[test]
    fn test_html_deep_and_entity() {
        let encoded = encode_json("<a>", Encoding::HtmlDeep).unwrap();
        assert!(encoded.contains("&#"));
        let decoded = decode_json(&encoded, Encoding::HtmlEntity).unwrap();
        assert_eq!(decoded, "<a>");
    }

    #[test]
    fn test_sha1() {
        let result = encode_json("hello", Encoding::Sha1).unwrap();
        assert_eq!(result, "aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d");
    }
}
