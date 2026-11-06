import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { describe, it, expect, beforeEach } from 'vitest';

import { CloudinaryImageService } from './cloudinary-image.service';

describe('CloudinaryImageService', () => {
  let service: CloudinaryImageService;

  beforeEach(() => {
    const injector = Injector.create({
      providers: [{ provide: HttpClient, useValue: {} }],
    });

    service = runInInjectionContext(injector, () => new CloudinaryImageService());
  });

  it('should add a lower quality preview transformation when requested', () => {
    const url = 'https://res.cloudinary.com/drytm0fl7/image/upload/v123/sample.jpg';

    const transformed = service.getTransformedUrl(url, 180, 180, 60);

    expect(transformed).toContain('w_180');
    expect(transformed).toContain('h_180');
    expect(transformed).toContain('c_fill');
    expect(transformed).toContain('q_60');
  });
});
