import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { MOCK_TOURNAMENTS } from '../../mock-tournaments';
import { Tournament } from '../../models';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class Dashboard {
  tournaments: Tournament[] = [...MOCK_TOURNAMENTS];
  private router = inject(Router);

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
    status: 'upcoming' | 'ongoing' | 'completed';
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
      status: 'upcoming' as const,
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
    reader.onload = (e) => { this.createLogoPreview = e.target?.result as string; };
    reader.readAsDataURL(file);
  }

  createTournament(form: NgForm) {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }
    const t: Tournament = {
      id: Date.now().toString(),
      name: this.newTournament.name,
      date: this.newTournament.date,
      sport: this.newTournament.sport,
      totalTeams: this.newTournament.totalTeams,
      totalPlayers: this.newTournament.totalPlayers,
      purseAmount: this.newTournament.purseAmount,
      playersPerTeam: this.newTournament.playersPerTeam,
      basePrice: this.newTournament.basePrice,
      status: this.newTournament.status,
      logo: this.createLogoPreview ?? undefined,
    };
    this.tournaments = [t, ...this.tournaments];
    this.closeCreateModal();
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  viewTeams(tournamentId: string) {
    this.router.navigate(['/admin/teams-list', tournamentId]);
  }

  viewPlayers(tournamentId: string) {
    this.router.navigate(['/admin/teams', tournamentId]);
  }

  openRegisterLink(tournamentId: string) {
    window.open(`/register/${tournamentId}`, '_blank');
  }

  startAuction(tournamentId: string) {
    this.router.navigate(['/admin/auction', tournamentId]);
  }

  viewConditionalIncrements(tournamentId: string) {
    this.router.navigate(['/admin/increments', tournamentId]);
  }
}

