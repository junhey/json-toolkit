use crate::error::JsonResult;

/// Minify/compress JSON string (remove all whitespace)
pub fn minify_json(input: &str) -> JsonResult<String> {
    let value: serde_json::Value = serde_json::from_str(input)?;
    let result = serde_json::to_string(&value)?;
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_minify_basic() {
        let input = r#"{
  "a": 1,
  "b": [1, 2, 3]
}"#;
        let result = minify_json(input).unwrap();
        assert_eq!(result, r#"{"a":1,"b":[1,2,3]}"#);
    }

    #[test]
    fn test_minify_already_minified() {
        let input = r#"{"a":1}"#;
        let result = minify_json(input).unwrap();
        assert_eq!(result, r#"{"a":1}"#);
    }

    #[test]
    fn test_minify_invalid() {
        let result = minify_json("{invalid}");
        assert!(result.is_err());
    }
}
