import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  IncrementRule,
  CreateIncrementRuleRequest,
  UpdateIncrementRuleRequest,
} from '../../models';

@Injectable({ providedIn: 'root' })
export class IncrementRuleService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getByTournament(tournamentId: number): Observable<IncrementRule[]> {
    return this.http.get<IncrementRule[]>(
      `${this.apiUrl}/tournaments/${tournamentId}/increment-rules`,
    );
  }

  create(
    tournamentId: number,
    request: CreateIncrementRuleRequest,
  ): Observable<IncrementRule> {
    return this.http.post<IncrementRule>(
      `${this.apiUrl}/tournaments/${tournamentId}/increment-rules`,
      request,
    );
  }

  update(
    id: number,
    request: UpdateIncrementRuleRequest,
  ): Observable<IncrementRule> {
    return this.http.put<IncrementRule>(
      `${this.apiUrl}/increment-rules/${id}`,
      request,
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/increment-rules/${id}`);
  }
}
