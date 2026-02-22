// Dynamic imports for heavy PDF libraries - only loaded when needed
let cachedJsPDF: typeof import('jspdf').default | null = null;

const getJsPDF = async () => {
  if (!cachedJsPDF) {
    const { default: jsPDF } = await import('jspdf');
    cachedJsPDF = jsPDF;
  }
  return cachedJsPDF;
};

const BRAND: [number, number, number] = [30, 58, 95]; // #1e3a5f — matches form header
const BRAND_LIGHT: [number, number, number] = [230, 238, 243];
const GRAY: [number, number, number] = [100, 116, 139];
const DARK: [number, number, number] = [30, 41, 59];
const BLUE: [number, number, number] = [37, 99, 235]; // pickup accent
const BLUE_LIGHT: [number, number, number] = [239, 246, 255];
const ORANGE: [number, number, number] = [234, 88, 12]; // return accent
const ORANGE_LIGHT: [number, number, number] = [255, 247, 237];
const GREEN: [number, number, number] = [22, 163, 74]; // driver accent
const GREEN_LIGHT: [number, number, number] = [240, 253, 244];

export interface TaxiTransferPdfData {
  transferNumber?: string;
  tripType: string;
  status: string;
  guestName: string;
  boatName?: string;
  contactNumber?: string;
  numberOfGuests?: number;
  pickupDate?: string;
  pickupTime?: string;
  pickupLocation?: string;
  pickupLocationUrl?: string;
  pickupDropoff?: string;
  pickupDropoffUrl?: string;
  returnDate?: string;
  returnTime?: string;
  returnLocation?: string;
  returnLocationUrl?: string;
  returnDropoff?: string;
  returnDropoffUrl?: string;
  taxiCompanyName?: string;
  driverName?: string;
  driverPhone?: string;
  vanNumberPlate?: string;
  paidBy: string;
  amount?: number;
  currency: string;
  paymentNote?: string;
  guestNote?: string;
  driverNote?: string;
}

const tripTypeLabels: Record<string, string> = {
  pickup_only: 'Pick-up Only',
  return_only: 'Return Only',
  round_trip: 'Round Trip',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  assigned: 'Driver Assigned',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const paidByLabels: Record<string, string> = {
  guest: 'Guest',
  agency: 'Agency',
  faraway: 'Faraway',
};

function fmtDate(d?: string): string {
  if (!d) return '-';
  const date = new Date(d + 'T00:00:00');
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

export async function generateTaxiTransferPdf(data: TaxiTransferPdfData): Promise<void> {
  const jsPDF = await getJsPDF();
  const doc = new jsPDF();
  const pageW = 210;
  const margin = 16;
  const contentW = pageW - margin * 2;
  let y = 0;

  // ── Header bar ──
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageW, 38, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('TAXI TRANSFER', margin, 16);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (data.transferNumber) {
    doc.text(data.transferNumber, margin, 26);
  }
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, pageW - margin, 26, { align: 'right' });
  // Accent line
  doc.setFillColor(...BRAND_LIGHT);
  doc.rect(0, 38, pageW, 2, 'F');
  y = 50;

  // ── Helpers ──
  const sectionHeader = (title: string, accent: [number, number, number], bg: [number, number, number]) => {
    doc.setFillColor(...bg);
    doc.roundedRect(margin, y - 4, contentW, 10, 1.5, 1.5, 'F');
    doc.setTextColor(...accent);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin + 4, y + 3);
    y += 12;
  };

  const infoRow = (label: string, value: string, url?: string) => {
    if (!value || value === '-') return;
    doc.setTextColor(...GRAY);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(label, margin + 4, y);
    if (url) {
      doc.setTextColor(...BLUE);
      doc.textWithLink(value, margin + 52, y, { url });
    } else {
      doc.setTextColor(...DARK);
      doc.text(value, margin + 52, y);
    }
    y += 6;
  };

  const locationRow = (label: string, location?: string, url?: string) => {
    if (!location && !url) return;
    doc.setTextColor(...GRAY);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(label, margin + 4, y);
    if (location && url) {
      // Show location name as clickable link
      doc.setTextColor(...BLUE);
      doc.textWithLink(location, margin + 52, y, { url });
      y += 6;
    } else if (location) {
      doc.setTextColor(...DARK);
      doc.text(location, margin + 52, y);
      y += 6;
    } else if (url) {
      // Only URL, no location name — show as clickable "Google Maps" link
      doc.setTextColor(...BLUE);
      doc.textWithLink('View on Google Maps', margin + 52, y, { url });
      y += 6;
    }
  };

  const checkNewPage = (needed: number) => {
    if (y + needed > 270) {
      doc.addPage();
      y = 20;
    }
  };

  // ── Status / Trip Type / Guests row ──
  const statusText = statusLabels[data.status] || data.status;
  const tripText = tripTypeLabels[data.tripType] || data.tripType;
  doc.setTextColor(...GRAY);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Status:', margin, y);
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.text(statusText, margin + 18, y);
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  doc.text('Trip Type:', margin + 60, y);
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.text(tripText, margin + 82, y);
  if (data.numberOfGuests) {
    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'normal');
    doc.text('Guests:', margin + 130, y);
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(String(data.numberOfGuests), margin + 150, y);
  }
  y += 12;

  // ── Guest Info ──
  sectionHeader('GUEST INFORMATION', BRAND, BRAND_LIGHT);
  infoRow('Guest Name', data.guestName);
  if (data.boatName) infoRow('Boat', data.boatName);
  if (data.contactNumber) infoRow('Contact', data.contactNumber);
  y += 4;

  // ── Pick-up ──
  if (data.tripType !== 'return_only' && (data.pickupDate || data.pickupTime || data.pickupLocation || data.pickupLocationUrl || data.pickupDropoff || data.pickupDropoffUrl)) {
    checkNewPage(50);
    sectionHeader('PICK-UP', BLUE, BLUE_LIGHT);
    if (data.pickupDate) infoRow('Date', fmtDate(data.pickupDate));
    if (data.pickupTime) infoRow('Time', data.pickupTime);
    locationRow('From', data.pickupLocation, data.pickupLocationUrl);
    locationRow('Drop-off', data.pickupDropoff, data.pickupDropoffUrl);
    y += 4;
  }

  // ── Return ──
  if (data.tripType !== 'pickup_only' && (data.returnDate || data.returnTime || data.returnLocation || data.returnLocationUrl || data.returnDropoff || data.returnDropoffUrl)) {
    checkNewPage(50);
    sectionHeader('RETURN', ORANGE, ORANGE_LIGHT);
    if (data.returnDate) infoRow('Date', fmtDate(data.returnDate));
    if (data.returnTime) infoRow('Time', data.returnTime);
    locationRow('From', data.returnLocation, data.returnLocationUrl);
    locationRow('Drop-off', data.returnDropoff, data.returnDropoffUrl);
    y += 4;
  }

  // ── Driver & Company ──
  if (data.taxiCompanyName || data.driverName) {
    checkNewPage(40);
    sectionHeader('DRIVER & COMPANY', GREEN, GREEN_LIGHT);
    if (data.taxiCompanyName) infoRow('Company', data.taxiCompanyName);
    if (data.driverName) infoRow('Driver', data.driverName);
    if (data.driverPhone) infoRow('Phone', data.driverPhone);
    if (data.vanNumberPlate) infoRow('Vehicle', data.vanNumberPlate);
    y += 4;
  }

  // ── Payment ──
  checkNewPage(30);
  sectionHeader('PAYMENT', BRAND, BRAND_LIGHT);
  infoRow('Paid By', paidByLabels[data.paidBy] || data.paidBy);
  if (data.amount) {
    infoRow('Amount', `${data.currency} ${data.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  }
  if (data.paymentNote) infoRow('Note', data.paymentNote);
  y += 4;

  // ── Notes ──
  if (data.guestNote || data.driverNote) {
    checkNewPage(30);
    sectionHeader('NOTES', GRAY, BRAND_LIGHT);
    if (data.guestNote) {
      doc.setTextColor(...GRAY);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text('Guest Note:', margin + 4, y);
      y += 5;
      doc.setTextColor(...DARK);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      const guestLines = doc.splitTextToSize(data.guestNote, contentW - 8);
      doc.text(guestLines, margin + 4, y);
      y += guestLines.length * 4.5 + 4;
    }
    if (data.driverNote) {
      doc.setTextColor(...GRAY);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text('Driver Note:', margin + 4, y);
      y += 5;
      doc.setTextColor(...DARK);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      const driverLines = doc.splitTextToSize(data.driverNote, contentW - 8);
      doc.text(driverLines, margin + 4, y);
      y += driverLines.length * 4.5 + 4;
    }
  }

  // ── Footer ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const footerY = 284;
    doc.setDrawColor(...BRAND_LIGHT);
    doc.line(margin, footerY - 4, pageW - margin, footerY - 4);
    doc.setTextColor(...BRAND);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Faraway Yachting', pageW / 2, footerY, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text('Phuket, Thailand  |  booking@faraway-yachting.com', pageW / 2, footerY + 5, { align: 'center' });
  }

  // ── Save ──
  const filename = data.transferNumber
    ? `taxi-transfer-${data.transferNumber}.pdf`
    : `taxi-transfer-${data.guestName.replace(/\s+/g, '-')}.pdf`;
  doc.save(filename);
}
