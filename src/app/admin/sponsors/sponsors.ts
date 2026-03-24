import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

interface Sponsor {
  id: number;
  name: string;
  imageUrl: string;
  subTitle: string;
}

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
    imageUrl: '',
    subTitle: '',
  };
  imagePreview: string | null = null;
  nextId = 1;
  isSaving = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.tournamentId = Number(this.route.snapshot.paramMap.get('tournamentId'));
    this.tournamentName = this.route.snapshot.queryParamMap.get('name') || '';
    this.loadSponsors();
  }

  private loadSponsors() {
    // TODO: Replace with API call
    // For now, load example data
    this.sponsors = [
      {
        id: 1,
        name: 'TechCorp',
        imageUrl: 'https://via.placeholder.com/150x80?text=TechCorp',
        subTitle: 'Technology Solutions',
      },
      {
        id: 2,
        name: 'InnovateLabs',
        imageUrl: 'https://via.placeholder.com/150x80?text=Innovate',
        subTitle: 'Innovation Hub',
      },
      {
        id: 3,
        name: 'Digital Solutions',
        imageUrl: 'https://via.placeholder.com/150x80?text=DigitalSol',
        subTitle: 'Digital Excellence',
      },
      {
        id: 4,
        name: 'FutureTech',
        imageUrl: 'https://via.placeholder.com/150x80?text=FutureTech',
        subTitle: 'The Future is Here',
      },
    ];
    this.nextId = Math.max(...this.sponsors.map((s) => s.id), 0) + 1;
    this.cdr.markForCheck();
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
          imageUrl: sponsor.imageUrl,
          subTitle: sponsor.subTitle,
        };
        this.imagePreview = sponsor.imageUrl;
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
      imageUrl: '',
      subTitle: '',
    };
    this.imagePreview = null;
  }

  onImageSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagePreview = e.target?.result as string;
      this.formData.imageUrl = this.imagePreview;
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  saveSponsor() {
    if (!this.formData.name.trim() || !this.formData.imageUrl.trim() || !this.formData.subTitle.trim()) {
      alert('Please fill in all fields');
      return;
    }

    this.isSaving = true;
    this.cdr.markForCheck();

    // Simulate API call
    setTimeout(() => {
      if (this.editingId !== null) {
        // Edit
        const sponsor = this.sponsors.find((s) => s.id === this.editingId);
        if (sponsor) {
          sponsor.name = this.formData.name;
          sponsor.imageUrl = this.formData.imageUrl;
          sponsor.subTitle = this.formData.subTitle;
        }
      } else {
        // Add
        this.sponsors.push({
          id: this.nextId,
          name: this.formData.name,
          imageUrl: this.formData.imageUrl,
          subTitle: this.formData.subTitle,
        });
        this.nextId++;
      }

      this.isSaving = false;
      this.closeForm();
      this.cdr.markForCheck();
    }, 500);
  }

  deleteSponsor(id: number) {
    if (confirm('Are you sure you want to delete this sponsor?')) {
      this.sponsors = this.sponsors.filter((s) => s.id !== id);
      this.cdr.markForCheck();
    }
  }
}
