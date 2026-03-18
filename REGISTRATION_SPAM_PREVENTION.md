# Player Registration - Spam Prevention Strategy

## Overview
The player registration page (`/register/:tournamentId`) is **auth-free** to allow any user to access it, but includes **multi-layer spam prevention** to prevent abuse. This document outlines the complete strategy.

---

## Architecture

### Layer 1: Client-Side Rate Limiting (Session-Based)
**File:** `src/app/core/services/rate-limiter.service.ts`

- **Storage:** SessionStorage (per browser session)
- **Limits per Tournament:**
  - **Max Attempts:** 20 registration attempts per hour
  - **Cooldown:** 1 second between attempts (allows rapid back-to-back registration)
  - **Lockout:** 1 hour after reaching max attempts

- **Key Methods:**
  - `canRegister(tournamentId)` - Check if registration is allowed
  - `recordAttempt(tournamentId, success)` - Track successful attempts
  - `getRemainingAttempts(tournamentId)` - Get remaining attempts
  - `getTimeUntilNextAttempt(tournamentId)` - Get cooldown countdown

**How it works:**
```typescript
// Before submission
const rateCheck = this.rateLimiterService.canRegister(tournamentId);
if (!rateCheck.allowed) {
  this.rateLimitError = rateCheck.reason; // "Please wait 45 seconds..."
  return;
}

// After successful submission
this.rateLimiterService.recordAttempt(tournamentId, true);
```

---

### Layer 2: Client-Side Request Debouncing
**File:** `src/app/player/register/register.ts`

- **Debounce Time:** 500ms
- **Purpose:** Prevent rapid button clicks from queuing multiple requests

**Implementation:**
```typescript
private formSubmit$ = new Subject<void>();

private setupFormSubmitDebounce() {
  this.formSubmit$
    .pipe(
      debounceTime(500), // Maximum 1 request per 500ms
      takeUntil(this.destroy$)
    )
    .subscribe(() => {
      this.performSubmit();
    });
}

submitForm() {
  // Validation checks...
  this.formSubmit$.next(); // Queue submission with debounce
}
```

---

### Layer 3: UI Feedback & Blocked State
**File:** `src/app/player/register/register.html` & `register.scss`

**User Sees:**
- ⏱️ Rate limit error with countdown timer
- 📊 Remaining attempts counter (e.g., "2/3 attempts remaining")
- 🔒 Disabled submit button during cooldown with countdown (e.g., "Wait 45s")

**Styling:**
```html
<!-- Rate limit message with countdown -->
<div class="rate-limit-error" *ngIf="rateLimitError">
  <p>⏱️ {{ rateLimitError }}</p>
  <p class="rate-info" *ngIf="remainingAttempts > 0">
    Remaining attempts: <strong>{{ remainingAttempts }}/3</strong>
  </p>
</div>

<!-- Submit button with dynamic state -->
<button type="submit" 
  [disabled]="...|| isCooldownActive">
  {{ isCooldownActive ? `Wait ${cooldownRemaining}s` : 'Register' }}
</button>
```

---

### Layer 4: Server-Side Rate Limiting (HTTP Interceptor)
**File:** `src/app/core/interceptors/rate-limit.interceptor.ts`

**Purpose:** Handle server-side rate limit responses (HTTP 429)

**How it works:**
1. Backend returns `429 Too Many Requests` with optional `Retry-After` header
2. Interceptor extracts tournament ID and retry time
3. Updates local rate limiter state to prevent further attempts
4. Shows user an error message

**Configuration in app.config.ts:**
```typescript
provideHttpClient(withInterceptors([rateLimitInterceptor, authInterceptor]))
```

---

## API Endpoints & Rate Limiting

### GET /api/tournaments/{tournamentId}
- **Called in:** `ngOnInit()` via `tournamentService.getById()`
- **Timeout:** 8 seconds
- **Rate Limiting:** Backend should implement rate limiting per IP/User-Agent
- **Recommendation:** Cache on backend for 5-10 minutes

### POST /api/players/register/{tournamentId}
- **Called in:** `submitForm()` via `playerService.register()`
- **Payload:** Multipart form data
  - `firstName` (required)
  - `lastName` (optional)
  - `dob` (date of birth)
  - `role` (Batsman, Bowler, All-rounder, Wicket Keeper)
  - `photo` (file - required)
  - `paymentProof` (file - required)
- **Rate Limiting:** 
  - **Client:** 3 attempts per hour per tournament
  - **Server:** Recommend IP-based rate limiting (e.g., 5-10 requests per hour per IP)
  - **Response:** Return 429 with `Retry-After` header if exceeded

---

## Data Flow

### 1. User Visits Registration Page
```
User loads /register/123
↓
Register component initializes
↓
Load tournament details (GET /api/tournaments/123)
↓
Check rate limit: rateLimiterService.canRegister("123")
↓
Display UI with remaining attempts
```

### 2. User Submits Form
```
User clicks "Register"
↓
submitForm() validates fields & rate limits
↓
formSubmit$ subject queues submission (debounce 500ms)
↓
performSubmit() double-checks rate limits
↓
Send POST /api/players/register/123 with multipart form data
↓
Success → recordAttempt(tournamentId, true)
       → Update rate limit state
       → Show success message
↓
Error → Show error message
     → If 429: Interceptor updates rate limit
```

### 3. Rate Limit Active
```
User tries to submit
↓
rateLimiterService.canRegister() returns allowed: false
↓
Show error: "Please wait 45 seconds before trying again"
↓
Show: "Remaining attempts: 2/3"
↓
Button shows: "Wait 45s" (disabled)
↓
Countdown updates every 1 second
↓
After 60s cooldown → User can try again
```

---

## Security Considerations

### Server-Side Implementation (Required)
While the client prevents spam, **always implement server-side rate limiting**:

1. **IP-Based Rate Limiting:**
   ```
   Max 5-10 registration requests per IP per hour
   Return HTTP 429 with Retry-After header
   ```

2. **Database Validation:**
   ```sql
   -- Check if user already registered for this tournament
   SELECT * FROM player_registrations 
   WHERE tournament_id = ? AND email/phone = ?
   ```

3. **File Validation:**
   - Verify photo file size (<5MB recommended)
   - Verify payment proof file size (<10MB recommended)
   - Check MIME types

4. **Data Validation:**
   - Validate phone number format
   - Validate date of birth (age >= 18)
   - Sanitize text inputs

### CORS & CORS Preflight
- Ensure CORS is properly configured
- OPTIONS requests are not counted toward rate limits

---

## Testing the Rate Limiter

### Browser Console
```javascript
// Check current rate limit state
const rateLimiter = ng.probe(document.querySelector('app-register')).componentInstance.rateLimiterService;
rateLimiter.canRegister("tournament-123");

// Reset rate limit (admin/testing only)
rateLimiter.resetLimit("tournament-123");

// Get remaining attempts
rateLimiter.getRemainingAttempts("tournament-123");
```

### Manual Testing
1. Fill form & submit → Success ✓
2. Click register again immediately → Button disabled (debounce 500ms) ✓
3. After 60 seconds → Can submit again ✓
4. Submit 3 times → "Please wait 1 hour" message ✓
5. Wait 1 hour (or reset rate limiter) → Can submit again ✓

---

## Configuration Options

### Adjust Rate Limits
Edit `src/app/core/services/rate-limiter.service.ts`:

```typescript
private readonly MAX_ATTEMPTS_PER_HOUR = 20;       // Change to adjust max attempts (currently 20)
private readonly COOLDOWN_SECONDS = 1;             // Cooldown between attempts (1s for back-to-back)
private readonly LOCKOUT_SECONDS = 3600;           // Lockdown duration (1 hour)
private readonly REQUEST_WINDOW_MINUTES = 60;      // Time window for counting
```

### Adjust Debounce Time
Edit `src/app/player/register/register.ts`:

```typescript
debounceTime(500) // Increase/decrease from 500ms
```

---

## Session vs Persistent Storage

**Current:** SessionStorage (cleared when browser closes)

**Alternatives:**
- **LocalStorage:** Survives browser restart (more aggressive)
- **IndexedDB:** More data storage capacity
- **Backend:** Persistent across devices (requires authentication or device ID)

To switch storage, modify `rate-limiter.service.ts`:
```typescript
// Change from sessionStorage to localStorage
sessionStorage.setItem(key, JSON.stringify(entry));
// To:
localStorage.setItem(key, JSON.stringify(entry));
```

---

## User Experience

### Normal Flow
```
"You can register 20 times per tournament per hour"
"You have 20 attempts remaining"
[Fill form and submit]
→ Success message
→ Can register another player (counter updates)
```

### After Max Attempts
```
⏱️ Too many registration attempts. Please try again in 59 minutes 45 seconds.
Remaining attempts: 0/20
[Submit button disabled - "Wait 59m 45s"]
```

### Countdown Updates
- Live timer on button: "Wait 45s" → "Wait 44s" → ... → "Register"
- Updates every 1 second

---

## Summary

| Layer | Mechanism | Duration | Purpose |
|-------|-----------|----------|---------|
| **Layer 1** | Client-side rate limiter | 1s cooldown, 1h lockout | Prevent rapid bot spam while allowing back-to-back registration |
| **Layer 2** | Request debouncing | 500ms | Prevent accidental rapid clicks |
| **Layer 3** | UI feedback | Live countdown | User awareness & compliance |
| **Layer 4** | HTTP interceptor | Server-defined | Handle 429 responses |
| **Layer 5** | Server-side (required) | IP-based | Final protection against abuse |

This multi-layer approach ensures that:
- ✅ Organizers can register 20 players back-to-back rapidly
- ✅ Accidental rapid clicks are prevented (debounce)
- ✅ Bot spam is blocked (rate limiter after 20 attempts)
- ✅ Server is protected (HTTP 429 handling)
- ✅ Page remains auth-free and accessible
