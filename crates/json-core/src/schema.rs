use crate::error::{JsonError, JsonResult};

/// Validate JSON against a JSON Schema
/// Returns a list of validation error messages (empty if valid)
pub fn validate_schema(input: &str, schema: &str) -> JsonResult<Vec<String>> {
    let json_value: serde_json::Value = serde_json::from_str(input)?;
    let schema_value: serde_json::Value = serde_json::from_str(schema)?;

    let compiled = jsonschema::JSONSchema::compile(&schema_value)
        .map_err(|e| JsonError::Schema {
            message: format!("Failed to compile schema: {}", e),
            path: "$".into(),
        })?;

    let mut errors = Vec::new();

    if let Err(err) = compiled.validate(&json_value) {
        for e in err {
            errors.push(format!("{}: {}", e.instance_path, e));
        }
    }

    Ok(errors)
}

/// Check if JSON is valid against schema (returns true/false)
pub fn is_valid(input: &str, schema: &str) -> JsonResult<bool> {
    let errors = validate_schema(input, schema)?;
    Ok(errors.is_empty())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_schema() {
        let json = r#"{"name":"Alice","age":30}"#;
        let schema = r#"{
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "age": {"type": "number"}
            },
            "required": ["name", "age"]
        }"#;
        let errors = validate_schema(json, schema).unwrap();
        assert!(errors.is_empty());
    }

    #[test]
    fn test_invalid_schema_missing_required() {
        let json = r#"{"name":"Alice"}"#;
        let schema = r#"{
            "type": "object",
            "required": ["name", "age"]
        }"#;
        let errors = validate_schema(json, schema).unwrap();
        assert!(!errors.is_empty());
    }

    #[test]
    fn test_invalid_type() {
        let json = r#"{"age":"thirty"}"#;
        let schema = r#"{
            "type": "object",
            "properties": {
                "age": {"type": "number"}
            }
        }"#;
        let errors = validate_schema(json, schema).unwrap();
        assert!(!errors.is_empty());
    }

    #[test]
    fn test_invalid_schema_definition() {
        let json = r#"{}"#;
        let schema = r#"{"type": "invalid_type"}"#;
        let result = validate_schema(json, schema);
        assert!(result.is_err());
    }
}
