use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileMatchInfo {
    pub record_id: String,
    pub expected_query: String,
    pub file_name: String,
    pub full_path: String,
    pub exists: bool,
    pub size_kb: u64,
    pub file_category: String, // "pdf", "image", "document", "archive", "none"
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AttachmentScanSummary {
    pub folder_path: String,
    pub total_records: usize,
    pub found_count: usize,
    pub missing_count: usize,
    pub match_percentage: f64,
    pub matches: Vec<FileMatchInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RecordQueryInput {
    pub id: String,
    pub recipient_name: String,
    pub custom_column_val: Option<String>,
}

pub fn scan_folder_and_match(
    folder_str: &str,
    matching_mode: &str, // "by_name" or "by_column"
    records: &[RecordQueryInput],
) -> Result<AttachmentScanSummary, String> {
    let folder_path = Path::new(folder_str);
    if !folder_path.exists() || !folder_path.is_dir() {
        return Err(format!("Direktori lampiran tidak ditemukan: {}", folder_str));
    }

    // 1. Index all allowed files in the target directory
    // Mapping: lowercase normalized stem -> (filename, full_path, size_kb, ext)
    let mut files_by_stem: HashMap<String, (String, PathBuf, u64, String)> = HashMap::new();
    let mut files_by_exact: HashMap<String, (String, PathBuf, u64, String)> = HashMap::new();

    let allowed_exts = [
        "pdf", "jpg", "jpeg", "png", "webp", "docx", "xlsx", "csv", "zip", "txt"
    ];

    for entry in WalkDir::new(folder_path).max_depth(2).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            let path = entry.path();
            if let Some(ext) = path.extension().and_then(|s| s.to_str()).map(|s| s.to_lowercase()) {
                if allowed_exts.contains(&ext.as_str()) {
                    let full_name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                    let metadata = fs::metadata(path).ok();
                    let size_kb = metadata.map(|m| (m.len() + 1023) / 1024).unwrap_or(0);

                    // Index by exact lowercase name (e.g., "budi santoso.pdf")
                    files_by_exact.insert(
                        full_name.to_lowercase(),
                        (full_name.clone(), path.to_path_buf(), size_kb, ext.clone())
                    );

                    // Index by normalized stem (e.g., "budi santoso" or "budi_santoso")
                    if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                        let normalized_stem = normalize_key(stem);
                        files_by_stem.insert(
                            normalized_stem,
                            (full_name.clone(), path.to_path_buf(), size_kb, ext)
                        );
                    }
                }
            }
        }
    }

    // 2. Perform Matching
    let mut matches = Vec::new();
    let mut found_count = 0;

    for r in records {
        let (query_text, query_key) = if matching_mode == "by_column" {
            let val = r.custom_column_val.clone().unwrap_or_default();
            (val.clone(), val)
        } else {
            (r.recipient_name.clone(), r.recipient_name.clone())
        };

        let trimmed_query = query_key.trim();
        let query_lower = trimmed_query.to_lowercase();
        let query_normalized = normalize_key(trimmed_query);

        // Try exact filename match first
        let matched = if let Some(found) = files_by_exact.get(&query_lower) {
            Some(found.clone())
        } else if let Some(found) = files_by_stem.get(&query_normalized) {
            Some(found.clone())
        } else {
            // Check if user specified filename without extension (e.g. query is "INV-001" and file is "INV-001.pdf")
            let mut found_any = None;
            for ext in &allowed_exts {
                let candidate = format!("{}.{}", query_lower, ext);
                if let Some(found) = files_by_exact.get(&candidate) {
                    found_any = Some(found.clone());
                    break;
                }
            }
            found_any
        };

        if let Some((f_name, f_path, size_kb, ext)) = matched {
            found_count += 1;
            let cat = determine_category(&ext);
            matches.push(FileMatchInfo {
                record_id: r.id.clone(),
                expected_query: query_text,
                file_name: f_name,
                full_path: f_path.to_string_lossy().to_string(),
                exists: true,
                size_kb,
                file_category: cat,
            });
        } else {
            matches.push(FileMatchInfo {
                record_id: r.id.clone(),
                expected_query: query_text.clone(),
                file_name: format!("{}.[file]", query_text),
                full_path: String::new(),
                exists: false,
                size_kb: 0,
                file_category: "none".to_string(),
            });
        }
    }

    let total = records.len();
    let missing_count = total.saturating_sub(found_count);
    let match_percentage = if total > 0 {
        (found_count as f64 / total as f64) * 100.0
    } else {
        0.0
    };

    Ok(AttachmentScanSummary {
        folder_path: folder_str.to_string(),
        total_records: total,
        found_count,
        missing_count,
        match_percentage: (match_percentage * 10.0).round() / 10.0,
        matches,
    })
}

fn normalize_key(s: &str) -> String {
    s.to_lowercase()
        .replace(['_', '-', '.', ' '], "")
        .trim()
        .to_string()
}

fn determine_category(ext: &str) -> String {
    match ext {
        "pdf" => "pdf".to_string(),
        "jpg" | "jpeg" | "png" | "webp" => "image".to_string(),
        "docx" | "xlsx" | "csv" | "txt" => "document".to_string(),
        "zip" => "archive".to_string(),
        _ => "document".to_string(),
    }
}
