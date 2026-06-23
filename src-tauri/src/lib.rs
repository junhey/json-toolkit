mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::format_json,
            commands::minify_json,
            commands::sort_json,
            commands::decode_json,
            commands::encode_json,
            commands::jsonpath_query,
            commands::build_tree,
            commands::json_to_table,
            commands::diff_json,
            commands::json_to_csv,
            commands::csv_to_json,
            commands::validate_schema,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
