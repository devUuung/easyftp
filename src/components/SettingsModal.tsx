import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  scale: number;
}

interface EditorInfo {
  name: string;
  path: string;
}

export function SettingsModal({ isOpen, onClose, scale }: SettingsModalProps) {
  const [editorPath, setEditorPath] = useState('');
  const [availableEditors, setAvailableEditors] = useState<EditorInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      loadAvailableEditors();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const path = await invoke<string>('get_editor_path');
      setEditorPath(path);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const loadAvailableEditors = async () => {
    try {
      const editors = await invoke<EditorInfo[]>('get_available_editors');
      setAvailableEditors(editors);
    } catch (err) {
      console.error('Failed to load editors:', err);
    }
  };

  const handleSelectEditor = (path: string) => {
    setEditorPath(path);
    setSaved(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await invoke('set_editor_path', { path: editorPath });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const baseFontSize = 13 * scale;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content settings-modal" 
        style={{ fontSize: `${baseFontSize}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>설정</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body">
          <div className="settings-section">
            <label>외부 텍스트 에디터</label>
            <p className="settings-hint">txt, tex 파일을 편집할 때 사용할 에디터를 선택하세요.</p>
            
            {availableEditors.length > 0 ? (
              <div className="editor-list">
                {availableEditors.map((editor) => (
                  <div 
                    key={editor.path}
                    className={`editor-item ${editorPath === editor.path ? 'selected' : ''}`}
                    onClick={() => handleSelectEditor(editor.path)}
                  >
                    <span className="editor-name">{editor.name}</span>
                    {editorPath === editor.path && <span className="editor-check">✓</span>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="settings-hint">설치된 에디터를 찾을 수 없습니다.</p>
            )}

            <div className="settings-input-row" style={{ marginTop: '0.75em' }}>
              <input
                type="text"
                value={editorPath}
                onChange={(e) => { setEditorPath(e.target.value); setSaved(false); }}
                placeholder="직접 입력: /Applications/에디터.app"
              />
            </div>
          </div>

          <div className="settings-section">
            <label>단축키</label>
            <div className="shortcut-list">
              <div className="shortcut-item">
                <span>미리보기</span>
                <span className="shortcut-key">Space</span>
              </div>
              <div className="shortcut-item">
                <span>삭제</span>
                <span className="shortcut-key">⌫</span>
              </div>
              <div className="shortcut-item">
                <span>확대</span>
                <span className="shortcut-key">⌘ +</span>
              </div>
              <div className="shortcut-item">
                <span>축소</span>
                <span className="shortcut-key">⌘ -</span>
              </div>
              <div className="shortcut-item">
                <span>설정</span>
                <span className="shortcut-key">⌘ ,</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          {saved && <span className="save-success">저장됨!</span>}
          <button onClick={onClose} className="btn-secondary">닫기</button>
          <button onClick={handleSave} disabled={loading} className="btn-primary">
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
