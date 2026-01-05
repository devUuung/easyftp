use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::State;

mod ftp_client;
mod sftp_client;
mod smb_client;
mod storage;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Connection {
    pub id: String,
    pub name: String,
    pub protocol: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: String,
    pub share: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub size: u64,
    pub modified: String,
    pub permissions: Option<String>,
}

pub enum ActiveConnection {
    Ftp(ftp_client::FtpConnection),
    Sftp(sftp_client::SftpConnection),
    Smb(smb_client::SmbConnection),
    None,
}

pub struct AppState {
    connection: Mutex<ActiveConnection>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            connection: Mutex::new(ActiveConnection::None),
        }
    }
}

#[tauri::command]
async fn connect(
    connection: HashMap<String, serde_json::Value>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let protocol = connection
        .get("protocol")
        .and_then(|v| v.as_str())
        .ok_or("Missing protocol")?;
    let host = connection
        .get("host")
        .and_then(|v| v.as_str())
        .ok_or("Missing host")?;
    let port = connection
        .get("port")
        .and_then(|v| v.as_u64())
        .ok_or("Missing port")? as u16;
    let username = connection
        .get("username")
        .and_then(|v| v.as_str())
        .ok_or("Missing username")?;
    let password = connection
        .get("password")
        .and_then(|v| v.as_str())
        .ok_or("Missing password")?;

    let mut conn_guard = state.connection.lock().map_err(|e| e.to_string())?;

    match protocol {
        "ftp" => {
            let ftp_conn = ftp_client::FtpConnection::connect(host, port, username, password)?;
            *conn_guard = ActiveConnection::Ftp(ftp_conn);
        }
        "sftp" => {
            let sftp_conn = sftp_client::SftpConnection::connect(host, port, username, password)?;
            *conn_guard = ActiveConnection::Sftp(sftp_conn);
        }
        "smb" => {
            let share = connection
                .get("share")
                .and_then(|v| v.as_str())
                .filter(|s| !s.is_empty())
                .ok_or("SMB 연결에는 공유폴더 이름이 필요합니다")?;
            let smb_conn =
                smb_client::SmbConnection::connect(host, port, username, password, share)?;
            *conn_guard = ActiveConnection::Smb(smb_conn);
        }
        _ => return Err(format!("Unknown protocol: {}", protocol)),
    }

    Ok(())
}

#[tauri::command]
async fn disconnect(state: State<'_, AppState>) -> Result<(), String> {
    let mut conn_guard = state.connection.lock().map_err(|e| e.to_string())?;
    *conn_guard = ActiveConnection::None;
    Ok(())
}

#[tauri::command]
async fn list_files(path: String, state: State<'_, AppState>) -> Result<Vec<FileEntry>, String> {
    let mut conn_guard = state.connection.lock().map_err(|e| e.to_string())?;

    match &mut *conn_guard {
        ActiveConnection::Ftp(conn) => conn.list_files(&path),
        ActiveConnection::Sftp(conn) => conn.list_files(&path),
        ActiveConnection::Smb(conn) => conn.list_files(&path),
        ActiveConnection::None => Err("Not connected".to_string()),
    }
}

#[tauri::command]
async fn download_file(
    remote_path: String,
    local_path: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut conn_guard = state.connection.lock().map_err(|e| e.to_string())?;

    match &mut *conn_guard {
        ActiveConnection::Ftp(conn) => conn.download(&remote_path, &local_path),
        ActiveConnection::Sftp(conn) => conn.download(&remote_path, &local_path),
        ActiveConnection::Smb(conn) => conn.download(&remote_path, &local_path),
        ActiveConnection::None => Err("Not connected".to_string()),
    }
}

#[tauri::command]
async fn upload_file(
    local_path: String,
    remote_path: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut conn_guard = state.connection.lock().map_err(|e| e.to_string())?;

    match &mut *conn_guard {
        ActiveConnection::Ftp(conn) => conn.upload(&local_path, &remote_path),
        ActiveConnection::Sftp(conn) => conn.upload(&local_path, &remote_path),
        ActiveConnection::Smb(conn) => conn.upload(&local_path, &remote_path),
        ActiveConnection::None => Err("Not connected".to_string()),
    }
}

#[tauri::command]
async fn preview_file_base64(
    remote_path: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let mut conn_guard = state.connection.lock().map_err(|e| e.to_string())?;
    
    let data = match &mut *conn_guard {
        ActiveConnection::Ftp(conn) => conn.read_file(&remote_path)?,
        ActiveConnection::Sftp(conn) => conn.read_file(&remote_path)?,
        ActiveConnection::Smb(conn) => conn.read_file(&remote_path)?,
        ActiveConnection::None => return Err("Not connected".to_string()),
    };
    
    use base64::{Engine as _, engine::general_purpose::STANDARD};
    Ok(STANDARD.encode(&data))
}

#[tauri::command]
async fn preview_file_text(
    remote_path: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let mut conn_guard = state.connection.lock().map_err(|e| e.to_string())?;
    
    let data = match &mut *conn_guard {
        ActiveConnection::Ftp(conn) => conn.read_file(&remote_path)?,
        ActiveConnection::Sftp(conn) => conn.read_file(&remote_path)?,
        ActiveConnection::Smb(conn) => conn.read_file(&remote_path)?,
        ActiveConnection::None => return Err("Not connected".to_string()),
    };
    
    String::from_utf8(data).map_err(|_| "파일을 텍스트로 읽을 수 없습니다".to_string())
}

#[tauri::command]
async fn delete_file(
    remote_path: String,
    is_directory: bool,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut conn_guard = state.connection.lock().map_err(|e| e.to_string())?;

    match &mut *conn_guard {
        ActiveConnection::Ftp(conn) => conn.delete(&remote_path, is_directory),
        ActiveConnection::Sftp(conn) => conn.delete(&remote_path, is_directory),
        ActiveConnection::Smb(conn) => conn.delete(&remote_path, is_directory),
        ActiveConnection::None => Err("Not connected".to_string()),
    }
}

#[tauri::command]
async fn open_with_editor(
    remote_path: String,
    file_name: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let editor_path = storage::get_editor_path()?;
    if editor_path.is_empty() {
        return Err("에디터가 설정되지 않았습니다. 설정에서 에디터를 지정해주세요.".to_string());
    }

    let mut conn_guard = state.connection.lock().map_err(|e| e.to_string())?;
    
    let data = match &mut *conn_guard {
        ActiveConnection::Ftp(conn) => conn.read_file(&remote_path)?,
        ActiveConnection::Sftp(conn) => conn.read_file(&remote_path)?,
        ActiveConnection::Smb(conn) => conn.read_file(&remote_path)?,
        ActiveConnection::None => return Err("Not connected".to_string()),
    };

    let temp_dir = std::env::temp_dir().join("easyftp");
    std::fs::create_dir_all(&temp_dir).map_err(|e| format!("임시 폴더 생성 실패: {}", e))?;
    
    let temp_file = temp_dir.join(&file_name);
    std::fs::write(&temp_file, &data).map_err(|e| format!("임시 파일 저장 실패: {}", e))?;

    std::process::Command::new("open")
        .arg("-a")
        .arg(&editor_path)
        .arg(&temp_file)
        .spawn()
        .map_err(|e| format!("에디터 실행 실패: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn open_with_default_app(
    remote_path: String,
    file_name: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut conn_guard = state.connection.lock().map_err(|e| e.to_string())?;
    
    let data = match &mut *conn_guard {
        ActiveConnection::Ftp(conn) => conn.read_file(&remote_path)?,
        ActiveConnection::Sftp(conn) => conn.read_file(&remote_path)?,
        ActiveConnection::Smb(conn) => conn.read_file(&remote_path)?,
        ActiveConnection::None => return Err("Not connected".to_string()),
    };

    let temp_dir = std::env::temp_dir().join("easyftp");
    std::fs::create_dir_all(&temp_dir).map_err(|e| format!("임시 폴더 생성 실패: {}", e))?;
    
    let temp_file = temp_dir.join(&file_name);
    std::fs::write(&temp_file, &data).map_err(|e| format!("임시 파일 저장 실패: {}", e))?;

    std::process::Command::new("open")
        .arg(&temp_file)
        .spawn()
        .map_err(|e| format!("파일 열기 실패: {}", e))?;

    Ok(())
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EditorInfo {
    pub name: String,
    pub path: String,
}

#[tauri::command]
async fn get_available_editors() -> Result<Vec<EditorInfo>, String> {
    let mut editors = Vec::new();
    
    let editor_apps = [
        ("Visual Studio Code", "/Applications/Visual Studio Code.app"),
        ("Sublime Text", "/Applications/Sublime Text.app"),
        ("TextMate", "/Applications/TextMate.app"),
        ("BBEdit", "/Applications/BBEdit.app"),
        ("Nova", "/Applications/Nova.app"),
        ("Atom", "/Applications/Atom.app"),
        ("CotEditor", "/Applications/CotEditor.app"),
        ("TextEdit", "/Applications/TextEdit.app"),
        ("Xcode", "/Applications/Xcode.app"),
        ("IntelliJ IDEA", "/Applications/IntelliJ IDEA.app"),
        ("IntelliJ IDEA CE", "/Applications/IntelliJ IDEA CE.app"),
        ("PyCharm", "/Applications/PyCharm.app"),
        ("WebStorm", "/Applications/WebStorm.app"),
        ("Cursor", "/Applications/Cursor.app"),
        ("Zed", "/Applications/Zed.app"),
    ];

    for (name, path) in editor_apps {
        if std::path::Path::new(path).exists() {
            editors.push(EditorInfo {
                name: name.to_string(),
                path: path.to_string(),
            });
        }
    }

    Ok(editors)
}

#[tauri::command]
async fn get_editor_path() -> Result<String, String> {
    storage::get_editor_path()
}

#[tauri::command]
async fn set_editor_path(path: String) -> Result<(), String> {
    storage::set_editor_path(&path)
}

#[tauri::command]
async fn get_saved_connections() -> Result<Vec<Connection>, String> {
    storage::load_connections()
}

#[tauri::command]
async fn save_connection(connection: HashMap<String, serde_json::Value>) -> Result<(), String> {
    let update_id = connection.get("id").and_then(|v| v.as_str());
    
    let conn = Connection {
        id: update_id.map(|s| s.to_string()).unwrap_or_else(uuid_simple),
        name: connection
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("Unnamed")
            .to_string(),
        protocol: connection
            .get("protocol")
            .and_then(|v| v.as_str())
            .unwrap_or("sftp")
            .to_string(),
        host: connection
            .get("host")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
        port: connection
            .get("port")
            .and_then(|v| v.as_u64())
            .unwrap_or(22) as u16,
        username: connection
            .get("username")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
        password: connection
            .get("password")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
        share: connection
            .get("share")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
    };

    storage::save_connection(conn, update_id)
}

#[tauri::command]
async fn delete_connection(id: String) -> Result<(), String> {
    storage::delete_connection(&id)
}

#[tauri::command]
async fn export_bookmarks(file_path: String, data: String) -> Result<(), String> {
    std::fs::write(&file_path, data).map_err(|e| format!("파일 저장 실패: {}", e))
}

#[tauri::command]
async fn import_bookmarks(file_path: String) -> Result<String, String> {
    std::fs::read_to_string(&file_path).map_err(|e| format!("파일 읽기 실패: {}", e))
}

#[tauri::command]
async fn compress_file(
    remote_path: String,
    local_path: String,
    format: String,
    is_directory: bool,
    state: State<'_, AppState>,
) -> Result<(), String> {
    use std::fs::File;
    use std::io::{Read, Write};
    use std::path::Path;
    
    let temp_dir = std::env::temp_dir().join(format!("easyftp_compress_{}", uuid_simple()));
    std::fs::create_dir_all(&temp_dir).map_err(|e| format!("임시 폴더 생성 실패: {}", e))?;
    
    let file_name = Path::new(&remote_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("file");
    let temp_path = temp_dir.join(file_name);
    
    {
        let mut conn_guard = state.connection.lock().map_err(|e| e.to_string())?;
        
        if is_directory {
            std::fs::create_dir_all(&temp_path).map_err(|e| format!("폴더 생성 실패: {}", e))?;
            download_directory_recursive(&mut conn_guard, &remote_path, &temp_path)?;
        } else {
            match &mut *conn_guard {
                ActiveConnection::None => return Err("연결되어 있지 않습니다".to_string()),
                ActiveConnection::Ftp(ftp) => ftp.download(&remote_path, temp_path.to_str().unwrap())?,
                ActiveConnection::Sftp(sftp) => sftp.download(&remote_path, temp_path.to_str().unwrap())?,
                ActiveConnection::Smb(smb) => smb.download(&remote_path, temp_path.to_str().unwrap())?,
            }
        }
    }
    
    match format.as_str() {
        "zip" => compress_zip(&temp_path, &local_path)?,
        "tar" => compress_tar(&temp_path, &local_path, None)?,
        "tar.gz" => compress_tar(&temp_path, &local_path, Some("gz"))?,
        "tar.bz2" => compress_tar(&temp_path, &local_path, Some("bz2"))?,
        _ => return Err(format!("지원하지 않는 형식: {}", format)),
    }
    
    std::fs::remove_dir_all(&temp_dir).ok();
    
    Ok(())
}

fn download_directory_recursive(
    conn: &mut ActiveConnection,
    remote_path: &str,
    local_path: &std::path::Path,
) -> Result<(), String> {
    let entries = match conn {
        ActiveConnection::None => return Err("연결되어 있지 않습니다".to_string()),
        ActiveConnection::Ftp(ftp) => ftp.list_files(remote_path)?,
        ActiveConnection::Sftp(sftp) => sftp.list_files(remote_path)?,
        ActiveConnection::Smb(smb) => smb.list_files(remote_path)?,
    };
    
    for entry in entries {
        let entry_local_path = local_path.join(&entry.name);
        
        if entry.is_directory {
            std::fs::create_dir_all(&entry_local_path)
                .map_err(|e| format!("폴더 생성 실패: {}", e))?;
            download_directory_recursive(conn, &entry.path, &entry_local_path)?;
        } else {
            match conn {
                ActiveConnection::None => return Err("연결되어 있지 않습니다".to_string()),
                ActiveConnection::Ftp(ftp) => ftp.download(&entry.path, entry_local_path.to_str().unwrap())?,
                ActiveConnection::Sftp(sftp) => sftp.download(&entry.path, entry_local_path.to_str().unwrap())?,
                ActiveConnection::Smb(smb) => smb.download(&entry.path, entry_local_path.to_str().unwrap())?,
            }
        }
    }
    
    Ok(())
}

fn compress_zip(source: &std::path::Path, dest: &str) -> Result<(), String> {
    use std::fs::File;
    use std::io::{Read, Write};
    use walkdir::WalkDir;
    use zip::write::FileOptions;
    use zip::ZipWriter;
    
    let file = File::create(dest).map_err(|e| format!("파일 생성 실패: {}", e))?;
    let mut zip = ZipWriter::new(file);
    let options = FileOptions::<()>::default()
        .compression_method(zip::CompressionMethod::Deflated);
    
    if source.is_file() {
        let name = source.file_name().and_then(|n| n.to_str()).unwrap_or("file");
        zip.start_file(name, options).map_err(|e| format!("ZIP 파일 추가 실패: {}", e))?;
        let mut f = File::open(source).map_err(|e| format!("파일 열기 실패: {}", e))?;
        let mut buffer = Vec::new();
        f.read_to_end(&mut buffer).map_err(|e| format!("파일 읽기 실패: {}", e))?;
        zip.write_all(&buffer).map_err(|e| format!("파일 쓰기 실패: {}", e))?;
    } else {
        let base_name = source.file_name().and_then(|n| n.to_str()).unwrap_or("");
        
        for entry in WalkDir::new(source) {
            let entry = entry.map_err(|e| format!("디렉토리 탐색 실패: {}", e))?;
            let path = entry.path();
            let relative = path.strip_prefix(source.parent().unwrap_or(source))
                .map_err(|e| format!("경로 처리 실패: {}", e))?;
            
            if path.is_file() {
                zip.start_file(relative.to_string_lossy(), options)
                    .map_err(|e| format!("ZIP 파일 추가 실패: {}", e))?;
                let mut f = File::open(path).map_err(|e| format!("파일 열기 실패: {}", e))?;
                let mut buffer = Vec::new();
                f.read_to_end(&mut buffer).map_err(|e| format!("파일 읽기 실패: {}", e))?;
                zip.write_all(&buffer).map_err(|e| format!("파일 쓰기 실패: {}", e))?;
            } else if path.is_dir() && path != source {
                zip.add_directory(relative.to_string_lossy(), options)
                    .map_err(|e| format!("ZIP 디렉토리 추가 실패: {}", e))?;
            }
        }
    }
    
    zip.finish().map_err(|e| format!("ZIP 완료 실패: {}", e))?;
    Ok(())
}

fn compress_tar(source: &std::path::Path, dest: &str, compression: Option<&str>) -> Result<(), String> {
    use std::fs::File;
    use tar::Builder;
    
    let file = File::create(dest).map_err(|e| format!("파일 생성 실패: {}", e))?;
    
    let name = source.file_name().and_then(|n| n.to_str()).unwrap_or("archive");
    
    match compression {
        Some("gz") => {
            use flate2::write::GzEncoder;
            use flate2::Compression;
            let encoder = GzEncoder::new(file, Compression::default());
            let mut tar = Builder::new(encoder);
            if source.is_file() {
                tar.append_path_with_name(source, name)
                    .map_err(|e| format!("TAR 파일 추가 실패: {}", e))?;
            } else {
                tar.append_dir_all(name, source)
                    .map_err(|e| format!("TAR 디렉토리 추가 실패: {}", e))?;
            }
            tar.finish().map_err(|e| format!("TAR 완료 실패: {}", e))?;
        }
        Some("bz2") => {
            use bzip2::write::BzEncoder;
            use bzip2::Compression;
            let encoder = BzEncoder::new(file, Compression::default());
            let mut tar = Builder::new(encoder);
            if source.is_file() {
                tar.append_path_with_name(source, name)
                    .map_err(|e| format!("TAR 파일 추가 실패: {}", e))?;
            } else {
                tar.append_dir_all(name, source)
                    .map_err(|e| format!("TAR 디렉토리 추가 실패: {}", e))?;
            }
            tar.finish().map_err(|e| format!("TAR 완료 실패: {}", e))?;
        }
        None => {
            let mut tar = Builder::new(file);
            if source.is_file() {
                tar.append_path_with_name(source, name)
                    .map_err(|e| format!("TAR 파일 추가 실패: {}", e))?;
            } else {
                tar.append_dir_all(name, source)
                    .map_err(|e| format!("TAR 디렉토리 추가 실패: {}", e))?;
            }
            tar.finish().map_err(|e| format!("TAR 완료 실패: {}", e))?;
        }
        _ => return Err("지원하지 않는 압축 형식".to_string()),
    }
    
    Ok(())
}

fn uuid_simple() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    format!("{:x}{:x}", duration.as_secs(), duration.subsec_nanos())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            connect,
            disconnect,
            list_files,
            download_file,
            upload_file,
            delete_file,
            preview_file_base64,
            preview_file_text,
            open_with_editor,
            open_with_default_app,
            get_available_editors,
            get_editor_path,
            set_editor_path,
            get_saved_connections,
            save_connection,
            delete_connection,
            export_bookmarks,
            import_bookmarks,
            compress_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
