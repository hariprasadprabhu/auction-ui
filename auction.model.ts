export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'PLAYER';
}

export interface Tournament {
  id: string;
  name: string;
  startDate: Date;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED';
}

export interface Team {
  id: string;
  tournamentId: string;
  name: string;
  owner: string;
  budget: number;
}

export interface PlayerRegistration {
  id: string;
  tournamentId: string;
  playerName: string;
  playerRole: 'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER';
  basePrice: number;
  paymentScreenshotUrl: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}