export const CROP_VIEWPORT_SIZE = 300;
export const CROP_ZOOM_MIN = 1;
export const CROP_ZOOM_MAX = 2.5;

export function getCropMovementBounds(width: number, height: number, zoom: number) {
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : CROP_ZOOM_MIN;

  if (!width || !height) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }

  const fitScale = Math.max(CROP_VIEWPORT_SIZE / width, CROP_VIEWPORT_SIZE / height);
  const renderedWidth = width * fitScale * safeZoom;
  const renderedHeight = height * fitScale * safeZoom;

  const maxX = Math.max(0, (renderedWidth - CROP_VIEWPORT_SIZE) / 2);
  const maxY = Math.max(0, (renderedHeight - CROP_VIEWPORT_SIZE) / 2);

  return {
    minX: -maxX,
    maxX,
    minY: -maxY,
    maxY,
  };
}

export function clampCropValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
