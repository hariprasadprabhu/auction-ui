import '@angular/compiler';
import { describe, expect, it } from 'vitest';

import { Players } from './teams';

describe('Players loading logic', () => {
  it('should finish loading after API requests complete, regardless of image count', () => {
    const component = Object.create(Players.prototype) as Players & {
      isLoading: boolean;
      pendingRequests: number;
      pendingImages: number;
      loadingStartTime: number;
      clearLoadingTimeout: () => void;
      cdr: { markForCheck: () => void };
    };

    component.isLoading = true;
    component.pendingRequests = 0;
    component.pendingImages = 99;
    component.loadingStartTime = Date.now();
    component.clearLoadingTimeout = () => {};
    component.cdr = { markForCheck: () => {} };

    (component as any).checkLoadingComplete();

    expect(component.isLoading).toBe(false);
  });

  it('should ignore image-load callbacks once the page has already moved past the loading state', () => {
    const component = Object.create(Players.prototype) as Players & {
      pendingImages: number;
      isLoading: boolean;
      pendingRequests: number;
      loadingStartTime: number;
      clearLoadingTimeout: () => void;
      cdr: { markForCheck: () => void };
    };

    component.pendingImages = 0;
    component.isLoading = false;
    component.pendingRequests = 0;
    component.loadingStartTime = Date.now();
    component.clearLoadingTimeout = () => {};
    component.cdr = { markForCheck: () => {} };

    (component as any).onImageLoad();
    (component as any).onImageError();

    expect(component.pendingImages).toBe(0);
  });
});
