import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe to normalize photo URLs by fixing doubled /api/api paths.
 * Usage: {{ photoUrl | normalizePhotoUrl }}
 * 
 * This serves as a fallback if the interceptor approach alone isn't sufficient.
 */
@Pipe({
  name: 'normalizePhotoUrl',
  standalone: true,
})
export class NormalizePhotoUrlPipe implements PipeTransform {
  transform(url: string | null | undefined): string | null | undefined {
    if (!url || typeof url !== 'string') {
      return url;
    }

    // Fix doubled /api/api to /api
    if (url.includes('/api/api/')) {
      return url.replace(/\/api\/api\//g, '/api/');
    }

    return url;
  }
}
