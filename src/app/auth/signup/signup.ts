import { ChangeDetectorRef, Component, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';

export interface Country {
  name: string;
  code: string;
  iso:  string;
  flag: string;
}

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './signup.html',
  styleUrls: ['./signup.scss'],
})
export class Signup {
  @ViewChild('signupForm') signupForm!: NgForm;

  isLoading   = false;
  formTouched = false;
  showPassword        = false;
  showConfirmPassword = false;

  readonly countries: Country[] = [
    { name: 'India',          code: '+91',  iso: 'IN', flag: '🇮🇳' },
    { name: 'United States',  code: '+1',   iso: 'US', flag: '🇺🇸' },
    { name: 'United Kingdom', code: '+44',  iso: 'GB', flag: '🇬🇧' },
    { name: 'Australia',      code: '+61',  iso: 'AU', flag: '🇦🇺' },
    { name: 'Canada',         code: '+1',   iso: 'CA', flag: '🇨🇦' },
    { name: 'UAE',            code: '+971', iso: 'AE', flag: '🇦🇪' },
    { name: 'Singapore',      code: '+65',  iso: 'SG', flag: '🇸🇬' },
    { name: 'Sri Lanka',      code: '+94',  iso: 'LK', flag: '🇱🇰' },
    { name: 'Bangladesh',     code: '+880', iso: 'BD', flag: '🇧🇩' },
    { name: 'Pakistan',       code: '+92',  iso: 'PK', flag: '🇵🇰' },
    { name: 'South Africa',   code: '+27',  iso: 'ZA', flag: '🇿🇦' },
    { name: 'New Zealand',    code: '+64',  iso: 'NZ', flag: '🇳🇿' },
    { name: 'Other',          code: '+0',   iso: 'XX', flag: '🌍' },
  ];

  selectedCountry: Country = this.countries[0];

  form = {
    name:            '',
    email:           '',
    phoneNumber:     '',
    organisation:    '',
    sport:           '',
    teams:           '',
    password:        '',
    confirmPassword: '',
  };

  // ── Validation helpers ───────────────────────────
  get nameError(): string {
    const v = this.form.name.trim();
    if (!v)           return 'Full name is required.';
    if (v.length < 2) return 'Name must be at least 2 characters.';
    if (!/^[a-zA-Z\s.'\-]+$/.test(v)) return "Name can only contain letters, spaces, . or '-";
    return '';
  }

  get emailError(): string {
    const v = this.form.email.trim();
    if (!v) return 'Email address is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address.';
    return '';
  }

  get phoneError(): string {
    const v = this.form.phoneNumber.trim();
    if (!v) return 'Phone number is required.';
    if (v.length !== 10) return 'Phone number must be exactly 10 digits.';
    return '';
  }

  get sportError(): string {
    return this.form.sport ? '' : 'Please select a sport.';
  }

  get passwordError(): string {
    const v = this.form.password;
    if (!v) return 'Password is required.';
    if (v.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(v)) return 'Include at least one uppercase letter.';
    if (!/[0-9]/.test(v)) return 'Include at least one number.';
    if (!/[^A-Za-z0-9]/.test(v)) return 'Include at least one special character (!@#$ …).';
    return '';
  }

  get confirmPasswordError(): string {
    if (!this.form.confirmPassword) return 'Please confirm your password.';
    if (this.form.confirmPassword !== this.form.password) return 'Passwords do not match.';
    return '';
  }

  /** 0–4 strength score */
  get passwordStrength(): number {
    const v = this.form.password;
    if (!v) return 0;
    let score = 0;
    if (v.length >= 8)            score++;
    if (/[A-Z]/.test(v))          score++;
    if (/[0-9]/.test(v))          score++;
    if (/[^A-Za-z0-9]/.test(v))   score++;
    return score;
  }

  get passwordStrengthLabel(): string {
    return ['', 'Weak', 'Fair', 'Good', 'Strong'][this.passwordStrength];
  }

  get passwordStrengthClass(): string {
    return ['', 'strength-weak', 'strength-fair', 'strength-good', 'strength-strong'][this.passwordStrength];
  }

  get isFormValid(): boolean {
    return !this.nameError && !this.emailError && !this.phoneError &&
           !this.sportError && !this.passwordError && !this.confirmPasswordError;
  }

  compareCountry(a: Country, b: Country): boolean {
    return a?.iso === b?.iso;
  }

  // ── Actions ─────────────────────────────────────
  submit() {
    this.formTouched = true;
    if (!this.isFormValid) return;

    this.isLoading = true;
    this.authService
      .register({
        name: this.form.name.trim(),
        email: this.form.email.trim(),
        password: this.form.password,
        phoneCountryCode: this.selectedCountry.code,
        phoneNumber: this.form.phoneNumber.trim(),
        organisation: this.form.organisation.trim() || undefined,
        sport: this.form.sport,
        numberOfTeams: this.form.teams ? Number(this.form.teams) : undefined,
      })
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.cdr.markForCheck();
          this.router.navigate(['/login'], { queryParams: { registered: '1' } });
        },
        error: (err: HttpErrorResponse) => {
          this.isLoading = false;
          const body = err.error;
          if (body?.message) {
            this.apiError = body.message;
          } else if (err.status === 0) {
            this.apiError = 'Unable to reach the server. Please check your connection.';
          } else {
            this.apiError = 'Registration failed. Please try again.';
          }
          this.cdr.markForCheck();
        },
      });
  }

  goHome() { this.router.navigate(['/']); }
  goToLogin() { this.router.navigate(['/login']); }

  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  constructor(private router: Router) {}

  apiError = '';
}
