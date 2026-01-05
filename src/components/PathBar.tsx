import { useState, useRef, useEffect } from 'react';

interface PathBarProps {
  currentPath: string;
  recentPaths: string[];
  onNavigate: (path: string) => void;
  scale: number;
}

export function PathBar({
  currentPath,
  recentPaths,
  onNavigate,
  scale,
}: PathBarProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const baseFontSize = 13 * scale;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pathSegments = currentPath.split('/').filter(Boolean);
  
  const handleSegmentClick = (index: number) => {
    const newPath = '/' + pathSegments.slice(0, index + 1).join('/');
    onNavigate(newPath);
  };

  const handleRootClick = () => {
    onNavigate('/');
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setShowDropdown(!showDropdown);
    }
  };

  const handleRecentClick = (path: string) => {
    onNavigate(path);
    setShowDropdown(false);
  };

  const uniqueRecentPaths = recentPaths
    .filter((p, i, arr) => arr.indexOf(p) === i && p !== currentPath)
    .slice(0, 10);

  return (
    <div 
      className="path-bar-container" 
      ref={containerRef}
      style={{ fontSize: `${baseFontSize}px` }}
    >
      <div className="path-bar" onClick={handleContainerClick}>
        <span className="path-segment root" onClick={handleRootClick}>
          /
        </span>
        {pathSegments.map((segment, index) => (
          <span key={index} className="path-segment-wrapper">
            <span 
              className="path-segment"
              onClick={(e) => { e.stopPropagation(); handleSegmentClick(index); }}
            >
              {segment}
            </span>
            {index < pathSegments.length - 1 && (
              <span className="path-separator">/</span>
            )}
          </span>
        ))}
      </div>

      {showDropdown && uniqueRecentPaths.length > 0 && (
        <div className="path-dropdown">
          <div className="path-dropdown-header">최근 경로</div>
          {uniqueRecentPaths.map((path, index) => (
            <div 
              key={index}
              className="path-dropdown-item"
              onClick={() => handleRecentClick(path)}
            >
              {path}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
