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
    const body = this.shouldUseFormData(request)
      ? this.buildFormData(request)
      : this.buildRequestObject(request);
    return this.http
      .post<AuctionPlayer>(
        `${this.apiUrl}/tournaments/${tournamentId}/auction-players`,
        body,
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
    const body = this.shouldUseFormData(request)
      ? this.buildFormData(request)
      : this.buildRequestObject(request);
    return this.http
      .put<AuctionPlayer>(
        `${this.apiUrl}/auction-players/${id}`,
        body,
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

  // Reset Specific Auction Players
  resetAuctionPlayers(tournamentId: number, playerIds: number[]): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/tournaments/${tournamentId}/auction-players/reset`,
      { playerIds },
    );
  }

  // Reset Entire Auction
  resetEntireAuction(tournamentId: number): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/tournaments/${tournamentId}/auction/reset-entire`,
      {},
    );
  }

  getPhotoUrl(id: number): string {
    const baseUrl = this.apiUrl.replace(/\/api\/?$/, '');
    return `${baseUrl}/api/auction-players/${id}/photo`;
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
    // Only append to FormData if it's a File object
    if (request.photo instanceof File) {
      fd.append('photo', request.photo);
    }
    return fd;
  }

  private buildRequestObject(request: Partial<CreateAuctionPlayerRequest>): any {
    const obj: any = {};
    if (request.playerNumber !== undefined) obj.playerNumber = request.playerNumber;
    if (request.firstName !== undefined) obj.firstName = request.firstName;
    if (request.lastName !== undefined) obj.lastName = request.lastName;
    if (request.age !== undefined) obj.age = request.age;
    if (request.city !== undefined) obj.city = request.city;
    if (request.battingStyle !== undefined) obj.battingStyle = request.battingStyle;
    if (request.bowlingStyle !== undefined) obj.bowlingStyle = request.bowlingStyle;
    if (request.role !== undefined) obj.role = request.role;
    if (request.basePrice !== undefined) obj.basePrice = request.basePrice;
    if (request.photo && typeof request.photo === 'string') {
      obj.photoUrl = request.photo;
    }
    return obj;
  }

  private shouldUseFormData(request: Partial<CreateAuctionPlayerRequest>): boolean {
    return request.photo instanceof File;
  }

  private mapPlayer(p: any): AuctionPlayer {
    const rawStatus = (p.auctionStatus || p.auction_status || 'AVAILABLE').toString().toUpperCase();
    const auctionStatus: AuctionStatus =
      rawStatus === 'SOLD' ? 'SOLD' :
      rawStatus === 'UNSOLD' ? 'UNSOLD' :
      'AVAILABLE';
    const normalizeUrl = (url: string | undefined): string | undefined => {
      if (!url) return undefined;
      
      // Fix double /api/api in the path first
      let normalized = url.replace(/\/api\/api\//g, '/api/');
      
      // If already absolute URL, return normalized version
      if (normalized.startsWith('http')) {
        return normalized;
      }
      
      // If starts with /api, the backend already includes /api
      // But our apiUrl also has /api, so we need the base URL without /api
      if (normalized.startsWith('/api')) {
        const baseUrl = this.apiUrl.replace(/\/api\/?$/, '');
        return `${baseUrl}${normalized}`;
      }
      
      // For other relative paths, prepend full apiUrl
      return `${this.apiUrl}${normalized}`;
    };
    return {
      ...p,
      auctionStatus,
      photoUrl: normalizeUrl(p.photoUrl),
    };
  }
}
