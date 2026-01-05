use crate::FileEntry;
use std::fs::File;
use std::io::{Read, Write};
use suppaftp::FtpStream;

pub struct FtpConnection {
    stream: FtpStream,
}

impl FtpConnection {
    pub fn connect(host: &str, port: u16, username: &str, password: &str) -> Result<Self, String> {
        let addr = format!("{}:{}", host, port);
        let mut stream = FtpStream::connect(&addr).map_err(|e| format!("FTP 연결 실패: {}", e))?;

        stream
            .login(username, password)
            .map_err(|e| format!("FTP 로그인 실패: {}", e))?;

        Ok(Self { stream })
    }

    pub fn list_files(&mut self, path: &str) -> Result<Vec<FileEntry>, String> {
        let path = if path.is_empty() { "/" } else { path };

        let list = self
            .stream
            .nlst(Some(path))
            .map_err(|e| format!("파일 목록 조회 실패: {}", e))?;

        let mut entries = Vec::new();

        for name in list {
            let file_path = if path == "/" {
                format!("/{}", name)
            } else {
                format!("{}/{}", path.trim_end_matches('/'), name)
            };

            let is_directory = self.stream.cwd(&file_path).is_ok();
            if is_directory {
                let _ = self.stream.cwd(path);
            }

            let size = if !is_directory {
                self.stream.size(&file_path).unwrap_or(0) as u64
            } else {
                0
            };

            entries.push(FileEntry {
                name: name.clone(),
                path: file_path,
                is_directory,
                size,
                modified: String::new(),
                permissions: None,
            });
        }

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
        let data = self
            .stream
            .retr_as_buffer(remote_path)
            .map_err(|e| format!("다운로드 실패: {}", e))?;

        let mut file =
            File::create(local_path).map_err(|e| format!("파일 생성 실패: {}", e))?;

        file.write_all(&data.into_inner())
            .map_err(|e| format!("파일 쓰기 실패: {}", e))?;

        Ok(())
    }

    pub fn upload(&mut self, local_path: &str, remote_path: &str) -> Result<(), String> {
        let mut file =
            File::open(local_path).map_err(|e| format!("파일 열기 실패: {}", e))?;

        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer)
            .map_err(|e| format!("파일 읽기 실패: {}", e))?;

        let mut reader = std::io::Cursor::new(buffer);
        self.stream
            .put_file(remote_path, &mut reader)
            .map_err(|e| format!("업로드 실패: {}", e))?;

        Ok(())
    }

    pub fn read_file(&mut self, remote_path: &str) -> Result<Vec<u8>, String> {
        let data = self
            .stream
            .retr_as_buffer(remote_path)
            .map_err(|e| format!("파일 읽기 실패: {}", e))?;

        Ok(data.into_inner())
    }

    pub fn delete(&mut self, remote_path: &str, is_directory: bool) -> Result<(), String> {
        if is_directory {
            self.stream
                .rmdir(remote_path)
                .map_err(|e| format!("폴더 삭제 실패: {}", e))?;
        } else {
            self.stream
                .rm(remote_path)
                .map_err(|e| format!("파일 삭제 실패: {}", e))?;
        }
        Ok(())
    }
}

impl Drop for FtpConnection {
    fn drop(&mut self) {
        let _ = self.stream.quit();
    }
}
