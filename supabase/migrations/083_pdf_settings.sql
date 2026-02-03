-- PDF document settings (field visibility, default terms, validity days)
CREATE TABLE pdf_settings (
  id text PRIMARY KEY DEFAULT 'default',
  quotation jsonb NOT NULL DEFAULT '{}',
  invoice jsonb NOT NULL DEFAULT '{}',
  receipt jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

-- Seed default row with initial settings
INSERT INTO pdf_settings (id, quotation, invoice, receipt) VALUES (
  'default',
  '{"fields":{"showCompanyAddress":true,"showCompanyPhone":true,"showCompanyEmail":true,"showCompanyTaxId":true,"showClientAddress":true,"showClientEmail":true,"showClientTaxId":false,"showValidUntil":true,"showVatColumn":true,"showWhtColumn":true,"showSubtotal":true,"showVatAmount":true,"showWhtAmount":true,"showNetAmountToPay":true,"showPaymentDetails":true,"showTermsAndConditions":true,"showCreatedBySignature":true},"defaultTermsAndConditions":"Payment Terms:\n- 50% deposit required upon acceptance\n- Balance due before charter commencement\n- All prices are subject to applicable taxes\n\nCancellation Policy:\n- Cancellations made 30+ days before charter: Full refund minus 10% admin fee\n- Cancellations made 14-29 days before charter: 50% refund\n- Cancellations made less than 14 days before charter: No refund","defaultValidityDays":2}',
  '{"fields":{"showCompanyAddress":true,"showCompanyPhone":true,"showCompanyEmail":true,"showCompanyTaxId":true,"showClientAddress":true,"showClientEmail":true,"showClientTaxId":false,"showValidUntil":true,"showVatColumn":true,"showWhtColumn":true,"showSubtotal":true,"showVatAmount":true,"showWhtAmount":true,"showNetAmountToPay":true,"showPaymentDetails":true,"showTermsAndConditions":true,"showCreatedBySignature":true},"defaultTermsAndConditions":"Payment Terms:\n- Payment is due within the specified due date\n- Late payments may incur interest charges\n- All prices include applicable taxes as shown\n\nBank Transfer Instructions:\n- Please include invoice number as payment reference\n- Bank details are provided above","defaultValidityDays":30}',
  '{"fields":{"showCompanyAddress":true,"showCompanyPhone":true,"showCompanyEmail":true,"showCompanyTaxId":true,"showClientAddress":true,"showClientEmail":true,"showClientTaxId":false,"showValidUntil":true,"showVatColumn":true,"showWhtColumn":true,"showSubtotal":true,"showVatAmount":true,"showWhtAmount":true,"showNetAmountToPay":true,"showPaymentDetails":true,"showTermsAndConditions":true,"showCreatedBySignature":true},"defaultTermsAndConditions":"This receipt confirms payment received.\n- Keep this receipt for your records\n- Contact us if you have any questions about this payment"}'
);

-- RLS policies
ALTER TABLE pdf_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read pdf_settings" ON pdf_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update pdf_settings" ON pdf_settings FOR UPDATE TO authenticated USING (true);
