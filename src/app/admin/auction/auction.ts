import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { AuctionPlayerService } from '../../core/services/auction-player.service';
import { AuctionEventService } from '../../core/services/auction-event.service';
import { IncrementRuleService } from '../../core/services/increment-rule.service';
import { TeamService } from '../../core/services/team.service';
import { TournamentService } from '../../core/services/tournament.service';
import { NormalizePhotoUrlPipe } from '../../core/pipes/normalize-photo-url.pipe';
import {
  Tournament,
  Team,
  AuctionPlayer,
  IncrementRule,
  TeamPurse,
} from '../../models';

@Component({
  selector: 'app-auction',
  standalone: true,
  imports: [CommonModule, NormalizePhotoUrlPipe],
  templateUrl: './auction.html',
  styleUrls: ['./auction.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Auction implements OnInit {
  tournament: Tournament | null = null;
  teams: Team[] = [];
  players: AuctionPlayer[] = [];
  teamPurses: TeamPurse[] = [];

  incrementRules: IncrementRule[] = [];

  currentIndex = 0;
  currentBid = 0;
  currentBiddingTeam: Team | null = null;

  showSoldOverlay = false;
  showUnsoldOverlay = false;
  overlayInteractive = false;
  showConfigModal = false;
  auctionComplete = false;
  noUnsoldAvailable = false;
  isValidatingBid = false;

  validationError: string | null = null;
  budgetNotification: string | null = null;

  confirmDialog: { message: string; action: () => void } | null = null;

  private tournamentId!: number;
  private readonly teamPurseByTeamId = new Map<number, TeamPurse>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auctionPlayerService: AuctionPlayerService,
    private auctionEventService: AuctionEventService,
    private incrementRuleService: IncrementRuleService,
    private teamService: TeamService,
    private tournamentService: TournamentService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('tournamentId'));
    if (id) {
      this.tournamentId = id;
      this.tournamentService.getById(id).subscribe((t) => {
        this.tournament = t;
        this.cdr.markForCheck();
      });
      this.teamService.getByTournament(id).subscribe((t) => {
        this.teams = t;
        this.cdr.markForCheck();
      });
      this.loadTeamPurses();
      this.incrementRuleService.getByTournament(id).subscribe({
        next: (rules) => {
          this.incrementRules = rules.sort((a, b) => a.fromAmount - b.fromAmount);
          this.cdr.markForCheck();
        },
      });
      this.auctionPlayerService.getByTournament(id).subscribe({
        next: (data) => {
          this.players = data;
          const firstAvailable = data.findIndex(p => p.auctionStatus === 'AVAILABLE');
          if (firstAvailable !== -1) {
            this.currentIndex = firstAvailable;
            this.initBid();
          } else if (data.length > 0) {
            this.auctionComplete = true;
          }
          this.cdr.markForCheck();
        },
      });
    }
  }

  get currentPlayer(): AuctionPlayer | null {
    return this.players[this.currentIndex] ?? null;
  }

  get nextIncrement(): number {
    return this.getIncrementForAmount(this.currentBid);
  }

  private getIncrementForAmount(amount: number): number {
    const basePrice = this.currentPlayer?.basePrice ?? 0;
    const initialIncrement = this.tournament?.initialIncrementAmount ?? 5;

    // At base price (no raise yet), always use the initial increment
    if (amount <= basePrice) {
      return initialIncrement;
    }

    if (this.incrementRules.length === 0) {
      return initialIncrement;
    }
    // Find the best-matching rule: highest fromAmount that is <= amount
    const matching = this.incrementRules.filter(
      r => amount >= r.fromAmount && (!r.toAmount || r.toAmount > Number.MAX_SAFE_INTEGER || amount < r.toAmount)
    );
    if (matching.length > 0) {
      // Pick the most specific rule (highest fromAmount)
      return matching[matching.length - 1].incrementBy;
    }
    // No rule covers this amount — fall back to initial increment
    return initialIncrement;
  }

  initBid() {
    this.currentBid = this.currentPlayer?.basePrice ?? 0;
    this.currentBiddingTeam = null;
    this.validationError = null;
  }

  placeBidForTeam(team: Team) {
    if (!this.currentPlayer || (!this.overlayInteractive && (this.showSoldOverlay || this.showUnsoldOverlay))) return;
    if (this.currentBiddingTeam?.id === team.id) {
      return;
    }

    const proposedBid = !this.currentBiddingTeam
      ? this.currentPlayer.basePrice
      : this.currentBid + this.getIncrementForAmount(this.currentBid);

    this.validateAndApplyBid(team, proposedBid);
  }

  raiseBid(amount: number) {
    if (!this.currentBiddingTeam || (!this.overlayInteractive && (this.showSoldOverlay || this.showUnsoldOverlay))) return;
    const proposedBid = this.currentBid + amount;
    this.validateAndApplyBid(this.currentBiddingTeam, proposedBid);
  }

  markSold() {
    if (!this.currentBiddingTeam || !this.currentPlayer || this.showSoldOverlay || this.showUnsoldOverlay) return;
    const player = this.currentPlayer;
    this.auctionPlayerService
      .sell(player.id, { teamId: this.currentBiddingTeam.id, soldPrice: this.currentBid })
      .subscribe({
        next: (updated) => {
          player.auctionStatus = updated.auctionStatus;
          player.soldToTeamId = updated.soldToTeamId;
          player.soldToTeamName = updated.soldToTeamName;
          player.soldPrice = updated.soldPrice;
          this.refreshTeamPurse(this.currentBiddingTeam!.id, 'sold');
          this.showSoldOverlay = true;
          this.overlayInteractive = false;
          this.auctionEventService.notifyAuctionUpdate(this.tournamentId);
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.validationError = this.getHttpErrorMessage(err, 'Failed to sell player.');
          this.cdr.markForCheck();
        },
      });
  }

  markUnsold() {
    if (!this.currentPlayer || this.showSoldOverlay || this.showUnsoldOverlay) return;
    const player = this.currentPlayer;
    this.auctionPlayerService.markUnsold(player.id).subscribe({
      next: () => {
        player.auctionStatus = 'UNSOLD';
        if (this.currentBiddingTeam?.id) {
          this.refreshTeamPurse(this.currentBiddingTeam.id, 'unsold');
        }
        this.showUnsoldOverlay = true;
        this.overlayInteractive = false;
        this.auctionEventService.notifyAuctionUpdate(this.tournamentId);
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.validationError = this.getHttpErrorMessage(err, 'Failed to mark player as unsold.');
        this.cdr.markForCheck();
      },
    });
  }

  onOverlayAnimationDone() {
    this.overlayInteractive = true;
  }

  nextPlayer() {
    this.showSoldOverlay = false;
    this.showUnsoldOverlay = false;
    this.overlayInteractive = false;
    this.advanceToNextPlayer();
  }

  advanceToNextPlayer() {
    // First look forward from current position
    let nextIndex = this.players.findIndex((p, i) => i > this.currentIndex && p.auctionStatus === 'AVAILABLE');
    // If none found ahead, wrap around to find any available player from the start
    if (nextIndex === -1) {
      nextIndex = this.players.findIndex(p => p.auctionStatus === 'AVAILABLE');
    }
    if (nextIndex !== -1) {
      this.currentIndex = nextIndex;
      this.initBid();
    } else {
      this.auctionComplete = true;
    }
  }

  /**
   * Returns true when a team cannot afford to place the next bid.
   * Uses the server-computed purse fields and reserves.
   */
  isTeamOutOfBudget(team: Team): boolean {
    if (!this.currentPlayer) return false;

    const purse = this.teamPurseByTeamId.get(team.id);
    if (!purse) return false;

    if (this.currentBiddingTeam?.id === team.id) {
      return false;
    }

    // Calculate the minimum bid required to place a new outbidding action
    // This is the current bid amount (not including the increment they'll need to raise)
    const minBidRequired = !this.currentBiddingTeam
      ? this.currentPlayer.basePrice
      : this.currentBid;

    // Calculate max allowed bid considering remaining purse and reserved fund
    const maxBidAllowed = purse.currentPurse - purse.reservedFund;
    const maxAllowedBid = Math.min(purse.maxBidPerPlayer, purse.availableForBidding, maxBidAllowed);

    // Team is out of budget only if they can't afford even the minimum required bid amount
    return minBidRequired > maxAllowedBid;
  }

  /**
   * Returns true if team can place the next bid considering increment rules and their max bid limit.
   */
  canTeamPlaceNextBid(team: Team): boolean {
    if (!this.currentPlayer) return false;

    const purse = this.teamPurseByTeamId.get(team.id);
    if (!purse) return false;

    // If this team is currently bidding, they can raise (unless they hit their max)
    if (this.currentBiddingTeam?.id === team.id) {
      const nextBid = this.currentBid + this.nextIncrement;
      // Check all budget constraints for raising
      if (nextBid > purse.maxBidPerPlayer) return false;
      if (nextBid > purse.availableForBidding) return false;
      const spendableAmount = purse.currentPurse - purse.reservedFund;
      if (nextBid > spendableAmount) return false;
      return true;
    }

    // For other teams, calculate what their next bid would be if they outbid current bidder
    const nextBid = !this.currentBiddingTeam
      ? this.currentPlayer.basePrice
      : this.currentBid + this.nextIncrement;

    // Check all budget constraints for placing a new bid
    if (nextBid > purse.maxBidPerPlayer) return false;
    if (nextBid > purse.availableForBidding) return false;
    const spendableAmount = purse.currentPurse - purse.reservedFund;
    if (nextBid > spendableAmount) return false;
    return true;
  }

  getPurseForTeam(teamId: number): TeamPurse | undefined {
    return this.teamPurseByTeamId.get(teamId);
  }

  getSquadTarget(): number {
    return this.tournament?.playersPerTeam ?? 11;
  }

  private loadTeamPurses(): void {
    this.teamService.getTeamPurses(this.tournamentId).subscribe({
      next: (purses) => {
        this.teamPurses = purses;
        this.teamPurseByTeamId.clear();
        purses.forEach((purse) => this.teamPurseByTeamId.set(purse.teamId, purse));
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.validationError = this.getHttpErrorMessage(
          err,
          'Failed to load team budgets for this auction.',
        );
        this.cdr.markForCheck();
      },
    });
  }

  private validateAndApplyBid(team: Team, bidAmount: number): void {
    this.isValidatingBid = true;
    this.validationError = null;

    // Use cached purse data for fast local validation (no API call)
    const purse = this.teamPurseByTeamId.get(team.id);
    if (!purse) {
      this.validationError = `Purse data not available for ${team.name}. Please refresh and try again.`;
      this.isValidatingBid = false;
      this.cdr.markForCheck();
      return;
    }

    const error = this.getBidValidationError(bidAmount, purse);
    if (error) {
      this.validationError = error;
      this.isValidatingBid = false;
      this.cdr.markForCheck();
      return;
    }

    this.currentBid = bidAmount;
    this.currentBiddingTeam = team;
    this.isValidatingBid = false;
    this.cdr.markForCheck();
  }

  private getBidValidationError(bidAmount: number, purse: TeamPurse): string | null {
    // Check 1: Bid must not exceed maxBidPerPlayer
    if (bidAmount > purse.maxBidPerPlayer) {
      return `Bid rejected: ₹${bidAmount}L exceeds max bid per player ₹${purse.maxBidPerPlayer}L.`;
    }

    // Check 2: Bid must not exceed availableForBidding (remaining team budget for players)
    if (bidAmount > purse.availableForBidding) {
      return `Bid rejected: ₹${bidAmount}L exceeds team's available bidding amount ₹${purse.availableForBidding}L.`;
    }

    // Check 3: Bid must not exceed currentPurse minus reservedFund
    const spendableAmount = purse.currentPurse - purse.reservedFund;
    if (bidAmount > spendableAmount) {
      return `Bid rejected: ₹${bidAmount}L exceeds spendable purse ₹${spendableAmount}L (remaining: ₹${purse.currentPurse}L, reserved: ₹${purse.reservedFund}L).`;
    }

    return null;
  }

  private refreshTeamPurse(teamId: number, action: 'sold' | 'unsold'): void {
    const previous = this.teamPurseByTeamId.get(teamId);
    this.teamService.getTeamPurse(this.tournamentId, teamId).subscribe({
      next: (purse) => {
        this.teamPurseByTeamId.set(teamId, purse);
        this.teamPurses = this.teamPurses.some((p) => p.teamId === purse.teamId)
          ? this.teamPurses.map((p) => (p.teamId === purse.teamId ? purse : p))
          : [...this.teamPurses, purse];

        const from = previous?.availableForBidding;
        const to = purse.availableForBidding;
        if (from !== undefined && from !== to) {
          const direction = to > from ? 'increased' : 'decreased';
          this.budgetNotification = `${purse.teamName} budget ${direction}: ₹${from}L → ₹${to}L after ${action}.`;
        } else {
          this.budgetNotification = `${purse.teamName} purse refreshed after ${action}.`;
        }

        setTimeout(() => {
          this.budgetNotification = null;
          this.cdr.markForCheck();
        }, 4000);
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.validationError = this.getHttpErrorMessage(
          err,
          'Failed to refresh team purse after auction update.',
        );
        this.cdr.markForCheck();
      },
    });
  }

  private getHttpErrorMessage(error: HttpErrorResponse, fallback: string): string {
    if (error.status === 401) {
      return 'Unauthorized. Please sign in again to access purse data.';
    }
    if (error.status === 404) {
      return 'Purse data not found for this team or tournament.';
    }
    if (error.status >= 500) {
      return 'Server error while fetching purse data. Please retry.';
    }
    return fallback;
  }

  getAbbr(teamName: string): string {
    return teamName.split(' ').map(w => w[0]).join('').toUpperCase();
  }

  getPlayerAge(): string | number {
    return this.currentPlayer?.age ?? 'N/A';
  }

  getPlayerCategory(): string {
    return this.currentPlayer?.role ?? 'N/A';
  }

  getPlayerLocation(): string {
    return 'India';
  }

  getSoldCount(): number {
    return this.players.filter(p => p.auctionStatus !== 'AVAILABLE').length;
  }

  getProgressPercent(): number {
    return this.players.length ? (this.getSoldCount() / this.players.length) * 100 : 0;
  }

  getSoldTeamName(teamId: number | undefined): string {
    if (!teamId) return '';
    return this.teams.find(t => t.id === teamId)?.name ?? 'Unknown Team';
  }

  goBack() {
    this.confirmDialog = {
      message: 'Are you sure you want to exit the auction?',
      action: () => this.router.navigate(['/admin']),
    };
  }

  reQueueUnsoldPlayers() {
    this.confirmDialog = {
      message: 'Mark all UNSOLD players as available for auction again?',
      action: () => {
        this.auctionPlayerService.requeueUnsold(this.tournamentId).subscribe({
          next: () => {
            // Fetch fresh player data from DB to sync status updates
            this.auctionPlayerService.getByTournament(this.tournamentId).subscribe({
              next: (allPlayers) => {
                // Update the players array with fresh data (preserving all players)
                this.players = allPlayers;
                
                this.showConfigModal = false;
                this.noUnsoldAvailable = false;
                this.auctionComplete = false;
                
                // Find the first AVAILABLE player to auction immediately
                const firstAvailableIndex = this.players.findIndex(p => p.auctionStatus === 'AVAILABLE');
                
                if (firstAvailableIndex === -1) {
                  // No available players left
                  this.noUnsoldAvailable = true;
                } else {
                  // Show the first available player immediately
                  this.currentIndex = firstAvailableIndex;
                  this.initBid();
                  this.showUnsoldOverlay = false;
                  this.overlayInteractive = false;
                }
                
                this.cdr.markForCheck();
              },
              error: () => alert('Failed to reload player data after requeuing.'),
            });
          },
          error: () => alert('Failed to requeue unsold players.'),
        });
      },
    };
  }

  confirmAction() {
    this.confirmDialog?.action();
    this.confirmDialog = null;
  }

  cancelConfirm() {
    this.confirmDialog = null;
  }
}

