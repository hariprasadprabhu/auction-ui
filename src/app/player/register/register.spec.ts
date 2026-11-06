import { describe, expect, it } from 'vitest';

import { isAuctionDatePast } from '../../core/utils/auction-date';
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

describe('auction date gating', () => {
  it('should treat auction dates older than one buffer day as past', () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const dateString = `${twoDaysAgo.getFullYear()}-${String(twoDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(twoDaysAgo.getDate()).padStart(2, '0')}`;

    expect(isAuctionDatePast(dateString)).toBe(true);
  });

  it('should allow auction date plus one buffer day', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterdayString = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    expect(isAuctionDatePast(yesterdayString)).toBe(false);
    expect(isAuctionDatePast(todayString)).toBe(false);
  });

  it('should not treat future dates as past', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tomorrowString = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

    expect(isAuctionDatePast(tomorrowString)).toBe(false);
  });
});
