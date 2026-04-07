import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { SponsorsService } from '../../core/services/sponsors.service';
import { CloudinaryImageService } from '../../core/services/cloudinary-image.service';
import { Sponsor } from '../../models';

@Component({
  selector: 'app-sponsors',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sponsors.html',
  styleUrls: ['./sponsors.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sponsors implements OnInit {
  tournamentId: number | null = null;
  tournamentName = '';
  tournamentDate = '';
  sponsors: Sponsor[] = [];
  
  // Modal state
  showForm = false;
  editingId: number | null = null;
  formData = {
    name: '',
    personName: '',
    personImageUrl: '',
  };
  imagePreview: string | null = null;
  isSaving = false;
  isUploadingImage = false;
  isLoading = true;
  errorMessage: string | null = null;

  // Delete confirm / success / error modal state
  showConfirmModal = false;
  pendingDeleteId: number | null = null;
  showDeleteErrorModal = false;
  deleteErrorMessage = '';
  isDeleting = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private sponsorsService: SponsorsService,
    private cloudinaryService: CloudinaryImageService,
  ) {}

  ngOnInit() {
    this.tournamentId = Number(this.route.snapshot.paramMap.get('tournamentId'));
    this.tournamentName = this.route.snapshot.queryParamMap.get('name') || '';
    this.tournamentDate = this.route.snapshot.queryParamMap.get('date') || '';
    this.loadSponsors();
  }

  private loadSponsors(onComplete?: () => void) {
    if (!this.tournamentId) return;
    
    this.sponsorsService.getByTournament(this.tournamentId).subscribe({
      next: (sponsors) => {
        this.sponsors = sponsors;
        this.isLoading = false;
        onComplete?.();
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load sponsors:', err);
        this.errorMessage = 'Failed to load sponsors. Please try again.';
        this.isLoading = false;
        onComplete?.();
        this.cdr.markForCheck();
      },
    });
  }

  goBack() {
    this.router.navigate(['/admin']);
  }

  openForm(sponsorId?: number) {
    if (sponsorId) {
      // Edit mode
      const sponsor = this.sponsors.find((s) => s.id === sponsorId);
      if (sponsor) {
        this.editingId = sponsorId;
        this.formData = {
          name: sponsor.name,
          personName: sponsor.personName,
          personImageUrl: sponsor.personImageUrl,
        };
        this.imagePreview = sponsor.personImageUrl;
      }
    } else {
      // Add mode
      this.editingId = null;
      this.resetForm();
    }
    this.showForm = true;
    this.cdr.markForCheck();
  }

  closeForm() {
    this.showForm = false;
    this.resetForm();
    this.cdr.markForCheck();
  }

  resetForm() {
    this.formData = {
      name: '',
      personName: '',
      personImageUrl: '',
    };
    this.imagePreview = null;
    this.errorMessage = null;
  }

  onImageSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.isUploadingImage = true;
    this.errorMessage = null;
    this.cdr.markForCheck();

    this.cloudinaryService.uploadImage(file).subscribe({
      next: (response) => {
        // Store the Cloudinary URL in the form data
        this.formData.personImageUrl = response.secure_url;
        this.imagePreview = response.secure_url;
        this.isUploadingImage = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to upload image to Cloudinary:', err);
        this.isUploadingImage = false;
        this.errorMessage = 'Failed to upload image. Please try again.';
        this.cdr.markForCheck();
      },
    });
  }

  saveSponsor() {
    if (!this.formData.name.trim() || !this.formData.personName.trim() || !this.formData.personImageUrl.trim()) {
      this.errorMessage = 'Please fill in all fields';
      this.cdr.markForCheck();
      return;
    }

    if (!this.tournamentId) {
      this.errorMessage = 'Tournament ID is missing';
      this.cdr.markForCheck();
      return;
    }

    this.isSaving = true;
    this.showForm = false;
    this.errorMessage = null;
    this.cdr.markForCheck();

    const sponsorRequest = {
      name: this.formData.name,
      personName: this.formData.personName,
      personImageUrl: this.formData.personImageUrl,
    };

    const request$: Observable<unknown> = this.editingId === null
      ? this.sponsorsService.create(this.tournamentId, [sponsorRequest])
      : this.sponsorsService.update(this.tournamentId, this.editingId, sponsorRequest);

    request$.subscribe({
      next: () => {
        this.resetForm();
        this.editingId = null;
        this.loadSponsors(() => {
          this.isSaving = false;
          this.cdr.markForCheck();
        });
      },
      error: (err: { status?: number }) => {
        console.error('Failed to save sponsor:', err);
        this.errorMessage = err.status === 403
          ? 'You are not authorized to modify sponsors for this tournament.'
          : 'Failed to save sponsor. Please try again.';
        this.isSaving = false;
        this.showForm = true;
        this.cdr.markForCheck();
      },
    });
  }

  deleteSponsor(id: number) {
    this.openDeleteConfirm(id);
  }

  openDeleteConfirm(id: number) {
    this.pendingDeleteId = id;
    this.showConfirmModal = true;
    this.cdr.markForCheck();
  }

  closeConfirmModal() {
    this.showConfirmModal = false;
    this.pendingDeleteId = null;
    this.cdr.markForCheck();
  }

  closeDeleteErrorModal() {
    this.showDeleteErrorModal = false;
    this.deleteErrorMessage = '';
    this.cdr.markForCheck();
  }

  confirmDelete() {
    if (!this.tournamentId || this.pendingDeleteId === null) return;
    const id = this.pendingDeleteId;
    this.showConfirmModal = false;
    this.pendingDeleteId = null;
    this.isDeleting = true;
    this.cdr.markForCheck();

    this.sponsorsService.delete(this.tournamentId, id).subscribe({
      next: () => {
        this.loadSponsors(() => {
          this.isDeleting = false;
          this.cdr.markForCheck();
        });
      },
      error: (err: { status?: number }) => {
        console.error('Failed to delete sponsor:', err);
        this.deleteErrorMessage = err.status === 403
          ? 'You are not authorized to delete sponsors for this tournament.'
          : 'Failed to delete sponsor. Please try again.';
        this.isDeleting = false;
        this.showDeleteErrorModal = true;
        this.cdr.markForCheck();
      },
    });
  }
}
