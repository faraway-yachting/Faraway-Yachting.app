export interface BeamMerchantAccount {
  id: string;
  companyId: string;
  merchantId: string;
  merchantName: string;
  settlementBankAccountId?: string;
  isActive: boolean;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BeamTransaction {
  id: string;
  merchantAccountId: string;
  chargeId: string;
  sourceId?: string;
  transactionDate: string;
  transactionTime?: string;
  settlementDate?: string;
  settlementStatus?: string;
  invoiceNo?: string;
  invoiceDate?: string;
  currency: string;
  grossAmount: number;
  feeRate?: number;
  feeAmount: number;
  vatAmount: number;
  netAmount: number;
  paymentMethod?: string;
  cardBrand?: string;
  cardCountry?: string;
  cardHolderName?: string;
  bookingId?: string;
  receiptId?: string;
  matchStatus: 'unmatched' | 'matched' | 'reconciled';
  matchConfidence?: number;
  paymentLinkDescription?: string;
  referenceId?: string;
  importedAt: string;
  importedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BeamCsvRow {
  merchant_id: string;
  source: string;
  source_id: string;
  transaction_id: string;
  charge_id: string;
  transaction_date: string;
  transaction_time: string;
  currency: string;
  transaction_amount: string;
  fee_type: string;
  fee_strategy: string;
  fee_minimum_amount: string;
  fee_rate: string;
  fee_amount: string;
  vat_amount: string;
  net_amount: string;
  transaction_type: string;
  payment_method: string;
  installment_period: string;
  service_provider_name: string;
  card_holder_name: string;
  card_issuer_name: string;
  card_brand: string;
  card_product_name: string;
  card_country: string;
  reference_id: string;
  internal_note: string;
  payment_link_description: string;
  customer_delivery_address_full_name: string;
  customer_delivery_address_full_street_address: string;
  customer_delivery_address_city: string;
  customer_delivery_address_country: string;
  customer_delivery_address_post_code: string;
  customer_delivery_address_phone_number: string;
  invoice_no: string;
  invoice_date: string;
  settlement_status: string;
  settlement_date: string;
  charge_source_device_id: string;
  charge_source_device_serial_number: string;
}
