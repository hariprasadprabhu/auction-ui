import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  AuctionPlayer,
  AuctionStatus,
  CreateAuctionPlayerRequest,
  SellPlayerRequest,
  RequeueResponse,
} from '../../models';

@Injectable({ providedIn: 'root' })
export class AuctionPlayerService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getByTournament(tournamentId: number): Observable<AuctionPlayer[]> {
    return this.http
      .get<AuctionPlayer[]>(
        `${this.apiUrl}/tournaments/${tournamentId}/auction-players`,
      )
      .pipe(map((list) => list.map((p) => this.mapPlayer(p))));
  }

  create(
    tournamentId: number,
    request: CreateAuctionPlayerRequest,
  ): Observable<AuctionPlayer> {
    const formData = this.buildFormData(request);
    return this.http
      .post<AuctionPlayer>(
        `${this.apiUrl}/tournaments/${tournamentId}/auction-players`,
        formData,
      )
      .pipe(map((p) => this.mapPlayer(p)));
  }

  getById(id: number): Observable<AuctionPlayer> {
    return this.http
      .get<AuctionPlayer>(`${this.apiUrl}/auction-players/${id}`)
      .pipe(map((p) => this.mapPlayer(p)));
  }

  update(
    id: number,
    request: Partial<CreateAuctionPlayerRequest>,
  ): Observable<AuctionPlayer> {
    const formData = this.buildFormData(request);
    return this.http
      .put<AuctionPlayer>(
        `${this.apiUrl}/auction-players/${id}`,
        formData,
      )
      .pipe(map((p) => this.mapPlayer(p)));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/auction-players/${id}`);
  }

  sell(id: number, request: SellPlayerRequest): Observable<AuctionPlayer> {
    return this.http
      .patch<AuctionPlayer>(
        `${this.apiUrl}/auction-players/${id}/sell`,
        request,
      )
      .pipe(map((p) => this.mapPlayer(p)));
  }

  markUnsold(id: number): Observable<AuctionPlayer> {
    return this.http
      .patch<AuctionPlayer>(
        `${this.apiUrl}/auction-players/${id}/unsold`,
        {},
      )
      .pipe(map((p) => this.mapPlayer(p)));
  }

  requeueUnsold(tournamentId: number): Observable<RequeueResponse> {
    return this.http.patch<RequeueResponse>(
      `${this.apiUrl}/tournaments/${tournamentId}/auction-players/requeue-unsold`,
      {},
    );
  }

  getPhotoUrl(id: number): string {
    return `${this.apiUrl}/auction-players/${id}/photo`;
  }

  private buildFormData(
    request: Partial<CreateAuctionPlayerRequest>,
  ): FormData {
    const fd = new FormData();
    if (request.playerNumber !== undefined)
      fd.append('playerNumber', request.playerNumber);
    if (request.firstName !== undefined)
      fd.append('firstName', request.firstName);
    if (request.lastName !== undefined) fd.append('lastName', request.lastName);
    if (request.age !== undefined) fd.append('age', String(request.age));
    if (request.city !== undefined) fd.append('city', request.city);
    if (request.battingStyle !== undefined)
      fd.append('battingStyle', request.battingStyle);
    if (request.bowlingStyle !== undefined)
      fd.append('bowlingStyle', request.bowlingStyle);
    if (request.role !== undefined) fd.append('role', request.role);
    if (request.basePrice !== undefined)
      fd.append('basePrice', String(request.basePrice));
    if (request.photo) fd.append('photo', request.photo);
    return fd;
  }

  private mapPlayer(p: any): AuctionPlayer {
    const rawStatus = (p.auctionStatus || p.auction_status || 'AVAILABLE').toString().toUpperCase();
    const auctionStatus: AuctionStatus =
      rawStatus === 'SOLD' ? 'SOLD' :
      rawStatus === 'UNSOLD' ? 'UNSOLD' :
      'AVAILABLE';
    return {
      ...p,
      auctionStatus,
      photoUrl: p.photoUrl
        ? p.photoUrl.startsWith('http')
          ? p.photoUrl
          : `${this.apiUrl}${p.photoUrl}`
        : undefined,
    };
  }
}
