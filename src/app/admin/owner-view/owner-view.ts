import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { OwnerViewService } from '../../core/services/owner-view.service';
import { AuctionPlayerService } from '../../core/services/auction-player.service';
import { AuctionPlayer, OwnerViewResponse, OwnerViewTeamStats } from '../../models';

@Component({
  selector: 'app-owner-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './owner-view.html',
  styleUrls: ['./owner-view.scss'],
})
export class OwnerView implements OnInit {
  data: OwnerViewResponse | null = null;
  auctionPlayers: AuctionPlayer[] = [];

  mainTab: 'players' | 'owners' = 'players';
  playerFilter: 'all' | 'sold' | 'unsold' | 'available' = 'all';

  selectedTeam: OwnerViewTeamStats | null = null;
  showTeamDetail = false;

  // Expose tournament from data
  get tournament() { return this.data?.tournament; }
  get teamStats()   { return this.data?.teamStats ?? []; }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ownerViewService: OwnerViewService,
    private auctionPlayerService: AuctionPlayerService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('tournamentId'));
    if (id) {
      this.ownerViewService.get(id).subscribe({
        next: (d) => {
          this.data = d;
          this.cdr.markForCheck();
        },
        error: () => alert('Failed to load owner view.'),
      });
      this.auctionPlayerService.getByTournament(id).subscribe({
        next: (players) => {
          this.auctionPlayers = players;
          this.cdr.markForCheck();
        },
      });
    }
  }

  get filteredPlayers(): AuctionPlayer[] {
    switch (this.playerFilter) {
      case 'sold':      return this.auctionPlayers.filter(p => p.auctionStatus === 'SOLD');
      case 'unsold':    return this.auctionPlayers.filter(p => p.auctionStatus === 'UNSOLD');
      case 'available': return this.auctionPlayers.filter(p => p.auctionStatus === 'AVAILABLE');
      default:          return this.auctionPlayers;
    }
  }

  get soldCount()      { return this.data?.playerStats.sold ?? 0; }
  get unsoldCount()    { return this.data?.playerStats.unsold ?? 0; }
  get availableCount() { return this.data?.playerStats.available ?? 0; }

  openTeamDetail(stats: OwnerViewTeamStats) {
    this.selectedTeam = stats;
    this.showTeamDetail = true;
  }

  closeTeamDetail() {
    this.showTeamDetail = false;
    this.selectedTeam = null;
  }

  goBack() {
    this.router.navigate(['/admin']);
  }

  formatAmount(amount: number): string {
    return '₹' + amount.toLocaleString('en-IN');
  }

  getPursePercent(stats: OwnerViewTeamStats): number {
    if (!this.tournament) return 0;
    return Math.round((stats.purseRemaining / this.tournament.purseAmount) * 100);
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
}
