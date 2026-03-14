export interface Tournament {
  id: string;
  name: string;
  date: string;
  sport: string;
  totalTeams: number;
  totalPlayers: number;
  status: 'upcoming' | 'ongoing' | 'completed';
  purseAmount: number;       // Total purse per team (in currency units)
  playersPerTeam: number;    // Max players each team can buy
  basePrice: number;         // Default minimum base price for players
  logo?: string;             // Optional tournament logo (data URL or external URL)
}

export interface IncrementRule {
  id: string;
  fromAmount: number;
  toAmount: number;           // Use Number.MAX_SAFE_INTEGER to denote "and above"
  incrementBy: number;
}

export interface Team {
  id: string;
  teamNumber: string;
  logo: string;
  name: string;
  ownerName: string;
  mobileNumber: string;
  tournamentId: string;
  players?: Player[];
}

export interface Player {
  id: string;
  playerNumber: string;
  photo: string;
  firstName: string;
  lastName?: string;
  dob?: string; // Date in YYYY-MM-DD format (optional)
  role: string;
  paymentProof: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface UserRegistration {
  id: string;
  tournamentId: string;
  name: string;
  email: string;
  paymentScreenshot: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface AuctionPlayer {
  id: string;
  playerNumber: string;
  photo: string;
  firstName: string;
  lastName?: string;
  age: number;
  city: string;
  battingStyle: string;
  bowlingStyle: string;
  role: string;
  basePrice: number;
  auctionStatus: 'upcoming' | 'sold' | 'unsold';
  soldToTeamId?: string;
  soldPrice?: number;
}
