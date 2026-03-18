import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs/operators';

/**
 * Interceptor to fix doubled /api/api paths in photo URLs returned by the backend.
 * The backend appears to be returning photoUrl with /api/api/ prefix instead of /api/.
 * This interceptor normalizes these URLs before they reach the application.
 */
export const urlNormalizationInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    map((event) => {
      if (event instanceof HttpResponse) {
        const normalizedBody = normalizePhotoUrls(event.body);
        if (normalizedBody !== event.body) {
          return event.clone({ body: normalizedBody });
        }
      }
      return event;
    }),
  );
};

/**
 * Recursively normalize photoUrl fields in objects by removing doubled /api/api paths.
 * Returns a new object with normalized URLs, or the same object if no changes needed.
 */
function normalizePhotoUrls(obj: any): any {
  if (Array.isArray(obj)) {
    const normalized = obj.map(item => normalizePhotoUrls(item));
    // Return new array only if something changed
    return normalized.some((item, idx) => item !== obj[idx]) ? normalized : obj;
  } else if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
    let hasChanges = false;
    const normalized: any = {};

    for (const key in obj) {
      if (key === 'photoUrl' && typeof obj[key] === 'string' && obj[key].includes('/api/api/')) {
        // Fix doubled /api/api to /api
        normalized[key] = obj[key].replace(/\/api\/api\//g, '/api/');
        hasChanges = true;
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        const normalizedValue = normalizePhotoUrls(obj[key]);
        normalized[key] = normalizedValue;
        if (normalizedValue !== obj[key]) {
          hasChanges = true;
        }
      } else {
        normalized[key] = obj[key];
      }
    }

    return hasChanges ? normalized : obj;
  }

  return obj;
}
