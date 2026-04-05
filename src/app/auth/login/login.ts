import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

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

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    if (this.route.snapshot.queryParamMap.get('registered') === '1') {
      this.registeredToast = true;
      setTimeout(() => (this.registeredToast = false), 5000);
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
}
