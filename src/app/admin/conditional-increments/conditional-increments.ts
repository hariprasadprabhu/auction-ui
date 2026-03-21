import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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

  // ── Add Rule Modal ────────────────────────────────────────────────────────
  showAddModal = false;
  isAddingRule = false;
  newRule = { fromAmount: 0, toAmount: 0, incrementBy: 0 };

  // ── Edit Rule Modal ───────────────────────────────────────────────────────
  showEditModal = false;
  isEditingRule = false;
  editingRule: IncrementRule | null = null;
  editRule = { fromAmount: 0, toAmount: 0, incrementBy: 0 };

  // ── Delete Rule ───────────────────────────────────────────────────────────
  isDeletingRule = false;

  // ── Custom Modals ────────────────────────────────────────────────────────
  showSuccessModal = false;
  successTitle = '';
  successMessage = '';

  showErrorModal = false;
  errorTitle = '';
  errorMessage = '';

  showConfirmModal = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmCallback: (() => void) | null = null;

  private tournamentId!: number;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private incrementRuleService: IncrementRuleService,
    private tournamentService: TournamentService,
    private cdr: ChangeDetectorRef,
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
    this.isAddingRule = true;
    this.cdr.markForCheck();
    this.incrementRuleService
      .create(this.tournamentId, {
        fromAmount: this.newRule.fromAmount,
        toAmount: this.newRule.toAmount || undefined,
        incrementBy: this.newRule.incrementBy,
      })
      .subscribe({
        next: (rule) => {
          this.isAddingRule = false;
          this.rules.push(rule);
          this.rules.sort((a, b) => a.fromAmount - b.fromAmount);
          this.closeAddModal();
          this.openSuccessModal('Rule Added', 'Increment rule has been created successfully.');
          this.cdr.markForCheck();
        },
        error: (err: any) => {
          this.isAddingRule = false;
          const errorMessage = err?.error?.message || 'Failed to create rule. Please try again.';
          this.openErrorModal('Failed to Add Rule', errorMessage);
          this.cdr.markForCheck();
        },
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
    this.openConfirmModal(
      'Delete Rule?',
      'Are you sure you want to delete this increment rule? This action cannot be undone.',
      () => {
        this.isDeletingRule = true;
        this.cdr.markForCheck();
        this.incrementRuleService.delete(rule.id).subscribe({
          next: () => {
            this.isDeletingRule = false;
            this.rules = this.rules.filter(r => r.id !== rule.id);
            this.openSuccessModal('Rule Deleted', 'Increment rule has been deleted successfully.');
            this.cdr.markForCheck();
          },
          error: (err: any) => {
            this.isDeletingRule = false;
            const errorMessage = err?.error?.message || 'Failed to delete rule. Please try again.';
            this.openErrorModal('Failed to Delete Rule', errorMessage);
            this.cdr.markForCheck();
          },
        });
      }
    );
  }

  formatTo(toAmount: number): string {
    return toAmount >= LONG_MAX ? '∞' : '₹' + toAmount.toLocaleString('en-IN');
  }

  formatAmount(amount: number): string {
    return '₹' + amount.toLocaleString('en-IN');
  }

  // ── Custom Modal Methods ──────────────────────────────────────────────────

  openSuccessModal(title: string, message: string) {
    this.successTitle = title;
    this.successMessage = message;
    this.showSuccessModal = true;
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
  }

  openErrorModal(title: string, message: string) {
    this.errorTitle = title;
    this.errorMessage = message;
    this.showErrorModal = true;
  }

  closeErrorModal() {
    this.showErrorModal = false;
  }

  openConfirmModal(title: string, message: string, onConfirm: () => void) {
    this.confirmTitle = title;
    this.confirmMessage = message;
    this.confirmCallback = onConfirm;
    this.showConfirmModal = true;
  }

  closeConfirmModal() {
    this.showConfirmModal = false;
    this.confirmCallback = null;
  }

  confirmAction() {
    if (this.confirmCallback) {
      this.confirmCallback();
    }
    this.closeConfirmModal();
  }
}
