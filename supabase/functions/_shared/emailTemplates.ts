/**
 * Shared email HTML templates for Faraway Yachting notifications.
 * Used by Edge Functions to generate email content.
 */

const BRAND_COLOR = '#5A7A8F';

function baseTemplate(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background-color: ${BRAND_COLOR}; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 600;">Faraway Yachting</h1>
    </div>
    <!-- Body -->
    <div style="background-color: white; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
      <h2 style="color: #111827; margin: 0 0 16px; font-size: 18px;">${title}</h2>
      ${body}
    </div>
    <!-- Footer -->
    <div style="text-align: center; padding: 16px; color: #9ca3af; font-size: 12px;">
      <p style="margin: 0;">Faraway Yachting Management System</p>
    </div>
  </div>
</body>
</html>`;
}

export function documentExpiryTemplate(
  employeeName: string,
  documentType: string,
  expiryDate: string,
  daysRemaining: number,
): string {
  const urgencyColor = daysRemaining <= 7 ? '#ef4444' : daysRemaining <= 14 ? '#f59e0b' : '#6b7280';
  return baseTemplate('Document Expiring Soon', `
    <p style="color: #374151; margin: 0 0 12px;">The following employee document is expiring soon:</p>
    <div style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0 0 8px; font-weight: 600; color: #92400e;">
        ${employeeName} — ${documentType}
      </p>
      <p style="margin: 0; color: #92400e;">
        Expires: <strong>${expiryDate}</strong>
        <span style="color: ${urgencyColor}; margin-left: 8px;">(${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining)</span>
      </p>
    </div>
    <p style="color: #6b7280; font-size: 14px; margin: 16px 0 0;">
      Please ensure this document is renewed before the expiry date.
    </p>
  `);
}

export function overdueInvoiceTemplate(
  invoiceNumber: string,
  clientName: string,
  amount: string,
  daysPastDue: number,
): string {
  return baseTemplate('Invoice Overdue', `
    <p style="color: #374151; margin: 0 0 12px;">The following invoice is past due:</p>
    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0 0 8px; font-weight: 600; color: #991b1b;">
        Invoice ${invoiceNumber}
      </p>
      <p style="margin: 0 0 4px; color: #991b1b;">Client: ${clientName}</p>
      <p style="margin: 0 0 4px; color: #991b1b;">Amount: <strong>${amount}</strong></p>
      <p style="margin: 0; color: #ef4444; font-weight: 600;">
        ${daysPastDue} day${daysPastDue !== 1 ? 's' : ''} overdue
      </p>
    </div>
    <p style="color: #6b7280; font-size: 14px; margin: 16px 0 0;">
      Please follow up with the client to arrange payment.
    </p>
  `);
}

export function leaveRequestTemplate(
  employeeName: string,
  action: 'approved' | 'rejected',
  leaveType: string,
  dateFrom: string,
  dateTo: string,
  reason?: string,
): string {
  const statusColor = action === 'approved' ? '#059669' : '#dc2626';
  const statusBg = action === 'approved' ? '#ecfdf5' : '#fef2f2';
  const statusBorder = action === 'approved' ? '#a7f3d0' : '#fecaca';

  return baseTemplate(`Leave Request ${action === 'approved' ? 'Approved' : 'Rejected'}`, `
    <p style="color: #374151; margin: 0 0 12px;">Hello ${employeeName},</p>
    <p style="color: #374151; margin: 0 0 16px;">Your leave request has been <strong style="color: ${statusColor};">${action}</strong>.</p>
    <div style="background-color: ${statusBg}; border: 1px solid ${statusBorder}; border-radius: 6px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0 0 4px; color: #374151;"><strong>Type:</strong> ${leaveType}</p>
      <p style="margin: 0 0 4px; color: #374151;"><strong>Dates:</strong> ${dateFrom} — ${dateTo}</p>
      ${reason ? `<p style="margin: 8px 0 0; color: #6b7280; font-size: 14px;"><strong>Reason:</strong> ${reason}</p>` : ''}
    </div>
  `);
}

export function bookingConfirmationTemplate(
  bookingNumber: string,
  customerName: string,
  boatName: string,
  dateFrom: string,
  dateTo: string,
  totalPrice?: string,
): string {
  return baseTemplate('Booking Confirmation', `
    <p style="color: #374151; margin: 0 0 12px;">Dear ${customerName},</p>
    <p style="color: #374151; margin: 0 0 16px;">Your booking has been confirmed. Here are the details:</p>
    <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0 0 4px; color: #0c4a6e;"><strong>Booking #:</strong> ${bookingNumber}</p>
      <p style="margin: 0 0 4px; color: #0c4a6e;"><strong>Boat:</strong> ${boatName}</p>
      <p style="margin: 0 0 4px; color: #0c4a6e;"><strong>Dates:</strong> ${dateFrom} — ${dateTo}</p>
      ${totalPrice ? `<p style="margin: 0; color: #0c4a6e;"><strong>Total:</strong> ${totalPrice}</p>` : ''}
    </div>
    <p style="color: #6b7280; font-size: 14px; margin: 16px 0 0;">
      Thank you for choosing Faraway Yachting. We look forward to welcoming you aboard!
    </p>
  `);
}
