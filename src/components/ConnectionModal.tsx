import { useState, useEffect } from 'react';
import type { Protocol, Connection } from '../types';

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (connection: Omit<Connection, 'id'> & { id?: string }) => void;
  onConnect: (connection: Omit<Connection, 'id'>) => void;
  editingConnection?: Connection | null;
  scale: number;
}

const DEFAULT_PORTS: Record<Protocol, number> = {
  ftp: 21,
  sftp: 22,
  smb: 445,
};

export function ConnectionModal({
  isOpen,
  onClose,
  onSave,
  onConnect,
  editingConnection,
  scale,
}: ConnectionModalProps) {
  const [protocol, setProtocol] = useState<Protocol>('sftp');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(22);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [share, setShare] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (editingConnection) {
        setProtocol(editingConnection.protocol as Protocol);
        setHost(editingConnection.host);
        setPort(editingConnection.port);
        setUsername(editingConnection.username);
        setPassword(editingConnection.password);
        setShare(editingConnection.share || '');
        setName(editingConnection.name);
      } else {
        setProtocol('sftp');
        setHost('');
        setPort(22);
        setUsername('');
        setPassword('');
        setShare('');
        setName('');
      }
    }
  }, [isOpen, editingConnection]);

  const handleProtocolChange = (newProtocol: Protocol) => {
    setProtocol(newProtocol);
    setPort(DEFAULT_PORTS[newProtocol]);
  };

  const getConnectionData = (): Omit<Connection, 'id'> => ({
    name: name || host,
    protocol,
    host,
    port,
    username,
    password,
    share: protocol === 'smb' ? share : undefined,
  });

  const handleSave = () => {
    if (!host || !username) return;
    const data = getConnectionData();
    if (editingConnection) {
      onSave({ ...data, id: editingConnection.id });
    } else {
      onSave(data);
    }
    onClose();
  };

  const handleConnect = () => {
    if (!host || !username || !password) return;
    onConnect(getConnectionData());
  };

  const isFormValid = host && username && password && (protocol !== 'smb' || share);
  const canSave = host && username;

  if (!isOpen) return null;

  const baseFontSize = 13 * scale;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content connection-modal"
        style={{ fontSize: `${baseFontSize}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{editingConnection ? '연결 편집' : '새 연결 추가'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="form-row">
            <label>프로토콜</label>
            <div className="protocol-buttons">
              {(['ftp', 'sftp', 'smb'] as Protocol[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`protocol-btn ${protocol === p ? 'active' : ''}`}
                  onClick={() => handleProtocolChange(p)}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="form-row">
            <label>북마크 이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="내 서버 (선택사항)"
            />
          </div>

          <div className="form-row-group">
            <div className="form-row flex-grow">
              <label>호스트</label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="example.com"
              />
            </div>
            <div className="form-row port-field">
              <label>포트</label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="form-row">
            <label>사용자</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
            />
          </div>

          <div className="form-row">
            <label>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {protocol === 'smb' && (
            <div className="form-row">
              <label>공유폴더</label>
              <input
                type="text"
                value={share}
                onChange={(e) => setShare(e.target.value)}
                placeholder="SharedFolder (필수)"
              />
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">취소</button>
          <button 
            onClick={handleSave} 
            disabled={!canSave}
            className="btn-secondary"
          >
            저장만
          </button>
          <button 
            onClick={handleConnect} 
            disabled={!isFormValid}
            className="btn-primary"
          >
            연결
          </button>
        </div>
      </div>
    </div>
  );
}
