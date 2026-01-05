interface ScaleControlProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  minScale: number;
  maxScale: number;
}

export function ScaleControl({
  scale,
  onZoomIn,
  onZoomOut,
  onReset,
  minScale,
  maxScale,
}: ScaleControlProps) {
  const percentage = Math.round(scale * 100);

  return (
    <div className="scale-control">
      <button
        onClick={onZoomOut}
        disabled={scale <= minScale}
        title="축소 (Cmd+-)"
      >
        −
      </button>
      <button onClick={onReset} className="scale-value" title="초기화">
        {percentage}%
      </button>
      <button
        onClick={onZoomIn}
        disabled={scale >= maxScale}
        title="확대 (Cmd++)"
      >
        +
      </button>
    </div>
  );
}
