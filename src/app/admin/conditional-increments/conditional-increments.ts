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
  isLoading = true;

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
    this.isLoading = true;
    this.cdr.markForCheck();
    this.incrementRuleService.getByTournament(this.tournamentId).subscribe({
      next: (data) => {
        this.isLoading = false;
        this.rules = data.sort((a, b) => a.fromAmount - b.fromAmount);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        alert('Failed to load increment rules.');
        this.cdr.markForCheck();
      },
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
    // Validate that the new rule doesn't overlap with existing rules
    const overlapError = this.checkRuleOverlap(this.newRule.fromAmount, this.newRule.toAmount);
    if (overlapError) {
      this.openErrorModal('Invalid Range', overlapError);
      return;
    }

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

    // Validate that the updated rule doesn't overlap with existing rules (excluding the current rule)
    const overlapError = this.checkRuleOverlap(
      this.editRule.fromAmount, 
      this.editRule.toAmount, 
      this.editingRule.id
    );
    if (overlapError) {
      this.openErrorModal('Invalid Range', overlapError);
      return;
    }

    this.isEditingRule = true;
    this.cdr.markForCheck();
    this.incrementRuleService
      .update(this.editingRule.id, {
        fromAmount: this.editRule.fromAmount,
        toAmount: this.editRule.toAmount || undefined,
        incrementBy: this.editRule.incrementBy,
      })
      .subscribe({
        next: (updated) => {
          this.isEditingRule = false;
          const index = this.rules.findIndex(r => r.id === this.editingRule!.id);
          if (index !== -1) this.rules[index] = updated;
          this.rules.sort((a, b) => a.fromAmount - b.fromAmount);
          this.closeEditModal();
          this.openSuccessModal('Rule Updated', 'Increment rule has been updated successfully.');
          this.cdr.markForCheck();
        },
        error: (err: any) => {
          this.isEditingRule = false;
          const errorMessage = err?.error?.message || 'Failed to update rule. Please try again.';
          this.openErrorModal('Failed to Update Rule', errorMessage);
          this.cdr.markForCheck();
        },
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

  // ── Validation Methods ────────────────────────────────────────────────────

  /**
   * Check if a new range overlaps with any existing rules
   * @param fromAmount The start of the range
   * @param toAmount The end of the range (0 means unlimited/LONG_MAX)
   * @param excludeRuleId Optional: if provided, excludes this rule ID from the check (for edit mode)
   * @returns Error message if overlap found, null if valid
   */
  private checkRuleOverlap(fromAmount: number, toAmount: number, excludeRuleId?: number): string | null {
    // Normalize the toAmount (0 means unlimited/LONG_MAX)
    const normalizedTo = toAmount || LONG_MAX;

    for (const existingRule of this.rules) {
      // Skip the rule being edited
      if (excludeRuleId && existingRule.id === excludeRuleId) {
        continue;
      }

      const existingTo = existingRule.toAmount >= LONG_MAX ? LONG_MAX : existingRule.toAmount;

      // Check for overlaps:
      // Case 1: New range starts inside existing range
      if (fromAmount >= existingRule.fromAmount && fromAmount < existingTo) {
        return `Range overlaps with existing rule: ₹${this.formatAmount(
          existingRule.fromAmount
        )} - ₹${this.formatTo(existingRule.toAmount)}`;
      }

      // Case 2: New range ends inside existing range
      if (normalizedTo > existingRule.fromAmount && normalizedTo <= existingTo) {
        return `Range overlaps with existing rule: ₹${this.formatAmount(
          existingRule.fromAmount
        )} - ₹${this.formatTo(existingRule.toAmount)}`;
      }

      // Case 3: New range completely encompasses existing range
      if (fromAmount <= existingRule.fromAmount && normalizedTo >= existingTo) {
        return `Range overlaps with existing rule: ₹${this.formatAmount(
          existingRule.fromAmount
        )} - ₹${this.formatTo(existingRule.toAmount)}`;
      }

      // Case 4: Existing range completely encompasses new range
      if (
        existingRule.fromAmount <= fromAmount &&
        existingTo >= normalizedTo
      ) {
        return `Range overlaps with existing rule: ₹${this.formatAmount(
          existingRule.fromAmount
        )} - ₹${this.formatTo(existingRule.toAmount)}`;
      }
    }

    return null; // No overlap found
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
