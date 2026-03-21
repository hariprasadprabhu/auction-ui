import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PlayerService } from '../../core/services/player.service';
import { AuctionPlayerService } from '../../core/services/auction-player.service';
import { TournamentService } from '../../core/services/tournament.service';
import { Tournament, Player } from '../../models';
import { AuthImageCachedPipe } from '../../core/pipes/auth-image-cached.pipe';
import { NormalizePhotoUrlCachedPipe } from '../../core/pipes/normalize-photo-url-cached.pipe';

@Component({
  selector: 'app-players',
  imports: [
    CommonModule,
    FormsModule,
    AuthImageCachedPipe,
    NormalizePhotoUrlCachedPipe,
  ],
  templateUrl: './teams.html',
  styleUrls: ['./teams.scss'],
})
export class Players implements OnInit {
  tournament: Tournament | null = null;
  players: Player[] = [];
  auctionPlayerMap = new Map<number, any>(); // Map player ID to auction player data
  selectedImage: string | null = null;
  selectedImageName: string = '';
  selectedPlayerId: number | null = null;
  isLoading = true;
  minLoadingTime = 800;
  loadingStartTime = 0;
  pendingRequests = 0;
  pendingImages = 0;
  loadingTimeoutId: any = null;

  // Player Selection for Batch Actions
  selectedPlayers = new Set<number>();
  selectAllChecked = false;
  isProcessingBatchAction = false;

  // Reset Auction Functionality
  selectedPlayersForReset = new Set<number>();
  isResettingAuction = false;
  resetMessage = '';

  // Custom Modal States
  showConfirmModal = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmCallback: (() => void) | null = null;

  showSuccessModal = false;
  successTitle = '';
  successMessage = '';

  showErrorModal = false;
  errorTitle = '';
  errorMessage = '';

  showLoadingModal = false;
  loadingMessage = '';

  // Add Player Form
  showAddPlayerModal = false;
  isAddingPlayer = false;
  newPlayer = {
    firstName: '',
    lastName: '',
    dob: '',
    role: 'BATSMAN',
    photoFile: null as File | null,
    paymentProofFile: null as File | null,
  };
  playerPhotoPreview: string | null = null;

  // Edit Player Form
  showEditPlayerModal = false;
  isEditingPlayer = false;
  isDeletingPlayer = false;
  editingPlayer: Player | null = null;
  editPlayerForm = {
    firstName: '',
    lastName: '',
    dob: '',
    role: 'BATSMAN',
    photoFile: null as File | null,
    paymentProofFile: null as File | null,
  };
  editPhotoPreview: string | null = null;

  private tournamentId!: number;
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private playerService = inject(PlayerService);
  private auctionPlayerService = inject(AuctionPlayerService);
  private tournamentService = inject(TournamentService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    this.loadingStartTime = Date.now();
    this.pendingRequests = 3; // tournament + players + auction players
    this.setLoadingTimeout();
    
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('tournamentId'));
      if (id) {
        this.tournamentId = id;
        this.tournamentService.getById(id).subscribe((t) => {
          this.tournament = t;
          this.completeRequest();
        });
        this.loadPlayers();
        this.loadAuctionPlayers();
      }
    });
  }

  private loadAuctionPlayers() {
    this.auctionPlayerService.getByTournament(this.tournamentId).subscribe({
      next: (auctionPlayers) => {
        this.auctionPlayerMap.clear();
        auctionPlayers.forEach(ap => {
          // Map by playerId if available, otherwise by id
          const key = ap.playerId || ap.id;
          this.auctionPlayerMap.set(key, ap);
        });
        this.completeRequest();
        this.cdr.markForCheck();
      },
      error: () => {
        this.completeRequest();
      }
    });
  }

  private completeRequest() {
    this.pendingRequests--;
    this.checkLoadingComplete();
  }

  private checkLoadingComplete() {
    if (this.pendingRequests <= 0 && this.pendingImages <= 0) {
      this.clearLoadingTimeout();
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

  private clearLoadingTimeout() {
    if (this.loadingTimeoutId) {
      clearTimeout(this.loadingTimeoutId);
      this.loadingTimeoutId = null;
    }
  }

  private setLoadingTimeout() {
    this.clearLoadingTimeout();
    // Force hide loading after 20 seconds maximum (safety fallback)
    this.loadingTimeoutId = setTimeout(() => {
      if (this.isLoading || this.pendingImages > 0) {
        console.warn('Loading timeout - forcing loading to complete');
        this.isLoading = false;
        this.pendingImages = 0;
        this.cdr.markForCheck();
      }
    }, 20000);
  }

  onImageLoad() {
    this.pendingImages--;
    this.checkLoadingComplete();
  }

  onImageError() {
    this.pendingImages--;
    this.checkLoadingComplete();
  }

  private loadPlayers() {
    this.playerService.getByTournament(this.tournamentId).subscribe({
      next: (data) => {
        this.players = data;
        // Count images: photo + payment proof for each player
        this.pendingImages = data.length * 2;
        this.completeRequest();
        
        if (this.pendingImages === 0) {
          // No images to load, loading will complete
        } else {
          // Schedule image load checking after DOM update
          this.cdr.markForCheck();
          setTimeout(() => this.trackImageLoads(), 100);
        }
      },
      error: () => {
        this.openErrorModal('Error', 'Failed to load players.');
        this.completeRequest();
      },
    });
  }

  private trackImageLoads() {
    const images = document.querySelectorAll('.grid-container img');
    
    if (images.length === 0) {
      // If no images found in DOM, assume they're not needed or failed
      // Reset pending images to allow loading to complete
      this.pendingImages = 0;
      this.checkLoadingComplete();
      return;
    }
    
    images.forEach((img: any) => {
      if (img.complete) {
        // Image already loaded from cache
        this.onImageLoad();
      } else {
        // Image still loading
        img.addEventListener('load', () => this.onImageLoad());
        img.addEventListener('error', () => this.onImageError());
      }
    });
  }

  openAddPlayerModal() {
    this.showAddPlayerModal = true;
    this.resetPlayerForm();
  }

  generateNextPlayerNumber() {
    // Player numbers are now auto-generated by the backend
  }

  closeAddPlayerModal() {
    this.showAddPlayerModal = false;
    this.resetPlayerForm();
  }

  resetPlayerForm() {
    this.newPlayer = {
      firstName: '',
      lastName: '',
      dob: '',
      role: 'BATSMAN',
      photoFile: null,
      paymentProofFile: null,
    };
    this.playerPhotoPreview = null;
  }

  calculateAge(dob: string | undefined): string {
    if (!dob) {
      return 'N/A';
    }
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age.toString();
  }

  deletePlayer(playerId: number) {
    const playerName = this.players.find((p) => p.id === playerId)?.firstName || 'Player';
    this.openConfirmModal(
      'Delete Player',
      `Are you sure you want to delete ${playerName}? This action cannot be undone.`,
      () => {
        this.isDeletingPlayer = true;
        this.playerService.delete(playerId).subscribe({
          next: () => {
            this.players = this.players.filter((p) => p.id !== playerId);
            this.isDeletingPlayer = false;
            this.openSuccessModal('Player Deleted', 'Player has been successfully deleted.');
            this.cdr.markForCheck();
          },
          error: () => {
            this.isDeletingPlayer = false;
            this.openErrorModal('Deletion Failed', 'Failed to delete player. Please try again.');
            this.cdr.markForCheck();
          },
        });
      }
    );
  }

  onPlayerPhotoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.newPlayer.photoFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.playerPhotoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  onPaymentProofSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.newPlayer.paymentProofFile = file;
    }
  }

  addPlayer() {
    if (!this.newPlayer.firstName || !this.newPlayer.role) {
      alert('Please fill in all required fields (First Name, Role)');
      return;
    }

    this.isAddingPlayer = true;
    // Use public registration endpoint (admin adds player directly)
    this.playerService
      .register(this.tournamentId, {
        firstName: this.newPlayer.firstName,
        lastName: this.newPlayer.lastName || undefined,
        dob: this.newPlayer.dob || undefined,
        role: this.newPlayer.role,
        photo: this.newPlayer.photoFile ?? undefined,
        paymentProof: this.newPlayer.paymentProofFile ?? undefined,
      })
      .subscribe({
        next: (p) => {
          this.players.push(p);
          this.isAddingPlayer = false;
          this.closeAddPlayerModal();
          this.cdr.markForCheck();
        },
        error: () => {
          this.isAddingPlayer = false;
          alert('Failed to add player.');
        },
      });
  }

  openImageModal(imageSrc: string | undefined, playerName: string, playerId?: number) {
    if (!imageSrc) return;
    this.selectedImage = imageSrc;
    this.selectedImageName = playerName;
    this.selectedPlayerId = playerId ?? null;
  }

  closeImageModal() {
    this.selectedImage = null;
    this.selectedImageName = '';
    this.selectedPlayerId = null;
  }

  approvePlayer(playerId: number) {
    this.showLoadingModal = true;
    this.loadingMessage = 'Approving player...';
    this.cdr.markForCheck();

    this.playerService.approve(playerId).subscribe({
      next: (updated) => {
        const player = this.players.find((p) => p.id === playerId);
        if (player) player.status = updated.status;
        this.showLoadingModal = false;
        this.openSuccessModal('Approval Successful', 'Player has been approved successfully');
        this.cdr.markForCheck();
      },
      error: () => {
        this.showLoadingModal = false;
        this.openErrorModal('Approval Failed', 'Failed to approve player. Please try again.');
        this.cdr.markForCheck();
      },
    });
  }

  rejectPlayer(playerId: number) {
    this.showLoadingModal = true;
    this.loadingMessage = 'Rejecting player...';
    this.cdr.markForCheck();

    this.playerService.reject(playerId).subscribe({
      next: (updated) => {
        const player = this.players.find((p) => p.id === playerId);
        if (player) player.status = updated.status;
        this.showLoadingModal = false;
        this.openSuccessModal('Rejection Successful', 'Player has been rejected successfully');
        this.cdr.markForCheck();
      },
      error: () => {
        this.showLoadingModal = false;
        this.openErrorModal('Rejection Failed', 'Failed to reject player. Please try again.');
        this.cdr.markForCheck();
      },
    });
  }

  approveFromModal() {
    if (this.selectedPlayerId) {
      this.approvePlayer(this.selectedPlayerId);
      this.closeImageModal();
    }
  }

  rejectFromModal() {
    if (this.selectedPlayerId) {
      this.rejectPlayer(this.selectedPlayerId);
      this.closeImageModal();
    }
  }

  // ── Batch Actions ────────────────────────────────────────────────────────

  onPlayerCheckboxChange(playerId: number, checked: boolean) {
    if (checked) {
      this.selectedPlayers.add(playerId);
    } else {
      this.selectedPlayers.delete(playerId);
      this.selectAllChecked = false;
    }
    this.cdr.markForCheck();
  }

  onSelectAllChange(checked: boolean) {
    this.selectAllChecked = checked;
    if (checked) {
      this.players.forEach((p) => this.selectedPlayers.add(p.id));
    } else {
      this.selectedPlayers.clear();
    }
    this.cdr.markForCheck();
  }

  getSelectedPlayerIds(): number[] {
    return Array.from(this.selectedPlayers);
  }

  // ── Reset Auction Status ────────────────────────────────────────────────

  onPlayerResetCheckboxChange(playerId: number, checked: boolean) {
    if (checked) {
      this.selectedPlayersForReset.add(playerId);
    } else {
      this.selectedPlayersForReset.delete(playerId);
    }
  }

  isPlayerSelectedForReset(playerId: number): boolean {
    return this.selectedPlayersForReset.has(playerId);
  }

  getPlayerAuctionStatus(playerId: number): string {
    return this.auctionPlayerMap.get(playerId)?.auctionStatus || 'N/A';
  }

  getAuctionStatus(playerId: number): string | null {
    const status = this.getPlayerAuctionStatus(playerId);
    return status === 'SOLD' || status === 'UNSOLD' ? status : null;
  }

  getAuctionTeamName(playerId: number): string {
    return this.auctionPlayerMap.get(playerId)?.soldToTeamName || '';
  }

  getAuctionPrice(playerId: number): number {
    return this.auctionPlayerMap.get(playerId)?.soldPrice || 0;
  }

  getBasePrice(playerId: number): number {
    return this.auctionPlayerMap.get(playerId)?.basePrice || 0;
  }

  isResetAllowed(playerId: number, playerStatus: string): boolean {
    // Reset is allowed if the player auction status is SOLD or UNSOLD
    const auctionStatus = this.getPlayerAuctionStatus(playerId);
    return auctionStatus === 'SOLD' || auctionStatus === 'UNSOLD';
  }

  getDisplayPlayerStatus(playerStatus: string, playerId: number): string {
    if (playerStatus !== 'APPROVED') {
      return playerStatus; // Show PENDING or REJECTED as-is
    }
    
    // For APPROVED players, show auction status
    const auctionStatus = this.getPlayerAuctionStatus(playerId);
    switch (auctionStatus) {
      case 'SOLD':
        return 'Sold';
      case 'UNSOLD':
        return 'Unsold';
      default:
        return 'Approved'; // Still available for auction
    }
  }

  getStatusBadgeClass(playerStatus: string, playerId: number): string {
    if (playerStatus !== 'APPROVED') {
      return `status-${playerStatus.toLowerCase()}`;
    }
    
    const auctionStatus = this.getPlayerAuctionStatus(playerId);
    switch (auctionStatus) {
      case 'SOLD':
        return 'status-sold';
      case 'UNSOLD':
        return 'status-unsold';
      default:
        return 'status-approved';
    }
  }

  resetSinglePlayerAuctionStatus(playerId: number) {
    const playerName = this.players.find((p) => p.id === playerId)?.firstName || 'Player';
    this.openConfirmModal(
      'Reset Auction Status',
      `Are you sure you want to reset ${playerName}'s auction status to Available? Any sale will be refunded.`,
      () => {
        // Get the auction player to get its ID
        const auctionPlayer = this.auctionPlayerMap.get(playerId);
        if (!auctionPlayer) {
          this.openErrorModal('Error', 'Could not find auction data for this player');
          return;
        }

        this.isResettingAuction = true;
        this.resetMessage = 'Resetting player...';
        this.cdr.markForCheck();

        // Pass the auction player ID to the reset endpoint
        this.auctionPlayerService.resetAuctionPlayers(this.tournamentId, [auctionPlayer.id]).subscribe({
          next: () => {
            this.isResettingAuction = false;
            this.resetMessage = '';
            // Refresh auction players after reset
            this.loadAuctionPlayers();
            this.openSuccessModal('Reset Successful', 'Player auction status has been reset to Available');
            this.cdr.markForCheck();
          },
          error: (err) => {
            this.isResettingAuction = false;
            this.resetMessage = '';
            this.openErrorModal('Reset Failed', 'Failed to reset player auction status. ' + (err?.error?.message || ''));
            this.cdr.markForCheck();
          },
        });
      }
    );
  }

  resetSelectedPlayersAuctionStatus() {
    const selectedPlayerIds = Array.from(this.selectedPlayersForReset);
    if (selectedPlayerIds.length === 0) {
      this.openErrorModal('No Selection', 'Please select at least one player to reset');
      return;
    }

    this.openConfirmModal(
      'Reset Multiple Players',
      `Are you sure you want to reset auction status for ${selectedPlayerIds.length} player(s) to Available? Any sales will be refunded.`,
      () => {
        // Convert player IDs to auction player IDs
        const auctionPlayerIds: number[] = [];
        for (const playerId of selectedPlayerIds) {
          const auctionPlayer = this.auctionPlayerMap.get(playerId);
          if (auctionPlayer) {
            auctionPlayerIds.push(auctionPlayer.id);
          }
        }

        if (auctionPlayerIds.length === 0) {
          this.openErrorModal('Error', 'Could not find auction data for selected players');
          return;
        }

        this.isResettingAuction = true;
        this.resetMessage = `Resetting ${auctionPlayerIds.length} player(s)...`;
        this.cdr.markForCheck();

        this.auctionPlayerService.resetAuctionPlayers(this.tournamentId, auctionPlayerIds).subscribe({
          next: () => {
            this.isResettingAuction = false;
            this.resetMessage = '';
            this.selectedPlayersForReset.clear();
            // Refresh auction players after reset
            this.loadAuctionPlayers();
            this.openSuccessModal('Reset Successful', `${auctionPlayerIds.length} player(s) auction status have been reset to Available`);
            this.cdr.markForCheck();
          },
          error: (err) => {
            this.isResettingAuction = false;
            this.resetMessage = '';
            this.openErrorModal('Reset Failed', 'Failed to reset player auction status. ' + (err?.error?.message || ''));
            this.cdr.markForCheck();
          },
        });
      }
    );
  }

  approveSelectedPlayers() {
    const selectedIds = this.getSelectedPlayerIds();
    if (selectedIds.length === 0) {
      this.openErrorModal('No Selection', 'Please select at least one player to approve');
      return;
    }

    this.openConfirmModal(
      'Approve Players',
      `Are you sure you want to approve ${selectedIds.length} player(s)?`,
      () => {
        this.showLoadingModal = true;
        this.loadingMessage = `Approving ${selectedIds.length} player(s)...`;
        this.isProcessingBatchAction = true;
        this.cdr.markForCheck();

        this.playerService.approveAll(this.tournamentId, selectedIds).subscribe({
          next: (response) => {
            // Update the status of approved players
            selectedIds.forEach((id) => {
              const player = this.players.find((p) => p.id === id);
              if (player) player.status = 'APPROVED';
            });
            this.selectedPlayers.clear();
            this.selectAllChecked = false;
            this.isProcessingBatchAction = false;
            this.showLoadingModal = false;
            this.openSuccessModal(
              'Approval Successful',
              `${response.approvedCount} player(s) have been approved successfully`
            );
            this.cdr.markForCheck();
          },
          error: (error) => {
            this.isProcessingBatchAction = false;
            this.showLoadingModal = false;
            const errorMessage =
              error?.error?.message || 'Failed to approve selected players';
            this.openErrorModal('Approval Failed', errorMessage);
            this.cdr.markForCheck();
          },
        });
      }
    );
  }

  rejectSelectedPlayers() {
    const selectedIds = this.getSelectedPlayerIds();
    if (selectedIds.length === 0) {
      this.openErrorModal('No Selection', 'Please select at least one player to reject');
      return;
    }

    this.openConfirmModal(
      'Reject Players',
      `Are you sure you want to reject ${selectedIds.length} player(s)?`,
      () => {
        this.showLoadingModal = true;
        this.loadingMessage = `Rejecting ${selectedIds.length} player(s)...`;
        this.isProcessingBatchAction = true;
        this.cdr.markForCheck();

        this.playerService.rejectAll(this.tournamentId, selectedIds).subscribe({
          next: (response) => {
            // Update the status of rejected players
            selectedIds.forEach((id) => {
              const player = this.players.find((p) => p.id === id);
              if (player) player.status = 'REJECTED';
            });
            this.selectedPlayers.clear();
            this.selectAllChecked = false;
            this.isProcessingBatchAction = false;
            this.showLoadingModal = false;
            this.openSuccessModal(
              'Rejection Successful',
              `${response.rejectedCount} player(s) have been rejected successfully`
            );
            this.cdr.markForCheck();
          },
          error: (error) => {
            this.isProcessingBatchAction = false;
            this.showLoadingModal = false;
            const errorMessage =
              error?.error?.message || 'Failed to reject selected players';
            this.openErrorModal('Rejection Failed', errorMessage);
            this.cdr.markForCheck();
          },
        });
      }
    );
  }

  openEditPlayerModal(player: Player) {
    this.editingPlayer = player;
    this.editPlayerForm = {
      firstName: player.firstName,
      lastName: player.lastName || '',
      dob: player.dob || '',
      role: player.role,
      photoFile: null,
      paymentProofFile: null,
    };
    this.editPhotoPreview = player.photoUrl ?? null;
    this.showEditPlayerModal = true;
  }

  closeEditPlayerModal() {
    this.showEditPlayerModal = false;
    this.editingPlayer = null;
    this.editPhotoPreview = null;
  }

  onEditPhotoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.editPhotoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  onEditPaymentProofSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.editPlayerForm.paymentProofFile = file;
    }
  }

  saveEditPlayer() {
    if (!this.editingPlayer) return;
    if (!this.editPlayerForm.firstName) {
      alert('First Name is required');
      return;
    }
    this.isEditingPlayer = true;
    this.playerService
      .update(this.editingPlayer.id, {
        firstName: this.editPlayerForm.firstName,
        lastName: this.editPlayerForm.lastName || undefined,
        dob: this.editPlayerForm.dob || undefined,
        role: this.editPlayerForm.role,
        photo: this.editPlayerForm.photoFile ?? undefined,
        paymentProof: this.editPlayerForm.paymentProofFile ?? undefined,
      })
      .subscribe({
        next: (updated) => {
          const index = this.players.findIndex((p) => p.id === this.editingPlayer!.id);
          if (index !== -1) this.players[index] = updated;
          this.isEditingPlayer = false;
          this.closeEditPlayerModal();
          this.cdr.markForCheck();
        },
        error: () => {
          this.isEditingPlayer = false;
          alert('Failed to update player.');
        },
      });
  }

  goBack() {
    this.router.navigate(['/admin']);
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

  openSuccessModal(title: string, message: string) {
    this.successTitle = title;
    this.successMessage = message;
    this.showSuccessModal = true;
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
  }

  openErrorModal(title: string, message: string) {
    this.errorTitle = title;
    this.errorMessage = message;
    this.showErrorModal = true;
  }

  closeErrorModal() {
    this.showErrorModal = false;
  }
}
