import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open, save, confirm } from '@tauri-apps/plugin-dialog';
import { ScaleControl } from './components/ScaleControl';
import { BookmarkList } from './components/BookmarkList';
import { ConnectionModal } from './components/ConnectionModal';
import { CompressModal } from './components/CompressModal';
import { FileList } from './components/FileList';
import { PreviewPanel } from './components/PreviewPanel';
import { SettingsModal } from './components/SettingsModal';
import { useScale } from './hooks/useScale';
import type { Connection, FileEntry, Protocol } from './types';
import './App.css';

function App() {
  const { scale, zoomIn, zoomOut, resetZoom, minScale, maxScale } = useScale();
  
  const [connected, setConnected] = useState(false);
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedConnections, setSavedConnections] = useState<Connection[]>([]);
  const [currentProtocol, setCurrentProtocol] = useState<Protocol | null>(null);
  const [currentHost, setCurrentHost] = useState<string | null>(null);
  
  const [previewFile, setPreviewFile] = useState<FileEntry | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewImageData, setPreviewImageData] = useState<string | null>(null);
  const [previewPdfData, setPreviewPdfData] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  
  const [splitPosition, setSplitPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Connection | null>(null);
  const [recentPaths, setRecentPaths] = useState<string[]>([]);
  const [showCompressModal, setShowCompressModal] = useState(false);
  const [compressTarget, setCompressTarget] = useState<FileEntry | null>(null);

  useEffect(() => {
    loadSavedConnections();
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          zoomIn();
        } else if (e.key === '-') {
          e.preventDefault();
          zoomOut();
        } else if (e.key === '0') {
          e.preventDefault();
          resetZoom();
        } else if (e.key === ',') {
          e.preventDefault();
          setShowSettings(true);
        }
      }
      if (e.key === 'Escape') {
        if (showSettings) {
          setShowSettings(false);
        } else if (previewFile) {
          closePreview();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomIn, zoomOut, resetZoom, previewFile, showSettings]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !mainRef.current) return;
      
      const rect = mainRef.current.getBoundingClientRect();
      const newPosition = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPosition(Math.max(20, Math.min(80, newPosition)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  const handleDividerMouseDown = () => {
    setIsDragging(true);
  };

  const loadSavedConnections = async () => {
    try {
      const connections = await invoke<Connection[]>('get_saved_connections');
      setSavedConnections(connections);
    } catch (err) {
      console.error('Failed to load connections:', err);
    }
  };

  const handleConnect = async (connection: Omit<Connection, 'id'>) => {
    setLoading(true);
    setError(null);
    
    try {
      await invoke('connect', { connection });
      setConnected(true);
      setCurrentProtocol(connection.protocol);
      setCurrentHost(connection.host);
      await listFiles('/');
      
      await invoke('save_connection', { connection });
      await loadSavedConnections();
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await invoke('disconnect');
      setConnected(false);
      setCurrentProtocol(null);
      setCurrentHost(null);
      setFiles([]);
      setCurrentPath('/');
      setRecentPaths([]);
      closePreview();
    } catch (err) {
      setError(err as string);
    }
  };

  const listFiles = async (path: string) => {
    setLoading(true);
    try {
      const entries = await invoke<FileEntry[]>('list_files', { path });
      setFiles(entries);
      setCurrentPath(path);
      setRecentPaths(prev => {
        const filtered = prev.filter(p => p !== path);
        return [path, ...filtered].slice(0, 20);
      });
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (path: string) => {
    closePreview();
    listFiles(path);
  };

  const handleBack = () => {
    if (currentPath === '/' || currentPath === '') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const parentPath = '/' + parts.join('/');
    closePreview();
    listFiles(parentPath);
  };

  const handleDownload = async (file: FileEntry) => {
    try {
      const savePath = await save({
        defaultPath: file.name,
      });
      
      if (savePath) {
        setLoading(true);
        await invoke('download_file', {
          remotePath: file.path,
          localPath: savePath,
        });
        setError(null);
      }
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    try {
      const filePath = await open({
        multiple: false,
      });
      
      if (filePath) {
        setLoading(true);
        const fileName = filePath.split('/').pop() || 'file';
        const remotePath = currentPath === '/' 
          ? `/${fileName}` 
          : `${currentPath}/${fileName}`;
        
        await invoke('upload_file', {
          localPath: filePath,
          remotePath,
        });
        
        await listFiles(currentPath);
      }
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    listFiles(currentPath);
  };

  const handleDelete = async (file: FileEntry) => {
    const typeText = file.isDirectory ? '폴더' : '파일';
    const confirmed = await confirm(
      `"${file.name}" ${typeText}을(를) 삭제하시겠습니까?`,
      { title: '삭제 확인', kind: 'warning' }
    );
    
    if (confirmed) {
      setLoading(true);
      try {
        await invoke('delete_file', {
          remotePath: file.path,
          isDirectory: file.isDirectory,
        });
        if (previewFile?.path === file.path) {
          closePreview();
        }
        await listFiles(currentPath);
      } catch (err) {
        setError(err as string);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleOpenExternal = async (file: FileEntry) => {
    setLoading(true);
    try {
      await invoke('open_with_default_app', {
        remotePath: file.path,
        fileName: file.name,
      });
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWithEditor = async (file: FileEntry) => {
    setLoading(true);
    try {
      await invoke('open_with_editor', {
        remotePath: file.path,
        fileName: file.name,
      });
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConnection = async (id: string) => {
    try {
      await invoke('delete_connection', { id });
      await loadSavedConnections();
    } catch (err) {
      setError(err as string);
    }
  };

  const handleSaveBookmark = async (connection: Omit<Connection, 'id'> & { id?: string }) => {
    try {
      await invoke('save_connection', { connection });
      await loadSavedConnections();
    } catch (err) {
      setError(err as string);
    }
  };

  const handleConnectFromBookmark = async (bookmark: Connection) => {
    await handleConnect({
      name: bookmark.name,
      protocol: bookmark.protocol,
      host: bookmark.host,
      port: bookmark.port,
      username: bookmark.username,
      password: bookmark.password,
      share: bookmark.share,
    });
  };

  const handleDuplicateBookmark = async (bookmark: Connection) => {
    try {
      await invoke('save_connection', { 
        connection: {
          name: `${bookmark.name} (복사본)`,
          protocol: bookmark.protocol,
          host: bookmark.host,
          port: bookmark.port,
          username: bookmark.username,
          password: bookmark.password,
          share: bookmark.share,
        }
      });
      await loadSavedConnections();
    } catch (err) {
      setError(err as string);
    }
  };

  const handleExportBookmarks = async () => {
    try {
      const filePath = await save({
        defaultPath: 'easyftp-bookmarks.json',
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      
      if (filePath) {
        const exportData = savedConnections.map(conn => ({
          name: conn.name,
          protocol: conn.protocol,
          host: conn.host,
          port: conn.port,
          username: conn.username,
          share: conn.share,
        }));
        await invoke('export_bookmarks', { filePath, data: JSON.stringify(exportData, null, 2) });
      }
    } catch (err) {
      setError(err as string);
    }
  };

  const handleImportBookmarks = async () => {
    try {
      const filePath = await open({
        filters: [{ name: 'JSON', extensions: ['json'] }],
        multiple: false,
      });
      
      if (filePath) {
        const content = await invoke<string>('import_bookmarks', { filePath });
        const bookmarks = JSON.parse(content);
        
        for (const bookmark of bookmarks) {
          await invoke('save_connection', { 
            connection: {
              name: bookmark.name,
              protocol: bookmark.protocol,
              host: bookmark.host,
              port: bookmark.port,
              username: bookmark.username,
              password: bookmark.password || '',
              share: bookmark.share,
            }
          });
        }
        await loadSavedConnections();
      }
    } catch (err) {
      setError(err as string);
    }
  };

  const handleCompressRequest = (file: FileEntry) => {
    setCompressTarget(file);
    setShowCompressModal(true);
  };

  const handleCompress = async (format: string) => {
    if (!compressTarget) return;
    
    try {
      const ext = format === 'tar.gz' ? '.tar.gz' : format === 'tar.bz2' ? '.tar.bz2' : `.${format}`;
      const baseName = compressTarget.name.replace(/\.[^/.]+$/, '');
      const defaultName = `${baseName}${ext}`;
      
      const savePath = await save({
        defaultPath: defaultName,
        filters: [{ name: format.toUpperCase(), extensions: [format.replace('.', '')] }],
      });
      
      if (savePath) {
        setLoading(true);
        await invoke('compress_file', {
          remotePath: compressTarget.path,
          localPath: savePath,
          format,
          isDirectory: compressTarget.isDirectory,
        });
      }
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
      setCompressTarget(null);
    }
  };

  const handlePreview = async (file: FileEntry) => {
    setPreviewFile(file);
    setPreviewLoading(true);
    setPreviewContent(null);
    setPreviewImageData(null);
    setPreviewPdfData(null);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
      
      if (ext === 'pdf') {
        const base64 = await invoke<string>('preview_file_base64', { remotePath: file.path });
        setPreviewPdfData(`data:application/pdf;base64,${base64}`);
      } else if (imageExts.includes(ext)) {
        const base64 = await invoke<string>('preview_file_base64', { remotePath: file.path });
        const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 
                        ext === 'png' ? 'image/png' : 
                        ext === 'gif' ? 'image/gif' : 
                        ext === 'webp' ? 'image/webp' : 
                        ext === 'bmp' ? 'image/bmp' : 'image/png';
        setPreviewImageData(`data:${mimeType};base64,${base64}`);
      } else {
        const text = await invoke<string>('preview_file_text', { remotePath: file.path });
        setPreviewContent(text);
      }
    } catch (err) {
      setError(err as string);
      setPreviewFile(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewFile(null);
    setPreviewContent(null);
    setPreviewImageData(null);
    setPreviewPdfData(null);
  };

  const canGoBack = currentPath !== '/' && currentPath !== '';

  return (
    <div className="app" style={{ fontSize: `${14 * scale}px` }}>
      {connected ? (
        <>
          <header className="app-header">
            <div className="header-left">
              <button 
                className="nav-btn" 
                onClick={handleBack} 
                disabled={!canGoBack}
                title="뒤로"
              >
                ◀
              </button>
              <span className="connection-badge">
                {currentProtocol?.toUpperCase()}
              </span>
              {currentHost && (
                <span className="connection-host">{currentHost}</span>
              )}
            </div>
            <div className="header-controls">
              <button 
                className="settings-btn" 
                onClick={() => setShowSettings(true)}
                title="설정 (⌘,)"
              >
                ⚙
              </button>
              <ScaleControl
                scale={scale}
                onZoomIn={zoomIn}
                onZoomOut={zoomOut}
                onReset={resetZoom}
                minScale={minScale}
                maxScale={maxScale}
              />
              <button className="disconnect-btn" onClick={handleDisconnect}>
                연결 해제
              </button>
            </div>
          </header>

          {error && (
            <div className="error-banner">
              <span>{error}</span>
              <button onClick={() => setError(null)}>×</button>
            </div>
          )}

          <main className="app-main connected" ref={mainRef}>
            <div 
              className="file-list-panel" 
              style={{ width: previewFile ? `${splitPosition}%` : '100%' }}
            >
              <FileList
                files={files}
                currentPath={currentPath}
                recentPaths={recentPaths}
                onNavigate={handleNavigate}
                onDownload={handleDownload}
                onUpload={handleUpload}
                onRefresh={handleRefresh}
                onPreview={handlePreview}
                onDelete={handleDelete}
                onOpenExternal={handleOpenExternal}
                onOpenWithEditor={handleOpenWithEditor}
                onCompress={handleCompressRequest}
                scale={scale}
              />
            </div>
            
            {previewFile && (
              <>
                <div 
                  className="split-divider"
                  onMouseDown={handleDividerMouseDown}
                />
                <div 
                  className="preview-panel-container"
                  style={{ width: `${100 - splitPosition}%` }}
                >
                  <PreviewPanel
                    file={previewFile}
                    content={previewContent}
                    imageData={previewImageData}
                    pdfData={previewPdfData}
                    loading={previewLoading}
                    onClose={closePreview}
                    onDownload={handleDownload}
                    scale={scale}
                  />
                </div>
              </>
            )}
          </main>
        </>
      ) : (
        <>
          <header className="app-header">
            <div className="header-left">
              <span className="app-title-text">EasyFTP</span>
            </div>
            <div className="header-controls">
              <button 
                className="settings-btn" 
                onClick={() => setShowSettings(true)}
                title="설정 (⌘,)"
              >
                ⚙
              </button>
              <ScaleControl
                scale={scale}
                onZoomIn={zoomIn}
                onZoomOut={zoomOut}
                onReset={resetZoom}
                minScale={minScale}
                maxScale={maxScale}
              />
            </div>
          </header>

          {error && (
            <div className="error-banner">
              <span>{error}</span>
              <button onClick={() => setError(null)}>×</button>
            </div>
          )}

          <main className="app-main bookmark-main">
            <BookmarkList
              bookmarks={savedConnections}
              onConnect={handleConnectFromBookmark}
              onEdit={(bookmark) => { setEditingBookmark(bookmark); setShowConnectionModal(true); }}
              onDuplicate={handleDuplicateBookmark}
              onDelete={handleDeleteConnection}
              onAddNew={() => { setEditingBookmark(null); setShowConnectionModal(true); }}
              onExport={handleExportBookmarks}
              onImport={handleImportBookmarks}
              scale={scale}
            />
          </main>

          <ConnectionModal
            isOpen={showConnectionModal}
            onClose={() => { setShowConnectionModal(false); setEditingBookmark(null); }}
            onSave={handleSaveBookmark}
            onConnect={handleConnect}
            editingConnection={editingBookmark}
            scale={scale}
          />
        </>
      )}

      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
        </div>
      )}

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        scale={scale}
      />

      <CompressModal
        isOpen={showCompressModal}
        fileName={compressTarget?.name || ''}
        onClose={() => { setShowCompressModal(false); setCompressTarget(null); }}
        onCompress={handleCompress}
        scale={scale}
      />
    </div>
  );
}

export default App;
