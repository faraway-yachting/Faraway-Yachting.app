/**
 * Export Utilities for Bank Reconciliation
 *
 * Handles CSV and PDF exports for bank reconciliation data.
 */

import { BankFeedLine, ReconciliationStats } from '@/data/banking/bankReconciliationTypes';

/**
 * Export all bank lines to CSV
 */
export function exportBankLinesCSV(
  bankLines: BankFeedLine[],
  filename: string = 'bank-lines.csv'
): void {
  const headers = [
    'Date',
    'Value Date',
    'Description',
    'Reference',
    'Amount',
    'Currency',
    'Status',
    'Matched Amount',
    'Difference',
    'Running Balance',
    'Imported At',
    'Imported By',
    'Import Source',
    'Notes',
  ];

  const rows = bankLines.map(line => [
    line.transactionDate,
    line.valueDate,
    line.description,
    line.reference || '',
    line.amount.toString(),
    line.currency,
    line.status,
    line.matchedAmount.toString(),
    (Math.abs(line.amount) - line.matchedAmount).toString(),
    line.runningBalance?.toString() || '',
    line.importedAt,
    line.importedBy,
    line.importSource,
    line.notes || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  downloadCSV(csvContent, filename);
}

/**
 * Export unmatched/missing lines only
 */
export function exportUnmatchedCSV(
  bankLines: BankFeedLine[],
  filename: string = 'unmatched-lines.csv'
): void {
  const unmatchedLines = bankLines.filter(
    line => line.status === 'unmatched' || line.status === 'missing_record'
  );
  exportBankLinesCSV(unmatchedLines, filename);
}

/**
 * Export partially matched and needs review lines
 */
export function exportNeedsReviewCSV(
  bankLines: BankFeedLine[],
  filename: string = 'needs-review.csv'
): void {
  const reviewLines = bankLines.filter(
    line => line.status === 'partially_matched' || line.status === 'needs_review'
  );
  exportBankLinesCSV(reviewLines, filename);
}

/**
 * Export reconciliation summary as CSV (simplified version before PDF)
 */
export function exportReconciliationSummaryCSV(
  stats: ReconciliationStats,
  bankLines: BankFeedLine[],
  dateFrom: string,
  dateTo: string,
  filename: string = 'reconciliation-summary.csv'
): void {
  const content = [
    'Bank Reconciliation Summary',
    `Period: ${dateFrom} to ${dateTo}`,
    `Generated: ${new Date().toLocaleString()}`,
    '',
    'Statistics',
    `Total Bank Lines,${stats.totalBankLines}`,
    `Matched Lines,${stats.matchedLines}`,
    `Unmatched Lines,${stats.unmatchedLines}`,
    `Missing Records,${stats.missingRecordLines}`,
    `Needs Review,${stats.needsReviewLines}`,
    `Ignored Lines,${stats.ignoredLines}`,
    `System Records Not in Bank,${stats.systemRecordsNotInBank}`,
    '',
    'Financial Summary',
    `Total Bank Movement,${stats.totalBankMovement.toLocaleString()}`,
    `Total System Movement,${stats.totalSystemMovement.toLocaleString()}`,
    `Net Difference,${stats.netDifference.toLocaleString()}`,
    '',
    'Unmatched Transactions',
    'Date,Description,Reference,Amount,Currency,Status',
  ];

  const unmatchedLines = bankLines.filter(
    line => line.status === 'unmatched' || line.status === 'missing_record'
  );

  const unmatchedRows = unmatchedLines.map(line =>
    `"${line.transactionDate}","${line.description}","${line.reference || ''}",${line.amount},"${line.currency}","${line.status}"`
  );

  const csvContent = [...content, ...unmatchedRows].join('\n');
  downloadCSV(csvContent, filename);
}

/**
 * Helper to trigger CSV download
 */
function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Placeholder for PDF export
 */
export function exportReconciliationSummaryPDF(
  stats: ReconciliationStats,
  bankLines: BankFeedLine[],
  dateFrom: string,
  dateTo: string
): void {
  // TODO: Implement PDF generation using jsPDF or similar library
  // For now, show a message and fall back to CSV
  const userConfirmed = window.confirm(
    'PDF export is coming soon!\n\n' +
    'Would you like to download a CSV summary instead?'
  );

  if (userConfirmed) {
    exportReconciliationSummaryCSV(
      stats,
      bankLines,
      dateFrom,
      dateTo,
      `reconciliation-summary-${new Date().toISOString().split('T')[0]}.csv`
    );
  }
}
