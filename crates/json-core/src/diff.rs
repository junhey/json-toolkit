use crate::error::JsonResult;
use serde::{Deserialize, Serialize};

/// Type of diff change
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DiffType {
    /// Key exists in both but values differ
    Modified,
    /// Key only in left (removed)
    Removed,
    /// Key only in right (added)
    Added,
    /// Values are identical
    Same,
}

/// A single diff entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiffResult {
    pub diff_type: DiffType,
    pub path: String,
    pub left_value: Option<String>,
    pub right_value: Option<String>,
}

/// Diff two JSON strings
pub fn diff_json(left: &str, right: &str) -> JsonResult<Vec<DiffResult>> {
    let left_val: serde_json::Value = serde_json::from_str(left)?;
    let right_val: serde_json::Value = serde_json::from_str(right)?;

    let mut results = Vec::new();
    diff_values(&left_val, &right_val, "$", &mut results);
    Ok(results)
}

fn diff_values(
    left: &serde_json::Value,
    right: &serde_json::Value,
    path: &str,
    results: &mut Vec<DiffResult>,
) {
    match (left, right) {
        (serde_json::Value::Object(l), serde_json::Value::Object(r)) => {
            // Collect all keys
            let mut all_keys: std::collections::BTreeSet<String> = std::collections::BTreeSet::new();
            all_keys.extend(l.keys().cloned());
            all_keys.extend(r.keys().cloned());

            for key in all_keys {
                let child_path = format!("{}.{}", path, key);
                match (l.get(&key), r.get(&key)) {
                    (Some(lv), Some(rv)) => {
                        diff_values(lv, rv, &child_path, results);
                    }
                    (Some(lv), None) => {
                        results.push(DiffResult {
                            diff_type: DiffType::Removed,
                            path: child_path,
                            left_value: Some(value_to_string(lv)),
                            right_value: None,
                        });
                    }
                    (None, Some(rv)) => {
                        results.push(DiffResult {
                            diff_type: DiffType::Added,
                            path: child_path,
                            left_value: None,
                            right_value: Some(value_to_string(rv)),
                        });
                    }
                    (None, None) => {}
                }
            }
        }
        (serde_json::Value::Array(l), serde_json::Value::Array(r)) => {
            let max_len = l.len().max(r.len());
            for i in 0..max_len {
                let child_path = format!("{}[{}]", path, i);
                match (l.get(i), r.get(i)) {
                    (Some(lv), Some(rv)) => {
                        diff_values(lv, rv, &child_path, results);
                    }
                    (Some(lv), None) => {
                        results.push(DiffResult {
                            diff_type: DiffType::Removed,
                            path: child_path,
                            left_value: Some(value_to_string(lv)),
                            right_value: None,
                        });
                    }
                    (None, Some(rv)) => {
                        results.push(DiffResult {
                            diff_type: DiffType::Added,
                            path: child_path,
                            left_value: None,
                            right_value: Some(value_to_string(rv)),
                        });
                    }
                    (None, None) => {}
                }
            }
        }
        (l, r) => {
            if l == r {
                results.push(DiffResult {
                    diff_type: DiffType::Same,
                    path: path.to_string(),
                    left_value: Some(value_to_string(l)),
                    right_value: Some(value_to_string(r)),
                });
            } else {
                results.push(DiffResult {
                    diff_type: DiffType::Modified,
                    path: path.to_string(),
                    left_value: Some(value_to_string(l)),
                    right_value: Some(value_to_string(r)),
                });
            }
        }
    }
}

fn value_to_string(v: &serde_json::Value) -> String {
    match v {
        serde_json::Value::String(s) => format!("\"{}\"", s),
        other => other.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_diff_identical() {
        let left = r#"{"a":1,"b":2}"#;
        let right = r#"{"a":1,"b":2}"#;
        let results = diff_json(left, right).unwrap();
        let modified: Vec<_> = results.iter().filter(|r| !matches!(r.diff_type, DiffType::Same)).collect();
        assert!(modified.is_empty());
    }

    #[test]
    fn test_diff_modified() {
        let left = r#"{"a":1}"#;
        let right = r#"{"a":2}"#;
        let results = diff_json(left, right).unwrap();
        let modified: Vec<_> = results
            .iter()
            .filter(|r| matches!(r.diff_type, DiffType::Modified))
            .collect();
        assert_eq!(modified.len(), 1);
        assert_eq!(modified[0].path, "$.a");
    }

    #[test]
    fn test_diff_added_removed() {
        let left = r#"{"a":1,"b":2}"#;
        let right = r#"{"a":1,"c":3}"#;
        let results = diff_json(left, right).unwrap();
        let added: Vec<_> = results.iter().filter(|r| matches!(r.diff_type, DiffType::Added)).collect();
        let removed: Vec<_> = results.iter().filter(|r| matches!(r.diff_type, DiffType::Removed)).collect();
        assert_eq!(added.len(), 1);
        assert_eq!(removed.len(), 1);
        assert_eq!(added[0].path, "$.c");
        assert_eq!(removed[0].path, "$.b");
    }

    #[test]
    fn test_diff_arrays() {
        let left = r#"[1,2,3]"#;
        let right = r#"[1,2,4,5]"#;
        let results = diff_json(left, right).unwrap();
        let modified: Vec<_> = results
            .iter()
            .filter(|r| matches!(r.diff_type, DiffType::Modified))
            .collect();
        let added: Vec<_> = results.iter().filter(|r| matches!(r.diff_type, DiffType::Added)).collect();
        assert_eq!(modified.len(), 1);
        assert_eq!(added.len(), 1);
    }
}
