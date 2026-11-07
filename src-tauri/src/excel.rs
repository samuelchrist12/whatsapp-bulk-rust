use calamine::{open_workbook_auto, Reader, Data};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Deserialize)]
pub struct ExcelSheetResult {
    pub file_path: String,
    pub file_name: String,
    pub sheets: Vec<String>,
    pub active_sheet: String,
    pub headers: Vec<String>,
    pub rows: Vec<HashMap<String, String>>,
    pub total_rows: usize,
}

pub fn read_spreadsheet(file_path_str: &str, sheet_opt: Option<&str>) -> Result<ExcelSheetResult, String> {
    let mut candidate_paths = vec![file_path_str.to_string()];
    if file_path_str.contains("data_contoh") {
        candidate_paths.push(file_path_str.replace("data_contoh", "sample_data"));
    } else if file_path_str.contains("sample_data") {
        candidate_paths.push(file_path_str.replace("sample_data", "data_contoh"));
    }

    let exe_dir = std::env::current_exe()
        .map(|p| p.parent().unwrap_or(Path::new(".")).to_path_buf())
        .unwrap_or_else(|_| PathBuf::from("."));

    let mut found_path: Option<PathBuf> = None;
    for cand in &candidate_paths {
        let p = PathBuf::from(cand);
        if p.exists() {
            found_path = Some(p);
            break;
        }
        let p1 = exe_dir.join(cand);
        if p1.exists() {
            found_path = Some(p1);
            break;
        }
        let p2 = exe_dir.join("..").join(cand);
        if p2.exists() {
            found_path = Some(p2);
            break;
        }
    }

    let resolved_path = match found_path {
        Some(p) => p,
        None => return Err(format!("File tidak ditemukan: {}", file_path_str)),
    };

    let file_name = resolved_path.file_name()
        .map(|f| f.to_string_lossy().to_string())
        .unwrap_or_else(|| "Dokumen.xlsx".to_string());

    let mut workbook = open_workbook_auto(&resolved_path)
        .map_err(|e| format!("Gagal membuka file spreadsheet: {}", e))?;

    let sheet_names = workbook.sheet_names();
    if sheet_names.is_empty() {
        return Err("File spreadsheet tidak memiliki sheet".to_string());
    }

    let target_sheet = match sheet_opt {
        Some(s) if sheet_names.iter().any(|name| name == s) => s.to_string(),
        _ => sheet_names[0].clone(),
    };

    let range = workbook.worksheet_range(&target_sheet)
        .map_err(|e| format!("Gagal membaca sheet '{}': {}", target_sheet, e))?;

    let mut rows_iter = range.rows();
    
    // Find header row (first row with at least 1 non-empty cell)
    let mut headers = Vec::new();
    let mut _header_row_index = 0;

    for (r_idx, row) in rows_iter.by_ref().enumerate() {
        let candidate: Vec<String> = row.iter().map(|c| format_cell_data(c).trim().to_string()).collect();
        if candidate.iter().any(|c| !c.is_empty()) {
            headers = candidate.into_iter().enumerate().map(|(col_idx, val)| {
                if val.is_empty() {
                    format!("Kolom_{}", col_idx + 1)
                } else {
                    val
                }
            }).collect();
            _header_row_index = r_idx;
            break;
        }
    }

    if headers.is_empty() {
        return Err("Tidak dapat menemukan baris judul (header) pada sheet ini".to_string());
    }

    let mut data_rows = Vec::new();
    // Read subsequent rows
    for row in rows_iter {
        let mut row_map = HashMap::new();
        let mut has_any_value = false;

        for (col_idx, cell) in row.iter().enumerate() {
            if col_idx < headers.len() {
                let cell_str = format_cell_data(cell).trim().to_string();
                if !cell_str.is_empty() {
                    has_any_value = true;
                }
                row_map.insert(headers[col_idx].clone(), cell_str);
            }
        }

        if has_any_value {
            data_rows.push(row_map);
        }
    }

    let total = data_rows.len();

    Ok(ExcelSheetResult {
        file_path: file_path_str.to_string(),
        file_name,
        sheets: sheet_names,
        active_sheet: target_sheet,
        headers,
        rows: data_rows,
        total_rows: total,
    })
}

fn format_cell_data(data: &Data) -> String {
    match data {
        Data::Empty => String::new(),
        Data::String(s) => s.clone(),
        Data::Float(f) => {
            if f.fract() == 0.0 {
                format!("{:.0}", f)
            } else {
                format!("{}", f)
            }
        },
        Data::Int(i) => format!("{}", i),
        Data::Bool(b) => format!("{}", b),
        Data::DateTime(d) => format!("{}", d),
        Data::DateTimeIso(s) => s.clone(),
        Data::DurationIso(s) => s.clone(),
        Data::Error(e) => format!("{:?}", e),
    }
}
