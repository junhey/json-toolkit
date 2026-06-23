use crate::error::{JsonError, JsonResult};
use serde::{Deserialize, Serialize};

/// Table data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableData {
    pub headers: Vec<String>,
    pub rows: Vec<Vec<String>>,
    pub total: usize,
}

/// Convert JSON to table view
/// Supports:
/// - Array of objects: [{"a":1,"b":2},{"a":3,"b":4}] -> table with headers [a, b]
/// - Array of arrays: [[1,2],[3,4]] -> table with headers [0, 1]
/// - Object with array values: {"a":[1,2],"b":[3,4]} -> transposed table
pub fn json_to_table(input: &str) -> JsonResult<TableData> {
    let value: serde_json::Value = serde_json::from_str(input)?;

    match &value {
        serde_json::Value::Array(arr) => {
            if arr.is_empty() {
                return Ok(TableData {
                    headers: vec![],
                    rows: vec![],
                    total: 0,
                });
            }

            // Check if array of objects
            if arr.iter().all(|v| v.is_object()) {
                array_of_objects_to_table(arr)
            } else if arr.iter().all(|v| v.is_array()) {
                array_of_arrays_to_table(arr)
            } else {
                // Array of primitives
                array_of_primitives_to_table(arr)
            }
        }
        serde_json::Value::Object(map) => {
            // Check if all values are arrays (transposed table)
            if map.values().all(|v| v.is_array()) {
                object_of_arrays_to_table(map)
            } else {
                // Single object as one-row table
                single_object_to_table(map)
            }
        }
        _ => Err(JsonError::Internal {
            message: "Cannot convert this JSON structure to a table. Expected an array or object.".into(),
        }),
    }
}

fn array_of_objects_to_table(arr: &[serde_json::Value]) -> JsonResult<TableData> {
    // Collect all unique keys as headers
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

    // Build rows
    let rows: Vec<Vec<String>> = arr
        .iter()
        .map(|item| {
            let obj = item.as_object().unwrap();
            headers
                .iter()
                .map(|h| {
                    obj.get(h)
                        .map(|v| value_to_string(v))
                        .unwrap_or_default()
                })
                .collect()
        })
        .collect();

    Ok(TableData {
        headers,
        rows,
        total: arr.len(),
    })
}

fn array_of_arrays_to_table(arr: &[serde_json::Value]) -> JsonResult<TableData> {
    let max_cols = arr
        .iter()
        .map(|v| v.as_array().unwrap().len())
        .max()
        .unwrap_or(0);

    let headers: Vec<String> = (0..max_cols).map(|i| format!("col_{}", i)).collect();

    let rows: Vec<Vec<String>> = arr
        .iter()
        .map(|v| {
            let inner = v.as_array().unwrap();
            let mut row: Vec<String> = inner.iter().map(value_to_string).collect();
            // Pad with empty strings
            while row.len() < max_cols {
                row.push(String::new());
            }
            row
        })
        .collect();

    Ok(TableData {
        headers,
        rows,
        total: arr.len(),
    })
}

fn array_of_primitives_to_table(arr: &[serde_json::Value]) -> JsonResult<TableData> {
    Ok(TableData {
        headers: vec!["value".to_string()],
        rows: arr
            .iter()
            .map(|v| vec![value_to_string(v)])
            .collect(),
        total: arr.len(),
    })
}

fn object_of_arrays_to_table(
    map: &serde_json::Map<String, serde_json::Value>,
) -> JsonResult<TableData> {
    let headers: Vec<String> = map.keys().cloned().collect();
    let max_rows = map
        .values()
        .map(|v| v.as_array().unwrap().len())
        .max()
        .unwrap_or(0);

    let rows: Vec<Vec<String>> = (0..max_rows)
        .map(|i| {
            headers
                .iter()
                .map(|h| {
                    map.get(h)
                        .and_then(|v| v.as_array())
                        .and_then(|arr| arr.get(i))
                        .map(value_to_string)
                        .unwrap_or_default()
                })
                .collect()
        })
        .collect();

    Ok(TableData {
        headers,
        rows,
        total: max_rows,
    })
}

fn single_object_to_table(map: &serde_json::Map<String, serde_json::Value>) -> JsonResult<TableData> {
    Ok(TableData {
        headers: vec!["key".to_string(), "value".to_string()],
        rows: map
            .iter()
            .map(|(k, v)| vec![k.clone(), value_to_string(v)])
            .collect(),
        total: map.len(),
    })
}

fn value_to_string(v: &serde_json::Value) -> String {
    match v {
        serde_json::Value::String(s) => s.clone(),
        serde_json::Value::Null => String::new(),
        other => other.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_array_of_objects() {
        let input = r#"[{"name":"Alice","age":30},{"name":"Bob","age":25}]"#;
        let table = json_to_table(input).unwrap();
        assert_eq!(table.headers, vec!["name", "age"]);
        assert_eq!(table.rows.len(), 2);
        assert_eq!(table.rows[0], vec!["Alice", "30"]);
    }

    #[test]
    fn test_array_of_primitives() {
        let input = r#"[1,2,3]"#;
        let table = json_to_table(input).unwrap();
        assert_eq!(table.headers, vec!["value"]);
        assert_eq!(table.rows.len(), 3);
    }

    #[test]
    fn test_single_object() {
        let input = r#"{"name":"Alice","age":30}"#;
        let table = json_to_table(input).unwrap();
        assert_eq!(table.headers, vec!["key", "value"]);
        assert_eq!(table.rows.len(), 2);
    }

    #[test]
    fn test_empty_array() {
        let input = "[]";
        let table = json_to_table(input).unwrap();
        assert_eq!(table.total, 0);
    }
}
