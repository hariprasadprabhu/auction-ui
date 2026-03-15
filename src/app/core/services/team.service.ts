import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Team, CreateTeamRequest, UpdateTeamRequest } from '../../models';

@Injectable({ providedIn: 'root' })
export class TeamService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getByTournament(tournamentId: number): Observable<Team[]> {
    return this.http
      .get<Team[]>(`${this.apiUrl}/api/tournaments/${tournamentId}/teams`)
      .pipe(map((list) => list.map((t) => this.mapTeam(t))));
  }

  getById(id: number): Observable<Team> {
    return this.http
      .get<Team>(`${this.apiUrl}/api/teams/${id}`)
      .pipe(map((t) => this.mapTeam(t)));
  }

  create(tournamentId: number, request: CreateTeamRequest): Observable<Team> {
    const formData = this.buildFormData(request);
    return this.http
      .post<Team>(
        `${this.apiUrl}/api/tournaments/${tournamentId}/teams`,
        formData,
      )
      .pipe(map((t) => this.mapTeam(t)));
  }

  update(id: number, request: UpdateTeamRequest): Observable<Team> {
    const formData = this.buildFormData(request);
    return this.http
      .put<Team>(`${this.apiUrl}/api/teams/${id}`, formData)
      .pipe(map((t) => this.mapTeam(t)));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/teams/${id}`);
  }

  getLogoUrl(id: number): string {
    return `${this.apiUrl}/api/teams/${id}/logo`;
  }

  private buildFormData(
    request: CreateTeamRequest | UpdateTeamRequest,
  ): FormData {
    const fd = new FormData();
    if (request.teamNumber !== undefined)
      fd.append('teamNumber', request.teamNumber);
    if (request.name !== undefined) fd.append('name', request.name);
    if (request.ownerName !== undefined)
      fd.append('ownerName', request.ownerName);
    if (request.mobileNumber !== undefined)
      fd.append('mobileNumber', request.mobileNumber);
    if (request.logo) fd.append('logo', request.logo);
    return fd;
  }

  private mapTeam(t: Team): Team {
    return {
      ...t,
      logoUrl: t.logoUrl ? `${this.apiUrl}${t.logoUrl}` : undefined,
    };
  }
}
