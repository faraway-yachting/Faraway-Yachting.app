'use client';

import { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import type { PdfFieldSettings, DocumentType } from '@/data/settings/types';
import { getSamplePreviewData } from '@/data/settings/samplePreviewData';
import { formatCurrency, formatDate } from '@/lib/income/utils';

interface PdfPreviewPanelProps {
  fieldSettings: PdfFieldSettings;
  documentType: DocumentType;
  defaultTerms: string;
}

// Zoom levels: 42% (default), 60%, 80%, 100%
const ZOOM_LEVELS = [0.42, 0.6, 0.8, 1.0];
const ZOOM_LABELS = ['42%', '60%', '80%', '100%'];

export function PdfPreviewPanel({
  fieldSettings,
  documentType,
  defaultTerms,
}: PdfPreviewPanelProps) {
  const [zoomIndex, setZoomIndex] = useState(0); // Default to 42%
  const zoomLevel = ZOOM_LEVELS[zoomIndex];

  const { company, client, clientName, bankAccount, quotation, createdBy } =
    getSamplePreviewData();

  const handleZoomIn = () => {
    if (zoomIndex < ZOOM_LEVELS.length - 1) {
      setZoomIndex(zoomIndex + 1);
    }
  };

  const handleZoomOut = () => {
    if (zoomIndex > 0) {
      setZoomIndex(zoomIndex - 1);
    }
  };

  const handleResetZoom = () => {
    setZoomIndex(0);
  };

  // Calculate margin compensation based on zoom level
  const getMarginCompensation = () => {
    // At 42% scale, we need about -450px to compensate
    // At 100% scale, we need 0px
    const baseHeight = 297 * 3.78; // A4 height in pixels (approximately)
    const scaledHeight = baseHeight * zoomLevel;
    const originalHeight = baseHeight * 0.42; // Height at default zoom
    return -(scaledHeight - originalHeight);
  };

  // Use default terms from settings if quotation doesn't have custom terms
  const displayTerms = defaultTerms || quotation.termsAndConditions;

  // Check if any line item has WHT
  const hasWht = quotation.lineItems.some(
    (item) =>
      (typeof item.whtRate === 'number' && item.whtRate !== 0) ||
      (item.whtRate === 'custom' && item.customWhtAmount)
  );

  // Get document title based on type
  const documentTitle =
    documentType === 'quotation'
      ? 'QUOTATION'
      : documentType === 'invoice'
        ? 'INVOICE'
        : 'RECEIPT';

  return (
    <div className="sticky top-4 border border-gray-200 rounded-lg shadow-sm bg-white overflow-hidden">
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Preview</span>
        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            disabled={zoomIndex === 0}
            className="p-1 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4 text-gray-600" />
          </button>
          <span className="text-xs text-gray-600 w-10 text-center font-medium">
            {ZOOM_LABELS[zoomIndex]}
          </span>
          <button
            onClick={handleZoomIn}
            disabled={zoomIndex === ZOOM_LEVELS.length - 1}
            className="p-1 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4 text-gray-600" />
          </button>
          {zoomIndex !== 0 && (
            <button
              onClick={handleResetZoom}
              className="p-1 rounded hover:bg-gray-200 transition-colors ml-1"
              title="Reset zoom"
            >
              <RotateCcw className="h-4 w-4 text-gray-600" />
            </button>
          )}
        </div>
      </div>
      <div className="p-3 bg-gray-100 overflow-auto" style={{ maxHeight: '700px' }}>
        {/* Scaled A4 container */}
        <div
          className="bg-white shadow-md mx-auto transition-transform duration-200"
          style={{
            width: '210mm',
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top center',
            marginBottom: `${getMarginCompensation()}px`,
          }}
        >
          {/* A4 Page Content */}
          <div className="p-10 min-h-[297mm]">
            {/* Header / Letterhead */}
            <div className="border-b-2 border-gray-800 pb-6 mb-6">
              <div className="flex justify-between items-start">
                {/* Company Info */}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {company.name}
                  </h1>
                  {fieldSettings.showCompanyAddress && company.registeredAddress && (
                    <div className="mt-2 text-sm text-gray-600 space-y-0.5">
                      <p>{company.registeredAddress.street}</p>
                      <p>
                        {company.registeredAddress.city}
                        {company.registeredAddress.state &&
                          `, ${company.registeredAddress.state}`}{' '}
                        {company.registeredAddress.postalCode}
                      </p>
                      <p>{company.registeredAddress.country}</p>
                    </div>
                  )}
                  {company.contactInformation && (
                    <div className="mt-2 text-sm text-gray-600">
                      {(fieldSettings.showCompanyPhone ||
                        fieldSettings.showCompanyEmail) && (
                        <p>
                          {fieldSettings.showCompanyPhone &&
                            `Tel: ${company.contactInformation.phoneNumber}`}
                          {fieldSettings.showCompanyPhone &&
                            fieldSettings.showCompanyEmail &&
                            ' | '}
                          {fieldSettings.showCompanyEmail &&
                            `Email: ${company.contactInformation.email}`}
                        </p>
                      )}
                    </div>
                  )}
                  {fieldSettings.showCompanyTaxId && company.taxId && (
                    <p className="mt-1 text-sm text-gray-600">
                      Tax ID: {company.taxId}
                    </p>
                  )}
                </div>

                {/* Document Title */}
                <div className="text-right">
                  <h2 className="text-3xl font-bold tracking-wider text-gray-800">
                    {documentTitle}
                  </h2>
                </div>
              </div>
            </div>

            {/* Document Info & Client Info */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              {/* Client Info */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {documentType === 'quotation' ? 'Quotation To' : 'Bill To'}
                </h3>
                <div className="text-sm text-gray-900">
                  <p className="font-semibold text-base">{clientName}</p>
                  {client.contactPerson && <p>{client.contactPerson}</p>}
                  {fieldSettings.showClientAddress && client.billingAddress && (
                    <div className="mt-1 text-gray-600">
                      {client.billingAddress.street && (
                        <p>{client.billingAddress.street}</p>
                      )}
                      <p>
                        {client.billingAddress.city}
                        {client.billingAddress.state &&
                          `, ${client.billingAddress.state}`}{' '}
                        {client.billingAddress.postalCode}
                      </p>
                      {client.billingAddress.country && (
                        <p>{client.billingAddress.country}</p>
                      )}
                    </div>
                  )}
                  {fieldSettings.showClientEmail && client.email && (
                    <p className="mt-1 text-gray-600">{client.email}</p>
                  )}
                  {fieldSettings.showClientTaxId && client.taxId && (
                    <p className="mt-1 text-gray-600">Tax ID: {client.taxId}</p>
                  )}
                </div>
              </div>

              {/* Document Details */}
              <div className="text-right">
                <table className="ml-auto text-sm">
                  <tbody>
                    <tr>
                      <td className="py-1 text-gray-500 pr-4">
                        {documentType === 'quotation' ? 'Quotation No:' : 'Doc No:'}
                      </td>
                      <td className="py-1 font-semibold text-gray-900">
                        {quotation.quotationNumber}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 text-gray-500 pr-4">Date:</td>
                      <td className="py-1 text-gray-900">
                        {formatDate(quotation.dateCreated)}
                      </td>
                    </tr>
                    {fieldSettings.showValidUntil && documentType === 'quotation' && (
                      <tr>
                        <td className="py-1 text-gray-500 pr-4">Valid Until:</td>
                        <td className="py-1 text-gray-900">
                          {formatDate(quotation.validUntil)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="mb-8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-3 px-4 text-left font-semibold text-gray-700 w-12">
                      #
                    </th>
                    <th className="py-3 px-4 text-left font-semibold text-gray-700">
                      Description
                    </th>
                    <th className="py-3 px-4 text-center font-semibold text-gray-700 w-20">
                      Qty
                    </th>
                    <th className="py-3 px-4 text-right font-semibold text-gray-700 w-32">
                      Unit Price
                    </th>
                    {fieldSettings.showVatColumn &&
                      quotation.pricingType !== 'no_vat' && (
                        <th className="py-3 px-4 text-center font-semibold text-gray-700 w-20">
                          VAT %
                        </th>
                      )}
                    {fieldSettings.showWhtColumn && hasWht && (
                      <th className="py-3 px-4 text-center font-semibold text-gray-700 w-20">
                        WHT %
                      </th>
                    )}
                    <th className="py-3 px-4 text-right font-semibold text-gray-700 w-32">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {quotation.lineItems.map((item, index) => (
                    <tr key={item.id} className="border-b border-gray-200">
                      <td className="py-3 px-4 text-gray-600">{index + 1}</td>
                      <td className="py-3 px-4 text-gray-900 whitespace-pre-line">
                        {item.description}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-900">
                        {item.quantity}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-900">
                        {formatCurrency(item.unitPrice, quotation.currency as any)}
                      </td>
                      {fieldSettings.showVatColumn &&
                        quotation.pricingType !== 'no_vat' && (
                          <td className="py-3 px-4 text-center text-gray-600">
                            {item.taxRate}%
                          </td>
                        )}
                      {fieldSettings.showWhtColumn && hasWht && (
                        <td className="py-3 px-4 text-center text-gray-600">
                          {item.whtRate !== 0 && item.whtRate !== 'custom'
                            ? `${item.whtRate}%`
                            : item.whtRate === 'custom' && item.customWhtAmount
                              ? formatCurrency(
                                  item.customWhtAmount,
                                  quotation.currency as any
                                )
                              : '-'}
                        </td>
                      )}
                      <td className="py-3 px-4 text-right font-medium text-gray-900">
                        {formatCurrency(item.amount, quotation.currency as any)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-72">
                <table className="w-full text-sm">
                  <tbody>
                    {fieldSettings.showSubtotal && (
                      <tr>
                        <td className="py-2 text-gray-600">Subtotal:</td>
                        <td className="py-2 text-right text-gray-900">
                          {formatCurrency(
                            quotation.subtotal,
                            quotation.currency as any
                          )}
                        </td>
                      </tr>
                    )}
                    {fieldSettings.showVatAmount &&
                      quotation.pricingType !== 'no_vat' && (
                        <tr>
                          <td className="py-2 text-gray-600">
                            VAT (
                            {quotation.pricingType === 'include_vat'
                              ? 'Included'
                              : 'Added'}
                            ):
                          </td>
                          <td className="py-2 text-right text-gray-900">
                            {formatCurrency(
                              quotation.taxAmount,
                              quotation.currency as any
                            )}
                          </td>
                        </tr>
                      )}
                    <tr className="border-t-2 border-gray-800">
                      <td className="py-3 font-bold text-gray-900 text-base">
                        Total:
                      </td>
                      <td className="py-3 text-right font-bold text-gray-900 text-base">
                        {formatCurrency(
                          quotation.totalAmount,
                          quotation.currency as any
                        )}
                      </td>
                    </tr>
                    {fieldSettings.showWhtAmount && quotation.whtAmount > 0 && (
                      <>
                        <tr>
                          <td className="py-2 text-gray-600">Withholding Tax:</td>
                          <td className="py-2 text-right text-gray-900">
                            -
                            {formatCurrency(
                              quotation.whtAmount,
                              quotation.currency as any
                            )}
                          </td>
                        </tr>
                        {fieldSettings.showNetAmountToPay && (
                          <tr className="border-t border-gray-300">
                            <td className="py-2 font-semibold text-gray-900">
                              Net Amount to Pay:
                            </td>
                            <td className="py-2 text-right font-semibold text-gray-900">
                              {formatCurrency(
                                quotation.totalAmount - quotation.whtAmount,
                                quotation.currency as any
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment Details */}
            {fieldSettings.showPaymentDetails && bankAccount && (
              <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Payment Details
                </h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Bank: </span>
                    <span className="text-gray-900">
                      {bankAccount.bankInformation.bankName}
                      {bankAccount.bankInformation.bankBranch &&
                        ` (${bankAccount.bankInformation.bankBranch})`}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Account Name: </span>
                    <span className="text-gray-900">{bankAccount.accountName}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Account No: </span>
                    <span className="text-gray-900 font-mono">
                      {bankAccount.accountNumber}
                    </span>
                  </div>
                  {bankAccount.bankInformation.swiftBic && (
                    <div>
                      <span className="text-gray-500">SWIFT/BIC: </span>
                      <span className="text-gray-900 font-mono">
                        {bankAccount.bankInformation.swiftBic}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Terms & Conditions */}
            {fieldSettings.showTermsAndConditions && displayTerms && (
              <div className="mb-8">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Terms & Conditions
                </h3>
                <div className="text-sm text-gray-700 whitespace-pre-line">
                  {displayTerms}
                </div>
              </div>
            )}

            {/* Created By / Signature */}
            {fieldSettings.showCreatedBySignature && (
              <div className="mt-12 pt-8">
                <div className="w-48">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-8">
                    Created by
                  </h3>
                  <div className="border-b border-gray-400 mb-2 h-8"></div>
                  <p className="text-sm text-gray-900">{createdBy}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(quotation.dateCreated)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
