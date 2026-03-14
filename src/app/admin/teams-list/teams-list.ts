import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MOCK_TOURNAMENTS, MOCK_TEAMS } from '../../mock-tournaments';
import { Tournament, Team } from '../../models';

@Component({
  selector: 'app-teams-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './teams-list.html',
  styleUrls: ['./teams-list.scss'],
})
export class TeamsListComponent implements OnInit {
  tournament: Tournament | undefined;
  teams: Team[] = [];

  // Add Team Form
  showAddTeamModal = false;
  newTeam = {
    teamNumber: '',
    name: '',
    ownerName: '',
    mobileNumber: '',
    logoFile: null as File | null
  };
  teamLogoPreview: string | null = null;

  // Edit Team Form
  showEditTeamModal = false;
  editingTeam: Team | null = null;
  editTeam = {
    teamNumber: '',
    name: '',
    ownerName: '',
    mobileNumber: '',
    logo: ''
  };
  editLogoPreview: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    const tournamentId = this.route.snapshot.paramMap.get('tournamentId');
    if (tournamentId) {
      this.tournament = MOCK_TOURNAMENTS.find((t) => t.id === tournamentId);
      this.teams = MOCK_TEAMS.filter((t) => t.tournamentId === tournamentId);
    }
  }

  openAddTeamModal() {
    this.showAddTeamModal = true;
    this.resetTeamForm();
    // Auto-generate next team number
    this.generateNextTeamNumber();
  }

  generateNextTeamNumber() {
    if (this.teams.length === 0) {
      this.newTeam.teamNumber = 'T001';
    } else {
      const lastTeam = this.teams[this.teams.length - 1];
      const lastNumber = parseInt(lastTeam.teamNumber.substring(1));
      const nextNumber = lastNumber + 1;
      this.newTeam.teamNumber = 'T' + String(nextNumber).padStart(3, '0');
    }
  }

  closeAddTeamModal() {
    this.showAddTeamModal = false;
    this.resetTeamForm();
  }

  resetTeamForm() {
    this.newTeam = {
      teamNumber: '',
      name: '',
      ownerName: '',
      mobileNumber: '',
      logoFile: null
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
    if (!this.newTeam.teamNumber || !this.newTeam.name || !this.newTeam.ownerName || !this.newTeam.mobileNumber) {
      alert('Please fill in all required fields');
      return;
    }

    if (!this.teamLogoPreview) {
      alert('Please select a team logo');
      return;
    }

    const team: Team = {
      id: Date.now().toString(),
      teamNumber: this.newTeam.teamNumber,
      logo: this.teamLogoPreview,
      name: this.newTeam.name,
      ownerName: this.newTeam.ownerName,
      mobileNumber: this.newTeam.mobileNumber,
      tournamentId: this.tournament?.id || '',
    };

    this.teams.push(team);
    this.closeAddTeamModal();
  }

  openEditTeamModal(team: Team) {
    this.editingTeam = team;
    this.editTeam = {
      teamNumber: team.teamNumber,
      name: team.name,
      ownerName: team.ownerName,
      mobileNumber: team.mobileNumber,
      logo: team.logo
    };
    this.editLogoPreview = team.logo;
    this.showEditTeamModal = true;
  }

  closeEditTeamModal() {
    this.showEditTeamModal = false;
    this.editingTeam = null;
    this.editLogoPreview = null;
  }

  onEditLogoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
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

    const index = this.teams.findIndex(t => t.id === this.editingTeam!.id);
    if (index !== -1) {
      this.teams[index] = {
        ...this.teams[index],
        name: this.editTeam.name,
        ownerName: this.editTeam.ownerName,
        mobileNumber: this.editTeam.mobileNumber,
        logo: this.editLogoPreview || this.teams[index].logo
      };
    }
    this.closeEditTeamModal();
  }

  deleteTeam(team: Team) {
    if (confirm(`Are you sure you want to delete "${team.name}"?`)) {
      this.teams = this.teams.filter(t => t.id !== team.id);
    }
  }

  goBack() {
    this.router.navigate(['/admin']);
  }
}
