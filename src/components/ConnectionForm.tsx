import { useState } from 'react';
import type { Protocol, Connection } from '../types';

interface ConnectionFormProps {
  onConnect: (connection: Omit<Connection, 'id'>) => void;
  onSaveBookmark: (connection: Omit<Connection, 'id'>) => void;
  loading: boolean;
  savedConnections: Connection[];
  onLoadConnection: (connection: Connection) => void;
  onDeleteConnection: (id: string) => void;
}

const DEFAULT_PORTS: Record<Protocol, number> = {
  ftp: 21,
  sftp: 22,
  smb: 445,
};

export function ConnectionForm({
  onConnect,
  onSaveBookmark,
  loading,
  savedConnections,
  onLoadConnection,
  onDeleteConnection,
}: ConnectionFormProps) {
  const [protocol, setProtocol] = useState<Protocol>('sftp');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(22);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [share, setShare] = useState('');
  const [name, setName] = useState('');

  const handleProtocolChange = (newProtocol: Protocol) => {
    setProtocol(newProtocol);
    setPort(DEFAULT_PORTS[newProtocol]);
  };

  const getConnectionData = (): Omit<Connection, 'id'> => ({
    name: name || `${host}`,
    protocol,
    host,
    port,
    username,
    password,
    share: protocol === 'smb' ? share : undefined,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConnect(getConnectionData());
  };

  const handleSaveBookmark = () => {
    if (!host || !username) return;
    onSaveBookmark(getConnectionData());
  };

  const handleLoadConnection = (conn: Connection) => {
    setProtocol(conn.protocol);
    setHost(conn.host);
    setPort(conn.port);
    setUsername(conn.username);
    setPassword(conn.password);
    setShare(conn.share || '');
    setName(conn.name);
    onLoadConnection(conn);
  };

  const isFormValid = host && username && password && (protocol !== 'smb' || share);

  return (
    <div className="connection-panel">
      <form onSubmit={handleSubmit} className="connection-form">
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
          <label>호스트</label>
          <input
            type="text"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="example.com"
            required
          />
        </div>

        <div className="form-row">
          <label>포트</label>
          <input
            type="number"
            value={port}
            onChange={(e) => setPort(parseInt(e.target.value))}
            required
          />
        </div>

        <div className="form-row">
          <label>사용자</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            required
          />
        </div>

        <div className="form-row">
          <label>비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        {protocol === 'smb' && (
          <div className="form-row">
            <label>공유폴더</label>
            <input
              type="text"
              value={share}
              onChange={(e) => setShare(e.target.value)}
              placeholder="SharedFolder"
              required
            />
          </div>
        )}

        <div className="form-row">
          <label>북마크 이름</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="내 서버 (선택)"
          />
        </div>

        <div className="button-row">
          <button type="submit" className="connect-btn" disabled={loading || !isFormValid}>
            {loading ? '연결 중...' : '연결'}
          </button>
          <button
            type="button"
            className="bookmark-btn"
            onClick={handleSaveBookmark}
            disabled={!host || !username}
            title="북마크에 저장"
          >
            ⭐ 저장
          </button>
        </div>
      </form>

      {savedConnections.length > 0 && (
        <div className="saved-connections">
          <h3>⭐ 북마크</h3>
          <ul>
            {savedConnections.map((conn) => (
              <li key={conn.id}>
                <button
                  className="saved-conn-btn"
                  onClick={() => handleLoadConnection(conn)}
                >
                  <span className="conn-protocol">{conn.protocol.toUpperCase()}</span>
                  <span className="conn-name">{conn.name}</span>
                  <span className="conn-host">{conn.host}</span>
                </button>
                <button
                  className="delete-btn"
                  onClick={() => onDeleteConnection(conn.id)}
                  title="삭제"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
