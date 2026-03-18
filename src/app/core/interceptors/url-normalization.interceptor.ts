import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { tap } from 'rxjs';

/**
 * Interceptor to fix doubled /api/api paths in photo URLs returned by the backend.
 * The backend appears to be returning photoUrl with /api/api/ prefix instead of /api/.
 * This interceptor normalizes these URLs.
 */
export const urlNormalizationInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        const body = event.body;
        if (body && typeof body === 'object') {
          normalizePhotoUrl(body);
        }
      }
    }),
  );
};

/**
 * Recursively normalize photoUrl fields in objects by removing doubled /api/api paths
 */
function normalizePhotoUrl(obj: any): void {
  if (Array.isArray(obj)) {
    for (const item of obj) {
      normalizePhotoUrl(item);
    }
  } else if (obj && typeof obj === 'object') {
    for (const key in obj) {
      if (key === 'photoUrl' && typeof obj[key] === 'string') {
        // Fix doubled /api/api to /api
        if (obj[key].includes('/api/api/')) {
          obj[key] = obj[key].replace('/api/api/', '/api/');
        }
      } else if (typeof obj[key] === 'object') {
        normalizePhotoUrl(obj[key]);
      }
    }
  }
}
