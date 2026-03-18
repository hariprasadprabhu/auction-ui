import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { RateLimiterService } from '../services/rate-limiter.service';

/**
 * Rate Limit Interceptor
 * Handles HTTP 429 responses from backend and updates local rate limit state
 * 
 * When backend responds with 429 (Too Many Requests), extract retry-after
 * header and update local rate limiter to prevent further attempts
 */
export const rateLimitInterceptor: HttpInterceptorFn = (req, next) => {
  const rateLimiterService = inject(RateLimiterService);

  // Extract tournament ID from request URL if it's a registration endpoint
  const isTournamentRequest = req.url.includes('/api/tournaments/') || 
                              req.url.includes('/api/players/register/');

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle 429 Too Many Requests
      if (error.status === 429 && isTournamentRequest) {
        // Extract tournament ID from URL
        const urlParts = req.url.split('/');
        const tournamentIdIndex = urlParts.findIndex(part => 
          part === 'tournaments' || part === 'register'
        );
        
        if (tournamentIdIndex !== -1 && tournamentIdIndex + 1 < urlParts.length) {
          const tournamentId = urlParts[tournamentIdIndex + 1];
          
          // Get retry-after from headers (in seconds)
          const retryAfter = error.headers.get('Retry-After');
          const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : 3600;

          // Update local rate limiter with server response
          const entry = (rateLimiterService as any).getEntry(tournamentId);
          const now = Date.now();
          
          entry.blocked = true;
          entry.blockedUntil = now + (retryAfterSeconds * 1000);
          entry.attempts = (rateLimiterService as any).MAX_ATTEMPTS_PER_HOUR || 3;
          
          (rateLimiterService as any).saveEntry(tournamentId, entry);
        }

        // Return the original error with additional context
        const errorMessage = error.error?.message || 
                           'Registration limit exceeded. Please try again later.';
        
        return throwError(() => ({
          ...error,
          message: errorMessage,
          isRateLimited: true,
        }));
      }

      // Handle other errors
      if (error.status === 400) {
        const errorMessage = error.error?.message || 'Invalid registration data.';
        return throwError(() => ({
          ...error,
          message: errorMessage,
        }));
      }

      return throwError(() => error);
    })
  );
};
