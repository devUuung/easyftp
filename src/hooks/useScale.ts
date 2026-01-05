import { useState, useEffect } from 'react';

const SCALE_KEY = 'easyftp_scale';
const MIN_SCALE = 0.5;
const MAX_SCALE = 2.0;
const SCALE_STEP = 0.1;

export function useScale() {
  const [scale, setScale] = useState(() => {
    const saved = localStorage.getItem(SCALE_KEY);
    return saved ? parseFloat(saved) : 1.0;
  });

  useEffect(() => {
    localStorage.setItem(SCALE_KEY, scale.toString());
    document.documentElement.style.setProperty('--app-scale', scale.toString());
  }, [scale]);

  const zoomIn = () => {
    setScale(prev => Math.min(prev + SCALE_STEP, MAX_SCALE));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - SCALE_STEP, MIN_SCALE));
  };

  const resetZoom = () => {
    setScale(1.0);
  };

  return {
    scale,
    setScale,
    zoomIn,
    zoomOut,
    resetZoom,
    minScale: MIN_SCALE,
    maxScale: MAX_SCALE,
  };
}
