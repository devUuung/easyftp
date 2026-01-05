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

### Homebrew (권장)

```bash
brew tap devUuung/tap
brew install --cask easyftp
```

### 수동 설치

[Releases](https://github.com/devUuung/easyftp/releases)에서 DMG 다운로드 후:

```bash
xattr -cr ~/Downloads/EasyFTP_*.dmg
```

DMG 열고 앱을 Applications로 드래그

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
