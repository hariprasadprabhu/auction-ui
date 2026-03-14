import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MOCK_TOURNAMENTS, MOCK_INCREMENT_RULES } from '../../mock-tournaments';
import { Tournament, IncrementRule } from '../../models';

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

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    const tournamentId = this.route.snapshot.paramMap.get('tournamentId');
    if (tournamentId) {
      this.tournament = MOCK_TOURNAMENTS.find(t => t.id === tournamentId);
      this.rules = MOCK_INCREMENT_RULES.map(r => ({ ...r }));
    }
  }

  goBack() {
    this.router.navigate(['/admin']);
  }

  openAddModal() {
    const lastRule = this.rules[this.rules.length - 1];
    const nextFrom = lastRule ? (lastRule.toAmount === Number.MAX_SAFE_INTEGER ? 0 : lastRule.toAmount) : 0;
    this.newRule = { fromAmount: nextFrom, toAmount: 0, incrementBy: 0 };
    this.showAddModal = true;
  }

  closeAddModal() {
    this.showAddModal = false;
  }

  saveNewRule() {
    const rule: IncrementRule = {
      id: 'r' + Date.now(),
      fromAmount: this.newRule.fromAmount,
      toAmount: this.newRule.toAmount || Number.MAX_SAFE_INTEGER,
      incrementBy: this.newRule.incrementBy,
    };
    this.rules.push(rule);
    this.rules.sort((a, b) => a.fromAmount - b.fromAmount);
    this.closeAddModal();
  }

  openEditModal(rule: IncrementRule) {
    this.editingRule = rule;
    this.editRule = {
      fromAmount: rule.fromAmount,
      toAmount: rule.toAmount === Number.MAX_SAFE_INTEGER ? 0 : rule.toAmount,
      incrementBy: rule.incrementBy,
    };
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editingRule = null;
  }

  saveEditRule() {
    if (this.editingRule) {
      this.editingRule.fromAmount = this.editRule.fromAmount;
      this.editingRule.toAmount = this.editRule.toAmount || Number.MAX_SAFE_INTEGER;
      this.editingRule.incrementBy = this.editRule.incrementBy;
      this.rules.sort((a, b) => a.fromAmount - b.fromAmount);
    }
    this.closeEditModal();
  }

  deleteRule(rule: IncrementRule) {
    this.rules = this.rules.filter(r => r.id !== rule.id);
  }

  formatTo(toAmount: number): string {
    return toAmount === Number.MAX_SAFE_INTEGER ? '∞' : '₹' + toAmount.toLocaleString('en-IN');
  }

  formatAmount(amount: number): string {
    return '₹' + amount.toLocaleString('en-IN');
  }
}
