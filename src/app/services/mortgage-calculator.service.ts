import { Injectable } from '@angular/core';

export interface MortgageResult {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  amortizationSchedule: AmortizationEntry[];
  interestSaved?: number;
  monthsSaved?: number;
  payoffDate?: Date;
  biweeklyPayment?: number;
}

export interface AmortizationEntry {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  isOneTimePayment?: boolean;
}

export interface OneTimePayment {
  month: number;
  amount: number;
}

export type PaymentFrequency = 'monthly' | 'biweekly';

@Injectable({
  providedIn: 'root'
})
export class MortgageCalculatorService {
  
  /**
   * Calculate mortgage details
   * @param loanAmount - Principal loan amount
   * @param annualRate - Annual interest rate (percentage)
   * @param years - Loan term in years
   * @param extraPayment - Optional extra monthly payment
   * @param paymentFrequency - Payment frequency (monthly or biweekly)
   * @param oneTimePayments - Array of one-time extra payments
   * @returns Mortgage calculation results
   */
  calculateMortgage(
    loanAmount: number, 
    annualRate: number, 
    years: number, 
    extraPayment: number = 0,
    paymentFrequency: PaymentFrequency = 'monthly',
    oneTimePayments: OneTimePayment[] = []
  ): MortgageResult {
    const monthlyRate = annualRate / 100 / 12;
    const numberOfPayments = years * 12;
    
    // Calculate monthly payment using mortgage formula
    let monthlyPayment = 0;
    if (monthlyRate === 0) {
      monthlyPayment = loanAmount / numberOfPayments;
    } else {
      monthlyPayment = loanAmount * 
        (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
        (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    }
    
    const totalPayment = monthlyPayment * numberOfPayments;
    const totalInterest = totalPayment - loanAmount;
    
    // Calculate bi-weekly payment if selected
    let biweeklyPayment = 0;
    if (paymentFrequency === 'biweekly') {
      biweeklyPayment = monthlyPayment / 2;
    }
    
    // Generate amortization schedule
    const amortizationSchedule = this.generateAmortizationSchedule(
      loanAmount, 
      monthlyRate, 
      monthlyPayment, 
      numberOfPayments,
      extraPayment,
      paymentFrequency,
      oneTimePayments
    );
    
    const result: MortgageResult = {
      monthlyPayment,
      totalPayment,
      totalInterest,
      amortizationSchedule,
      biweeklyPayment: paymentFrequency === 'biweekly' ? biweeklyPayment : undefined
    };

    // Calculate savings with extra payments or bi-weekly
    if (extraPayment > 0 || paymentFrequency === 'biweekly' || oneTimePayments.length > 0) {
      const withExtra = this.calculateWithExtraPayments(
        loanAmount,
        monthlyRate,
        monthlyPayment,
        extraPayment,
        numberOfPayments,
        paymentFrequency,
        oneTimePayments
      );
      
      result.totalPayment = withExtra.totalPaid;
      result.totalInterest = withExtra.totalInterest;
      result.interestSaved = totalInterest - withExtra.totalInterest;
      result.monthsSaved = numberOfPayments - withExtra.monthsToPayoff;
      
      const today = new Date();
      result.payoffDate = new Date(
        today.getFullYear() + Math.floor(withExtra.monthsToPayoff / 12),
        today.getMonth() + (withExtra.monthsToPayoff % 12)
      );
    }
    
    return result;
  }
  
  /**
   * Generate detailed amortization schedule
   */
  private generateAmortizationSchedule(
    loanAmount: number, 
    monthlyRate: number, 
    monthlyPayment: number, 
    numberOfPayments: number,
    extraPayment: number = 0,
    paymentFrequency: PaymentFrequency = 'monthly',
    oneTimePayments: OneTimePayment[] = []
  ): AmortizationEntry[] {
    const schedule: AmortizationEntry[] = [];
    let remainingBalance = loanAmount;
    let month = 1;
    
    // For bi-weekly, we make 26 payments per year (52 weeks / 2)
    const paymentsPerYear = paymentFrequency === 'biweekly' ? 26 : 12;
    const paymentAmount = paymentFrequency === 'biweekly' ? monthlyPayment / 2 : monthlyPayment;
    
    while (remainingBalance > 0 && month <= numberOfPayments) {
      // Calculate base payment
      let periodicPayment = paymentFrequency === 'biweekly' 
        ? (paymentAmount * 26 / 12)  // Convert bi-weekly to monthly equivalent
        : paymentAmount;
      
      // Add regular extra payment
      let totalPayment = periodicPayment + extraPayment;
      
      // Check for one-time extra payment this month
      const oneTimePayment = oneTimePayments.find(p => p.month === month);
      const isOneTime = !!oneTimePayment;
      if (oneTimePayment) {
        totalPayment += oneTimePayment.amount;
      }
      
      const interestPayment = remainingBalance * monthlyRate;
      let principalPayment = totalPayment - interestPayment;
      
      // If this payment will pay off the loan
      if (principalPayment >= remainingBalance) {
        principalPayment = remainingBalance;
        remainingBalance = 0;
      } else {
        remainingBalance -= principalPayment;
      }
      
      schedule.push({
        month,
        payment: totalPayment,
        principal: principalPayment,
        interest: interestPayment,
        balance: Math.max(0, remainingBalance),
        isOneTimePayment: isOneTime
      });
      
      if (remainingBalance === 0) break;
      month++;
    }
    
    return schedule;
  }

  /**
   * Calculate with extra payments
   */
  private calculateWithExtraPayments(
    principal: number,
    monthlyRate: number,
    regularPayment: number,
    extraPayment: number,
    maxMonths: number,
    paymentFrequency: PaymentFrequency = 'monthly',
    oneTimePayments: OneTimePayment[] = []
  ): { totalPaid: number; totalInterest: number; monthsToPayoff: number } {
    let balance = principal;
    let totalPaid = 0;
    let totalInterest = 0;
    let month = 0;
    
    const basePayment = paymentFrequency === 'biweekly' 
      ? (regularPayment / 2 * 26 / 12)  // Bi-weekly equivalent
      : regularPayment;

    while (balance > 0 && month < maxMonths) {
      month++;
      
      // Check for one-time payment this month
      const oneTimePayment = oneTimePayments.find(p => p.month === month);
      const oneTimeAmount = oneTimePayment ? oneTimePayment.amount : 0;
      
      const interestPayment = balance * monthlyRate;
      const totalPaymentThisMonth = basePayment + extraPayment + oneTimeAmount;
      const principalPayment = totalPaymentThisMonth - interestPayment;
      
      if (principalPayment >= balance) {
        totalPaid += balance + interestPayment;
        totalInterest += interestPayment;
        balance = 0;
      } else {
        balance -= principalPayment;
        totalPaid += totalPaymentThisMonth;
        totalInterest += interestPayment;
      }
    }

    return {
      totalPaid,
      totalInterest,
      monthsToPayoff: month
    };
  }
  
  /**
   * Format currency value
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }
}
