use crate::models::SaveFile;
use std::fs;
use std::path::PathBuf;

#[tauri::command]
pub fn get_profiles(folder_path: String) -> Result<Vec<String>, String> {
    let paths = fs::read_dir(folder_path).map_err(|e| e.to_string())?;
    let mut profiles = Vec::new();

    for path in paths {
        let entry = path.map_err(|e| e.to_string())?;
        let p = entry.path();
        if p.is_file() {
            if let Some(file_name) = p.file_name().and_then(|s| s.to_str()) {
                if !file_name.starts_with('.') {
                    // Ignore hidden files like .DS_Store
                    profiles.push(file_name.to_string());
                }
            }
        }
    }

    Ok(profiles)
}

#[tauri::command]
pub fn get_profile_data(folder_path: String, file_name: String) -> Result<SaveFile, String> {
    let mut path = PathBuf::from(folder_path);
    path.push(file_name);

    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let data: SaveFile = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    Ok(data)
}
