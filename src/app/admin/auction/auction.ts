import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuctionPlayerService } from '../../core/services/auction-player.service';
import { TeamService } from '../../core/services/team.service';
import { TournamentService } from '../../core/services/tournament.service';
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

  private tournamentId!: number;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auctionPlayerService: AuctionPlayerService,
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
      this.auctionPlayerService.getByTournament(id).subscribe({
        next: (data) => {
          this.players = data;
          this.currentIndex = 0;
          this.initBid();
          this.cdr.markForCheck();
        },
      });
    }
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
    const player = this.currentPlayer;
    this.auctionPlayerService
      .sell(player.id, { teamId: this.currentBiddingTeam.id, soldPrice: this.currentBid })
      .subscribe({
        next: (updated) => {
          player.auctionStatus = updated.auctionStatus;
          player.soldToTeamId = updated.soldToTeamId;
          player.soldToTeamName = updated.soldToTeamName;
          player.soldPrice = updated.soldPrice;
          this.showSoldOverlay = true;
          this.overlayInteractive = false;
          this.cdr.markForCheck();
        },
        error: () => alert('Failed to sell player.'),
      });
  }

  markUnsold() {
    if (!this.currentPlayer || this.showSoldOverlay || this.showUnsoldOverlay) return;
    const player = this.currentPlayer;
    this.auctionPlayerService.markUnsold(player.id).subscribe({
      next: () => {
        player.auctionStatus = 'UNSOLD';
        this.showUnsoldOverlay = true;
        this.overlayInteractive = false;        this.cdr.markForCheck();      },
      error: () => alert('Failed to mark player as unsold.'),
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
    const nextIndex = this.players.findIndex((p, i) => i > this.currentIndex && p.auctionStatus === 'AVAILABLE');
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
            this.players.forEach(p => {
              if (p.auctionStatus === 'UNSOLD') {
                p.auctionStatus = 'AVAILABLE';
                p.soldToTeamId = undefined;
                p.soldPrice = undefined;
              }
            });
            this.showConfigModal = false;
            if (this.auctionComplete) {
              this.auctionComplete = false;
              const first = this.players.findIndex(p => p.auctionStatus === 'AVAILABLE');
              if (first !== -1) { this.currentIndex = first; this.initBid(); }
            }
            this.cdr.markForCheck();
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

