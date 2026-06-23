use crate::error::JsonResult;
use serde::{Deserialize, Serialize};

/// Type of a JSON value
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ValueType {
    Object,
    Array,
    String,
    Number,
    Boolean,
    Null,
}

impl std::fmt::Display for ValueType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ValueType::Object => write!(f, "object"),
            ValueType::Array => write!(f, "array"),
            ValueType::String => write!(f, "string"),
            ValueType::Number => write!(f, "number"),
            ValueType::Boolean => write!(f, "boolean"),
            ValueType::Null => write!(f, "null"),
        }
    }
}

/// A node in the JSON tree
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TreeNode {
    pub key: String,
    pub value_type: ValueType,
    pub value_preview: String,
    pub path: String,
    pub depth: usize,
    pub expandable: bool,
    pub children: Vec<TreeNode>,
    pub size: usize,
}

/// Build a tree structure from JSON string
pub fn build_tree(input: &str, max_depth: usize) -> JsonResult<TreeNode> {
    let value: serde_json::Value = serde_json::from_str(input)?;
    let tree = build_node("$", "root", &value, 0, max_depth);
    Ok(tree)
}

fn build_node(key: &str, path: &str, value: &serde_json::Value, depth: usize, max_depth: usize) -> TreeNode {
    let (value_type, preview, expandable, children, size) = match value {
        serde_json::Value::Object(map) => {
            let size = map.len();
            let children = if depth < max_depth {
                map.iter()
                    .map(|(k, v)| {
                        let child_path = format!("{}.{}", path, k);
                        build_node(k, &child_path, v, depth + 1, max_depth)
                    })
                    .collect()
            } else {
                vec![]
            };
            let preview = format!("{{ {} }}", size);
            (ValueType::Object, preview, size > 0, children, size)
        }
        serde_json::Value::Array(arr) => {
            let size = arr.len();
            let children = if depth < max_depth {
                arr.iter()
                    .enumerate()
                    .map(|(i, v)| {
                        let child_path = format!("{}[{}]", path, i);
                        build_node(&format!("[{}]", i), &child_path, v, depth + 1, max_depth)
                    })
                    .collect()
            } else {
                vec![]
            };
            let preview = format!("[ {} ]", size);
            (ValueType::Array, preview, size > 0, children, size)
        }
        serde_json::Value::String(s) => {
            let preview = if s.len() > 50 {
                format!("\"{}...\"", &s[..47])
            } else {
                format!("\"{}\"", s)
            };
            (ValueType::String, preview, false, vec![], 0)
        }
        serde_json::Value::Number(n) => {
            (ValueType::Number, n.to_string(), false, vec![], 0)
        }
        serde_json::Value::Bool(b) => {
            (ValueType::Boolean, b.to_string(), false, vec![], 0)
        }
        serde_json::Value::Null => {
            (ValueType::Null, "null".to_string(), false, vec![], 0)
        }
    };

    TreeNode {
        key: key.to_string(),
        value_type,
        value_preview: preview,
        path: path.to_string(),
        depth,
        expandable,
        children,
        size,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_tree_object() {
        let input = r#"{"name":"John","age":30}"#;
        let tree = build_tree(input, 10).unwrap();
        assert_eq!(tree.value_type, ValueType::Object);
        assert_eq!(tree.children.len(), 2);
        assert_eq!(tree.children[0].key, "name");
        assert_eq!(tree.children[1].key, "age");
    }

    #[test]
    fn test_build_tree_array() {
        let input = r#"[1,2,3]"#;
        let tree = build_tree(input, 10).unwrap();
        assert_eq!(tree.value_type, ValueType::Array);
        assert_eq!(tree.children.len(), 3);
    }

    #[test]
    fn test_build_tree_max_depth() {
        let input = r#"{"a":{"b":{"c":1}}}"#;
        let tree = build_tree(input, 1).unwrap();
        assert_eq!(tree.children.len(), 1);
        assert_eq!(tree.children[0].children.len(), 0); // depth limit
    }
}
