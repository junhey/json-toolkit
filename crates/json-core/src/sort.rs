use crate::error::JsonResult;
use serde::{Deserialize, Serialize};

/// Sort by key or value
#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq)]
pub enum SortBy {
    Key,
    Value,
}

/// Sort order
#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq)]
pub enum SortOrder {
    Asc,
    Desc,
}

/// Sort JSON object keys or array values
pub fn sort_json(input: &str, by: SortBy, order: SortOrder) -> JsonResult<String> {
    let mut value: serde_json::Value = serde_json::from_str(input)?;
    value = sort_value(value, by, order);
    let result = serde_json::to_string_pretty(&value)?;
    Ok(result)
}

fn sort_value(value: serde_json::Value, by: SortBy, order: SortOrder) -> serde_json::Value {
    match value {
        serde_json::Value::Object(map) => {
            let mut pairs: Vec<(String, serde_json::Value)> = map.into_iter().collect();

            match by {
                SortBy::Key => {
                    pairs.sort_by(|a, b| {
                        let cmp = a.0.cmp(&b.0);
                        if order == SortOrder::Desc {
                            cmp.reverse()
                        } else {
                            cmp
                        }
                    });
                }
                SortBy::Value => {
                    pairs.sort_by(|a, b| {
                        let cmp = compare_values(&a.1, &b.1);
                        if order == SortOrder::Desc {
                            cmp.reverse()
                        } else {
                            cmp
                        }
                    });
                }
            }

            let mut sorted = serde_json::Map::new();
            for (k, v) in pairs {
                sorted.insert(k, sort_value(v, by, order));
            }
            serde_json::Value::Object(sorted)
        }
        serde_json::Value::Array(arr) => {
            let mut sorted: Vec<serde_json::Value> =
                arr.into_iter().map(|v| sort_value(v, by, order)).collect();

            if by == SortBy::Value {
                sorted.sort_by(|a, b| {
                    let cmp = compare_values(a, b);
                    if order == SortOrder::Desc {
                        cmp.reverse()
                    } else {
                        cmp
                    }
                });
            }

            serde_json::Value::Array(sorted)
        }
        other => other,
    }
}

fn compare_values(a: &serde_json::Value, b: &serde_json::Value) -> std::cmp::Ordering {
    match (a, b) {
        (serde_json::Value::Number(a), serde_json::Value::Number(b)) => {
            let af = a.as_f64().unwrap_or(0.0);
            let bf = b.as_f64().unwrap_or(0.0);
            af.partial_cmp(&bf).unwrap_or(std::cmp::Ordering::Equal)
        }
        (serde_json::Value::String(a), serde_json::Value::String(b)) => a.cmp(b),
        (serde_json::Value::Bool(a), serde_json::Value::Bool(b)) => a.cmp(b),
        _ => std::cmp::Ordering::Equal,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sort_by_key_asc() {
        let input = r#"{"c":1,"a":2,"b":3}"#;
        let result = sort_json(input, SortBy::Key, SortOrder::Asc).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        let keys: Vec<&str> = parsed.as_object().unwrap().keys().map(|k| k.as_str()).collect();
        assert_eq!(keys, vec!["a", "b", "c"]);
    }

    #[test]
    fn test_sort_by_key_desc() {
        let input = r#"{"a":1,"c":2,"b":3}"#;
        let result = sort_json(input, SortBy::Key, SortOrder::Desc).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        let keys: Vec<&str> = parsed.as_object().unwrap().keys().map(|k| k.as_str()).collect();
        assert_eq!(keys, vec!["c", "b", "a"]);
    }

    #[test]
    fn test_sort_array_by_value() {
        let input = r#"[3,1,2]"#;
        let result = sort_json(input, SortBy::Value, SortOrder::Asc).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        let arr: Vec<i64> = parsed.as_array().unwrap().iter().map(|v| v.as_i64().unwrap()).collect();
        assert_eq!(arr, vec![1, 2, 3]);
    }
}
