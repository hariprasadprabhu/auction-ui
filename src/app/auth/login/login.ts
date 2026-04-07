import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

type ForgotView = 'login' | 'forgot-step1' | 'forgot-otp' | 'forgot-success';

@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login implements OnInit {
  email: string = '';
  password: string = '';
  errorMsg: string = '';
  isLoading: boolean = false;
  registeredToast: boolean = false;

  // Forgot password state
  view: ForgotView = 'login';
  fpEmail: string = '';
  fpNewPassword: string = '';
  fpConfirmPassword: string = '';
  fpOtp: string = '';
  fpError: string = '';
  fpLoading: boolean = false;

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    if (this.route.snapshot.queryParamMap.get('registered') === '1') {
      this.registeredToast = true;
      setTimeout(() => this.registeredToast = false, 5000);
    }
  }

  login() {
    this.errorMsg = '';
    this.isLoading = true;

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
        this.router.navigate(['/admin']);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        if (err.status === 401) {
          this.errorMsg = 'Invalid credentials. Please try again.';
        } else {
          this.errorMsg = 'Login failed. Please try again later.';
        }
        this.cdr.markForCheck();
      },
    });
  }

  goHome() {
    this.router.navigate(['/']);
  }

  goToSignup() {
    this.router.navigate(['/signup']);
  }

  showForgotPassword() {
    this.fpEmail = '';
    this.fpNewPassword = '';
    this.fpConfirmPassword = '';
    this.fpOtp = '';
    this.fpError = '';
    this.view = 'forgot-step1';
  }

  sendOtp() {
    this.fpError = '';
    if (!this.fpEmail) {
      this.fpError = 'Please enter your email address.';
      return;
    }
    if (!this.fpNewPassword || this.fpNewPassword.length < 6) {
      this.fpError = 'Password must be at least 6 characters.';
      return;
    }
    if (this.fpNewPassword !== this.fpConfirmPassword) {
      this.fpError = 'Passwords do not match.';
      return;
    }
    this.fpLoading = true;
    this.authService.sendPasswordResetOtp(this.fpEmail).subscribe({
      next: () => {
        this.fpLoading = false;
        this.view = 'forgot-otp';
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.fpLoading = false;
        this.fpError = err.error?.message || 'Failed to send OTP. Please try again.';
        this.cdr.markForCheck();
      },
    });
  }

  verifyOtpAndReset() {
    this.fpError = '';
    if (!this.fpOtp) {
      this.fpError = 'Please enter the OTP sent to your email.';
      return;
    }
    this.fpLoading = true;
    this.authService.forgotPasswordReset(this.fpEmail, this.fpNewPassword, this.fpOtp).subscribe({
      next: () => {
        this.fpLoading = false;
        this.view = 'forgot-success';
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.fpLoading = false;
        this.fpError = err.error?.message || 'Invalid OTP or reset failed. Please try again.';
        this.cdr.markForCheck();
      },
    });
  }

  backToLogin() {
    this.view = 'login';
    this.fpError = '';
  }
}

