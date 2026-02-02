import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { generateReceiptHtml, type ReceiptTemplateData } from '@/lib/pdf/receiptHtmlTemplate';

export async function POST(request: NextRequest) {
  let browser = null;

  try {
    const data: ReceiptTemplateData = await request.json();

    // Validate required fields
    if (!data.receiptNumber || !data.companyName || !data.clientName) {
      return NextResponse.json(
        { error: 'Missing required fields: receiptNumber, companyName, clientName' },
        { status: 400 }
      );
    }

    // Generate HTML from template
    const html = generateReceiptHtml(data);

    // Launch Puppeteer browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--font-render-hinting=none',
      ],
    });

    const page = await browser.newPage();

    // Set content and wait for it to load
    await page.setContent(html, {
      waitUntil: 'networkidle0',
    });

    // Generate PDF with A4 format
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0mm',
        bottom: '0mm',
        left: '0mm',
        right: '0mm',
      },
      preferCSSPageSize: true,
    });

    await browser.close();
    browser = null;

    // Return PDF as response (Buffer.from converts Uint8Array to proper Buffer for NextResponse)
    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Receipt_${data.receiptNumber}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);

    // Clean up browser if still open
    if (browser) {
      try {
        await browser.close();
      } catch {
        // Ignore close errors
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to generate PDF',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Also support GET for testing (with query params)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const receiptNumber = searchParams.get('receiptNumber') || 'TEST-001';

  // Create test data for preview
  const testData: ReceiptTemplateData = {
    receiptNumber,
    receiptDate: new Date().toISOString().split('T')[0],
    companyName: 'Test Company Ltd.',
    companyAddress: '123 Test Street, Test City',
    companyPhone: '012-345-6789',
    companyEmail: 'test@example.com',
    companyTaxId: '1234567890123',
    isVatRegistered: true,
    clientName: 'Test Client',
    clientAddress: '456 Client Road',
    clientEmail: 'client@example.com',
    lineItems: [
      {
        description: 'Test Service',
        quantity: 1,
        unitPrice: 1000,
        amount: 1000,
        taxRate: 7,
      },
    ],
    pricingType: 'exclude_vat',
    subtotal: 1000,
    taxAmount: 70,
    whtAmount: 0,
    totalAmount: 1070,
    currency: 'THB',
    payments: [
      {
        date: new Date().toISOString().split('T')[0],
        amount: 1070,
        receivedAt: 'Bank Transfer',
      },
    ],
    notes: 'This is a test receipt.',
  };

  // Redirect to POST handler with test data
  const response = await POST(
    new NextRequest(request.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    })
  );

  return response;
}
