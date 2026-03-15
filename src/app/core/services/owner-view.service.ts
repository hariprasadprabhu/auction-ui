import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OwnerViewResponse } from '../../models';

@Injectable({ providedIn: 'root' })
export class OwnerViewService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  get(tournamentId: number): Observable<OwnerViewResponse> {
    return this.http.get<OwnerViewResponse>(
      `${this.apiUrl}/api/tournaments/${tournamentId}/owner-view`,
    );
  }
}
