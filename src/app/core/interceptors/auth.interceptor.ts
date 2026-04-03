import {
  HttpInterceptorFn,
  HttpErrorResponse,
  HttpRequest,
  HttpHandlerFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  catchError,
  filter,
  switchMap,
  take,
  throwError,
} from 'rxjs';
import { AuthService } from '../services/auth.service';
import { LoginResponse } from '../../models';

// Module-level state shared across all interceptor invocations
let isRefreshing = false;
const refreshSubject = new BehaviorSubject<string | null>(null);

function attachToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function handle401Error(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService,
  router: Router,
) {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshSubject.next(null);

    return authService.refreshToken().pipe(
      switchMap((response: LoginResponse) => {
        isRefreshing = false;
        refreshSubject.next(response.token);
        return next(attachToken(req, response.token));
      }),
      catchError((err) => {
        isRefreshing = false;
        authService.logout();
        router.navigate(['/login']);
        return throwError(() => err);
      }),
    );
  }

  // Another refresh is already in progress — queue this request
  return refreshSubject.pipe(
    filter((token): token is string => token !== null),
    take(1),
    switchMap((token) => next(attachToken(req, token))),
  );
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Skip Cloudinary requests (CORS issues)
  if (req.url.includes('cloudinary.com')) {
    return next(req);
  }

  // Skip owner-view public routes
  if (router.url.includes('owner-view')) {
    return next(req);
  }

  // Skip auth endpoints to avoid refresh loops
  if (req.url.includes('/auth/refresh') || req.url.includes('/auth/login')) {
    return next(req);
  }

  const token = authService.getToken();
  const authReq = token ? attachToken(req, token) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        return handle401Error(req, next, authService, router);
      }
      return throwError(() => error);
    }),
  );
};
