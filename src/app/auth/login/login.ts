import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login implements OnInit {
  username: string = '';
  password: string = '';
  errorMsg: string = '';
  isLoading: boolean = false;
  registeredToast: boolean = false;

  private router = inject(Router);
  private route  = inject(ActivatedRoute);

  ngOnInit() {
    if (this.route.snapshot.queryParamMap.get('registered') === '1') {
      this.registeredToast = true;
      setTimeout(() => this.registeredToast = false, 5000);
    }
  }

  login() {
    this.errorMsg = '';
    this.isLoading = true;

    setTimeout(() => {
      this.isLoading = false;
      if (this.username === 'admin' && this.password === 'admin') {
        this.router.navigate(['/admin']);
      } else {
        this.errorMsg = 'Invalid credentials. Please try again.';
      }
    }, 600);
  }

  goHome() {
    this.router.navigate(['/']);
  }

  goToSignup() {
    this.router.navigate(['/signup']);
  }
}
