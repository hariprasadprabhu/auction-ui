import { describe, expect, it } from 'vitest';
import { AuctionEventService } from './auction-event.service';

describe('AuctionEventService', () => {
  it('emits a tournament id when a websocket topic message arrives', () => {
    const service = new AuctionEventService();
    const seen: number[] = [];

    service.auctionUpdated$.subscribe((tournamentId) => seen.push(tournamentId));

    (service as any).handleStompFrame(
      'MESSAGE\ndestination:/topic/tournaments/32/auction-players\ncontent-type:application/json\n\n{"id":1}\x00',
    );

    expect(seen).toEqual([32]);
  });
});
