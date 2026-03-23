import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Tournament, CreateTournamentRequest, UpdateTournamentRequest } from '../../models';

@Injectable({ providedIn: 'root' })
export class TournamentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getAll(): Observable<Tournament[]> {
    return this.http
      .get<Tournament[]>(`${this.apiUrl}/tournaments`)
      .pipe(map((list) => list.map((t) => this.mapTournament(t))));
  }

  getById(id: number | string): Observable<Tournament> {
    return this.http
      .get<Tournament>(`${this.apiUrl}/tournaments/${id}`)
      .pipe(map((t) => this.mapTournament(t)));
  }

  create(request: CreateTournamentRequest): Observable<Tournament> {
    const formData = this.buildFormData(request);
    return this.http
      .post<Tournament>(`${this.apiUrl}/tournaments`, formData)
      .pipe(map((t) => this.mapTournament(t)));
  }

  update(id: number, request: UpdateTournamentRequest): Observable<Tournament> {
    const formData = this.buildFormData(request);
    return this.http
      .put<Tournament>(`${this.apiUrl}/tournaments/${id}`, formData)
      .pipe(map((t) => this.mapTournament(t)));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tournaments/${id}`);
  }

  getLogoUrl(id: number): string {
    return `${this.apiUrl}/tournaments/${id}/logo`;
  }

  private buildFormData(
    request: CreateTournamentRequest | UpdateTournamentRequest,
  ): FormData {
    const fd = new FormData();
    if (request.name !== undefined) fd.append('name', request.name);
    if (request.date !== undefined) fd.append('date', request.date);
    if (request.sport !== undefined) fd.append('sport', request.sport);
    if (request.totalTeams !== undefined)
      fd.append('totalTeams', String(request.totalTeams));
    if (request.totalPlayers !== undefined)
      fd.append('totalPlayers', String(request.totalPlayers));
    if (request.purseAmount !== undefined)
      fd.append('purseAmount', String(request.purseAmount));
    if (request.playersPerTeam !== undefined)
      fd.append('playersPerTeam', String(request.playersPerTeam));
    if (request.basePrice !== undefined)
      fd.append('basePrice', String(request.basePrice));
    if (request.initialIncrementAmount !== undefined)
      fd.append('initialIncrement', String(request.initialIncrementAmount));
    if (request.status !== undefined) fd.append('status', request.status);
    // Support both File objects (for backward compatibility) and URLs (new Cloudinary approach)
    if (request.logo instanceof File) {
      fd.append('logo', request.logo);
    } else if (request.logo && typeof request.logo === 'string') {
      fd.append('logoUrl', request.logo);
    }
    return fd;
  }

  /** Resolve relative logoUrl to full URL */
  private mapTournament(t: any): Tournament {
    return {
      ...t,
      initialIncrementAmount: t.initialIncrementAmount !== undefined && t.initialIncrementAmount !== null
        ? t.initialIncrementAmount
        : (t.initialIncrement !== undefined && t.initialIncrement !== null ? t.initialIncrement : 0),
      logoUrl: t.logoUrl ? `${this.apiUrl}${t.logoUrl}` : undefined,
    };
  }
}
