import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IncrementRuleService } from '../../core/services/increment-rule.service';
import { TournamentService } from '../../core/services/tournament.service';
import { Tournament, IncrementRule } from '../../models';

// Long.MAX_VALUE from Java backend means "and above"
const LONG_MAX = 9223372036854775807;

@Component({
  selector: 'app-conditional-increments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './conditional-increments.html',
  styleUrls: ['./conditional-increments.scss'],
})
export class ConditionalIncrements implements OnInit {
  tournament: Tournament | undefined;
  rules: IncrementRule[] = [];

  showAddModal = false;
  newRule = { fromAmount: 0, toAmount: 0, incrementBy: 0 };

  showEditModal = false;
  editingRule: IncrementRule | null = null;
  editRule = { fromAmount: 0, toAmount: 0, incrementBy: 0 };

  private tournamentId!: number;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private incrementRuleService: IncrementRuleService,
    private tournamentService: TournamentService,
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('tournamentId'));
    if (id) {
      this.tournamentId = id;
      this.tournamentService.getById(id).subscribe((t) => (this.tournament = t));
      this.loadRules();
    }
  }

  private loadRules() {
    this.incrementRuleService.getByTournament(this.tournamentId).subscribe({
      next: (data) => {
        this.rules = data.sort((a, b) => a.fromAmount - b.fromAmount);
      },
      error: () => alert('Failed to load increment rules.'),
    });
  }

  goBack() {
    this.router.navigate(['/admin']);
  }

  openAddModal() {
    const lastRule = this.rules[this.rules.length - 1];
    const nextFrom = lastRule
      ? lastRule.toAmount >= LONG_MAX ? 0 : lastRule.toAmount
      : 0;
    this.newRule = { fromAmount: nextFrom, toAmount: 0, incrementBy: 0 };
    this.showAddModal = true;
  }

  closeAddModal() {
    this.showAddModal = false;
  }

  saveNewRule() {
    this.incrementRuleService
      .create(this.tournamentId, {
        fromAmount: this.newRule.fromAmount,
        toAmount: this.newRule.toAmount || undefined,
        incrementBy: this.newRule.incrementBy,
      })
      .subscribe({
        next: (rule) => {
          this.rules.push(rule);
          this.rules.sort((a, b) => a.fromAmount - b.fromAmount);
          this.closeAddModal();
        },
        error: () => alert('Failed to create rule.'),
      });
  }

  openEditModal(rule: IncrementRule) {
    this.editingRule = rule;
    this.editRule = {
      fromAmount: rule.fromAmount,
      toAmount: rule.toAmount >= LONG_MAX ? 0 : rule.toAmount,
      incrementBy: rule.incrementBy,
    };
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editingRule = null;
  }

  saveEditRule() {
    if (!this.editingRule) return;
    this.incrementRuleService
      .update(this.editingRule.id, {
        fromAmount: this.editRule.fromAmount,
        toAmount: this.editRule.toAmount || undefined,
        incrementBy: this.editRule.incrementBy,
      })
      .subscribe({
        next: (updated) => {
          const index = this.rules.findIndex(r => r.id === this.editingRule!.id);
          if (index !== -1) this.rules[index] = updated;
          this.rules.sort((a, b) => a.fromAmount - b.fromAmount);
          this.closeEditModal();
        },
        error: () => alert('Failed to update rule.'),
      });
  }

  deleteRule(rule: IncrementRule) {
    if (!confirm('Delete this increment rule?')) return;
    this.incrementRuleService.delete(rule.id).subscribe({
      next: () => {
        this.rules = this.rules.filter(r => r.id !== rule.id);
      },
      error: () => alert('Failed to delete rule.'),
    });
  }

  formatTo(toAmount: number): string {
    return toAmount >= LONG_MAX ? '∞' : '₹' + toAmount.toLocaleString('en-IN');
  }

  formatAmount(amount: number): string {
    return '₹' + amount.toLocaleString('en-IN');
  }
}
