import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Shared service to broadcast in-process sell/unsold events across components
 * in the same Angular session. Owner-view subscribes to refresh on each event.
 */
@Injectable({ providedIn: 'root' })
export class AuctionEventService {
  private readonly soldUnsold$ = new Subject<number>(); // emits tournamentId
  readonly auctionUpdated$ = this.soldUnsold$.asObservable();

  notifyAuctionUpdate(tournamentId: number): void {
    this.soldUnsold$.next(tournamentId);
  }
}
