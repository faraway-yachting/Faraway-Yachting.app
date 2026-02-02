import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BRAND: [number, number, number] = [90, 122, 143]; // #5A7A8F
const BRAND_LIGHT: [number, number, number] = [230, 238, 243];
const GRAY: [number, number, number] = [100, 116, 139];
const DARK: [number, number, number] = [30, 41, 59];

export interface BookingSummaryData {
  bookingNumber: string;
  type: string;
  status: string;
  title: string;
  dateFrom: string;
  dateTo: string;
  time?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  numberOfGuests?: number;
  destination?: string;
  pickupLocation?: string;
  departureFrom?: string;
  arrivalTo?: string;
  extras?: string[];
  currency: string;
  charterFee?: number;
  extraCharges?: number;
  adminFee?: number;
  totalPrice?: number;
  depositAmount?: number;
  balanceAmount?: number;
  customerNotes?: string;
  boatName?: string;
  bookingOwnerName?: string;
}

const typeLabels: Record<string, string> = {
  day_charter: 'Day Charter',
  overnight_charter: 'Overnight Charter',
  cabin_charter: 'Cabin Charter',
};

const currencySymbols: Record<string, string> = {
  THB: '฿',
  USD: '$',
  EUR: '€',
  GBP: '£',
  SGD: 'S$',
  AED: 'AED ',
};

function fmtMoney(n: number, currency: string): string {
  const sym = currencySymbols[currency] || currency + ' ';
  return sym + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string): string {
  if (!d) return '-';
  const date = new Date(d + 'T00:00:00');
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function generateBookingSummaryPdf(data: BookingSummaryData): jsPDF {
  const doc = new jsPDF();
  const pageW = 210;
  const margin = 16;
  const contentW = pageW - margin * 2;
  let y = 0;

  // ── Header bar ──
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageW, 36, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('BOOKING CONFIRMATION', margin, 16);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Ref: ${data.bookingNumber}`, margin, 26);
  doc.text(`Date: ${fmtDate(new Date().toISOString().slice(0, 10))}`, pageW - margin, 26, { align: 'right' });
  // Thin accent line
  doc.setFillColor(...BRAND_LIGHT);
  doc.rect(0, 36, pageW, 2, 'F');
  y = 48;

  // ── Helper: section title ──
  const sectionTitle = (title: string) => {
    doc.setFillColor(...BRAND_LIGHT);
    doc.roundedRect(margin, y - 4, contentW, 10, 1, 1, 'F');
    doc.setTextColor(...BRAND);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin + 4, y + 3);
    y += 12;
  };

  // ── Helper: info row ──
  const infoRow = (label: string, value: string) => {
    if (!value || value === '-') return;
    doc.setTextColor(...GRAY);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(label, margin + 4, y);
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 50, y);
    y += 6;
  };

  // ── Customer Info ──
  sectionTitle('CUSTOMER');
  infoRow('Name', data.customerName);
  if (data.customerEmail) infoRow('Email', data.customerEmail);
  if (data.customerPhone) infoRow('Phone', data.customerPhone);
  if (data.numberOfGuests) infoRow('Guests', String(data.numberOfGuests));
  y += 4;

  // ── Charter Details ──
  sectionTitle('CHARTER DETAILS');
  infoRow('Type', typeLabels[data.type] || data.type);
  if (data.boatName) infoRow('Boat', data.boatName);
  infoRow('Date', data.dateFrom === data.dateTo
    ? fmtDate(data.dateFrom)
    : `${fmtDate(data.dateFrom)} — ${fmtDate(data.dateTo)}`);
  if (data.time) infoRow('Time', data.time);
  if (data.destination) infoRow('Destination', data.destination);
  if (data.pickupLocation) infoRow('Pickup', data.pickupLocation);
  if (data.departureFrom) infoRow('Departure', data.departureFrom);
  if (data.arrivalTo) infoRow('Arrival', data.arrivalTo);
  y += 4;

  // ── Extras ──
  if (data.extras && data.extras.length > 0) {
    sectionTitle('EXTRAS');
    doc.setTextColor(...DARK);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    const extrasText = data.extras.map(e => e.charAt(0).toUpperCase() + e.slice(1)).join('  •  ');
    doc.text(extrasText, margin + 4, y);
    y += 10;
  }

  // ── Pricing ──
  sectionTitle('PRICING');

  const rows: any[][] = [];
  const cur = data.currency || 'THB';
  if (data.charterFee) rows.push(['Charter Fee', fmtMoney(data.charterFee, cur)]);
  if (data.extraCharges) rows.push(['Extra Charges', fmtMoney(data.extraCharges, cur)]);
  if (data.adminFee) rows.push(['Admin Fee', fmtMoney(data.adminFee, cur)]);
  if (data.totalPrice != null) {
    rows.push([
      { content: 'Total', styles: { fontStyle: 'bold' as const } },
      { content: fmtMoney(data.totalPrice, cur), styles: { fontStyle: 'bold' as const } },
    ]);
  }

  if (rows.length > 0) {
    autoTable(doc, {
      startY: y,
      body: rows,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { halign: 'right' },
      },
      margin: { left: margin, right: margin },
      didDrawCell: (hookData: any) => {
        // Bottom border for each row
        if (hookData.section === 'body') {
          doc.setDrawColor(220, 220, 220);
          doc.line(
            hookData.cell.x, hookData.cell.y + hookData.cell.height,
            hookData.cell.x + hookData.cell.width, hookData.cell.y + hookData.cell.height
          );
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 4;
  }

  // Deposit / Balance
  if (data.depositAmount || data.balanceAmount) {
    y += 2;
    doc.setDrawColor(...BRAND_LIGHT);
    doc.line(margin, y, pageW - margin, y);
    y += 6;
    doc.setFontSize(8.5);
    if (data.depositAmount) {
      doc.setTextColor(...GRAY);
      doc.text('Deposit', margin + 4, y);
      doc.setTextColor(...DARK);
      doc.text(fmtMoney(data.depositAmount, cur), pageW - margin, y, { align: 'right' });
      y += 6;
    }
    if (data.balanceAmount) {
      doc.setTextColor(...GRAY);
      doc.text('Balance Due', margin + 4, y);
      doc.setTextColor(...DARK);
      doc.setFont('helvetica', 'bold');
      doc.text(fmtMoney(data.balanceAmount, cur), pageW - margin, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      y += 6;
    }
  }

  y += 6;

  // ── Customer Notes ──
  if (data.customerNotes) {
    sectionTitle('NOTES');
    doc.setTextColor(...DARK);
    doc.setFontSize(8.5);
    const lines = doc.splitTextToSize(data.customerNotes, contentW - 8);
    doc.text(lines, margin + 4, y);
    y += lines.length * 4.5 + 6;
  }

  // ── Footer ──
  const footerY = 275;
  doc.setDrawColor(...BRAND_LIGHT);
  doc.line(margin, footerY - 4, pageW - margin, footerY - 4);
  doc.setTextColor(...BRAND);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Thank you for choosing Faraway Yachting', pageW / 2, footerY, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text('Faraway Yachting Co., Ltd.  |  Phuket, Thailand  |  info@farawayyachting.com', pageW / 2, footerY + 6, { align: 'center' });

  return doc;
}
