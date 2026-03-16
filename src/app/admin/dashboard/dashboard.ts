import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { TournamentService } from '../../core/services/tournament.service';
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

  private router = inject(Router);
  private tournamentService = inject(TournamentService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
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
          this.tournaments = [t, ...this.tournaments];
          this.closeCreateModal();
          this.cdr.markForCheck();
        },
        error: () => alert('Failed to create tournament. Please try again.'),
      });
  }

  deleteTournament(id: number) {
    if (!confirm('Are you sure you want to delete this tournament?')) return;
    this.tournamentService.delete(id).subscribe({
      next: () => {
        this.tournaments = this.tournaments.filter((t) => t.id !== id);
        this.cdr.markForCheck();
      },
      error: () => alert('Failed to delete tournament.'),
    });
  }

  // ── Edit Tournament modal ─────────────────────────────────────────────────
  showEditModal = false;
  editLogoPreview: string | null = null;
  editingTournamentId: number | null = null;

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
          this.tournaments = this.tournaments.map((t) =>
            t.id === updated.id ? updated : t,
          );
          this.closeEditModal();
          this.cdr.markForCheck();
        },
        error: () => alert('Failed to update tournament. Please try again.'),
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
}

