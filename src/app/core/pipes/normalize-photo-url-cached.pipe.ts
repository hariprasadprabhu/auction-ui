import { Pipe, PipeTransform, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Observable, of, from, throwError } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { ImageCacheService } from '../services/image-cache.service';

/**
 * Normalized Photo URL with Caching Pipe
 * Combines URL normalization + HTTP auth + image caching
 *
 * Features:
 * - Fixes doubled /api/api/ URLs
 * - Fetches through HttpClient (JWT attached)
 * - Caches image blobs in memory + IndexedDB
 * - Hard refresh detection
 *
 * Usage: <img [src]="photoUrl | normalizePhotoUrlCached | async" />
 */
@Pipe({
  name: 'normalizePhotoUrlCached',
  standalone: true,
})
export class NormalizePhotoUrlCachedPipe implements PipeTransform {
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly imageCache = inject(ImageCacheService);

  transform(url: string | undefined | null): Observable<SafeUrl> {
    if (!url) {
      return of('');
    }

    // Normalize the URL first
    const normalizedUrl = this.normalizeUrl(url);

    return this.getImageBlobCached(normalizedUrl).pipe(
      map((blob) =>
        this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob)),
      ),
      catchError((error) => {
        console.error(`Failed to load image: ${normalizedUrl}`, error);
        return of('');
      }),
    );
  }

  /**
   * Normalize photo URL by fixing doubled /api/api paths
   */
  private normalizeUrl(url: string): string {
    if (!url || typeof url !== 'string') {
      return url;
    }

    // Fix doubled /api/api to /api
    if (url.includes('/api/api/')) {
      return url.replace(/\/api\/api\//g, '/api/');
    }

    return url;
  }

  /**
   * Get image blob with caching strategy:
   * 1. Check memory cache (fastest)
   * 2. Check IndexedDB cache (fast, persistent)
   * 3. Fetch from server and cache the result
   */
  private getImageBlobCached(url: string): Observable<Blob> {
    return from(this.imageCache.getImageFromCache(url)).pipe(
      switchMap((cachedBlob) => {
        if (cachedBlob) {
          // Return cached blob
          return of(cachedBlob);
        }
        // Fetch from server and cache
        return this.http.get(url, { responseType: 'blob' }).pipe(
          switchMap((blob) => {
            // Cache the blob asynchronously (don't await)
            this.imageCache.cacheImage(url, blob);
            return of(blob);
          }),
          catchError((error) => {
            console.error(`Failed to fetch image from server: ${url}`, error);
            return throwError(() => error);
          }),
        );
      }),
      catchError((error) => {
        console.error(`Error in caching pipeline: ${url}`, error);
        return throwError(() => error);
      }),
    );
  }
}
