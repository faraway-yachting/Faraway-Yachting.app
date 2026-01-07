import { PDFDocument, rgb } from 'pdf-lib';

// Thai abbreviated month names
const THAI_MONTHS_ABBR = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

// Dynamic import of fontkit to avoid SSR issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let fontkitInstance: any = null;
const getFontkit = async () => {
  if (!fontkitInstance) {
    const fontkit = await import('@pdf-lib/fontkit');
    fontkitInstance = fontkit.default || fontkit;
  }
  return fontkitInstance;
};

export interface WhtCertificateData {
  // Payer (ผู้มีหน้าที่หักภาษี ณ ที่จ่าย)
  payerName: string;
  payerTaxId: string;
  payerAddress: string;

  // Payee (ผู้ถูกหักภาษี ณ ที่จ่าย)
  payeeName: string;
  payeeTaxId: string;
  payeeAddress: string;

  // Document
  certificateNumber: string;
  bookNumber?: string; // เล่มที่

  // Transaction
  paymentDate: { day: number; month: number; year: number }; // Buddhist year
  paymentAmount: number;
  whtAmount: number;
  whtAmountWords: string; // Thai words
  incomeDescription?: string; // Description for row 6 "อื่นๆ ระบุ" (e.g., "ค่าบริการ")

  // Form type
  formType: 'pnd3' | 'pnd53';
}

/**
 * Field coordinates for the WHT 50ทวิ form
 * PDF coordinates: origin (0,0) at bottom-left, A4 = ~595 x 842 points
 *
 * These coordinates are approximate and may need adjustment based on the actual PDF.
 * Use a PDF coordinate viewer to fine-tune these values.
 */
const FIELD_COORDS = {
  // Book and certificate number (top right dotted lines)
  // Based on debug: should be around x:545, y:805 area
  bookNumber: { x: 545, y: 805 },
  // Round 23: left 2mm (-6pt)
  certificateNumber: { x: 517, y: 767 },

  // Payer section (ผู้มีหน้าที่หักภาษี) - yellow header area
  // Round 6: raise Tax ID, Name by 2mm (~6pt), move Name/Address right by 10mm (~28pt)
  // Round 7: Tax ID X shifted left to compensate for group gaps (4 gaps × 4px = 16px total)
  payerTaxId13: { x: 378, y: 747, spacing: 13.0 },  // Round 12: down 1mm (-3pt)
  payerName: { x: 63, y: 730 },      // Round 11: left 5mm (-14pt), down 1mm (-3pt)
  payerAddress: { x: 63, y: 707 },   // Round 11: left 5mm (-14pt)

  // Payee section (ผู้ถูกหักภาษี) - yellow header area
  // Round 8: raise Tax ID 10mm, raise Name/Address 4mm, move Name/Address right 10mm
  // Round 9: lower Tax ID 5mm (-14pt)
  // Tax ID X shifted left to compensate for group gaps (4 gaps × 4px)
  payeeTaxId13: { x: 378, y: 677, spacing: 13.0 },  // y: 691-14=677
  payeeName: { x: 66, y: 659 },      // x: 38+28=66, y: 648+11=659
  payeeAddress: { x: 66, y: 631 },   // Round 10: lowered 3mm (-8pt), y: 639-8=631

  // Form type checkboxes (ลำดับที่ในแบบ)
  // Debug shows: first row y:~598, second row y:~583
  formTypeSequence: { x: 78, y: 598 }, // Box for sequence number
  pnd1a: { x: 168, y: 598 },       // (1) ภ.ง.ด.1ก
  pnd1aSpecial: { x: 242, y: 598 }, // (2) ภ.ง.ด.1ก พิเศษ
  pnd2: { x: 330, y: 598 },        // (3) ภ.ง.ด.2
  pnd3: { x: 398, y: 598 },        // (4) ภ.ง.ด.3
  pnd2a: { x: 168, y: 583 },       // (5) ภ.ง.ด.2ก
  pnd3a: { x: 242, y: 583 },       // (6) ภ.ง.ด.3ก
  pnd53: { x: 330, y: 583 },       // (7) ภ.ง.ด.53

  // Income row 6 (อื่นๆ ระบุ) - Round 13 adjustments
  incomeRow6: { y: 202 },                 // down 3mm (-8pt): 210-8=202
  row6Description: { x: 99, y: 202 },     // right 4mm (+11pt), down 3mm: x:88+11=99, y:202
  dateCol: { x: 344 },                    // left 5mm (-14pt): 358-14=344
  amountColRight: { x: 486 },             // right 5mm (+14pt): 472+14=486
  whtColRight: { x: 558 },                // right 1mm (+3pt): 555+3=558

  // Totals row - Round 13 adjustments
  totalAmountRight: { x: 486, y: 180 },   // right 5mm (+14pt), down 3mm (-8pt): x:472+14=486, y:188-8=180
  totalWhtRight: { x: 558, y: 180 },      // right 1mm (+3pt), down 3mm (-8pt): x:555+3=558, y:188-8=180
  whtAmountWords: { x: 188, y: 162 },     // right 7mm (+20pt), down 3mm (-8pt): x:168+20=188, y:170-8=162

  // Payment type checkboxes (ผู้จ่ายเงิน)
  // Round 17: up 1.3cm (+37pt), right 1cm (+28pt)
  withheldAtSource: { x: 90, y: 134 },
  paidForever: { x: 162, y: 125 },
  paidOnce: { x: 258, y: 125 },
  otherPayment: { x: 348, y: 125 },

  // Certification section - split into day/month/year
  // Round 20: separate fields for day, Thai month abbreviation, Buddhist year
  signatureDateDay: { x: 345, y: 77 },
  signatureDateMonth: { x: 390, y: 77 },
  signatureDateYear: { x: 455, y: 77 },
};

/**
 * Format number with Thai formatting
 */
function formatNumber(num: number): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format date as DD/MM/YYYY
 */
function formatDate(date: { day: number; month: number; year: number }): string {
  const day = String(date.day).padStart(2, '0');
  const month = String(date.month).padStart(2, '0');
  return `${day}/${month}/${date.year}`;
}

/**
 * Fill the WHT 50ทวิ certificate PDF with provided data
 */
export async function fillWhtCertificate(data: WhtCertificateData): Promise<Uint8Array> {
  // Fetch the blank PDF template
  const templateUrl = '/forms/wht-50-tawi.pdf';
  const templateBytes = await fetch(templateUrl).then(res => {
    if (!res.ok) throw new Error('Failed to load WHT form template');
    return res.arrayBuffer();
  });

  // Load the PDF
  const pdfDoc = await PDFDocument.load(templateBytes);

  // Register fontkit for custom fonts (dynamic import)
  const fontkitModule = await getFontkit();
  pdfDoc.registerFontkit(fontkitModule);

  // Load Thai font
  const fontUrl = '/fonts/Sarabun-Regular.ttf';
  const fontBytes = await fetch(fontUrl).then(res => {
    if (!res.ok) throw new Error('Failed to load Thai font');
    return res.arrayBuffer();
  });
  const thaiFont = await pdfDoc.embedFont(fontBytes, { subset: true });

  // Get the first page
  const page = pdfDoc.getPages()[0];
  const fontSize = 10;
  const smallFontSize = 9;

  // Helper to draw text
  const drawText = (text: string, x: number, y: number, size = fontSize) => {
    if (!text) return;
    page.drawText(text, {
      x,
      y,
      size,
      font: thaiFont,
      color: rgb(0, 0, 0),
    });
  };

  // Helper to draw right-aligned text (x is the right edge)
  const drawTextRightAligned = (text: string, rightX: number, y: number, size = fontSize) => {
    if (!text) return;
    const textWidth = thaiFont.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: rightX - textWidth,
      y,
      size,
      font: thaiFont,
      color: rgb(0, 0, 0),
    });
  };

  // Helper to draw tax ID in boxes (each digit separately)
  // Thai Tax ID pattern: X-XXXX-XXXXX-XX-X (1-4-5-2-1 grouping)
  // Gaps after positions 1, 5, 10, 12 (0-indexed: 0, 4, 9, 11)
  const drawTaxIdInBoxes = (taxId: string, startX: number, y: number, spacing: number, maxDigits: number) => {
    const cleanId = taxId.replace(/\D/g, '');
    const gapAfterIndices = [0, 4, 9, 11]; // gaps between groups
    const gapWidth = 4; // extra pixels for group separator (matches form box gaps)

    let currentX = startX;
    for (let i = 0; i < Math.min(cleanId.length, maxDigits); i++) {
      drawText(cleanId[i], currentX, y, smallFontSize);
      currentX += spacing;
      if (gapAfterIndices.includes(i)) {
        currentX += gapWidth;
      }
    }
  };

  // Fill in document numbers
  if (data.bookNumber) {
    drawText(data.bookNumber, FIELD_COORDS.bookNumber.x, FIELD_COORDS.bookNumber.y, smallFontSize);
  }
  drawText(data.certificateNumber, FIELD_COORDS.certificateNumber.x, FIELD_COORDS.certificateNumber.y, 8); // 15% smaller than smallFontSize

  // Fill in payer section
  drawTaxIdInBoxes(data.payerTaxId, FIELD_COORDS.payerTaxId13.x, FIELD_COORDS.payerTaxId13.y, FIELD_COORDS.payerTaxId13.spacing, 13);
  drawText(data.payerName, FIELD_COORDS.payerName.x, FIELD_COORDS.payerName.y);
  drawText(data.payerAddress, FIELD_COORDS.payerAddress.x, FIELD_COORDS.payerAddress.y, smallFontSize);

  // Fill in payee section
  drawTaxIdInBoxes(data.payeeTaxId, FIELD_COORDS.payeeTaxId13.x, FIELD_COORDS.payeeTaxId13.y, FIELD_COORDS.payeeTaxId13.spacing, 13);
  drawText(data.payeeName, FIELD_COORDS.payeeName.x, FIELD_COORDS.payeeName.y);
  drawText(data.payeeAddress, FIELD_COORDS.payeeAddress.x, FIELD_COORDS.payeeAddress.y, smallFontSize);

  // Form type checkbox removed - form already has pre-printed checkboxes

  // Fill in income data - always use row 6 (อื่นๆ ระบุ) with combined totals
  const rowY = FIELD_COORDS.incomeRow6.y;
  if (data.incomeDescription) {
    drawText(data.incomeDescription, FIELD_COORDS.row6Description.x, rowY, smallFontSize);
  }
  drawText(formatDate(data.paymentDate), FIELD_COORDS.dateCol.x, rowY, smallFontSize);
  drawTextRightAligned(formatNumber(data.paymentAmount), FIELD_COORDS.amountColRight.x, rowY, smallFontSize);
  drawTextRightAligned(formatNumber(data.whtAmount), FIELD_COORDS.whtColRight.x, rowY, smallFontSize);

  // Fill in totals (right-aligned)
  drawTextRightAligned(formatNumber(data.paymentAmount), FIELD_COORDS.totalAmountRight.x, FIELD_COORDS.totalAmountRight.y);
  drawTextRightAligned(formatNumber(data.whtAmount), FIELD_COORDS.totalWhtRight.x, FIELD_COORDS.totalWhtRight.y);
  drawText(`(${data.whtAmountWords})`, FIELD_COORDS.whtAmountWords.x, FIELD_COORDS.whtAmountWords.y, smallFontSize);

  // Payment type checkbox removed - form already has default selection

  // Fill in signature date (split into day/month/year)
  drawText(String(data.paymentDate.day), FIELD_COORDS.signatureDateDay.x, FIELD_COORDS.signatureDateDay.y, smallFontSize);
  drawText(THAI_MONTHS_ABBR[data.paymentDate.month - 1], FIELD_COORDS.signatureDateMonth.x, FIELD_COORDS.signatureDateMonth.y, smallFontSize);
  drawText(String(data.paymentDate.year), FIELD_COORDS.signatureDateYear.x, FIELD_COORDS.signatureDateYear.y, smallFontSize);

  // Flatten the form to make it non-editable (removes form fields)
  // Wrap in try-catch as some PDFs may not have form fields
  try {
    const form = pdfDoc.getForm();
    form.flatten();
  } catch {
    // PDF doesn't have form fields, which is fine
  }

  // Save and return
  return await pdfDoc.save();
}

/**
 * Convert number to Thai words for currency
 */
export function numberToThaiWords(num: number): string {
  const units = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const positions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

  if (num === 0) return 'ศูนย์บาทถ้วน';

  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);

  let result = '';
  let remaining = intPart;
  let position = 0;

  while (remaining > 0) {
    const digit = remaining % 10;
    if (digit !== 0) {
      if (position === 1 && digit === 1) {
        result = 'สิบ' + result;
      } else if (position === 1 && digit === 2) {
        result = 'ยี่สิบ' + result;
      } else if (position === 0 && digit === 1 && intPart > 10) {
        result = 'เอ็ด' + result;
      } else {
        result = units[digit] + positions[position] + result;
      }
    }
    remaining = Math.floor(remaining / 10);
    position++;
  }

  result += 'บาท';

  if (decPart > 0) {
    const decStr = decPart.toString().padStart(2, '0');
    const d1 = parseInt(decStr[0]);
    const d2 = parseInt(decStr[1]);

    if (d1 === 1) {
      result += 'สิบ';
    } else if (d1 === 2) {
      result += 'ยี่สิบ';
    } else if (d1 > 0) {
      result += units[d1] + 'สิบ';
    }

    if (d2 === 1 && d1 > 0) {
      result += 'เอ็ด';
    } else if (d2 > 0) {
      result += units[d2];
    }

    result += 'สตางค์';
  } else {
    result += 'ถ้วน';
  }

  // Normalize Unicode to ensure proper Thai character combining
  return result.normalize('NFC');
}
