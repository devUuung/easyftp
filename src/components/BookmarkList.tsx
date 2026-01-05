import { useState, useEffect } from 'react';
import type { Connection } from '../types';

interface BookmarkListProps {
  bookmarks: Connection[];
  onConnect: (bookmark: Connection) => void;
  onEdit: (bookmark: Connection) => void;
  onDuplicate: (bookmark: Connection) => void;
  onDelete: (id: string) => void;
  onAddNew: () => void;
  onExport: () => void;
  onImport: () => void;
  scale: number;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  bookmark: Connection | null;
}

function getProtocolIcon(protocol: string): string {
  switch (protocol) {
    case 'sftp': return '🔐';
    case 'ftp': return '📁';
    case 'smb': return '🖥️';
    default: return '🌐';
  }
}

export function BookmarkList({
  bookmarks,
  onConnect,
  onEdit,
  onDuplicate,
  onDelete,
  onAddNew,
  onExport,
  onImport,
  scale,
}: BookmarkListProps) {
  const baseFontSize = 13 * scale;
  const rowHeight = 36 * scale;

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    bookmark: null,
  });

  useEffect(() => {
    const handleClick = () => {
      setContextMenu(prev => ({ ...prev, visible: false }));
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, bookmark: Connection) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      bookmark,
    });
  };

  const handleMenuAction = (action: string) => {
    if (!contextMenu.bookmark) return;
    
    switch (action) {
      case 'connect':
        onConnect(contextMenu.bookmark);
        break;
      case 'edit':
        onEdit(contextMenu.bookmark);
        break;
      case 'duplicate':
        onDuplicate(contextMenu.bookmark);
        break;
      case 'delete':
        onDelete(contextMenu.bookmark.id);
        break;
    }
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  return (
    <div className="bookmark-list-wrapper">
      <div className="bookmark-toolbar" style={{ fontSize: `${baseFontSize}px` }}>
        <span className="bookmark-title">북마크</span>
        <div className="toolbar-actions">
          <button onClick={onImport} className="toolbar-btn" title="가져오기">
            가져오기
          </button>
          <button onClick={onExport} className="toolbar-btn" disabled={bookmarks.length === 0} title="내보내기">
            내보내기
          </button>
          <button onClick={onAddNew} className="add-bookmark-btn">
            + 새 연결 추가
          </button>
        </div>
      </div>

      <div className="bookmark-list" style={{ fontSize: `${baseFontSize}px` }}>
        <div className="bookmark-header" style={{ height: `${rowHeight * 0.8}px` }}>
          <span className="col-icon"></span>
          <span className="col-name">이름</span>
          <span className="col-host">호스트</span>
          <span className="col-user">사용자</span>
          <span className="col-actions"></span>
        </div>

        <div className="bookmark-body">
          {bookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="bookmark-row"
              style={{ height: `${rowHeight}px` }}
              onDoubleClick={() => onConnect(bookmark)}
              onContextMenu={(e) => handleContextMenu(e, bookmark)}
            >
              <span className="col-icon">{getProtocolIcon(bookmark.protocol)}</span>
              <span className="col-name">
                <span className="bookmark-name">{bookmark.name}</span>
                <span className="bookmark-protocol">{bookmark.protocol.toUpperCase()}</span>
              </span>
              <span className="col-host">{bookmark.host}:{bookmark.port}</span>
              <span className="col-user">{bookmark.username}</span>
              <span className="col-actions">
                <button 
                  className="connect-btn-small"
                  onClick={(e) => { e.stopPropagation(); onConnect(bookmark); }}
                >
                  연결
                </button>
                <button 
                  className="edit-btn-small"
                  onClick={(e) => { e.stopPropagation(); onEdit(bookmark); }}
                >
                  ✎
                </button>
                <button 
                  className="delete-btn-small"
                  onClick={(e) => { e.stopPropagation(); onDelete(bookmark.id); }}
                >
                  ✕
                </button>
              </span>
            </div>
          ))}

          {bookmarks.length === 0 && (
            <div className="empty-message" style={{ height: `${rowHeight * 4}px` }}>
              <p>저장된 북마크가 없습니다</p>
              <button onClick={onAddNew} className="add-first-btn">
                + 첫 번째 연결 추가하기
              </button>
            </div>
          )}
        </div>
      </div>

      {contextMenu.visible && contextMenu.bookmark && (
        <div 
          className="context-menu"
          style={{ 
            left: contextMenu.x, 
            top: contextMenu.y,
            fontSize: `${baseFontSize}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-item" onClick={() => handleMenuAction('connect')}>
            연결
          </div>
          <div className="context-menu-divider" />
          <div className="context-menu-item" onClick={() => handleMenuAction('edit')}>
            편집
          </div>
          <div className="context-menu-item" onClick={() => handleMenuAction('duplicate')}>
            복제
          </div>
          <div className="context-menu-divider" />
          <div className="context-menu-item danger" onClick={() => handleMenuAction('delete')}>
            삭제
          </div>
        </div>
      )}
    </div>
  );
}
