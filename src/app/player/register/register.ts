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
import { Tournament, RegistrationFieldConfig } from '../../models';
import { formatDateOnlyLocal, isAuctionDatePast as isPastAuctionDate } from '../../core/utils/auction-date';
import { CROP_VIEWPORT_SIZE, clampCropValue, getCropMovementBounds } from './crop-bounds';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
})
export class Register implements OnInit, OnDestroy {
  tournament: Tournament | undefined;
  regConfig: RegistrationFieldConfig | null = null;
  submitted = false;
  isSubmitting = false;
  isUploadingPhoto = false;
  isUploadingPaymentProof = false;
  serverError = '';
  dobError = '';
  isCheckingTournament = true;
  hasValidTournamentLink = false;
  tournamentLookupFailed = false;

  readonly todayString = formatDateOnlyLocal(new Date());

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
    role: '',
    handedness: '',
    tshirtSize: '',
    trouserSize: '',
    jerseyNumber: '',
    sleeveType: '',
    playerLocation: '',
    mobileNumber: '',
    lastSeasonPlayed: '',
    lastSeasonTeam: '',
    bowlingStyle: '',
  };

  photoUrl: string | undefined = undefined;
  paymentProofUrl: string | undefined = undefined;
  photoPreview: string | null = null;
  paymentProofPreview: string | null = null;

  isCropModalOpen = false;
  cropImageSource: string | null = null;
  cropImageName = '';
  cropZoom = 1;
  cropX = 0;
  cropY = 0;
  isCropDragging = false;
  cropImageDimensions = { width: 0, height: 0 };
  private cropDragStartX = 0;
  private cropDragStartY = 0;
  private cropDragOriginX = 0;
  private cropDragOriginY = 0;
  private cropDragElement: HTMLElement | null = null;
  private pendingCropFile: File | null = null;

  /** Default Cloudinary URLs */
  readonly DEFAULT_PLAYER_PHOTO = 'https://res.cloudinary.com/drytm0fl7/image/upload/v1794414410/team_fmpwea.jpg';

  private destroy$ = new Subject<void>();
  private formSubmit$ = new Subject<void>();

  private route = inject(ActivatedRoute);
  private tournamentService = inject(TournamentService);
  private playerService = inject(PlayerService);
  private rateLimiterService = inject(RateLimiterService);
  private cloudinaryService = inject(CloudinaryImageService);
  private cdr = inject(ChangeDetectorRef);

  isAuctionDatePast(date?: string | null): boolean {
    return isPastAuctionDate(date);
  }

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
        if (isPastAuctionDate(t?.date)) {
          this.serverError = 'The Auction is Over.';
        }
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

    this.tournamentService.getRegistrationConfig(this.tournamentId).subscribe({
      next: (config) => {
        this.regConfig = config;
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
    const file: File = event?.target?.files?.[0];
    if (!file) {
      return;
    }

    const input = event.target as HTMLInputElement | null;
    if (input) {
      input.value = '';
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const source = e.target.result as string;
      this.pendingCropFile = file;
      this.cropImageSource = source;
      this.cropImageName = file.name;
      this.cropZoom = 1;
      this.cropX = 0;
      this.cropY = 0;
      this.cropImageDimensions = { width: 0, height: 0 };
      this.loadCropImageDimensions(source);
      this.isCropModalOpen = true;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  private loadCropImageDimensions(source: string) {
    const img = new Image();
    img.onload = () => {
      this.cropImageDimensions = { width: img.width, height: img.height };
      this.clampCropPosition();
      this.cdr.detectChanges();
    };
    img.src = source;
  }

  private getCropMovementBounds() {
    return getCropMovementBounds(this.cropImageDimensions.width, this.cropImageDimensions.height, this.cropZoom);
  }

  private clampCropPosition() {
    const { minX, maxX, minY, maxY } = this.getCropMovementBounds();
    this.cropX = clampCropValue(this.cropX, minX, maxX);
    this.cropY = clampCropValue(this.cropY, minY, maxY);
  }

  onCropZoomChange(value: number) {
    this.cropZoom = Number(value) || 1;
    this.clampCropPosition();
    this.cdr.detectChanges();
  }

  startCropDrag(event: PointerEvent) {
    event.preventDefault();
    this.isCropDragging = true;
    this.cropDragStartX = event.clientX;
    this.cropDragStartY = event.clientY;
    this.cropDragOriginX = this.cropX;
    this.cropDragOriginY = this.cropY;
    this.cropDragElement = event.currentTarget as HTMLElement;
    this.cropDragElement.setPointerCapture(event.pointerId);
  }

  moveCropDrag(event: PointerEvent) {
    if (!this.isCropDragging) {
      return;
    }

    const deltaX = event.clientX - this.cropDragStartX;
    const deltaY = event.clientY - this.cropDragStartY;
    this.cropX = this.cropDragOriginX + deltaX;
    this.cropY = this.cropDragOriginY + deltaY;
    this.clampCropPosition();
    this.cdr.detectChanges();
  }

  stopCropDrag(event?: PointerEvent) {
    this.isCropDragging = false;
    if (this.cropDragElement && event) {
      this.cropDragElement.releasePointerCapture(event.pointerId);
    }
    this.cropDragElement = null;
  }

  cancelCropModal() {
    this.isCropModalOpen = false;
    this.cropImageSource = null;
    this.pendingCropFile = null;
    this.cropImageName = '';
    this.cropZoom = 1;
    this.cropX = 0;
    this.cropY = 0;
    this.cropImageDimensions = { width: 0, height: 0 };
  }

  confirmCroppedPhoto() {
    if (!this.pendingCropFile || !this.cropImageSource) {
      return;
    }

    this.isUploadingPhoto = true;
    this.cdr.detectChanges();

    this.generateCroppedRoundImage(this.cropImageSource, this.cropZoom, this.cropX, this.cropY, this.cropImageName)
      .then((croppedFile) => {
        this.cloudinaryService.uploadImage(croppedFile).pipe(takeUntil(this.destroy$)).subscribe({
          next: (response) => {
            this.photoUrl = response.secure_url;
            this.photoPreview = this.cloudinaryService.getTransformedUrl(response.secure_url, 320, 320, 70);
            this.isUploadingPhoto = false;
            this.isCropModalOpen = false;
            this.cropImageSource = null;
            this.pendingCropFile = null;
            this.cropImageName = '';
            this.cropZoom = 1;
            this.cropX = 0;
            this.cropY = 0;
            this.cropImageDimensions = { width: 0, height: 0 };
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Photo upload failed:', err);
            this.serverError = 'Failed to upload photo. Please try again.';
            this.isUploadingPhoto = false;
            this.isCropModalOpen = false;
            this.cropImageSource = null;
            this.pendingCropFile = null;
            this.cdr.detectChanges();
          },
        });
      })
      .catch((err) => {
        console.error('Photo crop failed:', err);
        this.serverError = 'Failed to crop photo. Please try again.';
        this.isUploadingPhoto = false;
        this.isCropModalOpen = false;
        this.cropImageSource = null;
        this.pendingCropFile = null;
        this.cdr.detectChanges();
      });
  }

  private generateCroppedRoundImage(
    source: string,
    zoom: number,
    offsetX: number,
    offsetY: number,
    fileName: string
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const outputSize = 1024;
        const circleRadius = outputSize / 2;

        const fitScale = Math.min(CROP_VIEWPORT_SIZE / img.width, CROP_VIEWPORT_SIZE / img.height) * zoom;
        const renderedWidth = img.width * fitScale;
        const renderedHeight = img.height * fitScale;
        const drawX = (CROP_VIEWPORT_SIZE - renderedWidth) / 2 + offsetX;
        const drawY = (CROP_VIEWPORT_SIZE - renderedHeight) / 2 + offsetY;

        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = CROP_VIEWPORT_SIZE;
        cropCanvas.height = CROP_VIEWPORT_SIZE;

        const cropCtx = cropCanvas.getContext('2d');
        if (!cropCtx) {
          reject(new Error('Canvas context unavailable.'));
          return;
        }

        cropCtx.clearRect(0, 0, CROP_VIEWPORT_SIZE, CROP_VIEWPORT_SIZE);
        cropCtx.beginPath();
        cropCtx.arc(CROP_VIEWPORT_SIZE / 2, CROP_VIEWPORT_SIZE / 2, CROP_VIEWPORT_SIZE / 2, 0, Math.PI * 2);
        cropCtx.clip();
        cropCtx.drawImage(img, drawX, drawY, renderedWidth, renderedHeight);

        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = outputSize;
        finalCanvas.height = outputSize;

        const finalCtx = finalCanvas.getContext('2d');
        if (!finalCtx) {
          reject(new Error('Final canvas context unavailable.'));
          return;
        }

        finalCtx.clearRect(0, 0, outputSize, outputSize);
        finalCtx.beginPath();
        finalCtx.arc(circleRadius, circleRadius, circleRadius, 0, Math.PI * 2);
        finalCtx.closePath();
        finalCtx.clip();
        finalCtx.drawImage(cropCanvas, 0, 0, outputSize, outputSize);

        finalCanvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Could not generate cropped photo.'));
            return;
          }

          const file = new File([blob], fileName || 'cropped-player-photo.png', {
            type: 'image/png',
          });
          resolve(file);
        }, 'image/png');
      };

      img.onerror = () => reject(new Error('Unable to load image for cropping.'));
      img.src = source;
    });
  }

  removePhoto() {
    this.photoUrl = undefined;
    this.photoPreview = null;
    this.cancelCropModal();
  }

  onPaymentProofSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.isUploadingPaymentProof = true;
      this.cdr.detectChanges();
      
      // Show preview immediately
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.paymentProofPreview = e.target.result;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
      
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

  isFieldMandatory(key: keyof RegistrationFieldConfig): boolean {
    if (!this.regConfig) return true;
    return this.regConfig[key] === true;
  }

  isPaymentProofRequired(): boolean {
    return this.isFieldMandatory('requirePaymentProof');
  }

  submitForm() {
    if (this.tournament && isPastAuctionDate(this.tournament.date)) {
      this.serverError = 'The Auction is Over.';
      return;
    }

    // Check basic validation
    if (!this.form.firstName || !this.form.role || !this.photoUrl || !this.tournamentId || this.isSubmitting) {
      return;
    }
    // Validate DOB is in the past
    if (!this.form.dob) {
      this.dobError = 'Date of Birth is required.';
      return;
    }
    if (new Date(this.form.dob) >= new Date(this.todayString)) {
      this.dobError = 'Date of Birth must be in the past.';
      return;
    }
    this.dobError = '';
    // Only require paymentProofUrl if payment proof is required
    if (this.isFieldMandatory('requirePaymentProof') && !this.paymentProofUrl) {
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
      photo: this.photoUrl || this.DEFAULT_PLAYER_PHOTO,
      paymentProof: this.paymentProofUrl || undefined,
      handedness: this.form.handedness || undefined,
      tshirtSize: this.form.tshirtSize || undefined,
      trouserSize: this.form.trouserSize || undefined,
      jerseyNumber: this.form.jerseyNumber ? Number(this.form.jerseyNumber) : undefined,
      sleeveType: this.form.sleeveType || undefined,
      playerLocation: this.form.playerLocation || undefined,
      mobileNumber: this.form.mobileNumber || undefined,
      lastSeasonPlayed: this.form.lastSeasonPlayed || undefined,
      lastSeasonTeam: this.form.lastSeasonTeam || undefined,
      bowlingStyle: this.form.bowlingStyle || undefined,
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
    this.form = { firstName: '', lastName: '', dob: '', role: '', handedness: '', tshirtSize: '', trouserSize: '', jerseyNumber: '', sleeveType: '', playerLocation: '', mobileNumber: '', lastSeasonPlayed: '', lastSeasonTeam: '', bowlingStyle: '' };
    this.photoUrl = undefined;
    this.paymentProofUrl = undefined;
    this.photoPreview = null;
    this.paymentProofPreview = null;
  }
}
