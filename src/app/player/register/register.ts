import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TournamentService } from '../../core/services/tournament.service';
import { PlayerService } from '../../core/services/player.service';
import { Tournament } from '../../models';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
})
export class Register implements OnInit {
  tournament: Tournament | undefined;
  submitted = false;
  serverError = '';

  tournamentId!: number;

  form = {
    firstName: '',
    lastName: '',
    dob: '',
    role: ''
  };

  photoFile: File | null = null;
  paymentProofFile: File | null = null;
  photoPreview: string | null = null;
  paymentProofPreview: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private tournamentService: TournamentService,
    private playerService: PlayerService,
  ) {}

  ngOnInit() {
    this.tournamentId = Number(this.route.snapshot.paramMap.get('tournamentId'));
    if (this.tournamentId) {
      this.tournamentService.getById(this.tournamentId).subscribe({
        next: (t) => (this.tournament = t),
        error: () => (this.serverError = 'Tournament not found.'),
      });
    }
  }

  onPhotoSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.photoFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => (this.photoPreview = e.target.result);
      reader.readAsDataURL(file);
    }
  }

  removePhoto() {
    this.photoFile = null;
    this.photoPreview = null;
  }

  onPaymentProofSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.paymentProofFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => (this.paymentProofPreview = e.target.result);
      reader.readAsDataURL(file);
    }
  }

  submitForm() {
    if (!this.form.firstName || !this.form.role || !this.photoFile || !this.paymentProofFile) {
      return;
    }
    this.serverError = '';
    this.playerService.register(this.tournamentId, {
      firstName: this.form.firstName,
      lastName: this.form.lastName,
      dob: this.form.dob,
      role: this.form.role,
      photo: this.photoFile,
      paymentProof: this.paymentProofFile,
    }).subscribe({
      next: () => (this.submitted = true),
      error: () => (this.serverError = 'Registration failed. Please try again.'),
    });
  }

  registerAnother() {
    this.submitted = false;
    this.serverError = '';
    this.form = { firstName: '', lastName: '', dob: '', role: '' };
    this.photoFile = null;
    this.paymentProofFile = null;
    this.photoPreview = null;
    this.paymentProofPreview = null;
  }
}
