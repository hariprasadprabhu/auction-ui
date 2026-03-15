import { Pipe, PipeTransform, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Fetches an image URL through Angular's HttpClient so that the
 * authInterceptor attaches the JWT token. Without this, browser-native
 * <img src> requests skip the interceptor and receive a 403 from
 * protected endpoints.
 *
 * Usage:  <img [src]="url | authImage | async" />
 */
@Pipe({
  name: 'authImage',
  standalone: true,
})
export class AuthImagePipe implements PipeTransform {
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);

  transform(url: string | undefined | null): Observable<SafeUrl> {
    if (!url) {
      return of('');
    }
    return this.http
      .get(url, { responseType: 'blob' })
      .pipe(
        map((blob) =>
          this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob)),
        ),
      );
  }
}
