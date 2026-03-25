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
    // Use JSON for requests with only Cloudinary URLs, FormData for file uploads
    const body = this.shouldUseFormData(request) 
      ? this.buildFormData(request)
      : this.buildRequestObject(request);
    
    return this.http
      .post<Tournament>(`${this.apiUrl}/tournaments`, body)
      .pipe(map((t) => this.mapTournament(t)));
  }

  update(id: number, request: UpdateTournamentRequest): Observable<Tournament> {
    // Use JSON for requests with only Cloudinary URLs, FormData for file uploads
    const body = this.shouldUseFormData(request)
      ? this.buildFormData(request)
      : this.buildRequestObject(request);
    
    return this.http
      .put<Tournament>(`${this.apiUrl}/tournaments/${id}`, body)
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
    if (request.paymentProofRequired !== undefined)
      fd.append('paymentProofRequired', String(request.paymentProofRequired));
    // Only append to FormData if it's a File object
    if (request.logo instanceof File) {
      fd.append('logo', request.logo);
    }
    return fd;
  }

  /**
   * Build a plain request object for JSON submission (used when no files)
   */
  private buildRequestObject(request: CreateTournamentRequest | UpdateTournamentRequest): any {
    const obj: any = {};
    if (request.name !== undefined) obj.name = request.name;
    if (request.date !== undefined) obj.date = request.date;
    if (request.sport !== undefined) obj.sport = request.sport;
    if (request.totalTeams !== undefined) obj.totalTeams = request.totalTeams;
    if (request.totalPlayers !== undefined) obj.totalPlayers = request.totalPlayers;
    if (request.purseAmount !== undefined) obj.purseAmount = request.purseAmount;
    if (request.playersPerTeam !== undefined) obj.playersPerTeam = request.playersPerTeam;
    if (request.basePrice !== undefined) obj.basePrice = request.basePrice;
    if (request.initialIncrementAmount !== undefined) obj.initialIncrement = request.initialIncrementAmount;
    if (request.status !== undefined) obj.status = request.status;
    if (request.paymentProofRequired !== undefined) obj.paymentProofRequired = request.paymentProofRequired;
    // Attach Cloudinary URL directly to original field name
    if (request.logo && typeof request.logo === 'string') {
      obj.logo = request.logo;
    }
    return obj;
  }

  /**
   * Check if request contains File objects (should use FormData)
   * If all files are URLs (strings), use JSON instead
   */
  private shouldUseFormData(request: CreateTournamentRequest | UpdateTournamentRequest): boolean {
    return request.logo instanceof File;
  }

  /** Normalize URL - handles both relative paths and Cloudinary absolute URLs */
  private normalizeUrl(url: string | undefined): string | undefined {
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
  }

  /** Resolve relative logoUrl to full URL */
  private mapTournament(t: any): Tournament {
    return {
      ...t,
      initialIncrementAmount: t.initialIncrementAmount !== undefined && t.initialIncrementAmount !== null
        ? t.initialIncrementAmount
        : (t.initialIncrement !== undefined && t.initialIncrement !== null ? t.initialIncrement : 0),
      logoUrl: this.normalizeUrl(t.logoUrl),
    };
  }
}
