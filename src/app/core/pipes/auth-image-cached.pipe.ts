import { Pipe, PipeTransform, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Observable, of, from, throwError } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { ImageCacheService } from '../services/image-cache.service';

/**
 * Cached Authentication Image Pipe
 * Fetches images through Angular's HttpClient (so JWT token is attached)
 * and caches the blob using IndexedDB + memory cache
 *
 * Features:
 * - Automatic blob caching across page loads
 * - Hard refresh detection (F5, Ctrl+R clears cache)
 * - Memory cache for fast repeated access
 * - IndexedDB for persistent storage across sessions
 * - Graceful fallback if storage unavailable
 *
 * Usage: <img [src]="url | authImageCached | async" />
 */
@Pipe({
  name: 'authImageCached',
  standalone: true,
})
export class AuthImageCachedPipe implements PipeTransform {
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly imageCache = inject(ImageCacheService);

  transform(url: string | undefined | null): Observable<SafeUrl> {
    if (!url) {
      return of('');
    }

    return this.getImageBlobCached(url).pipe(
      map((blob) =>
        this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob)),
      ),
      catchError((error) => {
        console.error(`Failed to load image: ${url}`, error);
        return of(''); // Return empty if loading fails
      }),
    );
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
