import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { TournamentService } from '../../core/services/tournament.service';
import { AuctionPlayerService } from '../../core/services/auction-player.service';
import { AuthService } from '../../core/services/auth.service';
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
  isDeletingWithReset = false;  // Track if we're in delete+reset mode

  // ── Custom Confirmation Modal ────────────────────────────────────────────
  showConfirmModal = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmCallback: (() => void) | null = null;

  private router = inject(Router);
  private tournamentService = inject(TournamentService);
  private auctionPlayerService = inject(AuctionPlayerService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

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
    logoFile: File | null;
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
      logoFile: null as File | null,
    };
  }

  openCreateModal() {
    this.newTournament = this.blankForm();
    this.createLogoPreview = null;
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
    this.newTournament.logoFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.createLogoPreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
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
        logo: this.newTournament.logoFile ?? undefined,
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
    const tournamentName = tournament?.name || 'Tournament';
    this.openConfirmModal(
      'Delete Tournament',
      `Are you sure you want to delete "${tournamentName}"? This action cannot be undone.`,
      () => {
        this.proceedDeleteTournament(id);
      }
    );
  }

  private proceedDeleteTournament(id: number) {
    this.tournamentService.delete(id).subscribe({
      next: () => {
        this.tournaments = this.tournaments.filter((t) => t.id !== id);
        this.cdr.markForCheck();
      },
      error: () => {
        this.cdr.markForCheck();
      }
    });
  }

  deleteWithResetOption(id: number) {
    this.resetAuctionTournamentId = id;
    this.resetAuctionConfirmText = '';
    this.isDeletingWithReset = true;
    this.showResetAuctionModal = true;
    this.cdr.markForCheck();
  }

  // ── Edit Tournament modal ─────────────────────────────────────────────────
  showEditModal = false;
  editLogoPreview: string | null = null;
  editingTournamentId: number | null = null;
  isUpdatingTournament = false;

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
    logoFile: File | null;
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
      logoFile: null,
    };
    this.editLogoPreview = tournament.logoUrl ?? null;
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editingTournamentId = null;
  }

  onEditLogoSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.editTournament.logoFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.editLogoPreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
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
        logo: this.editTournament.logoFile ?? undefined,
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
    this.isDeletingWithReset = false;  // Reset the delete mode flag
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
        
        if (this.isDeletingWithReset) {
          // If in delete mode, proceed with deletion
          const tournamentId = this.resetAuctionTournamentId;
          this.closeResetAuctionModal();
          alert('Auction has been reset successfully!');
          this.proceedDeleteTournament(tournamentId!);
        } else {
          // Normal reset auction flow
          alert('Auction has been reset successfully!\n\n' + (response?.message || 'All auction data has been reset.'));
          this.closeResetAuctionModal();
        }
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
}

