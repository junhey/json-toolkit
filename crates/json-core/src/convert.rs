use crate::error::JsonResult;
use serde::{Deserialize, Serialize};

/// Output delimiter format
#[derive(Debug, Clone, Copy, Deserialize, Serialize)]
pub enum Delimiter {
    Csv,
    Tsv,
}

impl Delimiter {
    fn as_char(&self) -> char {
        match self {
            Delimiter::Csv => ',',
            Delimiter::Tsv => '\t',
        }
    }

    fn name(&self) -> &'static str {
        match self {
            Delimiter::Csv => "CSV",
            Delimiter::Tsv => "TSV",
        }
    }
}

/// Convert JSON array of objects to CSV/TSV
pub fn json_to_csv(input: &str, delim: Delimiter) -> JsonResult<String> {
    let value: serde_json::Value = serde_json::from_str(input)?;

    let arr = match &value {
        serde_json::Value::Array(arr) => arr,
        _ => {
            // Wrap single object in array
            return json_to_csv(
                &serde_json::to_string(&serde_json::Value::Array(vec![value]))?,
                delim,
            );
        }
    };

    if arr.is_empty() {
        return Ok(String::new());
    }

    // Collect all unique headers
    let mut headers: Vec<String> = Vec::new();
    let mut header_set: std::collections::HashSet<String> = std::collections::HashSet::new();

    for item in arr {
        if let Some(obj) = item.as_object() {
            for key in obj.keys() {
                if header_set.insert(key.clone()) {
                    headers.push(key.clone());
                }
            }
        }
    }

    // If no objects found, try array of arrays
    if headers.is_empty() {
        if arr.iter().all(|v| v.is_array()) {
            return arrays_to_csv(arr, delim);
        }
        // Array of primitives
        return primitives_to_csv(arr, delim);
    }

    // Write CSV
    let mut output = String::new();

    // Header row
    output.push_str(&join_fields(&headers, delim));
    output.push('\n');

    // Data rows
    for item in arr {
        let obj = item.as_object();
        let row: Vec<String> = headers
            .iter()
            .map(|h| {
                obj.and_then(|o| o.get(h))
                    .map(field_value_to_string)
                    .unwrap_or_default()
            })
            .collect();
        output.push_str(&join_fields(&row, delim));
        output.push('\n');
    }

    Ok(output)
}

/// Convert CSV/TSV to JSON array of objects
pub fn csv_to_json(input: &str, delim: Delimiter) -> JsonResult<String> {
    let dch = delim.as_char();
    let lines: Vec<&str> = input.lines().filter(|l| !l.is_empty()).collect();

    if lines.is_empty() {
        return Ok("[]".to_string());
    }

    // Parse header
    let headers = parse_csv_line(lines[0], dch);

    // Parse data rows
    let mut result = Vec::new();
    for line in &lines[1..] {
        let fields = parse_csv_line(line, dch);
        let mut obj = serde_json::Map::new();
        for (i, header) in headers.iter().enumerate() {
            let value = fields.get(i).map(|s| parse_csv_value(s)).unwrap_or(serde_json::Value::Null);
            obj.insert(header.clone(), value);
        }
        result.push(serde_json::Value::Object(obj));
    }

    let json = serde_json::to_string_pretty(&result)?;
    Ok(json)
}

fn arrays_to_csv(arr: &[serde_json::Value], delim: Delimiter) -> JsonResult<String> {
    let max_cols = arr
        .iter()
        .map(|v| v.as_array().unwrap().len())
        .max()
        .unwrap_or(0);

    let mut output = String::new();

    // Header
    let headers: Vec<String> = (0..max_cols).map(|i| format!("col_{}", i)).collect();
    output.push_str(&join_fields(&headers, delim));
    output.push('\n');

    for item in arr {
        let inner = item.as_array().unwrap();
        let row: Vec<String> = (0..max_cols)
            .map(|i| {
                inner
                    .get(i)
                    .map(field_value_to_string)
                    .unwrap_or_default()
            })
            .collect();
        output.push_str(&join_fields(&row, delim));
        output.push('\n');
    }

    Ok(output)
}

fn primitives_to_csv(arr: &[serde_json::Value], delim: Delimiter) -> JsonResult<String> {
    let mut output = String::new();
    output.push_str("value\n");
    for item in arr {
        output.push_str(&join_fields(&[field_value_to_string(item)], delim));
        output.push('\n');
    }
    Ok(output)
}

fn field_value_to_string(v: &serde_json::Value) -> String {
    match v {
        serde_json::Value::String(s) => s.clone(),
        serde_json::Value::Null => String::new(),
        other => other.to_string(),
    }
}

fn join_fields(fields: &[String], delim: Delimiter) -> String {
    fields
        .iter()
        .map(|f| {
            let f = f.trim();
            // Quote if contains delimiter, quote, or newline
            if f.contains(delim.as_char()) || f.contains('"') || f.contains('\n') {
                format!("\"{}\"", f.replace('"', "\"\""))
            } else {
                f.to_string()
            }
        })
        .collect::<Vec<_>>()
        .join(delim.as_char().to_string().as_str())
}

fn parse_csv_line(line: &str, delim: char) -> Vec<String> {
    let mut fields = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;
    let mut chars = line.chars().peekable();

    while let Some(c) = chars.next() {
        if in_quotes {
            if c == '"' {
                if chars.peek() == Some(&'"') {
                    current.push('"');
                    chars.next();
                } else {
                    in_quotes = false;
                }
            } else {
                current.push(c);
            }
        } else if c == '"' {
            in_quotes = true;
        } else if c == delim {
            fields.push(current.clone());
            current.clear();
        } else {
            current.push(c);
        }
    }
    fields.push(current);
    fields
}

fn parse_csv_value(s: &str) -> serde_json::Value {
    let s = s.trim();
    if s.is_empty() {
        return serde_json::Value::Null;
    }
    // Try parsing as number
    if let Ok(n) = s.parse::<i64>() {
        return serde_json::Value::Number(n.into());
    }
    if let Ok(f) = s.parse::<f64>() {
        if let Some(n) = serde_json::Number::from_f64(f) {
            return serde_json::Value::Number(n);
        }
    }
    // Try boolean
    if s.eq_ignore_ascii_case("true") {
        return serde_json::Value::Bool(true);
    }
    if s.eq_ignore_ascii_case("false") {
        return serde_json::Value::Bool(false);
    }
    if s.eq_ignore_ascii_case("null") {
        return serde_json::Value::Null;
    }
    serde_json::Value::String(s.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_json_to_csv() {
        let input = r#"[{"name":"Alice","age":30},{"name":"Bob","age":25}]"#;
        let result = json_to_csv(input, Delimiter::Csv).unwrap();
        assert!(result.contains("name,age"));
        assert!(result.contains("Alice,30"));
        assert!(result.contains("Bob,25"));
    }

    #[test]
    fn test_json_to_tsv() {
        let input = r#"[{"a":1,"b":2}]"#;
        let result = json_to_csv(input, Delimiter::Tsv).unwrap();
        assert!(result.contains("a\tb"));
        assert!(result.contains("1\t2"));
    }

    #[test]
    fn test_csv_to_json() {
        let input = "name,age\nAlice,30\nBob,25";
        let result = csv_to_json(input, Delimiter::Csv).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed.as_array().unwrap().len(), 2);
        assert_eq!(parsed[0]["name"], "Alice");
    }

    #[test]
    fn test_csv_with_quotes() {
        let input = r#"[{"text":"hello, world"}]"#;
        let result = json_to_csv(input, Delimiter::Csv).unwrap();
        assert!(result.contains("\"hello, world\""));
    }
}
