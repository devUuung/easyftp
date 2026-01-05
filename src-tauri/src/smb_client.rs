use crate::FileEntry;
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::PathBuf;
use std::process::Command;

pub struct SmbConnection {
    mount_point: PathBuf,
    host: String,
    share: String,
}

impl SmbConnection {
    pub fn connect(
        host: &str,
        _port: u16,
        username: &str,
        password: &str,
        share: &str,
    ) -> Result<Self, String> {
        let mount_point = PathBuf::from(format!("/tmp/easyftp_smb_{}_{}", host.replace('.', "_"), share));
        
        if mount_point.exists() {
            let _ = Command::new("umount")
                .arg(&mount_point)
                .output();
            let _ = fs::remove_dir(&mount_point);
        }
        
        fs::create_dir_all(&mount_point)
            .map_err(|e| format!("마운트 포인트 생성 실패: {}", e))?;

        let smb_url = format!(
            "//{}:{}@{}/{}",
            urlencoding::encode(username),
            urlencoding::encode(password),
            host,
            share
        );

        let output = Command::new("mount_smbfs")
            .arg("-o")
            .arg("nobrowse")
            .arg(&smb_url)
            .arg(&mount_point)
            .output()
            .map_err(|e| format!("mount_smbfs 실행 실패: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let _ = fs::remove_dir(&mount_point);
            return Err(format!("SMB 마운트 실패: {}", stderr.trim()));
        }

        Ok(Self {
            mount_point,
            host: host.to_string(),
            share: share.to_string(),
        })
    }

    fn get_local_path(&self, remote_path: &str) -> PathBuf {
        let clean_path = remote_path.trim_start_matches('/');
        if clean_path.is_empty() {
            self.mount_point.clone()
        } else {
            self.mount_point.join(clean_path)
        }
    }

    pub fn list_files(&mut self, path: &str) -> Result<Vec<FileEntry>, String> {
        let local_path = self.get_local_path(path);
        
        let entries = fs::read_dir(&local_path)
            .map_err(|e| format!("디렉토리 읽기 실패: {}", e))?;

        let mut files: Vec<FileEntry> = Vec::new();

        for entry in entries {
            let entry = entry.map_err(|e| format!("항목 읽기 실패: {}", e))?;
            let metadata = entry.metadata().map_err(|e| format!("메타데이터 읽기 실패: {}", e))?;
            let name = entry.file_name().to_string_lossy().to_string();
            
            if name.starts_with('.') {
                continue;
            }

            let file_path = if path == "/" || path.is_empty() {
                format!("/{}", name)
            } else {
                format!("{}/{}", path.trim_end_matches('/'), name)
            };

            let modified = metadata
                .modified()
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| {
                    chrono::DateTime::from_timestamp(d.as_secs() as i64, 0)
                        .map(|dt| dt.format("%Y-%m-%d %H:%M").to_string())
                        .unwrap_or_default()
                })
                .unwrap_or_default();

            files.push(FileEntry {
                name,
                path: file_path,
                is_directory: metadata.is_dir(),
                size: metadata.len(),
                modified,
                permissions: None,
            });
        }

        files.sort_by(|a, b| {
            if a.is_directory == b.is_directory {
                a.name.to_lowercase().cmp(&b.name.to_lowercase())
            } else if a.is_directory {
                std::cmp::Ordering::Less
            } else {
                std::cmp::Ordering::Greater
            }
        });

        Ok(files)
    }

    pub fn download(&mut self, remote_path: &str, local_path: &str) -> Result<(), String> {
        let src = self.get_local_path(remote_path);
        fs::copy(&src, local_path)
            .map_err(|e| format!("파일 복사 실패: {}", e))?;
        Ok(())
    }

    pub fn upload(&mut self, local_path: &str, remote_path: &str) -> Result<(), String> {
        let dst = self.get_local_path(remote_path);
        fs::copy(local_path, &dst)
            .map_err(|e| format!("파일 업로드 실패: {}", e))?;
        Ok(())
    }

    pub fn read_file(&mut self, remote_path: &str) -> Result<Vec<u8>, String> {
        let path = self.get_local_path(remote_path);
        let mut file = File::open(&path)
            .map_err(|e| format!("파일 열기 실패: {}", e))?;
        
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer)
            .map_err(|e| format!("파일 읽기 실패: {}", e))?;
        
        Ok(buffer)
    }

    pub fn delete(&mut self, remote_path: &str, is_directory: bool) -> Result<(), String> {
        let path = self.get_local_path(remote_path);
        
        if is_directory {
            fs::remove_dir_all(&path)
                .map_err(|e| format!("폴더 삭제 실패: {}", e))?;
        } else {
            fs::remove_file(&path)
                .map_err(|e| format!("파일 삭제 실패: {}", e))?;
        }
        
        Ok(())
    }
}

impl Drop for SmbConnection {
    fn drop(&mut self) {
        let _ = Command::new("umount")
            .arg(&self.mount_point)
            .output();
        let _ = fs::remove_dir(&self.mount_point);
    }
}
