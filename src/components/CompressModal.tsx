import { useState } from 'react';

interface CompressModalProps {
  isOpen: boolean;
  fileName: string;
  onClose: () => void;
  onCompress: (format: string) => void;
  scale: number;
}

const FORMATS = [
  { id: 'zip', name: 'ZIP', ext: '.zip' },
  { id: 'tar', name: 'TAR', ext: '.tar' },
  { id: 'tar.gz', name: 'TAR.GZ (Gzip)', ext: '.tar.gz' },
  { id: 'tar.bz2', name: 'TAR.BZ2 (Bzip2)', ext: '.tar.bz2' },
];

export function CompressModal({
  isOpen,
  fileName,
  onClose,
  onCompress,
  scale,
}: CompressModalProps) {
  const [selectedFormat, setSelectedFormat] = useState('zip');

  if (!isOpen) return null;

  const baseFontSize = 13 * scale;

  const handleCompress = () => {
    onCompress(selectedFormat);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content compress-modal"
        style={{ fontSize: `${baseFontSize}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>압축하기</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="compress-info">
            <strong>{fileName}</strong> 을(를) 압축합니다.
          </div>

          <div className="format-selection">
            <label>압축 형식</label>
            <div className="format-options">
              {FORMATS.map((format) => (
                <label key={format.id} className="format-option">
                  <input
                    type="radio"
                    name="format"
                    value={format.id}
                    checked={selectedFormat === format.id}
                    onChange={() => setSelectedFormat(format.id)}
                  />
                  <span className="format-label">
                    <span className="format-name">{format.name}</span>
                    <span className="format-ext">{format.ext}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">취소</button>
          <button onClick={handleCompress} className="btn-primary">압축</button>
        </div>
      </div>
    </div>
  );
}
