import { Injectable } from '@angular/core';

interface RateLimitEntry {
  attempts: number;
  lastAttempt: number;
  blocked: boolean;
  blockedUntil: number;
  requestTimestamps: number[]; // Track individual requests for better analytics
}

@Injectable({ providedIn: 'root' })
export class RateLimiterService {
  // Configuration
  private readonly MAX_ATTEMPTS_PER_HOUR = 20; // Max 20 registration attempts per tournament per hour
  private readonly COOLDOWN_SECONDS = 1; // 1 second cooldown between attempts (allows rapid back-to-back registration)
  private readonly LOCKOUT_SECONDS = 3600; // 1 hour lockout after max attempts
  private readonly STORAGE_PREFIX = 'rate_limit_';
  private readonly REQUEST_WINDOW_MINUTES = 60; // Track requests over 60 minute window

  getStorageKey(tournamentId: string | number): string {
    return `${this.STORAGE_PREFIX}tournament_${tournamentId}`;
  }

  /**
   * Check if user can register for a tournament
   */
  canRegister(tournamentId: string | number): {
    allowed: boolean;
    reason?: string;
    cooldownRemaining?: number;
  } {
    const entry = this.getEntry(tournamentId);
    const now = Date.now();

    // Check if currently blocked
    if (entry.blocked && now < entry.blockedUntil) {
      const remainingSeconds = Math.ceil((entry.blockedUntil - now) / 1000);
      return {
        allowed: false,
        reason: `Too many registration attempts. Please try again in ${this.formatTime(remainingSeconds)}.`,
        cooldownRemaining: remainingSeconds,
      };
    }

    // Reset if lockout period is over
    if (entry.blocked && now >= entry.blockedUntil) {
      entry.blocked = false;
      entry.attempts = 0;
      entry.lastAttempt = 0;
      entry.requestTimestamps = [];
      this.saveEntry(tournamentId, entry);
    }

    // Check cooldown between attempts
    if (entry.attempts > 0 && now - entry.lastAttempt < this.COOLDOWN_SECONDS * 1000) {
      const remainingSeconds = Math.ceil(
        (this.COOLDOWN_SECONDS * 1000 - (now - entry.lastAttempt)) / 1000
      );
      return {
        allowed: false,
        reason: `Please wait ${this.formatTime(remainingSeconds)} before trying again.`,
        cooldownRemaining: remainingSeconds,
      };
    }

    return { allowed: true };
  }

  /**
   * Record a registration attempt
   */
  recordAttempt(tournamentId: string | number, success: boolean): void {
    const entry = this.getEntry(tournamentId);
    const now = Date.now();

    if (success) {
      entry.attempts++;
      entry.lastAttempt = now;
      entry.requestTimestamps.push(now);

      // Keep only recent requests within the window
      const windowStart = now - (this.REQUEST_WINDOW_MINUTES * 60 * 1000);
      entry.requestTimestamps = entry.requestTimestamps.filter(ts => ts > windowStart);

      // Check if max attempts reached
      if (entry.attempts >= this.MAX_ATTEMPTS_PER_HOUR) {
        entry.blocked = true;
        entry.blockedUntil = now + this.LOCKOUT_SECONDS * 1000;
      }

      this.saveEntry(tournamentId, entry);
    }
  }

  /**
   * Get remaining attempts
   */
  getRemainingAttempts(tournamentId: string | number): number {
    const entry = this.getEntry(tournamentId);
    
    // Clean up old requests
    const now = Date.now();
    const windowStart = now - (this.REQUEST_WINDOW_MINUTES * 60 * 1000);
    entry.requestTimestamps = entry.requestTimestamps.filter(ts => ts > windowStart);

    if (entry.blocked) {
      return 0;
    }
    return Math.max(0, this.MAX_ATTEMPTS_PER_HOUR - entry.requestTimestamps.length);
  }

  /**
   * Get the time until next registration attempt is allowed
   */
  getTimeUntilNextAttempt(tournamentId: string | number): number {
    const check = this.canRegister(tournamentId);
    return check.cooldownRemaining || 0;
  }

  /**
   * Reset rate limit for a tournament (admin function)
   */
  resetLimit(tournamentId: string | number): void {
    const key = this.getStorageKey(tournamentId);
    sessionStorage.removeItem(key);
  }

  /**
   * Check if rate limit is completely reset for a tournament
   */
  isLimitReset(tournamentId: string | number): boolean {
    const entry = this.getEntry(tournamentId);
    return entry.attempts === 0 && !entry.blocked;
  }

  /**
   * Private helper methods
   */
  private getEntry(tournamentId: string | number): RateLimitEntry {
    const key = this.getStorageKey(tournamentId);
    const stored = sessionStorage.getItem(key);

    if (!stored) {
      return {
        attempts: 0,
        lastAttempt: 0,
        blocked: false,
        blockedUntil: 0,
        requestTimestamps: [],
      };
    }

    try {
      const parsed = JSON.parse(stored);
      // Ensure requestTimestamps exists for legacy entries
      if (!parsed.requestTimestamps) {
        parsed.requestTimestamps = [];
      }
      return parsed;
    } catch {
      return {
        attempts: 0,
        lastAttempt: 0,
        blocked: false,
        blockedUntil: 0,
        requestTimestamps: [],
      };
    }
  }

  private saveEntry(tournamentId: string | number, entry: RateLimitEntry): void {
    const key = this.getStorageKey(tournamentId);
    sessionStorage.setItem(key, JSON.stringify(entry));
  }

  private formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
}
