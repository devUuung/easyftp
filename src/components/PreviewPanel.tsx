import { useState, useRef, useEffect } from 'react';
import type { FileEntry } from '../types';

interface PreviewPanelProps {
  file: FileEntry | null;
  content: string | null;
  imageData: string | null;
  pdfData: string | null;
  loading: boolean;
  onClose: () => void;
  onDownload: (file: FileEntry) => void;
  scale: number;
}

function getFileType(name: string): 'image' | 'text' | 'pdf' | 'unknown' {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
  const textExts = ['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'ts', 'jsx', 'tsx', 'py', 'sh', 'yml', 'yaml', 'log', 'csv'];
  
  if (ext === 'pdf') return 'pdf';
  if (imageExts.includes(ext)) return 'image';
  if (textExts.includes(ext)) return 'text';
  return 'unknown';
}

export function PreviewPanel({
  file,
  content,
  imageData,
  pdfData,
  loading,
  onClose,
  onDownload,
  scale,
}: PreviewPanelProps) {
  const [previewZoom, setPreviewZoom] = useState(100);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPreviewZoom(100);
  }, [file]);

  if (!file) return null;

  const fileType = getFileType(file.name);
  const baseFontSize = 13 * scale;

  const handleZoomIn = () => setPreviewZoom(prev => Math.min(prev + 25, 300));
  const handleZoomOut = () => setPreviewZoom(prev => Math.max(prev - 25, 25));
  const handleZoomReset = () => setPreviewZoom(100);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    }
  };

  const showZoomControls = fileType === 'image' || fileType === 'pdf' || fileType === 'text';

  return (
    <div className="preview-panel" style={{ fontSize: `${baseFontSize}px` }}>
      <div className="preview-header">
        <span className="preview-filename">{file.name}</span>
        <div className="preview-actions">
          {showZoomControls && (
            <div className="preview-zoom-controls">
              <button onClick={handleZoomOut} disabled={previewZoom <= 25} title="축소">
                −
              </button>
              <span className="preview-zoom-value" onClick={handleZoomReset} title="100%로 리셋">
                {previewZoom}%
              </span>
              <button onClick={handleZoomIn} disabled={previewZoom >= 300} title="확대">
                +
              </button>
            </div>
          )}
          <button onClick={() => onDownload(file)} title="다운로드">
            다운로드
          </button>
          <button onClick={onClose} className="close-btn" title="닫기">
            ✕
          </button>
        </div>
      </div>
      
      <div 
        className="preview-content" 
        ref={contentRef}
        onWheel={handleWheel}
      >
        {loading ? (
          <div className="preview-loading">
            <div className="spinner"></div>
            <span>로딩 중...</span>
          </div>
        ) : fileType === 'pdf' && pdfData ? (
          <div className="preview-pdf-container" style={{ transform: `scale(${previewZoom / 100})`, transformOrigin: 'top left' }}>
            <iframe
              src={pdfData}
              className="preview-pdf"
              title={file.name}
            />
          </div>
        ) : fileType === 'image' && imageData ? (
          <div className="preview-image-container">
            <img 
              src={imageData} 
              alt={file.name} 
              className="preview-image" 
              style={{ transform: `scale(${previewZoom / 100})` }}
            />
          </div>
        ) : fileType === 'text' && content !== null ? (
          <pre className="preview-text" style={{ fontSize: `${0.8 * previewZoom / 100}em` }}>{content}</pre>
        ) : (
          <div className="preview-unsupported">
            <span>미리보기를 지원하지 않는 파일입니다</span>
            <button onClick={() => onDownload(file)}>다운로드</button>
          </div>
        )}
      </div>
    </div>
  );
}
