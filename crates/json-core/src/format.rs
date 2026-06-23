use crate::error::{JsonError, JsonResult};
use serde::{Deserialize, Serialize};

/// Indentation style for JSON formatting
#[derive(Debug, Clone, Copy, Deserialize, Serialize)]
pub enum Indent {
    /// 2 spaces (default)
    Spaces2,
    /// 4 spaces
    Spaces4,
    /// Tab character
    Tab,
}

impl Default for Indent {
    fn default() -> Self {
        Indent::Spaces2
    }
}

impl Indent {
    fn as_str(&self) -> &'static str {
        match self {
            Indent::Spaces2 => "  ",
            Indent::Spaces4 => "    ",
            Indent::Tab => "\t",
        }
    }
}

/// Options for JSON formatting
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct FormatOptions {
    pub indent: Indent,
    pub sort_keys: bool,
    pub trailing_newline: bool,
}

impl Default for FormatOptions {
    fn default() -> Self {
        Self {
            indent: Indent::Spaces2,
            sort_keys: false,
            trailing_newline: false,
        }
    }
}

/// Format/beautify JSON string
pub fn format_json(input: &str, opts: &FormatOptions) -> JsonResult<String> {
    let mut value: serde_json::Value = serde_json::from_str(input)?;

    if opts.sort_keys {
        value = sort_value_keys(value);
    }

    // Use serde_json::to_string_pretty with custom indent
    // serde_json doesn't support custom indent directly, so we use a formatter
    let indent_str = opts.indent.as_str();
    let buf = Vec::new();
    let formatter = serde_json::ser::PrettyFormatter::with_indent(indent_str.as_bytes());
    let mut ser = serde_json::Serializer::with_formatter(buf, formatter);
    serde::Serialize::serialize(&value, &mut ser)?;
    let mut result = String::from_utf8(ser.into_inner())
        .map_err(|e| JsonError::Internal { message: e.to_string() })?;

    if opts.trailing_newline {
        result.push('\n');
    }

    Ok(result)
}

/// Recursively sort object keys
fn sort_value_keys(value: serde_json::Value) -> serde_json::Value {
    match value {
        serde_json::Value::Object(map) => {
            let mut sorted: std::collections::BTreeMap<String, serde_json::Value> =
                std::collections::BTreeMap::new();
            for (k, v) in map {
                sorted.insert(k, sort_value_keys(v));
            }
            serde_json::to_value(sorted).unwrap_or(serde_json::Value::Null)
        }
        serde_json::Value::Array(arr) => {
            serde_json::Value::Array(arr.into_iter().map(sort_value_keys).collect())
        }
        other => other,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_basic() {
        let input = r#"{"b":1,"a":2}"#;
        let result = format_json(input, &FormatOptions::default()).unwrap();
        assert_eq!(result, "{\n  \"b\": 1,\n  \"a\": 2\n}");
    }

    #[test]
    fn test_format_with_sort() {
        let input = r#"{"b":1,"a":2}"#;
        let opts = FormatOptions {
            sort_keys: true,
            ..Default::default()
        };
        let result = format_json(input, &opts).unwrap();
        assert_eq!(result, "{\n  \"a\": 2,\n  \"b\": 1\n}");
    }

    #[test]
    fn test_format_tab_indent() {
        let input = r#"{"a":1}"#;
        let opts = FormatOptions {
            indent: Indent::Tab,
            ..Default::default()
        };
        let result = format_json(input, &opts).unwrap();
        assert_eq!(result, "{\n\t\"a\": 1\n}");
    }

    #[test]
    fn test_format_invalid() {
        let input = "{invalid}";
        let result = format_json(input, &FormatOptions::default());
        assert!(result.is_err());
    }
}
