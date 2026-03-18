import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TeamService } from '../../core/services/team.service';
import { TournamentService } from '../../core/services/tournament.service';
import { Tournament, Team } from '../../models';
import { NormalizePhotoUrlCachedPipe } from '../../core/pipes/normalize-photo-url-cached.pipe';

@Component({
  selector: 'app-teams-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NormalizePhotoUrlCachedPipe],
  templateUrl: './teams-list.html',
  styleUrls: ['./teams-list.scss'],
})
export class TeamsListComponent implements OnInit {
  tournament: Tournament | undefined;
  teams: Team[] = [];

  // Add Team Form
  showAddTeamModal = false;
  newTeam = {
    name: '',
    ownerName: '',
    mobileNumber: '',
    logoFile: null as File | null,
  };
  teamLogoPreview: string | null = null;

  // Edit Team Form
  showEditTeamModal = false;
  editingTeam: Team | null = null;
  editTeam = {
    name: '',
    ownerName: '',
    mobileNumber: '',
  };
  editLogoPreview: string | null = null;
  editLogoFile: File | null = null;

  private tournamentId!: number;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
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
      this.loadTeams();
    }
  }

  private loadTeams() {
    this.teamService.getByTournament(this.tournamentId).subscribe({
      next: (data) => {
        this.teams = data;
        this.cdr.markForCheck();
      },
      error: () => alert('Failed to load teams.'),
    });
  }

  openAddTeamModal() {
    this.showAddTeamModal = true;
    this.resetTeamForm();
  }

  closeAddTeamModal() {
    this.showAddTeamModal = false;
    this.resetTeamForm();
  }

  resetTeamForm() {
    this.newTeam = {
      name: '',
      ownerName: '',
      mobileNumber: '',
      logoFile: null,
    };
    this.teamLogoPreview = null;
  }

  onTeamLogoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.newTeam.logoFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.teamLogoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  addTeam() {
    if (!this.newTeam.name || !this.newTeam.ownerName || !this.newTeam.mobileNumber) {
      alert('Please fill in all required fields');
      return;
    }
    this.teamService
      .create(this.tournamentId, {
        name: this.newTeam.name,
        ownerName: this.newTeam.ownerName,
        mobileNumber: this.newTeam.mobileNumber,
        logo: this.newTeam.logoFile ?? undefined,
      })
      .subscribe({
        next: (t) => {
          this.teams.push(t);
          this.closeAddTeamModal();
          this.cdr.markForCheck();
        },
        error: () => alert('Failed to add team.'),
      });
  }

  openEditTeamModal(team: Team) {
    this.editingTeam = team;
    this.editTeam = {
      name: team.name,
      ownerName: team.ownerName,
      mobileNumber: team.mobileNumber,
    };
    this.editLogoPreview = team.logoUrl ?? null;
    this.editLogoFile = null;
    this.showEditTeamModal = true;
  }

  closeEditTeamModal() {
    this.showEditTeamModal = false;
    this.editingTeam = null;
    this.editLogoPreview = null;
    this.editLogoFile = null;
  }

  onEditLogoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.editLogoFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.editLogoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  saveEditTeam() {
    if (!this.editingTeam) return;
    if (!this.editTeam.name || !this.editTeam.ownerName || !this.editTeam.mobileNumber) {
      alert('Please fill in all required fields');
      return;
    }
    this.teamService
      .update(this.editingTeam.id, {
        name: this.editTeam.name,
        ownerName: this.editTeam.ownerName,
        mobileNumber: this.editTeam.mobileNumber,
        logo: this.editLogoFile ?? undefined,
      })
      .subscribe({
        next: (updated) => {
          const index = this.teams.findIndex((t) => t.id === this.editingTeam!.id);
          if (index !== -1) this.teams[index] = updated;
          this.closeEditTeamModal();
          this.cdr.markForCheck();
        },
        error: () => alert('Failed to update team.'),
      });
  }

  deleteTeam(team: Team) {
    if (confirm(`Are you sure you want to delete "${team.name}"?`)) {
      this.teamService.delete(team.id).subscribe({
        next: () => {
          this.teams = this.teams.filter((t) => t.id !== team.id);
          this.cdr.markForCheck();
        },
        error: () => alert('Failed to delete team.'),
      });
    }
  }

  goBack() {
    this.router.navigate(['/admin']);
  }
}
