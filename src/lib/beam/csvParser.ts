import type { BeamCsvRow } from '@/data/beam/types';

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  fields.push(current);
  return fields;
}

export function parseBeamCsv(csvText: string): BeamCsvRow[] {
  let text = csvText;
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const rows: BeamCsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j].trim()] = (values[j] ?? '').trim();
    }
    rows.push(row as unknown as BeamCsvRow);
  }

  return rows;
}

function emptyToNull(value: string): string | null {
  return value === '' ? null : value;
}

function parseNumber(value: string): number {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

function parseNullableNumber(value: string): number | null {
  if (value === '') return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

export function csvRowToDbInsert(
  row: BeamCsvRow,
  merchantAccountId: string
): {
  merchant_account_id: string;
  charge_id: string;
  source_id: string | null;
  transaction_date: string;
  transaction_time: string | null;
  settlement_date: string | null;
  settlement_status: string | null;
  invoice_no: string | null;
  invoice_date: string | null;
  currency: string;
  gross_amount: number;
  fee_rate: number | null;
  fee_amount: number;
  vat_amount: number;
  net_amount: number;
  payment_method: string | null;
  card_brand: string | null;
  card_country: string | null;
  card_holder_name: string | null;
  payment_link_description: string | null;
  reference_id: string | null;
  match_status: string;
} {
  return {
    merchant_account_id: merchantAccountId,
    charge_id: row.charge_id,
    source_id: emptyToNull(row.source_id),
    transaction_date: row.transaction_date,
    transaction_time: emptyToNull(row.transaction_time),
    settlement_date: emptyToNull(row.settlement_date),
    settlement_status: emptyToNull(row.settlement_status),
    invoice_no: emptyToNull(row.invoice_no),
    invoice_date: emptyToNull(row.invoice_date),
    currency: row.currency || 'THB',
    gross_amount: parseNumber(row.transaction_amount),
    fee_rate: parseNullableNumber(row.fee_rate),
    fee_amount: parseNumber(row.fee_amount),
    vat_amount: parseNumber(row.vat_amount),
    net_amount: parseNumber(row.net_amount),
    payment_method: emptyToNull(row.payment_method),
    card_brand: emptyToNull(row.card_brand),
    card_country: emptyToNull(row.card_country),
    card_holder_name: emptyToNull(row.card_holder_name),
    payment_link_description: emptyToNull(row.payment_link_description),
    reference_id: emptyToNull(row.reference_id),
    match_status: 'unmatched',
  };
}
