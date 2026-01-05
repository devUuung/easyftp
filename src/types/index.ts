export type Protocol = 'ftp' | 'sftp' | 'smb';

export interface Connection {
  id: string;
  name: string;
  protocol: Protocol;
  host: string;
  port: number;
  username: string;
  password: string;
  share?: string;
}

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: string;
  permissions?: string;
}

export interface ConnectionState {
  connected: boolean;
  protocol: Protocol | null;
  currentPath: string;
  files: FileEntry[];
  loading: boolean;
  error: string | null;
}
