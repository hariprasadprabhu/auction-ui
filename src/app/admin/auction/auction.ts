import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MOCK_TOURNAMENTS, MOCK_TEAMS, MOCK_AUCTION_PLAYERS } from '../../mock-tournaments';
import { Tournament, Team, AuctionPlayer } from '../../models';

@Component({
  selector: 'app-auction',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auction.html',
  styleUrls: ['./auction.scss'],
})
export class Auction implements OnInit {
  tournament: Tournament | null = null;
  teams: Team[] = [];
  players: AuctionPlayer[] = [];

  currentIndex = 0;
  currentBid = 0;
  currentBiddingTeam: Team | null = null;
  bidIncrement = 5;

  showSoldOverlay = false;
  showUnsoldOverlay = false;
  overlayInteractive = false;
  showConfigModal = false;
  auctionComplete = false;

  confirmDialog: { message: string; action: () => void } | null = null;

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    const tournamentId = this.route.snapshot.paramMap.get('tournamentId');
    if (tournamentId) {
      this.tournament = MOCK_TOURNAMENTS.find(t => t.id === tournamentId) ?? null;
      this.teams = MOCK_TEAMS.filter(t => t.tournamentId === tournamentId);
      this.players = MOCK_AUCTION_PLAYERS.map(p => ({ ...p }));
    }
    this.initBid();
  }

  get currentPlayer(): AuctionPlayer | null {
    return this.players[this.currentIndex] ?? null;
  }

  initBid() {
    this.currentBid = this.currentPlayer?.basePrice ?? 0;
    this.currentBiddingTeam = null;
  }

  placeBidForTeam(team: Team) {
    if (!this.currentPlayer || (!this.overlayInteractive && (this.showSoldOverlay || this.showUnsoldOverlay))) return;
    if (!this.currentBiddingTeam) {
      this.currentBid = this.currentPlayer.basePrice;
    } else if (this.currentBiddingTeam.id !== team.id) {
      this.currentBid += this.bidIncrement;
    }
    this.currentBiddingTeam = team;
  }

  raiseBid(amount: number) {
    if (!this.currentBiddingTeam || (!this.overlayInteractive && (this.showSoldOverlay || this.showUnsoldOverlay))) return;
    this.currentBid += amount;
  }

  markSold() {
    if (!this.currentBiddingTeam || !this.currentPlayer || this.showSoldOverlay || this.showUnsoldOverlay) return;
    this.currentPlayer.auctionStatus = 'sold';
    this.currentPlayer.soldToTeamId = this.currentBiddingTeam.id;
    this.currentPlayer.soldPrice = this.currentBid;
    this.showSoldOverlay = true;
    this.overlayInteractive = false;
  }

  markUnsold() {
    if (!this.currentPlayer || this.showSoldOverlay || this.showUnsoldOverlay) return;
    this.currentPlayer.auctionStatus = 'unsold';
    this.showUnsoldOverlay = true;
    this.overlayInteractive = false;
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
    const nextIndex = this.players.findIndex((p, i) => i > this.currentIndex && p.auctionStatus === 'upcoming');
    if (nextIndex !== -1) {
      this.currentIndex = nextIndex;
      this.initBid();
    } else {
      this.auctionComplete = true;
    }
  }

  getAbbr(teamName: string): string {
    return teamName.split(' ').map(w => w[0]).join('').toUpperCase();
  }

  getSoldCount(): number {
    return this.players.filter(p => p.auctionStatus !== 'upcoming').length;
  }

  getProgressPercent(): number {
    return this.players.length ? (this.getSoldCount() / this.players.length) * 100 : 0;
  }

  getSoldTeamName(teamId: string | undefined): string {
    if (!teamId) return '';
    return this.teams.find(t => t.id === teamId)?.name ?? 'Unknown Team';
  }

  goBack() {
    this.confirmDialog = {
      message: 'Are you sure you want to exit the auction?',
      action: () => this.router.navigate(['/admin'])
    };
  }

  reQueueUnsoldPlayers() {
    this.confirmDialog = {
      message: 'Mark all UNSOLD players as available for auction again?',
      action: () => {
        this.players.forEach(p => {
          if (p.auctionStatus === 'unsold') {
            p.auctionStatus = 'upcoming';
            p.soldToTeamId = undefined;
            p.soldPrice = undefined;
          }
        });
        this.showConfigModal = false;
        if (this.auctionComplete) {
          this.auctionComplete = false;
          const first = this.players.findIndex(p => p.auctionStatus === 'upcoming');
          if (first !== -1) { this.currentIndex = first; this.initBid(); }
        }
      }
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
