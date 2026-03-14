import { Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';

// DEPRECATED: This file is kept for reference only
// The actual application code is in src/app/
// This file will not be included in the production build

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'PLAYER';
}

interface Tournament {
  id: string;
  name: string;
  startDate: Date;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED';
}

interface Team {
  id: string;
  tournamentId: string;
  name: string;
  owner: string;
  budget: number;
}

interface PlayerRegistration {
  id: string;
  tournamentId: string;
  playerName: string;
  playerRole: 'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER';
  basePrice: number;
  paymentScreenshotUrl: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor() { }
}