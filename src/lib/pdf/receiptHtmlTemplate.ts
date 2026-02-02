/**
 * Receipt HTML Template for PDF Generation
 *
 * This template generates HTML that exactly matches the ReceiptPrintView.tsx component
 * for consistent PDF output when using Puppeteer.
 */

export interface ReceiptTemplateData {
  // Document info
  receiptNumber: string;
  receiptDate: string;
  reference?: string;

  // Company info
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyTaxId?: string;
  isVatRegistered?: boolean;

  // Client info
  clientName: string;
  clientAddress?: string;
  clientEmail?: string;
  clientTaxId?: string;

  // Charter info (optional)
  charterType?: string;
  charterDateFrom?: string;
  charterDateTo?: string;
  charterTime?: string;

  // Line items
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    taxRate?: number;
    whtRate?: number | string;
    customWhtAmount?: number;
  }>;

  // Pricing type
  pricingType?: 'no_vat' | 'exclude_vat' | 'include_vat';

  // Totals
  subtotal: number;
  taxAmount: number;
  whtAmount: number;
  totalAmount: number;
  netAmountToPay?: number;
  currency: string;

  // Payments
  payments: Array<{
    date: string;
    amount: number;
    receivedAt: string;
    remark?: string;
  }>;

  // Additional
  notes?: string;
  createdBy?: string;
}

/**
 * Format currency with proper locale
 */
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date for display (matches the Print Preview format)
 */
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Escape HTML entities to prevent XSS
 */
function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate the complete HTML document for the receipt
 * This matches the exact layout of ReceiptPrintView.tsx Print Preview
 */
export function generateReceiptHtml(data: ReceiptTemplateData): string {
  const validLineItems = data.lineItems.filter(
    (item) => item.description.trim() !== '' || item.unitPrice > 0
  );

  // Check if any line item has WHT
  const hasWht = data.lineItems.some(
    (item) =>
      (typeof item.whtRate === 'number' && item.whtRate !== 0) ||
      (item.whtRate === 'custom' && item.customWhtAmount)
  );

  const showVatColumn = data.pricingType !== 'no_vat';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=210mm, height=297mm">
  <title>${escapeHtml(data.companyName)} ${escapeHtml(data.receiptNumber)}</title>
  <style>
    @page {
      size: A4;
      margin: 0;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #111827;
      background: white;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 15mm 20mm;
      background: white;
      margin: 0 auto;
    }

    /* Header Section */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #1f2937;
    }

    .company-info h1 {
      font-size: 16px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 5px;
    }

    .company-details {
      font-size: 10px;
      color: #4b5563;
      line-height: 1.6;
    }

    .document-title {
      text-align: right;
    }

    .document-title h2 {
      font-size: 24px;
      font-weight: 700;
      color: #1f2937;
      letter-spacing: 0.02em;
    }

    .page-number {
      font-size: 9px;
      color: #9ca3af;
      margin-top: 2px;
    }

    /* Client & Document Info Grid */
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    .client-section {
      flex: 1;
    }

    .section-label {
      font-size: 9px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 5px;
    }

    .client-name {
      font-size: 13px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 3px;
    }

    .client-details {
      font-size: 10px;
      color: #4b5563;
      line-height: 1.5;
    }

    .doc-info {
      text-align: right;
    }

    .doc-info table {
      margin-left: auto;
      font-size: 10px;
    }

    .doc-info td {
      padding: 2px 0;
    }

    .doc-info td:first-child {
      color: #6b7280;
      padding-right: 15px;
      text-align: right;
    }

    .doc-info td:last-child {
      font-weight: 600;
      color: #111827;
      text-align: left;
    }

    /* Line Items Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 10px;
    }

    .items-table thead {
      background-color: #f3f4f6;
    }

    .items-table th {
      padding: 10px 12px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border-bottom: 1px solid #e5e7eb;
    }

    .items-table th.center { text-align: center; }
    .items-table th.right { text-align: right; }

    .items-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
    }

    .items-table td.center { text-align: center; }
    .items-table td.right { text-align: right; }
    .items-table td.description { white-space: pre-line; }
    .items-table td.amount { font-weight: 500; }

    /* Totals Section */
    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 25px;
    }

    .totals-table {
      width: 280px;
      font-size: 10px;
    }

    .totals-table td {
      padding: 5px 0;
    }

    .totals-table td:first-child {
      text-align: right;
      padding-right: 20px;
    }

    .totals-table td:last-child {
      text-align: right;
      min-width: 100px;
    }

    .totals-table .subtotal-row td {
      color: #4b5563;
    }

    .totals-table .total-row {
      border-top: 2px solid #1f2937;
    }

    .totals-table .total-row td {
      padding-top: 10px;
      font-size: 12px;
      font-weight: 700;
      color: #111827;
    }

    /* Notes Section */
    .notes-section {
      margin-bottom: 25px;
    }

    .notes-label {
      font-size: 9px;
      font-weight: 700;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 5px;
    }

    .notes-content {
      font-size: 10px;
      color: #4b5563;
      line-height: 1.6;
      white-space: pre-line;
    }

    /* Payment Records */
    .payments-section {
      margin-bottom: 25px;
    }

    .payments-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }

    .payments-table thead {
      background-color: #f3f4f6;
    }

    .payments-table th {
      padding: 6px 10px;
      text-align: left;
      font-weight: 600;
      color: #374151;
    }

    .payments-table th.right { text-align: right; }

    .payments-table td {
      padding: 6px 10px;
      border-bottom: 1px solid #e5e7eb;
    }

    .payments-table td.right {
      text-align: right;
      font-weight: 500;
    }

    /* Signature Section */
    .signature-section {
      margin-top: 30px;
    }

    .signature-label {
      font-size: 9px;
      font-weight: 700;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 25px;
    }

    .signature-line {
      width: 180px;
      border-bottom: 1px solid #9ca3af;
      margin-bottom: 5px;
    }

    .signature-name {
      font-size: 10px;
      color: #111827;
    }

    .signature-date {
      font-size: 10px;
      color: #6b7280;
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="company-info">
        <h1>${escapeHtml(data.companyName)}</h1>
        <div class="company-details">
          ${data.companyAddress ? `<div>${escapeHtml(data.companyAddress)}</div>` : ''}
          ${data.companyPhone ? `<div>Tel: ${escapeHtml(data.companyPhone)}${data.companyEmail ? ` | Email: ${escapeHtml(data.companyEmail)}` : ''}</div>` : (data.companyEmail ? `<div>Email: ${escapeHtml(data.companyEmail)}</div>` : '')}
          ${data.companyTaxId ? `<div>Tax ID: ${escapeHtml(data.companyTaxId)}</div>` : ''}
        </div>
      </div>
      <div class="document-title">
        <h2>RECEIPT</h2>
        <div class="page-number">Page 1/1</div>
      </div>
    </div>

    <!-- Client & Document Info -->
    <div class="info-section">
      <div class="client-section">
        <div class="section-label">RECEIVED FROM</div>
        <div class="client-name">${escapeHtml(data.clientName)}</div>
        <div class="client-details">
          ${data.clientAddress ? `<div>${escapeHtml(data.clientAddress)}</div>` : ''}
          ${data.clientEmail ? `<div>${escapeHtml(data.clientEmail)}</div>` : ''}
          ${data.clientTaxId ? `<div>Tax ID: ${escapeHtml(data.clientTaxId)}</div>` : ''}
        </div>
      </div>
      <div class="doc-info">
        <table>
          <tr>
            <td>Receipt No:</td>
            <td>${escapeHtml(data.receiptNumber)}</td>
          </tr>
          <tr>
            <td>Receipt Date:</td>
            <td>${formatDate(data.receiptDate)}</td>
          </tr>
          ${data.reference ? `
            <tr>
              <td>Reference:</td>
              <td>${escapeHtml(data.reference)}</td>
            </tr>
          ` : ''}
        </table>
      </div>
    </div>

    <!-- Line Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 30px;">#</th>
          <th>Description</th>
          <th class="center" style="width: 50px;">Qty</th>
          <th class="right" style="width: 90px;">Unit Price</th>
          ${showVatColumn ? '<th class="center" style="width: 50px;">VAT %</th>' : ''}
          ${hasWht ? '<th class="center" style="width: 50px;">WHT %</th>' : ''}
          <th class="right" style="width: 90px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${validLineItems.length === 0 ? `
          <tr>
            <td colspan="${5 + (showVatColumn ? 1 : 0) + (hasWht ? 1 : 0)}" style="text-align: center; padding: 30px; color: #9ca3af;">
              No line items
            </td>
          </tr>
        ` : validLineItems.map((item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td class="description">${escapeHtml(item.description)}</td>
            <td class="center">${item.quantity}</td>
            <td class="right">${formatCurrency(item.unitPrice, data.currency)}</td>
            ${showVatColumn ? `<td class="center">${item.taxRate || 0}%</td>` : ''}
            ${hasWht ? `
              <td class="center">
                ${item.whtRate !== 0 && item.whtRate !== 'custom'
                  ? `${item.whtRate}%`
                  : item.whtRate === 'custom' && item.customWhtAmount
                    ? formatCurrency(item.customWhtAmount, data.currency)
                    : '-'}
              </td>
            ` : ''}
            <td class="right amount">${formatCurrency(item.amount, data.currency)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals-section">
      <table class="totals-table">
        <tr class="subtotal-row">
          <td>Subtotal:</td>
          <td>${formatCurrency(data.subtotal, data.currency)}</td>
        </tr>
        ${data.pricingType !== 'no_vat' && data.taxAmount > 0 ? `
          <tr class="subtotal-row">
            <td>VAT (${data.pricingType === 'include_vat' ? 'Included' : 'Added'}):</td>
            <td>${formatCurrency(data.taxAmount, data.currency)}</td>
          </tr>
        ` : ''}
        <tr class="total-row">
          <td>Total:</td>
          <td>${formatCurrency(data.totalAmount, data.currency)}</td>
        </tr>
        ${data.whtAmount > 0 ? `
          <tr class="subtotal-row">
            <td>Withholding Tax:</td>
            <td>-${formatCurrency(data.whtAmount, data.currency)}</td>
          </tr>
          ${data.netAmountToPay !== undefined ? `
            <tr>
              <td style="font-weight: 600;">Net Amount to Pay:</td>
              <td style="font-weight: 600;">${formatCurrency(data.netAmountToPay, data.currency)}</td>
            </tr>
          ` : ''}
        ` : ''}
      </table>
    </div>

    <!-- Notes -->
    ${data.notes ? `
      <div class="notes-section">
        <div class="notes-label">NOTES</div>
        <div class="notes-content">${escapeHtml(data.notes)}</div>
      </div>
    ` : ''}

    <!-- Payment Records -->
    ${data.payments && data.payments.length > 0 ? `
      <div class="payments-section">
        <div class="section-label">Payment Records</div>
        <table class="payments-table">
          <thead>
            <tr>
              <th style="width: 25px;">#</th>
              <th style="width: 90px;">Date</th>
              <th>Received At</th>
              <th>Remark</th>
              <th class="right" style="width: 90px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${data.payments.map((payment, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${formatDate(payment.date)}</td>
                <td>${escapeHtml(payment.receivedAt)}</td>
                <td style="color: #6b7280;">${payment.remark ? escapeHtml(payment.remark) : '-'}</td>
                <td class="right">${formatCurrency(payment.amount, data.currency)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}

    <!-- Signature -->
    <div class="signature-section">
      <div class="signature-label">RECEIVED BY</div>
      <div class="signature-line"></div>
      <div class="signature-name">${data.createdBy ? escapeHtml(data.createdBy) : '___________________'}</div>
      <div class="signature-date">${formatDate(data.receiptDate)}</div>
    </div>
  </div>
</body>
</html>
  `.trim();
}
