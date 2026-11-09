pub mod excel;
pub mod attachment;

use excel::{read_spreadsheet, ExcelSheetResult};
use attachment::{scan_folder_and_match, AttachmentScanSummary, RecordQueryInput};
use serde_json::Value;
use std::fs;
use std::io::Write;
use std::net::{SocketAddr, TcpStream};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::Duration;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

const PREFS_FILE_NAME: &str = "bulk_wa_preferences.json";
#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

static SIDECAR_PID: Mutex<Option<u32>> = Mutex::new(None);
static IS_SHUTTING_DOWN: AtomicBool = AtomicBool::new(false);

fn get_exe_dir() -> PathBuf {
    std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."))
}

fn get_user_data_dir() -> PathBuf {
    let base = std::env::var("LOCALAPPDATA")
        .or_else(|_| std::env::var("APPDATA"))
        .map(PathBuf::from)
        .unwrap_or_else(|_| get_exe_dir());
    let dir = base.join("BulkWASender");
    let _ = fs::create_dir_all(&dir);
    dir
}

fn get_prefs_path() -> PathBuf {
    get_user_data_dir().join(PREFS_FILE_NAME)
}

fn is_sidecar_listening() -> bool {
    let addr = SocketAddr::from(([127, 0, 0, 1], 3847));
    TcpStream::connect_timeout(&addr, Duration::from_millis(250)).is_ok()
}

fn ensure_sidecar_running() {
    if is_sidecar_listening() {
        return;
    }

    let exe_dir = get_exe_dir();
    let data_dir = get_user_data_dir();

    // 1. Prefer bundled self-contained runtime (runtime/node.exe + runtime/engine.cjs)
    let bundled_candidates = [
        (
            exe_dir.join("runtime").join("node.exe"),
            exe_dir.join("runtime").join("engine.cjs"),
        ),
        (
            exe_dir.join("..").join("runtime").join("node.exe"),
            exe_dir.join("..").join("runtime").join("engine.cjs"),
        ),
        (
            PathBuf::from("src-tauri/runtime/node.exe"),
            PathBuf::from("src-tauri/runtime/engine.cjs"),
        ),
    ];

    for (node_bin, engine_script) in &bundled_candidates {
        if node_bin.exists() && engine_script.exists() {
            let mut cmd = Command::new(node_bin);
            cmd.arg(engine_script)
                .current_dir(&exe_dir)
                .env("BULK_WA_DATA_DIR", &data_dir);

            #[cfg(target_os = "windows")]
            cmd.creation_flags(CREATE_NO_WINDOW);

            if let Ok(child) = cmd.spawn() {
                if let Ok(mut guard) = SIDECAR_PID.lock() {
                    *guard = Some(child.id());
                }
                return;
            }
        }
    }

    // 2. Fallback to development sidecar (system node + sidecar/server.js)
    let dev_scripts = [
        exe_dir.join("sidecar").join("server.js"),
        PathBuf::from("sidecar/server.js"),
        exe_dir.join("..").join("sidecar").join("server.js"),
    ];

    for script_path in &dev_scripts {
        if script_path.exists() {
            let mut cmd = Command::new("node");
            cmd.arg(script_path)
                .env("BULK_WA_DATA_DIR", &data_dir);

            #[cfg(target_os = "windows")]
            cmd.creation_flags(CREATE_NO_WINDOW);

            if let Ok(child) = cmd.spawn() {
                if let Ok(mut guard) = SIDECAR_PID.lock() {
                    *guard = Some(child.id());
                }
            }
            break;
        }
    }
}

#[cfg(target_os = "windows")]
fn kill_pid_tree(pid: u32) {
    let _ = Command::new("taskkill")
        .args(["/F", "/T", "/PID", &pid.to_string()])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
}

fn shutdown_sidecar() {
    if IS_SHUTTING_DOWN.swap(true, Ordering::SeqCst) {
        return;
    }

    // 1. Request graceful shutdown over local HTTP so Puppeteer closes cleanly
    let addr = SocketAddr::from(([127, 0, 0, 1], 3847));
    if let Ok(mut stream) = TcpStream::connect_timeout(&addr, Duration::from_millis(300)) {
        let _ = stream.set_write_timeout(Some(Duration::from_millis(300)));
        let _ = stream.set_read_timeout(Some(Duration::from_millis(300)));
        let req = b"POST /api/wa/shutdown HTTP/1.1\r\nHost: 127.0.0.1:3847\r\nContent-Length: 2\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n{}";
        let _ = stream.write_all(req);
        let _ = stream.flush();
        std::thread::sleep(Duration::from_millis(350));
    }

    // 2. Ensure headless browser process recorded in browser.pid is terminated
    let pid_file = get_user_data_dir().join("browser.pid");
    if pid_file.exists() {
        if let Ok(raw_pid) = fs::read_to_string(&pid_file) {
            if let Ok(bpid) = raw_pid.trim().parse::<u32>() {
                #[cfg(target_os = "windows")]
                kill_pid_tree(bpid);
            }
        }
        let _ = fs::remove_file(&pid_file);
    }

    // 3. Ensure spawned sidecar node.exe process is terminated
    if let Ok(mut guard) = SIDECAR_PID.lock() {
        if let Some(pid) = guard.take() {
            #[cfg(target_os = "windows")]
            kill_pid_tree(pid);
        }
    }
}

#[tauri::command]
fn cmd_start_sidecar() -> Result<bool, String> {
    IS_SHUTTING_DOWN.store(false, Ordering::SeqCst);
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
    let prefs_path = get_prefs_path();
    fs::write(&prefs_path, raw)
        .map_err(|e| format!("Gagal menyimpan file preferensi: {}", e))?;
    Ok(())
}

#[tauri::command]
fn cmd_load_preferences() -> Result<Value, String> {
    let prefs_path = get_prefs_path();
    let target_path = if prefs_path.exists() {
        prefs_path
    } else if Path::new(PREFS_FILE_NAME).exists() {
        PathBuf::from(PREFS_FILE_NAME)
    } else {
        return Ok(Value::Null);
    };

    let content = fs::read_to_string(&target_path)
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
        Command::new("rundll32")
            .args(["url.dll,FileProtocolHandler", &url])
            .creation_flags(CREATE_NO_WINDOW)
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
    let dialog_title = title.unwrap_or_else(|| "Save File".to_string());
    let ext = Path::new(&default_name)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("xlsx")
        .to_lowercase();

    let chosen_path = tauri::async_runtime::spawn_blocking(move || {
        let mut dlg = rfd::FileDialog::new()
            .set_title(&dialog_title)
            .set_file_name(&default_name);
        if ext == "csv" {
            dlg = dlg.add_filter("CSV File (*.csv)", &["csv"]);
        } else {
            dlg = dlg.add_filter("Excel Workbook (*.xlsx)", &["xlsx"]);
        }
        dlg.save_file()
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
        .on_window_event(|_window, event| {
            if matches!(event, tauri::WindowEvent::Destroyed) {
                shutdown_sidecar();
            }
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
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, event| {
            if matches!(event, tauri::RunEvent::Exit) {
                shutdown_sidecar();
            }
        });
}
