import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
  errorMessage: string | null = null;

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
    this.loadSponsors();
  }

  private loadSponsors() {
    if (!this.tournamentId) return;
    
    this.sponsorsService.getByTournament(this.tournamentId).subscribe({
      next: (sponsors) => {
        this.sponsors = sponsors;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load sponsors:', err);
        this.errorMessage = 'Failed to load sponsors. Please try again.';
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
    this.errorMessage = null;
    this.cdr.markForCheck();

    // For now, only handle adding new sponsors via API
    if (this.editingId === null) {
      const sponsorRequest = {
        name: this.formData.name,
        personName: this.formData.personName,
        personImageUrl: this.formData.personImageUrl,
      };

      this.sponsorsService.create(this.tournamentId, [sponsorRequest]).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeForm();
          this.loadSponsors();
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Failed to save sponsor:', err);
          this.errorMessage = 'Failed to save sponsor. Please try again.';
          this.isSaving = false;
          this.cdr.markForCheck();
        },
      });
    } else {
      // Edit mode not yet implemented on backend
      this.errorMessage = 'Editing sponsors is not yet supported';
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  deleteSponsor(id: number) {
    if (confirm('Are you sure you want to delete this sponsor?')) {
      this.sponsors = this.sponsors.filter((s) => s.id !== id);
      this.cdr.markForCheck();
    }
  }
}
