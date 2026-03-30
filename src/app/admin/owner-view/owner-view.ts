import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { OwnerViewService } from '../../core/services/owner-view.service';
import { AuctionPlayerService } from '../../core/services/auction-player.service';
import { AuctionEventService } from '../../core/services/auction-event.service';
import { TeamService } from '../../core/services/team.service';
import { NormalizePhotoUrlPipe } from '../../core/pipes/normalize-photo-url.pipe';
import {
  AuctionPlayer,
  OwnerViewResponse,
  OwnerViewTeamStats,
  TeamPurse,
} from '../../models';

@Component({
  selector: 'app-owner-view',
  standalone: true,
  imports: [CommonModule, NormalizePhotoUrlPipe],
  templateUrl: './owner-view.html',
  styleUrls: ['./owner-view.scss'],
})
export class OwnerView implements OnInit, OnDestroy {
  data: OwnerViewResponse | null = null;
  auctionPlayers: AuctionPlayer[] = [];
  isLoading = true;
  minLoadingTime = 800;
  loadingStartTime = 0;
  pendingRequests = 0;

  mainTab: 'players' | 'owners' = 'players';
  playerFilter: 'all' | 'sold' | 'unsold' | 'available' = 'all';

  selectedTeam: OwnerViewTeamStats | null = null;
  showTeamDetail = false;
  selectedTeamPortfolio: TeamPurse[] = [];
  portfolioError: string | null = null;

  private tournamentId = 0;
  private eventSub: Subscription | null = null;
  private refreshInterval: any = null;
  private teamPurseByTeamId = new Map<number, TeamPurse>();

  // Expose tournament from data
  get tournament() { return this.data?.tournament; }
  get teamStats()   { return this.data?.teamStats ?? []; }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ownerViewService: OwnerViewService,
    private auctionPlayerService: AuctionPlayerService,
    private auctionEventService: AuctionEventService,
    private teamService: TeamService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.loadingStartTime = Date.now();
    this.pendingRequests = 1; // initial data load

    const id = Number(this.route.snapshot.paramMap.get('tournamentId'));
    if (id) {
      this.tournamentId = id;
      this.loadData(id);

      this.eventSub = this.auctionEventService.auctionUpdated$
        .pipe(filter(tid => tid === id))
        .subscribe(() => this.loadData(id));

      // Refresh player statuses and purse values every 2 seconds (smooth updates without flickering)
      this.refreshInterval = setInterval(() => {
        this.loadTeamPurses(id);
        this.refreshPlayerStatuses(id);
      }, 2000);
    }
  }

  ngOnDestroy() {
    this.eventSub?.unsubscribe();
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  private loadData(id: number) {
    let dataLoadedCount = 0;
    
    this.ownerViewService.get(id).subscribe({
      next: (d) => {
        this.data = d;
        // Immediately fetch and update team purses
        this.loadTeamPurses(id);
        dataLoadedCount++;
        if (dataLoadedCount === 2 && this.pendingRequests > 0) {
          this.completeRequest();
        }
        this.cdr.markForCheck();
      },
      error: () => {
        alert('Failed to load owner view.');
        dataLoadedCount++;
        if (dataLoadedCount === 2 && this.pendingRequests > 0) {
          this.completeRequest();
        }
      },
    });
    this.auctionPlayerService.getByTournament(id).subscribe({
      next: (players) => {
        this.auctionPlayers = players;
        dataLoadedCount++;
        if (dataLoadedCount === 2 && this.pendingRequests > 0) {
          this.completeRequest();
        }
        this.cdr.markForCheck();
      },
      error: () => {
        dataLoadedCount++;
        if (dataLoadedCount === 2 && this.pendingRequests > 0) {
          this.completeRequest();
        }
      }
    });
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

  private loadTeamPurses(tournamentId: number) {
    this.teamService.getTeamPurses(tournamentId).subscribe({
      next: (purses) => {
        // Create a map of purses by teamId for quick lookup
        const purseMap = new Map<number, TeamPurse>();
        purses.forEach((purse) => {
          purseMap.set(purse.teamId, purse);
          this.teamPurseByTeamId.set(purse.teamId, purse);
        });

        // Update each teamStat with the current purse values from API
        if (this.data?.teamStats) {
          this.data.teamStats.forEach((stat) => {
            const purse = purseMap.get(stat.team.id);
            if (purse) {
              // Map API values directly - no calculations
              stat.purseRemaining = purse.currentPurse;
              stat.purseSpent = purse.purseUsed;
              stat.playersCount = purse.playersBought;
              stat.maxBidPerPlayer = purse.maxBidPerPlayer;
              stat.availableForBidding = purse.availableForBidding;
              stat.reservedFund = purse.reservedFund;
            }

            // Always ensure playerDetails is populated from auctionPlayers
            const teamPlayers = this.auctionPlayers
              .filter(p => p.soldToTeamId === stat.team.id && p.auctionStatus === 'SOLD')
              .map(p => ({
                auctionPlayerId: p.id,
                playerNumber: p.playerNumber,
                firstName: p.firstName,
                lastName: p.lastName,
                role: p.role,
                soldPrice: p.soldPrice || 0,
              }));
            stat.playerDetails = teamPlayers;
          });
        }

        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        console.error('Failed to load team purses:', err);
        this.cdr.markForCheck();
      },
    });
  }

  private refreshPlayerStatuses(tournamentId: number) {
    this.auctionPlayerService.getByTournament(tournamentId).subscribe({
      next: (players) => {
        this.auctionPlayers = players;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        console.error('Failed to refresh player statuses:', err);
      },
    });
  }

  get filteredPlayers(): AuctionPlayer[] {
    switch (this.playerFilter) {
      case 'sold':      return this.auctionPlayers.filter(p => p.auctionStatus === 'SOLD');
      case 'unsold':    return this.auctionPlayers.filter(p => p.auctionStatus === 'UNSOLD');
      case 'available': return this.auctionPlayers.filter(p => p.auctionStatus === 'AVAILABLE');
      default:          return this.auctionPlayers;
    }
  }

  get soldCount()      { return this.auctionPlayers.filter(p => p.auctionStatus === 'SOLD').length; }
  get unsoldCount()    { return this.auctionPlayers.filter(p => p.auctionStatus === 'UNSOLD').length; }
  get availableCount() { return this.auctionPlayers.filter(p => p.auctionStatus === 'AVAILABLE').length; }

  openTeamDetail(stats: OwnerViewTeamStats) {
    this.selectedTeam = stats;
    this.showTeamDetail = true;
    this.portfolioError = null;

    // Populate playerDetails from auctionPlayers that were sold to this team
    const teamPlayers = this.auctionPlayers
      .filter(p => p.soldToTeamId === stats.team.id && p.auctionStatus === 'SOLD')
      .map(p => ({
        auctionPlayerId: p.id,
        playerNumber: p.playerNumber,
        firstName: p.firstName,
        lastName: p.lastName,
        role: p.role,
        soldPrice: p.soldPrice || 0,
      }));
    
    if (this.selectedTeam) {
      this.selectedTeam.playerDetails = teamPlayers;
    }

    this.teamService.getTeamPursesAcrossTournaments(stats.team.id).subscribe({
      next: (purses) => {
        this.selectedTeamPortfolio = purses;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.selectedTeamPortfolio = [];
        this.portfolioError = this.getPortfolioErrorMessage(err);
        this.cdr.markForCheck();
      },
    });
  }

  closeTeamDetail() {
    this.showTeamDetail = false;
    this.selectedTeam = null;
    this.selectedTeamPortfolio = [];
    this.portfolioError = null;
  }

  getTeamLogoUrl(teamId: number): string {
    const purse = this.teamPurseByTeamId.get(teamId);
    return purse?.logoUrl || '';
  }

  getPlayerPhoto(auctionPlayerId: number): string | undefined {
    return this.auctionPlayers.find(p => p.id === auctionPlayerId)?.photoUrl;
  }

  getRemainingSlots(stats: OwnerViewTeamStats): number {
    return Math.max(0, (this.tournament?.playersPerTeam ?? 0) - stats.playersCount);
  }

  formatAmount(amount: number | null | undefined): string {
    if (amount == null || isNaN(amount)) return '₹0';
    return '₹' + amount.toLocaleString('en-IN');
  }

  getPursePercent(stats: OwnerViewTeamStats): number {
    const purseAmount = this.tournament?.purseAmount;
    if (!purseAmount) return 0;
    const pct = Math.round((stats.purseRemaining / purseAmount) * 100);
    return isNaN(pct) ? 0 : Math.max(0, Math.min(100, pct));
  }

  getPurseClass(stats: OwnerViewTeamStats): string {
    const pct = this.getPursePercent(stats);
    if (pct > 60) return 'purse-high';
    if (pct > 30) return 'purse-medium';
    return 'purse-low';
  }

  playerStatusLabel(status: string): string {
    if (status === 'AVAILABLE') return 'Available';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }

  private getPortfolioErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 401) {
      return 'Unauthorized. Please sign in again to view portfolio purse data.';
    }
    if (error.status === 404) {
      return 'No cross-tournament purse data found for this team.';
    }
    if (error.status >= 500) {
      return 'Server error while loading team portfolio.';
    }
    return 'Failed to load team portfolio.';
  }
}
