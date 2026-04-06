import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse } from '../../models';

interface JwtPayload {
  exp?: number;
  sub?: string;
}

interface StoredUser {
  id: number;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  emailVerified?: boolean;
  phoneCountryCode?: string;
  phoneNumber?: string;
  organisation?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';
  private readonly apiUrl = environment.apiUrl;

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/login`, request)
      .pipe(
        tap((response) => {
          localStorage.setItem(this.TOKEN_KEY, response.token);
          localStorage.setItem(
            this.USER_KEY,
            JSON.stringify({
              id: response.id,
              name: response.name,
              email: response.email,
              role: response.role,
              emailVerified: response.emailVerified ?? false,
            }),
          );
        }),
      );
  }

  register(request: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(
      `${this.apiUrl}/auth/register`,
      request,
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  private decodeTokenPayload(token: string): JwtPayload | null {
    try {
      const payload = token.split('.')[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded) as JwtPayload;
    } catch {
      return null;
    }
  }

  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;
    const payload = this.decodeTokenPayload(token);
    if (!payload?.exp) return true;
    return payload.exp * 1000 < Date.now();
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  refreshToken(): Observable<LoginResponse> {
    const token = this.getToken();
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/refresh`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .pipe(
        tap((response) => {
          localStorage.setItem(this.TOKEN_KEY, response.token);
          // Merge fresh server data into stored user
          const stored = this.getCurrentUser();
          localStorage.setItem(
            this.USER_KEY,
            JSON.stringify({
              id: response.id ?? stored?.id,
              name: response.name ?? stored?.name,
              email: response.email ?? stored?.email,
              role: response.role ?? stored?.role,
              emailVerified: response.emailVerified ?? stored?.emailVerified ?? false,
            }),
          );
        }),
      );
  }

  getCurrentUser(): StoredUser | null {
    const user = localStorage.getItem(this.USER_KEY);
    return user ? (JSON.parse(user) as StoredUser) : null;
  }

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/users/me`);
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/users/change-password`, { currentPassword, newPassword });
  }

  sendVerificationEmail(email?: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/email/send-otp`, email ? { email } : {});
  }

  verifyEmailOtp(otp: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/email/verify-otp`, { otp }).pipe(
      tap((response) => {
        if (response?.token) {
          localStorage.setItem(this.TOKEN_KEY, response.token);
        }
        const stored = this.getCurrentUser();
        if (stored) {
          localStorage.setItem(
            this.USER_KEY,
            JSON.stringify({
              id: response.id ?? stored.id,
              name: response.name ?? stored.name,
              email: response.email ?? stored.email,
              role: response.role ?? stored.role,
              emailVerified: true,
            }),
          );
        }
      }),
    );
  }

  sendPasswordResetOtp(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/password/send-otp`, { email });
  }

  resetPassword(userId: number, email: string, newPassword: string, otp: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/password/reset`, { userId, email, newPassword, otp });
  }

  forgotPasswordReset(email: string, newPassword: string, otp: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/password/reset`, { email, newPassword, otp });
  }
}
