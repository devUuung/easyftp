import { useState, useEffect, useRef } from 'react';
import type { FileEntry } from '../types';
import { PathBar } from './PathBar';

interface FileListProps {
  files: FileEntry[];
  currentPath: string;
  recentPaths: string[];
  onNavigate: (path: string) => void;
  onDownload: (file: FileEntry) => void;
  onUpload: () => void;
  onRefresh: () => void;
  onPreview: (file: FileEntry) => void;
  onDelete: (file: FileEntry) => void;
  onOpenExternal: (file: FileEntry) => void;
  onOpenWithEditor: (file: FileEntry) => void;
  onCompress: (file: FileEntry) => void;
  scale: number;
}

function isEditorFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const editorExts = [
    // Text
    'txt', 'md', 'markdown', 'rtf',
    // LaTeX
    'tex', 'bib', 'cls', 'sty',
    // Config
    'json', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'env', 'properties',
    'xml', 'plist',
    // Web
    'html', 'htm', 'css', 'scss', 'sass', 'less',
    'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs',
    'vue', 'svelte', 'astro',
    // Programming
    'py', 'pyw', 'pyx',
    'rb', 'erb',
    'php',
    'java', 'kt', 'kts', 'scala', 'groovy',
    'c', 'h', 'cpp', 'hpp', 'cc', 'cxx', 'hxx',
    'cs',
    'go',
    'rs',
    'swift',
    'm', 'mm',
    'r', 'R',
    'lua',
    'pl', 'pm',
    'sh', 'bash', 'zsh', 'fish',
    'ps1', 'psm1', 'bat', 'cmd',
    // Data
    'csv', 'tsv',
    'sql',
    'graphql', 'gql',
    // Docs
    'rst', 'adoc', 'asciidoc', 'org',
    // Other
    'log', 'diff', 'patch',
    'dockerfile', 'makefile', 'cmake',
    'gitignore', 'gitattributes', 'editorconfig',
  ];
  return editorExts.includes(ext) || 
         name.toLowerCase() === 'dockerfile' ||
         name.toLowerCase() === 'makefile' ||
         name.toLowerCase() === '.gitignore' ||
         name.toLowerCase() === '.env';
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  file: FileEntry | null;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const now = new Date();
  const isThisYear = date.getFullYear() === now.getFullYear();
  
  if (isThisYear) {
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
  return date.toLocaleDateString('ko-KR', {
    year: '2-digit',
    month: 'short',
    day: 'numeric',
  });
}

function FolderIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path
        d="M2 5C2 3.89543 2.89543 3 4 3H7.17157C7.70201 3 8.21071 3.21071 8.58579 3.58579L9.41421 4.41421C9.78929 4.78929 10.298 5 10.8284 5H16C17.1046 5 18 5.89543 18 7V15C18 16.1046 17.1046 17 16 17H4C2.89543 17 2 16.1046 2 15V5Z"
        fill="#54AEFF"
        stroke="#3D8BFF"
        strokeWidth="1"
      />
      <path
        d="M2 8H18V15C18 16.1046 17.1046 17 16 17H4C2.89543 17 2 16.1046 2 15V8Z"
        fill="#7CC4FF"
      />
    </svg>
  );
}

function FileIcon({ size, name }: { size: number; name: string }) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  
  const getFileColor = () => {
    const colors: Record<string, string> = {
      pdf: '#FF3B30',
      doc: '#007AFF', docx: '#007AFF',
      xls: '#34C759', xlsx: '#34C759',
      ppt: '#FF9500', pptx: '#FF9500',
      zip: '#8E8E93', rar: '#8E8E93', '7z': '#8E8E93', tar: '#8E8E93', gz: '#8E8E93',
      jpg: '#FF2D55', jpeg: '#FF2D55', png: '#FF2D55', gif: '#FF2D55', svg: '#FF2D55', webp: '#FF2D55',
      mp4: '#AF52DE', mov: '#AF52DE', avi: '#AF52DE', mkv: '#AF52DE',
      mp3: '#FF2D55', wav: '#FF2D55', flac: '#FF2D55',
      js: '#F7DF1E', ts: '#3178C6', jsx: '#61DAFB', tsx: '#61DAFB',
      py: '#3776AB',
      html: '#E34F26', css: '#1572B6',
      json: '#8E8E93', xml: '#8E8E93', yml: '#8E8E93', yaml: '#8E8E93',
      md: '#083FA1',
      txt: '#8E8E93',
      tex: '#008080',
    };
    return colors[ext] || '#8E8E93';
  };

  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path
        d="M4 2C4 1.44772 4.44772 1 5 1H11L16 6V18C16 18.5523 15.5523 19 15 19H5C4.44772 19 4 18.5523 4 18V2Z"
        fill="#F5F5F7"
        stroke="#D2D2D7"
        strokeWidth="1"
      />
      <path
        d="M11 1L16 6H12C11.4477 6 11 5.55228 11 5V1Z"
        fill="#E5E5EA"
      />
      <text
        x="10"
        y="14"
        fontSize="4"
        fontWeight="600"
        fill={getFileColor()}
        textAnchor="middle"
        fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
      >
        {ext.toUpperCase().slice(0, 4)}
      </text>
    </svg>
  );
}

export function FileList({
  files,
  currentPath,
  recentPaths,
  onNavigate,
  onDownload,
  onUpload,
  onRefresh,
  onPreview,
  onDelete,
  onOpenExternal,
  onOpenWithEditor,
  onCompress,
  scale,
}: FileListProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    file: null,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = () => {
      setContextMenu(prev => ({ ...prev, visible: false }));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && selectedPath && !e.repeat) {
        e.preventDefault();
        const selectedFile = files.find(f => f.path === selectedPath);
        if (selectedFile && !selectedFile.isDirectory) {
          onPreview(selectedFile);
        }
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (selectedPath) {
          const selectedFile = files.find(f => f.path === selectedPath);
          if (selectedFile) {
            onDelete(selectedFile);
          }
        }
      }
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedPath, files, onPreview, onDelete]);

  const handleClick = (file: FileEntry) => {
    setSelectedPath(file.path);
  };

  const handleDoubleClick = (file: FileEntry) => {
    if (file.isDirectory) {
      onNavigate(file.path);
    } else if (isEditorFile(file.name)) {
      onOpenWithEditor(file);
    } else {
      onOpenExternal(file);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, file: FileEntry) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedPath(file.path);
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      file,
    });
  };

  const handleMenuAction = (action: string) => {
    if (!contextMenu.file) return;
    
    switch (action) {
      case 'open':
        if (contextMenu.file.isDirectory) {
          onNavigate(contextMenu.file.path);
        } else if (isEditorFile(contextMenu.file.name)) {
          onOpenWithEditor(contextMenu.file);
        } else {
          onOpenExternal(contextMenu.file);
        }
        break;
      case 'preview':
        if (!contextMenu.file.isDirectory) {
          onPreview(contextMenu.file);
        }
        break;
      case 'download':
        if (!contextMenu.file.isDirectory) {
          onDownload(contextMenu.file);
        }
        break;
      case 'delete':
        onDelete(contextMenu.file);
        break;
      case 'compress':
        onCompress(contextMenu.file);
        break;
    }
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const baseFontSize = 13 * scale;
  const rowHeight = 28 * scale;
  const iconSize = 16 * scale;

  return (
    <div className="file-list-wrapper" ref={containerRef}>
      <div className="file-toolbar" style={{ fontSize: `${baseFontSize}px` }}>
        <PathBar
          currentPath={currentPath}
          recentPaths={recentPaths}
          onNavigate={onNavigate}
          scale={scale}
        />
        <div className="toolbar-actions">
          <button onClick={onUpload} title="업로드">
            업로드
          </button>
          <button onClick={onRefresh} title="새로고침">
            ↻
          </button>
        </div>
      </div>

      <div className="file-list" style={{ fontSize: `${baseFontSize}px` }}>
        <div className="file-header" style={{ height: `${rowHeight}px` }}>
          <span className="col-icon"></span>
          <span className="col-name">이름</span>
          <span className="col-size">크기</span>
          <span className="col-date">수정일</span>
        </div>

        <div className="file-body">
          {files.map((file) => (
            <div
              key={file.path}
              className={`file-row ${file.isDirectory ? 'directory' : 'file'} ${selectedPath === file.path ? 'selected' : ''}`}
              style={{ height: `${rowHeight}px` }}
              onClick={() => handleClick(file)}
              onDoubleClick={() => handleDoubleClick(file)}
              onContextMenu={(e) => handleContextMenu(e, file)}
            >
              <span className="col-icon">
                {file.isDirectory ? (
                  <FolderIcon size={iconSize} />
                ) : (
                  <FileIcon size={iconSize} name={file.name} />
                )}
              </span>
              <span className="col-name">{file.name}</span>
              <span className="col-size">
                {file.isDirectory ? '-' : formatSize(file.size)}
              </span>
              <span className="col-date">{formatDate(file.modified)}</span>
            </div>
          ))}

          {files.length === 0 && (
            <div className="empty-message" style={{ height: `${rowHeight * 4}px` }}>
              폴더가 비어있습니다
            </div>
          )}
        </div>
      </div>

      {contextMenu.visible && contextMenu.file && (
        <div 
          className="context-menu"
          style={{ 
            left: contextMenu.x, 
            top: contextMenu.y,
            fontSize: `${baseFontSize}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-item" onClick={() => handleMenuAction('open')}>
            {contextMenu.file.isDirectory 
              ? '열기' 
              : isEditorFile(contextMenu.file.name) 
                ? '에디터로 열기' 
                : '외부 앱으로 열기'}
          </div>
          {!contextMenu.file.isDirectory && (
            <>
              <div className="context-menu-item" onClick={() => handleMenuAction('preview')}>
                미리보기 <span className="shortcut">Space</span>
              </div>
              <div className="context-menu-item" onClick={() => handleMenuAction('download')}>
                다운로드
              </div>
            </>
          )}
          <div className="context-menu-item" onClick={() => handleMenuAction('compress')}>
            압축하기
          </div>
          <div className="context-menu-divider" />
          <div className="context-menu-item danger" onClick={() => handleMenuAction('delete')}>
            삭제 <span className="shortcut">⌫</span>
          </div>
        </div>
      )}
    </div>
  );
}
