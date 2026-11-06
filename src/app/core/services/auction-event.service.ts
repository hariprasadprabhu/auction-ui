import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Shared service to broadcast in-process sell/unsold events across components
 * in the same Angular session. Owner-view subscribes to refresh on each event.
 */
@Injectable({ providedIn: 'root' })
export class AuctionEventService {
  private readonly soldUnsold$ = new Subject<number>(); // emits tournamentId
  readonly auctionUpdated$ = this.soldUnsold$.asObservable();

  private readonly subscribedTournaments = new Set<number>();
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connected = false;

  constructor() {
    if (typeof window !== 'undefined' && typeof WebSocket !== 'undefined') {
      this.connectWebSocket();
    }
  }

  subscribeToTournament(tournamentId: number): void {
    this.subscribedTournaments.add(tournamentId);

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.registerTournamentSubscriptions(tournamentId);
    }
  }

  unsubscribeFromTournament(tournamentId: number): void {
    this.subscribedTournaments.delete(tournamentId);
    this.sendFrame('UNSUBSCRIBE', {
      id: `t-${tournamentId}`,
    });
  }

  notifyAuctionUpdate(tournamentId: number): void {
    this.soldUnsold$.next(tournamentId);
  }

  private connectWebSocket(): void {
    if (this.socket || typeof WebSocket === 'undefined') {
      return;
    }

    const wsUrl = environment.wsUrl || `${environment.apiUrl.replace(/^http/, 'ws')}/ws`;
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      this.connected = true;
      this.sendFrame('CONNECT', {
        'accept-version': '1.2,1.1,1.0',
        'heart-beat': '10000,10000',
      });
      this.subscribedTournaments.forEach((tournamentId) => {
        this.registerTournamentSubscriptions(tournamentId);
      });
    };

    this.socket.onmessage = (event) => {
      this.handleStompFrame(event.data as string);
    };

    this.socket.onerror = () => {
      console.warn('Auction websocket connection error');
    };

    this.socket.onclose = () => {
      this.connected = false;
      this.socket = null;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
      }
      this.reconnectTimer = setTimeout(() => {
        this.connectWebSocket();
      }, 5000);
    };
  }

  private registerTournamentSubscriptions(tournamentId: number): void {
    const auctionPlayersTopic = `/topic/tournaments/${tournamentId}/auction-players`;
    const teamPursesTopic = `/topic/tournaments/${tournamentId}/team-purses`;

    this.sendFrame('SUBSCRIBE', {
      destination: auctionPlayersTopic,
      id: `t-${tournamentId}-players`,
      'ack': 'auto',
    });

    this.sendFrame('SUBSCRIBE', {
      destination: teamPursesTopic,
      id: `t-${tournamentId}-purses`,
      'ack': 'auto',
    });

    this.sendFrame('SEND', {
      destination: `/app/tournaments/${tournamentId}/auction-players`,
      'content-type': 'application/json',
    }, '');

    this.sendFrame('SEND', {
      destination: `/app/tournaments/${tournamentId}/team-purses`,
      'content-type': 'application/json',
    }, '');
  }

  private handleStompFrame(rawFrame: string): void {
    const frames = rawFrame
      .split('\x00')
      .map((frame) => frame.trim())
      .filter((frame) => frame.length > 0);

    frames.forEach((frame) => {
      const headerBreakIndex = frame.indexOf('\n\n');
      const headerSection =
        headerBreakIndex >= 0 ? frame.substring(0, headerBreakIndex) : frame;
      const body =
        headerBreakIndex >= 0 ? frame.substring(headerBreakIndex + 2) : '';

      const lines = headerSection.split('\n');
      const command = lines[0]?.trim() ?? '';
      const headers: Record<string, string> = {};

      lines.slice(1).forEach((line) => {
        const separatorIndex = line.indexOf(':');
        if (separatorIndex > 0) {
          const key = line.substring(0, separatorIndex).trim();
          const value = line.substring(separatorIndex + 1).trim();
          headers[key.toLowerCase()] = value;
        }
      });

      if (command === 'CONNECTED') {
        this.connected = true;
        return;
      }

      if (command !== 'MESSAGE') {
        return;
      }

      const destination = headers['destination'] ?? '';
      const tournamentId = this.extractTournamentId(destination);
      if (!tournamentId) {
        return;
      }

      if (destination.includes('/auction-players') || destination.includes('/team-purses')) {
        this.notifyAuctionUpdate(tournamentId);
      }
    });
  }

  private extractTournamentId(destination: string): number | null {
    const match = destination.match(/\/tournaments\/(\d+)(?:\/|$)/);
    if (!match) {
      return null;
    }

    return Number(match[1]);
  }

  private sendFrame(
    command: string,
    headers: Record<string, string> = {},
    body = '',
  ): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const frameLines = [command];
    Object.entries(headers).forEach(([key, value]) => {
      frameLines.push(`${key}:${value}`);
    });
    frameLines.push('');
    frameLines.push(body);
    this.socket.send(`${frameLines.join('\n')}\x00`);
  }
}
