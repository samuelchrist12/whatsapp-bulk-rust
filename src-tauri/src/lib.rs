pub mod excel;
pub mod attachment;

use excel::{read_spreadsheet, ExcelSheetResult};
use attachment::{scan_folder_and_match, AttachmentScanSummary, RecordQueryInput};
use serde_json::Value;
use std::fs;
use std::path::Path;
use std::process::Command;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

const PREFS_FILE: &str = "bulk_wa_preferences.json";

fn ensure_sidecar_running() {
    if std::net::TcpStream::connect("127.0.0.1:3847").is_ok() {
        return;
    }

    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| std::path::PathBuf::from("."));

    let candidates = [
        exe_dir.join("sidecar").join("server.js"),
        std::path::PathBuf::from("sidecar/server.js"),
        exe_dir.join("..").join("sidecar").join("server.js"),
    ];

    for script_path in &candidates {
        if script_path.exists() {
            let mut cmd = Command::new("node");
            cmd.arg(script_path);

            #[cfg(target_os = "windows")]
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW: runs silently in background without console window

            let _ = cmd.spawn();
            break;
        }
    }
}

#[tauri::command]
fn cmd_start_sidecar() -> Result<bool, String> {
    ensure_sidecar_running();
    Ok(true)
}

#[tauri::command]
fn cmd_read_excel(file_path: String, sheet_name: Option<String>) -> Result<ExcelSheetResult, String> {
    read_spreadsheet(&file_path, sheet_name.as_deref())
}

#[tauri::command]
fn cmd_scan_attachments(
    folder_path: String,
    matching_mode: String,
    records: Vec<RecordQueryInput>,
) -> Result<AttachmentScanSummary, String> {
    scan_folder_and_match(&folder_path, &matching_mode, &records)
}

#[tauri::command]
fn cmd_format_phone(phone: String) -> String {
    let clean: String = phone.chars().filter(|c| c.is_ascii_digit()).collect();
    if clean.is_empty() {
        return String::new();
    }
    if clean.starts_with('0') {
        format!("62{}", &clean[1..])
    } else if clean.starts_with('8') {
        format!("62{}", clean)
    } else if clean.starts_with("62") {
        clean
    } else {
        format!("62{}", clean)
    }
}

#[tauri::command]
fn cmd_save_preferences(prefs: Value) -> Result<(), String> {
    let raw = serde_json::to_string_pretty(&prefs)
        .map_err(|e| format!("Gagal memformat konfigurasi: {}", e))?;
    fs::write(PREFS_FILE, raw)
        .map_err(|e| format!("Gagal menyimpan file preferensi: {}", e))?;
    Ok(())
}

#[tauri::command]
fn cmd_load_preferences() -> Result<Value, String> {
    if !Path::new(PREFS_FILE).exists() {
        return Ok(Value::Null);
    }
    let content = fs::read_to_string(PREFS_FILE)
        .map_err(|e| format!("Gagal membaca file preferensi: {}", e))?;
    let val: Value = serde_json::from_str(&content)
        .map_err(|e| format!("Gagal mem-parse file JSON: {}", e))?;
    Ok(val)
}

#[tauri::command]
fn cmd_minimize_window(window: tauri::Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
fn cmd_maximize_window(window: tauri::Window) -> Result<(), String> {
    if window.is_maximized().unwrap_or(false) {
        window.unmaximize().map_err(|e| e.to_string())
    } else {
        window.maximize().map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn cmd_close_window(window: tauri::Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

#[tauri::command]
fn cmd_open_url(url: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        use std::os::windows::process::CommandExt;

        Command::new("rundll32")
            .args(["url.dll,FileProtocolHandler", &url])
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .spawn()
            .map_err(|e| format!("Gagal membuka URL: {}", e))?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = url;
    }
    Ok(())
}

#[tauri::command]
async fn cmd_pick_folder(title: Option<String>) -> Option<String> {
    let dialog_title = title.unwrap_or_else(|| "Select Attachment Folder".to_string());
    tauri::async_runtime::spawn_blocking(move || {
        rfd::FileDialog::new()
            .set_title(&dialog_title)
            .pick_folder()
            .map(|p| p.to_string_lossy().to_string())
    })
    .await
    .ok()
    .flatten()
}

#[tauri::command]
async fn cmd_save_binary_file(
    default_name: String,
    bytes: Vec<u8>,
    title: Option<String>,
) -> Result<Option<String>, String> {
    let dialog_title = title.unwrap_or_else(|| "Save Excel Template".to_string());
    let chosen_path = tauri::async_runtime::spawn_blocking(move || {
        rfd::FileDialog::new()
            .set_title(&dialog_title)
            .set_file_name(&default_name)
            .add_filter("Excel Workbook (*.xlsx)", &["xlsx"])
            .save_file()
    })
    .await
    .map_err(|e| format!("Dialog error: {}", e))?;

    if let Some(path) = chosen_path {
        fs::write(&path, &bytes).map_err(|e| format!("Failed to write file: {}", e))?;
        Ok(Some(path.to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn cmd_get_app_flavor() -> String {
    if let Ok(exe_path) = std::env::current_exe() {
        let exe_name = exe_path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_lowercase();
        if exe_name.contains("test") {
            return "testing".to_string();
        }
    }
    if std::env::var("BULK_WA_TESTING").is_ok() {
        return "testing".to_string();
    }
    "production".to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            ensure_sidecar_running();
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            cmd_read_excel,
            cmd_scan_attachments,
            cmd_format_phone,
            cmd_save_preferences,
            cmd_load_preferences,
            cmd_minimize_window,
            cmd_maximize_window,
            cmd_close_window,
            cmd_start_sidecar,
            cmd_open_url,
            cmd_pick_folder,
            cmd_save_binary_file,
            cmd_get_app_flavor
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
