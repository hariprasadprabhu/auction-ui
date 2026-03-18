import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { timeout, interval, Subject, debounceTime } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TournamentService } from '../../core/services/tournament.service';
import { PlayerService } from '../../core/services/player.service';
import { RateLimiterService } from '../../core/services/rate-limiter.service';
import { Tournament } from '../../models';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
})
export class Register implements OnInit, OnDestroy {
  tournament: Tournament | undefined;
  submitted = false;
  isSubmitting = false;
  serverError = '';
  isCheckingTournament = true;
  hasValidTournamentLink = false;
  tournamentLookupFailed = false;

  // Rate limiting properties
  rateLimitError = '';
  cooldownRemaining = 0;
  remainingAttempts = 0;
  isCooldownActive = false;

  tournamentId = '';

  form = {
    firstName: '',
    lastName: '',
    dob: '',
    role: ''
  };

  photoFile: File | undefined = undefined;
  paymentProofFile: File | undefined = undefined;
  photoPreview: string | null = null;
  paymentProofPreview: string | null = null;

  private destroy$ = new Subject<void>();
  private formSubmit$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private tournamentService: TournamentService,
    private playerService: PlayerService,
    private rateLimiterService: RateLimiterService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    const routeTournamentId =
      this.route.snapshot.paramMap.get('tournamentId') ??
      this.route.snapshot.queryParamMap.get('tournamentId');

    if (!routeTournamentId?.trim()) {
      this.serverError = 'Tournament not found.';
      this.isCheckingTournament = false;
      return;
    }

    this.tournamentId = routeTournamentId.trim();
    this.updateRateLimitInfo();
    this.setupCooldownTimer();
    this.setupFormSubmitDebounce();
    this.hasValidTournamentLink = true;
    this.tournamentService.getById(this.tournamentId).pipe(timeout(8000)).subscribe({
      next: (t) => {
        console.log('Tournament loaded:', t);
        this.tournament = t;
        this.isCheckingTournament = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Tournament fetch error:', err);
        this.tournamentLookupFailed = true;
        this.isCheckingTournament = false;
        this.cdr.detectChanges();
      },
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateRateLimitInfo() {
    const check = this.rateLimiterService.canRegister(this.tournamentId);
    if (!check.allowed) {
      this.rateLimitError = check.reason || 'Registration temporarily unavailable';
      this.isCooldownActive = true;
      this.cooldownRemaining = check.cooldownRemaining || 0;
    } else {
      this.rateLimitError = '';
      this.isCooldownActive = false;
    }
    this.remainingAttempts = this.rateLimiterService.getRemainingAttempts(this.tournamentId);
    this.cdr.detectChanges();
  }

  private setupCooldownTimer() {
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.isCooldownActive) {
          this.updateRateLimitInfo();
        }
      });
  }

  private setupFormSubmitDebounce() {
    this.formSubmit$
      .pipe(
        debounceTime(500), // Prevent rapid submissions within 500ms
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.performSubmit();
      });
  }

  onPhotoSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.photoFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => (this.photoPreview = e.target.result);
      reader.readAsDataURL(file);
    }
  }

  removePhoto() {
    this.photoFile = undefined;
    this.photoPreview = null;
  }

  onPaymentProofSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.paymentProofFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => (this.paymentProofPreview = e.target.result);
      reader.readAsDataURL(file);
    }
  }

  submitForm() {
    // Check basic validation
    if (!this.form.firstName || !this.form.role || !this.photoFile || !this.paymentProofFile || !this.tournamentId || this.isSubmitting) {
      return;
    }

    // Check rate limiting before submitting
    const rateCheck = this.rateLimiterService.canRegister(this.tournamentId);
    if (!rateCheck.allowed) {
      this.rateLimitError = rateCheck.reason || 'Registration temporarily unavailable';
      this.cdr.detectChanges();
      return;
    }

    // Queue the submission with debounce (prevents rapid clicks)
    this.formSubmit$.next();
  }

  private performSubmit() {
    // Double-check rate limiting at submission time
    const rateCheck = this.rateLimiterService.canRegister(this.tournamentId);
    if (!rateCheck.allowed) {
      this.rateLimitError = rateCheck.reason || 'Registration temporarily unavailable';
      this.isSubmitting = false;
      this.cdr.detectChanges();
      return;
    }

    this.serverError = '';
    this.rateLimitError = '';
    this.isSubmitting = true;
    this.cdr.detectChanges();

    this.playerService.register(this.tournamentId, {
      firstName: this.form.firstName,
      lastName: this.form.lastName,
      dob: this.form.dob,
      role: this.form.role,
      photo: this.photoFile,
      paymentProof: this.paymentProofFile,
    }).subscribe({
      next: () => {
        // Record successful attempt
        this.rateLimiterService.recordAttempt(this.tournamentId, true);
        this.updateRateLimitInfo();
        this.isSubmitting = false;
        this.submitted = true;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isSubmitting = false;
        this.serverError = 'Failed to register. Please reach out to organisers.';
        this.cdr.detectChanges();
      },
    });
  }

  registerAnother() {
    this.submitted = false;
    this.serverError = '';
    this.form = { firstName: '', lastName: '', dob: '', role: '' };
    this.photoFile = undefined;
    this.paymentProofFile = undefined;
    this.photoPreview = null;
    this.paymentProofPreview = null;
  }
}
