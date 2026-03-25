import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { TournamentService } from '../../core/services/tournament.service';
import { AuctionPlayerService } from '../../core/services/auction-player.service';
import { AuthService } from '../../core/services/auth.service';
import { CloudinaryImageService } from '../../core/services/cloudinary-image.service';
import { Tournament, TournamentStatus } from '../../models';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class Dashboard implements OnInit {
  tournaments: Tournament[] = [];
  isLoading = false;
  errorMsg = '';
  currentUser: any;

  // ── Limit Error Modal ────────────────────────────────────────────────────
  showLimitErrorModal = false;
  limitErrorMessage = '';
  maxTeamsAllowed = 0; // Will be extracted from API response
  costPerTeam = 70;
  whatsappNumber = '+91 6360634388';
  contactEmail = 'auction.deck@gmail.com';

  // ── Reset Entire Auction Modal ───────────────────────────────────────────
  showResetAuctionModal = false;
  resetAuctionConfirmText = '';
  resetAuctionExpectedText = 'reset ins';
  isResettingAuction = false;
  resetAuctionMessage = '';
  resetAuctionTournamentId: number | null = null;

  // ── Delete Tournament Modal ──────────────────────────────────────────────
  showDeleteModal = false;
  deleteConfirmText = '';
  deleteExpectedText = 'delete';
  isDeletingTournament = false;
  deleteMessage = '';
  deleteTournamentId: number | null = null;
  deleteTournamentName = '';

  // ── Delete Success Modal ─────────────────────────────────────────────────
  showDeleteSuccessModal = false;
  deletedTournamentName = '';
  deleteSuccessMessage = '';

  // ── Custom Confirmation Modal ────────────────────────────────────────────
  showConfirmModal = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmCallback: (() => void) | null = null;

  private router = inject(Router);
  private tournamentService = inject(TournamentService);
  private auctionPlayerService = inject(AuctionPlayerService);
  private authService = inject(AuthService);
  private cloudinaryService = inject(CloudinaryImageService);
  private cdr = inject(ChangeDetectorRef);

  /** Default Cloudinary URLs */
  readonly DEFAULT_TEAM_LOGO = 'https://res.cloudinary.com/drytm0fl7/image/upload/v1774291008/default_player_lzyniw.png';

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.loadTournaments();
  }

  private loadTournaments() {
    this.isLoading = true;
    this.tournamentService.getAll().subscribe({
      next: (data) => {
        this.tournaments = data;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMsg = 'Failed to load tournaments.';
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ── Create Tournament modal ──────────────────────────────────────────────
  showCreateModal = false;
  createLogoPreview: string | null = null;
  isCreatingTournament = false;
  isUploadingLogo = false;

  newTournament: {
    name: string;
    date: string;
    sport: string;
    totalTeams: number;
    totalPlayers: number;
    purseAmount: number;
    playersPerTeam: number;
    basePrice: number;
    initialIncrementAmount: number;
    status: TournamentStatus;
    logoUrl: string;
    paymentProofRequired: boolean;
  } = this.blankForm();

  private blankForm() {
    return {
      name: '',
      date: '',
      sport: '',
      totalTeams: 8,
      totalPlayers: 120,
      purseAmount: 1000000,
      playersPerTeam: 15,
      basePrice: 20000,
      initialIncrementAmount: 5,
      status: 'UPCOMING' as TournamentStatus,
      logoUrl: this.DEFAULT_TEAM_LOGO,
      paymentProofRequired: false,
    };
  }

  openCreateModal() {
    this.newTournament = this.blankForm();
    this.createLogoPreview = this.DEFAULT_TEAM_LOGO;
    this.showCreateModal = true;
  }

  closeCreateModal() {
    this.showCreateModal = false;
  }

  closeLimitErrorModal() {
    this.showLimitErrorModal = false;
  }

  contactViaPhone() {
    window.location.href = `tel:${this.whatsappNumber}`;
  }

  contactViaWhatsapp() {
    const message = `Hi, I'm interested in adding more teams to my tournament. Current free limit is ${this.maxTeamsAllowed} teams. I'd like to know more about upgrading.`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${this.whatsappNumber.replace(/\D/g, '')}?text=${encodedMessage}`, '_blank');
  }

  contactViaEmail() {
    const subject = encodeURIComponent('Inquiry: Adding More Teams to Tournament');
    const body = encodeURIComponent(`Hi,\n\nI would like to add more teams to my tournament. Currently, the free plan allows ${this.maxTeamsAllowed} teams. Can you provide information about the paid plan?\n\nThank you`);
    window.location.href = `mailto:${this.contactEmail}?subject=${subject}&body=${body}`;
  }

  onLogoSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.isUploadingLogo = true;
    this.cdr.markForCheck();
    
    this.cloudinaryService.uploadImage(file).subscribe({
      next: (response) => {
        this.newTournament.logoUrl = response.secure_url;
        this.createLogoPreview = this.cloudinaryService.getTransformedUrl(response.secure_url);
        this.isUploadingLogo = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Logo upload failed:', err);
        alert('Failed to upload logo. Please try again.');
        this.isUploadingLogo = false;
        this.cdr.markForCheck();
      },
    });
  }

  createTournament(form: NgForm) {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }
    this.isCreatingTournament = true;
    this.cdr.markForCheck();
    
    this.tournamentService
      .create({
        name: this.newTournament.name,
        date: this.newTournament.date,
        sport: this.newTournament.sport,
        totalTeams: this.newTournament.totalTeams,
        totalPlayers: this.newTournament.totalPlayers,
        purseAmount: this.newTournament.purseAmount,
        playersPerTeam: this.newTournament.playersPerTeam,
        basePrice: this.newTournament.basePrice,
        initialIncrementAmount: this.newTournament.initialIncrementAmount || 5,
        status: this.newTournament.status,
        logo: this.newTournament.logoUrl || this.DEFAULT_TEAM_LOGO,
        paymentProofRequired: this.newTournament.paymentProofRequired,
      })
      .subscribe({
        next: (t) => {
          this.isCreatingTournament = false;
          this.tournaments = [t, ...this.tournaments];
          this.closeCreateModal();
          this.cdr.markForCheck();
        },
        error: (err: any) => {
          this.isCreatingTournament = false;
          console.log('API Error Response:', err);
          const errorBody = err.error || err;
          console.log('Error Body:', errorBody);
          
          // Check for maximum allowed teams error
          if (errorBody?.error === 'BAD_REQUEST' && 
              errorBody?.message?.includes('Reached maximum allowed teams')) {
            // Extract the maximum allowed teams from error message
            const match = errorBody.message.match(/Reached maximum allowed teams: (\d+)/);
            if (match && match[1]) {
              this.maxTeamsAllowed = parseInt(match[1], 10);
            }
            this.showLimitErrorModal = true;
            this.limitErrorMessage = errorBody.message || '';
            this.cdr.markForCheck();
          } else {
            alert('Failed to create tournament. Please try again.');
          }
        },
      });
  }

  deleteTournament(id: number) {
    const tournament = this.tournaments.find((t) => t.id === id);
    this.deleteTournamentId = id;
    this.deleteTournamentName = tournament?.name || 'Tournament';
    this.deleteConfirmText = '';
    this.showDeleteModal = true;
    this.cdr.markForCheck();
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.deleteConfirmText = '';
    this.deleteTournamentId = null;
    this.deleteTournamentName = '';
    this.isDeletingTournament = false;
    this.deleteMessage = '';
    this.cdr.markForCheck();
  }

  proceedDeleteTournament() {
    if (this.deleteConfirmText !== this.deleteExpectedText) {
      alert(`Please type "${this.deleteExpectedText}" to confirm`);
      return;
    }

    if (!this.deleteTournamentId) return;

    this.isDeletingTournament = true;
    this.deleteMessage = 'Deleting tournament...';
    this.cdr.markForCheck();

    this.tournamentService.delete(this.deleteTournamentId).subscribe({
      next: () => {
        this.isDeletingTournament = false;
        this.deleteMessage = '';
        this.tournaments = this.tournaments.filter((t) => t.id !== this.deleteTournamentId);
        this.deletedTournamentName = this.deleteTournamentName;
        this.deleteSuccessMessage = `${this.deleteTournamentName} has been deleted successfully.`;
        this.closeDeleteModal();
        this.showDeleteSuccessModal = true;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isDeletingTournament = false;
        this.deleteMessage = '';
        alert('Failed to delete tournament. Please try again.');
        this.cdr.markForCheck();
      }
    });
  }

  closeDeleteSuccessModal() {
    this.showDeleteSuccessModal = false;
    this.deletedTournamentName = '';
    this.deleteSuccessMessage = '';
    this.cdr.markForCheck();
  }

  // ── Edit Tournament modal ─────────────────────────────────────────────────
  showEditModal = false;
  editLogoPreview: string | null = null;
  editingTournamentId: number | null = null;
  isUpdatingTournament = false;
  isUploadingEditLogo = false;

  editTournament: {
    name: string;
    date: string;
    sport: string;
    totalTeams: number;
    totalPlayers: number;
    purseAmount: number;
    playersPerTeam: number;
    basePrice: number;
    initialIncrementAmount: number;
    status: TournamentStatus;
    logoUrl: string;
    paymentProofRequired: boolean;
  } = this.blankForm();

  openEditModal(tournament: Tournament) {
    this.editingTournamentId = tournament.id;
    this.editTournament = {
      name: tournament.name,
      date: tournament.date,
      sport: tournament.sport,
      totalTeams: tournament.totalTeams,
      totalPlayers: tournament.totalPlayers,
      purseAmount: tournament.purseAmount,
      playersPerTeam: tournament.playersPerTeam,
      basePrice: tournament.basePrice,
      initialIncrementAmount: tournament.initialIncrementAmount,
      status: tournament.status,
      logoUrl: tournament.logoUrl || this.DEFAULT_TEAM_LOGO,
      paymentProofRequired: tournament.paymentProofRequired || false,
    };
    this.editLogoPreview = tournament.logoUrl || this.DEFAULT_TEAM_LOGO;
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editingTournamentId = null;
  }

  onEditLogoSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.isUploadingEditLogo = true;
    this.cdr.markForCheck();
    
    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.editLogoPreview = e.target.result;
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
    
    this.cloudinaryService.uploadImage(file).subscribe({
      next: (response) => {
        this.editTournament.logoUrl = response.secure_url;
        this.editLogoPreview = this.cloudinaryService.getTransformedUrl(response.secure_url);
        this.isUploadingEditLogo = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Logo upload failed:', err);
        alert('Failed to upload logo. Please try again.');
        this.isUploadingEditLogo = false;
        this.cdr.markForCheck();
      },
    });
  }

  saveTournament(form: NgForm) {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }
    if (this.editingTournamentId === null) return;
    this.isUpdatingTournament = true;
    this.cdr.markForCheck();
    
    this.tournamentService
      .update(this.editingTournamentId, {
        name: this.editTournament.name,
        date: this.editTournament.date,
        sport: this.editTournament.sport,
        totalTeams: this.editTournament.totalTeams,
        totalPlayers: this.editTournament.totalPlayers,
        purseAmount: this.editTournament.purseAmount,
        playersPerTeam: this.editTournament.playersPerTeam,
        basePrice: this.editTournament.basePrice,
        initialIncrementAmount: this.editTournament.initialIncrementAmount,
        status: this.editTournament.status,
        logo: this.editTournament.logoUrl || this.DEFAULT_TEAM_LOGO,
        paymentProofRequired: this.editTournament.paymentProofRequired,
      })
      .subscribe({
        next: (updated) => {
          this.isUpdatingTournament = false;
          this.tournaments = this.tournaments.map((t) =>
            t.id === updated.id ? updated : t,
          );
          this.closeEditModal();
          this.cdr.markForCheck();
        },
        error: (err: any) => {
          this.isUpdatingTournament = false;
          console.log('API Error Response:', err);
          const errorBody = err.error || err;
          console.log('Error Body:', errorBody);
          
          // Check for maximum allowed teams error
          if (errorBody?.error === 'BAD_REQUEST' && 
              errorBody?.message?.includes('Reached maximum allowed teams')) {
            // Extract the maximum allowed teams from error message
            const match = errorBody.message.match(/Reached maximum allowed teams: (\d+)/);
            if (match && match[1]) {
              this.maxTeamsAllowed = parseInt(match[1], 10);
            }
            this.showLimitErrorModal = true;
            this.limitErrorMessage = errorBody.message || '';
            this.cdr.markForCheck();
          } else {
            alert('Failed to update tournament. Please try again.');
          }
        },
      });
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  viewTeams(tournamentId: number) {
    this.router.navigate(['/admin/teams-list', tournamentId]);
  }

  viewPlayers(tournamentId: number) {
    this.router.navigate(['/admin/teams', tournamentId]);
  }

  openRegisterLink(tournamentId: number) {
    window.open(`/register/${tournamentId}`, '_blank');
  }

  startAuction(tournamentId: number) {
    this.router.navigate(['/admin/auction', tournamentId]);
  }

  viewConditionalIncrements(tournamentId: number) {
    this.router.navigate(['/admin/increments', tournamentId]);
  }

  viewOwnerView(tournamentId: number) {
    window.open(`/admin/owner-view/${tournamentId}`, '_blank');
  }

  // ── Reset Entire Auction ────────────────────────────────────────────────
  openResetAuctionModal(tournamentId: number) {
    this.resetAuctionTournamentId = tournamentId;
    this.resetAuctionConfirmText = '';
    this.showResetAuctionModal = true;
    this.cdr.markForCheck();
  }

  closeResetAuctionModal() {
    this.showResetAuctionModal = false;
    this.resetAuctionConfirmText = '';
    this.resetAuctionTournamentId = null;
    this.isResettingAuction = false;
    this.resetAuctionMessage = '';
    this.cdr.markForCheck();
  }

  resetEntireAuction() {
    if (this.resetAuctionConfirmText !== this.resetAuctionExpectedText) {
      alert(`Please type "${this.resetAuctionExpectedText}" to confirm`);
      return;
    }

    if (!this.resetAuctionTournamentId) return;

    this.isResettingAuction = true;
    this.resetAuctionMessage = 'Resetting entire auction...';
    this.cdr.markForCheck();

    this.auctionPlayerService.resetEntireAuction(this.resetAuctionTournamentId).subscribe({
      next: (response) => {
        this.isResettingAuction = false;
        this.resetAuctionMessage = '';
        alert('Auction has been reset successfully!\n\n' + (response?.message || 'All auction data has been reset.'));
        this.closeResetAuctionModal();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isResettingAuction = false;
        this.resetAuctionMessage = '';
        alert('Failed to reset auction. ' + (err?.error?.message || 'Please try again.'));
        this.cdr.markForCheck();
      },
    });
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

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // ── Sponsor Management Modal ─────────────────────────────────────────────
  showSponsorsModal = false;
  showSponsorsGridModal = false;
  currentTournamentId: number | null = null;
  currentTournamentName = '';
  sponsors: Array<{ id: number; name: string; imageUrl: string; subTitle: string }> = [];
  editingSponsorId: number | null = null;
  sponsorForm = {
    name: '',
    imageUrl: '',
    subTitle: '',
  };
  isSavingSponsor = false;
  sponsorImagePreview: string | null = null;
  nextSponsorId = 0;

  private getExampleSponsors() {
    return [
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
  }

  openSponsorsGridModal(tournamentId: number, tournamentName: string) {
    // Navigate to the dedicated sponsors component
    this.router.navigate(['/admin/sponsors', tournamentId], { queryParams: { name: tournamentName } });
  }

  closeSponsorsGridModal() {
    this.showSponsorsGridModal = false;
    this.currentTournamentId = null;
    this.currentTournamentName = '';
    this.cdr.markForCheck();
  }

  openSponsorsManageModal(tournamentId: number, tournamentName: string) {
    this.currentTournamentId = tournamentId;
    this.currentTournamentName = tournamentName;
    this.sponsors = this.getExampleSponsors();
    this.nextSponsorId = Math.max(...this.sponsors.map((s) => s.id), 0) + 1;
    this.showSponsorsModal = true;
    this.editingSponsorId = null;
    this.resetSponsorForm();
    this.cdr.markForCheck();
  }

  closeSponsorsModal() {
    this.showSponsorsModal = false;
    this.currentTournamentId = null;
    this.currentTournamentName = '';
    this.editingSponsorId = null;
    this.resetSponsorForm();
    this.cdr.markForCheck();
  }

  resetSponsorForm() {
    this.sponsorForm = {
      name: '',
      imageUrl: '',
      subTitle: '',
    };
    this.sponsorImagePreview = null;
  }

  editSponsor(sponsorId: number) {
    const sponsor = this.sponsors.find((s) => s.id === sponsorId);
    if (!sponsor) return;
    this.editingSponsorId = sponsorId;
    this.sponsorForm = {
      name: sponsor.name,
      imageUrl: sponsor.imageUrl,
      subTitle: sponsor.subTitle,
    };
    this.sponsorImagePreview = sponsor.imageUrl;
    this.cdr.markForCheck();
  }

  deleteSponsor(sponsorId: number) {
    this.sponsors = this.sponsors.filter((s) => s.id !== sponsorId);
    this.cdr.markForCheck();
  }

  saveSponsor() {
    if (!this.sponsorForm.name.trim() || !this.sponsorForm.imageUrl.trim() || !this.sponsorForm.subTitle.trim()) {
      alert('Please fill in all fields');
      return;
    }

    this.isSavingSponsor = true;
    this.cdr.markForCheck();

    // Simulate API call with timeout
    setTimeout(() => {
      if (this.editingSponsorId !== null) {
        // Edit existing sponsor
        const sponsor = this.sponsors.find((s) => s.id === this.editingSponsorId);
        if (sponsor) {
          sponsor.name = this.sponsorForm.name;
          sponsor.imageUrl = this.sponsorForm.imageUrl;
          sponsor.subTitle = this.sponsorForm.subTitle;
        }
        this.editingSponsorId = null;
      } else {
        // Add new sponsor
        this.sponsors.push({
          id: this.nextSponsorId,
          name: this.sponsorForm.name,
          imageUrl: this.sponsorForm.imageUrl,
          subTitle: this.sponsorForm.subTitle,
        });
        this.nextSponsorId++;
      }

      this.isSavingSponsor = false;
      this.resetSponsorForm();
      this.cdr.markForCheck();
    }, 500);
  }

  onSponsorImageSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.sponsorImagePreview = e.target?.result as string;
      this.sponsorForm.imageUrl = this.sponsorImagePreview;
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }
}


