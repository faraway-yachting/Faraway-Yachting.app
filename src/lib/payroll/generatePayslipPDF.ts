import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PayrollSlip } from '@/lib/supabase/api/payrollSlips';
import { companiesApi } from '@/lib/supabase/api/companies';

const BRAND_COLOR: [number, number, number] = [90, 122, 143]; // #5A7A8F
const AWAY_CHARTERS = {
  name: 'Away Charters Global Co., Ltd.',
  address: 'Phuket, Thailand',
};

function formatMoney(n: number): string {
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatAddress(addr: any): string {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  const parts = [addr.line1, addr.line2, addr.city, addr.state, addr.postal_code, addr.country].filter(Boolean);
  return parts.join(', ');
}

// ──────────────────────────────────────────────
// 1. Total Salary Summary PDF
// ──────────────────────────────────────────────
export async function generateSummaryPDF(slip: PayrollSlip, period: string, thaiCompany: any): Promise<jsPDF> {
  const doc = new jsPDF();
  const emp = slip.employee || {};
  const empName = emp.full_name_en || 'Employee';

  // Header
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text('SALARY SUMMARY', 14, 14);
  doc.setFontSize(10);
  doc.text(period, 14, 22);

  // Employee info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.text(`Employee: ${empName}`, 14, 38);
  doc.setFontSize(9);
  doc.text(`ID: ${emp.employee_id || '-'}`, 14, 44);
  doc.text(`Position: ${emp.position || '-'}`, 14, 50);
  if (emp.full_name_th) doc.text(`ชื่อ: ${emp.full_name_th}`, 120, 38);

  // Earnings table
  const empCurrency = (slip as any).employee_currency || 'THB';
  const fxRate = Number((slip as any).fx_rate) || 1;
  const baseSalaryOriginal = Number((slip as any).base_salary_original) || 0;
  const awayCharterOriginal = Number((slip as any).away_charter_original) || 0;
  const awayCurrency = (slip as any).away_charter_currency || 'THB';

  const earningsRows: any[][] = [
    ['Base Salary' + (empCurrency !== 'THB' ? ` (${formatMoney(baseSalaryOriginal)} ${empCurrency} @${fxRate})` : ''), formatMoney(slip.base_salary)],
  ];
  if (Number(slip.charter_bonus) > 0) earningsRows.push(['Charter Bonus', formatMoney(slip.charter_bonus)]);
  if (Number(slip.overtime_amount) > 0) earningsRows.push(['Overtime', formatMoney(slip.overtime_amount)]);
  if (Number(slip.commission_amount) > 0) earningsRows.push(['Commission', formatMoney(slip.commission_amount)]);
  if (Number(slip.allowances) > 0) earningsRows.push(['Allowances', formatMoney(slip.allowances)]);
  if (Number(slip.other_earnings) > 0) earningsRows.push(['Other Earnings', formatMoney(slip.other_earnings)]);
  earningsRows.push([{ content: 'Gross Pay', styles: { fontStyle: 'bold' } }, { content: formatMoney(slip.gross_pay), styles: { fontStyle: 'bold' } }]);

  autoTable(doc, {
    startY: 56,
    head: [['Earnings', 'Amount (THB)']],
    body: earningsRows,
    theme: 'grid',
    headStyles: { fillColor: BRAND_COLOR },
    styles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });

  const afterEarnings = (doc as any).lastAutoTable.finalY + 6;

  // Deductions table
  const deductionRows: any[][] = [];
  if (Number(slip.ssf_employee) > 0) deductionRows.push(['Social Security Fund (SSF)', formatMoney(slip.ssf_employee)]);
  if (Number(slip.withholding_tax) > 0) deductionRows.push(['Withholding Tax', formatMoney(slip.withholding_tax)]);
  if (Number(slip.advance_deduction) > 0) deductionRows.push(['Advance Deduction', formatMoney(slip.advance_deduction)]);
  if (Number(slip.other_deductions) > 0) deductionRows.push(['Other Deductions', formatMoney(slip.other_deductions)]);
  deductionRows.push([{ content: 'Total Deductions', styles: { fontStyle: 'bold' } }, { content: formatMoney(slip.total_deductions), styles: { fontStyle: 'bold' } }]);

  autoTable(doc, {
    startY: afterEarnings,
    head: [['Deductions', 'Amount (THB)']],
    body: deductionRows,
    theme: 'grid',
    headStyles: { fillColor: [220, 53, 69] },
    styles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });

  const afterDeductions = (doc as any).lastAutoTable.finalY + 6;

  // Net Pay
  doc.setFillColor(240, 253, 244);
  doc.rect(14, afterDeductions, 182, 12, 'F');
  doc.setFontSize(12);
  doc.setTextColor(21, 128, 61);
  doc.text(`Net Pay: ${formatMoney(slip.net_pay)} THB`, 18, afterDeductions + 8);

  // Payment split
  const afterNet = afterDeductions + 20;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text('Payment Split', 14, afterNet);

  const splitRows: any[][] = [];
  if (thaiCompany && Number(slip.thai_company_amount) > 0) {
    splitRows.push([thaiCompany.name + ' (THB)', formatMoney(slip.thai_company_amount)]);
  }
  if (awayCurrency !== 'THB' && awayCharterOriginal > 0) {
    splitRows.push([AWAY_CHARTERS.name + ` (${awayCurrency})`, formatMoney(awayCharterOriginal)]);
  } else {
    splitRows.push([AWAY_CHARTERS.name + ' (THB)', formatMoney(slip.away_charter_amount)]);
  }

  autoTable(doc, {
    startY: afterNet + 3,
    head: [['Paid By', 'Amount']],
    body: splitRows,
    theme: 'grid',
    headStyles: { fillColor: BRAND_COLOR },
    styles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });

  // Charter bonus detail
  if (slip.earnings_detail && slip.earnings_detail.length > 0) {
    const afterSplit = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(10);
    doc.text('Charter Bonus Detail', 14, afterSplit);

    autoTable(doc, {
      startY: afterSplit + 3,
      head: [['Description', 'Amount (THB)']],
      body: slip.earnings_detail.map((e: any) => [e.label || '-', formatMoney(e.amount || 0)]),
      theme: 'grid',
      headStyles: { fillColor: [100, 140, 160] },
      styles: { fontSize: 8 },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    });
  }

  // Deduction detail
  if (slip.deductions_detail && slip.deductions_detail.length > 0) {
    const afterPrev = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Deduction Detail', 14, afterPrev);

    autoTable(doc, {
      startY: afterPrev + 3,
      head: [['Description', 'Amount (THB)']],
      body: slip.deductions_detail.map((d: any) => [d.label || '-', formatMoney(d.amount || 0)]),
      theme: 'grid',
      headStyles: { fillColor: [220, 53, 69] },
      styles: { fontSize: 8 },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    });
  }

  return doc;
}

// ──────────────────────────────────────────────
// 2. Thai Company Payslip PDF
// ──────────────────────────────────────────────
export async function generateThaiPayslipPDF(slip: PayrollSlip, period: string, thaiCompany: any): Promise<jsPDF | null> {
  if (!thaiCompany || Number(slip.thai_company_amount) <= 0) return null;

  const doc = new jsPDF();
  const emp = slip.employee || {};

  // Company header
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, 210, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text(thaiCompany.name, 14, 12);
  doc.setFontSize(8);
  if (thaiCompany.tax_id) doc.text(`Tax ID: ${thaiCompany.tax_id}`, 14, 18);
  if (thaiCompany.registered_address) doc.text(formatAddress(thaiCompany.registered_address), 14, 24);
  doc.setFontSize(12);
  doc.text('PAYSLIP / ใบจ่ายเงินเดือน', 140, 12);
  doc.setFontSize(9);
  doc.text(period, 140, 18);

  // Employee details
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  const y = 42;
  doc.text(`Employee / พนักงาน: ${emp.full_name_en || '-'}`, 14, y);
  if (emp.full_name_th) doc.text(emp.full_name_th, 120, y);
  doc.setFontSize(9);
  doc.text(`ID: ${emp.employee_id || '-'}`, 14, y + 6);
  doc.text(`Position: ${emp.position || '-'}`, 14, y + 12);

  // Thai registered salary
  const thaiSalary = Number(emp.thai_registered_salary) || Number(slip.thai_company_amount) + Number(slip.ssf_employee);

  const rows: any[][] = [
    ['เงินเดือน / Salary', formatMoney(thaiSalary)],
  ];

  autoTable(doc, {
    startY: y + 18,
    head: [['รายการ / Description', 'จำนวนเงิน / Amount (THB)']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: BRAND_COLOR },
    styles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });

  const afterIncome = (doc as any).lastAutoTable.finalY + 4;

  // Deductions
  const dedRows: any[][] = [
    ['ประกันสังคม / Social Security Fund', formatMoney(slip.ssf_employee)],
  ];
  if (Number(slip.withholding_tax) > 0) {
    dedRows.push(['ภาษีหัก ณ ที่จ่าย / Withholding Tax', formatMoney(slip.withholding_tax)]);
  }
  if (Number(slip.advance_deduction) > 0) {
    dedRows.push(['เงินเบิกล่วงหน้า / Advance Deduction', formatMoney(slip.advance_deduction)]);
  }
  if (Number(slip.other_deductions) > 0) {
    dedRows.push(['หักอื่นๆ / Other Deductions', formatMoney(slip.other_deductions)]);
  }

  autoTable(doc, {
    startY: afterIncome,
    head: [['หัก / Deductions', 'จำนวนเงิน / Amount (THB)']],
    body: dedRows,
    theme: 'grid',
    headStyles: { fillColor: [220, 53, 69] },
    styles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });

  const afterDed = (doc as any).lastAutoTable.finalY + 6;

  // Net
  doc.setFillColor(240, 253, 244);
  doc.rect(14, afterDed, 182, 12, 'F');
  doc.setFontSize(12);
  doc.setTextColor(21, 128, 61);
  doc.text(`รับสุทธิ / Net Pay: ${formatMoney(slip.thai_company_amount)} THB`, 18, afterDed + 8);

  // Deduction detail on Thai payslip
  let afterNote = afterDed + 16;
  if (slip.deductions_detail && slip.deductions_detail.length > 0) {
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('รายละเอียดหัก / Deduction Detail', 14, afterNote);

    autoTable(doc, {
      startY: afterNote + 3,
      head: [['รายการ / Description', 'จำนวนเงิน / Amount (THB)']],
      body: slip.deductions_detail.map((d: any) => [d.label || '-', formatMoney(d.amount || 0)]),
      theme: 'grid',
      headStyles: { fillColor: [220, 53, 69] },
      styles: { fontSize: 8 },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    });
    afterNote = (doc as any).lastAutoTable.finalY + 6;
  }

  // SSF employer note
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.text(`Employer SSF contribution: ${formatMoney(slip.ssf_employer)} THB`, 14, afterNote + 6);

  return doc;
}

// ──────────────────────────────────────────────
// 3. Away Charter Invoice PDF
// ──────────────────────────────────────────────
export async function generateAwayCharterInvoicePDF(slip: PayrollSlip, period: string): Promise<jsPDF | null> {
  if (Number(slip.away_charter_amount) <= 0) return null;

  const doc = new jsPDF();
  const emp = slip.employee || {};
  const description = emp.away_charter_description || 'Guest service';

  // Invoice header
  doc.setFillColor(234, 88, 12); // orange
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text('INVOICE', 14, 14);
  doc.setFontSize(10);
  doc.text(period, 14, 22);

  // From (employee)
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text('FROM:', 14, 38);
  doc.setFontSize(11);
  doc.text(emp.full_name_en || 'Employee', 14, 44);
  if (emp.full_name_th) {
    doc.setFontSize(9);
    doc.text(emp.full_name_th, 14, 50);
  }

  // Bill to
  doc.setFontSize(10);
  doc.text('BILL TO:', 120, 38);
  doc.setFontSize(11);
  doc.text(AWAY_CHARTERS.name, 120, 44);
  doc.setFontSize(9);
  doc.text(AWAY_CHARTERS.address, 120, 50);

  // Invoice items - show in employee's currency
  const invoiceCurrency = (slip as any).away_charter_currency || 'THB';
  const invoiceAmount = invoiceCurrency !== 'THB' && Number((slip as any).away_charter_original) > 0
    ? Number((slip as any).away_charter_original)
    : Number(slip.away_charter_amount);

  autoTable(doc, {
    startY: 58,
    head: [['Description', 'Period', `Amount (${invoiceCurrency})`]],
    body: [
      [description, period, formatMoney(invoiceAmount)],
    ],
    foot: [['', { content: 'Total', styles: { fontStyle: 'bold' } }, { content: formatMoney(invoiceAmount), styles: { fontStyle: 'bold' } }]],
    theme: 'grid',
    headStyles: { fillColor: [234, 88, 12] },
    styles: { fontSize: 10 },
    columnStyles: { 2: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });

  const afterTable = (doc as any).lastAutoTable.finalY + 20;

  // Signature
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Signature: ___________________________', 14, afterTable);
  doc.text(`Name: ${emp.full_name_en || ''}`, 14, afterTable + 8);
  doc.text(`Date: _______________`, 14, afterTable + 16);

  return doc;
}

// ──────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────

export async function generateSingleEmployeePDFs(slip: PayrollSlip, period: string): Promise<void> {
  const emp = slip.employee || {};
  const empName = (emp.full_name_en || 'employee').replace(/\s+/g, '_');

  // Load Thai company if applicable
  let thaiCompany: any = null;
  if (slip.thai_company_id) {
    try {
      thaiCompany = await companiesApi.getById(slip.thai_company_id);
    } catch { /* ignore */ }
  }

  // Generate all 3 PDFs
  const summary = await generateSummaryPDF(slip, period, thaiCompany);
  summary.save(`${empName}_summary_${period.replace(/\s+/g, '_')}.pdf`);

  const thaiSlip = await generateThaiPayslipPDF(slip, period, thaiCompany);
  if (thaiSlip) {
    thaiSlip.save(`${empName}_thai_payslip_${period.replace(/\s+/g, '_')}.pdf`);
  }

  const invoice = await generateAwayCharterInvoicePDF(slip, period);
  if (invoice) {
    invoice.save(`${empName}_away_charter_invoice_${period.replace(/\s+/g, '_')}.pdf`);
  }
}

export async function generateAllPayslipPDFs(slips: PayrollSlip[], period: string): Promise<void> {
  // Load all unique Thai companies
  const companyIds = [...new Set(slips.map(s => s.thai_company_id).filter(Boolean))] as string[];
  const companyMap = new Map<string, any>();
  for (const id of companyIds) {
    try {
      const company = await companiesApi.getById(id);
      if (company) companyMap.set(id, company);
    } catch { /* ignore */ }
  }

  for (const slip of slips) {
    const emp = slip.employee || {};
    const empName = (emp.full_name_en || 'employee').replace(/\s+/g, '_');
    const thaiCompany = slip.thai_company_id ? companyMap.get(slip.thai_company_id) || null : null;
    const periodSlug = period.replace(/\s+/g, '_');

    const summary = await generateSummaryPDF(slip, period, thaiCompany);
    summary.save(`${empName}_summary_${periodSlug}.pdf`);

    const thaiSlip = await generateThaiPayslipPDF(slip, period, thaiCompany);
    if (thaiSlip) thaiSlip.save(`${empName}_thai_payslip_${periodSlug}.pdf`);

    const invoice = await generateAwayCharterInvoicePDF(slip, period);
    if (invoice) invoice.save(`${empName}_away_charter_invoice_${periodSlug}.pdf`);
  }
}
