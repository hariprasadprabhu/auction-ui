import { describe, expect, it } from 'vitest';

import { clampCropValue, getCropMovementBounds } from './crop-bounds';

describe('Register crop bounds', () => {
  it('should keep crop translation inside the crop bounds for large images', () => {
    const bounds = getCropMovementBounds(1200, 900, 1.2);

    expect(clampCropValue(1000, bounds.minX, bounds.maxX)).toBe(bounds.maxX);
    expect(clampCropValue(-1000, bounds.minY, bounds.maxY)).toBe(bounds.minY);
    expect(bounds.maxX).toBeLessThanOrEqual(300);
    expect(bounds.minX).toBeGreaterThanOrEqual(-300);
    expect(bounds.maxY).toBeLessThanOrEqual(300);
    expect(bounds.minY).toBeGreaterThanOrEqual(-300);
  });

  it('should keep exact-fit images centered in the crop box', () => {
    const bounds = getCropMovementBounds(200, 200, 1);

    expect(Math.abs(bounds.maxX)).toBe(0);
    expect(Math.abs(bounds.minX)).toBe(0);
    expect(Math.abs(bounds.maxY)).toBe(0);
    expect(Math.abs(bounds.minY)).toBe(0);
  });

  it('should allow drag movement on the axis where the image exceeds the crop box', () => {
    const bounds = getCropMovementBounds(1200, 900, 1);

    expect(bounds.maxX).toBeGreaterThan(0);
    expect(bounds.minX).toBeLessThan(0);
    expect(Math.abs(bounds.maxY)).toBe(0);
    expect(Math.abs(bounds.minY)).toBe(0);
  });
});
