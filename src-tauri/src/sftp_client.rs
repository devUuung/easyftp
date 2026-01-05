use crate::FileEntry;
use ssh2::{Session, Sftp};
use std::fs::File;
use std::io::{Read, Write};
use std::net::TcpStream;
use std::path::Path;

pub struct SftpConnection {
    session: Session,
    sftp: Sftp,
}

impl SftpConnection {
    pub fn connect(host: &str, port: u16, username: &str, password: &str) -> Result<Self, String> {
        let addr = format!("{}:{}", host, port);
        let tcp = TcpStream::connect(&addr).map_err(|e| format!("SFTP 연결 실패: {}", e))?;

        let mut session = Session::new().map_err(|e| format!("세션 생성 실패: {}", e))?;
        session.set_tcp_stream(tcp);
        session
            .handshake()
            .map_err(|e| format!("핸드셰이크 실패: {}", e))?;

        session
            .userauth_password(username, password)
            .map_err(|e| format!("SFTP 인증 실패: {}", e))?;

        if !session.authenticated() {
            return Err("인증 실패".to_string());
        }

        let sftp = session
            .sftp()
            .map_err(|e| format!("SFTP 서브시스템 시작 실패: {}", e))?;

        Ok(Self { session, sftp })
    }

    pub fn list_files(&mut self, path: &str) -> Result<Vec<FileEntry>, String> {
        let path = if path.is_empty() { "/" } else { path };
        let remote_path = Path::new(path);

        let dir = self
            .sftp
            .readdir(remote_path)
            .map_err(|e| format!("디렉토리 읽기 실패: {}", e))?;

        let mut entries: Vec<FileEntry> = dir
            .into_iter()
            .filter_map(|(path_buf, stat)| {
                let name = path_buf.file_name()?.to_string_lossy().to_string();

                if name == "." || name == ".." {
                    return None;
                }

                let modified = stat
                    .mtime
                    .map(|t| {
                        chrono::DateTime::from_timestamp(t as i64, 0)
                            .map(|dt| dt.to_rfc3339())
                            .unwrap_or_default()
                    })
                    .unwrap_or_default();

                Some(FileEntry {
                    name,
                    path: path_buf.to_string_lossy().to_string(),
                    is_directory: stat.is_dir(),
                    size: stat.size.unwrap_or(0),
                    modified,
                    permissions: stat.perm.map(|p| format!("{:o}", p)),
                })
            })
            .collect();

        entries.sort_by(|a, b| {
            if a.is_directory == b.is_directory {
                a.name.to_lowercase().cmp(&b.name.to_lowercase())
            } else if a.is_directory {
                std::cmp::Ordering::Less
            } else {
                std::cmp::Ordering::Greater
            }
        });

        Ok(entries)
    }

    pub fn download(&mut self, remote_path: &str, local_path: &str) -> Result<(), String> {
        let mut remote_file = self
            .sftp
            .open(Path::new(remote_path))
            .map_err(|e| format!("원격 파일 열기 실패: {}", e))?;

        let mut buffer = Vec::new();
        remote_file
            .read_to_end(&mut buffer)
            .map_err(|e| format!("파일 읽기 실패: {}", e))?;

        let mut local_file =
            File::create(local_path).map_err(|e| format!("로컬 파일 생성 실패: {}", e))?;

        local_file
            .write_all(&buffer)
            .map_err(|e| format!("파일 쓰기 실패: {}", e))?;

        Ok(())
    }

    pub fn upload(&mut self, local_path: &str, remote_path: &str) -> Result<(), String> {
        let mut local_file =
            File::open(local_path).map_err(|e| format!("로컬 파일 열기 실패: {}", e))?;

        let mut buffer = Vec::new();
        local_file
            .read_to_end(&mut buffer)
            .map_err(|e| format!("파일 읽기 실패: {}", e))?;

        let mut remote_file = self
            .sftp
            .create(Path::new(remote_path))
            .map_err(|e| format!("원격 파일 생성 실패: {}", e))?;

        remote_file
            .write_all(&buffer)
            .map_err(|e| format!("파일 쓰기 실패: {}", e))?;

        Ok(())
    }

    pub fn read_file(&mut self, remote_path: &str) -> Result<Vec<u8>, String> {
        let mut remote_file = self
            .sftp
            .open(Path::new(remote_path))
            .map_err(|e| format!("원격 파일 열기 실패: {}", e))?;

        let mut buffer = Vec::new();
        remote_file
            .read_to_end(&mut buffer)
            .map_err(|e| format!("파일 읽기 실패: {}", e))?;

        Ok(buffer)
    }

    pub fn delete(&mut self, remote_path: &str, is_directory: bool) -> Result<(), String> {
        let path = Path::new(remote_path);
        if is_directory {
            self.sftp
                .rmdir(path)
                .map_err(|e| format!("폴더 삭제 실패: {}", e))?;
        } else {
            self.sftp
                .unlink(path)
                .map_err(|e| format!("파일 삭제 실패: {}", e))?;
        }
        Ok(())
    }
}
