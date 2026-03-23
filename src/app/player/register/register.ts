import { ChangeDetectorRef, Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { timeout, interval, Subject, debounceTime } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TournamentService } from '../../core/services/tournament.service';
import { PlayerService } from '../../core/services/player.service';
import { RateLimiterService } from '../../core/services/rate-limiter.service';
import { CloudinaryImageService } from '../../core/services/cloudinary-image.service';
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
  isUploadingPhoto = false;
  isUploadingPaymentProof = false;
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

  photoUrl: string | undefined = undefined;
  paymentProofUrl: string | undefined = undefined;
  photoPreview: string | null = null;
  paymentProofPreview: string | null = null;

  private destroy$ = new Subject<void>();
  private formSubmit$ = new Subject<void>();

  private route = inject(ActivatedRoute);
  private tournamentService = inject(TournamentService);
  private playerService = inject(PlayerService);
  private rateLimiterService = inject(RateLimiterService);
  private cloudinaryService = inject(CloudinaryImageService);
  private cdr = inject(ChangeDetectorRef);

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
      this.isUploadingPhoto = true;
      this.cdr.detectChanges();
      
      this.cloudinaryService.uploadImage(file).pipe(takeUntil(this.destroy$)).subscribe({
        next: (response) => {
          this.photoUrl = response.secure_url;
          this.photoPreview = this.cloudinaryService.getTransformedUrl(response.secure_url);
          this.isUploadingPhoto = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Photo upload failed:', err);
          this.serverError = 'Failed to upload photo. Please try again.';
          this.isUploadingPhoto = false;
          this.cdr.detectChanges();
        },
      });
    }
  }

  removePhoto() {
    this.photoUrl = undefined;
    this.photoPreview = null;
  }

  onPaymentProofSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.isUploadingPaymentProof = true;
      this.cdr.detectChanges();
      
      this.cloudinaryService.uploadImage(file).pipe(takeUntil(this.destroy$)).subscribe({
        next: (response) => {
          this.paymentProofUrl = response.secure_url;
          this.paymentProofPreview = this.cloudinaryService.getTransformedUrl(response.secure_url);
          this.isUploadingPaymentProof = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Payment proof upload failed:', err);
          this.serverError = 'Failed to upload payment proof. Please try again.';
          this.isUploadingPaymentProof = false;
          this.cdr.detectChanges();
        },
      });
    }
  }

  submitForm() {
    // Check basic validation
    if (!this.form.firstName || !this.form.role || !this.photoUrl || !this.paymentProofUrl || !this.tournamentId || this.isSubmitting) {
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
      photo: this.photoUrl,
      paymentProof: this.paymentProofUrl,
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
    this.photoUrl = undefined;
    this.paymentProofUrl = undefined;
    this.photoPreview = null;
    this.paymentProofPreview = null;
  }
}
