import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSliderModule } from '@angular/material/slider';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MortgageCalculatorService, MortgageResult, PaymentFrequency, OneTimePayment } from './services/mortgage-calculator.service';
import { ExportService } from './services/export.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatSliderModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatTooltipModule,
    MatChipsModule,
    MatButtonToggleModule
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.component.scss']
})
export class App {
  title = 'Mortgage Calculator';
  
  // Input signals
  loanAmount = signal<number>(300000);
  annualRate = signal<number>(6.5);
  loanTerm = signal<number>(30);
  extraPayment = signal<number>(0);
  paymentFrequency = signal<PaymentFrequency>('monthly');
  oneTimePayments = signal<OneTimePayment[]>([]);
  
  // One-time payment form
  oneTimeMonth = signal<number>(12);
  oneTimeAmount = signal<number>(0);
  
  // Computed result signal
  mortgageResult = computed<MortgageResult | null>(() => {
    const amount = this.loanAmount();
    const rate = this.annualRate();
    const term = this.loanTerm();
    const extra = this.extraPayment();
    const frequency = this.paymentFrequency();
    const oneTimePmts = this.oneTimePayments();
    
    if (amount > 0 && rate >= 0 && term > 0) {
      return this.calculatorService.calculateMortgage(amount, rate, term, extra, frequency, oneTimePmts);
    }
    return null;
  });
  
  // UI state signals
  showAmortization = signal<boolean>(false);
  
  constructor(
    private calculatorService: MortgageCalculatorService,
    private exportService: ExportService
  ) {}
  
  /**
   * Update loan amount
   */
  updateLoanAmount(value: string): void {
    const numValue = parseFloat(value) || 0;
    this.loanAmount.set(Math.max(0, numValue));
  }
  
  /**
   * Update annual interest rate
   */
  updateAnnualRate(value: string): void {
    const numValue = parseFloat(value) || 0;
    this.annualRate.set(Math.max(0, Math.min(100, numValue)));
  }
  
  /**
   * Update loan term
   */
  updateLoanTerm(value: string): void {
    const numValue = parseFloat(value) || 0;
    this.loanTerm.set(Math.max(0, Math.min(50, numValue)));
  }

  /**
   * Update extra payment
   */
  updateExtraPayment(value: string): void {
    const numValue = parseFloat(value) || 0;
    this.extraPayment.set(Math.max(0, numValue));
  }

  /**
   * Toggle payment frequency
   */
  togglePaymentFrequency(): void {
    const current = this.paymentFrequency();
    this.paymentFrequency.set(current === 'monthly' ? 'biweekly' : 'monthly');
  }

  /**
   * Update one-time payment month
   */
  updateOneTimeMonth(value: string): void {
    const numValue = parseFloat(value) || 0;
    this.oneTimeMonth.set(Math.max(1, Math.min(this.loanTerm() * 12, numValue)));
  }

  /**
   * Update one-time payment amount
   */
  updateOneTimeAmount(value: string): void {
    const numValue = parseFloat(value) || 0;
    this.oneTimeAmount.set(Math.max(0, numValue));
  }

  /**
   * Add one-time payment
   */
  addOneTimePayment(): void {
    const month = this.oneTimeMonth();
    const amount = this.oneTimeAmount();
    
    if (amount > 0 && month > 0) {
      const current = this.oneTimePayments();
      // Remove existing payment for this month if any
      const filtered = current.filter(p => p.month !== month);
      // Add new payment and sort by month
      const updated = [...filtered, { month, amount }].sort((a, b) => a.month - b.month);
      this.oneTimePayments.set(updated);
      
      // Reset form
      this.oneTimeAmount.set(0);
    }
  }

  /**
   * Remove one-time payment
   */
  removeOneTimePayment(month: number): void {
    const current = this.oneTimePayments();
    this.oneTimePayments.set(current.filter(p => p.month !== month));
  }
  
  /**
   * Toggle amortization schedule visibility
   */
  toggleAmortization(): void {
    this.showAmortization.update(value => !value);
  }
  
  /**
   * Format currency for display
   */
  formatCurrency(value: number): string {
    return this.calculatorService.formatCurrency(value);
  }
  
  /**
   * Format percentage for display
   */
  formatPercentage(value: number): string {
    return value.toFixed(2) + '%';
  }

  /**
   * Export to PDF
   */
  exportPDF(): void {
    const result = this.mortgageResult();
    if (result) {
      this.exportService.exportToPDF(
        this.loanAmount(),
        this.annualRate(),
        this.loanTerm(),
        this.extraPayment(),
        this.paymentFrequency(),
        result
      );
    }
  }

  /**
   * Export to Excel
   */
  exportExcel(): void {
    const result = this.mortgageResult();
    if (result) {
      this.exportService.exportToExcel(
        this.loanAmount(),
        this.annualRate(),
        this.loanTerm(),
        this.extraPayment(),
        this.paymentFrequency(),
        result
      );
    }
  }
}
