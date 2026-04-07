
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PlayerService } from '../../core/services/player.service';
import { AuctionPlayerService } from '../../core/services/auction-player.service';
import { TournamentService } from '../../core/services/tournament.service';
import { CloudinaryImageService } from '../../core/services/cloudinary-image.service';
import { Tournament, Player, PlayerBulkRegisterRequest, BulkUploadRowError } from '../../models';
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
    // Search and Sort
    public searchTerm = '';
    public sortField: 'playerNumber' | 'firstName' | 'lastName' | 'age' | 'status' = 'playerNumber';
    public sortDirection: 'asc' | 'desc' = 'asc';

    get filteredAndSortedPlayers(): Player[] {
      let filtered = this.players;
      if (this.searchTerm && this.searchTerm.trim()) {
        const term = this.searchTerm.trim().toLowerCase();
        filtered = filtered.filter((p: Player) =>
          (p.firstName && p.firstName.toLowerCase().includes(term)) ||
          (p.lastName && p.lastName.toLowerCase().includes(term))
        );
      }
      let sorted = [...filtered];
      sorted.sort((a: Player, b: Player) => {
        let aVal: string | number = '';
        let bVal: string | number = '';
        switch (this.sortField) {
          case 'playerNumber': {
            // Alphanumeric sort (e.g., P001, P002, P010)
            aVal = (a.playerNumber || '').toString();
            bVal = (b.playerNumber || '').toString();
            break;
          }
          case 'firstName':
            aVal = (a.firstName || '').toLowerCase();
            bVal = (b.firstName || '').toLowerCase();
            break;
          case 'lastName':
            aVal = (a.lastName || '').toLowerCase();
            bVal = (b.lastName || '').toLowerCase();
            break;
          case 'age':
            aVal = Number(this.calculateAge(a.dob));
            bVal = Number(this.calculateAge(b.dob));
            break;
          case 'status':
            aVal = (a.status || '').toLowerCase();
            bVal = (b.status || '').toLowerCase();
            break;
        }
        if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
      return sorted;
    }

    setSort(field: 'playerNumber' | 'firstName' | 'lastName' | 'age' | 'status') {
      if (this.sortField === field) {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortField = field;
        this.sortDirection = 'asc';
      }
    }

    get totalPlayers(): number {
      return this.players.length;
    }

    get totalApprovedPlayers(): number {
      return this.players.filter((p: Player) => this.isApprovedStatus(p.id)).length;
    }

    isApprovedStatus(playerId: number): boolean {
      let status = false;
      const auctionStatus = this.getPlayerAuctionStatus(playerId);
       status = (auctionStatus === 'SOLD' || auctionStatus === 'UNSOLD' || auctionStatus === 'APPROVED'|| auctionStatus === 'UPCOMING');
       return status;
    }
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
  isResettingAuction = false;

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

  // Excel Bulk Upload Modal
  showExcelModal = false;
  excelBulkRows: PlayerBulkRegisterRequest[] = [];
  excelBulkErrors: BulkUploadRowError[] = [];
  isBulkUploading = false;
  csvFileName = '';
  bulkUploadSuccess = false;
  bulkUploadCreatedCount = 0;

  // Bulk Upload Limit Modal
  showBulkLimitModal = false;
  readonly whatsappNumber = '+916360634388';
  readonly contactEmail = 'auction.deck@gmail.com';

  // Delete All Players Confirmation Modal
  showDeleteAllConfirmModal = false;
  deleteAllConfirmInput = '';
  isDeletingAllPlayers = false;

  // Add Player Form
  showAddPlayerModal = false;
  isAddingPlayer = false;
  isUploadingPlayerPhoto = false;
  isUploadingPlayerPaymentProof = false;
  addPlayerSubmitted = false;
  newPlayer = {
    firstName: '',
    lastName: '',
    dob: '',
    role: '',

    photoUrl: '' as string,
    paymentProofUrl: '' as string,
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
  playerPhotoPreview: string | null = null;

  // Edit Player Form
  showEditPlayerModal = false;
  isEditingPlayer = false;
  isDeletingPlayer = false;
  isUploadingEditPhoto = false;
  isUploadingEditPaymentProof = false;
  editPlayerSubmitted = false;
  editingPlayer: Player | null = null;
  editPlayerForm = {
    firstName: '',
    lastName: '',
    dob: '',
    role: 'BATSMAN',
    photoUrl: '' as string,
    paymentProofUrl: '' as string,
    handedness: '',
    tshirtSize: '',
    trouserSize: '',
    jerseyNumber: '',
    sleeveType: '',
    playerLocation: '',
    mobileNumber: '',
    lastSeasonPlayed: '',
    lastSeasonTeam: '',
  };
  editPhotoPreview: string | null = null;

  private tournamentId!: number;
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private playerService = inject(PlayerService);
  private auctionPlayerService = inject(AuctionPlayerService);
  private tournamentService = inject(TournamentService);
  private cloudinaryService = inject(CloudinaryImageService);
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
          // Fetch registration field config separately and patch into tournament
          this.tournamentService.getRegistrationConfig(id).subscribe({
            next: (config) => {
              if (this.tournament && config) {
                this.tournament = { ...this.tournament, registrationFieldConfig: config };
                this.cdr.markForCheck();
              }
            },
          });
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
    this.addPlayerSubmitted = false;
    this.newDobError = '';
    this.newPlayer = {
      firstName: '',
      lastName: '',
      dob: '',
      role: '',

      photoUrl: this.DEFAULT_PLAYER_PHOTO,
      paymentProofUrl: this.DEFAULT_PAYMENT_PROOF,
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
    this.playerPhotoPreview = this.DEFAULT_PLAYER_PHOTO;
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

  /** Today's date string for max DOB constraint (YYYY-MM-DD) */
  readonly todayString = new Date().toISOString().split('T')[0];

  /** DOB validation error messages */
  newDobError = '';
  editDobError = '';

  /** Default Cloudinary URLs */
  readonly DEFAULT_PLAYER_PHOTO = 'https://res.cloudinary.com/drytm0fl7/image/upload/v1774291008/default_player_lzyniw.png';
  readonly DEFAULT_PAYMENT_PROOF = 'https://res.cloudinary.com/drytm0fl7/image/upload/v1775334478/payment_apq98r.png';

  /** Get player photo URL with default fallback */
  getPlayerPhotoUrl(photoUrl: string | undefined): string {
    return photoUrl || this.DEFAULT_PLAYER_PHOTO;
  }

  /** Get payment proof URL with default fallback */
  getPaymentProofUrl(proofUrl: string | undefined): string {
    // For payment proof, we'll use player default if not provided
    return proofUrl || this.DEFAULT_PLAYER_PHOTO;
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
      this.isUploadingPlayerPhoto = true;
      this.cdr.detectChanges();
      
      // Show preview immediately
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.playerPhotoPreview = e.target.result;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
      
      this.cloudinaryService.uploadImage(file).subscribe({
        next: (response) => {
          this.newPlayer.photoUrl = response.secure_url;
          this.playerPhotoPreview = this.cloudinaryService.getTransformedUrl(response.secure_url);
          this.isUploadingPlayerPhoto = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Photo upload failed:', err);
          alert('Failed to upload photo. Please try again.');
          this.isUploadingPlayerPhoto = false;
          this.cdr.detectChanges();
        },
      });
    }
  }

  onPaymentProofSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.isUploadingPlayerPaymentProof = true;
      this.cdr.detectChanges();
      
      // Show preview immediately
      const reader = new FileReader();
      reader.onload = (e: any) => {
        // For payment proof, just trigger upload
      };
      reader.readAsDataURL(file);
      
      this.cloudinaryService.uploadImage(file).subscribe({
        next: (response) => {
          this.newPlayer.paymentProofUrl = response.secure_url;
          this.isUploadingPlayerPaymentProof = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Payment proof upload failed:', err);
          alert('Failed to upload payment proof. Please try again.');
          this.isUploadingPlayerPaymentProof = false;
          this.cdr.detectChanges();
        },
      });
    }
  }

  addPlayer() {
    this.addPlayerSubmitted = true;
    const config = this.tournament?.registrationFieldConfig;

    // DOB validation
    if (!this.newPlayer.dob) {
      this.newDobError = 'Date of Birth is required.';
    } else if (new Date(this.newPlayer.dob) >= new Date(this.todayString)) {
      this.newDobError = 'Date of Birth must be in the past.';
    } else {
      this.newDobError = '';
    }

    const isValid =
      !!this.newPlayer.firstName &&
      !!this.newPlayer.lastName &&
      !!this.newPlayer.dob && !this.newDobError &&
      !!this.newPlayer.role &&
      (!config?.requireMobileNumber || !!this.newPlayer.mobileNumber) &&
      (!config?.requireHandedness || !!this.newPlayer.handedness) &&
      (!config?.requireTshirtSize || !!this.newPlayer.tshirtSize) &&
      (!config?.requireTrouserSize || !!this.newPlayer.trouserSize) &&
      (!config?.requireJerseyNumber || !!this.newPlayer.jerseyNumber) &&
      (!config?.requireSleeveType || !!this.newPlayer.sleeveType) &&
      (!config?.requirePlayerLocation || !!this.newPlayer.playerLocation) &&
      (!config?.requireLastSeasonPlayed || !!this.newPlayer.lastSeasonPlayed) &&
      (!config?.requireLastSeasonTeam || !!this.newPlayer.lastSeasonTeam) &&
      (!config?.requireBowlingStyle || !!this.newPlayer.bowlingStyle);

    if (!isValid) return;

    const paymentProofUrl = this.newPlayer.paymentProofUrl || this.DEFAULT_PAYMENT_PROOF;

    this.isAddingPlayer = true;
    // Use public registration endpoint (admin adds player directly)
    this.playerService
      .register(this.tournamentId, {
        firstName: this.newPlayer.firstName,
        lastName: this.newPlayer.lastName || undefined,
        dob: this.newPlayer.dob || undefined,
        role: this.newPlayer.role,
        photo: this.newPlayer.photoUrl || this.DEFAULT_PLAYER_PHOTO,
        paymentProof: paymentProofUrl,
        handedness: this.newPlayer.handedness || undefined,
        tshirtSize: this.newPlayer.tshirtSize || undefined,
        trouserSize: this.newPlayer.trouserSize || undefined,
        jerseyNumber: this.newPlayer.jerseyNumber ? Number(this.newPlayer.jerseyNumber) : undefined,
        sleeveType: this.newPlayer.sleeveType || undefined,
        playerLocation: this.newPlayer.playerLocation || undefined,
        mobileNumber: this.newPlayer.mobileNumber || undefined,
        lastSeasonPlayed: this.newPlayer.lastSeasonPlayed || undefined,
        lastSeasonTeam: this.newPlayer.lastSeasonTeam || undefined,
        bowlingStyle: this.newPlayer.bowlingStyle || undefined,
      })
      .subscribe({
        next: (p) => {
          this.players.push(p);
          this.isAddingPlayer = false;
          this.closeAddPlayerModal();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isAddingPlayer = false;
          const msg = err?.error?.message || 'Failed to add player. Please check the details and try again.';
          this.openErrorModal('Failed to Add Player', msg);
          this.cdr.markForCheck();
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

        this.showLoadingModal = true;
        this.loadingMessage = 'Resetting player...';
        this.isResettingAuction = true;
        this.cdr.markForCheck();

        // Pass the auction player ID to the reset endpoint
        this.auctionPlayerService.resetAuctionPlayers(this.tournamentId, [auctionPlayer.id]).subscribe({
          next: () => {
            this.loadingMessage = 'Updating player status...';
            // Refresh auction players after reset
            this.auctionPlayerService.getByTournament(this.tournamentId).subscribe({
              next: (auctionPlayers) => {
                const player = this.players.find(p => p.id === playerId);
                if (player) player.status = 'APPROVED';
                const newMap = new Map<number, any>();
                auctionPlayers.forEach(ap => {
                  const key = ap.playerId || ap.id;
                  newMap.set(key, ap);
                });
                this.auctionPlayerMap = newMap;
                this.isResettingAuction = false;
                this.showLoadingModal = false;
                this.openSuccessModal('Reset Successful', 'Player auction status has been reset to Available');
                this.cdr.detectChanges();
              },
              error: () => {
                const player = this.players.find(p => p.id === playerId);
                if (player) player.status = 'APPROVED';
                this.isResettingAuction = false;
                this.showLoadingModal = false;
                this.openSuccessModal('Reset Successful', 'Player auction status has been reset to Available');
                this.cdr.detectChanges();
              }
            });
          },
          error: (err) => {
            this.isResettingAuction = false;
            this.showLoadingModal = false;
            this.openErrorModal('Reset Failed', 'Failed to reset player auction status. ' + (err?.error?.message || ''));
            this.cdr.markForCheck();
          },
        });
      }
    );
  }

  resetSelectedPlayersAuctionStatus() {
    const selectedPlayerIds = Array.from(this.selectedPlayers);
    const eligibleIds = selectedPlayerIds.filter(id => this.isResetAllowed(id, this.players.find(p => p.id === id)?.status || ''));
    if (eligibleIds.length === 0) {
      this.openErrorModal('No Eligible Players', 'None of the selected players have a SOLD or UNSOLD auction status that can be reset.');
      return;
    }

    const skippedCount = selectedPlayerIds.length - eligibleIds.length;
    const skippedNote = skippedCount > 0 ? ` (${skippedCount} selected player(s) are not eligible and will be skipped.)` : '';
    this.openConfirmModal(
      'Reset Auction Status',
      `Are you sure you want to reset auction status for ${eligibleIds.length} player(s) to Available? Any sales will be refunded.${skippedNote}`,
      () => {
        // Convert eligible player IDs to auction player IDs
        const auctionPlayerIds: number[] = [];
        for (const playerId of eligibleIds) {
          const auctionPlayer = this.auctionPlayerMap.get(playerId);
          if (auctionPlayer) {
            auctionPlayerIds.push(auctionPlayer.id);
          }
        }

        if (auctionPlayerIds.length === 0) {
          this.openErrorModal('Error', 'Could not find auction data for selected players');
          return;
        }

        this.showLoadingModal = true;
        this.loadingMessage = `Resetting ${auctionPlayerIds.length} player(s)...`;
        this.isResettingAuction = true;
        this.cdr.markForCheck();

        this.auctionPlayerService.resetAuctionPlayers(this.tournamentId, auctionPlayerIds).subscribe({
          next: () => {
            // Refresh auction data first so the grid updates before showing the modal
            this.auctionPlayerService.getByTournament(this.tournamentId).subscribe({
              next: (auctionPlayers) => {
                eligibleIds.forEach((id) => {
                  const player = this.players.find((p) => p.id === id);
                  if (player) player.status = 'APPROVED';
                });
                const newMap = new Map<number, any>();
                auctionPlayers.forEach(ap => {
                  const key = ap.playerId || ap.id;
                  newMap.set(key, ap);
                });
                this.auctionPlayerMap = newMap;
                this.selectedPlayers.clear();
                this.selectAllChecked = false;
                this.isResettingAuction = false;
                this.showLoadingModal = false;
                this.openSuccessModal('Reset Successful', `${auctionPlayerIds.length} player(s) auction status have been reset to Available and marked as Approved`);
                this.cdr.detectChanges();
              },
              error: () => {
                // Fallback: update player statuses locally
                eligibleIds.forEach((id) => {
                  const player = this.players.find((p) => p.id === id);
                  if (player) player.status = 'APPROVED';
                });
                this.selectedPlayers.clear();
                this.selectAllChecked = false;
                this.isResettingAuction = false;
                this.showLoadingModal = false;
                this.openSuccessModal('Reset Successful', `${auctionPlayerIds.length} player(s) auction status have been reset to Available and marked as Approved`);
                this.cdr.detectChanges();
              }
            });
          },
          error: (err) => {
            this.isResettingAuction = false;
            this.showLoadingModal = false;
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

  deleteSelectedPlayers() {
    const selectedIds = this.getSelectedPlayerIds();
    if (selectedIds.length === 0) {
      this.openErrorModal('No Selection', 'Please select at least one player to delete');
      return;
    }

    this.openConfirmModal(
      'Delete Players',
      `Are you sure you want to delete ${selectedIds.length} player(s)? This action cannot be undone.`,
      () => {
        this.showLoadingModal = true;
        this.loadingMessage = `Deleting ${selectedIds.length} player(s)...`;
        this.isProcessingBatchAction = true;
        this.cdr.markForCheck();

        this.playerService.deleteBulk(this.tournamentId, selectedIds).subscribe({
          next: (response) => {
            this.players = this.players.filter((p) => !selectedIds.includes(p.id));
            this.selectedPlayers.clear();
            this.selectAllChecked = false;
            this.isProcessingBatchAction = false;
            this.showLoadingModal = false;
            const skippedMsg = response.skippedCount > 0
              ? ` ${response.skippedCount} player(s) could not be deleted.`
              : '';
            this.openSuccessModal(
              'Deletion Successful',
              `${response.deletedCount} player(s) have been deleted successfully.${skippedMsg}`
            );
            this.cdr.markForCheck();
          },
          error: () => {
            this.isProcessingBatchAction = false;
            this.showLoadingModal = false;
            this.openErrorModal('Deletion Failed', 'Failed to delete selected players. Please try again.');
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
      photoUrl: player.photoUrl || this.DEFAULT_PLAYER_PHOTO,
      paymentProofUrl: player.paymentProofUrl || '',
      handedness: player.handedness || '',
      tshirtSize: player.tshirtSize || '',
      trouserSize: player.trouserSize || '',
      jerseyNumber: player.jerseyNumber != null ? String(player.jerseyNumber) : '',
      sleeveType: player.sleeveType || '',
      playerLocation: player.playerLocation || '',
      mobileNumber: player.mobileNumber || '',
      lastSeasonPlayed: player.lastSeasonPlayed || '',
      lastSeasonTeam: player.lastSeasonTeam || '',
    };
    this.editPhotoPreview = player.photoUrl || this.DEFAULT_PLAYER_PHOTO;
    this.showEditPlayerModal = true;
  }

  closeEditPlayerModal() {
    this.showEditPlayerModal = false;
    this.editingPlayer = null;
    this.editPhotoPreview = null;
    this.editPlayerSubmitted = false;
    this.editDobError = '';
  }

  onEditPhotoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.isUploadingEditPhoto = true;
      this.cdr.detectChanges();
      
      this.cloudinaryService.uploadImage(file).subscribe({
        next: (response) => {
          this.editPlayerForm.photoUrl = response.secure_url;
          this.editPhotoPreview = this.cloudinaryService.getTransformedUrl(response.secure_url);
          this.isUploadingEditPhoto = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Photo upload failed:', err);
          alert('Failed to upload photo. Please try again.');
          this.isUploadingEditPhoto = false;
          this.cdr.detectChanges();
        },
      });
    }
  }

  onEditPaymentProofSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.isUploadingEditPaymentProof = true;
      this.cdr.detectChanges();
      
      this.cloudinaryService.uploadImage(file).subscribe({
        next: (response) => {
          this.editPlayerForm.paymentProofUrl = response.secure_url;
          this.isUploadingEditPaymentProof = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Payment proof upload failed:', err);
          alert('Failed to upload payment proof. Please try again.');
          this.isUploadingEditPaymentProof = false;
          this.cdr.detectChanges();
        },
      });
    }
  }

  saveEditPlayer() {
    if (!this.editingPlayer) return;
    this.editPlayerSubmitted = true;
    if (!this.editPlayerForm.firstName) return;
    if (this.editPlayerForm.dob && new Date(this.editPlayerForm.dob) >= new Date(this.todayString)) {
      this.editDobError = 'Date of Birth must be in the past.';
      return;
    } else {
      this.editDobError = '';
    }
    this.isEditingPlayer = true;
    this.playerService
      .update(this.editingPlayer.id, {
        firstName: this.editPlayerForm.firstName,
        lastName: this.editPlayerForm.lastName || undefined,
        dob: this.editPlayerForm.dob || undefined,
        role: this.editPlayerForm.role,
        photo: this.editPlayerForm.photoUrl || this.editingPlayer?.photoUrl || this.DEFAULT_PLAYER_PHOTO,
        paymentProof: this.editPlayerForm.paymentProofUrl || this.editingPlayer?.paymentProofUrl || undefined,
        handedness: this.editPlayerForm.handedness || undefined,
        tshirtSize: this.editPlayerForm.tshirtSize || undefined,
        trouserSize: this.editPlayerForm.trouserSize || undefined,
        jerseyNumber: this.editPlayerForm.jerseyNumber ? Number(this.editPlayerForm.jerseyNumber) : undefined,
        sleeveType: this.editPlayerForm.sleeveType || undefined,
        playerLocation: this.editPlayerForm.playerLocation || undefined,
        mobileNumber: this.editPlayerForm.mobileNumber || undefined,
        lastSeasonPlayed: this.editPlayerForm.lastSeasonPlayed || undefined,
        lastSeasonTeam: this.editPlayerForm.lastSeasonTeam || undefined,
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

  openDeleteAllPlayersModal() {
    this.deleteAllConfirmInput = '';
    this.showDeleteAllConfirmModal = true;
  }

  closeDeleteAllConfirmModal() {
    this.showDeleteAllConfirmModal = false;
    this.deleteAllConfirmInput = '';
  }

  confirmDeleteAllPlayers() {
    if (this.deleteAllConfirmInput !== 'delete players') return;
    this.closeDeleteAllConfirmModal();
    this.isDeletingAllPlayers = true;
    this.showLoadingModal = true;
    this.loadingMessage = 'Deleting all players...';
    this.cdr.markForCheck();

    this.playerService.deleteAllByTournament(this.tournamentId).subscribe({
      next: () => {
        this.players = [];
        this.auctionPlayerMap.clear();
        this.selectedPlayers.clear();
        this.selectAllChecked = false;
        this.isDeletingAllPlayers = false;
        this.showLoadingModal = false;
        this.openSuccessModal('All Players Deleted', 'All players have been successfully deleted from the tournament.');
        this.cdr.markForCheck();
      },
      error: () => {
        this.isDeletingAllPlayers = false;
        this.showLoadingModal = false;
        this.openErrorModal('Deletion Failed', 'Failed to delete all players. Please try again.');
        this.cdr.markForCheck();
      },
    });
  }

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

  // ── Excel Bulk Upload ────────────────────────────────────────────────────

  openExcelModal() {
    this.showExcelModal = true;
    this.excelBulkRows = [];
    this.excelBulkErrors = [];
    this.csvFileName = '';
    this.bulkUploadSuccess = false;
    this.bulkUploadCreatedCount = 0;
  }

  closeExcelModal() {
    this.showExcelModal = false;
  }

  async downloadExcelTemplate() {
    const ExcelJS = ((await import('exceljs')) as any).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Players');
    const config = this.tournament?.registrationFieldConfig;

    // Always-mandatory columns
    const columns: { header: string; key: string; width: number }[] = [
      { header: 'firstName *', key: 'firstName', width: 22 },
      { header: 'lastName *', key: 'lastName', width: 22 },
      { header: 'dob * (YYYY-MM-DD)', key: 'dob', width: 22 },
      { header: 'role *', key: 'role', width: 20 },
    ];

    // Append config-driven required columns
    if (config?.requireMobileNumber)     columns.push({ header: 'mobileNumber *',     key: 'mobileNumber',     width: 18 });
    if (config?.requireHandedness)       columns.push({ header: 'batting style *',     key: 'handedness',       width: 16 });
    if (config?.requireTshirtSize)       columns.push({ header: 'tshirtSize *',       key: 'tshirtSize',       width: 14 });
    if (config?.requireTrouserSize)      columns.push({ header: 'trouserSize *',      key: 'trouserSize',      width: 14 });
    if (config?.requireJerseyNumber)     columns.push({ header: 'jerseyNumber *',     key: 'jerseyNumber',     width: 14 });
    if (config?.requireSleeveType)       columns.push({ header: 'sleeveType *',       key: 'sleeveType',       width: 16 });
    if (config?.requirePlayerLocation)   columns.push({ header: 'playerLocation *',   key: 'playerLocation',   width: 20 });
    if (config?.requireLastSeasonPlayed) columns.push({ header: 'lastSeasonPlayed *', key: 'lastSeasonPlayed', width: 16 });
    if (config?.requireLastSeasonTeam)   columns.push({ header: 'lastSeasonTeam *',   key: 'lastSeasonTeam',   width: 22 });
    if (config?.requireBowlingStyle)     columns.push({ header: 'bowlingStyle *',     key: 'bowlingStyle',     width: 20 });

    sheet.columns = columns;

    // Helper: get Excel column letter by key
    const colLetter = (key: string): string | null => {
      const idx = columns.findIndex(c => c.key === key);
      return idx >= 0 ? String.fromCharCode(65 + idx) : null;
    };

    // Force DOB column to text so Excel never converts to a date serial
    const dobCol = colLetter('dob');
    if (dobCol) sheet.getColumn(dobCol).numFmt = '@';

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell: any) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        bottom: { style: 'medium', color: { argb: 'FF2F54A6' } },
      };
    });
    headerRow.height = 24;

    // Apply dropdown data validation to rows 2–500 for relevant columns
    for (let row = 2; row <= 500; row++) {
      const roleCol = colLetter('role');
      if (roleCol) sheet.getCell(`${roleCol}${row}`).dataValidation = {
        type: 'list', allowBlank: true,
        formulae: ['"Batsman,Bowler,All-rounder,Wicket Keeper"'],
        showErrorMessage: true, errorTitle: 'Invalid Role',
        error: 'Please select from: Batsman, Bowler, All-rounder, Wicket Keeper',
      };
      const handednessCol = colLetter('handedness');
      if (handednessCol) sheet.getCell(`${handednessCol}${row}`).dataValidation = {
        type: 'list', allowBlank: true,
        formulae: ['"Right,Left"'],
        showErrorMessage: true, errorTitle: 'Invalid Batting Style',
        error: 'Please select Right or Left',
      };
      const tshirtCol = colLetter('tshirtSize');
      if (tshirtCol) sheet.getCell(`${tshirtCol}${row}`).dataValidation = {
        type: 'list', allowBlank: true,
        formulae: ['"XS,S,M,L,XL,XXL"'],
        showErrorMessage: true, errorTitle: 'Invalid T-Shirt Size',
        error: 'Please select a valid size',
      };
      const trouserCol = colLetter('trouserSize');
      if (trouserCol) sheet.getCell(`${trouserCol}${row}`).dataValidation = {
        type: 'list', allowBlank: true,
        formulae: ['"26,28,30,32,34,36,38,40"'],
        showErrorMessage: true, errorTitle: 'Invalid Trouser Size',
        error: 'Please select a valid size',
      };
      const sleeveCol = colLetter('sleeveType');
      if (sleeveCol) sheet.getCell(`${sleeveCol}${row}`).dataValidation = {
        type: 'list', allowBlank: true,
        formulae: ['"Full Sleeves,Half Sleeves"'],
        showErrorMessage: true, errorTitle: 'Invalid Sleeve Type',
        error: 'Please select Full Sleeves or Half Sleeves',
      };
      const lastSeasonCol = colLetter('lastSeasonPlayed');
      if (lastSeasonCol) sheet.getCell(`${lastSeasonCol}${row}`).dataValidation = {
        type: 'list', allowBlank: true,
        formulae: ['"Yes,No"'],
        showErrorMessage: true, errorTitle: 'Invalid Value',
        error: 'Please select Yes or No',
      };
      const bowlingStyleCol = colLetter('bowlingStyle');
      if (bowlingStyleCol) sheet.getCell(`${bowlingStyleCol}${row}`).dataValidation = {
        type: 'list', allowBlank: true,
        formulae: ['"Right hand Fast Bowler,Left hand Fast Bowler,Right hand Fast-Medium,Left hand Fast-Medium,Right hand Medium-Fast,Left hand Medium-Fast,Right hand Medium Pacer,Left hand Medium Pacer,Right hand Off-Spinner,Left hand Off-Spinner,Right hand Leg-Spinner,Left hand Leg-Spinner"'],
        showErrorMessage: true, errorTitle: 'Invalid Bowling Style',
        error: 'Please select a valid bowling style (e.g. Right hand Fast Bowler, Left hand Off-Spinner)',
      };
    }

    // Freeze header row
    sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1, topLeftCell: 'A2', activeCell: 'A2' }];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'players_template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  }

  async onExcelFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;
    this.csvFileName = file.name;
    this.bulkUploadSuccess = false;
    this.excelBulkRows = [];
    this.excelBulkErrors = [];

    try {
      const ExcelJS = ((await import('exceljs')) as any).default;
      const workbook = new ExcelJS.Workbook();
      const buffer = await file.arrayBuffer();
      await workbook.xlsx.load(buffer);

      const sheet = workbook.getWorksheet('Players') ?? workbook.worksheets[0];
      if (!sheet) {
        this.excelBulkErrors = [{ row: 0, field: 'file', message: 'No worksheet found in the uploaded file.' }];
        this.cdr.markForCheck();
        return;
      }
      this.parseExcelSheet(sheet);
    } catch {
      this.excelBulkErrors = [{ row: 0, field: 'file', message: 'Could not read the file. Please use the provided Excel template.' }];
    }

    this.cdr.markForCheck();
    event.target.value = '';
  }

  parseExcelSheet(sheet: any) {
    const VALID_ROLES = ['batsman', 'bowler', 'all-rounder', 'wicket keeper'];
    const config = this.tournament?.registrationFieldConfig;
    this.excelBulkRows = [];
    this.excelBulkErrors = [];

    const cellToString = (value: any): string => {
      if (value == null) return '';
      if (value instanceof Date) {
        const y = value.getFullYear();
        const m = String(value.getMonth() + 1).padStart(2, '0');
        const d = String(value.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      // ExcelJS rich-text object
      if (typeof value === 'object' && value.richText) {
        return value.richText.map((r: any) => r.text).join('');
      }
      return String(value).trim();
    };

    // Build header index from row 1
    const headerMap: Record<number, string> = {};
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell: any, colNum: number) => {
      const raw = cellToString(cell.value).toLowerCase().match(/^[a-z]+/)?.[0] ?? '';
      headerMap[colNum] = raw;
    });

    let dataRowCount = 0;
    sheet.eachRow((row: any, rowIndex: number) => {
      if (rowIndex === 1) return;

      const vals: Record<string, string> = {};
      row.eachCell({ includeEmpty: false }, (cell: any, colNum: number) => {
        const key = headerMap[colNum];
        if (key) vals[key] = cellToString(cell.value);
      });

      // Skip completely empty rows
      if (!Object.values(vals).some(v => v)) return;

      dataRowCount++;
      const dataRow = rowIndex - 1;
      const firstName = vals['firstname'] || '';
      const role = vals['role'] || '';

      if (!firstName) {
        this.excelBulkErrors.push({ row: dataRow, field: 'firstName', message: `Row ${dataRow}: firstName is required.` });
      }
      if (!vals['lastname']) {
        this.excelBulkErrors.push({ row: dataRow, field: 'lastName', message: `Row ${dataRow}: lastName is required.` });
      }
      if (!vals['dob']) {
        this.excelBulkErrors.push({ row: dataRow, field: 'dob', message: `Row ${dataRow}: dob is required (YYYY-MM-DD).` });
      }
      if (!role) {
        this.excelBulkErrors.push({ row: dataRow, field: 'role', message: `Row ${dataRow}: role is required.` });
      } else if (!VALID_ROLES.includes(role.toLowerCase())) {
        this.excelBulkErrors.push({ row: dataRow, field: 'role', message: `Row ${dataRow}: role must be one of Batsman, Bowler, All-rounder, Wicket Keeper.` });
      }
      // Config-driven required field validation
      if (config?.requireMobileNumber && !vals['mobilenumber'])
        this.excelBulkErrors.push({ row: dataRow, field: 'mobileNumber', message: `Row ${dataRow}: mobileNumber is required for this tournament.` });
      else if (vals['mobilenumber'] && !/^[0-9]{10}$/.test(vals['mobilenumber']))
        this.excelBulkErrors.push({ row: dataRow, field: 'mobileNumber', message: `Row ${dataRow}: mobileNumber must be exactly 10 digits.` });
      if (config?.requireHandedness && !vals['batting'])
        this.excelBulkErrors.push({ row: dataRow, field: 'handedness', message: `Row ${dataRow}: handedness is required for this tournament.` });
      if (config?.requireTshirtSize && !vals['tshirtsize'])
        this.excelBulkErrors.push({ row: dataRow, field: 'tshirtSize', message: `Row ${dataRow}: tshirtSize is required for this tournament.` });
      if (config?.requireTrouserSize && !vals['trousersize'])
        this.excelBulkErrors.push({ row: dataRow, field: 'trouserSize', message: `Row ${dataRow}: trouserSize is required for this tournament.` });
      if (config?.requireJerseyNumber && !vals['jerseynumber'])
        this.excelBulkErrors.push({ row: dataRow, field: 'jerseyNumber', message: `Row ${dataRow}: jerseyNumber is required for this tournament.` });
      if (config?.requireSleeveType && !vals['sleevetype'])
        this.excelBulkErrors.push({ row: dataRow, field: 'sleeveType', message: `Row ${dataRow}: sleeveType is required for this tournament.` });
      if (config?.requirePlayerLocation && !vals['playerlocation'])
        this.excelBulkErrors.push({ row: dataRow, field: 'playerLocation', message: `Row ${dataRow}: playerLocation is required for this tournament.` });
      if (config?.requireLastSeasonPlayed && !vals['lastseasonplayed'])
        this.excelBulkErrors.push({ row: dataRow, field: 'lastSeasonPlayed', message: `Row ${dataRow}: lastSeasonPlayed is required for this tournament.` });
      if (config?.requireLastSeasonTeam && !vals['lastseasonteam'])
        this.excelBulkErrors.push({ row: dataRow, field: 'lastSeasonTeam', message: `Row ${dataRow}: lastSeasonTeam is required for this tournament.` });
      if (config?.requireBowlingStyle && !vals['bowlingstyle'])
        this.excelBulkErrors.push({ row: dataRow, field: 'bowlingStyle', message: `Row ${dataRow}: bowlingStyle is required for this tournament.` });

      this.excelBulkRows.push({
        firstName,
        lastName: vals['lastname'] || undefined,
        dob: vals['dob'] || undefined,
        role,
        handedness: vals['batting'] || undefined,
        tshirtSize: vals['tshirtsize'] || undefined,
        trouserSize: vals['trousersize'] || undefined,
        jerseyNumber: vals['jerseynumber'] ? Number(vals['jerseynumber']) : undefined,
        sleeveType: vals['sleevetype'] || undefined,
        playerLocation: vals['playerlocation'] || undefined,
        mobileNumber: vals['mobilenumber'] || undefined,
        lastSeasonPlayed: vals['lastseasonplayed'] || undefined,
        lastSeasonTeam: vals['lastseasonteam'] || undefined,
        bowlingStyle: vals['bowlingstyle'] || undefined,
      });
    });

    if (dataRowCount === 0) {
      this.excelBulkErrors = [{ row: 0, field: 'file', message: 'The file has no data rows. Please fill in the template and re-upload.' }];
      this.excelBulkRows = [];
    }
  }

  submitBulkUpload() {
    if (this.excelBulkErrors.length > 0 || this.excelBulkRows.length === 0) return;
    this.isBulkUploading = true;
    this.cdr.markForCheck();
    const config = this.tournament?.registrationFieldConfig;
    const rowsWithDefaults = this.excelBulkRows.map(r => ({
      ...r,
      photo: r.photo || this.DEFAULT_PLAYER_PHOTO,
      paymentProof: r.paymentProof || this.DEFAULT_PAYMENT_PROOF,
    }));
    this.playerService.bulkRegister(this.tournamentId, rowsWithDefaults).subscribe({
      next: (created) => {
        this.players.push(...created);
        this.bulkUploadCreatedCount = created.length;
        this.bulkUploadSuccess = true;
        this.isBulkUploading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isBulkUploading = false;
        const msg = err?.error?.message || 'Failed to bulk upload players. Please check the data and try again.';
        if (msg.toLowerCase().includes('limited to 30') || msg.toLowerCase().includes('bulk registration is limited')) {
          this.showBulkLimitModal = true;
        } else if (msg.toLowerCase().includes('localdatetime') || msg.toLowerCase().includes('localdate') || msg.toLowerCase().includes('datetimeparseexception') || msg.toLowerCase().includes('could not be parsed')) {
          this.excelBulkErrors = [{ row: 0, field: 'dob', message: 'DOB format is incorrect. Please use YYYY-MM-DD format (e.g. 1990-05-25).' }];
        } else {
          this.excelBulkErrors = [{ row: 0, field: 'server', message: msg }];
        }
        this.cdr.markForCheck();
      },
    });
  }

  downloadPlayerDetails() {
    const headers = [
      'Player Number', 'First Name', 'Last Name', 'Date of Birth', 'Age',
      'Role', 'Status', 'Batting Style', 'Bowling Style', 'T-Shirt Size',
      'Trouser Size', 'Jersey Number', 'Sleeve Type', 'Location',
      'Mobile Number', 'Last Season Played', 'Last Season Team'
    ];

    const escape = (val: any): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    const rows = this.players.map(p => [
      escape(p.playerNumber),
      escape(p.firstName),
      escape(p.lastName),
      escape(p.dob),
      escape(this.calculateAge(p.dob)),
      escape(p.role),
      escape(p.status),
      escape(p.handedness),
      escape((p as any).bowlingStyle),
      escape(p.tshirtSize),
      escape(p.trouserSize),
      escape(p.jerseyNumber),
      escape(p.sleeveType),
      escape(p.playerLocation),
      escape(p.mobileNumber),
      escape(p.lastSeasonPlayed),
      escape(p.lastSeasonTeam),
    ].join(','));

    const csvContent = [headers.map(escape).join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const tournamentName = this.tournament?.name?.replace(/\s+/g, '_') || 'tournament';
    link.href = url;
    link.download = `players_${tournamentName}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
