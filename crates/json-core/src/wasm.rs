use wasm_bindgen::prelude::*;
use serde_wasm_bindgen::to_value;

use crate::{
    convert::{self, Delimiter},
    decode::{self, Encoding},
    diff::{self, DiffResult},
    format::{self, FormatOptions, Indent},
    jsonpath, minify, sort, table, tree,
};

#[wasm_bindgen]
pub fn wasm_format(input: &str, indent: u32, sort_keys: bool) -> Result<String, JsValue> {
    let indent = match indent {
        2 => Indent::Spaces2,
        4 => Indent::Spaces4,
        _ => Indent::Tab,
    };
    let opts = FormatOptions {
        indent,
        sort_keys,
        ..Default::default()
    };
    format::format_json(input, &opts).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_minify(input: &str) -> Result<String, JsValue> {
    minify::minify_json(input).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_sort(input: &str, by: &str, order: &str) -> Result<String, JsValue> {
    let by = match by {
        "value" => sort::SortBy::Value,
        _ => sort::SortBy::Key,
    };
    let order = match order {
        "desc" => sort::SortOrder::Desc,
        _ => sort::SortOrder::Asc,
    };
    sort::sort_json(input, by, order).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_decode(input: &str, encoding: &str) -> Result<String, JsValue> {
    let encoding = match encoding {
        "base64url" => Encoding::Base64Url,
        "url" => Encoding::Url,
        "unicode" => Encoding::Unicode,
        _ => Encoding::Base64,
    };
    decode::decode_json(input, encoding).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_encode(input: &str, encoding: &str) -> Result<String, JsValue> {
    let encoding = match encoding {
        "base64url" => Encoding::Base64Url,
        "url" => Encoding::Url,
        "unicode" => Encoding::Unicode,
        _ => Encoding::Base64,
    };
    decode::encode_json(input, encoding).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_jsonpath(input: &str, path: &str) -> Result<String, JsValue> {
    jsonpath::jsonpath_query(input, path).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_build_tree(input: &str, max_depth: u32) -> Result<JsValue, JsValue> {
    let tree = tree::build_tree(input, max_depth as usize)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    to_value(&tree).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_json_to_table(input: &str) -> Result<JsValue, JsValue> {
    let table = table::json_to_table(input).map_err(|e| JsValue::from_str(&e.to_string()))?;
    to_value(&table).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_diff(left: &str, right: &str) -> Result<JsValue, JsValue> {
    let results: Vec<DiffResult> = diff::diff_json(left, right)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    to_value(&results).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_json_to_csv(input: &str, delim: &str) -> Result<String, JsValue> {
    let delim = match delim {
        "tsv" => Delimiter::Tsv,
        _ => Delimiter::Csv,
    };
    convert::json_to_csv(input, delim).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_csv_to_json(input: &str, delim: &str) -> Result<String, JsValue> {
    let delim = match delim {
        "tsv" => Delimiter::Tsv,
        _ => Delimiter::Csv,
    };
    convert::csv_to_json(input, delim).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_validate_schema(input: &str, schema: &str) -> Result<JsValue, JsValue> {
    #[cfg(feature = "schema")]
    {
        let errors = crate::schema::validate_schema(input, schema)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        to_value(&errors).map_err(|e| JsValue::from_str(&e.to_string()))
    }
    #[cfg(not(feature = "schema"))]
    {
        let _ = (input, schema);
        Err(JsValue::from_str(
            "Schema validation is not available in this build",
        ))
    }
}
