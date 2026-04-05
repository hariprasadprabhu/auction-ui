import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuctionPlayerService } from '../../core/services/auction-player.service';
import { TeamService } from '../../core/services/team.service';
import { TournamentService } from '../../core/services/tournament.service';
import { NormalizePhotoUrlCachedPipe } from '../../core/pipes/normalize-photo-url-cached.pipe';
import { AuctionPlayer, Team, Tournament } from '../../models';

export interface ResultRow {
  player: AuctionPlayer;
  soldPrice: number;
  teamName: string;
  status: 'SOLD' | 'UNSOLD';
}

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule, NormalizePhotoUrlCachedPipe],
  templateUrl: './results.html',
  styleUrls: ['./results.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class Results implements OnInit {
  tournamentId!: number;
  tournament: Tournament | null = null;
  teams: Team[] = [];
  allRows: ResultRow[] = [];
  filteredRows: ResultRow[] = [];
  selectedTeamId: 'ALL' | 'UNSOLD' | number = 'ALL';
  isLoading = true;
  errorMessage = '';

  readonly DEFAULT_PHOTO = 'https://res.cloudinary.com/drytm0fl7/image/upload/v1774291008/default_player_lzyniw.png';

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auctionPlayerService = inject(AuctionPlayerService);
  private teamService = inject(TeamService);
  private tournamentService = inject(TournamentService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    this.tournamentId = Number(this.route.snapshot.paramMap.get('tournamentId'));
    this.loadData();
  }

  private loadData() {
    this.isLoading = true;

    forkJoin({
      tournament: this.tournamentService.getById(this.tournamentId).pipe(
        catchError(() => of(null))
      ),
      players: this.auctionPlayerService.getByTournament(this.tournamentId).pipe(
        catchError(() => of([] as AuctionPlayer[]))
      ),
      teams: this.teamService.getByTournament(this.tournamentId).pipe(
        catchError(() => of([] as Team[]))
      ),
    }).subscribe({
      next: ({ tournament, players, teams }) => {
        this.tournament = tournament;
        this.teams = teams;
        this.allRows = players
          .filter(p => p.auctionStatus === 'SOLD' || p.auctionStatus === 'UNSOLD')
          .map(p => ({
            player: p,
            soldPrice: p.auctionStatus === 'SOLD' ? (p.soldPrice ?? 0) : 0,
            teamName: p.auctionStatus === 'SOLD' ? (p.soldToTeamName ?? 'Unknown Team') : 'Unsold',
            status: p.auctionStatus as 'SOLD' | 'UNSOLD',
          }));
        this.applyFilter();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Failed to load results. Please try again.';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  selectTeamFilter(teamId: 'ALL' | 'UNSOLD' | number) {
    this.selectedTeamId = teamId;
    this.applyFilter();
  }

  private applyFilter() {
    if (this.selectedTeamId === 'ALL') {
      this.filteredRows = [...this.allRows];
    } else if (this.selectedTeamId === 'UNSOLD') {
      this.filteredRows = this.allRows.filter(r => r.status === 'UNSOLD');
    } else {
      this.filteredRows = this.allRows.filter(r => r.player.soldToTeamId === this.selectedTeamId);
    }
  }

  get soldCount(): number {
    return this.allRows.filter(r => r.status === 'SOLD').length;
  }

  get unsoldCount(): number {
    return this.allRows.filter(r => r.status === 'UNSOLD').length;
  }

  get totalSpend(): number {
    return this.allRows.filter(r => r.status === 'SOLD').reduce((sum, r) => sum + r.soldPrice, 0);
  }

  goBack() {
    this.router.navigate(['/admin']);
  }

  getPlayerDisplayName(player: AuctionPlayer): string {
    return player.lastName ? `${player.firstName} ${player.lastName}` : player.firstName;
  }

  downloadCsv() {
    const rows = this.filteredRows;
    const tournamentName = this.tournament?.name ?? 'results';
    const headers = ['Player Number', 'First Name', 'Last Name', 'Age', 'Role', 'Team', 'Sold Price', 'Status'];

    const escape = (val: string | number | undefined | null): string => {
      const str = String(val ?? '');
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    };

    const lines: string[] = [
      headers.map(escape).join(','),
      ...rows.map(r => [
        r.player.playerNumber,
        r.player.firstName,
        r.player.lastName ?? '',
        r.player.age,
        r.player.role,
        r.teamName,
        r.soldPrice,
        r.status,
      ].map(escape).join(',')),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tournamentName.replace(/\s+/g, '_')}_results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
