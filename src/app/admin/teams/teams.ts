import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MOCK_TOURNAMENTS, MOCK_PLAYERS } from '../../mock-tournaments';
import { Tournament, Player } from '../../models';

@Component({
  selector: 'app-players',
  imports: [CommonModule, FormsModule],
  templateUrl: './teams.html',
  styleUrls: ['./teams.scss'],
})
export class Players implements OnInit {
  tournament: Tournament | null = null;
  players: Player[] = [];
  selectedImage: string | null = null;
  selectedImageName: string = '';
  selectedPlayerId: string | null = null;

  // Add Player Form
  showAddPlayerModal = false;
  newPlayer = {
    playerNumber: '',
    firstName: '',
    lastName: '',
    dob: '',
    role: 'Batsman',
    photoFile: null as File | null
  };
  playerPhotoPreview: string | null = null;

  // Edit Player Form
  showEditPlayerModal = false;
  editingPlayer: Player | null = null;
  editPlayerForm = {
    firstName: '',
    lastName: '',
    dob: '',
    role: 'Batsman'
  };
  editPhotoPreview: string | null = null;

  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const tournamentId = params.get('tournamentId');
      if (tournamentId) {
        this.tournament = MOCK_TOURNAMENTS.find((t) => t.id === tournamentId) || null;
        this.players = MOCK_PLAYERS;
      }
    });
  }

  openAddPlayerModal() {
    this.showAddPlayerModal = true;
    this.resetPlayerForm();
    // Auto-generate next player number
    this.generateNextPlayerNumber();
  }

  generateNextPlayerNumber() {
    if (this.players.length === 0) {
      this.newPlayer.playerNumber = 'P001';
    } else {
      const lastPlayer = this.players[this.players.length - 1];
      const lastNumber = parseInt(lastPlayer.playerNumber.substring(1));
      const nextNumber = lastNumber + 1;
      this.newPlayer.playerNumber = 'P' + String(nextNumber).padStart(3, '0');
    }
  }

  closeAddPlayerModal() {
    this.showAddPlayerModal = false;
    this.resetPlayerForm();
  }

  resetPlayerForm() {
    this.newPlayer = {
      playerNumber: '',
      firstName: '',
      lastName: '',
      dob: '',
      role: 'Batsman',
      photoFile: null
    };
    this.playerPhotoPreview = null;
  }

  calculateAge(dob: string | undefined): string {
    if (!dob) {
      return 'N/A';
    }
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age.toString();
  }

  deletePlayer(playerId: string) {
    if (confirm('Are you sure you want to delete this player?')) {
      this.players = this.players.filter((p) => p.id !== playerId);
    }
  }

  onPlayerPhotoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.newPlayer.photoFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.playerPhotoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  addPlayer() {
    if (!this.newPlayer.playerNumber || !this.newPlayer.firstName) {
      alert('Please fill in all required fields (Player Number, First Name)');
      return;
    }

    if (!this.playerPhotoPreview) {
      alert('Please select a player photo');
      return;
    }

    const player: Player = {
      id: Date.now().toString(),
      playerNumber: this.newPlayer.playerNumber,
      photo: this.playerPhotoPreview,
      firstName: this.newPlayer.firstName,
      lastName: this.newPlayer.lastName || 'N/A',
      dob: this.newPlayer.dob || undefined,
      role: this.newPlayer.role,
      paymentProof: 'https://picsum.photos/400/300?random=default',
      status: 'pending'
    };

    this.players.push(player);
    this.closeAddPlayerModal();
  }

  openImageModal(imageSrc: string, playerName: string) {
    this.selectedImage = imageSrc;
    this.selectedImageName = playerName;
  }

  closeImageModal() {
    this.selectedImage = null;
    this.selectedImageName = '';
    this.selectedPlayerId = null;
  }

  approvePlayer(playerId: string) {
    const player = this.players.find((p) => p.id === playerId);
    if (player) {
      player.status = 'approved';
    }
  }

  rejectPlayer(playerId: string) {
    const player = this.players.find((p) => p.id === playerId);
    if (player) {
      player.status = 'rejected';
    }
  }

  approveFromModal() {
    if (this.selectedPlayerId) {
      this.approvePlayer(this.selectedPlayerId);
      this.closeImageModal();
    }
  }

  rejectFromModal() {
    if (this.selectedPlayerId) {
      this.rejectPlayer(this.selectedPlayerId);
      this.closeImageModal();
    }
  }

  openEditPlayerModal(player: Player) {
    this.editingPlayer = player;
    this.editPlayerForm = {
      firstName: player.firstName,
      lastName: player.lastName || '',
      dob: player.dob || '',
      role: player.role
    };
    this.editPhotoPreview = player.photo;
    this.showEditPlayerModal = true;
  }

  closeEditPlayerModal() {
    this.showEditPlayerModal = false;
    this.editingPlayer = null;
    this.editPhotoPreview = null;
  }

  onEditPhotoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.editPhotoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  saveEditPlayer() {
    if (!this.editingPlayer) return;
    if (!this.editPlayerForm.firstName) {
      alert('First Name is required');
      return;
    }
    const index = this.players.findIndex(p => p.id === this.editingPlayer!.id);
    if (index !== -1) {
      this.players[index] = {
        ...this.players[index],
        firstName: this.editPlayerForm.firstName,
        lastName: this.editPlayerForm.lastName || 'N/A',
        dob: this.editPlayerForm.dob || undefined,
        role: this.editPlayerForm.role,
        photo: this.editPhotoPreview || this.players[index].photo
      };
    }
    this.closeEditPlayerModal();
  }

  goBack() {
    this.router.navigate(['/admin']);
  }
}
