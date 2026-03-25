// ── Status type aliases ──────────────────────────────────────────────────────

export type TournamentStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED';
export type PlayerStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type AuctionStatus = 'AVAILABLE' | 'SOLD' | 'UNSOLD';

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  type: string;
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phoneCountryCode: string;
  phoneNumber: string;
  organisation?: string;
  sport: string;
  numberOfTeams?: number;
}

export interface RegisterResponse {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface ApiError {
  error?: string;
  message?: string;
  timestamp?: string;
  errors?: Record<string, string>;
}

// ── Tournament ───────────────────────────────────────────────────────────────

export interface Tournament {
  id: number;
  name: string;
  date: string;
  sport: string;
  totalTeams: number;
  totalPlayers: number;
  status: TournamentStatus;
  purseAmount: number;
  playersPerTeam: number;
  basePrice: number;
  incrementAmount?: number;
  initialIncrementAmount: number;
  logoUrl?: string;
  teamesAllowed?: number;
  isPaidTournament?: boolean;
  paymentProofRequired?: boolean;
}

export interface CreateTournamentRequest {
  name: string;
  date: string;
  sport: string;
  totalTeams: number;
  totalPlayers: number;
  purseAmount: number;
  playersPerTeam: number;
  basePrice: number;
  initialIncrementAmount: number;
  status?: TournamentStatus;
  logo?: File | string;
  paymentProofRequired?: boolean;
}

export type UpdateTournamentRequest = Partial<CreateTournamentRequest>;

// ── Team ─────────────────────────────────────────────────────────────────────

export interface Team {
  id: number;
  teamNumber: string;
  name: string;
  ownerName: string;
  mobileNumber: string;
  tournamentId: number;
  logoUrl?: string;
}

export interface CreateTeamRequest {
  teamNumber?: string;
  name: string;
  ownerName: string;
  mobileNumber: string;
  logo?: File | string;
}

export type UpdateTeamRequest = Partial<CreateTeamRequest>;

export interface TeamPurse {
  id: number;
  teamId: number;
  teamNumber: string;
  teamName: string;
  tournamentId: number;
  initialPurse: number;
  currentPurse: number;
  purseUsed: number;
  maxBidPerPlayer: number;
  reservedFund: number;
  availableForBidding: number;
  playersBought: number;
  remainingSlots: number;
}

// ── Player ───────────────────────────────────────────────────────────────────

export interface Player {
  id: number;
  playerNumber: string;
  firstName: string;
  lastName?: string;
  dob?: string;
  role: string;
  status: PlayerStatus;
  tournamentId: number;
  photoUrl?: string;
  paymentProofUrl?: string;
}

export interface PlayerStats {
  totalPlayers: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface PlayerRegistrationRequest {
  firstName: string;
  lastName?: string;
  dob?: string;
  role: string;
  photo?: File | string | undefined;
  paymentProof?: File | string | undefined;
}

export interface AddToAuctionRequest {
  age: number;
  city: string;
  battingStyle: string;
  bowlingStyle: string;
  basePrice: number;
}

// ── AuctionPlayer ────────────────────────────────────────────────────────────

export interface AuctionPlayer {
  id: number;
  playerId?: number;
  playerNumber: string;
  firstName: string;
  lastName?: string;
  age: number;
  city: string;
  battingStyle: string;
  bowlingStyle: string;
  role: string;
  basePrice: number;
  auctionStatus: AuctionStatus;
  soldToTeamId?: number;
  soldToTeamName?: string;
  soldPrice?: number;
  tournamentId: number;
  sortOrder?: number;
  photoUrl?: string;
}

export interface CreateAuctionPlayerRequest {
  playerNumber: string;
  firstName: string;
  lastName?: string;
  age: number;
  city: string;
  battingStyle: string;
  bowlingStyle: string;
  role: string;
  basePrice: number;
  photo?: File | string;
}

export interface SellPlayerRequest {
  teamId: number;
  soldPrice: number;
}

export interface RequeueResponse {
  requeued: number;
  message: string;
}

// ── IncrementRule ────────────────────────────────────────────────────────────

export interface IncrementRule {
  id: number;
  fromAmount: number;
  toAmount: number;
  incrementBy: number;
  tournamentId: number;
}

export interface CreateIncrementRuleRequest {
  fromAmount: number;
  toAmount?: number;
  incrementBy: number;
}

export type UpdateIncrementRuleRequest = Partial<CreateIncrementRuleRequest>;

// ── Owner View ───────────────────────────────────────────────────────────────

export interface OwnerViewResponse {
  tournament: {
    id: number;
    name: string;
    purseAmount: number;
    playersPerTeam: number;
    basePrice: number;
  };
  playerStats: {
    total: number;
    sold: number;
    unsold: number;
    available: number;
  };
  teamStats: OwnerViewTeamStats[];
}

export interface OwnerViewTeamStats {
  team: {
    id: number;
    teamNumber: string;
    name: string;
    ownerName: string;
    mobileNumber: string;
  };
  purseAllocated: number;
  purseSpent: number;
  purseRemaining: number;
  playersCount: number;
  maxBidPerPlayer: number;
  availableForBidding: number;
  reservedFund: number;
  playerDetails: {
    auctionPlayerId: number;
    playerNumber: string;
    firstName: string;
    lastName?: string;
    role: string;
    soldPrice: number;
  }[];
}

// ── Sponsor ──────────────────────────────────────────────────────────────────

export interface Sponsor {
  id: number;
  name: string;
  personName: string;
  personImageUrl: string;
  websiteUrl?: string;
  logoUrl?: string;
  tournamentId?: number;
}

export interface CreateSponsorRequest {
  name: string;
  personName: string;
  personImageUrl: string;
}
