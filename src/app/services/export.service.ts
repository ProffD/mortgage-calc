import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { MortgageResult, AmortizationEntry } from './mortgage-calculator.service';

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  /**
   * Export mortgage details to PDF
   */
  exportToPDF(
    loanAmount: number,
    annualRate: number,
    loanTerm: number,
    extraPayment: number,
    paymentFrequency: string,
    result: MortgageResult
  ): void {
    const doc = new jsPDF();
    const currentDate = new Date().toLocaleDateString();

    // Title
    doc.setFontSize(20);
    doc.setTextColor(102, 126, 234);
    doc.text('Mortgage Calculator Report', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on ${currentDate}`, 105, 28, { align: 'center' });

    // Loan Details Section
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Loan Details', 14, 45);
    
    doc.setFontSize(11);
    const loanDetails = [
      ['Loan Amount:', this.formatCurrency(loanAmount)],
      ['Annual Interest Rate:', annualRate.toFixed(2) + '%'],
      ['Loan Term:', loanTerm + ' years'],
      ['Payment Frequency:', paymentFrequency === 'biweekly' ? 'Bi-Weekly' : 'Monthly'],
      ['Extra Monthly Payment:', this.formatCurrency(extraPayment)]
    ];

    autoTable(doc, {
      startY: 50,
      head: [],
      body: loanDetails,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 80 },
        1: { cellWidth: 60 }
      }
    });

    // Payment Summary Section
    const finalY = (doc as any).lastAutoTable.finalY || 90;
    doc.setFontSize(14);
    doc.text('Payment Summary', 14, finalY + 15);

    const summaryData = [
      ['Monthly Payment:', this.formatCurrency(result.monthlyPayment)],
      ['Total Payment:', this.formatCurrency(result.totalPayment)],
      ['Total Interest:', this.formatCurrency(result.totalInterest)]
    ];

    if (result.biweeklyPayment) {
      summaryData.unshift(['Bi-Weekly Payment:', this.formatCurrency(result.biweeklyPayment)]);
    }

    if (result.interestSaved && result.interestSaved > 0) {
      summaryData.push(
        ['Interest Saved:', this.formatCurrency(result.interestSaved)],
        ['Time Saved:', result.monthsSaved + ' months'],
        ['Payoff Date:', result.payoffDate?.toLocaleDateString() || 'N/A']
      );
    }

    autoTable(doc, {
      startY: finalY + 20,
      head: [],
      body: summaryData,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 80 },
        1: { cellWidth: 60, fontStyle: 'bold', textColor: [102, 126, 234] }
      }
    });

    // New page for Amortization Schedule
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Amortization Schedule', 14, 20);

    const scheduleData = result.amortizationSchedule.map(entry => [
      entry.month.toString(),
      this.formatCurrency(entry.payment),
      this.formatCurrency(entry.principal),
      this.formatCurrency(entry.interest),
      this.formatCurrency(entry.balance),
      entry.isOneTimePayment ? '💰' : ''
    ]);

    autoTable(doc, {
      startY: 25,
      head: [['Month', 'Payment', 'Principal', 'Interest', 'Balance', 'Extra']],
      body: scheduleData,
      theme: 'striped',
      headStyles: { fillColor: [102, 126, 234], textColor: 255 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 20 },
        1: { halign: 'right', cellWidth: 30 },
        2: { halign: 'right', cellWidth: 30 },
        3: { halign: 'right', cellWidth: 30 },
        4: { halign: 'right', cellWidth: 30 },
        5: { halign: 'center', cellWidth: 15 }
      },
      didParseCell: function(data) {
        const row = scheduleData[data.row.index];
        if (row && row[5] === '💰') {
          data.cell.styles.fillColor = [255, 247, 237];
        }
      }
    });

    // Save the PDF
    doc.save(`mortgage-report-${currentDate.replace(/\//g, '-')}.pdf`);
  }

  /**
   * Export mortgage details to Excel
   */
  exportToExcel(
    loanAmount: number,
    annualRate: number,
    loanTerm: number,
    extraPayment: number,
    paymentFrequency: string,
    result: MortgageResult
  ): void {
    const workbook = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      ['Mortgage Calculator Report'],
      ['Generated on:', new Date().toLocaleDateString()],
      [],
      ['LOAN DETAILS'],
      ['Loan Amount', this.formatCurrency(loanAmount)],
      ['Annual Interest Rate', annualRate.toFixed(2) + '%'],
      ['Loan Term', loanTerm + ' years'],
      ['Payment Frequency', paymentFrequency === 'biweekly' ? 'Bi-Weekly' : 'Monthly'],
      ['Extra Monthly Payment', this.formatCurrency(extraPayment)],
      [],
      ['PAYMENT SUMMARY'],
      ['Monthly Payment', this.formatCurrency(result.monthlyPayment)],
      ['Total Payment', this.formatCurrency(result.totalPayment)],
      ['Total Interest', this.formatCurrency(result.totalInterest)]
    ];

    if (result.biweeklyPayment) {
      summaryData.splice(11, 0, ['Bi-Weekly Payment', this.formatCurrency(result.biweeklyPayment)]);
    }

    if (result.interestSaved && result.interestSaved > 0) {
      summaryData.push(
        [],
        ['SAVINGS WITH EXTRA PAYMENTS'],
        ['Interest Saved', this.formatCurrency(result.interestSaved)],
        ['Time Saved', result.monthsSaved + ' months'],
        ['Payoff Date', result.payoffDate?.toLocaleDateString() || 'N/A']
      );
    }

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Set column widths
    summarySheet['!cols'] = [
      { wch: 25 },
      { wch: 20 }
    ];

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Amortization Schedule Sheet
    const scheduleData: any[][] = [
      ['Month', 'Payment', 'Principal', 'Interest', 'Balance', 'One-Time Payment']
    ];

    result.amortizationSchedule.forEach(entry => {
      scheduleData.push([
        entry.month,
        entry.payment,
        entry.principal,
        entry.interest,
        entry.balance,
        entry.isOneTimePayment ? 'Yes' : ''
      ]);
    });

    const scheduleSheet = XLSX.utils.aoa_to_sheet(scheduleData);
    
    // Set column widths
    scheduleSheet['!cols'] = [
      { wch: 8 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 18 }
    ];

    XLSX.utils.book_append_sheet(workbook, scheduleSheet, 'Amortization Schedule');

    // Save the Excel file
    const currentDate = new Date().toLocaleDateString().replace(/\//g, '-');
    XLSX.writeFile(workbook, `mortgage-report-${currentDate}.xlsx`);
  }

  /**
   * Format currency value
   */
  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }
}
