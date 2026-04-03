import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TeamService } from '../../core/services/team.service';
import { TournamentService } from '../../core/services/tournament.service';
import { CloudinaryImageService } from '../../core/services/cloudinary-image.service';
import { Tournament, Team } from '../../models';
import { NormalizePhotoUrlCachedPipe } from '../../core/pipes/normalize-photo-url-cached.pipe';

@Component({
  selector: 'app-teams-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NormalizePhotoUrlCachedPipe],
  templateUrl: './teams-list.html',
  styleUrls: ['./teams-list.scss'],
})
export class TeamsListComponent implements OnInit {
  tournament: Tournament | undefined;
  teams: Team[] = [];
  isLoading = true;
  minLoadingTime = 800;
  loadingStartTime = 0;
  pendingRequests = 0;

  // Add Team Form
  showAddTeamModal = false;
  isAddingTeam = false;
  isUploadingTeamLogo = false;
  newTeam = {
    name: '',
    ownerName: '',
    mobileNumber: '',
    logoUrl: '' as string,
  };
  teamLogoPreview: string | null = null;

  // Edit Team Form
  showEditTeamModal = false;
  isEditingTeam = false;
  isDeletingTeam = false;
  isUploadingEditLogo = false;
  editingTeam: Team | null = null;
  editTeam = {
    name: '',
    ownerName: '',
    mobileNumber: '',
    logoUrl: '' as string,
  };
  editLogoPreview: string | null = null;

  // ── Limit Error Modal ────────────────────────────────────────────────────
  showLimitErrorModal = false;
  limitErrorMessage = '';
  costPerTeam = 70;
  whatsappNumber = '+91 6360634388';
  contactEmail = 'auction.deck@gmail.com';

  // ── Custom Confirmation Modal ────────────────────────────────────────────
  showConfirmModal = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmCallback: (() => void) | null = null;

  private tournamentId!: number;
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private teamService = inject(TeamService);
  private tournamentService = inject(TournamentService);
  private cloudinaryService = inject(CloudinaryImageService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    this.loadingStartTime = Date.now();
    this.pendingRequests = 2; // tournament + teams
    
    const id = Number(this.route.snapshot.paramMap.get('tournamentId'));
    if (id) {
      this.tournamentId = id;
      this.tournamentService.getById(id).subscribe((t) => {
        this.tournament = t;
        this.completeRequest();
      });
      this.loadTeams();
    }
  }

  private completeRequest() {
    this.pendingRequests--;
    if (this.pendingRequests <= 0) {
      const elapsedTime = Date.now() - this.loadingStartTime;
      const remainingTime = Math.max(0, this.minLoadingTime - elapsedTime);
      
      if (remainingTime > 0) {
        setTimeout(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        }, remainingTime);
      } else {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    }
  }

  private loadTeams() {
    this.teamService.getByTournament(this.tournamentId).subscribe({
      next: (data) => {
        this.teams = data;
        this.completeRequest();
      },
      error: () => {
        alert('Failed to load teams.');
        this.completeRequest();
      },
    });
  }

  get isTeamNameDuplicate(): boolean {
    if (!this.newTeam.name.trim()) return false;
    return this.teams.some(t => t.name.trim().toLowerCase() === this.newTeam.name.trim().toLowerCase());
  }

  openAddTeamModal() {
    this.showAddTeamModal = true;
    this.resetTeamForm();
  }

  closeAddTeamModal() {
    this.showAddTeamModal = false;
    this.resetTeamForm();
  }

  resetTeamForm() {
    this.newTeam = {
      name: '',
      ownerName: '',
      mobileNumber: '',
      logoUrl: this.DEFAULT_TEAM_LOGO,
    };
    this.teamLogoPreview = this.DEFAULT_TEAM_LOGO;
  }

  onTeamLogoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.isUploadingTeamLogo = true;
      this.cdr.detectChanges();
      
      // Show preview immediately
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.teamLogoPreview = e.target.result;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
      
      this.cloudinaryService.uploadImage(file).subscribe({
        next: (response) => {
          this.newTeam.logoUrl = response.secure_url;
          this.teamLogoPreview = this.cloudinaryService.getTransformedUrl(response.secure_url);
          this.isUploadingTeamLogo = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Logo upload failed:', err);
          alert('Failed to upload logo. Please try again.');
          this.isUploadingTeamLogo = false;
          this.cdr.detectChanges();
        },
      });
    }
  }

  addTeam() {
    if (!this.canAddMoreTeams()) {
      alert(`Cannot add more teams. Maximum limit of ${this.tournament?.teamesAllowed} teams reached.`);
      return;
    }
    if (!this.newTeam.name || !this.newTeam.ownerName || !this.newTeam.mobileNumber) {
      alert('Please fill in all required fields');
      return;
    }
    if (this.isTeamNameDuplicate) {
      return;
    }
    this.isAddingTeam = true;
    this.teamService
      .create(this.tournamentId, {
        name: this.newTeam.name,
        ownerName: this.newTeam.ownerName,
        mobileNumber: this.newTeam.mobileNumber,
        logo: this.newTeam.logoUrl || this.DEFAULT_TEAM_LOGO,
      })
      .subscribe({
        next: (t) => {
          this.teams.push(t);
          this.isAddingTeam = false;
          this.closeAddTeamModal();
          this.cdr.markForCheck();
        },
        error: (err: any) => {
          this.isAddingTeam = false;
          console.log('API Error Response:', err);
          const errorBody = err.error || err;
          console.log('Error Body:', errorBody);
          
          // Check for maximum allowed teams error
          if (errorBody?.error === 'BAD_REQUEST' && 
              errorBody?.message?.includes('Reached maximum allowed teams')) {
            this.showLimitErrorModal = true;
            this.limitErrorMessage = errorBody.message || '';
            this.cdr.markForCheck();
          } else {
            alert('Failed to add team.');
          }
        },
      });
  }

  openEditTeamModal(team: Team) {
    this.editingTeam = team;
    this.editTeam = {
      name: team.name,
      ownerName: team.ownerName,
      mobileNumber: team.mobileNumber,
      logoUrl: team.logoUrl || this.DEFAULT_TEAM_LOGO,
    };
    this.editLogoPreview = team.logoUrl || this.DEFAULT_TEAM_LOGO;
    this.showEditTeamModal = true;
  }

  closeEditTeamModal() {
    this.showEditTeamModal = false;
    this.editingTeam = null;
    this.editLogoPreview = null;
  }

  onEditLogoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.isUploadingEditLogo = true;
      this.cdr.detectChanges();
      
      // Show preview immediately
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.editLogoPreview = e.target.result;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
      
      this.cloudinaryService.uploadImage(file).subscribe({
        next: (response) => {
          this.editTeam.logoUrl = response.secure_url;
          this.editLogoPreview = this.cloudinaryService.getTransformedUrl(response.secure_url);
          this.isUploadingEditLogo = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Logo upload failed:', err);
          alert('Failed to upload logo. Please try again.');
          this.isUploadingEditLogo = false;
          this.cdr.detectChanges();
        },
      });
    }
  }

  saveEditTeam() {
    if (!this.editingTeam) return;
    if (!this.editTeam.name || !this.editTeam.ownerName || !this.editTeam.mobileNumber) {
      alert('Please fill in all required fields');
      return;
    }
    this.isEditingTeam = true;
    this.teamService
      .update(this.editingTeam.id, {
        name: this.editTeam.name,
        ownerName: this.editTeam.ownerName,
        mobileNumber: this.editTeam.mobileNumber,
        logo: this.editTeam.logoUrl || this.editingTeam?.logoUrl || this.DEFAULT_TEAM_LOGO,
      })
      .subscribe({
        next: (updated) => {
          const index = this.teams.findIndex((t) => t.id === this.editingTeam!.id);
          if (index !== -1) this.teams[index] = updated;
          this.isEditingTeam = false;
          this.closeEditTeamModal();
          this.cdr.markForCheck();
        },
        error: () => {
          this.isEditingTeam = false;
          alert('Failed to update team.');
        },
      });
  }

  deleteTeam(team: Team) {
    this.openConfirmModal(
      'Delete Team',
      `Are you sure you want to delete "${team.name}"? This action cannot be undone.`,
      () => {
        this.isDeletingTeam = true;
        this.teamService.delete(team.id).subscribe({
          next: () => {
            this.teams = this.teams.filter((t) => t.id !== team.id);
            this.isDeletingTeam = false;
            this.cdr.markForCheck();
          },
          error: () => {
            this.isDeletingTeam = false;
            this.cdr.markForCheck();
          },
        });
      }
    );
  }

  goBack() {
    this.router.navigate(['/admin']);
  }

  closeLimitErrorModal() {
    this.showLimitErrorModal = false;
  }

  contactViaPhone() {
    window.location.href = `tel:${this.whatsappNumber}`;
  }

  contactViaWhatsapp() {
    const message = `Hi, I'm interested in adding more teams to my tournament. Current free limit is ${this.tournament?.teamesAllowed || 2} teams. I'd like to know more about upgrading.`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${this.whatsappNumber.replace(/\D/g, '')}?text=${encodedMessage}`, '_blank');
  }

  contactViaEmail() {
    const subject = encodeURIComponent('Inquiry: Adding More Teams to Tournament');
    const body = encodeURIComponent(`Hi,\n\nI would like to add more teams to my tournament. Currently, the free plan allows ${this.tournament?.teamesAllowed || 2} teams. Can you provide information about the paid plan?\n\nThank you`);
    window.location.href = `mailto:${this.contactEmail}?subject=${subject}&body=${body}`;
  }

  canAddMoreTeams(): boolean {
    if (!this.tournament?.teamesAllowed) {
      return true; // No limit set
    }
    return this.teams.length < this.tournament.teamesAllowed;
  }

  getRemainingTeamSlots(): number {
    if (!this.tournament?.teamesAllowed) {
      return -1; // No limit
    }
    return this.tournament.teamesAllowed - this.teams.length;
  }

  /** Default Cloudinary URLs */
  readonly DEFAULT_TEAM_LOGO = 'https://res.cloudinary.com/drytm0fl7/image/upload/v1774291007/default_logo_gknxbf.jpg';

  /** Get team logo URL with default fallback */
  getTeamLogoUrl(logoUrl: string | undefined): string {
    return logoUrl || this.DEFAULT_TEAM_LOGO;
  }

  // ── Custom Modal Methods ──────────────────────────────────────────────────

  openConfirmModal(title: string, message: string, onConfirm: () => void) {
    this.confirmTitle = title;
    this.confirmMessage = message;
    this.confirmCallback = onConfirm;
    this.showConfirmModal = true;
  }

  closeConfirmModal() {
    this.showConfirmModal = false;
    this.confirmCallback = null;
  }

  confirmAction() {
    if (this.confirmCallback) {
      this.confirmCallback();
    }
    this.closeConfirmModal();
  }
}
