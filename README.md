# EasyFTP

macOS FTP/SFTP/SMB 클라이언트 - CyberDuck 대체용

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-macOS-lightgrey.svg)

## Features

- **FTP/SFTP/SMB** 프로토콜 지원
- **Finder 스타일 UI** - 파일 미리보기, 아이콘
- **북마크 관리** - 저장, 편집, 가져오기/내보내기
- **파일 압축** - zip, tar, tar.gz, tar.bz2
- **외부 에디터 연동** - VS Code, Sublime Text 등
- **UI 확대/축소** - 50%~200% (Cmd +/-)

## Installation

### Download

[Releases](https://github.com/devUuung/easyftp/releases)에서 DMG 파일 다운로드

### macOS Gatekeeper 우회 (필수)

앱이 서명되지 않아서 "손상된 파일" 경고가 뜰 수 있어요.

**방법 1: 터미널 명령어**
```bash
# DMG 다운로드 후
xattr -cr ~/Downloads/EasyFTP_*.dmg

# 또는 앱 설치 후
xattr -cr /Applications/EasyFTP.app
```

**방법 2: 시스템 설정**
1. DMG 열고 앱을 Applications로 드래그
2. 앱 실행 시 경고 뜨면 취소
3. 시스템 설정 → 개인 정보 보호 및 보안 → 하단에 "확인 없이 열기" 클릭

## Build from Source

### Requirements

- Node.js 18+
- Rust 1.70+
- Xcode Command Line Tools

### Build

```bash
git clone https://github.com/devUuung/easyftp.git
cd easyftp
npm install
npm run tauri build
```

빌드 결과물: `src-tauri/target/release/bundle/`

## Keyboard Shortcuts

| 단축키 | 동작 |
|--------|------|
| `Cmd +` | 확대 |
| `Cmd -` | 축소 |
| `Cmd 0` | 원래 크기 |
| `Cmd ,` | 설정 |
| `Space` | 미리보기 |
| `Backspace` | 삭제 |
| `Esc` | 닫기 |

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Rust + Tauri 2
- **Protocols**: suppaftp, ssh2, mount_smbfs (macOS native)

## License

MIT
