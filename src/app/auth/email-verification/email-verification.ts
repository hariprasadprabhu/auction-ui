import { ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnInit, Output, QueryList, ViewChildren, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';

type Step = 'prompt' | 'otp' | 'verified';

@Component({
  selector: 'app-email-verification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './email-verification.html',
  styleUrls: ['./email-verification.scss'],
})
export class EmailVerification implements OnInit {
  @Input() email: string = '';
  @Output() closed = new EventEmitter<void>();
  @Output() verified = new EventEmitter<void>();

  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  step: Step = 'prompt';
  isLoading = false;
  errorMsg = '';
  otpDigits: string[] = ['', '', '', '', '', ''];

  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {}

  get otp(): string {
    return this.otpDigits.join('');
  }

  sendVerification(): void {
    this.isLoading = true;
    this.errorMsg = '';
    this.authService.sendVerificationEmail().subscribe({
      next: () => {
        this.isLoading = false;
        this.step = 'otp';
        this.cdr.markForCheck();
        // Focus first OTP box after view updates
        setTimeout(() => {
          const inputs = this.otpInputs.toArray();
          if (inputs.length) inputs[0].nativeElement.focus();
        }, 50);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        this.errorMsg = err.error?.message || 'Failed to send verification email. Please try again.';
        this.cdr.markForCheck();
      },
    });
  }

  onOtpKeydown(index: number, event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;

    if (event.key === 'Backspace') {
      event.preventDefault();
      if (this.otpDigits[index]) {
        this.otpDigits[index] = '';
        input.value = '';
      } else if (index > 0) {
        this.otpDigits[index - 1] = '';
        const prev = this.otpInputs.toArray()[index - 1];
        if (prev) {
          prev.nativeElement.value = '';
          prev.nativeElement.focus();
        }
      }
      return;
    }

    if (event.key.length === 1 && /\d/.test(event.key)) {
      event.preventDefault();
      this.otpDigits[index] = event.key;
      input.value = event.key;
      if (index < 5) {
        this.otpInputs.toArray()[index + 1]?.nativeElement.focus();
      }
      return;
    }

    // Block any other printable character
    if (event.key.length === 1) {
      event.preventDefault();
    }
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') ?? '';
    const digits = text.replace(/\D/g, '').slice(0, 6).split('');
    const inputs = this.otpInputs.toArray();
    digits.forEach((ch, i) => {
      this.otpDigits[i] = ch;
      inputs[i].nativeElement.value = ch;
    });
    const focusIdx = Math.min(digits.length, 5);
    inputs[focusIdx]?.nativeElement.focus();
  }

  submitOtp(): void {
    if (this.otp.length !== 6 || this.isLoading) return;
    this.isLoading = true;
    this.errorMsg = '';
    this.authService.verifyEmailOtp(this.otp).subscribe({
      next: () => {
        this.isLoading = false;
        this.step = 'verified';
        this.cdr.markForCheck();
        setTimeout(() => this.verified.emit(), 2500);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        this.errorMsg = err.error?.message || 'Invalid OTP. Please try again.';
        this.otpDigits = ['', '', '', '', '', ''];
        this.otpInputs?.forEach(el => (el.nativeElement.value = ''));
        // no markForCheck needed — DOM is managed directly
        setTimeout(() => {
          this.otpInputs.toArray()[0]?.nativeElement.focus();
        }, 50);
      },
    });
  }

  trackByIndex(index: number): number {
    return index;
  }

  close(): void {
    this.closed.emit();
  }
}
