import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MOCK_TOURNAMENTS, MOCK_TEAMS, MOCK_AUCTION_PLAYERS } from '../../mock-tournaments';
import { Tournament, Team, AuctionPlayer } from '../../models';

interface TeamStats {
  team: Team;
  playersBought: number;
  purseUsed: number;
  purseRemaining: number;
  maxBid: number;
  minPurseToKeep: number;
  soldPlayers: AuctionPlayer[];
}

@Component({
  selector: 'app-owner-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './owner-view.html',
  styleUrls: ['./owner-view.scss'],
})
export class OwnerView implements OnInit {
  tournament: Tournament | undefined;
  teams: Team[] = [];
  auctionPlayers: AuctionPlayer[] = [];
  teamStats: TeamStats[] = [];

  mainTab: 'players' | 'owners' = 'players';
  playerFilter: 'all' | 'sold' | 'unsold' | 'available' = 'all';

  selectedTeam: TeamStats | null = null;
  showTeamDetail = false;

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    const tournamentId = this.route.snapshot.paramMap.get('tournamentId');
    if (tournamentId) {
      this.tournament = MOCK_TOURNAMENTS.find(t => t.id === tournamentId);
      this.teams = MOCK_TEAMS.filter(t => t.tournamentId === tournamentId);
      this.auctionPlayers = MOCK_AUCTION_PLAYERS;
      this.computeTeamStats();
    }
  }

  private computeTeamStats() {
    if (!this.tournament) return;
    this.teamStats = this.teams.map(team => {
      const soldPlayers = this.auctionPlayers.filter(
        p => p.auctionStatus === 'sold' && p.soldToTeamId === team.id
      );
      const purseUsed = soldPlayers.reduce((sum, p) => sum + (p.soldPrice ?? p.basePrice), 0);
      const purseRemaining = this.tournament!.purseAmount - purseUsed;
      const playersBought = soldPlayers.length;
      const remainingSlots = this.tournament!.playersPerTeam - playersBought;
      const minPurseToKeep = remainingSlots > 0 ? remainingSlots * this.tournament!.basePrice : 0;
      const maxBid =
        remainingSlots > 1
          ? purseRemaining - (remainingSlots - 1) * this.tournament!.basePrice
          : purseRemaining;
      return {
        team,
        playersBought,
        purseUsed,
        purseRemaining,
        maxBid: Math.max(0, maxBid),
        minPurseToKeep,
        soldPlayers,
      };
    });
  }

  get filteredPlayers(): AuctionPlayer[] {
    switch (this.playerFilter) {
      case 'sold':      return this.auctionPlayers.filter(p => p.auctionStatus === 'sold');
      case 'unsold':    return this.auctionPlayers.filter(p => p.auctionStatus === 'unsold');
      case 'available': return this.auctionPlayers.filter(p => p.auctionStatus === 'upcoming');
      default:          return this.auctionPlayers;
    }
  }

  get soldCount()      { return this.auctionPlayers.filter(p => p.auctionStatus === 'sold').length; }
  get unsoldCount()    { return this.auctionPlayers.filter(p => p.auctionStatus === 'unsold').length; }
  get availableCount() { return this.auctionPlayers.filter(p => p.auctionStatus === 'upcoming').length; }

  openTeamDetail(stats: TeamStats) {
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

  getPursePercent(stats: TeamStats): number {
    if (!this.tournament) return 0;
    return Math.round((stats.purseRemaining / this.tournament.purseAmount) * 100);
  }

  getPurseClass(stats: TeamStats): string {
    const pct = this.getPursePercent(stats);
    if (pct > 60) return 'purse-high';
    if (pct > 30) return 'purse-medium';
    return 'purse-low';
  }

  playerStatusLabel(status: string): string {
    if (status === 'upcoming') return 'Available';
    return status.charAt(0).toUpperCase() + status.slice(1);
  }
}
