use json_core::{convert, decode, diff, format, jsonpath, minify, sort, table, tree};
use json_core::format::{FormatOptions, Indent};
use json_core::sort::{SortBy, SortOrder};
use json_core::decode::Encoding;
use json_core::convert::Delimiter;

#[tauri::command]
pub fn format_json(input: String, indent: u32, sort_keys: bool) -> Result<String, String> {
    let indent = match indent {
        4 => Indent::Spaces4,
        8 => Indent::Tab,
        _ => Indent::Spaces2,
    };
    let opts = FormatOptions {
        indent,
        sort_keys,
        ..Default::default()
    };
    format::format_json(&input, &opts).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn minify_json(input: String) -> Result<String, String> {
    minify::minify_json(&input).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn sort_json(input: String, by: String, order: String) -> Result<String, String> {
    let by = match by.as_str() {
        "value" => SortBy::Value,
        _ => SortBy::Key,
    };
    let order = match order.as_str() {
        "desc" => SortOrder::Desc,
        _ => SortOrder::Asc,
    };
    sort::sort_json(&input, by, order).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn decode_json(input: String, encoding: String) -> Result<String, String> {
    let encoding = match encoding.as_str() {
        "base64url" => Encoding::Base64Url,
        "url" => Encoding::Url,
        "unicode" => Encoding::Unicode,
        _ => Encoding::Base64,
    };
    decode::decode_json(&input, encoding).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn encode_json(input: String, encoding: String) -> Result<String, String> {
    let encoding = match encoding.as_str() {
        "base64url" => Encoding::Base64Url,
        "url" => Encoding::Url,
        "unicode" => Encoding::Unicode,
        _ => Encoding::Base64,
    };
    decode::encode_json(&input, encoding).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn jsonpath_query(input: String, path: String) -> Result<String, String> {
    jsonpath::jsonpath_query(&input, &path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn build_tree(input: String, max_depth: u32) -> Result<String, String> {
    let tree = tree::build_tree(&input, max_depth as usize).map_err(|e| e.to_string())?;
    serde_json::to_string(&tree).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn json_to_table(input: String) -> Result<String, String> {
    let table = table::json_to_table(&input).map_err(|e| e.to_string())?;
    serde_json::to_string(&table).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn diff_json(left: String, right: String) -> Result<String, String> {
    let results = diff::diff_json(&left, &right).map_err(|e| e.to_string())?;
    serde_json::to_string(&results).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn json_to_csv(input: String, delim: String) -> Result<String, String> {
    let delim = match delim.as_str() {
        "tsv" => Delimiter::Tsv,
        _ => Delimiter::Csv,
    };
    convert::json_to_csv(&input, delim).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn csv_to_json(input: String, delim: String) -> Result<String, String> {
    let delim = match delim.as_str() {
        "tsv" => Delimiter::Tsv,
        _ => Delimiter::Csv,
    };
    convert::csv_to_json(&input, delim).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn validate_schema(input: String, schema: String) -> Result<Vec<String>, String> {
    #[cfg(feature = "schema")]
    {
        json_core::schema::validate_schema(&input, &schema).map_err(|e| e.to_string())
    }
    #[cfg(not(feature = "schema"))]
    {
        Err("Schema validation is not available in this build".into())
    }
}
