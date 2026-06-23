use crate::error::{JsonError, JsonResult};
use base64::Engine;
use serde::{Deserialize, Serialize};

/// Encoding type for decode operation
#[derive(Debug, Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Encoding {
    Base64,
    Base64Url,
    Url,
    Unicode,
}

/// Decode an encoded JSON string
pub fn decode_json(input: &str, encoding: Encoding) -> JsonResult<String> {
    let decoded = match encoding {
        Encoding::Base64 => {
            base64::engine::general_purpose::STANDARD
                .decode(input.trim())
                .map_err(|e| JsonError::Decode {
                    message: e.to_string(),
                    encoding: "base64".into(),
                })?
        }
        Encoding::Base64Url => {
            base64::engine::general_purpose::URL_SAFE
                .decode(input.trim())
                .map_err(|e| JsonError::Decode {
                    message: e.to_string(),
                    encoding: "base64url".into(),
                })?
        }
        Encoding::Url => {
            urlencoding::decode(input)
                .map_err(|e| JsonError::Decode {
                    message: e.to_string(),
                    encoding: "url".into(),
                })?
                .into_owned()
                .into_bytes()
        }
        Encoding::Unicode => {
            // Decode \uXXXX escape sequences
            decode_unicode_escapes(input).into_bytes()
        }
    };

    let decoded_str = String::from_utf8(decoded).map_err(|e| JsonError::Decode {
        message: format!("Invalid UTF-8: {}", e),
        encoding: "base64".into(),
    })?;

    // Try to parse as JSON and re-format for readability
    if let Ok(value) = serde_json::from_str::<serde_json::Value>(&decoded_str) {
        Ok(serde_json::to_string_pretty(&value)?)
    } else {
        // Not JSON, return raw decoded string
        Ok(decoded_str)
    }
}

/// Encode a JSON string
pub fn encode_json(input: &str, encoding: Encoding) -> JsonResult<String> {
    let encoding_name = match encoding {
        Encoding::Base64 => "base64",
        Encoding::Base64Url => "base64url",
        Encoding::Url => "url",
        Encoding::Unicode => "unicode",
    };

    let encoded = match encoding {
        Encoding::Base64 => base64::engine::general_purpose::STANDARD.encode(input),
        Encoding::Base64Url => base64::engine::general_purpose::URL_SAFE.encode(input),
        Encoding::Url => urlencoding::encode(input).into_owned(),
        Encoding::Unicode => {
            // Encode non-ASCII as \uXXXX
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
    };

    Ok(encoded)
}

fn decode_unicode_escapes(input: &str) -> String {
    let mut result = String::new();
    let mut chars = input.chars().peekable();

    while let Some(c) = chars.next() {
        if c == '\\' && chars.peek() == Some(&'u') {
            chars.next(); // consume 'u'
            let hex: String = chars.by_ref().take(4).collect();
            if let Ok(code) = u32::from_str_radix(&hex, 16) {
                if let Some(ch) = char::from_u32(code) {
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
}
