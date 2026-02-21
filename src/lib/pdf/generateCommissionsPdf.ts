// Dynamic imports for heavy PDF libraries - only loaded when needed
let cachedJsPDF: typeof import('jspdf').default | null = null;
let cachedAutoTable: typeof import('jspdf-autotable').default | null = null;

const getPDFLibs = async () => {
  if (!cachedJsPDF || !cachedAutoTable) {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    cachedJsPDF = jsPDF;
    cachedAutoTable = autoTable;
  }
  return { jsPDF: cachedJsPDF, autoTable: cachedAutoTable };
};

const BRAND: [number, number, number] = [90, 122, 143]; // #5A7A8F
const BRAND_LIGHT: [number, number, number] = [230, 238, 243];
const GRAY: [number, number, number] = [100, 116, 139];
const DARK: [number, number, number] = [30, 41, 59];
const GREEN: [number, number, number] = [21, 128, 61];
const TEAL: [number, number, number] = [15, 118, 110];

export interface CommissionPdfRecord {
  boatName: string;
  charterDateFrom: string | null;
  charterDateTo: string | null;
  charterType: string | null;
  charterFee: number;
  managementFee: number;
  netIncome: number;
  ownershipPercentage: number;
  commissionBase: number;
  commissionRate: number;
  totalCommission: number;
  ownerName: string;
  currency: string;
  isEarned: boolean;
  paymentStatus: string;
  source: string;
}

export interface CommissionPdfSummary {
  totalCommission: number;
  earnedCommission: number;
  paidCommission: number;
  byOwner: { name: string; totalCommission: number; count: number }[];
}

export interface CommissionPdfOptions {
  records: CommissionPdfRecord[];
  summary: CommissionPdfSummary;
  periodLabel: string;
  filterDescription?: string;
}

function fmtMoney(n: number, currency: string = 'THB'): string {
  return `${currency} ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: string | null): string {
  if (!d) return '-';
  const [y, m, day] = d.split('-');
  return `${day}.${m}.${y}`;
}

function fmtCharterType(type: string | null): string {
  if (!type) return '-';
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateCommissionsPdf(options: CommissionPdfOptions): Promise<void> {
  const { jsPDF, autoTable } = await getPDFLibs();
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageW = 297;
  const pageH = 210;
  const margin = 12;
  const contentW = pageW - margin * 2;
  let y = 0;

  // ── Header bar ──
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('COMMISSION REPORT', margin, 13);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(options.periodLabel, margin, 22);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, pageW - margin, 22, { align: 'right' });
  doc.setFillColor(...BRAND_LIGHT);
  doc.rect(0, 28, pageW, 1.5, 'F');
  y = 36;

  // ── Summary Cards ──
  const cardW = (contentW - 9) / 4;
  const cardH = 22;
  const cards = [
    { label: 'TOTAL COMMISSION', value: fmtMoney(options.summary.totalCommission), sub: `${options.records.length} records`, color: BRAND },
    { label: 'EARNED', value: fmtMoney(options.summary.earnedCommission), sub: 'Charter completed', color: GREEN },
    { label: 'PAID', value: fmtMoney(options.summary.paidCommission), sub: options.summary.totalCommission > 0 ? `${Math.round((options.summary.paidCommission / options.summary.totalCommission) * 100)}% of total` : 'No commission', color: DARK },
    { label: 'UNPAID', value: fmtMoney(options.summary.totalCommission - options.summary.paidCommission), sub: 'Remaining', color: [180, 83, 9] as [number, number, number] },
  ];

  cards.forEach((card, i) => {
    const x = margin + i * (cardW + 3);
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, 'FD');
    doc.setTextColor(...GRAY);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text(card.label, x + 4, y + 6);
    doc.setTextColor(...card.color);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(card.value, x + 4, y + 14);
    doc.setTextColor(...GRAY);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text(card.sub, x + 4, y + 19);
  });

  y += cardH + 6;

  // ── By Sales Person breakdown ──
  if (options.summary.byOwner.length > 0) {
    doc.setFillColor(...BRAND_LIGHT);
    doc.roundedRect(margin, y - 2, contentW, 8, 1, 1, 'F');
    doc.setTextColor(...BRAND);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('COMMISSION BY SALES PERSON', margin + 4, y + 3);
    y += 10;

    const ownerRows = options.summary.byOwner
      .sort((a, b) => b.totalCommission - a.totalCommission)
      .map((o) => [
        o.name,
        String(o.count),
        fmtMoney(o.totalCommission),
      ]);

    autoTable(doc, {
      startY: y,
      head: [['Sales Person', 'Bookings', 'Commission']],
      body: ownerRows,
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { textColor: BRAND, fontStyle: 'bold', fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { halign: 'center', cellWidth: 30 },
        2: { halign: 'right', cellWidth: 50 },
      },
      margin: { left: margin, right: margin },
      tableWidth: 160,
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ── Filter description ──
  if (options.filterDescription) {
    doc.setTextColor(...GRAY);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.text(`Filters: ${options.filterDescription}`, margin, y);
    y += 5;
  }

  // ── Main Commission Table ──
  doc.setFillColor(...BRAND_LIGHT);
  doc.roundedRect(margin, y - 2, contentW, 8, 1, 1, 'F');
  doc.setTextColor(...BRAND);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('COMMISSION DETAILS', margin + 4, y + 3);
  y += 10;

  const tableHead = [
    ['Boat', 'Charter Date', 'Type', 'Charter Fee', 'Mgmt Fee', 'Net Income', 'Own%', 'FA Share', 'Rate', 'Commission', 'Sales Person', 'Status'],
  ];

  const tableBody = options.records.map((r) => {
    const dateStr = r.charterDateFrom
      ? (r.charterDateTo && r.charterDateTo !== r.charterDateFrom
        ? `${fmtDate(r.charterDateFrom)} - ${fmtDate(r.charterDateTo)}`
        : fmtDate(r.charterDateFrom))
      : '-';

    return [
      r.boatName,
      dateStr,
      fmtCharterType(r.charterType),
      fmtMoney(r.charterFee, r.currency),
      fmtMoney(r.managementFee, r.currency),
      fmtMoney(r.netIncome, r.currency),
      `${r.ownershipPercentage}%`,
      fmtMoney(r.commissionBase, r.currency),
      `${r.commissionRate}%`,
      fmtMoney(r.totalCommission, r.currency),
      r.ownerName,
      r.isEarned ? (r.paymentStatus === 'paid' ? 'Paid' : 'Earned') : 'Pending',
    ];
  });

  autoTable(doc, {
    startY: y,
    head: tableHead,
    body: tableBody,
    theme: 'striped',
    styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
    headStyles: {
      fillColor: BRAND,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.5,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 32 },   // Boat
      1: { cellWidth: 32 },   // Date
      2: { cellWidth: 22 },   // Type
      3: { halign: 'right', cellWidth: 24 }, // Charter Fee
      4: { halign: 'right', cellWidth: 22 }, // Mgmt Fee
      5: { halign: 'right', cellWidth: 24 }, // Net Income
      6: { halign: 'center', cellWidth: 12 }, // Own%
      7: { halign: 'right', cellWidth: 24 }, // FA Share
      8: { halign: 'center', cellWidth: 12 }, // Rate
      9: { halign: 'right', cellWidth: 24 }, // Commission
      10: { cellWidth: 28 },  // Sales Person
      11: { halign: 'center', cellWidth: 17 }, // Status
    },
    margin: { left: margin, right: margin },
    didDrawPage: (data: any) => {
      // Footer on every page
      const pageNum = doc.getNumberOfPages();
      doc.setTextColor(...GRAY);
      doc.setFontSize(7);
      doc.text(
        `Faraway Yachting — Commission Report — Page ${data.pageNumber} of ${pageNum}`,
        pageW / 2, pageH - 6,
        { align: 'center' }
      );
    },
  });

  // Fix page count in footer (re-draw footers with correct total)
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    // White-out old footer area
    doc.setFillColor(255, 255, 255);
    doc.rect(0, pageH - 10, pageW, 10, 'F');
    // Draw accent line
    doc.setDrawColor(...BRAND_LIGHT);
    doc.line(margin, pageH - 10, pageW - margin, pageH - 10);
    // Footer text
    doc.setTextColor(...GRAY);
    doc.setFontSize(7);
    doc.text(
      `Faraway Yachting — Commission Report — Page ${i} of ${totalPages}`,
      pageW / 2, pageH - 5,
      { align: 'center' }
    );
  }

  // Download
  const filename = `commission-report-${options.periodLabel.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
