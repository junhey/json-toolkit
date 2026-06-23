use crate::error::{JsonError, JsonResult};

/// Query JSON using JSONPath expression
/// Returns pretty-printed JSON of the matched results
pub fn jsonpath_query(input: &str, path: &str) -> JsonResult<String> {
    let value: serde_json::Value = serde_json::from_str(input)?;

    let mut selector = jsonpath_lib::selector(&value);
    let result = selector(path).map_err(|e| JsonError::Path {
        message: e.to_string(),
    })?;

    // Convert Vec<&Value> to Value
    let result_value = serde_json::Value::Array(result.into_iter().cloned().collect());

    let pretty = serde_json::to_string_pretty(&result_value)?;
    Ok(pretty)
}

/// Query JSON and return the raw serde_json::Value
pub fn jsonpath_query_value(
    input: &str,
    path: &str,
) -> JsonResult<serde_json::Value> {
    let value: serde_json::Value = serde_json::from_str(input)?;

    let mut selector = jsonpath_lib::selector(&value);
    let result = selector(path).map_err(|e| JsonError::Path {
        message: e.to_string(),
    })?;

    // Convert Vec<&Value> to Value
    let result_value = serde_json::Value::Array(result.into_iter().cloned().collect());

    Ok(result_value)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_json() -> &'static str {
        r#"{
            "store": {
                "book": [
                    {"category": "reference", "author": "Nigel Rees", "title": "Sayings of the Century", "price": 8.95},
                    {"category": "fiction", "author": "Evelyn Waugh", "title": "Sword of Honour", "price": 12.99},
                    {"category": "fiction", "author": "Herman Melville", "title": "Moby Dick", "price": 8.99}
                ],
                "bicycle": {"color": "red", "price": 19.95}
            }
        }"#
    }

    #[test]
    fn test_jsonpath_store() {
        let result = jsonpath_query(sample_json(), "$.store.bicycle.color").unwrap();
        assert!(result.contains("red"));
    }

    #[test]
    fn test_jsonpath_all_books() {
        let result = jsonpath_query(sample_json(), "$.store.book[*].author").unwrap();
        assert!(result.contains("Nigel Rees"));
        assert!(result.contains("Evelyn Waugh"));
        assert!(result.contains("Herman Melville"));
    }

    #[test]
    fn test_jsonpath_filter() {
        let result =
            jsonpath_query(sample_json(), "$.store.book[?(@.price < 10)].title").unwrap();
        assert!(result.contains("Sayings of the Century"));
        assert!(result.contains("Moby Dick"));
    }

    #[test]
    fn test_jsonpath_invalid_path() {
        let result = jsonpath_query(sample_json(), "$.[invalid");
        assert!(result.is_err());
    }
}
