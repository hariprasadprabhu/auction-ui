import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SponsorRequest {
  name: string;
  personName: string;
  personImageUrl: string;
}

export interface SponsorResponse extends SponsorRequest {
  id: number;
}

@Injectable({ providedIn: 'root' })
export class SponsorsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getByTournament(tournamentId: number): Observable<SponsorResponse[]> {
    return this.http.get<SponsorResponse[]>(
      `${this.apiUrl}/tournaments/${tournamentId}/sponsors`
    );
  }

  create(tournamentId: number, sponsors: SponsorRequest[]): Observable<SponsorResponse[]> {
    return this.http.post<SponsorResponse[]>(
      `${this.apiUrl}/tournaments/${tournamentId}/sponsors`,
      sponsors
    );
  }

  update(tournamentId: number, sponsorId: number, sponsor: SponsorRequest): Observable<SponsorResponse> {
    return this.http.put<SponsorResponse>(
      `${this.apiUrl}/tournaments/${tournamentId}/sponsors/${sponsorId}`,
      sponsor
    );
  }

  delete(tournamentId: number, sponsorId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/tournaments/${tournamentId}/sponsors/${sponsorId}`
    );
  }
}
