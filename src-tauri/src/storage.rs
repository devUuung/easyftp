use crate::Connection;
use std::fs;
use std::path::PathBuf;

fn get_config_path() -> Result<PathBuf, String> {
    let config_dir = dirs::config_dir().ok_or("설정 디렉토리를 찾을 수 없습니다")?;

    let app_config_dir = config_dir.join("easyftp");

    if !app_config_dir.exists() {
        fs::create_dir_all(&app_config_dir)
            .map_err(|e| format!("설정 디렉토리 생성 실패: {}", e))?;
    }

    Ok(app_config_dir.join("connections.json"))
}

pub fn load_connections() -> Result<Vec<Connection>, String> {
    let path = get_config_path()?;

    if !path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&path).map_err(|e| format!("파일 읽기 실패: {}", e))?;

    let connections: Vec<Connection> =
        serde_json::from_str(&content).map_err(|e| format!("JSON 파싱 실패: {}", e))?;

    Ok(connections)
}

pub fn save_connection(connection: Connection, update_id: Option<&str>) -> Result<(), String> {
    let mut connections = load_connections().unwrap_or_default();

    let existing_idx = if let Some(id) = update_id {
        connections.iter().position(|c| c.id == id)
    } else {
        connections.iter().position(|c| {
            c.host == connection.host
                && c.port == connection.port
                && c.username == connection.username
                && c.protocol == connection.protocol
        })
    };

    match existing_idx {
        Some(idx) => {
            connections[idx] = connection;
        }
        None => {
            connections.push(connection);
        }
    }

    let path = get_config_path()?;
    let content = serde_json::to_string_pretty(&connections)
        .map_err(|e| format!("JSON 직렬화 실패: {}", e))?;

    fs::write(&path, content).map_err(|e| format!("파일 쓰기 실패: {}", e))?;

    Ok(())
}

pub fn delete_connection(id: &str) -> Result<(), String> {
    let mut connections = load_connections().unwrap_or_default();

    connections.retain(|c| c.id != id);

    let path = get_config_path()?;
    let content = serde_json::to_string_pretty(&connections)
        .map_err(|e| format!("JSON 직렬화 실패: {}", e))?;

    fs::write(&path, content).map_err(|e| format!("파일 쓰기 실패: {}", e))?;

    Ok(())
}

fn get_settings_path() -> Result<PathBuf, String> {
    let config_dir = dirs::config_dir().ok_or("설정 디렉토리를 찾을 수 없습니다")?;
    let app_config_dir = config_dir.join("easyftp");

    if !app_config_dir.exists() {
        fs::create_dir_all(&app_config_dir)
            .map_err(|e| format!("설정 디렉토리 생성 실패: {}", e))?;
    }

    Ok(app_config_dir.join("settings.json"))
}

#[derive(serde::Serialize, serde::Deserialize, Default)]
struct Settings {
    editor_path: String,
}

pub fn get_editor_path() -> Result<String, String> {
    let path = get_settings_path()?;

    if !path.exists() {
        return Ok(String::new());
    }

    let content = fs::read_to_string(&path).map_err(|e| format!("설정 파일 읽기 실패: {}", e))?;
    let settings: Settings =
        serde_json::from_str(&content).map_err(|e| format!("설정 파싱 실패: {}", e))?;

    Ok(settings.editor_path)
}

pub fn set_editor_path(editor_path: &str) -> Result<(), String> {
    let path = get_settings_path()?;

    let settings = Settings {
        editor_path: editor_path.to_string(),
    };

    let content = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("설정 직렬화 실패: {}", e))?;

    fs::write(&path, content).map_err(|e| format!("설정 저장 실패: {}", e))?;

    Ok(())
}
