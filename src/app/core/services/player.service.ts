import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  Player,
  PlayerStats,
  PlayerRegistrationRequest,
  AddToAuctionRequest,
  AuctionPlayer,
  PlayerStatus,
} from '../../models';

@Injectable({ providedIn: 'root' })
export class PlayerService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getByTournament(
    tournamentId: number,
    status?: PlayerStatus,
  ): Observable<Player[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http
      .get<Player[]>(
        `${this.apiUrl}/tournaments/${tournamentId}/players`,
        { params },
      )
      .pipe(map((list) => list.map((p) => this.mapPlayer(p))));
  }

  getApproved(tournamentId: number): Observable<Player[]> {
    return this.http
      .get<Player[]>(
        `${this.apiUrl}/tournaments/${tournamentId}/players/approved`,
      )
      .pipe(map((list) => list.map((p) => this.mapPlayer(p))));
  }

  getStats(tournamentId: number): Observable<PlayerStats> {
    return this.http.get<PlayerStats>(
      `${this.apiUrl}/tournaments/${tournamentId}/players/stats`,
    );
  }

  /** Public self-registration — no auth required */
  register(
    tournamentId: number | string,
    request: PlayerRegistrationRequest,
  ): Observable<Player> {
    const formData = this.buildFormData(request);
    return this.http
      .post<Player>(
        `${this.apiUrl}/players/register/${tournamentId}`,
        formData,
      )
      .pipe(map((p) => this.mapPlayer(p)));
  }

  getById(id: number): Observable<Player> {
    return this.http
      .get<Player>(`${this.apiUrl}/players/${id}`)
      .pipe(map((p) => this.mapPlayer(p)));
  }

  update(id: number, request: Partial<PlayerRegistrationRequest>): Observable<Player> {
    const formData = this.buildFormData(request);
    return this.http
      .put<Player>(`${this.apiUrl}/players/${id}`, formData)
      .pipe(map((p) => this.mapPlayer(p)));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/players/${id}`);
  }

  approve(id: number): Observable<Player> {
    return this.http
      .patch<Player>(`${this.apiUrl}/players/${id}/approve`, {})
      .pipe(map((p) => this.mapPlayer(p)));
  }

  reject(id: number): Observable<Player> {
    return this.http
      .patch<Player>(`${this.apiUrl}/players/${id}/reject`, {})
      .pipe(map((p) => this.mapPlayer(p)));
  }

  addToAuction(id: number, request: AddToAuctionRequest): Observable<AuctionPlayer> {
    return this.http.post<AuctionPlayer>(
      `${this.apiUrl}/players/${id}/add-to-auction`,
      request,
    );
  }

  getPhotoUrl(id: number): string {
    return `${this.apiUrl}/players/${id}/photo`;
  }

  getPaymentProofUrl(id: number): string {
    return `${this.apiUrl}/players/${id}/payment-proof`;
  }

  private buildFormData(
    request: Partial<PlayerRegistrationRequest>,
  ): FormData {
    const fd = new FormData();
    if (request.firstName !== undefined)
      fd.append('firstName', request.firstName);
    if (request.lastName !== undefined) fd.append('lastName', request.lastName);
    if (request.dob !== undefined) fd.append('dob', request.dob);
    if (request.role !== undefined) fd.append('role', request.role);
    if (request.photo) fd.append('photo', request.photo);
    if (request.paymentProof) fd.append('paymentProof', request.paymentProof);
    return fd;
  }

  private mapPlayer(p: Player): Player {
    const normalizeUrl = (url: string | undefined): string | undefined => {
      if (!url) return undefined;
      // If already absolute URL, fix any double /api/api and return
      if (url.startsWith('http')) {
        return url.replace(/\/api\/api\//g, '/api/');
      }
      // If relative path, prepend apiUrl
      return `${this.apiUrl}${url}`;
    };
    return {
      ...p,
      photoUrl: normalizeUrl(p.photoUrl),
      paymentProofUrl: normalizeUrl(p.paymentProofUrl),
    };
  }
}
