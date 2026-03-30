import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  Team,
  TeamPurse,
  CreateTeamRequest,
  UpdateTeamRequest,
} from '../../models';

@Injectable({ providedIn: 'root' })
export class TeamService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getByTournament(tournamentId: number): Observable<Team[]> {
    return this.http
      .get<Team[]>(`${this.apiUrl}/tournaments/${tournamentId}/teams`)
      .pipe(map((list) => list.map((t) => this.mapTeam(t))));
  }

  getById(id: number): Observable<Team> {
    return this.http
      .get<Team>(`${this.apiUrl}/teams/${id}`)
      .pipe(map((t) => this.mapTeam(t)));
  }

  getTeamPurses(tournamentId: number): Observable<TeamPurse[]> {
    return this.http
      .get<TeamPurse[]>(
        `${this.apiUrl}/tournaments/${tournamentId}/team-purses`,
      )
      .pipe(map((list) => list.map((p) => this.mapTeamPurse(p))));
  }

  getTeamPurse(tournamentId: number, teamId: number): Observable<TeamPurse> {
    return this.http
      .get<TeamPurse>(
        `${this.apiUrl}/tournaments/${tournamentId}/teams/${teamId}/purse`,
      )
      .pipe(map((p) => this.mapTeamPurse(p)));
  }

  getTeamPursesAcrossTournaments(teamId: number): Observable<TeamPurse[]> {
    return this.http
      .get<TeamPurse[]>(`${this.apiUrl}/teams/${teamId}/purses`)
      .pipe(map((list) => list.map((p) => this.mapTeamPurse(p))));
  }

  create(tournamentId: number, request: CreateTeamRequest): Observable<Team> {
    const body = this.shouldUseFormData(request)
      ? this.buildFormData(request)
      : this.buildRequestObject(request);
    return this.http
      .post<Team>(
        `${this.apiUrl}/tournaments/${tournamentId}/teams`,
        body,
      )
      .pipe(map((t) => this.mapTeam(t)));
  }

  update(id: number, request: UpdateTeamRequest): Observable<Team> {
    const body = this.shouldUseFormData(request)
      ? this.buildFormData(request)
      : this.buildRequestObject(request);
    return this.http
      .put<Team>(`${this.apiUrl}/teams/${id}`, body)
      .pipe(map((t) => this.mapTeam(t)));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/teams/${id}`);
  }

  getLogoUrl(id: number): string {
    return `${this.apiUrl}/teams/${id}/logo`;
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
    // Only append to FormData if it's a File object
    if (request.logo instanceof File) {
      fd.append('logo', request.logo);
    }
    return fd;
  }

  private buildRequestObject(request: CreateTeamRequest | UpdateTeamRequest): any {
    const obj: any = {};
    if (request.teamNumber !== undefined) obj.teamNumber = request.teamNumber;
    if (request.name !== undefined) obj.name = request.name;
    if (request.ownerName !== undefined) obj.ownerName = request.ownerName;
    if (request.mobileNumber !== undefined) obj.mobileNumber = request.mobileNumber;
    // Attach Cloudinary URL directly to original field name
    if (request.logo && typeof request.logo === 'string') {
      obj.logo = request.logo;
    }
    return obj;
  }

  private shouldUseFormData(request: CreateTeamRequest | UpdateTeamRequest): boolean {
    return request.logo instanceof File;
  }

  private mapTeam(t: Team): Team {
    const normalizeUrl = (url: string | undefined): string | undefined => {
      if (!url) return undefined;
      
      // If already absolute URL (like Cloudinary), return as-is
      if (url.startsWith('http')) {
        return url;
      }
      
      // If starts with /api, the backend already includes /api
      // But our apiUrl also has /api, so we need the base URL without /api
      if (url.startsWith('/api')) {
        const baseUrl = this.apiUrl.replace(/\/api\/?$/, '');
        return `${baseUrl}${url}`;
      }
      
      // For other relative paths, prepend full apiUrl
      return `${this.apiUrl}${url}`;
    };
    return {
      ...t,
      logoUrl: normalizeUrl(t.logoUrl),
    };
  }

  private mapTeamPurse(p: TeamPurse): TeamPurse {
    return {
      ...p,
      initialPurse: Number(p.initialPurse ?? 0),
      currentPurse: Number(p.currentPurse ?? 0),
      purseUsed: Number(p.purseUsed ?? 0),
      maxBidPerPlayer: Number(p.maxBidPerPlayer ?? 0),
      reservedFund: Number(p.reservedFund ?? 0),
      availableForBidding: Number(p.availableForBidding ?? 0),
      playersBought: Number(p.playersBought ?? 0),
      remainingSlots: Number(p.remainingSlots ?? 0),
    };
  }
}
