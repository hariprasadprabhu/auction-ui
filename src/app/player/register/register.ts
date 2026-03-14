import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MOCK_TOURNAMENTS } from '../../mock-tournaments';
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

  form = {
    firstName: '',
    lastName: '',
    dob: '',
    role: ''
  };

  photoPreview: string | null = null;
  paymentProofPreview: string | null = null;

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    const tournamentId = this.route.snapshot.paramMap.get('tournamentId');
    if (tournamentId) {
      this.tournament = MOCK_TOURNAMENTS.find(t => t.id === tournamentId);
    }
  }

  onPhotoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.photoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removePhoto() {
    this.photoPreview = null;
  }

  onPaymentProofSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.paymentProofPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  submitForm() {
    if (!this.form.firstName || !this.form.role || !this.photoPreview || !this.paymentProofPreview) {
      return;
    }
    this.submitted = true;
  }

  registerAnother() {
    this.submitted = false;
    this.form = { firstName: '', lastName: '', dob: '', role: '' };
    this.photoPreview = null;
    this.paymentProofPreview = null;
  }
}
