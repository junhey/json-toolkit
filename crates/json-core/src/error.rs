use serde::Serialize;

/// Unified error type for all JSON operations
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type")]
pub enum JsonError {
    /// JSON parse error
    Parse {
        message: String,
        line: Option<usize>,
        column: Option<usize>,
    },
    /// JSONPath query error
    Path { message: String },
    /// Schema validation error
    Schema { message: String, path: String },
    /// Decode error (base64, url, etc.)
    Decode { message: String, encoding: String },
    /// Internal/unexpected error
    Internal { message: String },
}

impl std::fmt::Display for JsonError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            JsonError::Parse { message, line, column } => {
                if let (Some(l), Some(c)) = (line, column) {
                    write!(f, "Parse error at line {} column {}: {}", l, c, message)
                } else {
                    write!(f, "Parse error: {}", message)
                }
            }
            JsonError::Path { message } => write!(f, "JSONPath error: {}", message),
            JsonError::Schema { message, path } => {
                write!(f, "Schema validation error at {}: {}", path, message)
            }
            JsonError::Decode { message, encoding } => {
                write!(f, "Decode error ({}): {}", encoding, message)
            }
            JsonError::Internal { message } => write!(f, "Internal error: {}", message),
        }
    }
}

impl std::error::Error for JsonError {}

impl From<serde_json::Error> for JsonError {
    fn from(e: serde_json::Error) -> Self {
        JsonError::Parse {
            message: e.to_string(),
            line: Some(e.line()),
            column: Some(e.column()),
        }
    }
}

impl From<std::fmt::Error> for JsonError {
    fn from(e: std::fmt::Error) -> Self {
        JsonError::Internal {
            message: e.to_string(),
        }
    }
}

/// Unified result type
pub type JsonResult<T> = Result<T, JsonError>;
